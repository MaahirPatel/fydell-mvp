/**
 * Run orchestration (dependency-injected; no framework or database imports).
 *
 * Practice runs (candidate "Run tests"):
 *  - idempotent on a client run id (double click / network retry -> same run);
 *  - one run at a time per attempt; a run left "running" past its deadline is
 *    marked abandoned instead of blocking forever (RUN-07);
 *  - bounded per attempt (SEC-08): RATE_LIMIT runs per RATE_WINDOW_MS.
 *
 * Evaluation runs (after submission):
 *  - pinned to the immutable submission snapshot; idempotent per
 *    (submission, snapshot hash, suite version), so retries never duplicate
 *    results or usage;
 *  - infrastructure failures are recorded and may be retried; they are never
 *    turned into a candidate failure.
 *
 * With no isolated provider configured, runs are recorded as not_configured.
 */

import { interpretRun } from "./evaluate";
import type { StoredRun, TestRunStore } from "./store";
import type { EngineeringRunResult, ExecutionProvider, RunKind, RunWorkspace, TrustedMaterial } from "./types";
import { assembleRunWorkspace } from "./workspace";

export const RATE_LIMIT = 20;
export const RATE_WINDOW_MS = 10 * 60 * 1000;
/** Extra time beyond the suite timeout before a "running" row counts as abandoned. */
export const ABANDON_GRACE_MS = 3 * 60 * 1000;

export class RunRefused extends Error {
  constructor(
    readonly code: "RUN_IN_PROGRESS" | "RATE_LIMITED",
    message: string
  ) {
    super(message);
    this.name = "RunRefused";
  }
}

export interface RunDeps {
  store: TestRunStore;
  provider: ExecutionProvider | null;
  material: TrustedMaterial;
  now?: () => number;
}

function notConfiguredResult(kind: RunKind, workspace: RunWorkspace, material: TrustedMaterial): EngineeringRunResult {
  const { descriptor } = material;
  return {
    kind,
    status: "not_configured",
    statusReason:
      "Tests cannot run in this environment yet: no isolated test runner is configured. Your work is saved; nothing about your code was evaluated.",
    classification: null,
    candidateSnapshotHash: workspace.candidateSnapshotHash,
    scenarioId: descriptor.scenarioId,
    scenarioVersion: descriptor.scenarioVersion,
    suiteVersion: descriptor.suiteVersion,
    environmentVersion: "",
    provider: "none",
    tests: [],
    groups: [],
    integrity: { canary: kind === "evaluation" ? "missing" : "not_applicable", missingExpected: [] },
    restoredTrusted: workspace.restoredTrusted,
    ignored: workspace.ignored,
    output: "",
    outputTruncated: false,
    summary: { passed: 0, failed: 0, errors: 0, skipped: 0 },
  };
}

function isAbandoned(run: StoredRun, material: TrustedMaterial, now: number): boolean {
  if (run.status !== "running") return false;
  const deadline = Date.parse(run.createdAt) + material.descriptor.runtime.timeoutSeconds * 1000 + ABANDON_GRACE_MS;
  return now > deadline;
}

async function execute(
  deps: RunDeps,
  workspace: RunWorkspace,
  runId: string,
  updatePresented?: (id: string) => boolean
): Promise<EngineeringRunResult> {
  const { material, store } = deps;
  const provider = deps.provider as ExecutionProvider;
  const result = await provider.run({
    files: workspace.files,
    pytestArgs: workspace.pytestArgs,
    timeoutSeconds: material.descriptor.runtime.timeoutSeconds,
    maxOutputBytes: material.descriptor.runtime.maxOutputBytes,
  });
  const interpreted = interpretRun({ workspace, material, result, updatePresented });
  await store.finish(runId, interpreted);
  return interpreted;
}

