import "server-only";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { Writable } from "node:stream";
import os from "node:os";
import path from "node:path";
import { Sandbox } from "@vercel/sandbox";
import { isSafePath, type PackageFile } from "./package";
import type { EnvironmentId } from "./registry";

export type TestOutcome = "passed" | "failed" | "error" | "skipped";
export type TestCaseResult = { name: string; outcome: TestOutcome };

export type RunnerInfo = { name: "vercel-sandbox" | "local-dev"; isolated: boolean; label: string; version: string };

export type SuiteRun =
  | {
      kind: "ran";
      command: string;
      exitCode: number | null;
      durationMs: number;
      tests: TestCaseResult[];
      /** Truncated combined output, shown to the author. Never shown to candidates for protected suites. */
      output: string;
    }
  | { kind: "timeout"; command: string; durationMs: number; output: string }
  | { kind: "infrastructure_error"; code: string; detail: string };

export type SuiteRequest = {
  environment: EnvironmentId;
  files: PackageFile[];
  testFiles: string[];
  timeoutMs?: number;
};

export interface Runner {
  info: RunnerInfo;
  /** Runs several suites; implementations may reuse one environment across them. */
  runSuites(requests: SuiteRequest[]): Promise<SuiteRun[]>;
}

export type RunnerSelection = { ok: true; runner: Runner; detail: null } | { ok: false; runner: null; code: "runner_unavailable"; detail: string };

const OUTPUT_LIMIT = 200_000;
const SHOWN_OUTPUT = 12_000;
const DEFAULT_TIMEOUT = 30_000;

/** Same rule as the evaluation queue: production unless explicitly a preview deployment. */
export function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production" || (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview");
}

/**
 * Whether the sandbox can authenticate. On Vercel the OIDC token is injected
 * per request; locally a pulled token expires after about 12 hours, and an
 * expired one should not win over the local runner in development.
 */
function sandboxCredentialsUsable(): boolean {
  if (process.env.VERCEL || process.env.VERCEL_TOKEN) return true;
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (!token) return false;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: unknown };
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 60_000;
  } catch {
    return false;
  }
}

export function selectRunner(): RunnerSelection {
  const requested = process.env.FYDELL_AUTHORING_RUNNER;
  const snapshotId = process.env.FYDELL_EXECUTION_SNAPSHOT_ID;
  if (requested !== "local-dev" && snapshotId && (isProductionRuntime() || sandboxCredentialsUsable())) {
    return { ok: true, runner: sandboxRunner(snapshotId), detail: null };
  }
  if (isProductionRuntime()) {
    return {
      ok: false,
      runner: null,
      code: "runner_unavailable",
      detail: "Isolated execution is not configured for this environment, so tests cannot run. Drafts cannot be published until it is.",
    };
  }
  return { ok: true, runner: localRunner(), detail: null };
}

export function commandFor(environment: EnvironmentId, testFiles: string[], local: boolean): { cmd: string; args: string[] } {
  if (environment === "python-stdlib") {
    const python = local ? process.env.FYDELL_PYTHON || (process.platform === "win32" ? "python" : "python3") : "python3";
    return { cmd: python, args: ["-B", "-m", "unittest", "-v", ...testFiles] };
  }
  const ts = testFiles.some((f) => f.endsWith(".ts"));
  return { cmd: "node", args: [...(ts ? ["--experimental-strip-types", "--no-warnings"] : []), "--test", "--test-timeout=5000", "--test-reporter=tap", ...testFiles] };
}

export function displayCommand(environment: EnvironmentId, testFiles: string[]): string {
  const { args } = commandFor(environment, testFiles, false);
  return [environment === "python-stdlib" ? "python3" : "node", ...args].join(" ");
}

/** Parses `python -m unittest -v` output into per-test results keyed by `Class.method`. */
export function parseUnittest(output: string): TestCaseResult[] {
  const results: TestCaseResult[] = [];
  const re = /^(\w+) \(([\w.]+)\)(?:\n(?!\w+ \([\w.]+\)).*?)? \.\.\. (ok|FAIL|ERROR|skipped\b.*|expected failure|unexpected success)$/gm;
  for (const m of output.matchAll(re)) {
    const id = m[2];
    const parts = id.split(".");
    const name = parts.length >= 2 && parts[parts.length - 1] === m[1] ? parts.slice(-2).join(".") : `${parts[parts.length - 1]}.${m[1]}`;
    const status = m[3];
    const outcome: TestOutcome =
      status === "ok" || status === "expected failure" ? "passed" : status === "FAIL" || status === "unexpected success" ? "failed" : status === "ERROR" ? "error" : "skipped";
    results.push({ name, outcome });
  }
  return results;
}

