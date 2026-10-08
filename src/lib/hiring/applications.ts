import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createShare, revokeShare } from "@/lib/passport/store";
import { shareState } from "@/lib/passport/sharing";
import { parseEvidenceSelection } from "@/lib/profile-evidence/contract";
import { attachApplicationEvidence, prepareApplicationEvidence } from "@/lib/profile-evidence/applications";
import { recordEvidenceEvent } from "@/lib/profile-evidence/events";
import { SAMPLE_PREFIX } from "@/lib/profile-evidence/work-samples";
import { notifyUser } from "@/lib/notifications/store";
import { acceptsApplications, closedReason, roleState, STAGE_LABEL, type ApplicationInput, type ApplicationStage, type RoleState } from "./role-contract";
import { roleForSlug } from "./roles";

export type RoleSnapshot = {
  title: string;
  organizationName: string;
  required: string[];
  preferred: string[];
  requirementsVersion: number;
  capturedAt: string;
};

type AppRow = {
  id: string;
  organization_id: string;
  role_id: string;
  applicant_user_id: string;
  contact_name: string;
  contact_email: string;
  share_id: string | null;
  review_id: string | null;
  links: string[];
  note: string;
  role_snapshot: RoleSnapshot;
  status: "submitted" | "withdrawn";
  stage: ApplicationStage;
  submitted_at: string;
  withdrawn_at: string | null;
  updated_at: string;
};

const APP_COLUMNS =
  "id,organization_id,role_id,applicant_user_id,contact_name,contact_email,share_id,review_id,links,note,role_snapshot,status,stage,submitted_at,withdrawn_at,updated_at";

type ShareJoin = { id: string; revoked_at: string | null; expires_at: string | null; project_repos: string[] | null; version_policy: string | null } | null;

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string; existingId?: string };

/**
 * Submits an application. Selected projects are shared through a new pinned
 * link scoped to this role, so later analyses never change what the team
 * reviews. One active application per person per role.
 */
export async function submitApplication(user: { id: string; email: string }, slug: string, input: ApplicationInput): Promise<SubmitResult> {
  const role = await roleForSlug(slug);
  if (!role || role.state === "draft" || role.intake.visibility === "private") return { ok: false, status: 404, error: "This role page doesn't exist or isn't published." };
  if (!acceptsApplications(role.status, role.applicationDeadline)) {
    return { ok: false, status: 409, error: closedReason(role.status, role.applicationDeadline) ?? "This role isn't taking applications." };
  }
  if (!user.email) return { ok: false, status: 400, error: "Your account needs an email address before you can apply." };
  const db = createAdminSupabaseClient();

  const { data: existing } = await db
    .from("role_applications")
    .select("id")
    .eq("role_id", role.id)
    .eq("applicant_user_id", user.id)
    .eq("status", "submitted")
    .maybeSingle();
  if (existing) {
    return { ok: false, status: 409, error: "You've already applied to this role. Your receipt has the details.", existingId: (existing as { id: string }).id };
  }

  const selection = parseEvidenceSelection(input.repos);
  if ("error" in selection) return { ok: false, status: 400, error: selection.error };
  const prepared = await prepareApplicationEvidence(user.id, selection);
  if (prepared.ok === false) return prepared;

  let shareId: string | null = null;
  const shareKeys = prepared.items.map((i) => i.projectKey).filter((k) => !k.startsWith(SAMPLE_PREFIX));
  if (shareKeys.length > 0) {
    const share = await createShare(user.id, `Application: ${role.organizationName}, ${role.title}`.slice(0, 80), ["projects", "evidence"], {
      repos: shareKeys,
      versionPolicy: "pinned",
    });
    if ("error" in share) return { ok: false, status: 409, error: share.error };
    shareId = share.id;
  }

  let reviewId: string | null = null;
  if (shareId) {
    const { data: review } = await db
      .from("employer_passport_reviews")
      .insert({ organization_id: role.organizationId, share_id: shareId, role_title: role.title.slice(0, 120) })
      .select("id")
      .single();
    reviewId = (review as { id: string } | null)?.id ?? null;
  }

  const snapshot: RoleSnapshot = {
    title: role.title,
    organizationName: role.organizationName,
    required: role.required,
    preferred: role.preferred,
    requirementsVersion: role.requirementsVersion,
    capturedAt: new Date().toISOString(),
  };
  const { data, error } = await db
    .from("role_applications")
    .insert({
      organization_id: role.organizationId,
      role_id: role.id,
      applicant_user_id: user.id,
      contact_name: input.contactName,
      contact_email: user.email.toLowerCase(),
      share_id: shareId,
      review_id: reviewId,
      links: input.links,
      note: input.note,
      role_snapshot: snapshot,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (shareId) await revokeShare(user.id, shareId);
    if (error?.code === "23505") return { ok: false, status: 409, error: "You've already applied to this role. Your receipt has the details." };
    return { ok: false, status: 500, error: "Your application wasn't sent. Nothing was shared; your entries are kept, so try again." };
  }
  const id = (data as { id: string }).id;
  if (!(await attachApplicationEvidence(id, prepared.items, role.organizationId))) {
    await db.from("role_applications").delete().eq("id", id).eq("applicant_user_id", user.id);
    if (shareId) await revokeShare(user.id, shareId);
    return { ok: false, status: 500, error: "Your application wasn't sent. Nothing was shared; your entries are kept, so try again." };
  }
  await notifyTeam(role.organizationId, role.id, role.title, input.contactName);
  return { ok: true, id };
}

async function notifyTeam(organizationId: string, roleId: string, roleTitle: string, applicant: string): Promise<void> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("organization_members")
    .select("user_id,role")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("role", ["owner", "admin", "hiring_manager", "reviewer"]);
  await Promise.all(
    ((data ?? []) as Array<{ user_id: string }>).map((m) =>
      notifyUser(m.user_id, {
        kind: "application_received",
        title: `New application for ${roleTitle}`,
        body: `${applicant} applied.`,
        href: `/app/employer/openings/${roleId}`,
      }),
    ),
  );
}

