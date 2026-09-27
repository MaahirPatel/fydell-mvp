import { engAdmin, jsonError, readJson, requireEngAction } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { createRole, validateRoleInput } from "@/lib/eng/roles";

export async function GET() {
  const gate = await requireEngAction("view_roles");
  if (gate.ok === false) return gate.response;
  const { data } = await engAdmin()
    .from("eng_roles")
    .select("*")
    .eq("organization_id", gate.value.organizationId)
    .order("created_at", { ascending: false });
  return ok({ roles: data ?? [] });
}

export async function POST(req: Request) {
  const gate = await requireEngAction("manage_roles");
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Missing role details.");
  const input = validateRoleInput(body);
  if (input.ok === false) return jsonError(400, input.error);
  try {
    const role = await createRole(engAdmin(), gate.value, input.value);
    return ok({ role }, 201);
  } catch (err) {
    return errorResponse(err, "create-role");
  }
}
