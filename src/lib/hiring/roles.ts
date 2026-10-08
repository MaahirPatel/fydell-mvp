import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  EVIDENCE_KINDS,
  isLevel,
  isRoleFamily,
  isSpecialization,
  LEVEL_LABEL,
  WORK_SAMPLE_POLICY_LABEL,
  type EvidenceKind,
  type Level,
  type RoleFamily,
  type Specialization,
  type WorkSamplePolicy,
} from "@/lib/eng/taxonomy";
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
import { DEFAULT_ACCEPTED_EVIDENCE, type RoleIntakeInput, type Visibility } from "./intake-contract";
import {
  clampRequirementText,
  criteriaFrom,
  INITIAL_REQUIREMENT_VERSION,
  nextRequirementVersion,
  parseRequirements,
  requirementsChanged,
  requirementsFromLists,
  type RoleRequirement,
} from "./requirements";
import { allActiveMembers } from "./members";

/** Engineering intake details. Internal to the workspace; never on the public page. */
export type RoleIntake = {
  family: RoleFamily | null;
  specialization: Specialization | null;
  level: Level | null;
  ownership: string;
  responsibilities: string[];
  requirements: RoleRequirement[];
  languages: string[];
  teamContext: string;
  hiringOwner: string | null;
  reviewerIds: string[];
  acceptedEvidence: EvidenceKind[];
  workSamplePolicy: WorkSamplePolicy;
  visibility: Visibility;
  sourceDescription: string;
};

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
  intake: RoleIntake;
};

export type PublicRole = Omit<RoleRecord, "organizationId" | "genuineConfirmedAt" | "status" | "intake"> & {
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
  role_family: string | null;
  specialization: string | null;
  level: string | null;
  ownership: string | null;
  languages: string[] | null;
  team_context: string | null;
  hiring_owner: string | null;
  reviewer_ids: string[] | null;
  accepted_evidence: string[] | null;
  work_sample_policy: string | null;
  visibility: string | null;
  requirements: unknown;
  requirement_version: number | null;
  source_description: string | null;
};

const COLUMNS =
  "id,organization_id,title,description,seniority,location,remote_policy,employment_type,compensation,evaluation_criteria,responsibilities,preferred_criteria,hiring_steps,expected_effort,application_deadline,contact_email,status,public_slug,published_at,rubric_version,genuine_confirmed_at,created_at,updated_at,role_family,specialization,level,ownership,languages,team_context,hiring_owner,reviewer_ids,accepted_evidence,work_sample_policy,visibility,requirements,requirement_version,source_description";

function structuredRequirements(r: Row): RoleRequirement[] {
  const parsed = parseRequirements(r.requirements);
  if (parsed.ok && parsed.value.length > 0) return parsed.value;
  const legacy = (texts: string[] | null, kind: RoleRequirement["kind"], prefix: string): RoleRequirement[] =>
    (texts ?? []).map((text, i) => ({ id: `${prefix}${i}`, text: clampRequirementText(text), kind, source: "employer", confirmed: true }));
  return [...legacy(r.evaluation_criteria, "required", "legacy_r"), ...legacy(r.preferred_criteria, "preferred", "legacy_p")];
}

