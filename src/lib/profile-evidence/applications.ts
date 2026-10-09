import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications/store";
import { revokeShare } from "@/lib/passport/store";
import { employerEvidenceAccess, parseEvidenceContent, type EvidenceVersionContent, type QuestionInput } from "./contract";
import { recordEvidenceEvent } from "./events";
import { UUID, type Failure } from "./ids";
import { gatherSources, publishEvidenceVersion } from "./store";
import { getRole } from "@/lib/hiring/roles";
import { SAMPLE_PREFIX } from "./work-samples";

export type PreparedEvidence = { projectKey: string; versionId: string; version: number; reused: boolean };

/**
 * Resolves the applicant's ordered selection to immutable versions before
 * anything is sent. Unchanged evidence reuses the version already published,
 * so one prepared project goes to many applications as the same version.
 */
export async function prepareApplicationEvidence(ownerId: string, keys: string[]): Promise<{ ok: true; items: PreparedEvidence[] } | Failure> {
  const items: PreparedEvidence[] = [];
  for (const key of keys) {
    const g = await gatherSources(ownerId, key);
    if ("ok" in g) return { ok: false, status: 400, error: "One of the selected projects is no longer in your profile. Reload and choose again." };
    if (g.isPrivate) {
      return { ok: false, status: 400, error: `"${g.sources.presentation?.title ?? key}" is marked private in your profile. Make it shareable, or leave it out.` };
    }
    const published = await publishEvidenceVersion(ownerId, key, "application");
    if (published.ok === false) return published;
    items.push({ projectKey: g.sources.projectKey, versionId: published.versionId, version: published.version, reused: published.reused });
  }
  return { ok: true, items };
}

export async function attachApplicationEvidence(applicationId: string, items: PreparedEvidence[], organizationId: string | null = null): Promise<boolean> {
  if (items.length === 0) return true;
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("application_evidence")
    .insert(items.map((item, position) => ({ application_id: applicationId, evidence_version_id: item.versionId, position })));
  if (error) return false;
  await recordEvidenceEvent("application_pinned", {
    application_id: applicationId,
    project_count: items.length,
    reused_count: items.filter((i) => i.reused).length,
  }, organizationId);
  return true;
}

export type PinnedEvidence = {
  versionId: string;
  version: number;
  position: number;
  projectKey: string;
  publishedAt: string;
  revokedAt: string | null;
  /** Null when the recipient may not see it (revoked or withdrawn). */
  content: EvidenceVersionContent | null;
};

type PinnedRow = {
  position: number;
  revoked_at: string | null;
  evidence_versions: { id: string; version: number; project_key: string; created_at: string; content: unknown } | null;
};

async function pinnedRows(applicationId: string): Promise<PinnedRow[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("application_evidence")
    .select("position,revoked_at,evidence_versions(id,version,project_key,created_at,content)")
    .eq("application_id", applicationId)
    .order("position", { ascending: true });
  return (data ?? []) as unknown as PinnedRow[];
}

type AppRow = { id: string; organization_id: string; applicant_user_id: string; status: "submitted" | "withdrawn"; share_id: string | null; role_id: string; role_snapshot: { title?: unknown } | null };

async function loadApplication(applicationId: string): Promise<AppRow | null> {
  if (!UUID.test(applicationId)) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("role_applications")
    .select("id,organization_id,applicant_user_id,status,share_id,role_id,role_snapshot")
    .eq("id", applicationId)
    .maybeSingle();
  return (data as AppRow | null) ?? null;
}

export type EmployerEvidence = { access: "visible" | "withdrawn"; items: PinnedEvidence[] };

/**
 * The evidence an application pinned, as the hiring team may see it. Every
 * read checks the organization, the application status and per-project
 * revocation; content the team may not see never leaves the server.
 */
