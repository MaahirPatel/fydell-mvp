/**
 * Idempotent finalize grind tests (UP-02, UP-03, UP-06, UP-08, DESK-15, DESK-16, E2E-20).
 *
 * In-process tests with fakes for every database boundary of
 * src/lib/submissions/finalize.ts:
 * - retry storms / double-clicks with one operation id → exactly one atomic
 *   submit, one receipt (DESK-15, UP-06),
 * - lost submit response → the same receipt is recovered, no duplicate
 *   (DESK-16, E2E-20),
 * - swapped session ids / foreign users → FORBIDDEN; crossed manifests
 *   (wrong scenario/version) → SCENARIO_MISMATCH/VERSION_MISMATCH (UP-02),
 * - every rejection carries code + actionable recovery and preserves work
 *   (UP-08); infra failures surface as INFRA_ERROR, never as skill-test
 *   failures, and never leak file contents, digests, or DB error text,
 * - full sync lifecycle local_draft → syncing → server_saved → submitting →
 *   accepted, incl. sync_failed / reset_to_draft recovery (UP-03),
 * - concurrent requests cannot regress transfer states.
 *
 * The SQL `submit_transfer_transition` function is reviewed but not executed
 * here (no Postgres in this environment); the fake store implements the same
 * atomic compare-and-set semantics.
 *
 * Run via `npx tsx scripts/test-submit-grind-finalize.ts`
 */
import { createHash } from "node:crypto";
import {
  SUBMISSION_ERROR_CODES,
  SubmissionError,
  httpStatusForCode,
  recoveryForCode,
  toSubmitErrorResponse,
  type SubmitErrorCode,
} from "../src/lib/submissions/errors";
import {
  driveSyncAction,
  finalizeSnapshotSubmission,
  recoverFinalizeState,
  type AtomicSubmitResult,
  type FinalizeDeps,
  type SessionRef,
} from "../src/lib/submissions/finalize";
import {
  applyTransferTransition,
  type TransferRecord,
  type TransferState,
} from "../src/lib/submissions/transfer";
import {
  computeReceiptHash,
  type FileSnapshotInput,
} from "../src/lib/simulations/submission-files";

let failures = 0;
let count = 0;

