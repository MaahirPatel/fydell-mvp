import { engAdmin, jsonError, readJson, requireEngAction, str } from "@/lib/eng/context";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { getInvitationForOrg, resendInvitation, withdrawInvitation } from "@/lib/eng/invitations";

export async function POST(req: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  const gate = await requireEngAction("manage_invitations");
  if (gate.ok === false) return gate.response;
  if (!isUuid(invitationId)) return jsonError(404, "Invitation not found.");
  const db = engAdmin();
  const invitation = await getInvitationForOrg(db, invitationId, gate.value.organizationId);
  if (!invitation) return jsonError(404, "Invitation not found.");
  const body = await readJson(req);
  try {
    if (body?.action === "resend") {
      const result = await resendInvitation(db, gate.value, invitation);
      return ok({ emailDelivery: result.invitation.email_delivery, url: result.url });
    }
    if (body?.action === "withdraw") {
      await withdrawInvitation(db, gate.value, invitation, str(body.reason, 500));
      return ok({ withdrawn: true });
    }
    return jsonError(400, "Unknown action.");
  } catch (err) {
    return errorResponse(err, "invitation-action");
  }
}