/** Parses node:test TAP output. Suite wrappers (`describe`, file wrappers) are excluded when they have subtests. */
export function parseTap(output: string): TestCaseResult[] {
  const out: TestCaseResult[] = [];
  const all: Array<{ name: string; outcome: TestOutcome; indent: number }> = [];
  for (const line of output.split(/\r?\n/)) {
    const m = /^(\s*)(not ok|ok) \d+ - (.+?)(?:\s+#\s*(SKIP|TODO)\b.*)?$/.exec(line);
    if (m) all.push({ name: m[3].trim(), outcome: m[4] ? "skipped" : m[2] === "ok" ? "passed" : "failed", indent: m[1].length });
  }
  // TAP prints children before their parent's result line, so a line is a wrapper when the previous result was deeper.
  for (let i = 0; i < all.length; i++) {
    const prev = all[i - 1];
    if (prev && prev.indent > all[i].indent) continue;
    out.push({ name: all[i].name, outcome: all[i].outcome });
  }
  return out;
}

export function parseResults(environment: EnvironmentId, output: string): TestCaseResult[] {
  return environment === "python-stdlib" ? parseUnittest(output) : parseTap(output);
}

function clip(s: string): string {
  return s.length > SHOWN_OUTPUT ? `${s.slice(0, SHOWN_OUTPUT)}\n[output truncated]` : s;
}

function scrubbedEnv(): NodeJS.ProcessEnv {
  const env: Record<string, string> = { PATH: process.env.PATH ?? "", PYTHONDONTWRITEBYTECODE: "1", PYTHONIOENCODING: "utf-8", NO_COLOR: "1" };
  if (process.env.SYSTEMROOT) env.SYSTEMROOT = process.env.SYSTEMROOT;
  if (process.platform === "win32" && process.env.TEMP) env.TEMP = process.env.TEMP;
  return env as unknown as NodeJS.ProcessEnv;
}

/**
 * Development-only runner. NOT an isolation boundary: the process runs as the
 * developer with a scrubbed environment in a temporary directory. Refused in
 * production by selectRunner; every result is labelled with `isolated: false`.
 */
export function localRunner(): Runner {
  return {
    info: { name: "local-dev", isolated: false, label: "Local development runner (not isolated)", version: `${process.platform} node ${process.version}` },
    async runSuites(requests) {
      const out: SuiteRun[] = [];
      for (const req of requests) out.push(await runLocal(req));
      return out;
    },
  };
}

async function runLocal(req: SuiteRequest): Promise<SuiteRun> {
  const root = await mkdtemp(path.join(os.tmpdir(), "fydell-author-"));
  try {
    for (const f of req.files) {
      if (!isSafePath(f.path)) return { kind: "infrastructure_error", code: "unsafe_path", detail: `Refused path ${f.path.slice(0, 80)}` };
      const target = path.join(root, ...f.path.split("/"));
      if (!target.startsWith(root + path.sep)) return { kind: "infrastructure_error", code: "unsafe_path", detail: "Path escaped the project." };
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, f.content, "utf8");
    }
    const { cmd, args } = commandFor(req.environment, req.testFiles, true);
    const command = displayCommand(req.environment, req.testFiles);
    const started = Date.now();
    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT;
    return await new Promise<SuiteRun>((resolve) => {
      const child = spawn(cmd, args, { cwd: root, env: scrubbedEnv(), stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      let output = "";
      let bytes = 0;
      let settled = false;
      const finish = (r: SuiteRun) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(r);
      };
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish({ kind: "timeout", command, durationMs: Date.now() - started, output: clip(output) });
      }, timeoutMs);
      const onData = (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > OUTPUT_LIMIT) {
          child.kill("SIGKILL");
          finish({ kind: "infrastructure_error", code: "output_limit", detail: "The test run printed more output than allowed." });
        } else output += chunk.toString("utf8");
      };
      child.stdout.on("data", onData);
      child.stderr.on("data", onData);
      child.on("error", () => finish({ kind: "infrastructure_error", code: "runtime_unavailable", detail: `Could not start ${req.environment === "python-stdlib" ? "Python" : "Node.js"} on this machine.` }));
      child.on("close", (code) =>
        finish({ kind: "ran", command, exitCode: code, durationMs: Date.now() - started, tests: parseResults(req.environment, output), output: clip(output) }),
      );
    });
  } catch (error) {
    return { kind: "infrastructure_error", code: "local_runner_failed", detail: error instanceof Error ? error.message.slice(0, 200) : "unknown" };
  } finally {
    await rm(root, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Production runner: one fresh Vercel Sandbox microVM per call, from a
 * versioned snapshot, with no network and no application environment. Each
 * suite runs in its own directory as an unprivileged user; the VM is deleted
 * afterwards.
 */
export function sandboxRunner(snapshotId: string): Runner {
  const runSuites = sandboxSuites(snapshotId);
  return {
    info: { name: "vercel-sandbox", isolated: true, label: "Isolated sandbox", version: `vercel-snapshot:${snapshotId}` },
    async runSuites(requests) {
      const budget = SANDBOX_SETUP_MS + requests.reduce((n, r) => n + (r.timeoutMs ?? DEFAULT_TIMEOUT) + SANDBOX_STEP_MS, 0);
      let timer: NodeJS.Timeout | undefined;
      const deadline = new Promise<SuiteRun[]>((resolve) => {
        timer = setTimeout(
          () => resolve(requests.map(() => ({ kind: "infrastructure_error" as const, code: "sandbox_unresponsive", detail: `The sandbox did not respond within ${Math.round(budget / 1000)} seconds.` }))),
          budget,
        );
      });
      try {
        return await Promise.race([runSuites(requests), deadline]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** Sandbox calls that hang (create, user setup, file writes) must not hold a request open forever. */
const SANDBOX_SETUP_MS = 90_000;
const SANDBOX_STEP_MS = 30_000;

function sandboxSuites(snapshotId: string): (requests: SuiteRequest[]) => Promise<SuiteRun[]> {
  return async (requests) => {
    let sandbox: Sandbox | null = null;
    try {
      sandbox = await Sandbox.create({
        source: { type: "snapshot", snapshotId },
        persistent: false,
        timeout: 280_000,
        resources: { vcpus: 1 },
        networkPolicy: "deny-all",
        env: {},
        ports: [],
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 200) : "unknown";
      return requests.map(() => ({ kind: "infrastructure_error" as const, code: "sandbox_create_failed", detail }));
    }
    try {
      const user = await sandbox.createUser("author");
      const out: SuiteRun[] = [];
      for (const [i, req] of requests.entries()) {
        const dir = `run${i}`;
        if (req.files.some((f) => !isSafePath(f.path))) {
          out.push({ kind: "infrastructure_error", code: "unsafe_path", detail: "Refused an unsafe file path." });
          continue;
        }
        await user.writeFiles(req.files.map((f) => ({ path: `${dir}/${f.path}`, content: new TextEncoder().encode(f.content) })));
        const { cmd, args } = commandFor(req.environment, req.testFiles, false);
        const command = displayCommand(req.environment, req.testFiles);
        let output = "";
        let bytes = 0;
        let exceeded = false;
        const sink = new Writable({
          write(chunk, _e, cb) {
            bytes += chunk.length;
            if (bytes > OUTPUT_LIMIT) exceeded = true;
            else output += chunk.toString();
            cb();
          },
        });
        const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT;
        const started = Date.now();
        const result = await user.runCommand({ cmd: "sh", args: ["-c", `cd ${dir} && exec "$0" "$@"`, cmd, ...args], timeoutMs, stdout: sink, stderr: sink });
        const durationMs = Date.now() - started;
        if (exceeded) out.push({ kind: "infrastructure_error", code: "output_limit", detail: "The test run printed more output than allowed." });
        else if (result.exitCode === 124 || result.exitCode === 137 || durationMs >= timeoutMs) out.push({ kind: "timeout", command, durationMs, output: clip(output) });
        else out.push({ kind: "ran", command, exitCode: result.exitCode, durationMs, tests: parseResults(req.environment, output), output: clip(output) });
      }
      return out;
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 200) : "unknown";
      return requests.map(() => ({ kind: "infrastructure_error" as const, code: "sandbox_run_failed", detail }));
    } finally {
      await sandbox.stop().catch(() => undefined);
      await sandbox.delete().catch(() => undefined);
    }
  };
}
