import "server-only";
import { getSupabaseAdmin } from "./supabase";
import type {
  Candidate,
  Employer,
  Feedback,
  Response,
  Score,
  Session,
  Stage
} from "./types";

// ===========================================================================
// Server-side data access. Everything here uses the service-role client.
// ===========================================================================

export interface ApplyContext {
  candidate: Candidate;
  employer: Employer;
}

export async function getApplyContext(token: string): Promise<ApplyContext | null> {
  const db = getSupabaseAdmin();
  const { data: candidate } = await db
    .from("candidates")
    .select("*")
    .eq("invitation_token", token)
    .maybeSingle();
  if (!candidate) return null;

  const { data: employer } = await db
    .from("employers")
    .select("*")
    .eq("id", (candidate as Candidate).employer_id)
    .maybeSingle();
  if (!employer) return null;

  return { candidate: candidate as Candidate, employer: employer as Employer };
}

export async function getCandidateByToken(token: string): Promise<Candidate | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("candidates")
    .select("*")
    .eq("invitation_token", token)
    .maybeSingle();
  return (data as Candidate) ?? null;
}

/** Mark a candidate as started and stamp the session's started_at (idempotent). */
export async function startSession(
  candidateId: string,
  name?: string,
  email?: string
): Promise<void> {
  const db = getSupabaseAdmin();

  // Optionally update the candidate's name/email from the consent form.
  const patch: Partial<Candidate> = { status: "started" };
  if (name) patch.name = name;
  if (email) patch.email = email;
  await db.from("candidates").update(patch).eq("id", candidateId);

  const { data: existing } = await db
    .from("sessions")
    .select("id, started_at")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (!existing) {
    await db
      .from("sessions")
      .insert({ candidate_id: candidateId, started_at: new Date().toISOString() });
  } else if (!(existing as Session).started_at) {
    await db
      .from("sessions")
      .update({ started_at: new Date().toISOString() })
      .eq("candidate_id", candidateId);
  }
}

/** Upsert a single stage response (autosave-friendly). */
export async function upsertResponse(
  candidateId: string,
  stage: Stage,
  text: string
): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("responses").upsert(
    {
      candidate_id: candidateId,
      stage,
      response_text: text,
      submitted_at: new Date().toISOString()
    },
    { onConflict: "candidate_id,stage" }
  );
}

/** Finalize: stamp submitted_at + time spent, set status completed. */
export async function finalizeSubmission(
  candidateId: string,
  timeSpentSeconds: number
): Promise<void> {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: existing } = await db
    .from("sessions")
    .select("id")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (existing) {
    await db
      .from("sessions")
      .update({ submitted_at: now, time_spent_seconds: timeSpentSeconds })
      .eq("candidate_id", candidateId);
  } else {
    await db.from("sessions").insert({
      candidate_id: candidateId,
      started_at: now,
      submitted_at: now,
      time_spent_seconds: timeSpentSeconds
    });
  }

  await db.from("candidates").update({ status: "completed" }).eq("id", candidateId);
}

export async function getResponses(candidateId: string): Promise<Response[]> {
  const db = getSupabaseAdmin();
  const { data } = await db.from("responses").select("*").eq("candidate_id", candidateId);
  return (data as Response[]) ?? [];
}

export async function getSession(candidateId: string): Promise<Session | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("sessions")
    .select("*")
    .eq("candidate_id", candidateId)
    .maybeSingle();
  return (data as Session) ?? null;
}

export async function getScore(candidateId: string): Promise<Score | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("scores")
    .select("*")
    .eq("candidate_id", candidateId)
    .maybeSingle();
  return (data as Score) ?? null;
}

// ===========================================================================
// Admin + employer data access
// ===========================================================================

import { randomBytes } from "crypto";

function makeToken(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 32) || "employer"
  );
}

export interface AdminCandidateRow extends Candidate {
  employer_name: string;
  time_spent_seconds: number | null;
  submitted_at: string | null;
  started_at: string | null;
}

export async function listCandidatesForAdmin(): Promise<AdminCandidateRow[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("candidates")
    .select("*, employers(name), sessions(time_spent_seconds, submitted_at, started_at)")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row: Record<string, unknown>) => {
    const employer = row.employers as { name: string } | null;
    const sessionArr = row.sessions as
      | { time_spent_seconds: number | null; submitted_at: string | null; started_at: string | null }[]
      | null;
    const session = Array.isArray(sessionArr) ? sessionArr[0] : null;
    return {
      ...(row as unknown as Candidate),
      employer_name: employer?.name ?? "-",
      time_spent_seconds: session?.time_spent_seconds ?? null,
      submitted_at: session?.submitted_at ?? null,
      started_at: session?.started_at ?? null
    };
  });
}

