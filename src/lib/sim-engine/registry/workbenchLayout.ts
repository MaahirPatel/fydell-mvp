import type { SimulationScenarioDefinition } from "../types";

export interface WorkbenchTabSpec {
  value: string;
  label: string;
}

/**
 * Config-only polymorphism: center/right workbench tabs are derived from
 * scenario.capabilities + optional workbench configs, not RoleKey switches.
 */
export function centerTabsForScenario(scenario: SimulationScenarioDefinition): WorkbenchTabSpec[] {
  const caps = new Set(scenario.capabilities);
  const tabs: WorkbenchTabSpec[] = [];

  if (caps.has("workflow_rules") && scenario.rulesWorkbench) {
    tabs.push({ value: "rules", label: "Rules" });
  }
  if (caps.has("sql_execution") && scenario.sqlRuntime) {
    tabs.push({ value: "sql", label: "SQL" });
  }
  if (caps.has("api_execution") && scenario.technicalRuntime) {
    tabs.push({ value: "api", label: "API" });
  }
  if (caps.has("code_execution")) {
    tabs.push({ value: "code", label: "Script" });
  }
  if (caps.has("schema_mapping") && scenario.implementationWorkbench?.fieldMappings.length) {
    tabs.push({ value: "mapping", label: "Field mapping" });
  }
  if (caps.has("project_timeline") && scenario.implementationWorkbench?.checklist.length) {
    tabs.push({ value: "checklist", label: "Checklist" });
  }
  if (caps.has("logs") && scenario.supportWorkbench?.tickets.length) {
    tabs.push({ value: "tickets", label: "Tickets" });
  }

  tabs.push({ value: "docs", label: "Docs" });
  return tabs;
}

export function rightTabsForScenario(scenario: SimulationScenarioDefinition): WorkbenchTabSpec[] {
  const caps = new Set(scenario.capabilities);
  const tabs: WorkbenchTabSpec[] = [];

  if (caps.has("internal_chat") || caps.has("customer_communication")) {
    tabs.push({ value: "people", label: "People" });
  }
  if (caps.has("ai_assistant")) {
    tabs.push({ value: "ai", label: "AI" });
  }
  if (caps.has("artifact_composer")) {
    if (scenario.rulesWorkbench) {
      tabs.push({ value: "summary", label: "Summary" });
    } else if (scenario.supportWorkbench) {
      tabs.push({ value: "write", label: "Write-ups" });
    } else if (scenario.implementationWorkbench) {
      tabs.push({ value: "plan", label: "Plan" });
    } else if (scenario.sqlRuntime) {
      tabs.push({ value: "memo", label: "Memo" });
    } else {
      tabs.push({ value: "artifacts", label: "Artifacts" });
    }
  }

  return tabs.length ? tabs : [{ value: "people", label: "People" }];
}

export function defaultCenterTab(scenario: SimulationScenarioDefinition): string {
  return centerTabsForScenario(scenario)[0]?.value ?? "docs";
}

export function defaultRightTab(scenario: SimulationScenarioDefinition): string {
  return rightTabsForScenario(scenario)[0]?.value ?? "people";
}
