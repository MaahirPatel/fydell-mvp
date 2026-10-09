/**
 * Execution provider selection. FYDELL_EXECUTION_PROVIDER chooses:
 *
 *   vercel            Vercel Sandbox microVM (needs FYDELL_ENGINEERING_SNAPSHOT_ID)
 *   worker            isolated runner service (needs FYDELL_RUNNER_URL + FYDELL_RUNNER_TOKEN)
 *   local-unsafe-dev  host Python, development only; refused in production
 *
 * Anything else, or a provider missing its configuration, yields null and
 * runs report "not_configured" truthfully. There is no silent fallback to
 * executing candidate code on the application host.
 */

import "server-only";
import type { ExecutionProvider } from "../types";
import { LOCAL_PROVIDER_ID, createLocalProvider, localProviderAllowed } from "./local";
import { WORKER_PROVIDER_ID, createWorkerProvider, workerConfigured } from "./worker";

export async function selectExecutionProvider(
  env: NodeJS.ProcessEnv = process.env
): Promise<ExecutionProvider | null> {
  switch (env.FYDELL_EXECUTION_PROVIDER?.trim()) {
    case "vercel": {
      const { createVercelProvider, vercelConfigured } = await import("./vercel");
      return vercelConfigured(env) ? createVercelProvider(env) : null;
    }
    case WORKER_PROVIDER_ID:
      return workerConfigured(env) ? createWorkerProvider(env) : null;
    case LOCAL_PROVIDER_ID:
      return localProviderAllowed(env) ? createLocalProvider() : null;
    default:
      return null;
  }
}
