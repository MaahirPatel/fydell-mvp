/**
 * Shapes shared by the server and the candidate/employer views of an
 * employer-authored work sample. Nothing here is server-only, so it must
 * never name protected material: protected test names appear only in
 * `EmployerAuthoredEvaluation`, which is built and rendered for employers.
 */

import type { CandidateResponse } from "../candidate-report";
import type { LifecycleView } from "../state";

export type AuthoredFile = { path: string; content: string };

export type AuthoredState = "demonstrated" | "partially_demonstrated" | "concern_observed" | "not_assessed" | "insufficient_evidence";

export const AUTHORED_STATE_LABEL: Record<AuthoredState, string> = {
  demonstrated: "Demonstrated",
  partially_demonstrated: "Partially demonstrated",
  concern_observed: "Concern observed",
  not_assessed: "Not assessed",
  insufficient_evidence: "Insufficient evidence",
};

export type TestOutcomeView = "passed" | "failed" | "error" | "skipped" | "missing";

export type RunnerView = { name: string; label: string; isolated: boolean; version: string };

/** Everything a candidate may read. Built from an allowlist in candidate-payload.ts. */
export interface CandidateTask {
  title: string;
  summary: string;
  context: string;
  task: string;
  outcomes: string[];
  constraints: string[];
  outOfScope: string[];
  optionalExtensions: string[];
  interface: string;
  acceptanceCriteria: { id: string; text: string }[];
  environment: {
    label: string;
    runtime: "python" | "node";
    language: string;
    setupCommands: string[];
    testCommand: string;
    publicTestCommand: string;
    setupMinutes: number;
    taskMinutes: number;
  };
  setupInstructions: string[];
  starterFiles: AuthoredFile[];
  publicTests: { name: string; file: string; criterionIds: string[] }[];
  coworkers: { name: string; title: string; responsibilities: string }[];
  aiPolicy: string;
  submission: { requirements: string[]; handoffPrompts: { id: string; label: string; help: string }[] };
  accommodations: string[];
  interruptionPolicy: string;
  feedbackPolicy: string;
  howReviewed: { label: string; explanation: string; judgedBy: "tests" | "reviewer" }[];
}

export interface PublicRunView {
  id: string;
  purpose: "environment_check" | "workspace";
  status: "running" | "ran" | "timeout" | "infrastructure_error" | "runner_unavailable";
  /** Fingerprint of the exact files this run executed, comparable with `workspace.filesSha256`. */
  filesSha256: string;
  runnerLabel: string | null;
  isolated: boolean | null;
  command: string | null;
  exitCode: number | null;
  durationMs: number | null;
  tests: { name: string; outcome: TestOutcomeView }[];
  output: string;
  detail: string | null;
  createdAt: string;
}

export type AuthoredEvaluationStatus = "not_submitted" | "pending" | "delayed" | "awaiting_release" | "released";

export interface AuthoredCandidateView {
  kind: "authored";
  serverNow: string;
  preview: boolean;
  attempt: {
    id: string;
    status: "accepted" | "preflight_passed" | "in_progress" | "submitted" | "withdrawn" | "expired";
    consentedAt: string | null;
    preflightPassedAt: string | null;
    preflightRuntime: string | null;
    startedAt: string | null;
    dueAt: string | null;
    allowedMinutes: number;
    extensionMinutes: number;
    submittedAt: string | null;
    window: "open" | "late" | "closed";
  };
  role: { title: string; organizationName: string; companyContext: string };
  task: CandidateTask;
  workspace: { files: AuthoredFile[]; revision: number; filesSha256: string } | null;
  publicRuns: { used: number; limit: number; minGapSeconds: number; latest: PublicRunView | null };
  receipt: {
    submissionId: string;
    archiveSha256: string;
    archiveBytes: number;
    submittedAt: string;
    late: boolean;
    /** Null for submissions recorded before manifests existed. */
    clientSubmissionId: string | null;
    manifestSha256: string | null;
    scenarioVersion: number | null;
    files: { path: string; bytes: number; sha256: string }[];
    proves: string[];
    doesNotProve: string[];
  } | null;
  evaluation: AuthoredEvaluationStatus;
  /** Server-derived session state; the website and the desktop app both render this. */
  lifecycle: LifecycleView;
}

/** One acceptance criterion as the candidate sees it after release. Protected test names are never included. */
export interface CandidateAcceptanceResult {
  id: string;
  text: string;
  state: "confirmed" | "not_confirmed" | "no_result";
  publicTests: { name: string; outcome: TestOutcomeView }[];
  evaluationChecks: { passed: number; total: number };
}

export interface AuthoredCandidateReport {
  version: number;
  releasedAt: string | null;
  summary: string;
  reviewerNote: string | null;
  acceptance: CandidateAcceptanceResult[];
  criteria: { id: string; label: string; state: AuthoredState; stateLabel: string; explanation: string; rationale: string; limitations: string }[];
  notAssessed: string[];
  limitations: string[];
  runner: { label: string; isolated: boolean };
  responses: CandidateResponse[];
}

export interface EmployerAuthoredEvaluation {
  runId: string;
  runner: RunnerView;
  suite: { outcome: "ran" | "timeout"; command: string; exitCode: number | null; durationMs: number };
  tests: { name: string; file: string; visibility: "public" | "protected"; outcome: TestOutcomeView; criterionIds: string[] }[];
  acceptance: { id: string; text: string; state: CandidateAcceptanceResult["state"]; passed: number; failed: number; missing: number }[];
  criteria: AuthoredCriterionResult[];
  limitations: string[];
  output: string;
  createdAt: string;
}

export interface AuthoredCriterionResult {
  id: string;
  label: string;
  capability: string;
  judgedBy: "tests" | "reviewer";
  state: AuthoredState;
  rationale: string;
  acceptanceCriterionIds: string[];
  evidence: { confirmed: number; notConfirmed: number; noResult: number };
}
