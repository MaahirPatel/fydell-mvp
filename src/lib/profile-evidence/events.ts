import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sanitizeEventPayload } from "./contract";

export type EvidenceEventName =
  | "draft_edited"
  | "contribution_confirmed"
  | "publish_blocked"
  | "version_published"
  | "application_pinned"
  | "application_evidence_revoked"
  | "employer_evidence_viewed"
  | "employer_question_asked"
  | "employer_next_step"
  | "question_answered";

/**
 * First-party product event, stored with the existing product events
 * (proof_product_events) under a "profile_evidence." prefix. Payloads pass
 * through sanitizeEventPayload, so only counts, flags, ids and short enum
 * tokens are kept. Best effort: never blocks the action that caused it.
 */
export async function recordEvidenceEvent(
  name: EvidenceEventName,
  payload: Record<string, unknown>,
  organizationId: string | null = null,
): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin
      .from("proof_product_events")
      .insert({ organization_id: organizationId, name: `profile_evidence.${name}`, payload: sanitizeEventPayload(payload) });
    if (error) console.error(`[profile-evidence] event not recorded (${name})`);
  } catch {
    console.error(`[profile-evidence] event not recorded (${name})`);
  }
}
