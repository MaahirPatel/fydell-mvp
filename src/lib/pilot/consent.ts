import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  AI_POLICY_VERSION,
  CAPTURE_POLICY_VERSION,
  CONSENT_POLICY_VERSION,
} from "@/lib/pilot/cohort";
import {
  evaluatePreflight,
  type PreflightPayload,
} from "@/lib/pilot/preflight-eval";

export { CONSENT_POLICY_VERSION, CAPTURE_POLICY_VERSION, AI_POLICY_VERSION };
export { evaluatePreflight };
export type { PreflightPayload };

export async function getConsentForInvitation(invitationId: string) {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("candidate_consents")
    .select("*")
    .eq("invitation_id", invitationId)
    .eq("policy_version", CONSENT_POLICY_VERSION)
    .maybeSingle();
  return data;
}

export async function recordConsent(input: {
  invitationId: string;
  sessionId: string | null;
  organizationId: string;
  candidateUserId: string;
}): Promise<{ id: string }> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("candidate_consents")
    .upsert(
      {
        invitation_id: input.invitationId,
        session_id: input.sessionId,
        organization_id: input.organizationId,
        candidate_user_id: input.candidateUserId,
        policy_version: CONSENT_POLICY_VERSION,
        capture_policy_version: CAPTURE_POLICY_VERSION,
        ai_policy_version: AI_POLICY_VERSION,
        accepted_at: new Date().toISOString(),
        actor: "candidate",
      },
      { onConflict: "invitation_id,policy_version" }
    )
    .select("id")
    .single();
  if (error) throw new Error(`Could not record consent: ${error.message}`);
  return { id: data.id as string };
}

export async function recordPreflight(input: {
  invitationId: string;
  sessionId: string | null;
  candidateUserId: string;
  payload: PreflightPayload;
}): Promise<{ id: string; ok: boolean }> {
  const db = createAdminSupabaseClient();
  const ok =
    input.payload.browserOk &&
    input.payload.desktopSuitable &&
    input.payload.networkOk;
  const { data, error } = await db
    .from("preflight_checks")
    .insert({
      invitation_id: input.invitationId,
      session_id: input.sessionId,
      candidate_user_id: input.candidateUserId,
      result: input.payload,
      desktop_suitable: input.payload.desktopSuitable,
      network_ok: input.payload.networkOk,
      browser_ok: input.payload.browserOk,
      limitations: input.payload.limitations,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not record preflight: ${error.message}`);
  return { id: data.id as string, ok };
}
