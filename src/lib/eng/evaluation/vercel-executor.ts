import "server-only";
import { Sandbox } from "@vercel/sandbox";
import { Writable } from "node:stream";
import { randomBytes } from "node:crypto";
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
 * Candidate code runs only inside a fresh Vercel Sandbox microVM created from a
 * versioned snapshot: no network, no application environment, no repository
 * checkout and no storage mounts. The VM is stopped and deleted afterwards.
 */
export function vercelExecutor(snapshotId: string): Executor {
  return {
    name: "vercel-sandbox",
    async run(request: ExecutionRequest): Promise<ExecutorOutcome> {
      let sandbox: Sandbox | null = null;
      try {
        sandbox = await Sandbox.create({
          source: { type: "snapshot", snapshotId },
          persistent: false,
          timeout: 240000,
          resources: { vcpus: 1 },
          networkPolicy: "deny-all",
          env: {},
          ports: [],
        });
      } catch (error) {
        return { kind: "infrastructure_error", code: "sandbox_create_failed", detail: error instanceof Error ? error.message.slice(0, 300) : "unknown" };
      }
      try {
        const user = await sandbox.createUser("candidate");
        const files = [...request.files.entries()].map(([path, content]) => ({ path: `project/${path}`, content }));
        files.push({ path: "eval/harness.py", content: new TextEncoder().encode(request.harnessSource) });
        await user.writeFiles(files);
        const probeRuns: Record<string, ProbeRun> = {};
        for (const probeId of request.probeIds) {
          const nonce = `@@${randomBytes(12).toString("hex")}@@`;
          let output = "";
          let bytes = 0;
          let exceeded = false;
          const sink = new Writable({
            write(chunk, _encoding, callback) {
              bytes += chunk.length;
              if (bytes > PROBE_OUTPUT_LIMIT) exceeded = true;
              else output += chunk.toString();
              callback();
            },
          });
          const discard = new Writable({ write(_c, _e, cb) { cb(); } });
          const started = Date.now();
          const command = await user.runCommand({
            cmd: "python3",
            args: ["-I", "-B", "-c", harnessBootstrap(probeId, nonce, true)],
            timeoutMs: PROBE_TIMEOUT_MS,
            stdout: sink,
            stderr: discard,
          });
          if (exceeded) probeRuns[probeId] = { kind: "output_limit" };
          else if (command.exitCode === 124 || command.exitCode === 137 || Date.now() - started >= PROBE_TIMEOUT_MS) probeRuns[probeId] = { kind: "timeout" };
          else probeRuns[probeId] = { kind: "exited", stdout: output, nonce };
        }
        return { kind: "completed", environmentVersion: `vercel-snapshot:${snapshotId}`, probeRuns };
      } catch (error) {
        return { kind: "infrastructure_error", code: "sandbox_run_failed", detail: error instanceof Error ? error.message.slice(0, 300) : "unknown" };
      } finally {
        await sandbox.stop().catch(() => undefined);
        await sandbox.delete().catch(() => undefined);
      }
    },
  };
}
