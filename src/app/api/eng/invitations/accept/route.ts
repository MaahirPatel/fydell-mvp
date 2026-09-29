import { acceptInvitation, acceptInvitationById } from "@/lib/eng/invitations";
import { engAdmin, jsonError, readJson, requireCandidate, str } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";

export async function POST(req: Request) {
  const gate = await requireCandidate();
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  const token = str(body?.token, 100);
  const invitationId = str(body?.invitationId, 36);
  try {
    const attempt = token
      ? await acceptInvitation(engAdmin(), token, gate.value)
      : invitationId
        ? await acceptInvitationById(engAdmin(), invitationId, gate.value)
        : null;
    if (!attempt) return jsonError(400, "The invitation link is incomplete.");
    return ok({ attemptId: attempt.id });
  } catch (err) {
    return errorResponse(err, "accept-invitation");
  }
}