function check(label: string, cond: boolean, detail = ""): void {
  count += 1;
  if (!cond) {
    failures += 1;
    console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

async function throwsCode(label: string, fn: () => Promise<unknown>, want: SubmitErrorCode): Promise<SubmissionError | null> {
  count += 1;
  try {
    await fn();
    failures += 1;
    console.error(`FAIL ${label} — expected ${want}, none thrown`);
    return null;
  } catch (err) {
    if (err instanceof SubmissionError && err.code === want) {
      console.log(`ok   ${label}`);
      return err;
    }
    failures += 1;
    const got = err instanceof SubmissionError ? err.code : `non-SubmissionError: ${String(err).slice(0, 120)}`;
    console.error(`FAIL ${label} — expected ${want}, got ${got}`);
    return null;
  }
}

// --- fakes -------------------------------------------------------------------
const PIN = { scenarioId: "harbor-webhooks", scenarioVersion: "1.0.0" };
const SECRET_CORPUS = ["sk-live-SECRET-12345", "hunter2-password", "BEGIN-PRIVATE-KEY-BLOB"];

function sha(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function makeSnapshot(
  files: Record<string, string>,
  scenarioId = PIN.scenarioId,
  scenarioVersion = PIN.scenarioVersion
): FileSnapshotInput {
  const manifest: Record<string, string> = {};
  for (const [p, c] of Object.entries(files)) manifest[p] = sha(c);
  return { scenarioId, scenarioVersion, files, manifest };
}

const GOOD_FILES = {
  "src/index.ts": "export function handler() { return 42; }\n",
  "src/retry.ts": "// retry with backoff\n",
};

interface FakeWorld {
  sessions: Map<string, SessionRef>;
  transfers: Map<string, TransferRecord>;
  submissions: Map<string, { submissionId: string; receiptHash: string }>;
  atomicCalls: number;
  failNextAtomic: number;
  subSeq: number;
}

function newWorld(): FakeWorld {
  return {
    sessions: new Map(),
    transfers: new Map(),
    submissions: new Map(),
    atomicCalls: 0,
    failNextAtomic: 0,
    subSeq: 0,
  };
}

function addSession(w: FakeWorld, id: string, userId: string, status = "active"): void {
  w.sessions.set(id, { id, candidateUserId: userId, templateId: "tpl-1", status });
}

function fakeDeps(w: FakeWorld): FinalizeDeps {
  return {
    async getSession(sessionId, userId) {
      const s = w.sessions.get(sessionId);
      if (!s) throw new SubmissionError("SESSION_NOT_FOUND");
      if (s.candidateUserId !== userId) throw new SubmissionError("FORBIDDEN");
      return s;
    },
    async getScenarioPin() {
      return { ...PIN };
    },
    async loadTransfer(sessionId) {
      return w.transfers.get(sessionId) ?? null;
    },
    async storeTransferTransition(sessionId, from, to, detail = {}) {
      // Atomic CAS, mirroring the SQL SELECT ... FOR UPDATE serialization.
      const next = applyTransferTransition(w.transfers.get(sessionId) ?? null, from, to, detail);
      if (!next) {
        const cur = w.transfers.get(sessionId);
        return { ok: false, state: (cur?.state ?? "local_draft") as TransferState };
      }
      w.transfers.set(sessionId, next);
      return { ok: true, state: next.state };
    },
    async atomicSubmit({ sessionId, fileSnapshot }) {
      w.atomicCalls += 1;
      if (w.failNextAtomic > 0) {
        w.failNextAtomic -= 1;
        throw new Error("simulated infra blowup: connection reset by peer");
      }
      const existing = w.submissions.get(sessionId);
      if (existing) {
        return { submissionId: existing.submissionId, alreadySubmitted: true, receiptHash: existing.receiptHash };
      }
      w.subSeq += 1;
      const receiptHash = computeReceiptHash(sessionId, PIN.scenarioId, PIN.scenarioVersion, fileSnapshot.manifest);
      const rec = { submissionId: `sub-${w.subSeq}`, receiptHash };
      w.submissions.set(sessionId, rec);
      return { ...rec, alreadySubmitted: false } as AtomicSubmitResult;
    },
    async getSubmissionBySession(sessionId) {
      const s = w.submissions.get(sessionId);
      return s ? { ...s } : null;
    },
  };
}

function recoveryDeps(w: FakeWorld) {
  const d = fakeDeps(w);
  return { getSession: d.getSession, loadTransfer: d.loadTransfer, getSubmissionBySession: d.getSubmissionBySession };
}

function syncDeps(w: FakeWorld) {
  const d = fakeDeps(w);
  return { getSession: d.getSession, loadTransfer: d.loadTransfer, storeTransferTransition: d.storeTransferTransition };
}

function leaksSecrets(text: string): boolean {
  return SECRET_CORPUS.some((s) => text.includes(s));
}

/** Return a rejected/failed transfer to local_draft so the next attempt can run. */
async function resetToDraft(w: FakeWorld, sessionId: string): Promise<void> {
  const d = fakeDeps(w);
  const rec = await d.loadTransfer(sessionId);
  if (rec && (rec.state === "rejected" || rec.state === "failed")) {
    await d.storeTransferTransition(sessionId, rec.state, "local_draft");
  }
}

async function main(): Promise<void> {
  // --- UP-06 / DESK-15: happy path + receipt determinism ---------------------------
  {
    const w = newWorld();
    addSession(w, "sess-1", "user-1");
    const snap = makeSnapshot(GOOD_FILES);
    const r = await finalizeSnapshotSubmission(
      { sessionId: "sess-1", userId: "user-1", operationId: "op-1", disclosed: false, fileSnapshot: snap },
      fakeDeps(w)
    );
    check("happy path accepted", r.state === "accepted" && !r.alreadySubmitted);
    check("receipt is deterministic", r.receiptHash === computeReceiptHash("sess-1", PIN.scenarioId, PIN.scenarioVersion, snap.manifest));
    check("transfer record is accepted with receipt", w.transfers.get("sess-1")?.state === "accepted");
    check("one atomic submit for one finalize", w.atomicCalls === 1);
  }

  // --- DESK-15: retry storm / double-click → one operation ---------------------------
  {
    const w = newWorld();
    addSession(w, "sess-2", "user-1");
    const snap = makeSnapshot(GOOD_FILES);
    const deps = fakeDeps(w);
    const results = await Promise.all(
      Array.from({ length: 25 }, () =>
        finalizeSnapshotSubmission(
          { sessionId: "sess-2", userId: "user-1", operationId: "op-storm", disclosed: false, fileSnapshot: snap },
          deps
        )
      )
    );
    check("retry storm: exactly one atomic submit", w.atomicCalls === 1, `got ${w.atomicCalls}`);
    const receipts = new Set(results.filter((r) => !r.inFlight).map((r) => r.receiptHash));
    check("retry storm: single receipt across all responses", receipts.size === 1);
    check(
      "retry storm: no response is a duplicate operation",
      results.every((r) => r.inFlight === true || r.state === "accepted")
    );
    check("retry storm: no error thrown", true);
  }

  // --- DESK-16 / E2E-20: lost submit response → same receipt recovered -----------------
  {
    const w = newWorld();
    addSession(w, "sess-3", "user-1");
    const snap = makeSnapshot(GOOD_FILES);
    const deps = fakeDeps(w);
    const first = await finalizeSnapshotSubmission(
      { sessionId: "sess-3", userId: "user-1", operationId: "op-lost", disclosed: false, fileSnapshot: snap },
      deps
    );
    // Response "lost": the client never saw `first`. Reconnect reconciles:
    const recovered = await recoverFinalizeState(recoveryDeps(w), "sess-3", "user-1");
    check("lost response: recovery reports accepted", recovered.accepted && recovered.state === "accepted");
    check("lost response: same receipt recovered", recovered.receiptHash === first.receiptHash);
    check("lost response: same submission id", recovered.submissionId === first.submissionId);
    check("lost response: no recovery action needed", recovered.recovery === null);

    // Client retries the submit with the same operation id (didn't know it landed):
    const retry = await finalizeSnapshotSubmission(
      { sessionId: "sess-3", userId: "user-1", operationId: "op-lost", disclosed: false, fileSnapshot: snap },
      deps
    );
    check("lost response: retry returns alreadySubmitted", retry.alreadySubmitted === true);
    check("lost response: retry returns same receipt", retry.receiptHash === first.receiptHash);
    check("lost response: still one atomic submit", w.atomicCalls === 1, `got ${w.atomicCalls}`);

    // A *different* operation id after acceptance also recovers the one receipt.
    const other = await finalizeSnapshotSubmission(
      { sessionId: "sess-3", userId: "user-1", operationId: "op-other", disclosed: false, fileSnapshot: snap },
      deps
    );
    check("second operation id recovers existing receipt", other.alreadySubmitted && other.receiptHash === first.receiptHash);
    check("second operation id: still one atomic submit", w.atomicCalls === 1);
  }

  // --- recovery via submission row when the transfer record is missing ---------------
  {
    const w = newWorld();
    addSession(w, "sess-4", "user-1");
    const snap = makeSnapshot(GOOD_FILES);
    const deps = fakeDeps(w);
    await finalizeSnapshotSubmission(
      { sessionId: "sess-4", userId: "user-1", operationId: "op-4", disclosed: false, fileSnapshot: snap },
      deps
    );
    w.transfers.delete("sess-4"); // transfer record lost
    const recovered = await recoverFinalizeState(recoveryDeps(w), "sess-4", "user-1");
    check("missing transfer record: submission row is source of truth", recovered.accepted && recovered.receiptHash !== null);
  }

  // --- UP-02: swapped / stale / crossed -------------------------------------------------
  {
    const w = newWorld();
    addSession(w, "sess-5", "user-1");
    const snap = makeSnapshot(GOOD_FILES);

    // Swapped: another user's session id.
    addSession(w, "sess-6", "user-2");
    const e1 = await throwsCode("swapped session id -> FORBIDDEN", () =>
      finalizeSnapshotSubmission(
        { sessionId: "sess-6", userId: "user-1", operationId: "op-x", disclosed: false, fileSnapshot: snap },
        fakeDeps(w)
      ), "FORBIDDEN");
    check("forbidden error preserves work", e1?.workPreserved === true);
    check("forbidden error has actionable recovery", (e1?.recovery ?? "").length > 20);
    check("no atomic submit on forbidden", w.atomicCalls === 0);

    // Nonexistent session.
    await throwsCode("unknown session -> SESSION_NOT_FOUND", () =>
      finalizeSnapshotSubmission(
        { sessionId: "nope", userId: "user-1", operationId: "op-x", disclosed: false, fileSnapshot: snap },
        fakeDeps(w)
      ), "SESSION_NOT_FOUND");

    // Crossed manifest: snapshot built for another scenario.
    const crossed = makeSnapshot(GOOD_FILES, "other-scenario", PIN.scenarioVersion);
    const e2 = await throwsCode("crossed scenario manifest rejected", () =>
      finalizeSnapshotSubmission(
        { sessionId: "sess-5", userId: "user-1", operationId: "op-x", disclosed: false, fileSnapshot: crossed },
        fakeDeps(w)
      ), "SCENARIO_MISMATCH");
    check("crossed manifest: no atomic submit", w.atomicCalls === 0);
    check("crossed manifest: transfer is rejected", w.transfers.get("sess-5")?.state === "rejected");
    check("crossed manifest: recovery is actionable", (e2?.recovery ?? "").includes("different scenario"));

    // Crossed manifest: stale scenario version.
    await resetToDraft(w, "sess-5");
    const stale = makeSnapshot(GOOD_FILES, PIN.scenarioId, "0.9.0");
    await throwsCode("stale version manifest rejected", () =>
      finalizeSnapshotSubmission(
        { sessionId: "sess-5", userId: "user-1", operationId: "op-y", disclosed: false, fileSnapshot: stale },
        fakeDeps(w)
      ), "VERSION_MISMATCH");

    // Hash mismatch (tampered bytes after manifest built).
    await resetToDraft(w, "sess-5");
    const tampered = makeSnapshot(GOOD_FILES);
    tampered.files["src/index.ts"] = "export function handler() { return 43; }\n";
    const e3 = await throwsCode("tampered bytes rejected", () =>
      finalizeSnapshotSubmission(
        { sessionId: "sess-5", userId: "user-1", operationId: "op-z", disclosed: false, fileSnapshot: tampered },
        fakeDeps(w)
      ), "HASH_MISMATCH");
    check("tampered bytes: nothing stored", w.atomicCalls === 0 && !w.submissions.has("sess-5"));
    check("tampered bytes: recovery mentions rebuild", (e3?.recovery ?? "").includes("Rebuild"));

    // Malformed shape.
    await resetToDraft(w, "sess-5");
    await throwsCode("malformed snapshot rejected", () =>
      finalizeSnapshotSubmission(
        { sessionId: "sess-5", userId: "user-1", operationId: "op-w", disclosed: false, fileSnapshot: { nope: true } },
        fakeDeps(w)
      ), "SNAPSHOT_SHAPE");

    // Rejected -> local_draft -> resubmit with fixed snapshot works (work preserved).
    await resetToDraft(w, "sess-5");
    check("rejected can return to local_draft", (await fakeDeps(w).loadTransfer("sess-5"))?.state === "local_draft");
    const fixed = await finalizeSnapshotSubmission(
      { sessionId: "sess-5", userId: "user-1", operationId: "op-fixed", disclosed: false, fileSnapshot: makeSnapshot(GOOD_FILES) },
      fakeDeps(w)
    );
    check("resubmit after rejection succeeds", fixed.state === "accepted" && w.atomicCalls === 1);
  }

  // --- UP-03: full sync lifecycle ------------------------------------------------------------
  {
    const w = newWorld();
    addSession(w, "sess-7", "user-1");
    const d = syncDeps(w);

    check("fresh session reconciles to local_draft", (await recoverFinalizeState(recoveryDeps(w), "sess-7", "user-1")).state === "local_draft");

    check("begin_sync", (await driveSyncAction(d, "sess-7", "user-1", "begin_sync")) === "syncing");
    check("sync_complete", (await driveSyncAction(d, "sess-7", "user-1", "sync_complete")) === "server_saved");

    // Finalize from server_saved (stepwise path).
    const r = await finalizeSnapshotSubmission(
      { sessionId: "sess-7", userId: "user-1", operationId: "op-7", disclosed: false, fileSnapshot: makeSnapshot(GOOD_FILES) },
      fakeDeps(w)
    );
    check("finalize after sync accepted", r.state === "accepted");

    // Interrupted sync never appears submitted: sync_failed path.
    addSession(w, "sess-8", "user-1");
    const d8 = syncDeps(w);
    await driveSyncAction(d8, "sess-8", "user-1", "begin_sync");
    const fs = await driveSyncAction(d8, "sess-8", "user-1", "sync_failed", { code: "NETWORK", message: "tunnel dropped" });
    check("sync_failed -> failed", fs === "failed");
    const rec8 = await recoverFinalizeState(recoveryDeps(w), "sess-8", "user-1");
    check("failed transfer is not submitted", rec8.accepted === false && rec8.submissionId === null);
    check("failed recovery is actionable", (rec8.recovery ?? "").length > 20 && rec8.failureCode === "NETWORK");
    check("no submission stored for failed sync", !w.submissions.has("sess-8"));

    // Retry from failed: begin_sync again, then finalize.
    await driveSyncAction(d8, "sess-8", "user-1", "begin_sync");
    await driveSyncAction(d8, "sess-8", "user-1", "sync_complete");
    const r8 = await finalizeSnapshotSubmission(
      { sessionId: "sess-8", userId: "user-1", operationId: "op-8", disclosed: false, fileSnapshot: makeSnapshot(GOOD_FILES) },
      fakeDeps(w)
    );
    check("retry after failed sync succeeds", r8.state === "accepted");

    // Finalize while syncing is forbidden: finish or reset the sync first.
    addSession(w, "sess-9", "user-1");
    await driveSyncAction(syncDeps(w), "sess-9", "user-1", "begin_sync");
    await throwsCode("finalize during syncing -> TRANSFER_CONFLICT", () =>
      finalizeSnapshotSubmission(
        { sessionId: "sess-9", userId: "user-1", operationId: "op-9", disclosed: false, fileSnapshot: makeSnapshot(GOOD_FILES) },
        fakeDeps(w)
      ), "TRANSFER_CONFLICT");

    // Concurrent finalize with a *different* operation id while submitting conflicts.
    addSession(w, "sess-10", "user-1");
    const d10 = syncDeps(w);
    await driveSyncAction(d10, "sess-10", "user-1", "begin_sync");
    await driveSyncAction(d10, "sess-10", "user-1", "sync_complete");
    await d10.storeTransferTransition("sess-10", "server_saved", "submitting", { operationId: "op-A" });
    await throwsCode("concurrent different operation -> TRANSFER_CONFLICT", () =>
      finalizeSnapshotSubmission(
        { sessionId: "sess-10", userId: "user-1", operationId: "op-B", disclosed: false, fileSnapshot: makeSnapshot(GOOD_FILES) },
        fakeDeps(w)
      ), "TRANSFER_CONFLICT");
    // Same operation id while submitting reports in-flight, no duplicate.
    const callsBefore = w.atomicCalls;
    const inflight = await finalizeSnapshotSubmission(
      { sessionId: "sess-10", userId: "user-1", operationId: "op-A", disclosed: false, fileSnapshot: makeSnapshot(GOOD_FILES) },
      fakeDeps(w)
    );
    check("same operation while submitting -> inFlight", inflight.inFlight === true);
    check("in-flight does not run atomic submit", w.atomicCalls === callsBefore);
  }

  // --- UP-08: infra failure is never a skill-test failure; recovery preserves work --------------
  {
    const w = newWorld();
    addSession(w, "sess-11", "user-1");
    const deps = fakeDeps(w);
    w.failNextAtomic = 1;
    const e = await throwsCode("infra blowup -> INFRA_ERROR", () =>
      finalizeSnapshotSubmission(
        { sessionId: "sess-11", userId: "user-1", operationId: "op-11", disclosed: false, fileSnapshot: makeSnapshot(GOOD_FILES) },
        deps
      ), "INFRA_ERROR");
    check("infra error preserves work", e?.workPreserved === true);
    check("infra error recovery mentions retry", (e?.recovery ?? "").toLowerCase().includes("retry"));
    check(
      "infra error explicitly not a skill-test failure",
      (e?.recovery ?? "").toLowerCase().includes("not a reflection of your work")
    );
    check("failed transfer is retryable", w.transfers.get("sess-11")?.state === "failed");

    // Retry with the same operation id succeeds — exactly one accepted operation.
    const r = await finalizeSnapshotSubmission(
      { sessionId: "sess-11", userId: "user-1", operationId: "op-11", disclosed: false, fileSnapshot: makeSnapshot(GOOD_FILES) },
      deps
    );
    check("retry after infra failure accepted", r.state === "accepted");
    check("one submission stored", w.submissions.size === 1);

    // Session closed without a submission -> SESSION_NOT_ACTIVE.
    addSession(w, "sess-12", "user-1", "submitted");
    await throwsCode("closed session -> SESSION_NOT_ACTIVE", () =>
      finalizeSnapshotSubmission(
        { sessionId: "sess-12", userId: "user-1", operationId: "op-12", disclosed: false, fileSnapshot: makeSnapshot(GOOD_FILES) },
        fakeDeps(w)
      ), "SESSION_NOT_ACTIVE");

    // Missing operation id.
    addSession(w, "sess-13", "user-1");
    await throwsCode("missing operation id rejected", () =>
      finalizeSnapshotSubmission(
        { sessionId: "sess-13", userId: "user-1", operationId: "", disclosed: false, fileSnapshot: makeSnapshot(GOOD_FILES) },
        fakeDeps(w)
      ), "OPERATION_ID_REQUIRED");
  }

  // --- UP-08: every code has actionable recovery; no secret leakage -------------------------------
  {
    for (const code of SUBMISSION_ERROR_CODES) {
      const rec = recoveryForCode(code);
      check(`code ${code} has actionable recovery`, typeof rec === "string" && rec.length > 20, rec.slice(0, 40));
      const st = httpStatusForCode(code);
      check(`code ${code} maps to 4xx/5xx`, st >= 400 && st < 600, String(st));
      check(`code ${code} recovery leaks no secrets`, !leaksSecrets(rec));
    }

    // Raw (non-SubmissionError) failures become INFRA_ERROR with no detail leak.
    const res = toSubmitErrorResponse(new Error("db exploded: password=hunter2-password, key=sk-live-SECRET-12345"));
    check("raw error -> INFRA_ERROR", res.body.error.code === "INFRA_ERROR");
    check("raw error message leaks no secrets", !leaksSecrets(res.body.error.message + res.body.error.recovery));
    check("raw error -> 502", res.status === 502);
    check("error body preserves work flag", res.body.error.workPreserved === true);

    // SubmissionError round-trips its code with its own message.
    const se = new SubmissionError("PATH_UNSAFE", "Unsafe file path \"x\": absolute path");
    const res2 = toSubmitErrorResponse(se);
    check("SubmissionError keeps code", res2.body.error.code === "PATH_UNSAFE");
    check("SubmissionError keeps message", res2.body.error.message.includes("Unsafe file path"));
    check("SubmissionError -> 422", res2.status === 422);

    // Hostile inputs never surface secrets in rejection messages.
    const w = newWorld();
    addSession(w, "sess-14", "user-1");
    const hostileFiles: Record<string, string> = {
      "../../etc/passwd": "x",
      "src/secret.ts": `const key = "sk-live-SECRET-12345"; // hunter2-password`,
    };
    const seen: string[] = [];
    for (const [p, c] of Object.entries(hostileFiles)) {
      const snap = makeSnapshot({ [p]: c });
      try {
        await finalizeSnapshotSubmission(
          { sessionId: "sess-14", userId: "user-1", operationId: `op-${p}`, disclosed: false, fileSnapshot: snap },
          fakeDeps(w)
        );
      } catch (err) {
        if (err instanceof SubmissionError) seen.push(err.message, err.recovery);
        const rec = w.transfers.get("sess-14");
        if (rec?.failureMessage) seen.push(rec.failureMessage);
        await syncDeps(w).storeTransferTransition("sess-14", "rejected", "local_draft").catch(() => {});
      }
    }
    check("hostile rejections leak no secrets", !seen.some(leaksSecrets), seen.join(" | ").slice(0, 200));
  }

  console.log(`\n${count - failures}/${count} passed`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("UNEXPECTED", err);
  process.exit(1);
});
