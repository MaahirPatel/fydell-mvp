/**
 * Vercel Sandbox provider: each run gets a disposable microVM restored from a
 * versioned snapshot that contains Python and the pinned test packages
 * (scripts/create-engineering-runtime-snapshot.mjs). Candidate code runs as a
 * dedicated unprivileged user with networking denied and no application
 * environment variables, repository checkout or storage mounts.
 *
 * Adapted from the codex/fydell-simulation execution increment, generalized
 * from a single function harness to a multi-file pytest workspace.
 */

import "server-only";
import { Writable } from "node:stream";
import { Sandbox } from "@vercel/sandbox";
import { BOOTSTRAP_PY, BOOTSTRAP_VERSION, newPayload, parseEnvelope } from "../bootstrap";
import type { ExecutionProvider, ProviderRequest, ProviderResult } from "../types";

export const VERCEL_PROVIDER_ID = "vercel-sandbox";
const MAX_ENVELOPE_BYTES = 16 * 1024 * 1024;

export function vercelConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.FYDELL_ENGINEERING_SNAPSHOT_ID);
}

export function createVercelProvider(env: NodeJS.ProcessEnv = process.env): ExecutionProvider {
  return {
    id: VERCEL_PROVIDER_ID,
    async run(request: ProviderRequest): Promise<ProviderResult> {
      const snapshotId = env.FYDELL_ENGINEERING_SNAPSHOT_ID as string;
      const base: ProviderResult = {
        provider: VERCEL_PROVIDER_ID,
        environmentVersion: `${BOOTSTRAP_VERSION};vercel-snapshot:${snapshotId}`,
        exitCode: null,
        timedOut: false,
        output: "",
        outputTruncated: false,
        junitXml: null,
        infrastructureError: null,
      };
      const payload = newPayload(request);
      let sandbox: Sandbox | null = null;
      let stdout = "";
      let bytes = 0;
      let overflow = false;
      try {
        // Never forward the application's environment, clone its repository,
        // or mount storage. The VM lifetime is a provider-enforced backstop.
        sandbox = await Sandbox.create({
          source: { type: "snapshot", snapshotId },
          persistent: false,
          timeout: (request.timeoutSeconds + 60) * 1000,
          resources: { vcpus: 1 },
          networkPolicy: "deny-all",
          env: {},
          ports: [],
        });
        const user = await sandbox.createUser("candidate");
        await user.writeFiles([
          { path: "bootstrap.py", content: BOOTSTRAP_PY },
          { path: "payload.json", content: JSON.stringify(payload) },
        ]);
        const sink = new Writable({
          write(chunk: Buffer, _enc, callback) {
            bytes += chunk.length;
            if (bytes > MAX_ENVELOPE_BYTES) overflow = true;
            else stdout += chunk.toString("utf8");
            callback();
          },
        });
        await user.runCommand({
          cmd: "python3",
          args: ["-I", "-B", "bootstrap.py", "payload.json"],
          timeoutMs: (request.timeoutSeconds + 30) * 1000,
          stdout: sink,
          stderr: new Writable({ write: (_c, _e, cb) => cb() }),
        });
        if (overflow) return { ...base, infrastructureError: "runner output exceeded the envelope limit" };
        const envelope = parseEnvelope(stdout, payload.nonce);
        if (!envelope) return { ...base, infrastructureError: "the runner returned no result envelope" };
        if (envelope.bootstrapError) return { ...base, infrastructureError: envelope.bootstrapError };
        return {
          ...base,
          exitCode: envelope.exitCode,
          timedOut: envelope.timedOut,
          output: envelope.output,
          outputTruncated: envelope.outputTruncated,
          junitXml: envelope.junitXml,
        };
      } catch (err) {
        return { ...base, infrastructureError: err instanceof Error ? err.message.slice(0, 200) : "sandbox failed" };
      } finally {
        if (sandbox) {
          await sandbox.stop().catch(() => undefined);
          await sandbox.delete().catch(() => undefined);
        }
      }
    },
  };
}
