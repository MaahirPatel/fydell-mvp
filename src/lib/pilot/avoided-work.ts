import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type AvoidedWorkKind = "receipt_accepted" | "mapping_accepted" | "verification_accepted";

/**
 * Record that existing evidence replaced new assessment work (§11, §29).
 * This is the "repeat assessments actually avoided" measure.
 */
export async function recordAvoidedWork(input: {
  organizationId: string;
  candidateUserId: string;
  kind: AvoidedWorkKind;
  /** What was avoided: "full_assessment" or "targeted_verification" */
  avoided: string;
  sourceId?: string;
  sourceKind?: string;
  recordedBy?: string;
  note?: string;
  /**
   * Deterministic key for idempotency (e.g. `receipt_accepted:<acceptanceId>`).
   * When provided, repeats with the same key are no-ops.
   */
  idempotencyKey?: string;
}): Promise<void> {
  const db = createAdminSupabaseClient();
  const { error } = await db.from("avoided_work").upsert(
    {
      organization_id: input.organizationId,
      candidate_user_id: input.candidateUserId,
      kind: input.kind,
      avoided: input.avoided,
      source_id: input.sourceId ?? null,
      source_kind: input.sourceKind ?? null,
      recorded_by: input.recordedBy ?? null,
      note: (input.note ?? "").trim().slice(0, 500),
      idempotency_key: input.idempotencyKey ?? null,
    },
    { onConflict: "idempotency_key", ignoreDuplicates: true },
  );
  // Measurement writes must never break the operation they measure.
  if (error) console.error("[avoided-work] insert failed:", error.message);
}

/** Count avoided work for an org (for product quality dashboards). */
export async function getAvoidedWorkSummary(organizationId: string): Promise<{
  total: number;
  byKind: Record<AvoidedWorkKind, number>;
}> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from("avoided_work").select("kind").eq("organization_id", organizationId);
  const rows = (data ?? []) as Array<{ kind: AvoidedWorkKind }>;
  const byKind: Record<AvoidedWorkKind, number> = {
    receipt_accepted: 0,
    mapping_accepted: 0,
    verification_accepted: 0,
  };
  for (const r of rows) {
    if (r.kind in byKind) byKind[r.kind]++;
  }
  return { total: rows.length, byKind };
}
