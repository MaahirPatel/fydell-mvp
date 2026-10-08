import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createInvitation } from "@/lib/eng/invitations";
import { isOrgRole } from "@/lib/eng/permissions";
import { getScenario } from "@/lib/eng/scenarios";
import { TASK_FAMILIES } from "@/lib/eng/taxonomy";
import type { EngMember } from "@/lib/eng/context";
import type { InvitationRow, RoleRow } from "@/lib/eng/types";
import { deadlineProblem, zonedTimeToUtc, type EvidenceGap, type WorkSampleInviteInput } from "./evidence-gap";
import { getApplicationForOrg } from "./applications";
import { getRole, type RoleRecord } from "./roles";

export type WorkSampleOption = {
  scenarioVersionId: string;
  scenarioKey: string;
  version: number;
  title: string;
  taskFamilies: string[];
};

type VersionRow = {
  id: string;
  scenario_key: string;
  version: number;
  title: string;
  organization_id: string | null;
  archived_at: string | null;
  origin: "fydell_reviewed" | "employer_authored";
};

/**
 * Published hiring work samples this workspace may use: Fydell-reviewed ones
 * and the workspace's own. Only the latest version of each scenario that this
 * server can actually run is offered.
 */
export async function listWorkSampleOptions(organizationId: string): Promise<WorkSampleOption[]> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("eng_scenario_versions")
    .select("id,scenario_key,version,title,organization_id,archived_at,origin")
    .eq("status", "published")
    .eq("purpose", "hiring")
    .or(`organization_id.is.null,organization_id.eq.${organizationId}`)
    .order("version", { ascending: false });
  const latest = new Map<string, VersionRow>();
  for (const row of (data ?? []) as VersionRow[]) {
    if (row.archived_at) continue;
    const runnable = row.origin === "employer_authored" ? row.organization_id === organizationId : Boolean(getScenario(row.scenario_key, row.version));
    if (!runnable) continue;
    if (!latest.has(row.scenario_key)) latest.set(row.scenario_key, row);
  }
  return [...latest.values()].map((r) => ({
    scenarioVersionId: r.id,
    scenarioKey: r.scenario_key,
    version: r.version,
    title: r.title,
    taskFamilies: TASK_FAMILIES.filter((t) => t.scenarioKeys.includes(r.scenario_key)).map((t) => t.label),
  }));
}

export type ApplicationInvitation = {
  id: string;
  status: InvitationRow["status"];
  emailDelivery: InvitationRow["email_delivery"];
  scenarioTitle: string;
  scenarioVersion: number;
  expiresAt: string;
  deadlineTimezone: string | null;
  evidenceGap: EvidenceGap | null;
  attemptStatus: string | null;
  createdAt: string;
};

function readGap(raw: unknown): EvidenceGap | null {
  if (typeof raw !== "object" || raw === null) return null;
  const g = raw as Record<string, unknown>;
  const s = (k: string) => (typeof g[k] === "string" ? (g[k] as string) : "");
  if (!s("requirementId")) return null;
  return {
    requirementId: s("requirementId"),
    requirementText: s("requirementText"),
    uncertainCapability: s("uncertainCapability"),
    whyItMatters: s("whyItMatters"),
    observableWork: s("observableWork"),
  };
}

type InvitationJoin = {
  id: string;
  status: InvitationRow["status"];
  email_delivery: InvitationRow["email_delivery"];
  expires_at: string;
  deadline_timezone: string | null;
  evidence_gap: unknown;
  created_at: string;
  eng_scenario_versions: { title: string; version: number } | null;
  eng_attempts: Array<{ status: string }> | { status: string } | null;
};

export async function listApplicationInvitations(organizationId: string, applicationId: string): Promise<ApplicationInvitation[]> {
  if (!/^[0-9a-f-]{36}$/.test(applicationId)) return [];
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("eng_invitations")
    .select("id,status,email_delivery,expires_at,deadline_timezone,evidence_gap,created_at,eng_scenario_versions(title,version),eng_attempts(status)")
    .eq("organization_id", organizationId)
    .eq("application_id", applicationId)
    .eq("is_preview", false)
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown as InvitationJoin[]).map((r) => {
    const attempt = Array.isArray(r.eng_attempts) ? r.eng_attempts[0] : r.eng_attempts;
    return {
      id: r.id,
      status: r.status,
      emailDelivery: r.email_delivery,
      scenarioTitle: r.eng_scenario_versions?.title ?? "Work sample",
      scenarioVersion: r.eng_scenario_versions?.version ?? 0,
      expiresAt: r.expires_at,
      deadlineTimezone: r.deadline_timezone,
      evidenceGap: readGap(r.evidence_gap),
      attemptStatus: attempt?.status ?? null,
      createdAt: r.created_at,
    };
  });
}

