/**
 * Remote worker provider: an authenticated HTTPS call to the isolated
 * engineering runner service (services/engineering-runner), which executes
 * the bootstrap in a disposable, network-less gVisor container on a
 * dedicated host. The app never shares credentials or storage with it.
 */

import { newPayload, parseEnvelope } from "../bootstrap";
import type { ExecutionProvider, ProviderRequest, ProviderResult } from "../types";

export const WORKER_PROVIDER_ID = "worker";

export function workerConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.FYDELL_RUNNER_URL && env.FYDELL_RUNNER_TOKEN && env.FYDELL_RUNNER_TOKEN.length >= 32);
}

export function createWorkerProvider(env: NodeJS.ProcessEnv = process.env): ExecutionProvider {
  return {
    id: WORKER_PROVIDER_ID,
    async run(request: ProviderRequest): Promise<ProviderResult> {
      const base: ProviderResult = {
        provider: WORKER_PROVIDER_ID,
        environmentVersion: "worker:unknown",
        exitCode: null,
        timedOut: false,
        output: "",
        outputTruncated: false,
        junitXml: null,
        infrastructureError: null,
      };
      const url = new URL(env.FYDELL_RUNNER_URL as string);
      const local = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
      if (url.protocol !== "https:" && !local) {
        return { ...base, infrastructureError: "the runner URL must use HTTPS" };
      }
      const payload = newPayload(request);
      try {
        const response = await fetch(new URL("/run", url), {
          method: "POST",
          headers: {
            authorization: `Bearer ${env.FYDELL_RUNNER_TOKEN}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout((request.timeoutSeconds + 45) * 1000),
          cache: "no-store",
          redirect: "error",
        });
        if (response.status === 429) return { ...base, infrastructureError: "the runner is at capacity; try again shortly" };
        if (!response.ok) return { ...base, infrastructureError: `runner responded ${response.status}` };
        const body = (await response.json()) as { stdout?: unknown; environmentVersion?: unknown };
        const envelope = typeof body.stdout === "string" ? parseEnvelope(body.stdout, payload.nonce) : null;
        const environmentVersion =
          typeof body.environmentVersion === "string" ? body.environmentVersion.slice(0, 250) : base.environmentVersion;
        if (!envelope) return { ...base, environmentVersion, infrastructureError: "the runner returned no result envelope" };
        if (envelope.bootstrapError) return { ...base, environmentVersion, infrastructureError: envelope.bootstrapError };
        return {
          ...base,
          environmentVersion,
          exitCode: envelope.exitCode,
          timedOut: envelope.timedOut,
          output: envelope.output,
          outputTruncated: envelope.outputTruncated,
          junitXml: envelope.junitXml,
        };
      } catch (err) {
        return { ...base, infrastructureError: err instanceof Error ? err.message : "runner unreachable" };
      }
    },
  };
}
