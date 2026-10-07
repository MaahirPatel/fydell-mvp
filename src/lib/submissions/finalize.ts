/**
 * Idempotent snapshot-submission finalization (UP-03, UP-06, UP-08, DESK-15, DESK-16).
 *
 * All database access goes through the injected `FinalizeDeps`, so this core
 * is testable in-process with fakes. The real routes wire it to Supabase via
 * `src/lib/submissions/real-deps.ts`.
 *
 * Guarantees:
 * - UP-02: the session must belong to the calling candidate; swapped session
 *   ids / other users' sessions fail with FORBIDDEN, crossed manifests
 *   (wrong scenario/version) fail with SCENARIO_MISMATCH / VERSION_MISMATCH.
 * - UP-03: idempotent finalization under retry storms. A client-supplied
 *   `operationId` is the idempotency key: repeats with the same key return
 *   the same receipt without a second atomic submit. Interrupted syncs never
 *   appear submitted; reconnect reconciles via `recoverFinalizeState`.
 * - UP-06: one accepted operation per operation id. Double-clicks / network
 *   retries yield exactly one receipt; the atomic `submit_session_atomic`
 *   RPC is the second line of defense.
 * - UP-08: every rejection is a `SubmissionError` with code + actionable
 *   recovery, and `workPreserved` is always true. Infrastructure failures
 *   surface as INFRA_ERROR - never as a skill-test failure.
 * - E2E-20: if the server accepted but the response was lost, a later
 *   finalize call (same operation id) or a `recoverFinalizeState` poll
 *   returns the existing receipt; no duplicate is created.
 *
 * State flow inside finalize:
 *   entry state --walk--> submitting --validate+store--> accepted | rejected (validation) | failed (infra)
 * The walk advances one legal machine edge at a time
 * (local_draft → syncing → server_saved → submitting, or failed → submitting),
 * re-reading after any lost CAS race. Only the task that wins the final
 * submitting CAS performs the atomic submit; losers recover the receipt or
 * report in-flight - repeated/concurrent requests cannot regress states.
 */

import {
  collectSnapshotIssues,
  computeReceiptHash,
  isValidFileSnapshotShape,
  sanitizeDisplayPath,
  type FileSnapshotInput,
} from "../simulations/submission-files";
import { SubmissionError, SUBMISSION_ERROR_CODES, recoveryForCode, snapshotIssueToError, type SubmitErrorCode } from "./errors";
import {
  type TransferRecord,
  type TransferState,
} from "./transfer";

export interface SessionRef {
  id: string;
  candidateUserId: string;
  templateId: string;
  status: string;
}

export interface ScenarioPin {
  scenarioId: string;
  scenarioVersion: string;
}

export interface AtomicSubmitResult {
  submissionId: string;
  alreadySubmitted: boolean;
  receiptHash: string;
}

export interface FinalizeDeps {
  /** Must throw SubmissionError SESSION_NOT_FOUND / FORBIDDEN on mismatch. */
  getSession(sessionId: string, userId: string): Promise<SessionRef>;
  /** Scenario pin for the session's template. Throws SCENARIO_UNAVAILABLE. */
  getScenarioPin(session: SessionRef): Promise<ScenarioPin>;
  loadTransfer(sessionId: string): Promise<TransferRecord | null>;
  /**
   * Atomic compare-and-set transition. Returns { ok:false } when the
   * caller's `from` is stale or the transition is illegal - the caller must
   * NOT proceed with the submit in that case.
   */
  storeTransferTransition(
    sessionId: string,
    from: TransferState,
    to: TransferState,
    detail?: { operationId?: string; receiptHash?: string; submissionId?: string; failureCode?: string; failureMessage?: string }
  ): Promise<{ ok: boolean; state: TransferState }>;
  /** Runs the atomic submit (validation already done by the core). */
  atomicSubmit(args: {
    sessionId: string;
    userId: string;
    disclosed: boolean;
    fileSnapshot: FileSnapshotInput;
    answers?: Record<string, unknown>;
  }): Promise<AtomicSubmitResult>;
  /** Submission row for the session, if any (lost-response / cross-path recovery). */
  getSubmissionBySession(sessionId: string): Promise<{ submissionId: string; receiptHash: string | null } | null>;
}

