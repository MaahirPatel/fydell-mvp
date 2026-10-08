"use client";

import { useCallback, useState } from "react";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import { buildPayload, toRunRecord } from "@/lib/sandbox-demo/payload";
import { runInBrowserWorker } from "@/lib/sandbox-demo/runner";
import type { RunRecord, RunScope } from "@/lib/sandbox-demo/types";

/** Runs source files against a scenario's tests in a fresh Web Worker. */
export async function runFiles(scenario: DemoScenario, files: Record<string, string>, scope: RunScope): Promise<RunRecord> {
  const at = new Date().toISOString();
  const started = performance.now();
  const outcome = await runInBrowserWorker(buildPayload(scenario, files, scope));
  return toRunRecord(scenario, scope, outcome, at, Math.round(performance.now() - started));
}

export function useTestRun(scenario: DemoScenario) {
  const [running, setRunning] = useState<RunScope | null>(null);
  const run = useCallback(
    async (files: Record<string, string>, scope: RunScope) => {
      setRunning(scope);
      try {
        return await runFiles(scenario, files, scope);
      } finally {
        setRunning(null);
      }
    },
    [scenario],
  );
  return { running, run };
}
