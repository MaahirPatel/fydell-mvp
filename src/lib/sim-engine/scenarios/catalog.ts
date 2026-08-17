import type { SimulationScenarioDefinition } from "../types";
import { northstarIntegrationScenario } from "./solutions-engineer/northstar-integration";
import {
  q3ChurnInvestigationBiScenario,
  q3ChurnInvestigationScenario,
} from "./data-analyst/q3-churn-investigation";
import { brightpathLaunchImportScenario } from "./implementation-consultant/brightpath-launch-import";
import { greenStatusPageScenario } from "./technical-support/green-status-page";
import { ridgelineExecutiveQueueScenario } from "./business-systems-analyst/ridgeline-executive-queue";

/**
 * Central scenario catalog for the Simulation Architecture Engine.
 * Lab hosts and analysis should resolve scenarios only through this module.
 */
export const SCENARIO_BY_ID: Record<string, SimulationScenarioDefinition> = {
  "northstar-integration": northstarIntegrationScenario,
  "q3-churn-investigation": q3ChurnInvestigationScenario,
  "q3-churn-investigation-bi": q3ChurnInvestigationBiScenario,
  "brightpath-launch-import": brightpathLaunchImportScenario,
  "green-status-page-incident": greenStatusPageScenario,
  "ridgeline-executive-queue": ridgelineExecutiveQueueScenario,
};

export function getScenario(id: string): SimulationScenarioDefinition | null {
  return SCENARIO_BY_ID[id] ?? null;
}

export function listScenarios(): SimulationScenarioDefinition[] {
  return Object.values(SCENARIO_BY_ID);
}