export interface RecoveryDeps {
  getSession(sessionId: string, userId: string): Promise<SessionRef>;
  loadTransfer(sessionId: string): Promise<TransferRecord | null>;
  /** Submission row for the session, if any (receipt recovery fallback). */
  getSubmissionBySession(sessionId: string): Promise<{ submissionId: string; receiptHash: string | null } | null>;
}

export interface FinalizeArgs {
  sessionId: string;
  userId: string;
  operationId: string;
  disclosed: boolean;
  fileSnapshot: unknown;
  answers?: Record<string, unknown>;
}

export interface FinalizeResult {
  submissionId: string;
  receiptHash: string;
  alreadySubmitted: boolean;
  /** True when another request with the same operation id is submitting. */
  inFlight?: boolean;
  state: TransferState;
}

export interface FinalizeRecovery {
  state: TransferState;
  submissionId: string | null;
  receiptHash: string | null;
  accepted: boolean;
  failureCode: string | null;
  failureMessage: string | null;
  /** Actionable next step for the client; null when nothing is wrong. */
  recovery: string | null;
}

function transferConflict(from: TransferState | null, detail: string): SubmissionError {
  return new SubmissionError(
    "TRANSFER_CONFLICT",
    `Submission state conflict${from ? ` (transfer is ${from})` : ""}: ${detail}`
  );
}

// ---------------------------------------------------------------------------
// Stepwise sync actions (UP-03): the desktop client drives the machine
// local_draft → syncing → server_saved before finalizing, or recovers via
// reset_to_draft. Every move goes through the CAS transition, so concurrent
// or repeated requests cannot regress states.
// ---------------------------------------------------------------------------

export type SyncAction = "begin_sync" | "sync_complete" | "sync_failed" | "reset_to_draft";

const SYNC_MOVES: Record<SyncAction, { from: readonly TransferState[]; to: TransferState }> = {
  begin_sync: { from: ["local_draft", "failed"], to: "syncing" },
  sync_complete: { from: ["syncing"], to: "server_saved" },
  sync_failed: { from: ["syncing"], to: "failed" },
  reset_to_draft: { from: ["rejected", "failed", "server_saved", "syncing", "local_draft"], to: "local_draft" },
};

export interface SyncDeps {
  getSession(sessionId: string, userId: string): Promise<SessionRef>;
  loadTransfer(sessionId: string): Promise<TransferRecord | null>;
  storeTransferTransition(
    sessionId: string,
    from: TransferState,
    to: TransferState,
    detail?: { failureCode?: string; failureMessage?: string }
  ): Promise<{ ok: boolean; state: TransferState }>;
}

export async function driveSyncAction(
  deps: SyncDeps,
  sessionId: string,
  userId: string,
  action: SyncAction,
  failure?: { code: string; message: string }
): Promise<TransferState> {
  await deps.getSession(sessionId, userId); // UP-02: swapped ids fail here
  const move = SYNC_MOVES[action];
  if (!move) throw new SubmissionError("SNAPSHOT_SHAPE", `Unknown sync action ${JSON.stringify(String(action))}`);
  const rec = await deps.loadTransfer(sessionId);
  const from: TransferState = rec?.state ?? "local_draft";
  if (!move.from.includes(from)) {
    throw new SubmissionError("TRANSFER_CONFLICT", `Cannot ${action} while transfer is ${from}`);
  }
  const t = await deps.storeTransferTransition(
    sessionId,
    from,
    move.to,
    action === "sync_failed"
      ? { failureCode: failure?.code ?? "SYNC_FAILED", failureMessage: (failure?.message ?? "Sync interrupted").slice(0, 300) }
      : undefined
  );
  if (!t.ok) {
    throw new SubmissionError("TRANSFER_CONFLICT", `Cannot ${action}: a concurrent request changed the transfer state`);
  }
  return t.state;
}

/**
 * Reconcile client state with the server before doing anything else (UP-03).
 * Returns the existing receipt when this operation (or session) already
 * completed - the caller must NOT submit again.
 */
