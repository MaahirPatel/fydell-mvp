import type { DemoScenario } from "./catalog-types";
import { completeResults } from "./harness";
import { runtimeFor } from "./runtime";
import type { HarnessPayload, RunOutcome, RunRecord, RunScope, TestMeta } from "./types";

/**
 * Source files plus the tests for a scope. Edited files replace the starter
 * only where the scenario marks them editable; test files always come from
 * the scenario, never from the editor.
 */
export function buildPayload(scenario: DemoScenario, sourceFiles: Record<string, string>, scope: RunScope): HarnessPayload {
  const rt = runtimeFor(scenario);
  const files: Record<string, string> = { ...rt.starterFiles };
  for (const path of rt.editablePaths) {
    const text = sourceFiles[path];
    if (typeof text === "string") files[path] = text;
  }
  const testFiles = [...rt.publicTestFiles];
  if (scope === "all") {
    Object.assign(files, rt.protectedFiles);
    testFiles.push(...rt.protectedTestFiles);
  }
  return { files, testFiles };
}

export function testsForScope(scenario: DemoScenario, scope: RunScope): TestMeta[] {
  const rt = runtimeFor(scenario);
  return scope === "all" ? rt.tests : rt.publicTests;
}

/** Turns a raw run outcome into the record the UI and storage use. */
export function toRunRecord(scenario: DemoScenario, scope: RunScope, outcome: RunOutcome, at: string, elapsedMs: number): RunRecord {
  const results = completeResults(testsForScope(scenario, scope), outcome);
  if (outcome.kind === "completed") {
    return { at, scope, outcome: "completed", outcomeMessage: null, results, logs: outcome.output.logs, durationMs: outcome.output.durationMs };
  }
  const message =
    outcome.kind === "timeout"
      ? `Stopped after ${outcome.timeoutMs / 1000} s. The worker was terminated because the code did not finish.`
      : outcome.message;
  return { at, scope, outcome: outcome.kind, outcomeMessage: message, results, logs: [], durationMs: elapsedMs };
}
