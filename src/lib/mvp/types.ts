// Row types for the Fydell Backend MVP schema (supabase/migrations/001_mvp_core.sql).
// Shared across server data-access, API routes, and the dashboard UI.

export type ProfileRole = "employer" | "candidate" | "admin";
export type WorkspaceRole = "owner" | "admin" | "member";
export type SimulationStatus = "draft" | "active" | "archived";
export type InviteStatus =
  | "created"
  | "opened"
  | "started"
  | "completed"
  | "expired"
  | "cancelled";
export type AttemptStatus = "not_started" | "in_progress" | "submitted" | "reviewed";
export type HiringDecision =
  | "not_decided"
  | "advance"
  | "hold"
  | "reject"
  | "offer"
  | "hired";
export type OverallSignal = "strong" | "moderate" | "weak" | "insufficient";
export type FeedbackStage = "30_day" | "60_day" | "90_day" | "6_month" | "12_month";

export const SIMULATION_EVENT_TYPES = [
  "simulation_started",
  "resource_opened",
  "note_updated",
  "chat_prompt_viewed",
  "question_answered",
  "assumption_added",
  "recommendation_submitted",
  "simulation_completed",
  "report_viewed",
  "reviewer_note_added"
] as const;
export type SimulationEventType = (typeof SIMULATION_EVENT_TYPES)[number];

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: ProfileRole;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface ScenarioJson {
  background?: string;
  candidate_role?: string;
  business_problem?: string;
  success_definition?: string;
  constraints?: string[];
  ambiguity_points?: string[];
  phases?: string[];
  objectives?: string[];
  [k: string]: unknown;
}

export interface ResourceJson {
  id: string;
  title: string;
  type: string;
  summary?: string;
  content: string;
  relevance?: string;
}

export interface RubricDimension {
  dimension: string;
  description?: string;
  weight: number;
  levels?: { weak?: string; adequate?: string; strong?: string; exceptional?: string };
  evidence_sources?: string[];
}

export interface Simulation {
  id: string;
  workspace_id: string | null;
  title: string;
  role: string;
  industry: string | null;
  description: string | null;
  duration_minutes: number | null;
  difficulty: string | null;
  status: SimulationStatus;
  simulation_type: string | null;
  scenario_json: ScenarioJson;
  resources_json: ResourceJson[];
  rubric_json: RubricDimension[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateInvite {
  id: string;
  workspace_id: string;
  simulation_id: string;
  candidate_email: string | null;
  candidate_name: string | null;
  token: string;
  status: InviteStatus;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface ScoreJson {
  analytical_accuracy: number;
  business_judgment: number;
  prioritization: number;
  communication_clarity: number;
  risk_detection: number;
  ambiguity_handling: number;
  recommendation_quality: number;
  [k: string]: number;
}

export interface ReportJson {
  summary: string;
  strengths: string[];
  risks: string[];
  evidence: string[];
  interview_questions: string[];
  overall_signal: OverallSignal;
}

export interface SimulationAttempt {
  id: string;
  workspace_id: string;
  simulation_id: string;
  invite_id: string | null;
  candidate_name: string | null;
  candidate_email: string | null;
  status: AttemptStatus;
  started_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  final_recommendation: string | null;
  candidate_notes: string | null;
  score: number | null;
  score_json: ScoreJson | null;
  report_json: ReportJson | null;
  hiring_decision: HiringDecision;
  hired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SimulationEvent {
  id: string;
  attempt_id: string;
  workspace_id: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  created_at: string;
}

export interface CandidateReport {
  id: string;
  workspace_id: string;
  attempt_id: string;
  overall_signal: OverallSignal | null;
  summary: string | null;
  strengths_json: string[];
  risks_json: string[];
  evidence_json: string[];
  interview_questions_json: string[];
  reviewer_notes: string | null;
  reviewer_decision: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutcomeFeedback {
  id: string;
  workspace_id: string;
  attempt_id: string;
  feedback_stage: FeedbackStage;
  manager_email: string | null;
  manager_role: string | null;
  overall_performance: "below" | "meets" | "above" | "top" | null;
  would_hire_again: "yes" | "no" | "unsure" | null;
  ramp_speed: "slow" | "expected" | "fast" | null;
  work_quality: number | null;
  communication: number | null;
  judgment: number | null;
  independence: number | null;
  notes: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  workspace_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  plan: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