export interface CandidateFull {
  candidate: Candidate;
  employer: Employer;
  session: Session | null;
  responses: Response[];
  score: Score | null;
}

export async function getCandidateFull(id: string): Promise<CandidateFull | null> {
  const db = getSupabaseAdmin();
  const { data: candidate } = await db
    .from("candidates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!candidate) return null;

  const c = candidate as Candidate;
  const [{ data: employer }, session, responses, score] = await Promise.all([
    db.from("employers").select("*").eq("id", c.employer_id).maybeSingle(),
    getSession(id),
    getResponses(id),
    getScore(id)
  ]);

  return {
    candidate: c,
    employer: employer as Employer,
    session,
    responses,
    score
  };
}

export async function upsertScore(
  candidateId: string,
  patch: Partial<Score>
): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("scores").upsert(
    {
      candidate_id: candidateId,
      ...patch,
      scored_at: new Date().toISOString()
    },
    { onConflict: "candidate_id" }
  );
}

export interface CreateInviteInput {
  name: string;
  email: string;
  employerName: string;
  role: string;
}

export interface CreateInviteResult {
  candidate: Candidate;
  employer: Employer;
  invitationToken: string;
}

/** Find-or-create the employer by name, then create the candidate + invite token. */
export async function createInvite(
  input: CreateInviteInput
): Promise<CreateInviteResult> {
  const db = getSupabaseAdmin();

  // Find existing employer (case-insensitive by name).
  const { data: existing } = await db
    .from("employers")
    .select("*")
    .ilike("name", input.employerName.trim())
    .maybeSingle();

  let employer = existing as Employer | null;
  if (!employer) {
    const baseToken = slugify(input.employerName);
    const { data: created, error } = await db
      .from("employers")
      .insert({
        name: input.employerName.trim(),
        passcode: makeToken(4), // 8-char hex passcode
        token: `${baseToken}-${makeToken(2)}`
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    employer = created as Employer;
  }

  const invitationToken = makeToken(16);
  const { data: candidate, error: cErr } = await db
    .from("candidates")
    .insert({
      employer_id: employer.id,
      name: input.name.trim(),
      email: input.email.trim(),
      role: input.role.trim(),
      invitation_token: invitationToken,
      status: "invited"
    })
    .select("*")
    .single();
  if (cErr) throw new Error(cErr.message);

  return { candidate: candidate as Candidate, employer, invitationToken };
}

// ---- Employer-facing -------------------------------------------------------

export async function getEmployerByToken(token: string): Promise<Employer | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("employers")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  return (data as Employer) ?? null;
}

export interface EmployerLeaderboardRow {
  candidate: Candidate;
  score: Score | null;
  checks: number;
  errorsFound: number;
  preliminaryRead: string | null;
}

export async function getEmployerLeaderboard(
  employerId: string
): Promise<EmployerLeaderboardRow[]> {
  const db = getSupabaseAdmin();
  const { data: candidates } = await db
    .from("candidates")
    .select("*")
    .eq("employer_id", employerId);

  const rows: EmployerLeaderboardRow[] = [];
  for (const c of (candidates ?? []) as Candidate[]) {
    const [score, responses] = await Promise.all([
      getScore(c.id),
      getResponses(c.id)
    ]);
    const boolKeys: (keyof Score)[] = [
      "error_1_found",
      "error_2_found",
      "error_3_found",
      "uncertainty_communicated",
      "updated_view",
      "genuine_reasoning"
    ];
    const checks = score ? boolKeys.filter((k) => score[k] === true).length : 0;
    const errorsFound = score
      ? ["error_1_found", "error_2_found", "error_3_found"].filter(
          (k) => score[k as keyof Score] === true
        ).length
      : 0;
    const managerResponse = responses.find((r) => r.stage === "manager_read");
    rows.push({
      candidate: c,
      score,
      checks,
      errorsFound,
      preliminaryRead: managerResponse?.response_text ?? null
    });
  }

  rows.sort((a, b) => b.checks - a.checks);
  return rows;
}

export async function createFeedback(
  employerId: string,
  payload: {
    q1_rating: number;
    q1_text: string;
    q2_rating: number;
    q2_text: string;
    q3_rating: number;
    q3_text: string;
  }
): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("feedback").insert({ employer_id: employerId, ...payload });
}

export type { Feedback };