function toRecord(r: Row): RoleRecord {
  const requirements = structuredRequirements(r);
  const criteria = criteriaFrom(requirements);
  const workSamplePolicy = r.work_sample_policy && r.work_sample_policy in WORK_SAMPLE_POLICY_LABEL ? (r.work_sample_policy as WorkSamplePolicy) : "when_evidence_gap";
  const visibility: Visibility = r.visibility === "link" || r.visibility === "public" ? r.visibility : "private";
  const accepted = (r.accepted_evidence ?? []).filter((e): e is EvidenceKind => (EVIDENCE_KINDS as readonly string[]).includes(e));
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
    required: criteria.required,
    preferred: criteria.preferred,
    hiringSteps: r.hiring_steps ?? [],
    expectedEffort: r.expected_effort ?? "",
    applicationDeadline: r.application_deadline,
    contactEmail: r.contact_email ?? "",
    status: r.status,
    state: roleState(r.status),
    slug: r.public_slug,
    publishedAt: r.published_at,
    requirementsVersion: Math.max(r.requirement_version ?? 0, r.rubric_version ?? 1),
    genuineConfirmedAt: r.genuine_confirmed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    intake: {
      family: isRoleFamily(r.role_family) ? r.role_family : null,
      specialization: isSpecialization(r.specialization) ? r.specialization : null,
      level: isLevel(r.level) ? r.level : null,
      ownership: r.ownership ?? "",
      responsibilities: r.responsibilities ?? [],
      requirements,
      languages: r.languages ?? [],
      teamContext: r.team_context ?? "",
      hiringOwner: r.hiring_owner,
      reviewerIds: r.reviewer_ids ?? [],
      acceptedEvidence: accepted.length > 0 ? accepted : DEFAULT_ACCEPTED_EVIDENCE,
      workSamplePolicy,
      visibility,
      sourceDescription: r.source_description ?? "",
    },
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

function intakeColumns(input: RoleIntakeInput) {
  const criteria = criteriaFrom(input.requirements);
  return {
    title: input.title,
    description: input.description,
    seniority: LEVEL_LABEL[input.level],
    location: input.location || null,
    remote_policy: input.remotePolicy,
    employment_type: input.employmentType || null,
    compensation: input.compensation || null,
    evaluation_criteria: criteria.required,
    preferred_criteria: criteria.preferred,
    hiring_steps: input.hiringSteps,
    expected_effort: input.expectedEffort || null,
    application_deadline: input.applicationDeadline,
    contact_email: input.contactEmail || null,
    role_family: input.family,
    specialization: input.specialization,
    level: input.level,
    ownership: input.ownership || null,
    responsibilities: input.responsibilities,
    languages: input.languages,
    team_context: input.teamContext || null,
    hiring_owner: input.hiringOwner,
    reviewer_ids: input.reviewerIds,
    accepted_evidence: input.acceptedEvidence,
    work_sample_policy: input.workSamplePolicy,
    visibility: input.visibility,
    requirements: input.requirements,
    source_description: input.sourceDescription,
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

async function recordRequirementVersion(
  organizationId: string,
  roleId: string,
  version: number,
  requirements: RoleRequirement[],
  changedBy: string | null,
  reason: string,
): Promise<void> {
  const db = createAdminSupabaseClient();
  const { error } = await db.from("role_requirement_versions").insert({
    organization_id: organizationId,
    role_id: roleId,
    version,
    requirements: requirements.filter((r) => r.confirmed),
    change_reason: reason ? reason.slice(0, 500) : null,
    changed_by: changedBy,
  });
  if (error) console.error(`[hiring] requirement version ${version} for role ${roleId} was not recorded: ${error.message}`);
}

export async function createRole(organizationId: string, userId: string, input: RoleInput): Promise<RoleRecord> {
  const db = createAdminSupabaseClient();
  const requirements = requirementsFromLists(input.required, input.preferred);
  const { data, error } = await db
    .from("hiring_roles")
    .insert({
      ...toColumns(input),
      // This form has no visibility choice and its roles have always been reachable by link.
      visibility: "link",
      requirements,
      requirement_version: INITIAL_REQUIREMENT_VERSION,
      organization_id: organizationId,
      department: "Engineering",
      status: "draft",
      created_by: userId,
      rubric_version: INITIAL_REQUIREMENT_VERSION,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new RoleError("Could not save the role. Your entries are kept; try again.", 500);
  const role = toRecord(data as Row);
  await recordRequirementVersion(organizationId, role.id, INITIAL_REQUIREMENT_VERSION, requirements, userId, "Initial requirements");
  return role;
}

async function assertMembers(organizationId: string, input: RoleIntakeInput): Promise<void> {
  const ids = [...input.reviewerIds, ...(input.hiringOwner ? [input.hiringOwner] : [])];
  if (!(await allActiveMembers(organizationId, ids))) {
    throw new RoleError("The hiring owner and reviewers must be active members of your workspace. Reload the page to see current members.", 400);
  }
}

/** Creates a draft role from the engineering intake form. Version 1 of its requirements is recorded. */
export async function createRoleFromIntake(organizationId: string, userId: string, input: RoleIntakeInput): Promise<RoleRecord> {
  await assertMembers(organizationId, input);
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("hiring_roles")
    .insert({
      ...intakeColumns(input),
      organization_id: organizationId,
      department: "Engineering",
      status: "draft",
      created_by: userId,
      rubric_version: INITIAL_REQUIREMENT_VERSION,
      requirement_version: INITIAL_REQUIREMENT_VERSION,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) {
    console.error("[hiring] intake insert failed", error?.message ?? "no row");
    throw new RoleError("Could not save the role. Your entries are kept; try again.", 500);
  }
  const role = toRecord(data as Row);
  await recordRequirementVersion(organizationId, role.id, INITIAL_REQUIREMENT_VERSION, input.requirements, userId, input.changeReason || "Initial requirements");
  return role;
}

export async function getRole(organizationId: string, roleId: string): Promise<RoleRecord | null> {
  if (!/^[0-9a-f-]{36}$/.test(roleId)) return null;
  const db = createAdminSupabaseClient();
  const { data } = await db.from("hiring_roles").select(COLUMNS).eq("id", roleId).eq("organization_id", organizationId).maybeSingle();
  return data ? toRecord(data as Row) : null;
}

function assertEditable(current: RoleRecord | null): asserts current is RoleRecord {
  if (!current) throw new RoleError("That role is not in your workspace.", 404);
  if (current.state === "filled" || current.state === "closed") {
    throw new RoleError("Filled and closed roles can't be edited, so past reviews keep their context. Create a new role instead.", 409);
  }
}

function versionFields(current: RoleRecord, next: RoleRequirement[]): { version: number; changed: boolean } {
  const changed = requirementsChanged(current.intake.requirements, next);
  const bumped = nextRequirementVersion({ requirementVersion: current.requirementsVersion, legacyVersion: current.requirementsVersion }, changed);
  return { version: bumped ?? current.requirementsVersion, changed };
}

const CONFLICT = "Someone else changed this role while you were editing. Reload to see their version; your text is kept here.";

/**
 * Saves edits from the older plain-list form. A change to the requirements
 * starts a new requirements version; applications keep the version they saw.
 */
export async function updateRole(organizationId: string, roleId: string, input: RoleInput, userId?: string): Promise<RoleRecord> {
  const current = await getRole(organizationId, roleId);
  assertEditable(current);
  const requirements = requirementsFromLists(input.required, input.preferred, current.intake.requirements);
  const { version, changed } = versionFields(current, requirements);
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("hiring_roles")
    .update({ ...toColumns(input), requirements, rubric_version: version, requirement_version: version, updated_at: new Date().toISOString() })
    .eq("id", roleId)
    .eq("organization_id", organizationId)
    .eq("updated_at", current.updatedAt)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new RoleError("Could not save the role. Your entries are kept; try again.", 500);
  if (!data) throw new RoleError(CONFLICT, 409);
  if (changed) await recordRequirementVersion(organizationId, roleId, version, requirements, userId ?? null, "");
  return toRecord(data as Row);
}

/**
 * Saves the engineering intake. When the confirmed requirements change, the
 * requirements version increments and an append-only version row records
 * who changed them and why.
 */
export async function updateRoleFromIntake(
  organizationId: string,
  roleId: string,
  userId: string,
  input: RoleIntakeInput,
  expectedUpdatedAt: string | null,
): Promise<RoleRecord> {
  const current = await getRole(organizationId, roleId);
  assertEditable(current);
  if (expectedUpdatedAt && expectedUpdatedAt !== current.updatedAt) throw new RoleError(CONFLICT, 409);
  await assertMembers(organizationId, input);
  const { version, changed } = versionFields(current, input.requirements);
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("hiring_roles")
    .update({ ...intakeColumns(input), rubric_version: version, requirement_version: version, updated_at: new Date().toISOString() })
    .eq("id", roleId)
    .eq("organization_id", organizationId)
    .eq("updated_at", current.updatedAt)
    .select(COLUMNS)
    .maybeSingle();
  if (error) {
    console.error("[hiring] intake update failed", error.message);
    throw new RoleError("Could not save the role. Your entries are kept; try again.", 500);
  }
  if (!data) throw new RoleError(CONFLICT, 409);
  if (changed) await recordRequirementVersion(organizationId, roleId, version, input.requirements, userId, input.changeReason);
  return toRecord(data as Row);
}

export type RequirementVersion = { version: number; requirements: RoleRequirement[]; changeReason: string; changedBy: string | null; createdAt: string };

export async function listRequirementVersions(organizationId: string, roleId: string): Promise<RequirementVersion[]> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("role_requirement_versions")
    .select("version,requirements,change_reason,changed_by,created_at")
    .eq("organization_id", organizationId)
    .eq("role_id", roleId)
    .order("version", { ascending: false })
    .limit(50);
  return ((data ?? []) as Array<{ version: number; requirements: unknown; change_reason: string | null; changed_by: string | null; created_at: string }>).map((v) => {
    const parsed = parseRequirements(v.requirements);
    return { version: v.version, requirements: parsed.ok ? parsed.value : [], changeReason: v.change_reason ?? "", changedBy: v.changed_by, createdAt: v.created_at };
  });
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

/**
 * The public role page. Drafts never resolve, even with a guessed slug. A
 * private role resolves only for members of its own workspace, as a preview.
 */
export async function getPublicRole(slug: string, viewerUserId: string | null = null): Promise<PublicRole | null> {
  if (!/^[a-z0-9][a-z0-9-]{4,79}$/.test(slug)) return null;
  const db = createAdminSupabaseClient();
  const { data } = await db.from("hiring_roles").select(`${COLUMNS},organizations(name)`).eq("public_slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as unknown as Row & { organizations: { name: string } | null };
  const r = toRecord(row);
  if (r.state === "draft") return null;
  if (r.intake.visibility === "private" && !(viewerUserId && (await isActiveMember(r.organizationId, viewerUserId)))) return null;
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
    accepting: r.intake.visibility !== "private" && acceptsApplications(r.status, r.applicationDeadline),
    closedReason:
      r.intake.visibility === "private" ? "This role is private to your workspace. Change its visibility before anyone can apply." : closedReason(r.status, r.applicationDeadline),
  };
}

async function isActiveMember(organizationId: string, userId: string): Promise<boolean> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);
  return (data ?? []).length > 0;
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
