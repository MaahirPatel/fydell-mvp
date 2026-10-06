import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { recordAvoidedWork } from "@/lib/pilot/avoided-work";

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
  // Detect transition to "accepted" for avoided-work measurement (§11, §29).
  let wasAccepted = false;
  if (input.status === "accepted") {
    const { data: existing } = await db
      .from("requirement_evidence_mappings")
      .select("status")
      .eq("role_id", input.roleId)
      .eq("share_id", input.shareId)
      .eq("requirement_index", input.requirementIndex)
      .maybeSingle();
    wasAccepted = (existing as { status?: string } | null)?.status === "accepted";
  }
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
  const mapping = toMapping(data as MappingRow);
  // §11/§29: reviewer accepted existing evidence instead of requesting
  // targeted verification. Only record on the transition, not repeats.
  if (input.status === "accepted" && !wasAccepted) {
    const { data: shareRow } = await db
      .from("passport_shares")
      .select("passports!inner(owner_id)")
      .eq("id", input.shareId)
      .maybeSingle();
    const sr = shareRow as unknown as { passports?: { owner_id?: string } } | null;
    const candidateUserId = sr?.passports?.owner_id;
    if (candidateUserId) {
      await recordAvoidedWork({
        organizationId: input.organizationId,
        candidateUserId,
        kind: "mapping_accepted",
        avoided: "targeted_verification",
        sourceId: mapping.id,
        sourceKind: "requirement_evidence_mapping",
        recordedBy: input.createdBy,
        idempotencyKey: `mapping_accepted:${mapping.id}`,
      });
    }
  }
  return mapping;
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

export type VerificationStatus = "pending" | "submitted" | "accepted" | "rejected";

