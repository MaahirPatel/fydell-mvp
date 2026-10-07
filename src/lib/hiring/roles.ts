import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  acceptsApplications,
  closedReason,
  nextStatus,
  publishProblems,
  roleState,
  slugFor,
  type RemotePolicy,
  type RoleInput,
  type RoleState,
  type RoleTransition,
} from "./role-contract";

export type RoleRecord = RoleInput & {
  id: string;
  organizationId: string;
  status: string;
  state: RoleState;
  slug: string | null;
  publishedAt: string | null;
  requirementsVersion: number;
  genuineConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicRole = Omit<RoleRecord, "organizationId" | "genuineConfirmedAt" | "status"> & {
  organizationName: string;
  accepting: boolean;
  closedReason: string | null;
};

type Row = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  seniority: string | null;
  location: string | null;
  remote_policy: RemotePolicy | null;
  employment_type: string | null;
  compensation: string | null;
  evaluation_criteria: string[] | null;
  responsibilities: string[] | null;
  preferred_criteria: string[] | null;
  hiring_steps: string[] | null;
  expected_effort: string | null;
  application_deadline: string | null;
  contact_email: string | null;
  status: string;
  public_slug: string | null;
  published_at: string | null;
  rubric_version: number | null;
  genuine_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id,organization_id,title,description,seniority,location,remote_policy,employment_type,compensation,evaluation_criteria,responsibilities,preferred_criteria,hiring_steps,expected_effort,application_deadline,contact_email,status,public_slug,published_at,rubric_version,genuine_confirmed_at,created_at,updated_at";

function toRecord(r: Row): RoleRecord {
  const criteria = r.evaluation_criteria ?? [];
  return {
    id: r.id,
    organizationId: r.organization_id,
    title: r.title,
    description: r.description ?? "",
    seniority: r.seniority ?? "",
    location: r.location ?? "",
    remotePolicy: r.remote_policy,
    employmentType: r.employment_type ?? "",
    compensation: r.compensation ?? "",
    required: criteria.length > 0 ? criteria : (r.responsibilities ?? []),
    preferred: r.preferred_criteria ?? [],
    hiringSteps: r.hiring_steps ?? [],
    expectedEffort: r.expected_effort ?? "",
    applicationDeadline: r.application_deadline,
    contactEmail: r.contact_email ?? "",
    status: r.status,
    state: roleState(r.status),
    slug: r.public_slug,
    publishedAt: r.published_at,
    requirementsVersion: r.rubric_version ?? 1,
    genuineConfirmedAt: r.genuine_confirmed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toColumns(input: RoleInput) {
  return {
    title: input.title,
    description: input.description,
    seniority: input.seniority || null,
    location: input.location || null,
    remote_policy: input.remotePolicy,
    employment_type: input.employmentType || null,
    compensation: input.compensation || null,
    evaluation_criteria: input.required,
    preferred_criteria: input.preferred,
    hiring_steps: input.hiringSteps,
    expected_effort: input.expectedEffort || null,
    application_deadline: input.applicationDeadline,
    contact_email: input.contactEmail || null,
  };
}

export class RoleError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function createRole(organizationId: string, userId: string, input: RoleInput): Promise<RoleRecord> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("hiring_roles")
    .insert({ ...toColumns(input), organization_id: organizationId, department: "Engineering", status: "draft", created_by: userId, rubric_version: 1 })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new RoleError("Could not save the role. Your entries are kept; try again.", 500);
  return toRecord(data as Row);
}

export async function getRole(organizationId: string, roleId: string): Promise<RoleRecord | null> {
  if (!/^[0-9a-f-]{36}$/.test(roleId)) return null;
  const db = createAdminSupabaseClient();
  const { data } = await db.from("hiring_roles").select(COLUMNS).eq("id", roleId).eq("organization_id", organizationId).maybeSingle();
  return data ? toRecord(data as Row) : null;
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Saves edits. Once a role has been published, a change to its requirements
 * bumps the requirements version; applications keep the version they saw.
 */
export async function updateRole(organizationId: string, roleId: string, input: RoleInput): Promise<RoleRecord> {
  const current = await getRole(organizationId, roleId);
  if (!current) throw new RoleError("That role is not in your workspace.", 404);
  if (current.state === "filled" || current.state === "closed") {
    throw new RoleError("Filled and closed roles can't be edited, so past reviews keep their context. Create a new role instead.", 409);
  }
  const requirementsChanged = !sameList(current.required, input.required) || !sameList(current.preferred, input.preferred);
  const bump = requirementsChanged && current.state !== "draft";
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("hiring_roles")
    .update({ ...toColumns(input), rubric_version: bump ? current.requirementsVersion + 1 : current.requirementsVersion, updated_at: new Date().toISOString() })
    .eq("id", roleId)
    .eq("organization_id", organizationId)
    .eq("updated_at", current.updatedAt)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new RoleError("Could not save the role. Your entries are kept; try again.", 500);
  if (!data) throw new RoleError("Someone else changed this role while you were editing. Reload to see their version; your text is kept here.", 409);
  return toRecord(data as Row);
}

export async function transitionRole(
  organizationId: string,
  roleId: string,
  userId: string,
  action: RoleTransition,
  confirmGenuine: boolean,
): Promise<RoleRecord> {
  const current = await getRole(organizationId, roleId);
  if (!current) throw new RoleError("That role is not in your workspace.", 404);
  const to = nextStatus(current.status, action);
  if (!to) throw new RoleError(`A ${current.state} role can't be changed that way.`, 409);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: to, updated_at: now };
  if (action === "publish") {
    const problems = publishProblems(current, confirmGenuine);
    if (problems.length > 0) throw new RoleError(problems.join(" "), 400);
    patch.public_slug = current.slug ?? slugFor(current.title, randomBytes(4).toString("hex"));
    patch.published_at = now;
    patch.opened_at = now;
    patch.genuine_confirmed_at = now;
    patch.genuine_confirmed_by = userId;
  }
  if (action === "fill" || action === "close") patch.closed_at = now;
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("hiring_roles")
    .update(patch)
    .eq("id", roleId)
    .eq("organization_id", organizationId)
    .eq("status", current.status)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new RoleError("Could not change the role. Nothing was changed; try again.", 500);
  if (!data) throw new RoleError("The role changed while you were looking at it. Reload and try again.", 409);
  return toRecord(data as Row);
}

export type RoleListItem = RoleRecord & { applications: number; newApplications: number };

export async function listRoles(organizationId: string): Promise<RoleListItem[]> {
  const db = createAdminSupabaseClient();
  const [{ data: roles }, { data: apps }] = await Promise.all([
    db.from("hiring_roles").select(COLUMNS).eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200),
    db.from("role_applications").select("role_id,stage").eq("organization_id", organizationId).eq("status", "submitted"),
  ]);
  const rows = (apps ?? []) as Array<{ role_id: string; stage: string }>;
  return ((roles ?? []) as Row[]).map((r) => {
    const mine = rows.filter((a) => a.role_id === r.id);
    return { ...toRecord(r), applications: mine.length, newApplications: mine.filter((a) => a.stage === "new").length };
  });
}

/** The public role page. Drafts never resolve, even with a guessed slug. */
export async function getPublicRole(slug: string): Promise<PublicRole | null> {
  if (!/^[a-z0-9][a-z0-9-]{4,79}$/.test(slug)) return null;
  const db = createAdminSupabaseClient();
  const { data } = await db.from("hiring_roles").select(`${COLUMNS},organizations(name)`).eq("public_slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as unknown as Row & { organizations: { name: string } | null };
  const r = toRecord(row);
  if (r.state === "draft") return null;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    seniority: r.seniority,
    location: r.location,
    remotePolicy: r.remotePolicy,
    employmentType: r.employmentType,
    compensation: r.compensation,
    required: r.required,
    preferred: r.preferred,
    hiringSteps: r.hiringSteps,
    expectedEffort: r.expectedEffort,
    applicationDeadline: r.applicationDeadline,
    contactEmail: r.contactEmail,
    state: r.state,
    slug: r.slug,
    publishedAt: r.publishedAt,
    requirementsVersion: r.requirementsVersion,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    organizationName: row.organizations?.name ?? "A hiring team",
    accepting: acceptsApplications(r.status, r.applicationDeadline),
    closedReason: closedReason(r.status, r.applicationDeadline),
  };
}

/** Internal lookup for applications: the role id and org behind a public slug. */
export async function roleForSlug(slug: string): Promise<(RoleRecord & { organizationName: string }) | null> {
  if (!/^[a-z0-9][a-z0-9-]{4,79}$/.test(slug)) return null;
  const db = createAdminSupabaseClient();
  const { data } = await db.from("hiring_roles").select(`${COLUMNS},organizations(name)`).eq("public_slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as unknown as Row & { organizations: { name: string } | null };
  return { ...toRecord(row), organizationName: row.organizations?.name ?? "A hiring team" };
}
