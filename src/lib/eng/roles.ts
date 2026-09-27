import "server-only";
import type { Admin, EngMember } from "./context";
import { ensureCurrentScenarioVersion } from "./scenario-versions";
import type { RoleRow } from "./types";
import type { RubricDimensionKey } from "./scenarios/types";

export const FOCUS_OPTIONS: { key: RubricDimensionKey; label: string }[] = [
  { key: "correctness", label: "Correctness" },
  { key: "engineering_judgment", label: "Engineering judgment" },
  { key: "requirement_response", label: "Response to changing requirements" },
  { key: "work_communication", label: "Work communication" },
];

export interface RoleInput {
  title: string;
  stack: string[];
  responsibilities: string;
  evaluationFocus: RubricDimensionKey[];
  companyContext: string;
}

export function validateRoleInput(body: Record<string, unknown>): { ok: true; value: RoleInput } | { ok: false; error: string } {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 2 || title.length > 120) return { ok: false, error: "Give the role a title between 2 and 120 characters." };
  const responsibilities = typeof body.responsibilities === "string" ? body.responsibilities.trim() : "";
  if (responsibilities.length > 2000) return { ok: false, error: "Keep responsibilities under 2,000 characters." };
  const companyContext = typeof body.companyContext === "string" ? body.companyContext.trim() : "";
  if (companyContext.length > 1500) return { ok: false, error: "Keep company context under 1,500 characters." };
  const stackRaw = Array.isArray(body.stack) ? body.stack : [];
  const stack = stackRaw
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 40)
    .slice(0, 12);
  const allowed = new Set(FOCUS_OPTIONS.map((f) => f.key));
  const focusRaw = Array.isArray(body.evaluationFocus) ? body.evaluationFocus : [];
  const evaluationFocus = [...new Set(focusRaw.filter((f): f is RubricDimensionKey => typeof f === "string" && allowed.has(f as RubricDimensionKey)))];
  if (evaluationFocus.length === 0) return { ok: false, error: "Choose at least one thing the assessment should show." };
  return { ok: true, value: { title, stack, responsibilities, evaluationFocus, companyContext } };
}

export async function createRole(db: Admin, member: EngMember, input: RoleInput): Promise<RoleRow> {
  const version = await ensureCurrentScenarioVersion(db);
  const { data, error } = await db
    .from("eng_roles")
    .insert({
      organization_id: member.organizationId,
      title: input.title,
      role_family: "backend_engineer",
      stack: input.stack,
      responsibilities: input.responsibilities,
      evaluation_focus: input.evaluationFocus,
      company_context: input.companyContext,
      scenario_version_id: version.id,
      status: "draft",
      created_by: member.userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not create role: ${error.message}`);
  return data as RoleRow;
}

export async function getRoleForOrg(db: Admin, roleId: string, organizationId: string): Promise<RoleRow | null> {
  const { data } = await db
    .from("eng_roles")
    .select("*")
    .eq("id", roleId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as RoleRow) ?? null;
}

export async function updateDraftRole(db: Admin, role: RoleRow, input: RoleInput): Promise<RoleRow> {
  if (role.status !== "draft") throw new Error("Only draft roles can be edited. Create a new role to change a published one.");
  const { data, error } = await db
    .from("eng_roles")
    .update({
      title: input.title,
      stack: input.stack,
      responsibilities: input.responsibilities,
      evaluation_focus: input.evaluationFocus,
      company_context: input.companyContext,
    })
    .eq("id", role.id)
    .eq("status", "draft")
    .select("*")
    .single();
  if (error) throw new Error(`Could not update role: ${error.message}`);
  return data as RoleRow;
}

export async function setRoleStatus(db: Admin, role: RoleRow, next: "published" | "archived"): Promise<RoleRow> {
  if (role.status === next) return role;
  if (role.status === "archived") throw new Error("This role is archived.");
  const patch = next === "published" ? { status: next, published_at: new Date().toISOString() } : { status: next, archived_at: new Date().toISOString() };
  const { data, error } = await db
    .from("eng_roles")
    .update(patch)
    .eq("id", role.id)
    .eq("status", role.status)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Could not update role: ${error.message}`);
  if (!data) throw new Error("The role changed while you were editing it. Reload and try again.");
  return data as RoleRow;
}
