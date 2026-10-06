import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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
    createdAt: r.created_at,
  };
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
      { onConflict: "role_id,share_id,requirement_index" }
    )
    .select("*")
    .single();
  if (error) throw new Error(`Could not save review mapping: ${error.message}`);
  return toMapping(data as MappingRow);
}

/** Ask a follow-up question (H09). */
export async function askQuestion(input: {
  organizationId: string;
  mappingId?: string | null;
  roleId: string;
  shareId: string;
  question: string;
  askedBy: string;
}): Promise<ReviewQuestion> {
  const q = input.question.trim();
  if (q.length < 1 || q.length > 2000) throw new Error("Question must be 1-2000 characters.");
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("review_questions")
    .insert({
      organization_id: input.organizationId,
      mapping_id: input.mappingId ?? null,
      role_id: input.roleId,
      share_id: input.shareId,
      question: q,
      asked_by: input.askedBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not ask question: ${error.message}`);
  return toQuestion(data as QuestionRow);
}

/** Record a candidate's response to a question. */
export async function answerQuestion(
  questionId: string,
  organizationId: string,
  response: string
): Promise<ReviewQuestion> {
  const r = response.trim();
  if (r.length > 4000) throw new Error("Response is limited to 4000 characters.");
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("review_questions")
    .update({
      response: r,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", questionId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();
  if (error) throw new Error(`Could not save response: ${error.message}`);
  return toQuestion(data as QuestionRow);
}

export interface CandidateQuestion extends ReviewQuestion {
  organizationName: string;
  roleTitle: string;
}

/**
 * List open questions addressed to a candidate across all their shares.
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
    .select("id")
    .eq("passport_id", (passport as { id: string }).id);
  const shareIds = ((shares ?? []) as Array<{ id: string }>).map((s) => s.id);
  if (shareIds.length === 0) return [];

  const { data: questions, error } = await db
    .from("review_questions")
    .select("*, organizations(name), hiring_roles(title)")
    .in("share_id", shareIds)
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load questions: ${error.message}`);
  return ((questions ?? []) as Array<QuestionRow & { organizations: { name: string } | null; hiring_roles: { title: string } | null }>).map(
    (r) => ({
      ...toQuestion(r),
      organizationName: r.organizations?.name ?? "An employer",
      roleTitle: r.hiring_roles?.title ?? "Role",
    })
  );
}
