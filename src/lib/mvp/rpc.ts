import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "../supabase";

/**
 * Durable MVP loop access without the service role key.
 * Uses anon key + FYDELL_MVP_DB_SECRET against security-definer RPCs in schema mvp.
 */

export function isMvpRpcConfigured(): boolean {
  return Boolean(
    supabaseUrl() &&
      supabaseAnonKey() &&
      process.env.FYDELL_MVP_DB_SECRET
  );
}

function secret(): string {
  const s = process.env.FYDELL_MVP_DB_SECRET;
  if (!s) throw new Error("Missing FYDELL_MVP_DB_SECRET");
  return s;
}

let cached: SupabaseClient | null = null;

function rpcClient(): SupabaseClient {
  if (cached) return cached;
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  if (!url || !anon) throw new Error("Missing Supabase anon credentials");
  cached = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  // Public wrappers (mvp_*) keep PostgREST on the default public schema.
  const name = fn.startsWith("mvp_") ? fn : `mvp_${fn}`;
  const { data, error } = await rpcClient().rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function rpcEnsureWorkspace(userId: string, name = "Your workspace") {
  return callRpc<Record<string, unknown>>("ensure_workspace", {
    p_secret: secret(),
    p_user_id: userId,
    p_name: name,
  });
}

export async function rpcCreateInvite(input: {
  workspaceId: string;
  userId: string;
  simulationId: string;
  candidateName?: string | null;
  candidateEmail?: string | null;
}) {
  return callRpc<Record<string, unknown>>("create_invite", {
    p_secret: secret(),
    p_workspace_id: input.workspaceId,
    p_user_id: input.userId,
    p_simulation_id: input.simulationId,
    p_candidate_name: input.candidateName ?? null,
    p_candidate_email: input.candidateEmail ?? null,
  });
}

export async function rpcValidateInvite(token: string) {
  return callRpc<{ invite: Record<string, unknown>; simulation: Record<string, unknown> } | null>(
    "validate_invite",
    { p_token: token }
  );
}

export async function rpcStartAttempt(token: string) {
  return callRpc<Record<string, unknown> | null>("start_attempt", { p_token: token });
}

export async function rpcRecordEvent(
  attemptId: string,
  token: string,
  eventType: string,
  payload: Record<string, unknown> = {}
) {
  return callRpc<Record<string, unknown> | null>("record_event", {
    p_attempt_id: attemptId,
    p_token: token,
    p_event_type: eventType,
    p_payload: payload,
  });
}

export async function rpcGetAttempt(attemptId: string) {
  return callRpc<Record<string, unknown> | null>("get_attempt", {
    p_secret: secret(),
    p_attempt_id: attemptId,
  });
}

export async function rpcGetAttemptEvents(attemptId: string) {
  return callRpc<Record<string, unknown>[]>("get_attempt_events", {
    p_secret: secret(),
    p_attempt_id: attemptId,
  });
}

export async function rpcFinalizeAttempt(input: {
  attemptId: string;
  recommendation: string;
  score: number;
  scoreJson: Record<string, unknown>;
  reportJson: Record<string, unknown>;
}) {
  return callRpc<{
    attempt: Record<string, unknown>;
    report: Record<string, unknown>;
    overall_score: number;
  } | null>("finalize_attempt", {
    p_secret: secret(),
    p_attempt_id: input.attemptId,
    p_recommendation: input.recommendation,
    p_score: input.score,
    p_score_json: input.scoreJson,
    p_report_json: input.reportJson,
  });
}

export async function rpcDashboard(userId: string) {
  return callRpc<Record<string, unknown>>("dashboard", {
    p_secret: secret(),
    p_user_id: userId,
  });
}

export async function rpcAttemptReport(userId: string, attemptId: string) {
  return callRpc<Record<string, unknown> | null>("attempt_report", {
    p_secret: secret(),
    p_user_id: userId,
    p_attempt_id: attemptId,
  });
}

export async function rpcRecordEventServer(
  attemptId: string,
  eventType: string,
  payload: Record<string, unknown> = {}
) {
  return callRpc<Record<string, unknown> | null>("record_event_server", {
    p_secret: secret(),
    p_attempt_id: attemptId,
    p_event_type: eventType,
    p_payload: payload,
  });
}

export async function rpcUpdateNotes(attemptId: string, notes: string) {
  return callRpc<null>("update_notes", {
    p_secret: secret(),
    p_attempt_id: attemptId,
    p_notes: notes,
  });
}

export async function rpcSavePilotRequest(input: {
  name: string;
  email: string;
  company: string;
  role: string;
  candidates?: string;
  note?: string;
}) {
  return callRpc<{ id: string; created_at: string }>("save_pilot_request", {
    p_secret: secret(),
    p_name: input.name,
    p_email: input.email,
    p_company: input.company,
    p_role: input.role,
    p_candidates: input.candidates ?? null,
    p_note: input.note ?? null,
  });
}

export async function rpcUpsertCompanyProfile(input: {
  userId: string;
  email: string;
  companyName: string;
}) {
  return callRpc<Record<string, unknown>>("upsert_company_profile", {
    p_secret: secret(),
    p_user_id: input.userId,
    p_email: input.email,
    p_company_name: input.companyName,
  });
}

export async function rpcGetCompanyProfile(userId: string) {
  return callRpc<Record<string, unknown> | null>("get_company_profile", {
    p_secret: secret(),
    p_user_id: userId,
  });
}

export async function rpcGetCompanyProfileByEmail(email: string) {
  return callRpc<Record<string, unknown> | null>("get_company_profile_by_email", {
    p_secret: secret(),
    p_email: email,
  });
}

export async function rpcCompleteCompanyOnboarding(
  userId: string,
  onboarding: Record<string, unknown>
) {
  return callRpc<Record<string, unknown>>("complete_company_onboarding", {
    p_secret: secret(),
    p_user_id: userId,
    p_onboarding: onboarding,
  });
}