export async function runPractice(
  deps: RunDeps,
  args: { sessionId: string; userId: string; clientRunId: string | null; files: Record<string, string> }
): Promise<{ runId: string; reused: boolean; result: EngineeringRunResult | null }> {
  const { store, material } = deps;
  const now = (deps.now ?? Date.now)();
  const workspace = assembleRunWorkspace("practice", args.files, material);

  if (args.clientRunId) {
    const existing = await store.findPractice(args.sessionId, args.clientRunId);
    if (existing) return { runId: existing.id, reused: true, result: existing.result };
  }

  const recent = await store.listRuns(args.sessionId, "practice", 5);
  for (const run of recent) {
    if (run.status !== "running") continue;
    if (isAbandoned(run, material, now)) {
      await store.abandon(run.id, "The runner stopped responding; this run was abandoned. Run the tests again.");
    } else {
      throw new RunRefused("RUN_IN_PROGRESS", "A test run is already in progress for this attempt. Wait for it to finish.");
    }
  }
  const count = await store.countSince(args.sessionId, "practice", new Date(now - RATE_WINDOW_MS).toISOString());
  if (count >= RATE_LIMIT) {
    throw new RunRefused("RATE_LIMITED", "You have run the tests many times in the last few minutes. Wait a moment and try again.");
  }

  const base = {
    sessionId: args.sessionId,
    kind: "practice" as const,
    clientRunId: args.clientRunId,
    submissionId: null,
    candidateSnapshotHash: workspace.candidateSnapshotHash,
    scenarioId: material.descriptor.scenarioId,
    scenarioVersion: material.descriptor.scenarioVersion,
    suiteVersion: material.descriptor.suiteVersion,
    requestedBy: args.userId,
  };

  if (!deps.provider) {
    const finished = notConfiguredResult("practice", workspace, material);
    const { run } = await store.insert({ ...base, finished });
    return { runId: run.id, reused: false, result: finished };
  }

  const { created, run } = await store.insert(base);
  if (!created) return { runId: run.id, reused: true, result: run.result };
  return { runId: run.id, reused: false, result: await execute(deps, workspace, run.id) };
}

export async function runEvaluation(
  deps: RunDeps,
  args: {
    sessionId: string;
    submissionId: string;
    files: Record<string, string>;
    updatePresented: (updateId: string) => boolean;
  }
): Promise<{ runId: string; reused: boolean; result: EngineeringRunResult | null }> {
  const { store, material } = deps;
  const now = (deps.now ?? Date.now)();
  const workspace = assembleRunWorkspace("evaluation", args.files, material);

  const existing = await store.findLiveEvaluation(
    args.submissionId,
    workspace.candidateSnapshotHash,
    material.descriptor.suiteVersion
  );
  if (existing) {
    if (!isAbandoned(existing, material, now)) return { runId: existing.id, reused: true, result: existing.result };
    await store.abandon(existing.id, "The evaluation runner stopped responding; the evaluation was retried.");
  }

  const base = {
    sessionId: args.sessionId,
    kind: "evaluation" as const,
    clientRunId: null,
    submissionId: args.submissionId,
    candidateSnapshotHash: workspace.candidateSnapshotHash,
    scenarioId: material.descriptor.scenarioId,
    scenarioVersion: material.descriptor.scenarioVersion,
    suiteVersion: material.descriptor.suiteVersion,
    requestedBy: null,
  };

  if (!deps.provider) {
    // Report polling retries analysis; record "not configured" once per snapshot.
    const prior = (await store.listRuns(args.sessionId, "evaluation", 10)).find(
      (r) =>
        r.status === "not_configured" &&
        r.submissionId === args.submissionId &&
        r.candidateSnapshotHash === workspace.candidateSnapshotHash &&
        r.suiteVersion === material.descriptor.suiteVersion
    );
    if (prior) return { runId: prior.id, reused: true, result: prior.result };
    const finished = notConfiguredResult("evaluation", workspace, material);
    const { run } = await store.insert({ ...base, finished });
    return { runId: run.id, reused: false, result: finished };
  }

  const { created, run } = await store.insert(base);
  if (!created) return { runId: run.id, reused: true, result: run.result };
  return { runId: run.id, reused: false, result: await execute(deps, workspace, run.id, args.updatePresented) };
}
