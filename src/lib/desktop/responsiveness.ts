/**
 * Editing responsiveness budgets (DESK-08).
 *
 * Typing and navigation must not wait for network/model requests; large
 * files and logs must be bound so rendering stays smooth. This module
 * defines the budgets and the render-planning rules. Classification of a
 * latency sample against the budget is pure and unit-tested.
 *
 * Real measurement on the lowest supported laptop (not a developer
 * workstation) is NEEDS-LIVE: budgets are asserted here, hardware proof
 * comes from device testing.
 */

/** Keystroke -> paint budget on the lowest supported laptop. */
export const INPUT_LATENCY_BUDGET_MS = 50;

/** Files longer than this render windowed (virtualized), never fully. */
export const LARGE_FILE_LINE_CAP = 2000;

/** Logs longer than this render tailed (most recent N lines). */
export const LOG_LINE_CAP = 5000;

/** How many lines around the viewport a windowed file render keeps. */
export const FILE_WINDOW_LINES = 400;

export type LatencyOperation = "keydown_to_paint" | "tab_switch" | "find_next";

export interface LatencySample {
  operation: LatencyOperation;
  /** Measured milliseconds. */
  ms: number;
}

/** True when the sample is within the input-responsiveness budget. */
export function withinBudget(sample: LatencySample): boolean {
  return sample.ms <= INPUT_LATENCY_BUDGET_MS;
}

export type FileRenderPlan =
  | { mode: "full"; visibleLines: number }
  | { mode: "windowed"; visibleLines: number; windowLines: number };

/**
 * Plan how to render a file. Large files render windowed around the
 * viewport so typing never waits on full-document layout.
 */
export function planFileRender(totalLines: number): FileRenderPlan {
  if (totalLines <= LARGE_FILE_LINE_CAP) {
    return { mode: "full", visibleLines: totalLines };
  }
  return { mode: "windowed", visibleLines: totalLines, windowLines: FILE_WINDOW_LINES };
}

export type LogRenderPlan =
  | { mode: "full"; visibleLines: number }
  | { mode: "tailed"; visibleLines: number; tailLines: number };

/** Plan how to render a log/output stream. Long logs tail. */
export function planLogRender(totalLines: number): LogRenderPlan {
  if (totalLines <= LOG_LINE_CAP) {
    return { mode: "full", visibleLines: totalLines };
  }
  return { mode: "tailed", visibleLines: totalLines, tailLines: LOG_LINE_CAP };
}

/**
 * Editing must never block on network/model work. Callers use this to
 * assert the invariant: keystroke handling paths take no async dependency.
 */
export function keystrokePathIsSync(waitsOn: readonly ("network" | "model" | "disk")[]): boolean {
  return !waitsOn.includes("network") && !waitsOn.includes("model");
}
