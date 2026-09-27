/**
 * RUN-06 — Result classification.
 *
 * A run that did not produce a clean pass is classified into exactly one of:
 * candidate code error | test failure | timeout (caused by code) |
 * setup incompatibility | platform outage. When the signals do not support a
 * confident classification, the outcome is `indeterminate` — uncertainty is
 * surfaced, never guessed, and an indeterminate run never becomes a
 * candidate skill failure.
 */

export type RunClassification =
  | "code_error"
  | "test_failure"
  | "timeout"
  | "setup_incompatibility"
  | "platform_outage"
  | "indeterminate";

export interface RunSignals {
  /** Which phase the run was in when it ended. */
  phase: "setup" | "test" | "teardown" | "unknown";
  /** Process exit code, when the process exited on its own. */
  exitCode?: number;
  /** Signal that killed the process, e.g. "SIGKILL", "SIGSEGV". */
  signal?: string;
  /** True when the harness killed the run at the wall-clock limit. */
  timedOut: boolean;
  /** True when at least one authoritative test started executing. */
  testsStarted: boolean;
  /** True when the harness itself errored (not the candidate code). */
  harnessError: boolean;
  /** False when the platform reports degraded/unhealthy. */
  platformHealthy: boolean;
  /** Tail of stderr for heuristics (already redacted). */
  stderrTail?: string;
}

export interface ClassifiedRun {
  classification: RunClassification;
  /** Human-readable reason citing the signals used. */
  reason: string;
  /** True when this classification may not be held against the candidate. */
  notCandidateFault: boolean;
}

/**
 * Classify a finished run. Order matters: platform problems outrank
 * everything, then setup, then timeouts, then harness-vs-code.
 */
export function classifyRunOutcome(s: RunSignals): ClassifiedRun {
  // Platform outage: the harness errored while the platform was unhealthy.
  // (A harness error on a healthy platform is indeterminate — we do not know
  // whether the candidate triggered it.)
  if (s.harnessError && !s.platformHealthy) {
    return {
      classification: "platform_outage",
      reason: "Harness errored while the platform reported unhealthy — infrastructure failure, not a skill signal.",
      notCandidateFault: true,
    };
  }
  // Setup incompatibility: the run died before any test started.
  if (!s.testsStarted && s.phase === "setup" && (s.exitCode ?? 0) !== 0) {
    return {
      classification: "setup_incompatibility",
      reason: `Setup phase exited with code ${s.exitCode} before any test started — environment/dependency problem, not candidate code.`,
      notCandidateFault: true,
    };
  }
  // Timeout: the harness killed the run at the wall-clock limit after tests started.
  if (s.timedOut && s.testsStarted) {
    return {
      classification: "timeout",
      reason: "Run exceeded the wall-clock limit after tests started — treated as code-caused timeout (e.g. infinite loop).",
      notCandidateFault: false,
    };
  }
  if (s.timedOut && !s.testsStarted) {
    return {
      classification: "indeterminate",
      reason: "Run timed out before any test started; cannot distinguish a hung setup from a hung harness. Surfaced as indeterminate, not a candidate failure.",
      notCandidateFault: true,
    };
  }
  // Crash signals after tests started: the candidate code crashed.
  if (s.testsStarted && s.signal && ["SIGSEGV", "SIGABRT", "SIGBUS", "SIGILL"].includes(s.signal)) {
    return {
      classification: "code_error",
      reason: `Candidate process died with ${s.signal} during tests — code error (crash), distinct from an assertion failure.`,
      notCandidateFault: false,
    };
  }
  // Non-zero exit after tests started: assertion-style test failure.
  if (s.testsStarted && (s.exitCode ?? 0) !== 0) {
    return {
      classification: "test_failure",
      reason: `Tests ran and the process exited with code ${s.exitCode} — test failure.`,
      notCandidateFault: false,
    };
  }
  // Harness error on a healthy platform with no other signal: unknown cause.
  if (s.harnessError) {
    return {
      classification: "indeterminate",
      reason: "Harness errored on a healthy platform with no candidate signal — cause unknown. Not held against the candidate.",
      notCandidateFault: true,
    };
  }
  return {
    classification: "indeterminate",
    reason: "Signals do not support a confident classification — surfaced as indeterminate rather than guessed.",
    notCandidateFault: true,
  };
}
