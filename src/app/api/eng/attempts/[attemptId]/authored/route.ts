import { recordConsent } from "@/lib/eng/attempts";
import { jsonError, readJson } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { scheduleIfRunnable } from "@/lib/eng/route-helpers";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { buildAuthoredCandidateView, passEnvironmentCheck, startAuthored } from "@/lib/eng/authored/runtime";

export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, authored } = gate.value;
  try {
    const view = await buildAuthoredCandidateView(db, authored);
    if (view.attempt.status === "submitted") await scheduleIfRunnable(db, authored.attempt.id);
    return ok({ view });
  } catch (err) {
    return errorResponse(err, "authored-view");
  }
}

/** Setup steps: accept the terms, finish the environment check, start the timer. */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, user, authored } = gate.value;
  const body = await readJson(req);
  const action = body?.action;
  try {
    let attempt = authored.attempt;
    if (action === "consent") {
      attempt = await recordConsent(db, attempt, user.id);
    } else if (action === "environment_ready") {
      const { data: latest } = await db
        .from("eng_public_test_runs")
        .select("status, runner_label")
        .eq("attempt_id", attempt.id)
        .eq("purpose", "environment_check")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latest) return jsonError(409, "Run the environment check first.");
      if (latest.status === "ran") {
        attempt = await passEnvironmentCheck(db, attempt, user.id, `Checked on ${latest.runner_label ?? "the test runner"}`);
      } else if ((latest.status === "runner_unavailable" || latest.status === "infrastructure_error") && body?.continueWithoutCheck === true) {
        attempt = await passEnvironmentCheck(db, attempt, user.id, "Not checked: the test runner was unavailable");
      } else {
        return jsonError(409, "The environment check did not complete. Run it again, or continue without it if the runner is unavailable.");
      }
    } else if (action === "start") {
      attempt = await startAuthored(db, authored, user.id);
    } else {
      return jsonError(400, "Unknown action.");
    }
    const view = await buildAuthoredCandidateView(db, { ...authored, attempt });
    return ok({ view });
  } catch (err) {
    return errorResponse(err, "authored-setup");
  }
}
