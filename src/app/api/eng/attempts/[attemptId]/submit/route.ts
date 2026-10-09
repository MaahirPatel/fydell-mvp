import { jsonError, readJson, str } from "@/lib/eng/context";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { candidateAttempt, scheduleEvaluationWork } from "@/lib/eng/route-helpers";
import { submitAttempt, validateHandoff } from "@/lib/eng/submissions";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, scenario, user } = gate.value;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Missing submission.");
  const uploadId = str(body.uploadId, 36);
  if (!isUuid(uploadId)) return jsonError(400, "Upload an archive before submitting.");
  const handoff = validateHandoff(body);
  if (handoff.ok === false) return jsonError(400, handoff.error);
  try {
    const receipt = await submitAttempt(db, attempt, scenario, { uploadId, handoff: handoff.handoff, aiDisclosure: handoff.aiDisclosure }, user.id);
    // Also on a repeat: the original request may have died before its run was picked up.
    scheduleEvaluationWork();
    return ok({ receipt });
  } catch (err) {
    return errorResponse(err, "submit");
  }
}
