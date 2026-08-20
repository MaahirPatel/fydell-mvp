import { STAGING_PROJECT_REF, isPlausibleServiceRoleKey, projectRefFromUrl } from "@/lib/supabase/project-guard";
import { supabaseServiceKey, supabaseUrl } from "@/lib/supabase";
import { ACME_FIXTURE_VERSION } from "./fixture";

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

export function readSandboxAvailability(env: NodeJS.ProcessEnv = process.env): Omit<SandboxAvailability, "enabled"> & { enabled: boolean } {
  const fixtureVersion = env[SANDBOX_FIXTURE_ENV] ?? "";
  const expectedRef = env[SANDBOX_PROJECT_REF_ENV] ?? "";
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const urlRef = projectRefFromUrl(url);
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

  if (env[SANDBOX_ENABLED_ENV] !== "true") {
    return { enabled: false, reason: "disabled", fixtureVersion, projectRef: urlRef };
  }
  if (expectedRef !== SANDBOX_DEV_PROJECT_REF || urlRef !== SANDBOX_DEV_PROJECT_REF) {
    return { enabled: false, reason: "project_mismatch", fixtureVersion, projectRef: urlRef };
  }
  if (!url || !isPlausibleServiceRoleKey(serviceKey)) {
    return { enabled: false, reason: "missing_credentials", fixtureVersion, projectRef: urlRef };
  }
  if (fixtureVersion !== ACME_FIXTURE_VERSION) {
    return { enabled: false, reason: "unsupported_fixture", fixtureVersion, projectRef: urlRef };
  }
  return { enabled: true, reason: null, fixtureVersion, projectRef: urlRef };
}

export async function checkSandboxHealth(): Promise<SandboxAvailability> {
  const base = readSandboxAvailability();
  if (!base.enabled) return base;
  try {
    const url = supabaseUrl();
    const key = supabaseServiceKey();
    if (!url || !key) {
      return { ...base, enabled: false, reason: "missing_credentials" };
    }
    const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/proof_roles?select=id&limit=1`, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
      },
    });
    if (!response.ok) {
      return { ...base, enabled: false, reason: "health_failed" };
    }
    return base;
  } catch {
    return { ...base, enabled: false, reason: "health_failed" };
  }
}
