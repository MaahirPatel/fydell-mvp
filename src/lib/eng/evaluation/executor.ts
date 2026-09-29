import "server-only";

export type ProbeRun =
  | { kind: "exited"; stdout: string; nonce: string }
  | { kind: "timeout" }
  | { kind: "output_limit" };

export type ExecutorOutcome =
  | { kind: "completed"; environmentVersion: string; probeRuns: Record<string, ProbeRun> }
  | { kind: "infrastructure_error"; code: string; detail: string };

export interface ExecutionRequest {
  files: Map<string, Uint8Array>;
  harnessSource: string;
  probeIds: string[];
}

export interface Executor {
  name: "vercel-sandbox" | "local-dev";
  run(request: ExecutionRequest): Promise<ExecutorOutcome>;
}

export const PROBE_TIMEOUT_MS = 10000;
export const PROBE_OUTPUT_LIMIT = 65536;

/** Resource limits applied inside the evaluation process before the harness runs. */
export const PYTHON_LIMITS_PRELUDE = [
  "import resource",
  "resource.setrlimit(resource.RLIMIT_AS, (536870912, 536870912))",
  "resource.setrlimit(resource.RLIMIT_CPU, (8, 8))",
  "resource.setrlimit(resource.RLIMIT_NPROC, (64, 64))",
  "resource.setrlimit(resource.RLIMIT_FSIZE, (1048576, 1048576))",
].join("\n");

export function harnessBootstrap(probeId: string, nonce: string, withLimits: boolean): string {
  return [
    withLimits ? PYTHON_LIMITS_PRELUDE : "",
    "import os, runpy, sys",
    "os.chdir('project')",
    `sys.argv = ['harness.py', ${JSON.stringify(probeId)}, ${JSON.stringify(nonce)}]`,
    "runpy.run_path(os.path.join('..', 'eval', 'harness.py'), run_name='__main__')",
  ]
    .filter(Boolean)
    .join("\n");
}

export type ExecutorSelection = { ok: true; executor: Executor } | { ok: false; code: string; detail: string };
