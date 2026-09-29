import { createHash } from "crypto";
import { BACKEND_WEBHOOK_RETRY_V1 } from "./backend-webhook-retry/definition";
import type { ScenarioDefinition } from "./types";

const REGISTRY: Record<string, ScenarioDefinition> = {
  [`${BACKEND_WEBHOOK_RETRY_V1.key}@${BACKEND_WEBHOOK_RETRY_V1.version}`]: BACKEND_WEBHOOK_RETRY_V1,
};

export const CURRENT_SCENARIO = BACKEND_WEBHOOK_RETRY_V1;

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

/** Accepts the bare code or the whole line preflight.py printed around it. */
export function verifySetupCode(scenario: ScenarioDefinition, pasted: string): string | null {
  const match = pasted.toUpperCase().match(new RegExp(`${scenario.setupCodePrefix}-[0-9A-F]{8}`));
  return match ? (expectedSetupCodes(scenario).get(match[0]) ?? null) : null;
}

export type { ScenarioDefinition } from "./types";
