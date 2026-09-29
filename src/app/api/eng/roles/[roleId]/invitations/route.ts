import { engAdmin, jsonError, readJson, requireEngAction } from "@/lib/eng/context";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { createInvitation, normalizeCandidate } from "@/lib/eng/invitations";
import { getRoleForOrg } from "@/lib/eng/roles";

export async function POST(req: Request, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const gate = await requireEngAction("invite_candidates");
  if (gate.ok === false) return gate.response;
  if (!isUuid(roleId)) return jsonError(404, "Role not found.");
  const db = engAdmin();
  const role = await getRoleForOrg(db, roleId, gate.value.organizationId);
  if (!role) return jsonError(404, "Role not found.");
  const body = await readJson(req);
  const candidate = normalizeCandidate(body?.email, body?.name);
  if ("error" in candidate) return jsonError(400, candidate.error);
  try {
    const { invitation, url } = await createInvitation(db, gate.value, role, candidate);
    return ok({ invitationId: invitation.id, emailDelivery: invitation.email_delivery, url }, 201);
  } catch (err) {
    return errorResponse(err, "create-invitation");
  }
}