export async function recoverFinalizeState(
  deps: RecoveryDeps,
  sessionId: string,
  userId: string
): Promise<FinalizeRecovery> {
  await deps.getSession(sessionId, userId); // UP-02: swapped ids fail here
  const rec = await deps.loadTransfer(sessionId);

  const withRecovery = (
    state: TransferState,
    submissionId: string | null,
    receiptHash: string | null,
    failureCode: string | null,
    failureMessage: string | null
  ): FinalizeRecovery => ({
    state,
    submissionId,
    receiptHash,
    accepted: state === "accepted",
    failureCode,
    failureMessage,
    recovery:
      state === "accepted"
        ? null
        : state === "rejected" || state === "failed"
          ? recoveryForCode(
              failureCode !== null && (SUBMISSION_ERROR_CODES as readonly string[]).includes(failureCode)
                ? (failureCode as SubmitErrorCode)
                : "INFRA_ERROR"
            )
          : state === "submitting"
            ? "A submission is currently being processed. Wait for it to finish instead of sending another request."
            : "Resume from this state: complete sync, then finalize.",
  });

  if (rec?.state === "accepted" && rec.receiptHash) {
    return withRecovery("accepted", rec.submissionId ?? null, rec.receiptHash, null, null);
  }
  // Transfer record missing or predates the receipt (e.g. legacy submissions
  // or a lost transfer row): the submission row is the source of truth.
  const sub = await deps.getSubmissionBySession(sessionId);
  if (sub?.receiptHash) {
    return withRecovery("accepted", sub.submissionId, sub.receiptHash, null, null);
  }
  if (!rec) {
    return withRecovery("local_draft", null, null, null, null);
  }
  return withRecovery(rec.state, rec.submissionId ?? null, rec.receiptHash ?? null, rec.failureCode ?? null, rec.failureMessage ?? null);
}

