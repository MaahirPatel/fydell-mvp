import type { RoleKey } from "@/lib/simulations/types";

export type LedgerSource = "WORLD" | "CANDIDATE" | "TELEMETRY" | "SYSTEM";

export type GoldenPathEventType =
  | "INVITE_ACCEPTED"
  | "SIMULATION_STARTED"
  | "PRELIMINARY_RECOMMENDATION_SUBMITTED"
  | "FACT_RELEASED"
  | "ARTIFACT_REVISION"
  | "SIMULATION_COMPLETED"
  | "ANALYSIS_JOB_ENQUEUED"
  | "CLAIM_GENERATED"
  | "DEFENSE_QUESTION_GENERATED"
  | "DEFENSE_RESPONSE_SUBMITTED"
  | "CLAIM_APPROVED"
  | "CLAIM_REJECTED"
  | "BRIEF_PUBLISHED";

export interface GoldenPathEvent {
  id: string;
  runId: string;
  sequence: number;
  eventType: GoldenPathEventType;
  eventVersion: 1;
  actorType: "CANDIDATE" | "SYSTEM" | "REVIEWER";
  actorId?: string;
  stageId: "INVITE" | "SIMULATION" | "ANALYSIS" | "REVIEW" | "BRIEF";
  occurredAt: string;
  recordedAt: string;
  source: LedgerSource;
  payload: Record<string, string | number | boolean | null | string[]>;
}

export interface ChangedFact {
  factId: "AUTH_001";
  fact: "selected_endpoint_incompatible_with_customer_auth";
  invalidates: ["recommendation.endpoint_choice"];
  materiality: "critical";
}

export interface ArtifactRevision {
  id: string;
  artifactId: string;
  revision: number;
  content: string;
  createdAt: string;
  beforeFact: boolean;
  sourceEventId: string;
}

export type AnalysisJobType =
  | "EXTRACT_EVIDENCE_INITIAL"
  | "GENERATE_DEFENSE"
  | "EXTRACT_EVIDENCE_FINAL"
  | "GENERATE_DECISION_BRIEF";

export interface AnalysisJob {
  id: string;
  runId: string;
  jobType: AnalysisJobType;
  inputVersion: "1";
  status: "PENDING" | "RUNNING" | "COMPLETE" | "FAILED";
  attempts: number;
  lockedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
  resultVersion: "1" | null;
  idempotencyKey: string;
}

export type ClaimConfidence = "HIGH" | "MODERATE" | "LOW";
export type ClaimReviewStatus =
  | "GENERATED"
  | "REVIEW_REQUIRED"
  | "REVIEWED"
  | "APPROVED"
  | "PUBLISHED";

export interface EvidenceClaim {
  id: string;
  competency: "ADAPTATION";
  direction: "STRENGTH" | "CONCERN" | "INSUFFICIENT_EVIDENCE";
  confidence: ClaimConfidence;
  statement: string;
  supportingEventIds: string[];
  counterEventIds: string[];
  sourceArtifactIds: string[];
  modelVersion: string;
  rubricVersion: string;
  promptVersion: string;
  reviewStatus: ClaimReviewStatus;
  reviewerNote: string | null;
}

export interface DecisionBrief {
  id: string;
  runId: string;
  candidateLabel: string;
  roleKey: RoleKey;
  recommendation: "WORTH_INTERVIEWING" | "MORE_EVIDENCE_NEEDED";
  why: string;
  claimIds: string[];
  interviewProbes: string[];
  publishedAt: string;
}

export interface DefenseQuestion {
  id: string;
  prompt: string;
  target: "ADAPTATION";
  sourceClaimId: string;
  response: string | null;
}

export interface WorkerRunSnapshot {
  runId: string;
  analysisPass: "A" | "B";
  scenarioVersion: string;
  engineVersion: string;
  rubricVersion: string;
  promptVersion: string;
  changedFact: ChangedFact;
  events: GoldenPathEvent[];
  artifacts: ArtifactRevision[];
  initialClaim: EvidenceClaim | null;
  defenseQuestions: DefenseQuestion[];
}

export interface EvidenceWorkerResult {
  resultVersion: "1";
  runId: string;
  analysisPass: "A" | "B";
  claim: Omit<EvidenceClaim, "id" | "reviewStatus" | "reviewerNote">;
  defenseQuestions: string[];
}

export interface GoldenPathRun {
  id: string;
  candidateLabel: string;
  roleKey: "solutions_engineer";
  scenarioVersion: "northstar-pilot-1.0.0";
  engineVersion: "golden-path-0.1.0";
  rubricVersion: "se-adaptation-1.0.0";
  promptVersion: "evidence-initial-1.0.0";
  status:
    | "INVITED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "DEFENSE_REQUIRED"
    | "DEFENSE_COMPLETED"
    | "REVIEW_REQUIRED"
    | "PUBLISHED";
  changedFact: ChangedFact;
  events: GoldenPathEvent[];
  artifacts: ArtifactRevision[];
  analysisJob: AnalysisJob | null;
  initialClaim: EvidenceClaim | null;
  defenseQuestions: DefenseQuestion[];
  claim: EvidenceClaim | null;
  brief: DecisionBrief | null;
}
