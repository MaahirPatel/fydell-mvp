import { engAdmin, jsonError, readJson, requireEngAction } from "@/lib/eng/context";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { changeMemberRole, removeMember } from "@/lib/eng/members";
import { isOrgRole } from "@/lib/eng/permissions";

type Ctx = { params: Promise<{ memberId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { memberId } = await params;
  const gate = await requireEngAction("manage_members");
  if (gate.ok === false) return gate.response;
  if (!isUuid(memberId)) return jsonError(404, "Member not found.");
  const body = await readJson(req);
  if (!isOrgRole(body?.role)) return jsonError(400, "Choose a role.");
  try {
    await changeMemberRole(engAdmin(), gate.value, memberId, body.role);
    return ok({ updated: true });
  } catch (err) {
    return errorResponse(err, "change-member-role");
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { memberId } = await params;
  const gate = await requireEngAction("manage_members");
  if (gate.ok === false) return gate.response;
  if (!isUuid(memberId)) return jsonError(404, "Member not found.");
  try {
    await removeMember(engAdmin(), gate.value, memberId);
    return ok({ removed: true });
  } catch (err) {
    return errorResponse(err, "remove-member");
  }
}
