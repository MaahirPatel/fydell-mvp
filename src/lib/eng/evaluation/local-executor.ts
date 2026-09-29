import "server-only";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import {
  harnessBootstrap,
  PROBE_OUTPUT_LIMIT,
  PROBE_TIMEOUT_MS,
  type ExecutionRequest,
  type Executor,
  type ExecutorOutcome,
  type ProbeRun,
} from "./executor";

/**
 * Development-only executor for internal rehearsal attempts on a developer
 * machine. It is NOT an isolation boundary: the process runs as the developer
 * with a scrubbed environment and a temporary directory. The queue refuses to
 * select it in production, and every run it produces is labelled
 * `local-dev (not isolated)` in the report.
 */
export function localDevExecutor(): Executor {
  const python = process.env.FYDELL_PYTHON || (process.platform === "win32" ? "python" : "python3");
  return {
    name: "local-dev",
    async run(request: ExecutionRequest): Promise<ExecutorOutcome> {
      const root = await mkdtemp(path.join(os.tmpdir(), "fydell-eval-"));
      try {
        for (const [rel, content] of request.files) {
          const target = path.join(root, "project", ...rel.split("/"));
          if (!target.startsWith(path.join(root, "project"))) throw new Error("path escaped project");
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, content);
        }
        await mkdir(path.join(root, "eval"), { recursive: true });
        await writeFile(path.join(root, "eval", "harness.py"), request.harnessSource);
        const probeRuns: Record<string, ProbeRun> = {};
        for (const probeId of request.probeIds) {
          const nonce = `@@${randomBytes(12).toString("hex")}@@`;
          const run = await runOne(python, root, harnessBootstrap(probeId, nonce, process.platform !== "win32"), nonce);
          if (!run) return { kind: "infrastructure_error", code: "python_unavailable", detail: `Could not start ${python}.` };
          probeRuns[probeId] = run;
        }
        return { kind: "completed", environmentVersion: `local-dev (not isolated) ${process.platform}`, probeRuns };
      } catch (error) {
        return { kind: "infrastructure_error", code: "local_executor_failed", detail: error instanceof Error ? error.message.slice(0, 300) : "unknown" };
      } finally {
        await rm(root, { recursive: true, force: true }).catch(() => undefined);
      }
    },
  };
}

function runOne(python: string, cwd: string, program: string, nonce: string): Promise<ProbeRun | null> {
  return new Promise((resolve) => {
    const child = spawn(python, ["-I", "-B", "-c", program], {
      cwd,
      env: { PATH: process.env.PATH ?? "", SYSTEMROOT: process.env.SYSTEMROOT ?? "", PYTHONDONTWRITEBYTECODE: "1" } as unknown as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "ignore"] as const,
      windowsHide: true,
    });
    let output = "";
    let bytes = 0;
    let settled = false;
    const finish = (run: ProbeRun | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(run);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ kind: "timeout" });
    }, PROBE_TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > PROBE_OUTPUT_LIMIT) {
        child.kill("SIGKILL");
        finish({ kind: "output_limit" });
      } else {
        output += chunk.toString("utf8");
      }
    });
    child.on("error", () => finish(null));
    child.on("close", () => finish({ kind: "exited", stdout: output, nonce }));
  });
}
