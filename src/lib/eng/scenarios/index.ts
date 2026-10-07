import { createHash } from "crypto";
import { BACKEND_WEBHOOK_RETRY_V1 } from "./backend-webhook-retry/definition";
import { BACKEND_WEBHOOK_RETRY_V2 } from "./backend-webhook-retry/definition-v2";
import type { ScenarioDefinition } from "./types";

const REGISTRY: Record<string, ScenarioDefinition> = Object.fromEntries(
  [BACKEND_WEBHOOK_RETRY_V1, BACKEND_WEBHOOK_RETRY_V2].map((s) => [`${s.key}@${s.version}`, s])
);

/** New roles use this version. Earlier versions stay registered so existing attempts keep their rubric. */
export const CURRENT_SCENARIO = BACKEND_WEBHOOK_RETRY_V2;

export function getScenario(key: string, version: number): ScenarioDefinition | null {
  return REGISTRY[`${key}@${version}`] ?? null;
}

/** Matches the code printed by the starter's preflight.py for each supported runtime. */
export function expectedSetupCodes(scenario: ScenarioDefinition): Map<string, string> {
  const codes = new Map<string, string>();
  for (const runtime of scenario.supportedRuntimes) {
    const digest = createHash("sha256")
      .update(`${scenario.key}:v${scenario.version}:${runtime}`)
      .digest("hex")
      .slice(0, 8)
      .toUpperCase();
    codes.set(`${scenario.setupCodePrefix}-${digest}`, runtime);
  }
  return codes;
}

/**
 * Accepts the bare code or the whole line preflight.py printed around it.
 * Only one starter is served per scenario key, so an attempt on an earlier
 * version also accepts the code printed by a later version's starter.
 */
export function verifySetupCode(scenario: ScenarioDefinition, pasted: string): string | null {
  const match = pasted.toUpperCase().match(new RegExp(`${scenario.setupCodePrefix}-[0-9A-F]{8}`));
  if (!match) return null;
  const versions = Object.values(REGISTRY).filter((s) => s.key === scenario.key && s.version >= scenario.version);
  for (const s of versions) {
    const runtime = expectedSetupCodes(s).get(match[0]);
    if (runtime) return runtime;
  }
  return null;
}

export type { ScenarioDefinition } from "./types";
