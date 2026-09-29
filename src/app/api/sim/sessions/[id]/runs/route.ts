import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getSessionForCandidate, recordEvent } from "@/lib/simulations/db";
import { toCandidateView } from "@/lib/engineering/evaluate";
import { RunRefused, runPractice } from "@/lib/engineering/run";
import { engineeringRunDeps, engineeringScenarioForTemplate } from "@/lib/engineering/session";
import { WorkspaceRejected } from "@/lib/engineering/workspace";

export const runtime = "nodejs";
export const maxDuration = 180;

const CLIENT_RUN_ID = /^[A-Za-z0-9_-]{8,80}$/;

/**
 * POST: run the scenario's provided tests (plus any tests the candidate added)
 * against exactly the files in the request, in an isolated runner. The
 * response carries the snapshot hash the results belong to (DESK-12).
 *   body: { files: { [path]: content }, clientRunId?: string }
 *
 * GET: the candidate's recent runs for this attempt, newest first.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { files?: unknown; clientRunId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const files = body.files;
  if (
    typeof files !== "object" ||
    files === null ||
    Array.isArray(files) ||
    !Object.values(files).every((v) => typeof v === "string")
  ) {
    return NextResponse.json(
      { error: "files must map each path to its text content", code: "INVALID_FILES" },
      { status: 400 }
    );
  }
  const clientRunId = typeof body.clientRunId === "string" ? body.clientRunId : null;
  if (clientRunId !== null && !CLIENT_RUN_ID.test(clientRunId)) {
    return NextResponse.json({ error: "Invalid clientRunId", code: "INVALID_CLIENT_RUN_ID" }, { status: 400 });
  }

  let session;
  try {
    session = await getSessionForCandidate(id, user.id);
  } catch (err) {
    const forbidden = err instanceof Error && err.message === "Forbidden";
    return NextResponse.json({ error: forbidden ? "Forbidden" : "Session not found" }, { status: forbidden ? 403 : 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json(
      { error: "Tests can only run while the assessment is in progress.", code: "SESSION_NOT_ACTIVE" },
      { status: 409 }
    );
  }
  const scenarioId = await engineeringScenarioForTemplate(session.template_id);
  if (!scenarioId) {
    return NextResponse.json({ error: "This assessment has no runnable tests.", code: "NO_TESTS" }, { status: 404 });
  }

  try {
    const deps = await engineeringRunDeps(scenarioId);
    const { runId, reused, result } = await runPractice(deps, {
      sessionId: id,
      userId: user.id,
      clientRunId,
      files: files as Record<string, string>,
    });
    if (result && !reused) {
      // Server-observed evidence (SIM-08): that a run happened, on which
      // saved version, and its outcome counts. Never the output itself.
      await recordEvent(id, {
        eventType: "test_run_completed",
        actor: "system",
        payload: {
          runId,
          snapshotHash: result.candidateSnapshotHash,
          status: result.status,
          summary: result.summary,
          candidateTests: result.tests.filter((t) => t.origin === "candidate").length,
        },
        clientEventId: `test-run:${runId}`,
      }).catch((err) => console.error(`[runs] event record failed for ${id}:`, err));
    }
    return NextResponse.json({
      ok: true,
      runId,
      reused,
      status: result ? result.status : "running",
      run: result ? toCandidateView(result) : null,
    });
  } catch (err) {
    if (err instanceof WorkspaceRejected) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          path: err.path,
          recovery: "Fix or remove the named file, save, and run the tests again. Your other work is unchanged.",
          workPreserved: true,
        },
        { status: 400 }
      );
    }
    if (err instanceof RunRefused) {
      return NextResponse.json(
        { error: err.message, code: err.code, workPreserved: true },
        { status: err.code === "RATE_LIMITED" ? 429 : 409 }
      );
    }
    console.error(`[runs] practice run failed for session ${id}:`, err);
    return NextResponse.json(
      {
        error: "The test runner is unavailable right now. Your saved work is unchanged; try again shortly.",
        code: "INFRA_ERROR",
        workPreserved: true,
      },
      { status: 502 }
    );
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let session;
  try {
    session = await getSessionForCandidate(id, user.id);
  } catch (err) {
    const forbidden = err instanceof Error && err.message === "Forbidden";
    return NextResponse.json({ error: forbidden ? "Forbidden" : "Session not found" }, { status: forbidden ? 403 : 404 });
  }
  const scenarioId = await engineeringScenarioForTemplate(session.template_id);
  if (!scenarioId) return NextResponse.json({ runs: [] });
  const deps = await engineeringRunDeps(scenarioId);
  const runs = await deps.store.listRuns(id, "practice", 10);
  return NextResponse.json({
    runs: runs.map((r) => ({
      runId: r.id,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
      candidateSnapshotHash: r.candidateSnapshotHash,
      run: r.result ? toCandidateView(r.result) : null,
    })),
  });
}
