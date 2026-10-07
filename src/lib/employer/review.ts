import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { shareState } from "@/lib/passport/sharing";
import { notifyUser } from "@/lib/notifications/store";

export type MappingStatus = "suggested" | "accepted" | "corrected" | "questioned" | "unresolved";
export type QuestionStatus = "open" | "answered" | "closed";

export interface EvidenceMapping {
  id: string;
  organizationId: string;
  roleId: string;
  shareId: string;
  requirementText: string;
  requirementIndex: number;
  evidenceProjectId: string | null;
  evidenceId: string | null;
  status: MappingStatus;
  reviewerNote: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewQuestion {
  id: string;
  organizationId: string;
  mappingId: string | null;
  roleId: string;
  shareId: string;
  question: string;
  response: string;
  status: QuestionStatus;
  askedBy: string | null;
  answeredAt: string | null;
  dueAt: string | null;
  reviewedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

type MappingRow = {
  id: string;
  organization_id: string;
  role_id: string;
  share_id: string;
  requirement_text: string;
  requirement_index: number;
  evidence_project_id: string | null;
  evidence_id: string | null;
  status: MappingStatus;
  reviewer_note: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type QuestionRow = {
  id: string;
  organization_id: string;
  mapping_id: string | null;
  role_id: string;
  share_id: string;
  question: string;
  response: string;
  status: QuestionStatus;
  asked_by: string | null;
  answered_at: string | null;
  due_at: string | null;
  reviewed_at: string | null;
  closed_at: string | null;
  created_at: string;
};

function toMapping(r: MappingRow): EvidenceMapping {
  return {
    id: r.id,
    organizationId: r.organization_id,
    roleId: r.role_id,
    shareId: r.share_id,
    requirementText: r.requirement_text,
    requirementIndex: r.requirement_index,
    evidenceProjectId: r.evidence_project_id,
    evidenceId: r.evidence_id,
    status: r.status,
    reviewerNote: r.reviewer_note,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toQuestion(r: QuestionRow): ReviewQuestion {
  return {
    id: r.id,
    organizationId: r.organization_id,
    mappingId: r.mapping_id,
    roleId: r.role_id,
    shareId: r.share_id,
    question: r.question,
    response: r.response,
    status: r.status,
    askedBy: r.asked_by,
    answeredAt: r.answered_at,
    dueAt: r.due_at ?? null,
    reviewedAt: r.reviewed_at ?? null,
    closedAt: r.closed_at ?? null,
    createdAt: r.created_at,
  };
}

export type ReviewScope = {
  organizationId: string;
  roleId: string;
  shareId: string;
  requirements: string[];
  passportId: string;
};

/**
 * The only way into a role + share review. The role must belong to the
 * caller's organization and the share must have been added to that
 * organization's reviews; otherwise nothing is readable or writable, even
 * with guessed ids. Requirements come from the stored role, never the client.
 */
export async function authorizeReviewScope(
  organizationId: string,
  roleId: string,
  shareId: string
): Promise<ReviewScope | null> {
  const uuid = /^[0-9a-f-]{36}$/;
  if (!uuid.test(roleId) || !uuid.test(shareId)) return null;
  const db = createAdminSupabaseClient();
  const [{ data: role }, { data: review }] = await Promise.all([
    db
      .from("hiring_roles")
      .select("id,responsibilities,evaluation_criteria")
      .eq("id", roleId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
    db
      .from("employer_passport_reviews")
      .select("id, passport_shares(passport_id, revoked_at, expires_at)")
      .eq("organization_id", organizationId)
      .eq("share_id", shareId)
      .maybeSingle(),
  ]);
  if (!role || !review) return null;
  const r = role as { responsibilities: string[] | null; evaluation_criteria: string[] | null };
  type JoinedShare = { passport_id: string; revoked_at: string | null; expires_at: string | null };
  const joined = (review as unknown as { passport_shares: JoinedShare | JoinedShare[] | null }).passport_shares;
  const share = Array.isArray(joined) ? joined[0] : joined;
  if (!share) return null;
  // Revocation and expiry end review access too: no evidence reads, mappings, or new questions.
  if (shareState({ revokedAt: share.revoked_at, expiresAt: share.expires_at }) !== "active") return null;
  const criteria = r.evaluation_criteria ?? [];
  return {
    organizationId,
    roleId,
    shareId,
    requirements: criteria.length > 0 ? criteria : r.responsibilities ?? [],
    passportId: share.passport_id,
  };
}

/** True when the cited evidence belongs to the shared work record. */
export async function evidenceBelongsToScope(
  scope: ReviewScope,
  evidenceProjectId: string | null,
  evidenceId: string | null
): Promise<boolean> {
  if (!evidenceProjectId && !evidenceId) return true;
  if (!evidenceProjectId || !/^[0-9a-f-]{36}$/.test(evidenceProjectId)) return false;
  const db = createAdminSupabaseClient();
  const { data: project } = await db
    .from("passport_projects")
    .select("id")
    .eq("id", evidenceProjectId)
    .eq("passport_id", scope.passportId)
    .maybeSingle();
  if (!project) return false;
  if (!evidenceId) return true;
  const { data: finding } = await db
    .from("passport_evidence")
    .select("id")
    .eq("id", evidenceId)
    .eq("project_id", evidenceProjectId)
    .maybeSingle();
  return !!finding;
}

/** List all mappings for a role + candidate share, ordered by requirement. */
export async function listMappings(
  organizationId: string,
  roleId: string,
  shareId: string
): Promise<EvidenceMapping[]> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("requirement_evidence_mappings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("role_id", roleId)
    .eq("share_id", shareId)
    .order("requirement_index", { ascending: true });
  if (error) throw new Error(`Could not load review mappings: ${error.message}`);
  return ((data ?? []) as MappingRow[]).map(toMapping);
}

/** List all questions for a role + candidate share. */
export async function listQuestions(
  organizationId: string,
  roleId: string,
  shareId: string
): Promise<ReviewQuestion[]> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("review_questions")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("role_id", roleId)
    .eq("share_id", shareId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load review questions: ${error.message}`);
  return ((data ?? []) as QuestionRow[]).map(toQuestion);
}

/** Create or update a mapping for one requirement (idempotent on role+share+index). */
export async function upsertMapping(input: {
  organizationId: string;
  roleId: string;
  shareId: string;
  requirementText: string;
  requirementIndex: number;
  evidenceProjectId?: string | null;
  evidenceId?: string | null;
  status: MappingStatus;
  reviewerNote?: string;
  createdBy: string;
}): Promise<EvidenceMapping> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("requirement_evidence_mappings")
    .upsert(
      {
        organization_id: input.organizationId,
        role_id: input.roleId,
        share_id: input.shareId,
        requirement_text: input.requirementText,
        requirement_index: input.requirementIndex,
        evidence_project_id: input.evidenceProjectId ?? null,
        evidence_id: input.evidenceId ?? null,
        status: input.status,
        reviewer_note: input.reviewerNote ?? "",
        created_by: input.createdBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,role_id,share_id,requirement_index" }
    )
    .select("*")
    .single();
  if (error) throw new Error(`Could not save review mapping: ${error.message}`);
  return toMapping(data as MappingRow);
}

const MAX_DUE_DAYS = 60;

/** A due date is optional; when set it must be in the future and within MAX_DUE_DAYS. */
export function validateDueDate(input: unknown, now = Date.now()): { ok: true; dueAt: string | null } | { ok: false; error: string } {
  if (input === undefined || input === null || input === "") return { ok: true, dueAt: null };
  if (typeof input !== "string") return { ok: false, error: "The due date is not valid." };
  const t = Date.parse(input);
  if (Number.isNaN(t)) return { ok: false, error: "The due date is not valid." };
  if (t <= now) return { ok: false, error: "The due date must be in the future." };
  if (t > now + MAX_DUE_DAYS * 86_400_000) return { ok: false, error: `The due date can be at most ${MAX_DUE_DAYS} days away.` };
  return { ok: true, dueAt: new Date(t).toISOString() };
}

/**
 * Ask a follow-up question (H09). A repeated clientRequestId from the same
 * organization returns the question already created, so a retried send
 * never asks twice.
 */
export async function askQuestion(input: {
  organizationId: string;
  mappingId?: string | null;
  roleId: string;
  shareId: string;
  question: string;
  askedBy: string;
  dueAt?: string | null;
  clientRequestId?: string | null;
}): Promise<{ question: ReviewQuestion; created: boolean }> {
  const q = input.question.trim();
  if (q.length < 1 || q.length > 2000) throw new Error("Question must be 1-2000 characters.");
  const requestId = input.clientRequestId && /^[A-Za-z0-9_-]{8,64}$/.test(input.clientRequestId) ? input.clientRequestId : null;
  const db = createAdminSupabaseClient();
  const existing = async () => {
    if (!requestId) return null;
    const { data } = await db
      .from("review_questions")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("client_request_id", requestId)
      .maybeSingle();
    return data ? toQuestion(data as QuestionRow) : null;
  };
  const prior = await existing();
  if (prior) return { question: prior, created: false };
  const { data, error } = await db
    .from("review_questions")
    .insert({
      organization_id: input.organizationId,
      mapping_id: input.mappingId ?? null,
      role_id: input.roleId,
      share_id: input.shareId,
      question: q,
      asked_by: input.askedBy,
      due_at: input.dueAt ?? null,
      client_request_id: requestId,
    })
    .select("*")
    .single();
  if (error) {
    const raced = error.code === "23505" ? await existing() : null;
    if (raced) return { question: raced, created: false };
    throw new Error(`Could not ask question: ${error.message}`);
  }
  return { question: toQuestion(data as QuestionRow), created: true };
}

/** Employer marks an answer as read, or closes a question so it can no longer be answered. */
export async function updateQuestionState(
  scope: { organizationId: string; roleId: string; shareId: string },
  questionId: string,
  action: "reviewed" | "close" | "reopen",
): Promise<ReviewQuestion | null> {
  const db = createAdminSupabaseClient();
  const { data: row } = await db
    .from("review_questions")
    .select("*")
    .eq("id", questionId)
    .eq("organization_id", scope.organizationId)
    .eq("role_id", scope.roleId)
    .eq("share_id", scope.shareId)
    .maybeSingle();
  if (!row) return null;
  const current = row as QuestionRow;
  const now = new Date().toISOString();
  const patch =
    action === "reviewed"
      ? { reviewed_at: now }
      : action === "close"
        ? { status: "closed", closed_at: now, reviewed_at: current.reviewed_at ?? (current.status === "answered" ? now : null) }
        : { status: current.response ? "answered" : "open", closed_at: null };
  const { data, error } = await db.from("review_questions").update(patch).eq("id", current.id).select("*").single();
  if (error) throw new Error(`Could not update the question: ${error.message}`);
  return toQuestion(data as QuestionRow);
}

/** Answered questions an organization has not read yet: the "needs your action" count. */
export async function questionsAwaitingReview(organizationId: string): Promise<Array<{ shareId: string; roleId: string; count: number }>> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("review_questions")
    .select("share_id,role_id")
    .eq("organization_id", organizationId)
    .eq("status", "answered")
    .is("reviewed_at", null);
  const counts = new Map<string, { shareId: string; roleId: string; count: number }>();
  for (const r of (data ?? []) as Array<{ share_id: string; role_id: string }>) {
    const key = `${r.role_id}:${r.share_id}`;
    const entry = counts.get(key) ?? { shareId: r.share_id, roleId: r.role_id, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()];
}

/** Tells the engineer behind a share that a reviewer asked something. Best effort. */
export async function notifyQuestionAsked(scope: ReviewScope): Promise<void> {
  const db = createAdminSupabaseClient();
  const [{ data: passport }, { data: org }, { data: role }] = await Promise.all([
    db.from("passports").select("owner_id").eq("id", scope.passportId).maybeSingle(),
    db.from("organizations").select("name").eq("id", scope.organizationId).maybeSingle(),
    db.from("hiring_roles").select("title").eq("id", scope.roleId).maybeSingle(),
  ]);
  const ownerId = (passport as { owner_id: string } | null)?.owner_id;
  if (!ownerId) return;
  const orgName = (org as { name: string } | null)?.name ?? "A hiring team";
  const roleTitle = (role as { title: string } | null)?.title;
  await notifyUser(ownerId, {
    kind: "question_received",
    title: `${orgName} asked you a question`,
    body: roleTitle ? `About your work, for the ${roleTitle} role. Answer it from your Passport.` : "About your shared work. Answer it from your Passport.",
    href: "/app/candidate/work-record",
  });
}

/** Tells the reviewer who asked that the engineer answered. Best effort. */
export async function notifyQuestionAnswered(question: ReviewQuestion): Promise<void> {
  if (!question.askedBy) return;
  const db = createAdminSupabaseClient();
  const { data: review } = await db
    .from("employer_passport_reviews")
    .select("id")
    .eq("organization_id", question.organizationId)
    .eq("share_id", question.shareId)
    .maybeSingle();
  const reviewId = (review as { id: string } | null)?.id;
  await notifyUser(question.askedBy, {
    kind: "question_answered",
    title: "A candidate answered your question",
    body: question.question.length > 120 ? `${question.question.slice(0, 117)}...` : question.question,
    href: reviewId ? `/app/employer/passports/${reviewId}` : "/app/employer/passports",
  });
}

/** Record a candidate's response to a question. */
export async function answerQuestion(
  questionId: string,
  organizationId: string,
  response: string
): Promise<ReviewQuestion> {
  const r = response.trim();
  if (r.length < 1) throw new Error("Response cannot be empty.");
  if (r.length > 4000) throw new Error("Response is limited to 4000 characters.");
  const db = createAdminSupabaseClient();
  // Closed questions are excluded in the update itself, so a close that
  // lands between a read and this write still wins.
  const { data, error } = await db
    .from("review_questions")
    .update({
      response: r,
      status: "answered",
      answered_at: new Date().toISOString(),
      reviewed_at: null,
    })
    .eq("id", questionId)
    .eq("organization_id", organizationId)
    .neq("status", "closed")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Could not save response: ${error.message}`);
  if (!data) throw new Error("This question was closed by the employer, so it can no longer be answered.");
  return toQuestion(data as QuestionRow);
}

export interface CandidateQuestion extends ReviewQuestion {
  organizationName: string;
  roleTitle: string;
  /** False once the share was revoked or expired: the employer can no longer read new answers. */
  shareActive: boolean;
}

/**
 * Every question addressed to a candidate across all their shares: open
 * ones first, then answered and closed ones so the history stays visible.
 * Joins through passport_shares -> passports to scope by owner.
 */
export async function listQuestionsForCandidate(ownerId: string): Promise<CandidateQuestion[]> {
  const db = createAdminSupabaseClient();
  // Find the candidate's passport and its shares
  const { data: passport } = await db
    .from("passports")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!passport) return [];
  const { data: shares } = await db
    .from("passport_shares")
    .select("id,revoked_at,expires_at")
    .eq("passport_id", (passport as { id: string }).id);
  const shareRows = (shares ?? []) as Array<{ id: string; revoked_at: string | null; expires_at: string | null }>;
  const shareIds = shareRows.map((s) => s.id);
  if (shareIds.length === 0) return [];
  const active = new Set(shareRows.filter((s) => shareState({ revokedAt: s.revoked_at, expiresAt: s.expires_at }) === "active").map((s) => s.id));

  const { data: questions, error } = await db
    .from("review_questions")
    .select("*, organizations(name), hiring_roles(title)")
    .in("share_id", shareIds)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load questions: ${error.message}`);
  const rank: Record<QuestionStatus, number> = { open: 0, answered: 1, closed: 2 };
  return ((questions ?? []) as Array<QuestionRow & { organizations: { name: string } | null; hiring_roles: { title: string } | null }>)
    .map((r) => ({
      ...toQuestion(r),
      organizationName: r.organizations?.name ?? "An employer",
      roleTitle: r.hiring_roles?.title ?? "Role",
      shareActive: active.has(r.share_id),
    }))
    .sort((a, b) => rank[a.status] - rank[b.status]);
}
