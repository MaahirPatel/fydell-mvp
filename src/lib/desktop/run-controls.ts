/**
 * Run controls: snapshot-bound execution (DESK-12, DESK-13).
 *
 * DESK-12 - Run actual code against a known revision:
 *  - Running tests synchronizes a snapshot; the snapshot hash is attached
 *    to results.
 *  - Editing after a run marks results stale: "Results from an earlier version".
 *  - A working/defective code change produces the expected result change
 *    because the hash binds results to exact file contents.
 *
 * DESK-13 - Bound run controls:
 *  - Approved commands only; queued/running/completed/canceled/failed
 *    states; stop/retry; bounded output; resource caps.
 *  - If only tests run, the panel is labeled "Test output" - never a fake
 *    terminal.
 */

import { createHash } from "node:crypto";

/** Canonical snapshot hash: sorted paths, sha256 over path+content pairs. */
export function snapshotFiles(files: Record<string, string>): { hash: string; fileCount: number } {
  const paths = Object.keys(files).sort();
  const h = createHash("sha256");
  for (const p of paths) {
    h.update(p);
    h.update("\0");
    h.update(files[p]);
    h.update("\0");
  }
  return { hash: h.digest("hex"), fileCount: paths.length };
}

export interface RunRecord {
  runId: string;
  /** Snapshot hash the run executed against (DESK-12). */
  snapshotHash: string;
  command: string;
  status: RunStatus;
  outputLines: string[];
  truncated: boolean;
  startedAt: string;
  finishedAt: string | null;
}

export type RunStatus = "queued" | "running" | "completed" | "canceled" | "failed";

export type RunEvent = "start" | "complete" | "fail" | "cancel" | "retry";

export type RunTransition =
  | { ok: true; status: RunStatus }
  | { ok: false; error: string };

const TRANSITIONS: Record<RunStatus, Partial<Record<RunEvent, RunStatus>>> = {
  queued: { start: "running", cancel: "canceled" },
  running: { complete: "completed", fail: "failed", cancel: "canceled" },
  completed: { retry: "queued" },
  canceled: { retry: "queued" },
  failed: { retry: "queued" },
};

/** State machine for a run's lifecycle. Invalid transitions fail closed. */
export function transitionRun(status: RunStatus, event: RunEvent): RunTransition {
  const next = TRANSITIONS[status]?.[event];
  if (!next) return { ok: false, error: `Cannot ${event} a ${status} run` };
  return { ok: true, status: next };
}

/**
 * DESK-12 staleness: results are bound to the snapshot they ran against.
 * When current files hash differently, the UI must show
 * "Results from an earlier version" rather than presenting stale results
 * as current.
 */
export function isStaleResult(runSnapshotHash: string, currentFiles: Record<string, string>): boolean {
  return snapshotFiles(currentFiles).hash !== runSnapshotHash;
}

export const STALE_RESULT_LABEL = "Results from an earlier version";

/** Approved commands. Anything else is rejected before execution. */
export const APPROVED_COMMANDS = ["run_tests", "run_lint", "run_typecheck"] as const;
export type ApprovedCommand = (typeof APPROVED_COMMANDS)[number];

export function isCommandApproved(command: string): command is ApprovedCommand {
  return (APPROVED_COMMANDS as readonly string[]).includes(command);
}

/** Resource caps for a run (DESK-13). */
export const RUN_CAPS = {
  /** Maximum wall-clock time per run. */
  timeoutMs: 5 * 60 * 1000,
  /** Maximum output lines retained per run. */
  maxOutputLines: 2000,
  /** Maximum concurrent runs per attempt. */
  maxConcurrentRuns: 1,
} as const;

/** Bound output: keep the tail, report truncation honestly. */
export function boundOutput(
  lines: string[],
  cap: number = RUN_CAPS.maxOutputLines
): { lines: string[]; truncated: boolean; total: number } {
  if (lines.length <= cap) return { lines, truncated: false, total: lines.length };
  return { lines: lines.slice(lines.length - cap), truncated: true, total: lines.length };
}

export type RunPanelKind = "tests" | "checks";

/**
 * Panel labeling (DESK-13): when only tests/checks run, the panel says
 * "Test output" / "Run output". It is never labeled "Terminal" - there is
 * no fake terminal.
 */
export function runPanelLabel(kind: RunPanelKind): "Test output" | "Run output" {
  return kind === "tests" ? "Test output" : "Run output";
}