export async function finalizeSnapshotSubmission(
  args: FinalizeArgs,
  deps: FinalizeDeps
): Promise<FinalizeResult> {
  const { sessionId, userId, operationId, disclosed } = args;
  if (!operationId || typeof operationId !== "string") {
    throw new SubmissionError("OPERATION_ID_REQUIRED");
  }

  const session = await deps.getSession(sessionId, userId); // UP-02: swapped → FORBIDDEN

  // Lost-response recovery (DESK-16 / E2E-20): already accepted → same receipt.
  const recovery = await recoverFinalizeState(
    { getSession: deps.getSession, loadTransfer: deps.loadTransfer, getSubmissionBySession: deps.getSubmissionBySession },
    sessionId,
    userId
  );
  if (recovery.accepted && recovery.receiptHash && recovery.submissionId) {
    return {
      submissionId: recovery.submissionId,
      receiptHash: recovery.receiptHash,
      alreadySubmitted: true,
      state: "accepted",
    };
  }

  // Walk the machine to `submitting` one legal edge at a time. The
  // single-request finalize path bundles sync+finalize (the snapshot bytes
  // ride with the finalize request), so the walk records the sync lifecycle
  // explicitly instead of jumping over it.
  const inFlightResult: FinalizeResult = {
    submissionId: "",
    receiptHash: "",
    alreadySubmitted: false,
    inFlight: true,
    state: "submitting",
  };
  let claimed = false;
  for (let step = 0; step < 8 && !claimed; step++) {
    const now = await deps.loadTransfer(sessionId);
    const cur: TransferState = now?.state ?? "local_draft";

    if (cur === "accepted") {
      // Won the race after someone else accepted: recover (handled below).
      break;
    }
    if (cur === "submitting") {
      // A concurrent request holds the submitting slot.
      if (now?.operationId === operationId) return inFlightResult;
      throw transferConflict(cur, "another submission is in progress for this attempt");
    }
    if (cur === "rejected") {
      throw transferConflict(
        cur,
        "the previous submission was rejected; reset to a local draft and rebuild the snapshot before finalizing"
      );
    }
    if (cur === "syncing" && now?.operationId !== operationId) {
      throw transferConflict(cur, "another sync is in progress for this attempt; finish or reset it first");
    }
    // cur ∈ local_draft | server_saved | failed, or syncing-with-our-operationId.
    const next: TransferState =
      cur === "local_draft" ? "syncing" : cur === "syncing" ? "server_saved" : "submitting";
    const t = await deps.storeTransferTransition(
      sessionId,
      cur,
      next,
      next === "submitting" || next === "syncing" ? { operationId } : undefined
    );
    if (!t.ok) continue; // lost a race; re-read and decide again
    if (next === "submitting") claimed = true;
  }

  if (!claimed) {
    // Either someone accepted concurrently (recover the receipt) or
    // contention never settled: never submit twice, never throw away work.
    const now = await deps.loadTransfer(sessionId);
    if (now?.state === "accepted" && now.receiptHash && now.submissionId) {
      return {
        submissionId: now.submissionId,
        receiptHash: now.receiptHash,
        alreadySubmitted: true,
        state: "accepted",
      };
    }
    if (now?.state === "submitting" && now.operationId === operationId) return inFlightResult;
    throw transferConflict(now?.state ?? null, "a concurrent request changed the transfer state");
  }

  const failAs = async (message: string): Promise<never> => {
    await deps.storeTransferTransition(sessionId, "submitting", "failed", {
      failureCode: "INFRA_ERROR",
      failureMessage: message,
    });
    throw new SubmissionError("INFRA_ERROR", `Submission failed (operation ${operationId}): a server problem interrupted the save`);
  };

  try {
    if (session.status !== "active") {
      // The session may have been submitted through another path; recheck.
      const again = await recoverFinalizeState(
        { getSession: deps.getSession, loadTransfer: deps.loadTransfer, getSubmissionBySession: deps.getSubmissionBySession },
        sessionId,
        userId
      );
      if (again.accepted && again.receiptHash && again.submissionId) {
        await deps.storeTransferTransition(sessionId, "submitting", "accepted", {
          receiptHash: again.receiptHash,
          submissionId: again.submissionId,
          operationId,
        });
        return {
          submissionId: again.submissionId,
          receiptHash: again.receiptHash,
          alreadySubmitted: true,
          state: "accepted",
        };
      }
      await deps.storeTransferTransition(sessionId, "submitting", "rejected", {
        failureCode: "SESSION_NOT_ACTIVE",
        failureMessage: "Session is not active",
      });
      throw new SubmissionError("SESSION_NOT_ACTIVE");
    }

    if (!isValidFileSnapshotShape(args.fileSnapshot)) {
      const err = new SubmissionError("SNAPSHOT_SHAPE");
      await deps.storeTransferTransition(sessionId, "submitting", "rejected", {
        failureCode: err.code,
        failureMessage: err.message,
      });
      throw err;
    }
    const snap = args.fileSnapshot as FileSnapshotInput;

    const pin = await deps.getScenarioPin(session);
    const issues = collectSnapshotIssues(snap, pin.scenarioId, pin.scenarioVersion);
    if (issues.length > 0) {
      const err = snapshotIssueToError(issues[0]);
      await deps.storeTransferTransition(sessionId, "submitting", "rejected", {
        failureCode: err.code,
        // failureMessage is operator-visible; keep the sanitized message only.
        failureMessage: err.message,
      });
      throw err;
    }

    const receiptHash = computeReceiptHash(sessionId, pin.scenarioId, pin.scenarioVersion, snap.manifest);

    let stored: AtomicSubmitResult;
    try {
      stored = await deps.atomicSubmit({
        sessionId,
        userId,
        disclosed,
        fileSnapshot: snap,
        answers: args.answers,
      });
    } catch (err) {
      // The atomic RPC is the durability boundary: if it threw, the
      // submission may or may not have committed. Mark failed and let the
      // idempotent retry / recovery path reconcile - never claim success.
      const detail = err instanceof Error ? err.message : "unknown error";
      return failAs(sanitizeDisplayPath(detail).slice(0, 200));
    }

    await deps.storeTransferTransition(sessionId, "submitting", "accepted", {
      receiptHash: stored.receiptHash || receiptHash,
      submissionId: stored.submissionId,
      operationId,
    });
    return {
      submissionId: stored.submissionId,
      receiptHash: stored.receiptHash || receiptHash,
      alreadySubmitted: stored.alreadySubmitted,
      state: "accepted",
    };
  } catch (err) {
    if (err instanceof SubmissionError) {
      // Validation rejections were already recorded as `rejected` above;
      // anything else that escaped becomes `failed` so it is retryable.
      const rec2 = await deps.loadTransfer(sessionId);
      if (rec2?.state === "submitting") {
        await deps.storeTransferTransition(sessionId, "submitting", "failed", {
          failureCode: err.code,
          failureMessage: err.message,
        });
      }
      throw err;
    }
    return failAs("unexpected error during finalize");
  }
}
