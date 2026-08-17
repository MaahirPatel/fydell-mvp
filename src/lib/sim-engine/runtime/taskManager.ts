import type {
  SimulationAttempt,
  SimulationScenarioDefinition,
  SimulationTaskDefinition,
  SimulationTaskRuntime,
  TaskCompletionRule,
  TaskPriority,
  TaskStatus,
  TelemetryEvent,
} from "../types";
import { flagEquals } from "./worldState";

export function initTasks(
  definitions: SimulationTaskDefinition[]
): Record<string, SimulationTaskRuntime> {
  const out: Record<string, SimulationTaskRuntime> = {};
  for (const d of definitions) {
    out[d.id] = {
      id: d.id,
      status: d.initialStatus,
      priority: d.priority,
    };
  }
  return out;
}

function evalCompletion(
  rule: TaskCompletionRule,
  attempt: SimulationAttempt
): boolean {
  switch (rule.kind) {
    case "WORLD_FLAG":
      return flagEquals(attempt.world, rule.flag, rule.equals);
    case "ARTIFACT_EXISTS":
      return Object.values(attempt.artifacts).some((a) => a.kind === rule.artifactKind && a.content.trim().length > 0);
    case "ARTIFACT_FIELD": {
      const art = Object.values(attempt.artifacts).find((a) => a.kind === rule.artifactKind);
      if (!art) return false;
      if (!rule.equals) return art.content.trim().length > 0;
      const meta = art.metadata?.[rule.field];
      return JSON.stringify(meta) === JSON.stringify(rule.equals);
    }
    case "TELEMETRY": {
      const count = attempt.telemetry.filter((e) => e.type === rule.eventType).length;
      return count >= (rule.minCount ?? 1);
    }
    case "ALL":
      return rule.rules.every((r) => evalCompletion(r, attempt));
    case "ANY":
      return rule.rules.some((r) => evalCompletion(r, attempt));
    default:
      return false;
  }
}

export function syncTaskStatuses(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt,
  elapsedMs: number
): { tasks: Record<string, SimulationTaskRuntime>; changes: Array<{ taskId: string; from: TaskStatus; to: TaskStatus }> } {
  const tasks = { ...attempt.tasks };
  const changes: Array<{ taskId: string; from: TaskStatus; to: TaskStatus }> = [];

  for (const def of scenario.tasks) {
    const runtime = tasks[def.id];
    if (!runtime) continue;

    // Unlock dependencies
    if (runtime.status === "LOCKED" && def.dependsOn?.length) {
      const depsMet = def.dependsOn.every((id) => tasks[id]?.status === "COMPLETED");
      if (depsMet) {
        changes.push({ taskId: def.id, from: runtime.status, to: "AVAILABLE" });
        tasks[def.id] = { ...runtime, status: "AVAILABLE" };
      }
    }

    const current = tasks[def.id];
    if (!current) continue;

    if (def.completion && (current.status === "AVAILABLE" || current.status === "IN_PROGRESS" || current.status === "BLOCKED")) {
      if (evalCompletion(def.completion, { ...attempt, tasks })) {
        changes.push({ taskId: def.id, from: current.status, to: "COMPLETED" });
        tasks[def.id] = { ...current, status: "COMPLETED", completedAtMs: elapsedMs };
      }
    }
  }

  return { tasks, changes };
}

export function openTask(
  tasks: Record<string, SimulationTaskRuntime>,
  taskId: string,
  elapsedMs: number
): Record<string, SimulationTaskRuntime> {
  const t = tasks[taskId];
  if (!t) return tasks;
  if (t.status === "LOCKED" || t.status === "COMPLETED") return tasks;
  return {
    ...tasks,
    [taskId]: {
      ...t,
      status: t.status === "AVAILABLE" ? "IN_PROGRESS" : t.status,
      openedAtMs: t.openedAtMs ?? elapsedMs,
    },
  };
}

export function setTaskPriority(
  tasks: Record<string, SimulationTaskRuntime>,
  taskId: string,
  priority: TaskPriority
): Record<string, SimulationTaskRuntime> {
  const t = tasks[taskId];
  if (!t) return tasks;
  return { ...tasks, [taskId]: { ...t, priority } };
}

export function addTaskDefinition(
  attemptTasks: Record<string, SimulationTaskRuntime>,
  def: SimulationTaskDefinition
): Record<string, SimulationTaskRuntime> {
  if (attemptTasks[def.id]) return attemptTasks;
  return {
    ...attemptTasks,
    [def.id]: { id: def.id, status: def.initialStatus, priority: def.priority },
  };
}

export function countTelemetry(events: TelemetryEvent[], type: string): number {
  return events.filter((e) => e.type === type).length;
}