export type VerificationRequest = {
  id: string;
  organizationId: string;
  mappingId: string | null;
  roleId: string;
  shareId: string;
  candidateUserId: string;
  prompt: string;
  status: VerificationStatus;
  candidateResponse: string;
  requestedBy: string | null;
  reviewedBy: string | null;
  reviewerNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type VerificationRow = {
  id: string;
  organization_id: string;
  mapping_id: string | null;
  role_id: string;
  share_id: string;
  candidate_user_id: string;
  prompt: string;
  status: VerificationStatus;
  candidate_response: string;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewer_note: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function toVerification(r: VerificationRow): VerificationRequest {
  return {
    id: r.id,
    organizationId: r.organization_id,
    mappingId: r.mapping_id,
    roleId: r.role_id,
    shareId: r.share_id,
    candidateUserId: r.candidate_user_id,
    prompt: r.prompt,
    status: r.status,
    candidateResponse: r.candidate_response,
    requestedBy: r.requested_by,
    reviewedBy: r.reviewed_by,
    reviewerNote: r.reviewer_note,
    submittedAt: r.submitted_at,
    reviewedAt: r.reviewed_at,
    createdAt: r.created_at,
  };
}

/**
 * Request targeted verification for a requirement mapping.
 * The employer describes what evidence they need to see for this criterion.
 */
export async function requestVerification(input: {
  organizationId: string;
  mappingId?: string | null;
  roleId: string;
  shareId: string;
  candidateUserId: string;
  prompt: string;
  requestedBy: string;
}): Promise<VerificationRequest> {
  const prompt = input.prompt.trim();
  if (prompt.length < 1 || prompt.length > 2000) throw new Error("Describe what you need to see (1-2000 characters).");
  const db = createAdminSupabaseClient();
  // Prove the role belongs to this organization.
  const { data: role } = await db
    .from("hiring_roles")
    .select("id")
    .eq("id", input.roleId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (!role) throw new Error("Role not found.");
  // Prove the mapping (when given) belongs to this org/role/share.
  if (input.mappingId) {
    const { data: mapping } = await db
      .from("requirement_evidence_mappings")
      .select("id")
      .eq("id", input.mappingId)
      .eq("organization_id", input.organizationId)
      .eq("role_id", input.roleId)
      .eq("share_id", input.shareId)
      .maybeSingle();
    if (!mapping) throw new Error("That requirement is not part of this review.");
  }
  // Guard against request spam: at most 3 open requests per mapping.
  if (input.mappingId) {
    const { count } = await db
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("mapping_id", input.mappingId)
      .in("status", ["pending", "submitted"]);
    if ((count ?? 0) >= 3) {
      throw new Error("This requirement already has 3 open verification requests. Review or close one first.");
    }
  }
  const { data, error } = await db
    .from("verification_requests")
    .insert({
      organization_id: input.organizationId,
      mapping_id: input.mappingId ?? null,
      role_id: input.roleId,
      share_id: input.shareId,
      candidate_user_id: input.candidateUserId,
      prompt,
      requested_by: input.requestedBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not request verification: ${error.message}`);
  return toVerification(data as VerificationRow);
}

/** Candidate submits their focused response. */
export async function submitVerification(
  requestId: string,
  candidateUserId: string,
  response: string,
): Promise<VerificationRequest> {
  const r = response.trim();
  if (r.length < 1 || r.length > 4000) throw new Error("Your response must be 1-4000 characters.");
  const db = createAdminSupabaseClient();
  const { data: existing } = await db.from("verification_requests").select("status").eq("id", requestId).eq("candidate_user_id", candidateUserId).maybeSingle();
  if (!existing) throw new Error("Verification request not found.");
  if ((existing as { status: string }).status !== "pending") throw new Error("This request is no longer open for response.");
  const { data, error } = await db
    .from("verification_requests")
    .update({ candidate_response: r, status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("*")
    .single();
  if (error) throw new Error(`Could not submit: ${error.message}`);
  return toVerification(data as VerificationRow);
}

/** Employer accepts or rejects the candidate's verification response. */
export async function reviewVerification(
  requestId: string,
  organizationId: string,
  reviewedBy: string,
  decision: "accepted" | "rejected",
  reviewerNote: string,
): Promise<VerificationRequest> {
  const db = createAdminSupabaseClient();
  const { data: existing } = await db
    .from("verification_requests")
    .select("status")
    .eq("id", requestId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!existing) throw new Error("Verification request not found.");
  if ((existing as { status: string }).status !== "submitted") throw new Error("The candidate has not responded yet.");
  const { data, error } = await db
    .from("verification_requests")
    .update({
      status: decision,
      reviewer_note: reviewerNote.trim().slice(0, 1000),
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("*")
    .single();
  if (error) throw new Error(`Could not record the review: ${error.message}`);
  const verified = toVerification(data as VerificationRow);

  // §11/§29: an accepted verification avoided a full new assessment.
  if (decision === "accepted") {
    await recordAvoidedWork({
      organizationId,
      candidateUserId: verified.candidateUserId,
      kind: "verification_accepted",
      avoided: "full_assessment",
      sourceId: verified.id,
      sourceKind: "verification_request",
      recordedBy: reviewedBy,
      idempotencyKey: `verification_accepted:${verified.id}`,
    });
  }

  return verified;
}

/** List verification requests for a review (employer view). */
export async function listVerifications(organizationId: string, roleId: string, shareId: string): Promise<VerificationRequest[]> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("verification_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("role_id", roleId)
    .eq("share_id", shareId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load verifications: ${error.message}`);
  return ((data ?? []) as VerificationRow[]).map(toVerification);
}

/** List pending verification requests for a candidate (candidate view). */
export async function listCandidateVerifications(candidateUserId: string): Promise<VerificationRequest[]> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("verification_requests")
    .select("*, organizations(name), hiring_roles(title)")
    .eq("candidate_user_id", candidateUserId)
    .in("status", ["pending", "submitted"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load verification requests: ${error.message}`);
  return ((data ?? []) as VerificationRow[]).map(toVerification);
}
