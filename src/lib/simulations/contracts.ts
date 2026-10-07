/**
 * Shared contracts for the simulation and evaluation pipeline.
 *
 * Versioned, typed contracts using the project's existing conventions.
 * These define the shape of data as it flows from scenario → assignment →
 * work events → submission → evidence → findings → report.
 *
 * Version: v1
 * Do not use model-generated narrative as the primary schema - these types
 * are the source of truth.
 */

// ---------------------------------------------------------------------------
// ScenarioDefinition
// ---------------------------------------------------------------------------

export interface ScenarioDefinition {
  /** Stable scenario ID (e.g., "webhook-retry"). */
  scenarioId: string;
  /** Scenario version (semver). */
  version: string;
  /** Role family (backend, frontend, fullstack, applied-ai, etc.). */
  roleFamily: string;
  /** Supported seniority range. */
  seniority: { min: string; max: string };
  /** Competencies this scenario measures. */
  competencies: string[];
  /** Candidate-facing brief. */
  brief: string;
  /** Starter repository version/commit. */
  starterRepo: { version: string; checksum: string };
  /** Environment and dependencies. */
  environment: {
    runtime: string;
    dependencies: string[];
    networkAccess: boolean;
  };
  /** Test definitions. */
  visibleChecks: string[];
  /** Evaluator checks and their trust limitations. */
  evaluatorChecks: Array<{
    id: string;
    description: string;
    trustLimitation: string;
  }>;
  /** Allowed tools and assistance policy version. */
  assistancePolicyVersion: string;
  /** Authored facts coworkers may reveal. */
  authoredFacts: string[];
  /** Coworker definitions. */
  coworkers: Array<{
    id: string;
    role: string;
    knows: string[];
    withholds: string[];
  }>;
  /** Rubric criteria. */
  rubric: Array<{
    criterionId: string;
    label: string;
    weight: number;
    expectedEvidence: string[];
  }>;
  /** Known limitations of this scenario. */
  limitations: string[];
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

export type AssignmentStatus =
  | "invited"
  | "active"
  | "submitted"
  | "expired"
  | "revoked";

export interface Assignment {
  id: string;
  organizationId: string;
  roleId: string;
  candidateId: string;
  scenarioId: string;
  scenarioVersion: string;
  /** Frozen evaluation config at assignment time. */
  evaluationConfig: {
    rubricVersion: string;
    assistancePolicyVersion: string;
    timeLimitMinutes: number;
  };
  status: AssignmentStatus;
  invitationToken: string;
  /** Accommodation settings (extended time, etc.). */
  accommodations: Record<string, unknown>;
  startedAt: string | null;
  submittedAt: string | null;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// WorkEvent
// ---------------------------------------------------------------------------

export type WorkEventType =
  | "message_sent"
  | "message_received"
  | "message_no_reply"
  | "test_run"
  | "file_saved"
  | "task_completed"
  | "resource_opened"
  | "submission_created";

export interface WorkEvent {
  /** Stable event ID (deduplication key). */
  eventId: string;
  sessionId: string;
  /** Ordered sequence number. */
  sequence: number;
  eventType: WorkEventType;
  /** Client event time (when it happened). */
  clientTime: string;
  /** Server receipt time (when we recorded it). */
  serverTime: string;
  /** Who triggered it. */
  actor: "candidate" | "coworker" | "system";
  /** Trust classification. */
  trust: "candidate_reported" | "locally_observed" | "system_recorded";
  /** Related artifact IDs. */
  artifactIds: string[];
  /** Structured payload. */
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

export interface Submission {
  /** Immutable submission ID. */
  submissionId: string;
  assignmentId: string;
  scenarioId: string;
  scenarioVersion: string;
  /** Exact artifact manifest with hashes. */
  artifacts: Array<{
    path: string;
    hash: string;
    sizeBytes: number;
  }>;
  /** Candidate's explanation. */
  explanation: string;
  /** Handoff notes. */
  handoff: string;
  /** Available execution results (candidate-reported). */
  executionResults: Array<{
    testId: string;
    passed: boolean;
    output: string;
    reportedBy: "candidate" | "runner";
  }>;
  /** Declared tool use. */
  toolUse: string[];
  submittedAt: string;
  /** Content hash of the full submission. */
  contentHash: string;
}

// ---------------------------------------------------------------------------
// EvidenceItem
// ---------------------------------------------------------------------------

export type EvidenceType =
  | "code_diff"
  | "test_result"
  | "chat_message"
  | "work_event"
  | "candidate_statement"
  | "file_snapshot";

export interface EvidenceItem {
  /** Stable ID. */
  id: string;
  type: EvidenceType;
  /** Source artifact and version. */
  source: { artifactId: string; version: string };
  /** File location, test case, message, or event reference. */
  reference: string;
  /** What was observed. */
  observation: string;
  /** How it was collected. */
  collectionMethod: string;
  /** Integrity status. */
  integrity: "verified" | "candidate_reported" | "unverified";
  /** Limitations of this evidence. */
  limitations: string;
}

// ---------------------------------------------------------------------------
// CriterionFinding
// ---------------------------------------------------------------------------

export type FindingRating =
  | "not_observed"
  | "below_requirement"
  | "partially_demonstrated"
  | "demonstrated"
  | "exceeds_requirement";

export interface CriterionFinding {
  criterionId: string;
  rating: FindingRating;
  /** Evidence IDs supporting this finding. */
  supportingEvidence: string[];
  /** Evidence IDs contradicting it. */
  contradictoryEvidence: string[];
  /** Explanation with citations. */
  explanation: string;
  /** What evidence is missing. */
  missingEvidence: string[];
  /** Assistance that affects interpretation. */
  relevantAssistance: string[];
  /** Evaluator version and method. */
  evaluator: { version: string; method: string };
  /** Human reviewer status. */
  reviewStatus: "pending" | "confirmed" | "disputed";
  reviewedBy?: string;
  reviewNote?: string;
}

// ---------------------------------------------------------------------------
// EvaluationRun
// ---------------------------------------------------------------------------

export interface EvaluationRun {
  runId: string;
  submissionId: string;
  /** Engine and rubric versions. */
  engineVersion: string;
  rubricVersion: string;
  /** Per-engine status. */
  engines: Array<{
    engineId: string;
    status: "pending" | "running" | "complete" | "failed";
    error?: string;
  }>;
  findings: CriterionFinding[];
  /** Model version where used. */
  modelVersion?: string;
  startedAt: string;
  completedAt: string | null;
}
