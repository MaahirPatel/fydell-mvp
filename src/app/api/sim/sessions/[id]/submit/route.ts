import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import {
  getSessionForCandidate,
  getSessionState,
  getVersionContent,
  saveSessionState,
  submitSession,
} from "@/lib/simulations/db";
import { toSubmitErrorResponse } from "@/lib/submissions/errors";
import { finalizeSnapshotSubmission } from "@/lib/submissions/finalize";
import { realFinalizeDeps } from "@/lib/submissions/real-deps";
import { isMicroContent } from "@/lib/simulations/micro-types";

export const runtime = "nodejs";

/**
 * GET: submission review - completion summary for the confirm screen.
 * POST: confirm submission (idempotent). { externalAiDisclosed: boolean }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const session = await getSessionForCandidate(id, user.id);
    const content = await getVersionContent(session.template_version_id);
    const state = await getSessionState(id);

    if (isMicroContent(content)) {
      const fields = content.questions.map((q) => {
        const value = state.deliverable[q.id];
        const empty =
          value === undefined ||
          value === null ||
          (Array.isArray(value) ? value.length === 0 : String(value).trim() === "");
        return { key: q.id, label: q.prompt, required: true, complete: !empty };
      });
      return NextResponse.json({
        status: session.status,
        fields,
        incompleteRequired: fields.filter((f) => !f.complete).map((f) => f.label),
        taskCount: content.questions.length,
        completedTaskCount: fields.filter((f) => f.complete).length,
      });
    }

    const fields = content.deliverableFields.map((f) => {
      const value = state.deliverable[f.key];
      const empty = value === undefined || value === null || String(value).trim() === "";
      return { key: f.key, label: f.label, required: f.required, complete: !empty };
    });
    return NextResponse.json({
      status: session.status,
      fields,
      incompleteRequired: fields.filter((f) => f.required && !f.complete).map((f) => f.label),
      taskCount: content.tasks.length,
      completedTaskCount: state.completed_task_ids.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    externalAiDisclosed?: boolean;
    /** Idempotency key for the submit operation (DESK-15). Generated if absent. */
    operationId?: string;
    /** Final client answers; may include the "__aiDisclosure" key. */
    answers?: Record<string, unknown>;
    /**
     * W4: full file snapshot from the desktop client. When present, the
     * snapshot is validated (every hash recomputed server-side), the receipt
     * hash is computed by the server, and everything is stored transactionally
     * via `submit_session_atomic` (all files or none). Web candidates never
     * send this and take the existing path below, unchanged.
     */
    fileSnapshot?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const disclosure = body.answers?.["__aiDisclosure"] as { used?: boolean } | undefined;
    const disclosed =
      typeof disclosure?.used === "boolean" ? disclosure.used : Boolean(body.externalAiDisclosed);

    // W4 file-snapshot path (desktop). Goes through the idempotent finalize
    // core (UP-03/UP-06/DESK-15/DESK-16): transfer-state CAS, server-side
    // validation, atomic store, durable receipt. Rejections are structured
    // SubmissionErrors with actionable recovery (UP-08).
    if (body.fileSnapshot !== undefined && body.fileSnapshot !== null) {
      const answers =
        body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
          ? (body.answers as Record<string, unknown>)
          : undefined;
      try {
        const result = await finalizeSnapshotSubmission(
          {
            sessionId: id,
            userId: user.id,
            operationId:
              typeof body.operationId === "string" && body.operationId.length > 0
                ? body.operationId
                : `op_${id}_${Date.now()}`,
            disclosed,
            fileSnapshot: body.fileSnapshot,
            answers,
          },
          realFinalizeDeps()
        );
        return NextResponse.json({
          ok: true,
          submissionId: result.submissionId || undefined,
          alreadySubmitted: result.alreadySubmitted,
          receiptHash: result.receiptHash || undefined,
          transferState: result.state,
        });
      } catch (err) {
        const res = toSubmitErrorResponse(err);
        return NextResponse.json(res.body, { status: res.status });
      }
    }

    // Pass the client's final answers (including "__aiDisclosure") through to
    // the saved state so the submission snapshot carries them for scoring.
    if (body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)) {
      try {
        const state = await getSessionState(id);
        const merged = { ...state.deliverable, ...body.answers } as typeof state.deliverable;
        const saved = await saveSessionState(id, state.revision, { deliverable: merged });
        if ("conflict" in saved) {
          const conflict = saved.conflict;
          const remerged = { ...conflict.deliverable, ...body.answers } as typeof conflict.deliverable;
          await saveSessionState(id, conflict.revision, { deliverable: remerged });
        }
      } catch {
        // Autosave is the primary path for answers; a failed merge here must
        // not block submission.
      }
    }

    const result = await submitSession(id, user.id, disclosed);
    return NextResponse.json({
      ok: true,
      submissionId: result.submissionId,
      alreadySubmitted: result.alreadySubmitted,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Submission failed" },
      { status: 400 }
    );
  }
}
