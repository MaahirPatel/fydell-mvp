export const PROOF_ROLE_SLUG = "solutions-engineer" as const;
export const PROOF_VERSION_KEY = "se-northstar-v1" as const;
export const PROOF_ROLE_ID = "00000000-0000-4000-a000-000000000001";
export const PROOF_VERSION_ID = "00000000-0000-4000-a000-000000000010";

export const EVENT_SOURCES = ["WORLD", "CANDIDATE", "TELEMETRY", "SYSTEM"] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export const WORLD_EVENT_TYPES = [
  "FACT_RELEASED",
  "AGENT_MESSAGE_SENT",
  "RESOURCE_UNLOCKED",
  "STAGE_CHANGED",
  "DEFENSE_QUESTION_ASKED",
] as const;

export const CANDIDATE_EVENT_TYPES = [
  "CANDIDATE_MESSAGE_SENT",
  "ARTIFACT_REVISION",
  "DECISION_COMMITTED",
  "RESOURCE_OPENED",
  "DEFENSE_RESPONSE_RECEIVED",
] as const;

export const TELEMETRY_EVENT_TYPES = ["TAB_BLUR", "COPY", "PASTE", "INACTIVITY"] as const;

export const SYSTEM_EVENT_TYPES = ["AUTOSAVE_FAILED", "AI_RESPONSE_RETRIED", "RUN_RECOVERED"] as const;

export const ALL_EVENT_TYPES = [
  ...WORLD_EVENT_TYPES,
  ...CANDIDATE_EVENT_TYPES,
  ...TELEMETRY_EVENT_TYPES,
  ...SYSTEM_EVENT_TYPES,
] as const;

export type EventType = (typeof ALL_EVENT_TYPES)[number];

export const JOB_TYPES = [
  "EXTRACT_EVIDENCE_INITIAL",
  "GENERATE_DEFENSE",
  "EXTRACT_EVIDENCE_FINAL",
  "GENERATE_DECISION_BRIEF",
] as const;
export type AnalysisJobType = (typeof JOB_TYPES)[number];

export const STAGES = [
  "DISCOVERY",
  "INVESTIGATION",
  "PRELIMINARY_RECOMMENDATION",
  "AUTH_CONSTRAINT",
  "REASSESSMENT",
  "STAKEHOLDER_CONFLICT",
  "CUSTOMER_PRESSURE",
  "FINAL_SUBMITTED",
  "DEFENSE",
  "COMPLETE",
] as const;
export type ProofStage = (typeof STAGES)[number];

export const DIRECTIONS = [
  "STRENGTH",
  "CONCERN",
  "INSUFFICIENT_EVIDENCE",
] as const;
export type EvidenceDirection = (typeof DIRECTIONS)[number];

export const CONFIDENCES = ["HIGH", "MODERATE", "LOW"] as const;
export type EvidenceConfidence = (typeof CONFIDENCES)[number];

export const RECOMMENDATIONS = [
  "STRONG_INTERVIEW",
  "INTERVIEW",
  "HOLD",
  "INSUFFICIENT_EVIDENCE",
] as const;
export type BriefRecommendation = (typeof RECOMMENDATIONS)[number];

export interface ProofEventRecord {
  id: string;
  run_id: string;
  sequence: number;
  event_type: EventType;
  event_version: number;
  source: EventSource;
  actor_type: string;
  actor_id: string | null;
  stage_id: string | null;
  occurred_at: string | null;
  recorded_at: string;
  payload: Record<string, unknown>;
}

export interface ArtifactContent {
  diagnosis: string;
  recommendation: string;
  customer_message: string;
  internal_note: string;
  assumptions: string;
  limitations: string;
}

export interface EvidenceClaimDraft {
  claim: string;
  competency: string;
  direction: EvidenceDirection;
  confidence: EvidenceConfidence;
  supporting_event_ids: string[];
  counterevidence_event_ids: string[];
  rubric_version: string;
  prompt_version: string;
  model_version: string;
}

export interface DefenseQuestionDraft {
  prompt: string;
  target: string;
}

export interface DecisionBriefDraft {
  recommendation: BriefRecommendation;
  why: string;
  strengths: string[];
  concerns: string[];
  probes: string[];
}

export interface AnalysisResult {
  job_type: AnalysisJobType;
  observations?: string[];
  contradictions?: string[];
  uncertainties?: string[];
  claims?: EvidenceClaimDraft[];
  defense_questions?: DefenseQuestionDraft[];
  brief?: DecisionBriefDraft;
}

export interface RunSnapshot {
  run_id: string;
  stage: ProofStage;
  released_facts: string[];
  events: ProofEventRecord[];
  artifact: ArtifactContent | null;
  defense: Array<{ prompt: string; response: string }>;
}

export function sourceForEventType(type: EventType): EventSource {
  if ((WORLD_EVENT_TYPES as readonly string[]).includes(type)) return "WORLD";
  if ((CANDIDATE_EVENT_TYPES as readonly string[]).includes(type)) return "CANDIDATE";
  if ((TELEMETRY_EVENT_TYPES as readonly string[]).includes(type)) return "TELEMETRY";
  return "SYSTEM";
}

export function isEventType(value: string): value is EventType {
  return (ALL_EVENT_TYPES as readonly string[]).includes(value);
}
