import type { AssessmentState, RubricLevel } from "./scenarios/types";

export type RoleStatus = "draft" | "published" | "archived";
export type InvitationStatus = "invited" | "accepted" | "withdrawn" | "expired";
export type AttemptStatus = "accepted" | "preflight_passed" | "in_progress" | "submitted" | "withdrawn" | "expired";
export type UploadStatus = "initiated" | "validating" | "accepted" | "rejected" | "failed";
export type RunStatus = "queued" | "running" | "human_review" | "ready" | "retryable_failure" | "blocked" | "canceled";
export type ReportStatus = "draft" | "released" | "superseded";
export type Decision = "advance" | "hold" | "decline";

export interface ScenarioVersionRow {
  id: string;
  scenario_key: string;
  version: number;
  title: string;
  role_family: "backend_engineer";
  content: Record<string, unknown>;
  starter_sha256: string;
  harness_sha256: string;
  suite_version: string;
  rubric_version: string;
  status: "published" | "retired";
  published_at: string;
  /** Added in 061. Rows written before it read back as fydell_reviewed. */
  origin?: "fydell_reviewed" | "employer_authored";
  organization_id?: string | null;
  purpose?: "hiring" | "preview";
  family?: string | null;
  archived_at?: string | null;
}

export interface RoleRow {
  id: string;
  organization_id: string;
  title: string;
  role_family: "backend_engineer";
  stack: string[];
  responsibilities: string;
  evaluation_focus: string[];
  company_context: string;
  scenario_version_id: string;
  status: RoleStatus;
  created_by: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface InvitationRow {
  id: string;
  organization_id: string;
  role_id: string;
  scenario_version_id: string;
  candidate_email: string;
  candidate_name: string | null;
  /** Set when invited by @handle; employer views show this instead of the email. */
  candidate_handle: string | null;
  status: InvitationStatus;
  email_delivery: "sent" | "failed" | "not_configured";
  role_snapshot: RoleSnapshot;
  allowed_minutes: number;
  expires_at: string;
  invited_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  withdrawn_at: string | null;
  resend_count: number;
  created_at: string;
  /** Added in 061: an employer's own preview, excluded from counts and hiring outcomes. */
  is_preview?: boolean;
}

export interface RoleSnapshot {
  title: string;
  companyContext: string;
  organizationName: string;
  scenarioKey: string;
  scenarioVersion: number;
}

export interface AttemptRow {
  id: string;
  invitation_id: string;
  organization_id: string;
  role_id: string;
  scenario_version_id: string;
  candidate_user_id: string;
  status: AttemptStatus;
  allowed_minutes: number;
  extension_minutes: number;
  consented_at: string | null;
  preflight_passed_at: string | null;
  preflight_runtime: string | null;
  started_at: string | null;
  due_at: string | null;
  update_released_at: string | null;
  update_acknowledged_at: string | null;
  submitted_at: string | null;
  created_at: string;
  is_preview?: boolean;
}

export interface MessageRow {
  id: string;
  attempt_id: string;
  seq: number;
  sender: "candidate" | "teammate";
  teammate_id: string | null;
  body: string;
  client_msg_id: string | null;
  reply_to: string | null;
  rule_id: string | null;
  created_at: string;
}

export interface UploadRow {
  id: string;
  attempt_id: string;
  status: UploadStatus;
  storage_path: string;
  original_filename: string | null;
  byte_size: number | null;
  sha256: string | null;
  entry_count: number | null;
  uncompressed_bytes: number | null;
  file_list: { path: string; size: number }[];
  rejection_code: string | null;
  rejection_detail: string | null;
  created_at: string;
  validated_at: string | null;
}

export interface SubmissionRow {
  id: string;
  attempt_id: string;
  upload_id: string;
  archive_sha256: string;
  archive_bytes: number;
  handoff: Handoff;
  ai_disclosure: string;
  late: boolean;
  submitted_at: string;
}

export interface Handoff {
  what_changed: string;
  testing: string;
  risks: string;
  next_steps: string;
}

/** Employer-authored work samples also store the answers to the package's own handoff prompts, in order. */
export interface AuthoredHandoff extends Handoff {
  authored: { id: string; label: string; answer: string }[];
}

export interface ProbeResult {
  id: string;
  title: string;
  visibility: "public" | "hidden";
  phase: "original" | "update";
  outcome: "passed" | "failed" | "candidate_error" | "timeout" | "output_limit" | "no_result";
  failedChecks: { path: string; expected: unknown; actual: unknown }[];
  detail: string | null;
  where?: string | null;
}

export interface RunRow {
  id: string;
  submission_id: string;
  attempt_id: string;
  run_key: string;
  status: RunStatus;
  attempt_count: number;
  max_attempts: number;
  lease_owner: string | null;
  lease_expires_at: string | null;
  next_retry_at: string | null;
  last_error_code: string | null;
  last_error_detail: string | null;
  executor: string | null;
  environment_version: string | null;
  suite_version: string;
  harness_sha256: string;
  scenario_version_id: string;
  results: ProbeResult[] | null;
  summary: Record<string, number> | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export type CitationKind = "file" | "test" | "message" | "handoff";

export interface Citation {
  kind: CitationKind;
  /** file path, probe id, message id, or handoff field */
  ref: string;
  lineStart?: number;
  lineEnd?: number;
}

export type FindingCategory = "coding_result" | "interpretation" | "communication";

export interface Finding {
  id: string;
  dimension: "correctness" | "engineering_judgment" | "requirement_response" | "work_communication";
  category: FindingCategory;
  kind: "strength" | "gap" | "observation";
  basis: "observed" | "hypothesis";
  statement: string;
  citations: Citation[];
}

export interface ReportBrief {
  summary: string;
  strengths: string[];
  gaps: string[];
  limitations: string[];
  followUps: string[];
  dimensions: {
    key: Finding["dimension"];
    level: RubricLevel;
    rationale: string;
  }[];
  /** Rubric v2 and later: one entry per task criterion. */
  criteria?: CriterionAssessment[];
  /** Employer-authored work samples: per-criterion results derived from executed tests. */
  authored?: AuthoredReportBody;
}

export interface AuthoredReportBody {
  evaluationRunId: string;
  runner: { name: string; label: string; isolated: boolean; version: string };
  acceptance: { id: string; text: string; state: "confirmed" | "not_confirmed" | "no_result"; passed: number; failed: number; missing: number }[];
  criteria: {
    id: string;
    label: string;
    capability: string;
    judgedBy: "tests" | "reviewer";
    state: "demonstrated" | "partially_demonstrated" | "concern_observed" | "not_assessed" | "insufficient_evidence";
    rationale: string;
    acceptanceCriterionIds: string[];
    evidence: { confirmed: number; notConfirmed: number; noResult: number };
  }[];
  reviewerNote: string | null;
}

/**
 * A reviewer's call on one criterion. `observed` is recomputed by the server
 * from the evaluation run when the draft is saved; it is never taken from the
 * browser.
 */
export interface CriterionAssessment {
  id: string;
  dimension: Finding["dimension"];
  label: string;
  state: AssessmentState;
  rationale: string;
  observed: { passed: number; total: number; notRun: number } | null;
  notCovered: string;
}

export interface ReportRow {
  id: string;
  attempt_id: string;
  evaluation_run_id: string;
  version: number;
  status: ReportStatus;
  brief: ReportBrief;
  findings: Finding[];
  rubric_version: string;
  reviewer_email: string;
  change_reason: string | null;
  supersedes_id: string | null;
  review_minutes: number | null;
  created_at: string;
  released_at: string | null;
}
