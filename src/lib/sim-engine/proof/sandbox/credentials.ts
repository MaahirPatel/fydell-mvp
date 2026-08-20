import {
  STAGING_PROJECT_REF,
  isPlausibleServiceRoleKey,
  projectRefFromKey,
  projectRefFromUrl,
} from "@/lib/supabase/project-guard";

/**
 * The sandbox writes to fydell-dev even when the surrounding deployment is
 * bound to production. Its credentials are therefore separate from the app's:
 * a production server can render `/sandbox` without production Supabase ever
 * being reachable from the sandbox code path.
 *
 * The app-wide variables are accepted only when they already name fydell-dev,
 * so a local dev machine needs no extra configuration. Anything else refuses.
 *
 * This module is deliberately free of `server-only` so the boundary can be
 * unit tested without a running server. Only the client factory is server-only.
 */

export const SANDBOX_URL_ENV = "FYDELL_SANDBOX_SUPABASE_URL";
export const SANDBOX_SERVICE_KEY_ENV = "FYDELL_SANDBOX_SUPABASE_SERVICE_ROLE_KEY";

export type SandboxCredentialFailure =
  | "missing_sandbox_credentials"
  | "sandbox_project_mismatch"
  | "sandbox_key_mismatch";

export interface SandboxCredentials {
  url: string;
  serviceKey: string;
  ref: string;
}

export class SandboxCredentialError extends Error {
  readonly reason: SandboxCredentialFailure;
  constructor(reason: SandboxCredentialFailure, message: string) {
    super(message);
    this.name = "SandboxCredentialError";
    this.reason = reason;
  }
}

/**
 * Resolves the credentials the sandbox may use, or explains the refusal.
 * Never returns or logs a key.
 */
export function resolveSandboxCredentials(env: NodeJS.ProcessEnv = process.env): SandboxCredentials {
  const dedicatedUrl = env[SANDBOX_URL_ENV];
  const dedicatedKey = env[SANDBOX_SERVICE_KEY_ENV];

  // The app-wide pair is a fallback, and only when it is already fydell-dev.
  const appUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const appKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  const appIsDev = projectRefFromUrl(appUrl) === STAGING_PROJECT_REF;

  const url = dedicatedUrl || (appIsDev ? appUrl : undefined);
  const serviceKey = dedicatedKey || (appIsDev ? appKey : undefined);

  if (!url || !isPlausibleServiceRoleKey(serviceKey)) {
    throw new SandboxCredentialError(
      "missing_sandbox_credentials",
      `Set ${SANDBOX_URL_ENV} and ${SANDBOX_SERVICE_KEY_ENV} to the fydell-dev project (${STAGING_PROJECT_REF}).`,
    );
  }

  const urlRef = projectRefFromUrl(url);
  if (urlRef !== STAGING_PROJECT_REF) {
    throw new SandboxCredentialError(
      "sandbox_project_mismatch",
      `${SANDBOX_URL_ENV} points at ${urlRef ?? "an unparseable host"}; the sandbox may only write to ${STAGING_PROJECT_REF}.`,
    );
  }

  // Modern sb_secret_ keys carry no project reference. When the key does carry
  // one, it has to agree with the URL.
  const keyRef = projectRefFromKey(serviceKey);
  if (keyRef && keyRef !== STAGING_PROJECT_REF) {
    throw new SandboxCredentialError(
      "sandbox_key_mismatch",
      `The sandbox service-role key belongs to project ${keyRef}, not ${STAGING_PROJECT_REF}.`,
    );
  }

  return { url, serviceKey: serviceKey as string, ref: STAGING_PROJECT_REF };
}

/**
 * A string discriminant rather than an `ok` boolean, because this project
 * compiles with `strict` off and will not narrow a union on a boolean member.
 */
export type SandboxCredentialStatus =
  | { status: "ready" }
  | { status: SandboxCredentialFailure; detail: string };

export function sandboxCredentialStatus(env: NodeJS.ProcessEnv = process.env): SandboxCredentialStatus {
  try {
    resolveSandboxCredentials(env);
    return { status: "ready" };
  } catch (error) {
    if (error instanceof SandboxCredentialError) {
      return { status: error.reason, detail: error.message };
    }
    return { status: "missing_sandbox_credentials", detail: "Sandbox credentials could not be resolved." };
  }
}
