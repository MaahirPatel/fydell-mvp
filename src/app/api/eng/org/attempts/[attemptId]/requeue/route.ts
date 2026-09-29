import { jsonError, readJson, str } from "@/lib/eng/context";
import { requeueRun } from "@/lib/eng/evaluation/queue";
import { errorResponse, ok } from "@/lib/eng/http";
import { currentRun } from "@/lib/eng/reports";
import { orgAttempt, scheduleEvaluationWork } from "@/lib/eng/route-helpers";

export const maxDuration = 300;

/** Retries the tests for this attempt after a platform failure. Candidate results are never re-run. */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await orgAttempt((await params).attemptId, "retry_evaluation");
  if (gate.ok === false) return gate.response;
  const { db, member, attempt } = gate.value;
  const reason = str((await readJson(req))?.reason, 500);
  if (!reason) return jsonError(400, "Record why the tests are being retried.");
  const run = await currentRun(db, attempt.id);
  if (!run) return jsonError(404, "No evaluation for this attempt.");
  try {
    await requeueRun(db, run.id, member.email, reason);
    scheduleEvaluationWork();
    return ok({ requeued: true });
  } catch (err) {
    return errorResponse(err, "org-requeue");
  }
}
