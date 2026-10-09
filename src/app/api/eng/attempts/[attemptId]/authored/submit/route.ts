import { jsonError, readJson } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { scheduleEvaluationWork } from "@/lib/eng/route-helpers";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { existingAuthoredReceipt, submitAuthored, validateAuthoredHandoff } from "@/lib/eng/authored/runtime";

export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, user, authored } = gate.value;
  try {
    const previous = await existingAuthoredReceipt(db, authored, user.id);
    if (previous) {
      scheduleEvaluationWork();
      return ok({ receipt: previous }, 200);
    }
  } catch (err) {
    return errorResponse(err, "authored-submit");
  }
  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid request.");
  const handoff = validateAuthoredHandoff(authored.pkg, body);
  if (handoff.ok === false) return jsonError(422, handoff.error);
  try {
    const receipt = await submitAuthored(db, authored, {
        files: body.files,
        handoff: handoff.handoff,
        aiDisclosure: handoff.aiDisclosure,
        clientSubmissionId: typeof body.client_submission_id === "string" ? body.client_submission_id : null,
      }, user.id);
    scheduleEvaluationWork();
    return ok({ receipt }, receipt.alreadySubmitted ? 200 : 201);
  } catch (err) {
    return errorResponse(err, "authored-submit");
  }
}
