import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { SubmissionError, toSubmitErrorResponse } from "@/lib/submissions/errors";
import {
  driveSyncAction,
  finalizeSnapshotSubmission,
  recoverFinalizeState,
  type SyncAction,
} from "@/lib/submissions/finalize";
import { realFinalizeDeps, realRecoveryDeps } from "@/lib/submissions/real-deps";

export const runtime = "nodejs";

/**
 * Snapshot-transfer lifecycle for the desktop client (UP-03, DESK-15, DESK-16).
 *
 * GET: reconcile - returns the current transfer state, and the existing
 * receipt when the attempt already submitted. The client calls this after a
 * reconnect or a lost submit response instead of submitting again.
 *
 * POST { action }:
 * - begin_sync      → local_draft/failed → syncing
 * - sync_complete   → syncing → server_saved
 * - sync_failed     → syncing → failed   (body: code, message)
 * - reset_to_draft  → rejected/failed/server_saved/syncing → local_draft
 * - finalize        → idempotent snapshot submit (body: operationId,
 *                     fileSnapshot, answers?, externalAiDisclosed?)
 *
 * All transitions go through `submit_transfer_transition`, which refuses
 * stale or illegal moves - repeated/concurrent requests cannot regress
 * states. Every error is a structured { code, message, recovery } body.
 */

type FinalizeAction = SyncAction | "finalize";

const SYNC_ACTIONS: readonly string[] = ["begin_sync", "sync_complete", "sync_failed", "reset_to_draft"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const recovery = await recoverFinalizeState(realRecoveryDeps(), id, user.id);
    return NextResponse.json({ ok: true, transfer: recovery });
  } catch (err) {
    const res = toSubmitErrorResponse(err);
    return NextResponse.json(res.body, { status: res.status });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const action = body.action as FinalizeAction | undefined;

  try {
    // Ownership check first (UP-02): every action requires the caller's session.
    await realRecoveryDeps().getSession(id, user.id);

    if (typeof action !== "string" || ![...SYNC_ACTIONS, "finalize"].includes(action)) {
      throw new SubmissionError("SNAPSHOT_SHAPE", `Unknown finalize action ${JSON.stringify(String(action))}`);
    }

    if (action === "finalize") {
      const operationId = body.operationId;
      if (typeof operationId !== "string" || operationId.length === 0) {
        throw new SubmissionError("OPERATION_ID_REQUIRED");
      }
      const disclosure = (body.answers as { __aiDisclosure?: { used?: boolean } } | undefined)?.__aiDisclosure;
      const disclosed =
        typeof disclosure?.used === "boolean" ? disclosure.used : Boolean(body.externalAiDisclosed);
      const result = await finalizeSnapshotSubmission(
        {
          sessionId: id,
          userId: user.id,
          operationId,
          disclosed,
          fileSnapshot: body.fileSnapshot,
          answers:
            body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
              ? (body.answers as Record<string, unknown>)
              : undefined,
        },
        realFinalizeDeps()
      );
      return NextResponse.json({
        ok: true,
        submissionId: result.submissionId || undefined,
        alreadySubmitted: result.alreadySubmitted,
        receiptHash: result.receiptHash || undefined,
        inFlight: result.inFlight ?? false,
        transferState: result.state,
      });
    }

    const deps = realFinalizeDeps();
    const state = await driveSyncAction(
      { getSession: deps.getSession, loadTransfer: deps.loadTransfer, storeTransferTransition: deps.storeTransferTransition },
      id,
      user.id,
      action,
      action === "sync_failed"
        ? {
            code: typeof body.code === "string" ? body.code : "SYNC_FAILED",
            message: typeof body.message === "string" ? body.message : "Sync interrupted",
          }
        : undefined
    );
    return NextResponse.json({ ok: true, transferState: state });
  } catch (err) {
    const res = toSubmitErrorResponse(err);
    return NextResponse.json(res.body, { status: res.status });
  }
}
