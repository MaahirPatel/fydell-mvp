import type { SimulationScenarioDefinition } from "../types";
import { validateScenario } from "../validation/validateScenario";
import { northstarIntegrationScenario } from "./solutions-engineer/northstar-integration";
import {
  q3ChurnInvestigationBiScenario,
  q3ChurnInvestigationScenario,
} from "./data-analyst/q3-churn-investigation";
import { northlineOperationsYieldScenario } from "./data-analyst/northline-operations-yield";
import { brightpathLaunchImportScenario } from "./implementation-consultant/brightpath-launch-import";
import { greenStatusPageScenario } from "./technical-support/green-status-page";
import { ridgelineExecutiveQueueScenario } from "./business-systems-analyst/ridgeline-executive-queue";
import { aiWorkflowHardeningScenario } from "./applied-ai-engineer/ai-workflow-hardening";

/**
 * Central scenario catalog for the Simulation Architecture Engine.
 * Lab hosts and analysis should resolve scenarios only through this module.
 */
export const SCENARIO_BY_ID: Record<string, SimulationScenarioDefinition> = {
  "northstar-integration": northstarIntegrationScenario,
  "northline-operations-yield": northlineOperationsYieldScenario,
  "q3-churn-investigation": q3ChurnInvestigationScenario,
  "q3-churn-investigation-bi": q3ChurnInvestigationBiScenario,
  "brightpath-launch-import": brightpathLaunchImportScenario,
  "green-status-page-incident": greenStatusPageScenario,
  "ridgeline-executive-queue": ridgelineExecutiveQueueScenario,
  "ai-workflow-hardening": aiWorkflowHardeningScenario,
};

export function getScenario(id: string): SimulationScenarioDefinition | null {
  return SCENARIO_BY_ID[id] ?? null;
}

export function listScenarios(): SimulationScenarioDefinition[] {
  return Object.values(SCENARIO_BY_ID);
}

/** Scenarios that pass `validateScenario()` with no errors. Only these are shown outside the lab. */
export function listValidScenarios(): SimulationScenarioDefinition[] {
  return listScenarios().filter((s) => validateScenario(s).ok);
}

export function getValidScenario(id: string): SimulationScenarioDefinition | null {
  const scenario = getScenario(id);
  return scenario && validateScenario(scenario).ok ? scenario : null;
}
