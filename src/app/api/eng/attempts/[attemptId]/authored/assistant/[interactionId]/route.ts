import { readJson } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { decideAssistantPatch } from "@/lib/eng/authored/collaboration";

/** Records whether the candidate accepted or rejected a proposed patch, and the revision it was saved in. */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string; interactionId: string }> }) {
  const { attemptId, interactionId } = await params;
  const gate = await authoredCandidateAttempt(attemptId);
  if (gate.ok === false) return gate.response;
  const { db, user, authored } = gate.value;
  const body = await readJson(req);
  try {
    const interaction = await decideAssistantPatch(db, authored, user.id, interactionId, { decision: body?.decision, appliedRevision: body?.appliedRevision });
    return ok({ interaction });
  } catch (err) {
    return errorResponse(err, "authored-assistant-decision");
  }
}
