import { engAdmin, jsonError, readJson, requireEngAction, str } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { inviteMember, listMembers } from "@/lib/eng/members";
import { isOrgRole } from "@/lib/eng/permissions";

export async function GET() {
  const gate = await requireEngAction("view_roles");
  if (gate.ok === false) return gate.response;
  return ok({ members: await listMembers(engAdmin(), gate.value.organizationId) });
}

export async function POST(req: Request) {
  const gate = await requireEngAction("manage_members");
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  if (!isOrgRole(body?.role)) return jsonError(400, "Choose a role.");
  try {
    const result = await inviteMember(engAdmin(), gate.value, str(body?.email, 254), body.role);
    return ok(result);
  } catch (err) {
    return errorResponse(err, "invite-member");
  }
}
