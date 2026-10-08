import { WORKER_SOURCE, parseWorkerMessage } from "./harness";
import type { HarnessPayload, RunOutcome } from "./types";

export const RUN_TIMEOUT_MS = 3000;
export const RUN_LOCATION_LABEL = "Ran in your browser (preview)";

/**
 * Runs the harness in a fresh dedicated Web Worker built from a Blob URL. The
 * worker is terminated when it answers or when the timeout passes, so an
 * infinite loop in edited code cannot freeze the page.
 */
export function runInBrowserWorker(payload: HarnessPayload, timeoutMs: number = RUN_TIMEOUT_MS): Promise<RunOutcome> {
  if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL.createObjectURL !== "function") {
    return Promise.resolve({ kind: "error", message: "This browser cannot start a Web Worker, so the tests could not run." });
  }

  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
  let worker: Worker;
  try {
    worker = new Worker(url);
  } catch (error) {
    URL.revokeObjectURL(url);
    const message = error instanceof Error ? error.message : "unknown reason";
    return Promise.resolve({ kind: "error", message: "The test worker could not start: " + message });
  }

  return new Promise<RunOutcome>((resolve) => {
    let settled = false;
    const finish = (outcome: RunOutcome) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(outcome);
    };
    const timer = window.setTimeout(() => finish({ kind: "timeout", timeoutMs }), timeoutMs);
    worker.onmessage = (event: MessageEvent<unknown>) => finish(parseWorkerMessage(event.data));
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      finish({ kind: "error", message: event.message || "The test worker stopped with an error." });
    };
    worker.postMessage(payload);
  });
}
