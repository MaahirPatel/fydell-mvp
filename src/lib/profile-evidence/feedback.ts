import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { FeedbackInput, FeedbackVerification, Relationship } from "./contract";
import { passportIdFor, UUID, type Failure } from "./ids";

export type FeedbackRow = {
  id: string;
  projectKey: string;
  authorName: string;
  relationship: Relationship;
  relationshipNote: string;
  directlyObserved: boolean;
  statement: string;
  verification: FeedbackVerification;
  createdAt: string;
};

type Row = {
  id: string;
  project_key: string;
  author_name: string;
  relationship: Relationship;
  relationship_note: string;
  directly_observed: boolean;
  statement: string;
  verification: FeedbackVerification;
  created_at: string;
};

const COLUMNS = "id,project_key,author_name,relationship,relationship_note,directly_observed,statement,verification,created_at";

const toRow = (r: Row): FeedbackRow => ({
  id: r.id,
  projectKey: r.project_key,
  authorName: r.author_name,
  relationship: r.relationship,
  relationshipNote: r.relationship_note,
  directlyObserved: r.directly_observed,
  statement: r.statement,
  verification: r.verification,
  createdAt: r.created_at,
});

/** Active feedback for one project. */
export async function listFeedbackRows(passportId: string, projectKey: string): Promise<FeedbackRow[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("collaborator_feedback")
    .select(COLUMNS)
    .eq("passport_id", passportId)
    .eq("project_key", projectKey)
    .is("withdrawn_at", null)
    .order("created_at", { ascending: true })
    .limit(20);
  return ((data ?? []) as Row[]).map(toRow);
}

export async function listFeedback(ownerId: string, projectKey: string): Promise<FeedbackRow[]> {
  const passportId = await passportIdFor(ownerId);
  return passportId ? listFeedbackRows(passportId, projectKey) : [];
}

/**
 * Records feedback a collaborator gave about the work. The engineer enters
 * it, so it is stored as unverified: Fydell has not contacted the author.
 */
export async function addFeedback(ownerId: string, projectKey: string, input: FeedbackInput): Promise<{ ok: true; feedback: FeedbackRow } | Failure> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId) return { ok: false, status: 404, error: "Add a project to your profile first." };
  const admin = createAdminSupabaseClient();
  const { count } = await admin
    .from("collaborator_feedback")
    .select("id", { count: "exact", head: true })
    .eq("passport_id", passportId)
    .eq("project_key", projectKey)
    .is("withdrawn_at", null);
  if ((count ?? 0) >= 10) return { ok: false, status: 409, error: "A project can hold up to 10 pieces of feedback. Withdraw one first." };
  const { data, error } = await admin
    .from("collaborator_feedback")
    .insert({
      passport_id: passportId,
      project_key: projectKey,
      author_name: input.authorName,
      relationship: input.relationship,
      relationship_note: input.relationshipNote,
      directly_observed: input.directlyObserved,
      statement: input.statement,
      verification: "none",
      created_by: ownerId,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) return { ok: false, status: 500, error: "Could not save the feedback. Your text is kept; try again." };
  return { ok: true, feedback: toRow(data as Row) };
}

/** Withdrawn feedback leaves future versions; versions already sent keep what they showed. */
export async function withdrawFeedback(ownerId: string, id: string): Promise<boolean> {
  const passportId = await passportIdFor(ownerId);
  if (!passportId || !UUID.test(id)) return false;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("collaborator_feedback")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("id", id)
    .eq("passport_id", passportId)
    .is("withdrawn_at", null)
    .select("id");
  return (data ?? []).length > 0;
}
