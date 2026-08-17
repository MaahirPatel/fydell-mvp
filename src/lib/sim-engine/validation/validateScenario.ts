import type { SimulationScenarioDefinition } from "../types";

export interface ScenarioValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
}

export interface ScenarioValidationResult {
  ok: boolean;
  issues: ScenarioValidationIssue[];
}

function uniqueIds(ids: string[], label: string, issues: ScenarioValidationIssue[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push({ level: "error", code: "DUPLICATE_ID", message: `Duplicate ${label} id: ${id}` });
    }
    seen.add(id);
  }
}

/**
 * Validate scenario configuration before start.
 * Configuration errors should fail loudly, not become mysterious runtime bugs.
 */
export function validateScenario(scenario: SimulationScenarioDefinition): ScenarioValidationResult {
  const issues: ScenarioValidationIssue[] = [];

  if (!scenario.metadata.id) {
    issues.push({ level: "error", code: "MISSING_ID", message: "metadata.id is required" });
  }
  if (!scenario.versions.scenarioVersion) {
    issues.push({ level: "error", code: "MISSING_VERSION", message: "versions.scenarioVersion is required" });
  }
  if (!scenario.versions.engineVersion) {
    issues.push({ level: "error", code: "MISSING_ENGINE_VERSION", message: "versions.engineVersion is required" });
  }

  uniqueIds(scenario.tasks.map((t) => t.id), "task", issues);
  uniqueIds(scenario.resources.map((r) => r.id), "resource", issues);
  uniqueIds(scenario.people.map((p) => p.id), "person", issues);
  uniqueIds(scenario.artifacts.map((a) => a.id), "artifact", issues);
  uniqueIds(scenario.competencies.map((c) => c.id), "competency", issues);
  uniqueIds(scenario.events.map((e) => e.id), "event", issues);
  uniqueIds(scenario.tools.map((t) => t.id), "tool", issues);

  const taskIds = new Set(scenario.tasks.map((t) => t.id));
  const resourceIds = new Set(scenario.resources.map((r) => r.id));
  const personIds = new Set(scenario.people.map((p) => p.id));
  const competencyIds = new Set(scenario.competencies.map((c) => c.id));

  for (const task of scenario.tasks) {
    for (const dep of task.dependsOn ?? []) {
      if (!taskIds.has(dep)) {
        issues.push({
          level: "error",
          code: "BAD_DEPENDENCY",
          message: `Task ${task.id} depends on missing task ${dep}`,
        });
      }
    }
    for (const c of task.competencyIds ?? []) {
      if (!competencyIds.has(c)) {
        issues.push({
          level: "error",
          code: "BAD_COMPETENCY",
          message: `Task ${task.id} references missing competency ${c}`,
        });
      }
    }
  }

  // Detect impossible cycles (simple DFS)
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  function dfs(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    stack.push(id);
    const t = scenario.tasks.find((x) => x.id === id);
    for (const dep of t?.dependsOn ?? []) {
      if (dfs(dep)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    stack.pop();
    return false;
  }
  for (const t of scenario.tasks) {
    if (dfs(t.id)) {
      issues.push({
        level: "error",
        code: "TASK_CYCLE",
        message: `Circular task dependency involving ${t.id}`,
      });
      break;
    }
  }

  for (const event of scenario.events) {
    for (const action of event.actions) {
      if (action.kind === "REVEAL_RESOURCE" && !resourceIds.has(action.resourceId)) {
        issues.push({
          level: "error",
          code: "BAD_REVEAL",
          message: `Event ${event.id} reveals missing resource ${action.resourceId}`,
        });
      }
      if (
        (action.kind === "SEND_MESSAGE" || action.kind === "ADD_INBOX_ITEM") &&
        !personIds.has(action.personId)
      ) {
        issues.push({
          level: "error",
          code: "BAD_PERSON",
          message: `Event ${event.id} references missing person ${action.personId}`,
        });
      }
      if (action.kind === "CHANGE_TASK_PRIORITY" && !taskIds.has(action.taskId)) {
        issues.push({
          level: "error",
          code: "BAD_TASK_REF",
          message: `Event ${event.id} changes priority of missing task ${action.taskId}`,
        });
      }
    }
  }

  // Hidden resources should be reachable via some REVEAL_RESOURCE action
  const revealable = new Set(
    scenario.events.flatMap((e) =>
      e.actions.filter((a) => a.kind === "REVEAL_RESOURCE").map((a) => (a as { resourceId: string }).resourceId)
    )
  );
  for (const r of scenario.resources) {
    if (!r.initiallyVisible && !revealable.has(r.id)) {
      issues.push({
        level: "warning",
        code: "UNREACHABLE_HIDDEN_RESOURCE",
        message: `Hidden resource ${r.id} is never revealed by any event`,
      });
    }
  }

  // Capabilities vs tools
  for (const cap of scenario.capabilities) {
    const tool = scenario.tools.find((t) => t.capability === cap);
    if (!tool && ["code_execution", "api_execution", "ai_assistant", "sql_execution"].includes(cap)) {
      issues.push({
        level: "warning",
        code: "CAPABILITY_WITHOUT_TOOL",
        message: `Capability ${cap} declared without a matching tool`,
      });
    }
  }

  if (scenario.capabilities.includes("sql_execution") && !scenario.sqlRuntime) {
    issues.push({
      level: "error",
      code: "SQL_RUNTIME_REQUIRED",
      message: "sql_execution capability requires sqlRuntime configuration",
    });
  }

  if (scenario.capabilities.includes("schema_mapping") && !scenario.implementationWorkbench?.fieldMappings.length) {
    issues.push({
      level: "error",
      code: "FIELD_MAPPING_REQUIRED",
      message: "schema_mapping capability requires implementationWorkbench.fieldMappings",
    });
  }

  if (scenario.capabilities.includes("project_timeline") && !scenario.implementationWorkbench?.checklist.length) {
    issues.push({
      level: "warning",
      code: "CHECKLIST_MISSING",
      message: "project_timeline capability usually includes an implementation checklist",
    });
  }

  if (
    scenario.metadata.roleKey === "technical_support_engineer" &&
    !scenario.supportWorkbench?.tickets.length
  ) {
    issues.push({
      level: "error",
      code: "TICKETS_REQUIRED",
      message: "technical_support_engineer scenarios require supportWorkbench.tickets",
    });
  }

  if (scenario.capabilities.includes("workflow_rules") && !scenario.rulesWorkbench?.rules.length) {
    issues.push({
      level: "error",
      code: "RULES_WORKBENCH_REQUIRED",
      message: "workflow_rules capability requires rulesWorkbench.rules",
    });
  }

  if (
    scenario.metadata.roleKey === "business_systems_analyst" &&
    !scenario.capabilities.includes("workflow_rules")
  ) {
    issues.push({
      level: "warning",
      code: "BSA_WITHOUT_RULES",
      message: "BSA scenarios typically declare workflow_rules",
    });
  }

  if (scenario.metadata.roleKey !== "solutions_engineer" && scenario.metadata.id.includes("northstar")) {
    issues.push({
      level: "warning",
      code: "ROLE_MISMATCH",
      message: "Northstar scenario expected solutions_engineer RoleKey",
    });
  }

  if (
    (scenario.metadata.roleKey === "data_analyst" || scenario.metadata.roleKey === "bi_analyst") &&
    !scenario.capabilities.includes("sql_execution")
  ) {
    issues.push({
      level: "warning",
      code: "DA_WITHOUT_SQL",
      message: "Data/BI scenarios typically declare sql_execution",
    });
  }

  const ok = !issues.some((i) => i.level === "error");
  return { ok, issues };
}
