import "server-only";
import { getSupabaseAdmin } from "./supabase";
import type { CompanyUser, GeneratedSimulation, OnboardingAnswers } from "./platform-types";

function supabaseReady(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function rowToUser(row: Record<string, unknown>): CompanyUser {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    passwordSalt: String(row.password_salt),
    companyName: String(row.company_name),
    createdAt: String(row.created_at),
    onboardingComplete: Boolean(row.onboarding_complete),
    onboarding: (row.onboarding as OnboardingAnswers) || undefined
  };
}

export async function dbCreateUser(
  email: string,
  passwordHash: string,
  passwordSalt: string,
  companyName: string
): Promise<CompanyUser> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("platform_users")
    .insert({
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      password_salt: passwordSalt,
      company_name: companyName.trim()
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToUser(data as Record<string, unknown>);
}

export async function dbGetUserByEmail(email: string): Promise<CompanyUser | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("platform_users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return data ? rowToUser(data as Record<string, unknown>) : null;
}

export async function dbGetUserById(id: string): Promise<CompanyUser | null> {
  const db = getSupabaseAdmin();
  const { data } = await db.from("platform_users").select("*").eq("id", id).maybeSingle();
  return data ? rowToUser(data as Record<string, unknown>) : null;
}

export async function dbCompleteOnboarding(
  userId: string,
  answers: OnboardingAnswers
): Promise<CompanyUser> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("platform_users")
    .update({ onboarding: answers, onboarding_complete: true })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToUser(data as Record<string, unknown>);
}

export async function dbSaveSimulation(sim: GeneratedSimulation): Promise<GeneratedSimulation> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("platform_simulations").insert({
    id: sim.id,
    user_id: sim.companyUserId,
    title: sim.title,
    role: sim.role,
    industry: sim.industry,
    brief: sim.brief,
    config: sim
  });
  if (error) throw new Error(error.message);
  return sim;
}

export async function dbListSimulations(userId: string): Promise<GeneratedSimulation[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("platform_simulations")
    .select("config")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []).map((r) => r.config as GeneratedSimulation);
}

export async function dbGetSimulation(id: string): Promise<GeneratedSimulation | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("platform_simulations")
    .select("config")
    .eq("id", id)
    .maybeSingle();
  return data ? (data.config as GeneratedSimulation) : null;
}

export async function dbSaveSessionResult(payload: {
  userId?: string | null;
  simId?: string | null;
  simTitle?: string | null;
  overallScore?: number | null;
  verdict?: string | null;
  analysis: Record<string, unknown>;
  responses: Record<string, unknown>;
  elapsedSeconds?: number | null;
  demo?: boolean;
}): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("platform_session_results").insert({
    user_id: payload.userId || null,
    sim_id: payload.simId || null,
    sim_title: payload.simTitle || null,
    overall_score: payload.overallScore ?? null,
    verdict: payload.verdict || null,
    analysis: payload.analysis,
    responses: payload.responses,
    elapsed_seconds: payload.elapsedSeconds ?? null,
    demo: Boolean(payload.demo)
  });
  if (error) throw new Error(error.message);
}

export { supabaseReady };