export async function getApplicationEvidenceForOrg(organizationId: string, applicationId: string, viewerId: string | null = null): Promise<EmployerEvidence | null> {
  const app = await loadApplication(applicationId);
  if (!app || app.organization_id !== organizationId) return null;
  const rows = await pinnedRows(app.id);
  const items: PinnedEvidence[] = rows.flatMap((r) => {
    const v = r.evidence_versions;
    if (!v) return [];
    const access = employerEvidenceAccess({ sameOrganization: true, applicationStatus: app.status, revokedAt: r.revoked_at });
    return [{
      versionId: v.id,
      version: v.version,
      position: r.position,
      projectKey: access === "visible" ? v.project_key : "",
      publishedAt: v.created_at,
      revokedAt: r.revoked_at,
      content: access === "visible" ? parseEvidenceContent(v.content) : null,
    }];
  });
  if (viewerId && app.status === "submitted") {
    await recordEvidenceEvent(
      "employer_evidence_viewed",
      { application_id: app.id, visible_count: items.filter((i) => i.content).length, revoked_count: items.filter((i) => i.revokedAt).length },
      organizationId,
    );
  }
  return { access: app.status === "withdrawn" ? "withdrawn" : "visible", items };
}

/** The applicant's own view of what each application pinned, including revoked items. */
export async function getApplicationEvidenceForApplicant(userId: string, applicationId: string): Promise<PinnedEvidence[] | null> {
  const app = await loadApplication(applicationId);
  if (!app || app.applicant_user_id !== userId) return null;
  return (await pinnedRows(app.id)).flatMap((r) => {
    const v = r.evidence_versions;
    return v
      ? [{ versionId: v.id, version: v.version, position: r.position, projectKey: v.project_key, publishedAt: v.created_at, revokedAt: r.revoked_at, content: parseEvidenceContent(v.content) }]
      : [];
  });
}

/**
 * Stops one team seeing one project. The pinned version stays stored for the
 * record; the team's access ends on their next read. The role's share link is
 * narrowed the same way, so the project is gone from every view the team has.
 */
export async function revokeApplicationEvidence(userId: string, applicationId: string, versionId: string): Promise<{ ok: true } | Failure> {
  const app = await loadApplication(applicationId);
  if (!app || app.applicant_user_id !== userId || !UUID.test(versionId)) return { ok: false, status: 404, error: "That application was not found." };
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("application_evidence")
    .update({ revoked_at: new Date().toISOString() })
    .eq("application_id", app.id)
    .eq("evidence_version_id", versionId)
    .is("revoked_at", null)
    .select("evidence_versions(project_key)");
  const row = (data ?? [])[0] as unknown as { evidence_versions: { project_key: string } | null } | undefined;
  if (!row) return { ok: false, status: 409, error: "That project is already removed from this application." };
  const key = row.evidence_versions?.project_key ?? "";
  if (app.share_id && key && !key.startsWith(SAMPLE_PREFIX)) await narrowShare(userId, app.share_id, key);
  await recordEvidenceEvent("application_evidence_revoked", { application_id: app.id }, app.organization_id);
  return { ok: true };
}

async function narrowShare(userId: string, shareId: string, projectKey: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("passport_shares").select("passport_id,project_repos,pinned_project_ids,revoked_at").eq("id", shareId).maybeSingle();
  const share = data as { passport_id: string; project_repos: string[] | null; pinned_project_ids: string[] | null; revoked_at: string | null } | null;
  if (!share || share.revoked_at) return;
  const repos = (share.project_repos ?? []).filter((r) => r.toLowerCase() !== projectKey.toLowerCase());
  const { data: snapshots } = await admin.from("passport_projects").select("id").eq("passport_id", share.passport_id).eq("repo_full_name", projectKey);
  const drop = new Set(((snapshots ?? []) as Array<{ id: string }>).map((s) => s.id));
  const pinned = (share.pinned_project_ids ?? []).filter((id) => !drop.has(id));
  if (repos.length === 0) {
    await revokeShare(userId, shareId);
    return;
  }
  await admin.from("passport_shares").update({ project_repos: repos, pinned_project_ids: share.pinned_project_ids ? pinned : null }).eq("id", shareId);
}

/* ------------------------------------------------------------------ */
/* Targeted questions on an application                                 */
/* ------------------------------------------------------------------ */

