import { engAdmin, jsonError, readJson, str } from "@/lib/eng/context";
import { requeueRun } from "@/lib/eng/evaluation/queue";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { requireReviewer, scheduleEvaluationWork } from "@/lib/eng/route-helpers";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const gate = await requireReviewer();
  if (gate.ok === false) return gate.response;
  if (!isUuid(runId)) return jsonError(404, "Run not found.");
  const reason = str((await readJson(req))?.reason, 500);
  if (!reason) return jsonError(400, "Record why the run is being retried.");
  try {
    await requeueRun(engAdmin(), runId, gate.value.email, reason);
    scheduleEvaluationWork();
    return ok({ requeued: true });
  } catch (err) {
    return errorResponse(err, "requeue");
  }
}
