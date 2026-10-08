// Employer-authored work samples: the shapes the eng_authored_* Rust commands
// return (mirroring src/lib/eng/authored/types.ts and collaboration-types.ts
// on the platform) and pure presentation logic. No runtime imports, so
// lib/eng-authored.test.ts runs under node:test.

export type AuthoredAttemptStatus = "accepted" | "preflight_passed" | "in_progress" | "submitted" | "withdrawn" | "expired";

export type TestOutcome = "passed" | "failed" | "error" | "skipped" | "missing";

export interface AuthoredTask {
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
    runtime: "python" | "node" | string;
    language: string;
    setupCommands: string[];
    testCommand: string;
    publicTestCommand: string;
    setupMinutes: number;
    taskMinutes: number;
  };
  setupInstructions: string[];
  publicTests: { name: string; file: string; criterionIds: string[] }[];
  coworkers: { name: string; title: string; responsibilities: string }[];
  aiPolicy: string;
  submission: { requirements: string[]; handoffPrompts: { id: string; label: string; help: string }[] };
  accommodations: string[];
  interruptionPolicy: string;
  feedbackPolicy: string;
  howReviewed: { label: string; explanation: string; judgedBy: "tests" | "reviewer" | string }[];
}

export interface PublicRun {
  id: string;
  purpose: "environment_check" | "workspace";
  status: "running" | "ran" | "timeout" | "infrastructure_error" | "runner_unavailable";
  filesSha256: string;
  runnerLabel: string | null;
  isolated: boolean | null;
  command: string | null;
  exitCode: number | null;
  durationMs: number | null;
  tests: { name: string; outcome: TestOutcome }[];
  output: string;
  detail: string | null;
  createdAt: string;
}

export type AuthoredEvaluation = "not_submitted" | "pending" | "delayed" | "awaiting_release" | "released";

export interface AuthoredView {
  kind: "authored";
  serverNow: string;
  attempt: {
    id: string;
    status: AuthoredAttemptStatus | string;
    consentedAt: string | null;
    preflightPassedAt: string | null;
    preflightRuntime: string | null;
    startedAt: string | null;
    dueAt: string | null;
    allowedMinutes: number;
    extensionMinutes: number;
    submittedAt: string | null;
    window: "open" | "late" | "closed" | string;
  };
  role: { title: string; organizationName: string; companyContext: string };
  task: AuthoredTask;
  publicRuns: { used: number; limit: number; minGapSeconds: number; latest: PublicRun | null };
  receipt: { submissionId: string; archiveSha256: string; archiveBytes: number; submittedAt: string; late: boolean } | null;
  evaluation: AuthoredEvaluation | string;
}

export interface TeamMessage {
  id: string;
  seq: number;
  sender: "candidate" | "teammate";
  teammateId: string | null;
  toTeammateId: string | null;
  body: string;
  createdAt: string;
  kind: "message" | "scenario_event";
  eventKey: string | null;
  answeredFrom: "model" | "scenario_notes" | null;
}

export interface Collaboration {
  teammates: { id: string; name: string; title: string; responsibilities: string; topics: string[] }[];
  messages: TeamMessage[];
  eventDisclosure: string;
  open: boolean;
}

export interface AuthoredReceipt {
  submissionId: string;
  archiveSha256: string;
  archiveBytes: number;
  submittedAt: string;
  late: boolean;
  alreadySubmitted: boolean;
}

export interface AuthoredReport {
  version: number;
  releasedAt: string | null;
  summary: string;
  reviewerNote: string | null;
  acceptance: {
    id: string;
    text: string;
    state: "confirmed" | "not_confirmed" | "no_result";
    publicTests: { name: string; outcome: TestOutcome }[];
    evaluationChecks: { passed: number; total: number };
  }[];
  criteria: { id: string; label: string; state: string; stateLabel: string; explanation: string; rationale: string; limitations: string }[];
  notAssessed: string[];
  limitations: string[];
  runner: { label: string; isolated: boolean };
}

export type AuthoredStage = "consent" | "setup" | "ready" | "working" | "submitted" | "withdrawn" | "expired";

export function authoredStage(view: Pick<AuthoredView, "attempt">): AuthoredStage {
  const { status, consentedAt } = view.attempt;
  switch (status) {
    case "withdrawn":
    case "expired":
    case "submitted":
      return status;
    case "in_progress":
      return "working";
    case "preflight_passed":
      return "ready";
    default:
      return consentedAt ? "setup" : "consent";
  }
}

export function runTally(run: Pick<PublicRun, "tests">): { passed: number; total: number } {
  return { passed: run.tests.filter((t) => t.outcome === "passed").length, total: run.tests.length };
}

/** One line describing a public test run, never claiming more than the runner reported. */
export function runHeadline(run: Pick<PublicRun, "status" | "tests" | "detail">): string {
  switch (run.status) {
    case "running":
      return "Running on the test runner…";
    case "timeout":
      return "The tests did not finish within the time limit.";
    case "runner_unavailable":
      return "The test runner is unavailable right now. This is a platform problem, not a result about your code.";
    case "infrastructure_error":
      return "The test runner could not start. This is a platform problem, not a result about your code.";
    default: {
      const { passed, total } = runTally(run);
      if (total === 0) return "The runner finished but reported no tests.";
      return `${passed} of ${total} public tests passed`;
    }
  }
}

/** The environment check is a platform result, so a runner outage lets the candidate continue. */
export function environmentCheckState(latest: PublicRun | null): "none" | "ran" | "unavailable" | "failed" {
  if (!latest || latest.purpose !== "environment_check") return "none";
  if (latest.status === "ran") return "ran";
  if (latest.status === "runner_unavailable" || latest.status === "infrastructure_error") return "unavailable";
  return "failed";
}

export function evaluationNote(status: string): string {
  switch (status) {
    case "pending":
      return "Your submission is being evaluated.";
    case "delayed":
      return "Evaluation is delayed by a platform problem. It retries automatically and is never counted against you.";
    case "awaiting_release":
      return "Evaluation finished. The hiring team is reviewing your work before releasing a report.";
    case "released":
      return "The hiring team released your report.";
    default:
      return "Not submitted yet.";
  }
}

export function outcomeLabel(outcome: TestOutcome | string): string {
  switch (outcome) {
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "error":
      return "Error";
    case "skipped":
      return "Skipped";
    case "missing":
      return "Did not run";
    default:
      return outcome;
  }
}

/** Submit needs at least one handoff answer when the task asks for any. */
export function authoredHandoffBlockers(prompts: { id: string; label: string }[], answers: Record<string, string>, aiUse: string): string[] {
  const out: string[] = [];
  if (prompts.length > 0 && !prompts.some((p) => (answers[p.id] ?? "").trim())) out.push("Answer at least one handoff question.");
  for (const p of prompts) if ((answers[p.id] ?? "").length > 8000) out.push(`Keep “${p.label}” under 8,000 characters.`);
  if (aiUse.length > 4000) out.push("Keep the AI assistance note under 4,000 characters.");
  return out;
}

export function newClientMsgId(random: () => number = Math.random): string {
  let s = "d";
  while (s.length < 24) s += Math.floor(random() * 36).toString(36);
  return s;
}
