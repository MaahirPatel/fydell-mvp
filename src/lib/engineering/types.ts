/**
 * Engineering test runs: shared types.
 *
 * A run executes the scenario's trusted tests against an exact snapshot of the
 * candidate's files inside an isolated execution provider (never on the app
 * host in production). Two kinds:
 *
 *  - practice:   candidate-initiated "Run tests". Provided tests (restored to
 *                their pinned contents) plus any test files the candidate
 *                added. Results are shown to the candidate.
 *  - evaluation: server-initiated after submission. Provided + hidden tests
 *                only; candidate-authored tests are not part of the verdict.
 *                Results feed the employer report as deterministic evidence.
 */

export type RunKind = "practice" | "evaluation";

export interface EvaluationGroup {
  id: string;
  label: string;
  dimension: "correctness" | "response_to_requirements";
  description: string;
  /** Requirement-update id that must have been presented for this group to count. */
  requiresUpdate?: string;
  /** Test id prefixes: "path::name" (parametrize suffix ignored) or "path::" for a whole file. */
  tests: string[];
}

export interface EvaluationDescriptor {
  scenarioId: string;
  scenarioVersion: string;
  suiteVersion: string;
  runtime: {
    python: string;
    packages: string[];
    timeoutSeconds: number;
    maxOutputBytes: number;
  };
  /** Candidate files outside these prefixes are not sent to the runner. */
  editablePrefixes: string[];
  /** Provided test files; always restored to their pinned contents. */
  trustedFiles: string[];
  hidden: { sourceDir: string; mountDir: string };
  /** Test id that must be reported as failed on every evaluation run. */
  canary: string;
  groups: EvaluationGroup[];
}

/** Pinned file contents loaded server-side from the scenario directory. */
export interface TrustedMaterial {
  descriptor: EvaluationDescriptor;
  trusted: Record<string, string>;
  /** Hidden tests keyed by their mount path (e.g. tests/hidden/test_x.py). */
  hidden: Record<string, string>;
}

export interface IgnoredPath {
  path: string;
  reason: "outside_editable_area" | "runner_config_not_used" | "reserved_path";
}

export interface RunWorkspace {
  kind: RunKind;
  /** Files handed to the execution provider. */
  files: Record<string, string>;
  /** Pytest argv (after `python -m`), including the result file placeholder. */
  pytestArgs: string[];
  /** Hash of the candidate's editable files exactly as submitted (DESK-12). */
  candidateSnapshotHash: string;
  candidateFileCount: number;
  /** Provided test files the candidate had changed; the pinned copy was used. */
  restoredTrusted: string[];
  ignored: IgnoredPath[];
  candidateTestFiles: string[];
}

export const RESULT_FILE_PLACEHOLDER = "{RESULT_FILE}";

export interface ProviderRequest {
  files: Record<string, string>;
  pytestArgs: string[];
  timeoutSeconds: number;
  maxOutputBytes: number;
}

export interface ProviderResult {
  provider: string;
  environmentVersion: string;
  /** Null when the process did not exit on its own (killed, never started). */
  exitCode: number | null;
  timedOut: boolean;
  output: string;
  outputTruncated: boolean;
  /** JUnit XML written by pytest through the trusted bootstrap, or null. */
  junitXml: string | null;
  /** Set when the provider itself failed (not the candidate code). */
  infrastructureError: string | null;
}

export interface ExecutionProvider {
  readonly id: string;
  run(request: ProviderRequest): Promise<ProviderResult>;
}

export type TestOutcome = "passed" | "failed" | "error" | "skipped";
export type TestOrigin = "provided" | "hidden" | "candidate";

export interface TestCaseResult {
  /** path::name[param] */
  id: string;
  /** path::name (no parametrize suffix) */
  baseId: string;
  file: string;
  outcome: TestOutcome;
  origin: TestOrigin;
  /** First line of the failure message, bounded. Never shown for hidden tests to candidates. */
  message?: string;
}

export interface GroupResult {
  id: string;
  label: string;
  dimension: EvaluationGroup["dimension"];
  status: "pass" | "fail" | "not_run" | "not_applicable";
  passed: number;
  total: number;
  note?: string;
}

export type RunStatus =
  /** Tests ran and produced trustworthy results (passes and failures alike). */
  | "completed"
  /** Results cannot be trusted or interpreted; routed to human review, never scored. */
  | "indeterminate"
  /** The platform failed; never counted against the candidate. */
  | "infrastructure_error"
  /** No isolated provider is configured in this environment. */
  | "not_configured";

export interface RunIntegrity {
  canary: "failed_as_expected" | "passed_unexpectedly" | "missing" | "not_applicable";
  /** Group test prefixes that matched no reported test. */
  missingExpected: string[];
}

export interface EngineeringRunResult {
  kind: RunKind;
  status: RunStatus;
  /** Plain-language reason for any non-"completed" status. */
  statusReason: string | null;
  classification: string | null;
  candidateSnapshotHash: string;
  scenarioId: string;
  scenarioVersion: string;
  suiteVersion: string;
  environmentVersion: string;
  provider: string;
  tests: TestCaseResult[];
  groups: GroupResult[];
  integrity: RunIntegrity;
  restoredTrusted: string[];
  ignored: IgnoredPath[];
  output: string;
  outputTruncated: boolean;
  summary: { passed: number; failed: number; errors: number; skipped: number };
}
