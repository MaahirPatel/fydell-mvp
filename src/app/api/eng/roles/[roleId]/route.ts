import { engAdmin, jsonError, readJson, requireEngAction } from "@/lib/eng/context";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { getRoleForOrg, setRoleStatus, updateDraftRole, validateRoleInput } from "@/lib/eng/roles";

type Ctx = { params: Promise<{ roleId: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { roleId } = await params;
  const gate = await requireEngAction("manage_roles");
  if (gate.ok === false) return gate.response;
  if (!isUuid(roleId)) return jsonError(404, "Role not found.");
  const db = engAdmin();
  const role = await getRoleForOrg(db, roleId, gate.value.organizationId);
  if (!role) return jsonError(404, "Role not found.");
  const body = await readJson(req);
  if (!body) return jsonError(400, "Missing role details.");
  try {
    if (body.status === "published" || body.status === "archived") {
      return ok({ role: await setRoleStatus(db, role, body.status) });
    }
    const input = validateRoleInput(body);
    if (input.ok === false) return jsonError(400, input.error);
    return ok({ role: await updateDraftRole(db, role, input.value) });
  } catch (err) {
    return errorResponse(err, "update-role");
  }
}