export type ApplicationQuestion = {
  id: string;
  applicationId: string;
  evidenceVersionId: string | null;
  findingId: string | null;
  /** The role requirement this asks about, with its text as it was when asked. */
  requirement: { id: string; text: string } | null;
  question: string;
  response: string;
  status: "open" | "answered" | "closed";
  dueAt: string | null;
  answeredAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type QuestionRow = {
  id: string;
  organization_id: string;
  application_id: string;
  evidence_version_id: string | null;
  finding_id: string | null;
  requirement_id: string | null;
  requirement_text: string | null;
  question: string;
  response: string;
  status: ApplicationQuestion["status"];
  asked_by: string | null;
  due_at: string | null;
  answered_at: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const Q_COLUMNS = "id,organization_id,application_id,evidence_version_id,finding_id,requirement_id,requirement_text,question,response,status,asked_by,due_at,answered_at,reviewed_at,created_at";

const toQuestion = (r: QuestionRow): ApplicationQuestion => ({
  id: r.id,
  applicationId: r.application_id,
  evidenceVersionId: r.evidence_version_id,
  findingId: r.finding_id,
  requirement: r.requirement_id ? { id: r.requirement_id, text: r.requirement_text ?? "" } : null,
  question: r.question,
  response: r.response,
  status: r.status,
  dueAt: r.due_at,
  answeredAt: r.answered_at,
  reviewedAt: r.reviewed_at,
  createdAt: r.created_at,
});

/**
 * Keeps the application stage in step with its questions: an open question
 * means the team is waiting on the applicant, and once none are open it is
 * back in review. Never moves a closed application.
 */
async function syncStageWithQuestions(applicationId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { count } = await admin
    .from("application_questions")
    .select("id", { count: "exact", head: true })
    .eq("application_id", applicationId)
    .eq("status", "open");
  const waiting = (count ?? 0) > 0;
  await admin
    .from("role_applications")
    .update({ stage: waiting ? "awaiting_candidate" : "in_review", updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("status", "submitted")
    .in("stage", waiting ? ["new", "in_review"] : ["awaiting_candidate"]);
}

/**
 * Asks the applicant a targeted question. Works with or without a share; an
 * optional reference must point at evidence this application pinned and the
 * team can still see. A repeated clientRequestId returns the first question.
 */
export async function askApplicationQuestion(
  organizationId: string,
  applicationId: string,
  askedBy: string,
  input: QuestionInput,
): Promise<{ ok: true; question: ApplicationQuestion; created: boolean } | Failure> {
  const app = await loadApplication(applicationId);
  if (!app || app.organization_id !== organizationId) return { ok: false, status: 404, error: "Application not found." };
  if (app.status !== "submitted") return { ok: false, status: 409, error: "The applicant withdrew, so nothing new can be sent." };
  const admin = createAdminSupabaseClient();
  const existing = async () => {
    if (!input.clientRequestId) return null;
    const { data } = await admin
      .from("application_questions")
      .select(Q_COLUMNS)
      .eq("organization_id", organizationId)
      .eq("client_request_id", input.clientRequestId)
      .maybeSingle();
    return data ? toQuestion(data as QuestionRow) : null;
  };
  const prior = await existing();
  if (prior) return { ok: true, question: prior, created: false };

  if (input.evidenceVersionId) {
    const pinned = (await pinnedRows(app.id)).find((r) => r.evidence_versions?.id === input.evidenceVersionId && !r.revoked_at);
    const content = pinned?.evidence_versions ? parseEvidenceContent(pinned.evidence_versions.content) : null;
    if (!content) return { ok: false, status: 400, error: "That project is not part of what this applicant shared." };
    if (input.findingId && !content.findings.some((f) => f.id === input.findingId)) {
      return { ok: false, status: 400, error: "That finding is not in the version they shared." };
    }
  }
  let requirementText: string | null = null;
  if (input.requirementId) {
    const role = app.role_id ? await getRole(organizationId, app.role_id) : null;
    const requirement = role?.intake.requirements.find((r) => r.id === input.requirementId && r.confirmed);
    if (!requirement) return { ok: false, status: 400, error: "That requirement is no longer on this role. Reload and try again." };
    requirementText = requirement.text;
  }
  const { data, error } = await admin
    .from("application_questions")
    .insert({
      organization_id: organizationId,
      application_id: app.id,
      evidence_version_id: input.evidenceVersionId,
      finding_id: input.findingId,
      requirement_id: input.requirementId,
      requirement_text: requirementText,
      question: input.question,
      asked_by: askedBy,
      due_at: input.dueAt,
      client_request_id: input.clientRequestId,
    })
    .select(Q_COLUMNS)
    .single();
  if (error || !data) {
    const raced = error?.code === "23505" ? await existing() : null;
    if (raced) return { ok: true, question: raced, created: false };
    return { ok: false, status: 500, error: "Could not send the question. Your draft is kept; try again." };
  }
  await syncStageWithQuestions(app.id);
  const roleTitle = typeof app.role_snapshot?.title === "string" ? app.role_snapshot.title : "a role";
  await notifyUser(app.applicant_user_id, {
    kind: "question_received",
    title: "A hiring team asked you a question",
    body: `About your application for ${roleTitle}. Answer it from the application.`,
    href: `/app/candidate/applications/${app.id}`,
  });
  await recordEvidenceEvent(
    "employer_question_asked",
    {
      application_id: app.id,
      about_project: !!input.evidenceVersionId,
      about_finding: !!input.findingId,
      about_requirement: !!input.requirementId,
      has_due_date: !!input.dueAt,
    },
    organizationId,
  );
  await recordEvidenceEvent("employer_next_step", { application_id: app.id, step: "question" }, organizationId);
  return { ok: true, question: toQuestion(data as QuestionRow), created: true };
}

export async function listApplicationQuestionsForOrg(organizationId: string, applicationId: string): Promise<ApplicationQuestion[]> {
  if (!UUID.test(applicationId)) return [];
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("application_questions")
    .select(Q_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true })
    .limit(100);
  return ((data ?? []) as QuestionRow[]).map(toQuestion);
}

export async function listApplicationQuestionsForApplicant(userId: string, applicationId: string): Promise<ApplicationQuestion[]> {
  const app = await loadApplication(applicationId);
  if (!app || app.applicant_user_id !== userId) return [];
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("application_questions")
    .select(Q_COLUMNS)
    .eq("application_id", app.id)
    .order("created_at", { ascending: true })
    .limit(100);
  return ((data ?? []) as QuestionRow[]).map(toQuestion);
}

/** The applicant answers. Closed questions and withdrawn applications refuse, checked inside the write. */
export async function answerApplicationQuestion(userId: string, questionId: string, responseRaw: string): Promise<{ ok: true; question: ApplicationQuestion } | Failure> {
  if (!UUID.test(questionId)) return { ok: false, status: 404, error: "Question not found." };
  const response = responseRaw.trim();
  if (!response) return { ok: false, status: 400, error: "Write an answer first." };
  if (response.length > 4000) return { ok: false, status: 400, error: "Keep the answer under 4,000 characters." };
  const admin = createAdminSupabaseClient();
  const { data: row } = await admin.from("application_questions").select(Q_COLUMNS).eq("id", questionId).maybeSingle();
  const current = row as QuestionRow | null;
  if (!current) return { ok: false, status: 404, error: "Question not found." };
  const app = await loadApplication(current.application_id);
  if (!app || app.applicant_user_id !== userId) return { ok: false, status: 404, error: "Question not found." };
  if (app.status !== "submitted") return { ok: false, status: 409, error: "You withdrew this application, so the team can no longer read answers." };
  const { data } = await admin
    .from("application_questions")
    .update({ response, status: "answered", answered_at: new Date().toISOString(), reviewed_at: null })
    .eq("id", current.id)
    .neq("status", "closed")
    .select(Q_COLUMNS)
    .maybeSingle();
  if (!data) return { ok: false, status: 409, error: "The team closed this question, so it can no longer be answered." };
  const saved = toQuestion(data as QuestionRow);
  await syncStageWithQuestions(app.id);
  if (current.asked_by) {
    await notifyUser(current.asked_by, {
      kind: "question_answered",
      title: "An applicant answered your question",
      body: current.question.length > 120 ? `${current.question.slice(0, 117)}...` : current.question,
      href: `/app/employer/openings/${app.role_id}/applications/${app.id}`,
    });
  }
  await recordEvidenceEvent("question_answered", { application_id: app.id }, app.organization_id);
  return { ok: true, question: saved };
}

/** The team marks an answer read, or closes a question. */
export async function updateApplicationQuestion(organizationId: string, questionId: string, action: "reviewed" | "close"): Promise<ApplicationQuestion | null> {
  if (!UUID.test(questionId)) return null;
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const patch = action === "reviewed" ? { reviewed_at: now } : { status: "closed", closed_at: now };
  const { data } = await admin
    .from("application_questions")
    .update(patch)
    .eq("id", questionId)
    .eq("organization_id", organizationId)
    .select(Q_COLUMNS)
    .maybeSingle();
  if (!data) return null;
  const saved = data as QuestionRow;
  if (action === "close") await syncStageWithQuestions(saved.application_id);
  return toQuestion(saved);
}
