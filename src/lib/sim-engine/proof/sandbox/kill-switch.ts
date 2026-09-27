import { STAGING_PROJECT_REF } from "@/lib/supabase/project-guard";
import {
  APPLIED_AI_FIXTURE_VERSION,
  APPLIED_AI_ROLE_ID,
  APPLIED_AI_VERSION_ID,
} from "./fixture";
import { resolveSandboxCredentials, sandboxCredentialStatus } from "./credentials";

export const SANDBOX_DEV_PROJECT_REF = STAGING_PROJECT_REF;
export const SANDBOX_ENABLED_ENV = "FYDELL_SANDBOX_ENABLED";
export const SANDBOX_PROJECT_REF_ENV = "FYDELL_DEV_PROJECT_REF";
export const SANDBOX_FIXTURE_ENV = "FYDELL_SANDBOX_FIXTURE_VERSION";

export type SandboxUnavailableReason =
  | "disabled"
  | "project_mismatch"
  | "missing_credentials"
  | "unsupported_fixture"
  | "health_failed";

export interface SandboxAvailability {
  enabled: boolean;
  reason: SandboxUnavailableReason | null;
  fixtureVersion: string;
  projectRef: string | null;
}

/**
 * The sandbox is judged on its own credentials, not the deployment's. A
 * production server can therefore host `/sandbox` while every sandbox write
 * still lands in fydell-dev.
 */
export function readSandboxAvailability(env: NodeJS.ProcessEnv = process.env): SandboxAvailability {
  const fixtureVersion = env[SANDBOX_FIXTURE_ENV] ?? "";
  const expectedRef = env[SANDBOX_PROJECT_REF_ENV] ?? "";

  if (env[SANDBOX_ENABLED_ENV] !== "true") {
    return { enabled: false, reason: "disabled", fixtureVersion, projectRef: null };
  }
  if (expectedRef !== SANDBOX_DEV_PROJECT_REF) {
    return { enabled: false, reason: "project_mismatch", fixtureVersion, projectRef: expectedRef || null };
  }

  const credentials = sandboxCredentialStatus(env);
  if (credentials.status !== "ready") {
    const reason: SandboxUnavailableReason =
      credentials.status === "missing_sandbox_credentials" ? "missing_credentials" : "project_mismatch";
    return { enabled: false, reason, fixtureVersion, projectRef: null };
  }

  if (fixtureVersion !== APPLIED_AI_FIXTURE_VERSION) {
    return { enabled: false, reason: "unsupported_fixture", fixtureVersion, projectRef: SANDBOX_DEV_PROJECT_REF };
  }
  return { enabled: true, reason: null, fixtureVersion, projectRef: SANDBOX_DEV_PROJECT_REF };
}

export async function checkSandboxHealth(): Promise<SandboxAvailability> {
  const base = readSandboxAvailability();
  if (!base.enabled) return base;
  try {
    const { url, serviceKey } = resolveSandboxCredentials();
    const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/proof_roles?id=eq.${APPLIED_AI_ROLE_ID}&select=id`,
      {
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
      },
      },
    );
    if (!response.ok) {
      return { ...base, enabled: false, reason: "health_failed" };
    }
    const rows = (await response.json()) as Array<{ id?: string }>;
    if (rows[0]?.id !== APPLIED_AI_ROLE_ID) {
      return { ...base, enabled: false, reason: "health_failed" };
    }
    const versionResponse = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/proof_simulation_versions?id=eq.${APPLIED_AI_VERSION_ID}&select=id`,
      {
        headers: {
          apikey: serviceKey,
          authorization: `Bearer ${serviceKey}`,
        },
      },
    );
    if (!versionResponse.ok) return { ...base, enabled: false, reason: "health_failed" };
    const versions = (await versionResponse.json()) as Array<{ id?: string }>;
    return versions[0]?.id === APPLIED_AI_VERSION_ID
      ? base
      : { ...base, enabled: false, reason: "health_failed" };
  } catch {
    return { ...base, enabled: false, reason: "health_failed" };
  }
}
