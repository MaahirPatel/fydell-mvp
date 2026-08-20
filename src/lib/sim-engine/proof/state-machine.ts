import type { ProofStage } from "./types";

export const FACT_AUTH = "AUTH_001";
export const FACT_SALES = "SALES_001";
export const FACT_CUSTOMER = "CUSTOMER_001";

export function nextFactToRelease(released: string[]): string | null {
  if (!released.includes(FACT_AUTH)) return FACT_AUTH;
  if (!released.includes(FACT_SALES)) return FACT_SALES;
  if (!released.includes(FACT_CUSTOMER)) return FACT_CUSTOMER;
  return null;
}

/** Critical facts fire from state, never from an LLM detecting an assumption. */
export function factTriggerSatisfied(input: {
  factId: string;
  released: string[];
  stage: ProofStage;
  preliminarySubmitted: boolean;
  authAcknowledged: boolean;
  salesReleased: boolean;
}): boolean {
  if (input.released.includes(input.factId)) return false;
  if (input.factId === FACT_AUTH) {
    return input.preliminarySubmitted || input.stage === "PRELIMINARY_RECOMMENDATION";
  }
  if (input.factId === FACT_SALES) {
    return input.released.includes(FACT_AUTH) && input.authAcknowledged;
  }
  if (input.factId === FACT_CUSTOMER) {
    return input.released.includes(FACT_SALES);
  }
  return false;
}

export function agentMayMentionFact(
  agent: "customer" | "engineering" | "sales",
  factId: string,
  released: string[],
): boolean {
  if (!released.includes(factId)) return false;
  if (agent === "customer" && factId === "AUTH_001") return false;
  return true;
}
