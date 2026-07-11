import "server-only";
import { randomBytes, randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
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

export type CreateInviteInput = {
  workspaceId: string;
  simulationId: string;
  candidateName?: string | null;
  candidateEmail?: string | null;
  createdBy?: string | null;
  expiresInDays?: number;
};

export type ValidatedInvite = {
  invite: CandidateInvite;
  simulation: Simulation;
};

export type OutcomeFeedbackInput = {
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
};

export type DashboardData = {
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
  calibration: {
    hiredCount: number;
    checkInsDue: number;
    feedbackCollected: number;
    message: string;
    disclaimer: string;
  };
};

export type AttemptReport = {
  attempt: SimulationAttempt;
  simulation: Simulation | null;
  report: CandidateReport | null;
  events: SimulationEvent[];
};

/**
 * File-backed MVP store used when Supabase is not configured.
 * Server-only (.data/ is gitignored). Closes the Meridian loop locally/prod-without-DB.
 */

const DATA_DIR = join(process.cwd(), ".data");
const STORE_PATH = join(DATA_DIR, "mvp-loop.json");

const MERIDIAN_ID = "sim-meridian-001";

type Member = {
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

type Store = {
  workspaces: Workspace[];
  members: Member[];
  simulations: Simulation[];
  invites: CandidateInvite[];
  attempts: SimulationAttempt[];
  events: SimulationEvent[];
  reports: CandidateReport[];
  feedback: OutcomeFeedback[];
};

function nowIso() {
  return new Date().toISOString();
}

function makeToken(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}

function meridianTemplate(workspaceId: string | null = null): Simulation {
  const t = nowIso();
  return {
    id: MERIDIAN_ID,
    workspace_id: workspaceId,
    title: "Project Meridian — FP&A Forecast Review",
    role: "Junior FP&A Analyst",
    industry: "Outdoor / Consumer Goods",
    description:
      "Candidate reviews Meridian Outdoor Co.'s Q3 hiring plan, models the financial impact of 8 proposed FTEs, surfaces risks, and delivers a Go / Hold / Revise recommendation.",
    duration_minutes: 25,
    difficulty: "Intermediate",
    status: "active",
    simulation_type: "fpa_forecast_review",
    scenario_json: {} as Simulation["scenario_json"],
    resources_json: [],
    rubric_json: [],
    created_by: null,
    created_at: t,
    updated_at: t
  };
}

function emptyStore(): Store {
  return {
    workspaces: [],
    members: [],
    simulations: [meridianTemplate(null)],
    invites: [],
    attempts: [],
    events: [],
    reports: [],
    feedback: []
  };
}

function readStore(): Store {
  if (!existsSync(STORE_PATH)) return emptyStore();
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Store;
    if (!parsed.simulations?.some((s) => s.id === MERIDIAN_ID)) {
      parsed.simulations = [...(parsed.simulations ?? []), meridianTemplate(null)];
    }
    parsed.members ??= [];
    parsed.invites ??= [];
    parsed.attempts ??= [];
    parsed.events ??= [];
    parsed.reports ??= [];
    parsed.feedback ??= [];
    parsed.workspaces ??= [];
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function localCreateWorkspaceIfMissing(
  userId: string,
  name = "Your workspace"
): Workspace {
  const store = readStore();
  const membership = store.members
    .filter((m) => m.user_id === userId)
    .sort((a, b) => {
      const rank = (r: string) => (r === "owner" ? 0 : r === "admin" ? 1 : 2);
      return rank(a.role) - rank(b.role);
    })[0];
  if (membership) {
    const ws = store.workspaces.find((w) => w.id === membership.workspace_id);
    if (ws) return ws;
  }

  const t = nowIso();
  const ws: Workspace = {
    id: randomUUID(),
    name,
    created_by: userId,
    created_at: t,
    updated_at: t
  };
  store.workspaces.push(ws);
  store.members.push({
    workspace_id: ws.id,
    user_id: userId,
    role: "owner",
    created_at: t
  });
  // Ensure Meridian is available to this workspace as a copy reference (global template already exists)
  writeStore(store);
  return ws;
}

export function localGetCurrentWorkspace(userId: string): Workspace | null {
  const store = readStore();
  const membership = store.members
    .filter((m) => m.user_id === userId)
    .sort((a, b) => {
      const rank = (r: string) => (r === "owner" ? 0 : r === "admin" ? 1 : 2);
      return rank(a.role) - rank(b.role);
    })[0];
  if (!membership) return null;
  return store.workspaces.find((w) => w.id === membership.workspace_id) ?? null;
}

export function localGetWorkspaceSimulations(workspaceId: string): Simulation[] {
  const store = readStore();
  return store.simulations.filter(
    (s) => s.workspace_id === workspaceId || s.workspace_id == null
  );
}

export function localGetSimulation(id: string): Simulation | null {
  return readStore().simulations.find((s) => s.id === id) ?? null;
}

export function localCreateCandidateInvite(input: CreateInviteInput): CandidateInvite {
  const store = readStore();
  const sim =
    store.simulations.find((s) => s.id === input.simulationId) ??
    store.simulations.find((s) => s.id === MERIDIAN_ID);
  if (!sim) throw new Error("Simulation not found.");

  const t = nowIso();
  const invite: CandidateInvite = {
    id: randomUUID(),
    workspace_id: input.workspaceId,
    simulation_id: sim.id,
    candidate_name: input.candidateName ?? null,
    candidate_email: input.candidateEmail ?? null,
    token: makeToken(),
    status: "created",
    created_by: input.createdBy ?? null,
    created_at: t,
    expires_at: input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
      : null
  };
  store.invites.unshift(invite);
  writeStore(store);
  return invite;
}

export function localValidateCandidateInvite(token: string): ValidatedInvite | null {
  const store = readStore();
  const invite = store.invites.find((i) => i.token === token);
  if (!invite) return null;
  if (invite.status === "cancelled" || invite.status === "expired") return null;
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    invite.status = "expired";
    writeStore(store);
    return null;
  }
  const simulation = store.simulations.find((s) => s.id === invite.simulation_id);
  if (!simulation) return null;
  if (invite.status === "created") {
    invite.status = "opened";
    writeStore(store);
  }
  return { invite, simulation };
}

export function localStartSimulationAttempt(token: string): SimulationAttempt | null {
  const validated = localValidateCandidateInvite(token);
  if (!validated) return null;
  const store = readStore();
  const invite = store.invites.find((i) => i.id === validated.invite.id)!;
  const existing = store.attempts.find((a) => a.invite_id === invite.id);
  if (existing) {
    if (existing.status === "not_started") {
      existing.status = "in_progress";
      existing.started_at = nowIso();
      writeStore(store);
    }
    return existing;
  }

  const t = nowIso();
  const attempt: SimulationAttempt = {
    id: randomUUID(),
    workspace_id: invite.workspace_id,
    simulation_id: invite.simulation_id,
    invite_id: invite.id,
    candidate_name: invite.candidate_name,
    candidate_email: invite.candidate_email,
    status: "in_progress",
    hiring_decision: "not_decided",
    final_recommendation: null,
    candidate_notes: null,
    score: null,
    score_json: null,
    report_json: null,
    started_at: t,
    submitted_at: null,
    completed_at: null,
    hired_at: null,
    created_at: t,
    updated_at: t
  };
  store.attempts.unshift(attempt);
  invite.status = "started";
  store.events.push({
    id: randomUUID(),
    attempt_id: attempt.id,
    workspace_id: attempt.workspace_id,
    event_type: "simulation_started",
    event_payload: {},
    created_at: t
  });
  writeStore(store);
  return attempt;
}

export function localGetAttempt(attemptId: string): SimulationAttempt | null {
  return readStore().attempts.find((a) => a.id === attemptId) ?? null;
}

export function localRecordSimulationEvent(
  attemptId: string,
  eventType: SimulationEventType | string,
  payload: Record<string, unknown> = {}
): SimulationEvent | null {
  const store = readStore();
  const attempt = store.attempts.find((a) => a.id === attemptId);
  if (!attempt) return null;
  const event: SimulationEvent = {
    id: randomUUID(),
    attempt_id: attemptId,
    workspace_id: attempt.workspace_id,
    event_type: eventType as SimulationEventType,
    event_payload: payload,
    created_at: nowIso()
  };
  store.events.push(event);
  writeStore(store);
  return event;
}

export function localGetAttemptEvents(attemptId: string): SimulationEvent[] {
  return readStore()
    .events.filter((e) => e.attempt_id === attemptId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function localUpdateCandidateNotes(attemptId: string, notes: string): void {
  const store = readStore();
  const attempt = store.attempts.find((a) => a.id === attemptId);
  if (!attempt) return;
  attempt.candidate_notes = notes;
  attempt.updated_at = nowIso();
  writeStore(store);
  localRecordSimulationEvent(attemptId, "note_updated", { length: notes.length });
}

export function localSubmitFinalRecommendation(
  attemptId: string,
  recommendation: string
): SimulationAttempt | null {
  const store = readStore();
  const attempt = store.attempts.find((a) => a.id === attemptId);
  if (!attempt) return null;
  const t = nowIso();
  attempt.final_recommendation = recommendation;
  attempt.status = "submitted";
  attempt.submitted_at = t;
  attempt.completed_at = t;
  attempt.updated_at = t;
  if (attempt.invite_id) {
    const invite = store.invites.find((i) => i.id === attempt.invite_id);
    if (invite) invite.status = "completed";
  }
  writeStore(store);
  localRecordSimulationEvent(attemptId, "recommendation_submitted", {
    length: recommendation.length
  });
  localRecordSimulationEvent(attemptId, "simulation_completed", {});
  return localGetAttempt(attemptId);
}

export function localGenerateAttemptScore(attemptId: string): ScoringResult | null {
  const store = readStore();
  const attempt = store.attempts.find((a) => a.id === attemptId);
  if (!attempt) return null;
  const events = store.events.filter((e) => e.attempt_id === attemptId);
  const result = scoreAttempt({
    finalRecommendation: attempt.final_recommendation ?? "",
    candidateNotes: attempt.candidate_notes,
    events
  });
  attempt.score = result.overall_score;
  attempt.score_json = result.score_json as unknown as ScoreJson;
  attempt.report_json = result.report_json as unknown as ReportJson;
  attempt.status = "reviewed";
  attempt.updated_at = nowIso();
  writeStore(store);
  return result;
}

export function localGenerateCandidateReport(attemptId: string): CandidateReport | null {
  let attempt = localGetAttempt(attemptId);
  if (!attempt) return null;
  if (!attempt.report_json) {
    localGenerateAttemptScore(attemptId);
    attempt = localGetAttempt(attemptId);
  }
  if (!attempt?.report_json) return null;

  const store = readStore();
  const existingIdx = store.reports.findIndex((r) => r.attempt_id === attemptId);
  const report: CandidateReport = {
    id: existingIdx >= 0 ? store.reports[existingIdx].id : randomUUID(),
    workspace_id: attempt.workspace_id,
    attempt_id: attempt.id,
    overall_signal: attempt.report_json.overall_signal,
    summary: attempt.report_json.summary,
    strengths_json: attempt.report_json.strengths,
    risks_json: attempt.report_json.risks,
    evidence_json: attempt.report_json.evidence,
    interview_questions_json: attempt.report_json.interview_questions,
    reviewer_notes: existingIdx >= 0 ? store.reports[existingIdx].reviewer_notes : null,
    reviewer_decision: existingIdx >= 0 ? store.reports[existingIdx].reviewer_decision : null,
    created_at: existingIdx >= 0 ? store.reports[existingIdx].created_at : nowIso(),
    updated_at: nowIso()
  };
  if (existingIdx >= 0) store.reports[existingIdx] = report;
  else store.reports.unshift(report);
  writeStore(store);
  return report;
}

export function localUpdateHiringDecision(
  attemptId: string,
  decision: HiringDecision
): SimulationAttempt | null {
  const store = readStore();
  const attempt = store.attempts.find((a) => a.id === attemptId);
  if (!attempt) return null;
  attempt.hiring_decision = decision;
  if (decision === "hired" && !attempt.hired_at) attempt.hired_at = nowIso();
  attempt.updated_at = nowIso();
  writeStore(store);
  return attempt;
}

export function localCreateOutcomeFeedback(
  input: OutcomeFeedbackInput
): OutcomeFeedback | null {
  const attempt = localGetAttempt(input.attemptId);
  if (!attempt) return null;
  const store = readStore();
  const row: OutcomeFeedback = {
    id: randomUUID(),
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
    notes: input.notes ?? null,
    created_at: nowIso()
  };
  store.feedback.push(row);
  writeStore(store);
  return row;
}

export function localGetDashboardData(workspaceId: string): DashboardData {
  const store = readStore();
  const workspace = store.workspaces.find((w) => w.id === workspaceId) ?? null;
  const simulations = localGetWorkspaceSimulations(workspaceId);
  const attempts = store.attempts
    .filter((a) => a.workspace_id === workspaceId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const invites = store.invites
    .filter((i) => i.workspace_id === workspaceId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const feedback = store.feedback.filter((f) => f.workspace_id === workspaceId);

  return {
    workspace,
    simulations,
    attempts,
    invites,
    stats: {
      totalSimulations: simulations.length,
      totalInvites: invites.length,
      totalAttempts: attempts.length,
      completedAttempts: attempts.filter(
        (a) => a.status === "submitted" || a.status === "reviewed"
      ).length,
      hires: attempts.filter((a) => a.hiring_decision === "hired").length
    },
    calibration: {
      hiredCount: attempts.filter((a) => a.hired_at).length,
      checkInsDue: 0,
      feedbackCollected: feedback.length,
      message:
        attempts.filter((a) => a.hired_at).length === 0
          ? "Not enough outcome data yet. Make a hire to start calibrating signal."
          : "Outcome tracking is up to date.",
      disclaimer:
        "Outcome data is collected to calibrate signal over time. We do not claim a validated correlation between simulation scores and on-the-job performance."
    }
  };
}

export function localGetAttemptReport(attemptId: string): AttemptReport | null {
  const attempt = localGetAttempt(attemptId);
  if (!attempt) return null;
  const store = readStore();
  return {
    attempt,
    simulation: store.simulations.find((s) => s.id === attempt.simulation_id) ?? null,
    report: store.reports.find((r) => r.attempt_id === attemptId) ?? null,
    events: localGetAttemptEvents(attemptId)
  };
}
