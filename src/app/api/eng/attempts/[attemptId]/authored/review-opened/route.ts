import { recordEngEvent } from "@/lib/eng/events";
import { errorResponse, ok } from "@/lib/eng/http";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { buildCollaborationView } from "@/lib/eng/authored/collaboration";

/** The candidate opened Review submission. May release the planned review question, once. */
export async function POST(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, user, authored } = gate.value;
  try {
    if (authored.attempt.status === "in_progress") {
      await recordEngEvent(db, authored.attempt.id, {
        type: "review_opened",
        actor: "candidate",
        actorUserId: user.id,
        payload: {},
        clientEventId: "review_opened_first",
      });
    }
    return ok({ collaboration: await buildCollaborationView(db, authored, { reviewOpened: true }) });
  } catch (err) {
    return errorResponse(err, "authored-review-opened");
  }
}
