import { readJson } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { buildCollaborationView, sendTeamMessage } from "@/lib/eng/authored/collaboration";

export const maxDuration = 60;

/** Sends a message to one simulated teammate and stores the reply. Retries with the same client id are safe. */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, user, authored } = gate.value;
  const body = await readJson(req);
  try {
    await sendTeamMessage(db, authored, user.id, { teammateId: body?.teammateId, body: body?.body, clientMsgId: body?.clientMsgId });
    return ok({ collaboration: await buildCollaborationView(db, authored, { release: false }) });
  } catch (err) {
    return errorResponse(err, "authored-team");
  }
}
