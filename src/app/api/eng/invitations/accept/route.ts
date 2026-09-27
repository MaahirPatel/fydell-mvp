import { acceptInvitation } from "@/lib/eng/invitations";
import { engAdmin, jsonError, readJson, requireCandidate, str } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";

export async function POST(req: Request) {
  const gate = await requireCandidate();
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  const token = str(body?.token, 100);
  if (!token) return jsonError(400, "The invitation link is incomplete.");
  try {
    const attempt = await acceptInvitation(engAdmin(), token, gate.value);
    return ok({ attemptId: attempt.id });
  } catch (err) {
    return errorResponse(err, "accept-invitation");
  }
}
