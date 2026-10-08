import { errorResponse, ok } from "@/lib/eng/http";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";
import { buildCollaborationView } from "@/lib/eng/authored/collaboration";

/** Team thread, assistant history and planned events. Releases any event that is due. */
export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  try {
    return ok({ collaboration: await buildCollaborationView(gate.value.db, gate.value.authored) });
  } catch (err) {
    return errorResponse(err, "authored-collaboration");
  }
}