export class WorkSampleError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** The assessment role that carries invitations for one hiring role and scenario version. */
async function engRoleFor(role: RoleRecord, scenarioVersionId: string, userId: string): Promise<RoleRow> {
  const db = createAdminSupabaseClient();
  const { data: existing } = await db
    .from("eng_roles")
    .select("*")
    .eq("organization_id", role.organizationId)
    .eq("hiring_role_id", role.id)
    .eq("scenario_version_id", scenarioVersionId)
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as RoleRow;
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("eng_roles")
    .insert({
      organization_id: role.organizationId,
      hiring_role_id: role.id,
      title: role.title.slice(0, 120),
      role_family: "backend_engineer",
      stack: role.intake.languages.slice(0, 12).map((l) => l.slice(0, 40)),
      responsibilities: role.intake.responsibilities.join("\n").slice(0, 2000),
      evaluation_focus: ["correctness", "engineering_judgment"],
      company_context: role.intake.teamContext.slice(0, 1500),
      scenario_version_id: scenarioVersionId,
      status: "published",
      published_at: now,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error || !data) throw new WorkSampleError("Could not prepare the work sample for this role. Nothing was sent; try again.", 500);
  return data as RoleRow;
}

/**
 * An open invitation for this application and scenario version. Also matches
 * by assessment role and email, which covers an invitation whose application
 * link was not written yet.
 */
async function activeInvitation(
  organizationId: string,
  applicationId: string,
  scenarioVersionId: string,
  byRole: { engRoleId: string; email: string } | null,
): Promise<{ id: string } | null> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("eng_invitations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("application_id", applicationId)
    .eq("scenario_version_id", scenarioVersionId)
    .in("status", ["invited", "accepted"])
    .limit(1)
    .maybeSingle();
  if (data || !byRole) return (data as { id: string } | null) ?? null;
  const { data: sameRole } = await db
    .from("eng_invitations")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("role_id", byRole.engRoleId)
    .eq("candidate_email", byRole.email)
    .in("status", ["invited", "accepted"])
    .limit(1)
    .maybeSingle();
  return (sameRole as { id: string } | null) ?? null;
}

export type InviteActor = { userId: string; email: string; organizationId: string; organizationName: string; role: string };

/**
 * Invites an applicant to one work sample because of one named evidence gap.
 * Idempotent per application and scenario version: a repeat returns the
 * invitation already sent. Delivery follows the existing invitation flow.
 */
export async function inviteApplicantToWorkSample(
  actor: InviteActor,
  roleId: string,
  applicationId: string,
  input: WorkSampleInviteInput,
  now: Date = new Date(),
): Promise<{ invitationId: string; created: boolean }> {
  if (!isOrgRole(actor.role)) throw new WorkSampleError("Your workspace role can't send invitations.", 403);
  const [role, application] = await Promise.all([getRole(actor.organizationId, roleId), getApplicationForOrg(actor.organizationId, applicationId)]);
  if (!role || !application || application.roleId !== role.id) throw new WorkSampleError("That application is not in your workspace.", 404);
  if (application.status !== "submitted") throw new WorkSampleError("This applicant withdrew, so they can't be invited.", 409);

  const requirement = role.intake.requirements.find((r) => r.id === input.requirementId && r.confirmed);
  if (!requirement) throw new WorkSampleError("That requirement is no longer on this role. Reload to see the current requirements.", 400);

  const options = await listWorkSampleOptions(actor.organizationId);
  if (!options.some((o) => o.scenarioVersionId === input.scenarioVersionId)) {
    throw new WorkSampleError("That work sample isn't available to your workspace.", 400);
  }

  const deadline = zonedTimeToUtc(input.deadlineLocal, input.timeZone);
  if (!deadline) throw new WorkSampleError("Choose a deadline date and time.", 400);
  const late = deadlineProblem(deadline, now);
  if (late) throw new WorkSampleError(late, 400);

  const engRole = await engRoleFor(role, input.scenarioVersionId, actor.userId);
  const byRole = { engRoleId: engRole.id, email: application.email.toLowerCase() };
  const prior = await activeInvitation(actor.organizationId, application.id, input.scenarioVersionId, byRole);
  if (prior) return { invitationId: prior.id, created: false };

  const member: EngMember = {
    userId: actor.userId,
    email: actor.email,
    organizationId: actor.organizationId,
    organizationName: actor.organizationName,
    role: actor.role,
  };
  let invitationId: string;
  try {
    const { invitation } = await createInvitation(createAdminSupabaseClient(), member, engRole, {
      email: application.email,
      name: application.name,
      userId: application.applicantUserId,
    });
    invitationId = invitation.id;
  } catch (err) {
    const raced = await activeInvitation(actor.organizationId, application.id, input.scenarioVersionId, byRole);
    if (raced) return { invitationId: raced.id, created: false };
    console.error("[hiring] work sample invitation failed", err instanceof Error ? err.message : "unknown");
    throw new WorkSampleError("Could not send the invitation. Nothing was sent; try again.", 500);
  }

  const gap: EvidenceGap = {
    requirementId: requirement.id,
    requirementText: requirement.text,
    uncertainCapability: input.uncertainCapability,
    whyItMatters: input.whyItMatters,
    observableWork: input.observableWork,
  };
  const { error } = await createAdminSupabaseClient()
    .from("eng_invitations")
    .update({
      hiring_role_id: role.id,
      application_id: application.id,
      evidence_gap: gap,
      deadline_timezone: input.timeZone,
      expires_at: deadline.toISOString(),
    })
    .eq("id", invitationId)
    .eq("organization_id", actor.organizationId);
  if (error) console.error(`[hiring] invitation ${invitationId} was sent but its application link was not saved: ${error.message}`);
  return { invitationId, created: true };
}