/** Withdraws an application and revokes its share, so the team loses access to the evidence. */
export async function withdrawApplication(userId: string, applicationId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(applicationId)) return false;
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("role_applications")
    .update({ status: "withdrawn", withdrawn_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("applicant_user_id", userId)
    .eq("status", "submitted")
    .select("share_id");
  const row = (data ?? [])[0] as { share_id: string | null } | undefined;
  if (!row) return false;
  if (row.share_id) await revokeShare(userId, row.share_id);
  return true;
}

export type ApplicantView = {
  id: string;
  roleTitle: string;
  organizationName: string;
  roleSlug: string | null;
  roleState: RoleState;
  submittedAt: string;
  withdrawnAt: string | null;
  status: "submitted" | "withdrawn";
  waitingOnYou: boolean;
  sharedProjects: string[];
  shareActive: boolean;
  links: string[];
  note: string;
  requirementsVersion: number;
  required: string[];
};

type ApplicantRow = AppRow & {
  hiring_roles: { status: string; public_slug: string | null } | null;
  passport_shares: ShareJoin;
};

function toApplicantView(r: ApplicantRow): ApplicantView {
  const share = r.passport_shares;
  return {
    id: r.id,
    roleTitle: r.role_snapshot.title,
    organizationName: r.role_snapshot.organizationName,
    roleSlug: r.hiring_roles?.public_slug ?? null,
    roleState: roleState(r.hiring_roles?.status ?? "archived"),
    submittedAt: r.submitted_at,
    withdrawnAt: r.withdrawn_at,
    status: r.status,
    waitingOnYou: r.status === "submitted" && r.stage === "awaiting_candidate",
    sharedProjects: share?.project_repos ?? [],
    shareActive: !!share && shareState({ revokedAt: share.revoked_at, expiresAt: share.expires_at }) === "active",
    links: r.links ?? [],
    note: r.note,
    requirementsVersion: r.role_snapshot.requirementsVersion,
    required: r.role_snapshot.required,
  };
}

const APPLICANT_SELECT = `${APP_COLUMNS},hiring_roles(status,public_slug),passport_shares(id,revoked_at,expires_at,project_repos,version_policy)`;

export async function listMyApplications(userId: string): Promise<ApplicantView[]> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("role_applications")
    .select(APPLICANT_SELECT)
    .eq("applicant_user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as unknown as ApplicantRow[]).map(toApplicantView);
}

export async function getMyApplication(userId: string, applicationId: string): Promise<ApplicantView | null> {
  if (!/^[0-9a-f-]{36}$/.test(applicationId)) return null;
  const db = createAdminSupabaseClient();
  const { data } = await db.from("role_applications").select(APPLICANT_SELECT).eq("id", applicationId).eq("applicant_user_id", userId).maybeSingle();
  return data ? toApplicantView(data as unknown as ApplicantRow) : null;
}

export type ApplicationListItem = {
  id: string;
  name: string;
  email: string;
  submittedAt: string;
  status: "submitted" | "withdrawn";
  stage: ApplicationStage;
  stageLabel: string;
  projects: number;
  links: number;
  hasNote: boolean;
  evidenceAvailable: boolean;
  reviewId: string | null;
  decision: string;
  nextAction: string;
  requirementsVersion: number;
};

type EmployerRow = AppRow & {
  passport_shares: ShareJoin;
  employer_passport_reviews: { decision: string } | null;
};

function nextActionFor(r: EmployerRow, evidenceAvailable: boolean): string {
  if (r.status === "withdrawn") return "None. The applicant withdrew.";
  if (r.stage === "closed") return "None";
  if (r.stage === "awaiting_candidate") return "Waiting on the applicant";
  if (!evidenceAvailable && (r.links ?? []).length === 0 && !r.note) return "Ask for evidence";
  if ((r.employer_passport_reviews?.decision ?? "none") === "none") return r.stage === "new" ? "Review evidence" : "Record a decision";
  return "Close or follow up";
}

export async function listApplicationsForRole(
  organizationId: string,
  roleId: string,
  filter: { stage?: ApplicationStage | "all"; q?: string; includeWithdrawn?: boolean } = {},
): Promise<ApplicationListItem[]> {
  const db = createAdminSupabaseClient();
  let query = db
    .from("role_applications")
    .select(`${APP_COLUMNS},passport_shares(id,revoked_at,expires_at,project_repos,version_policy),employer_passport_reviews(decision)`)
    .eq("organization_id", organizationId)
    .eq("role_id", roleId)
    .order("submitted_at", { ascending: false })
    .limit(500);
  if (!filter.includeWithdrawn) query = query.eq("status", "submitted");
  if (filter.stage && filter.stage !== "all") query = query.eq("stage", filter.stage);
  const { data } = await query;
  const q = (filter.q ?? "").trim().toLowerCase();
  return ((data ?? []) as unknown as EmployerRow[])
    .filter((r) => !q || r.contact_name.toLowerCase().includes(q) || r.contact_email.includes(q))
    .map((r) => {
      const share = r.passport_shares;
      const evidenceAvailable = !!share && shareState({ revokedAt: share.revoked_at, expiresAt: share.expires_at }) === "active";
      return {
        id: r.id,
        name: r.contact_name,
        email: r.contact_email,
        submittedAt: r.submitted_at,
        status: r.status,
        stage: r.stage,
        stageLabel: STAGE_LABEL[r.stage],
        projects: evidenceAvailable ? (share?.project_repos ?? []).length : 0,
        links: (r.links ?? []).length,
        hasNote: !!r.note,
        evidenceAvailable,
        reviewId: r.review_id,
        decision: r.employer_passport_reviews?.decision ?? "none",
        nextAction: nextActionFor(r, evidenceAvailable),
        requirementsVersion: r.role_snapshot.requirementsVersion,
      };
    });
}

export type EmployerApplication = {
  id: string;
  roleId: string;
  name: string;
  email: string;
  submittedAt: string;
  status: "submitted" | "withdrawn";
  stage: ApplicationStage;
  links: string[];
  note: string;
  snapshot: RoleSnapshot;
  reviewId: string | null;
  shareId: string | null;
  applicantUserId: string;
};

function toEmployerApplication(r: AppRow): EmployerApplication {
  return {
    id: r.id,
    roleId: r.role_id,
    name: r.contact_name,
    email: r.contact_email,
    submittedAt: r.submitted_at,
    status: r.status,
    stage: r.stage,
    links: r.links ?? [],
    note: r.note,
    snapshot: r.role_snapshot,
    reviewId: r.review_id,
    shareId: r.share_id,
    applicantUserId: r.applicant_user_id,
  };
}

/** The application behind an employer review, if the review came from a role page. */
export async function applicationForReview(organizationId: string, reviewId: string): Promise<EmployerApplication | null> {
  if (!/^[0-9a-f-]{36}$/.test(reviewId)) return null;
  const db = createAdminSupabaseClient();
  const { data } = await db.from("role_applications").select(APP_COLUMNS).eq("organization_id", organizationId).eq("review_id", reviewId).maybeSingle();
  return data ? toEmployerApplication(data as AppRow) : null;
}

export async function getApplicationForOrg(organizationId: string, applicationId: string): Promise<EmployerApplication | null> {
  if (!/^[0-9a-f-]{36}$/.test(applicationId)) return null;
  const db = createAdminSupabaseClient();
  const { data } = await db.from("role_applications").select(APP_COLUMNS).eq("organization_id", organizationId).eq("id", applicationId).maybeSingle();
  return data ? toEmployerApplication(data as AppRow) : null;
}

export async function setApplicationStage(organizationId: string, applicationId: string, stage: ApplicationStage): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(applicationId)) return false;
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("role_applications")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("organization_id", organizationId)
    .eq("status", "submitted")
    .select("id");
  const changed = (data ?? []).length > 0;
  if (changed) await recordEvidenceEvent("employer_next_step", { application_id: applicationId, step: `stage_${stage}` }, organizationId);
  return changed;
}
