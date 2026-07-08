import "server-only";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "../supabase";
import { scoreAttempt, type ScoringResult } from "./scoring";
import type {
  CandidateInvite,
  CandidateReport,
  FeedbackStage,
  HiringDecision,
  OutcomeFeedback,
  ReportJson,
  ScoreJson,
  Simulation,
  SimulationAttempt,
  SimulationEvent,
  SimulationEventType,
  Workspace
} from "./types";

// ===========================================================================
// MVP data-access layer. Everything here runs server-side with the
// service-role client (RLS-bypassing). Candidate (token) access is mediated
// entirely through these server functions + token validation — there are no
// anon candidate RLS policies by design.
// ===========================================================================

function db() {
  return getSupabaseAdmin();
}

function makeToken(bytes = 18): string {
  return randomBytes(bytes).toString("base64url");
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

/** Return the user's primary workspace (owner first), creating one if missing. */
export async function createWorkspaceIfMissing(
  userId: string,
  name = "Your workspace"
): Promise<Workspace> {
  const existing = await getCurrentWorkspace(userId);
  if (existing) return existing;

  const { data: ws, error } = await db()
    .from("workspaces")
    .insert({ name, created_by: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { error: memErr } = await db()
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
  if (memErr) throw new Error(memErr.message);

  return ws as Workspace;
}

/** The user's primary workspace (owner membership preferred), or null. */
export async function getCurrentWorkspace(userId: string): Promise<Workspace | null> {
  const { data: memberships } = await db()
    .from("workspace_members")
    .select("workspace_id, role, created_at, workspaces(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!memberships || memberships.length === 0) return null;

  const ranked = [...memberships].sort((a, b) => {
    const rank = (r: string) => (r === "owner" ? 0 : r === "admin" ? 1 : 2);
    return rank(String(a.role)) - rank(String(b.role));
  });
  const ws = ranked[0].workspaces as unknown as Workspace | null;
  return ws ?? null;
}

// ---------------------------------------------------------------------------
// Simulations
// ---------------------------------------------------------------------------

/** Active simulations available to a workspace: its own + global templates. */
export async function getWorkspaceSimulations(
  workspaceId: string
): Promise<Simulation[]> {
  const { data, error } = await db()
    .from("simulations")
    .select("*")
    .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Simulation[]) ?? [];
}

export async function getSimulation(id: string): Promise<Simulation | null> {
  const { data } = await db().from("simulations").select("*").eq("id", id).maybeSingle();
  return (data as Simulation) ?? null;
}

// ---------------------------------------------------------------------------
// Candidate invites
// ---------------------------------------------------------------------------

export interface CreateInviteInput {
  workspaceId: string;
  simulationId: string;
  candidateName?: string | null;
  candidateEmail?: string | null;
  createdBy?: string | null;
  expiresInDays?: number;
}

export async function createCandidateInvite(
  input: CreateInviteInput
): Promise<CandidateInvite> {
  const token = makeToken();
  const expires_at = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
    : null;

  const { data, error } = await db()
    .from("candidate_invites")
    .insert({
      workspace_id: input.workspaceId,
      simulation_id: input.simulationId,
      candidate_name: input.candidateName ?? null,
      candidate_email: input.candidateEmail ?? null,
      token,
      status: "created",
      created_by: input.createdBy ?? null,
      expires_at
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CandidateInvite;
}

export interface ValidatedInvite {
  invite: CandidateInvite;
  simulation: Simulation;
}

/**
 * Validate a candidate invite token. Returns null when the token is unknown,
 * cancelled, or expired. Marks the invite `opened` on first valid view.
 */
export async function validateCandidateInvite(
  token: string
): Promise<ValidatedInvite | null> {
  const { data: invite } = await db()
    .from("candidate_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!invite) return null;

  const inv = invite as CandidateInvite;
  if (inv.status === "cancelled" || inv.status === "expired") return null;
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    await db().from("candidate_invites").update({ status: "expired" }).eq("id", inv.id);
    return null;
  }

  const simulation = await getSimulation(inv.simulation_id);
  if (!simulation) return null;

  if (inv.status === "created") {
    await db().from("candidate_invites").update({ status: "opened" }).eq("id", inv.id);
    inv.status = "opened";
  }

  return { invite: inv, simulation };
}

// ---------------------------------------------------------------------------
// Attempts + events
// ---------------------------------------------------------------------------

/** Begin (or resume) the single attempt tied to an invite token. */
export async function startSimulationAttempt(token: string): Promise<SimulationAttempt | null> {
  const validated = await validateCandidateInvite(token);
  if (!validated) return null;
  const { invite } = validated;

  const { data: existing } = await db()
    .from("simulation_attempts")
    .select("*")
    .eq("invite_id", invite.id)
    .maybeSingle();

  if (existing) {
    const att = existing as SimulationAttempt;
    if (att.status === "not_started") {
      await db()
        .from("simulation_attempts")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", att.id);
    }
    return getAttempt(att.id);
  }

  const now = new Date().toISOString();
  const { data: attempt, error } = await db()
    .from("simulation_attempts")
    .insert({
      workspace_id: invite.workspace_id,
      simulation_id: invite.simulation_id,
      invite_id: invite.id,
      candidate_name: invite.candidate_name,
      candidate_email: invite.candidate_email,
      status: "in_progress",
      started_at: now
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await db().from("candidate_invites").update({ status: "started" }).eq("id", invite.id);
  await recordSimulationEvent(attempt.id, "simulation_started", {});
  return attempt as SimulationAttempt;
}

export async function getAttempt(attemptId: string): Promise<SimulationAttempt | null> {
  const { data } = await db()
    .from("simulation_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();
  return (data as SimulationAttempt) ?? null;
}

export async function recordSimulationEvent(
  attemptId: string,
  eventType: SimulationEventType | string,
  payload: Record<string, unknown> = {}
): Promise<SimulationEvent | null> {
  const attempt = await getAttempt(attemptId);
  if (!attempt) return null;
  const { data, error } = await db()
    .from("simulation_events")
    .insert({
      attempt_id: attemptId,
      workspace_id: attempt.workspace_id,
      event_type: eventType,
      event_payload: payload
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as SimulationEvent;
}

export async function getAttemptEvents(attemptId: string): Promise<SimulationEvent[]> {
  const { data } = await db()
    .from("simulation_events")
    .select("*")
    .eq("attempt_id", attemptId)
    .order("created_at", { ascending: true });
  return (data as SimulationEvent[]) ?? [];
}

export async function updateCandidateNotes(
  attemptId: string,
  notes: string
): Promise<void> {
  await db()
    .from("simulation_attempts")
    .update({ candidate_notes: notes })
    .eq("id", attemptId);
  await recordSimulationEvent(attemptId, "note_updated", { length: notes.length });
}

/** Candidate submits their final recommendation; marks the attempt submitted. */
export async function submitFinalRecommendation(
  attemptId: string,
  recommendation: string
): Promise<SimulationAttempt | null> {
  const now = new Date().toISOString();
  await db()
    .from("simulation_attempts")
    .update({
      final_recommendation: recommendation,
      status: "submitted",
      submitted_at: now,
      completed_at: now
    })
    .eq("id", attemptId);

  const attempt = await getAttempt(attemptId);
  if (attempt?.invite_id) {
    await db()
      .from("candidate_invites")
      .update({ status: "completed" })
      .eq("id", attempt.invite_id);
  }
  await recordSimulationEvent(attemptId, "recommendation_submitted", {
    length: recommendation.length
  });
  await recordSimulationEvent(attemptId, "simulation_completed", {});
  return attempt;
}

// ---------------------------------------------------------------------------
// Scoring + report (deterministic, evidence-backed "preliminary signal")
// ---------------------------------------------------------------------------

export async function generateAttemptScore(
  attemptId: string
): Promise<ScoringResult | null> {
  const attempt = await getAttempt(attemptId);
  if (!attempt) return null;
  const events = await getAttemptEvents(attemptId);

  const result = scoreAttempt({
    finalRecommendation: attempt.final_recommendation ?? "",
    candidateNotes: attempt.candidate_notes,
    events
  });

  await db()
    .from("simulation_attempts")
    .update({
      score: result.overall_score,
      score_json: result.score_json as unknown as ScoreJson,
      report_json: result.report_json as unknown as ReportJson,
      status: "reviewed"
    })
    .eq("id", attemptId);

  return result;
}

/** Build (or rebuild) the persisted candidate_reports row from the score. */
export async function generateCandidateReport(
  attemptId: string
): Promise<CandidateReport | null> {
  let attempt = await getAttempt(attemptId);
  if (!attempt) return null;

  if (!attempt.report_json) {
    await generateAttemptScore(attemptId);
    attempt = await getAttempt(attemptId);
  }
  const report = attempt?.report_json;
  if (!attempt || !report) return null;

  const { data, error } = await db()
    .from("candidate_reports")
    .upsert(
      {
        workspace_id: attempt.workspace_id,
        attempt_id: attempt.id,
        overall_signal: report.overall_signal,
        summary: report.summary,
        strengths_json: report.strengths,
        risks_json: report.risks,
        evidence_json: report.evidence,
        interview_questions_json: report.interview_questions
      },
      { onConflict: "attempt_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CandidateReport;
}

// ---------------------------------------------------------------------------
// Hiring decision + outcome feedback (the execution-data moat)
// ---------------------------------------------------------------------------

export async function updateHiringDecision(
  attemptId: string,
  decision: HiringDecision
): Promise<SimulationAttempt | null> {
  const patch: Record<string, unknown> = { hiring_decision: decision };
  if (decision === "hired") {
    const attempt = await getAttempt(attemptId);
    if (!attempt?.hired_at) patch.hired_at = new Date().toISOString();
  }
  await db().from("simulation_attempts").update(patch).eq("id", attemptId);
  return getAttempt(attemptId);
}

export interface OutcomeFeedbackInput {
  attemptId: string;
  feedbackStage: FeedbackStage;
  managerEmail?: string | null;
  managerRole?: string | null;
  overallPerformance?: "below" | "meets" | "above" | "top" | null;
  wouldHireAgain?: "yes" | "no" | "unsure" | null;
  rampSpeed?: "slow" | "expected" | "fast" | null;
  workQuality?: number | null;
  communication?: number | null;
  judgment?: number | null;
  independence?: number | null;
  notes?: string | null;
}

export async function createOutcomeFeedback(
  input: OutcomeFeedbackInput
): Promise<OutcomeFeedback | null> {
  const attempt = await getAttempt(input.attemptId);
  if (!attempt) return null;

  const { data, error } = await db()
    .from("outcome_feedback")
    .insert({
      workspace_id: attempt.workspace_id,
      attempt_id: input.attemptId,
      feedback_stage: input.feedbackStage,
      manager_email: input.managerEmail ?? null,
      manager_role: input.managerRole ?? null,
      overall_performance: input.overallPerformance ?? null,
      would_hire_again: input.wouldHireAgain ?? null,
      ramp_speed: input.rampSpeed ?? null,
      work_quality: input.workQuality ?? null,
      communication: input.communication ?? null,
      judgment: input.judgment ?? null,
      independence: input.independence ?? null,
      notes: input.notes ?? null
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as OutcomeFeedback;
}

// ---------------------------------------------------------------------------
// Dashboard + reports read models
// ---------------------------------------------------------------------------

export interface SignalCalibration {
  hiredCount: number;
  checkInsDue: number;
  feedbackCollected: number;
  message: string;
  /** Honest disclaimer — we never imply a validated correlation in the MVP. */
  disclaimer: string;
}

export interface DashboardData {
  workspace: Workspace | null;
  simulations: Simulation[];
  attempts: SimulationAttempt[];
  invites: CandidateInvite[];
  stats: {
    totalSimulations: number;
    totalInvites: number;
    totalAttempts: number;
    completedAttempts: number;
    hires: number;
  };
  calibration: SignalCalibration;
}

const DAY_MS = 86_400_000;

function computeCalibration(
  attempts: SimulationAttempt[],
  feedback: OutcomeFeedback[]
): SignalCalibration {
  const hired = attempts.filter((a) => a.hired_at);
  const feedbackByAttempt = new Map<string, Set<string>>();
  for (const f of feedback) {
    if (!feedbackByAttempt.has(f.attempt_id)) feedbackByAttempt.set(f.attempt_id, new Set());
    feedbackByAttempt.get(f.attempt_id)!.add(f.feedback_stage);
  }

  let checkInsDue = 0;
  const now = Date.now();
  for (const a of hired) {
    const ageDays = (now - new Date(a.hired_at!).getTime()) / DAY_MS;
    const stages = feedbackByAttempt.get(a.id) ?? new Set<string>();
    if (ageDays >= 30 && !stages.has("30_day")) checkInsDue += 1;
    if (ageDays >= 90 && !stages.has("90_day")) checkInsDue += 1;
  }

  let message: string;
  if (hired.length === 0) {
    message = "Not enough outcome data yet. Make a hire to start calibrating signal.";
  } else if (checkInsDue > 0) {
    message = `${checkInsDue} check-in${checkInsDue === 1 ? "" : "s"} due.`;
  } else {
    message = "Outcome tracking is up to date.";
  }

  return {
    hiredCount: hired.length,
    checkInsDue,
    feedbackCollected: feedback.length,
    message,
    disclaimer:
      "Outcome data is collected to calibrate signal over time. We do not claim a validated correlation between simulation scores and on-the-job performance."
  };
}

export async function getDashboardData(workspaceId: string): Promise<DashboardData> {
  const [{ data: ws }, simulations, { data: attempts }, { data: invites }, { data: feedback }] =
    await Promise.all([
      db().from("workspaces").select("*").eq("id", workspaceId).maybeSingle(),
      getWorkspaceSimulations(workspaceId),
      db()
        .from("simulation_attempts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      db()
        .from("candidate_invites")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      db().from("outcome_feedback").select("*").eq("workspace_id", workspaceId)
    ]);

  const attemptRows = (attempts as SimulationAttempt[]) ?? [];
  const inviteRows = (invites as CandidateInvite[]) ?? [];
  const feedbackRows = (feedback as OutcomeFeedback[]) ?? [];

  return {
    workspace: (ws as Workspace) ?? null,
    simulations,
    attempts: attemptRows,
    invites: inviteRows,
    stats: {
      totalSimulations: simulations.length,
      totalInvites: inviteRows.length,
      totalAttempts: attemptRows.length,
      completedAttempts: attemptRows.filter(
        (a) => a.status === "submitted" || a.status === "reviewed"
      ).length,
      hires: attemptRows.filter((a) => a.hiring_decision === "hired").length
    },
    calibration: computeCalibration(attemptRows, feedbackRows)
  };
}

export interface AttemptReport {
  attempt: SimulationAttempt;
  simulation: Simulation | null;
  report: CandidateReport | null;
  events: SimulationEvent[];
}

export async function getAttemptReport(attemptId: string): Promise<AttemptReport | null> {
  const attempt = await getAttempt(attemptId);
  if (!attempt) return null;

  const [simulation, { data: report }, events] = await Promise.all([
    getSimulation(attempt.simulation_id),
    db().from("candidate_reports").select("*").eq("attempt_id", attemptId).maybeSingle(),
    getAttemptEvents(attemptId)
  ]);

  return {
    attempt,
    simulation,
    report: (report as CandidateReport) ?? null,
    events
  };
}
