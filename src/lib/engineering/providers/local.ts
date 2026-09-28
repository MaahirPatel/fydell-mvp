/**
 * Local-process provider: DEVELOPMENT AND AUTHORING VALIDATION ONLY.
 *
 * Runs the bootstrap with a Python interpreter on the current host. There is
 * no isolation boundary here, so it refuses to run in production and must be
 * enabled explicitly (FYDELL_EXECUTION_PROVIDER=local-unsafe-dev). It exists
 * so scenario authors can validate reference/defective solutions and so the
 * run pipeline can be exercised end to end on a workstation.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BOOTSTRAP_PY, BOOTSTRAP_VERSION, newPayload, parseEnvelope } from "../bootstrap";
import type { ExecutionProvider, ProviderRequest, ProviderResult } from "../types";

export const LOCAL_PROVIDER_ID = "local-unsafe-dev";

export function localProviderAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== "production" && env.VERCEL_ENV !== "production";
}

export function createLocalProvider(python: string = process.env.FYDELL_LOCAL_PYTHON || "python3"): ExecutionProvider {
  return {
    id: LOCAL_PROVIDER_ID,
    async run(request: ProviderRequest): Promise<ProviderResult> {
      const base: ProviderResult = {
        provider: LOCAL_PROVIDER_ID,
        environmentVersion: `${BOOTSTRAP_VERSION};local:${python}`,
        exitCode: null,
        timedOut: false,
        output: "",
        outputTruncated: false,
        junitXml: null,
        infrastructureError: null,
      };
      if (!localProviderAllowed()) {
        return { ...base, infrastructureError: "the local provider is disabled in production" };
      }
      const dir = mkdtempSync(join(tmpdir(), "fydell-local-"));
      const payload = newPayload(request);
      try {
        writeFileSync(join(dir, "bootstrap.py"), BOOTSTRAP_PY, "utf8");
        writeFileSync(join(dir, "payload.json"), JSON.stringify(payload), "utf8");
        const stdout = await new Promise<string>((resolve, reject) => {
          const child = spawn(python, ["-I", "-B", join(dir, "bootstrap.py"), join(dir, "payload.json")], {
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
          });
          let out = "";
          child.stdout.on("data", (c: Buffer) => {
            out += c.toString("utf8");
          });
          child.stderr.on("data", () => undefined);
          const killer = setTimeout(() => child.kill("SIGKILL"), (request.timeoutSeconds + 30) * 1000);
          child.on("error", (err) => {
            clearTimeout(killer);
            reject(err);
          });
          child.on("close", () => {
            clearTimeout(killer);
            resolve(out);
          });
        });
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
        return { ...base, infrastructureError: err instanceof Error ? err.message : "local runner failed" };
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  };
}
