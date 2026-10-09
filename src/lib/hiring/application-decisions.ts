import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { RecordReviewDecisionResult, ReviewDecision, ReviewDecisionState } from "@/lib/passport/store";

/** Version of an application that has never had a decision saved. */
export const NO_DECISION_VERSION = "new";

type Row = { decision: ReviewDecision; private_note: string; decided_at: string | null; updated_at: string };

function toState(row: Row | null): ReviewDecisionState {
  if (!row) return { decision: "none", privateNote: "", decidedAt: null, version: NO_DECISION_VERSION };
  return { decision: row.decision, privateNote: row.private_note ?? "", decidedAt: row.decided_at, version: row.updated_at };
}

async function applicationInOrg(organizationId: string, applicationId: string): Promise<boolean> {
  const { data } = await createAdminSupabaseClient()
    .from("role_applications")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", applicationId)
    .maybeSingle();
  return Boolean(data);
}

async function readRow(organizationId: string, applicationId: string): Promise<Row | null> {
  const { data } = await createAdminSupabaseClient()
    .from("application_decisions")
    .select("decision,private_note,decided_at,updated_at")
    .eq("organization_id", organizationId)
    .eq("application_id", applicationId)
    .maybeSingle();
  return (data as Row | null) ?? null;
}

/** Team decision for an application without a Passport review. Never returned to applicants. */
export async function getApplicationDecision(organizationId: string, applicationId: string): Promise<ReviewDecisionState | null> {
  if (!(await applicationInOrg(organizationId, applicationId))) return null;
  return toState(await readRow(organizationId, applicationId));
}

/**
 * Compare-and-set on `updated_at` (or NO_DECISION_VERSION for the first save),
 * so two reviewers cannot silently overwrite each other.
 */
export async function recordApplicationDecision(
  organizationId: string,
  applicationId: string,
  userId: string,
  decision: ReviewDecision,
  note: string,
  expectedVersion: string | null,
): Promise<RecordReviewDecisionResult> {
  if (!(await applicationInOrg(organizationId, applicationId))) return { kind: "not_found" };
  const db = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const fields = {
    decision,
    private_note: note.slice(0, 4000),
    decided_by: decision === "none" ? null : userId,
    decided_at: decision === "none" ? null : now,
    updated_at: now,
  };
  const conflict = async (): Promise<RecordReviewDecisionResult> => ({ kind: "conflict", state: toState(await readRow(organizationId, applicationId)) });

  if (expectedVersion === NO_DECISION_VERSION) {
    const { data, error } = await db
      .from("application_decisions")
      .insert({ application_id: applicationId, organization_id: organizationId, ...fields })
      .select("decision,private_note,decided_at,updated_at")
      .single();
    if (error) return error.code === "23505" ? conflict() : { kind: "not_found" };
    return { kind: "saved", state: toState(data as Row) };
  }
  if (!expectedVersion) return conflict();
  const { data } = await db
    .from("application_decisions")
    .update(fields)
    .eq("organization_id", organizationId)
    .eq("application_id", applicationId)
    .eq("updated_at", expectedVersion)
    .select("decision,private_note,decided_at,updated_at")
    .maybeSingle();
  return data ? { kind: "saved", state: toState(data as Row) } : conflict();
}
