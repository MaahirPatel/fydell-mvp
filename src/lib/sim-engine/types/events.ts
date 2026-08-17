import type { JsonValue } from "./common";

/**
 * World / scenario events — things the simulation does.
 * Distinct from candidate telemetry.
 */
export type ScenarioEventKind =
  | "API_FAILURE"
  | "API_SUCCESS"
  | "CUSTOMER_ESCALATION"
  | "SCOPE_CONCERN"
  | "RESOURCE_REVEALED"
  | "TASK_REPRIORITIZED"
  | "NOTIFICATION"
  | "WORLD_FLAG_CHANGED"
  | "PERSON_REPLIED"
  | "DEPLOYMENT_HINT"
  | "REQUEST_ID_ISSUED"
  | "CUSTOM";

export interface ScenarioEvent {
  id: string;
  kind: ScenarioEventKind;
  label: string;
  createdAtMs: number;
  /** Candidate action / telemetry ids that caused this. */
  causedByEventIds?: string[];
  payload?: Record<string, JsonValue>;
}

export type EventTrigger =
  | { kind: "TIME"; afterMs: number; once?: boolean }
  | { kind: "TELEMETRY"; eventType: string; minCount?: number }
  | { kind: "TASK"; taskId: string; status: string }
  | { kind: "ARTIFACT"; artifactKind: string }
  | { kind: "WORLD_STATE"; flag: string; equals?: JsonValue }
  | { kind: "RULE"; ruleId: string }
  | { kind: "ALL"; triggers: EventTrigger[] }
  | { kind: "ANY"; triggers: EventTrigger[] };

export type EventAction =
  | { kind: "SEND_MESSAGE"; personId: string; body: string; subject?: string }
  | { kind: "REVEAL_RESOURCE"; resourceId: string }
  | { kind: "CREATE_TASK"; task: import("./tasks").SimulationTaskDefinition }
  | { kind: "CHANGE_TASK_PRIORITY"; taskId: string; priority: import("./tasks").TaskPriority }
  | { kind: "UPDATE_WORLD_STATE"; flag: string; value: JsonValue }
  | { kind: "ADD_INBOX_ITEM"; personId: string; body: string; subject?: string }
  | { kind: "SHOW_NOTIFICATION"; message: string; tone?: "neutral" | "warning" | "success" | "risk" }
  | { kind: "UNLOCK_TOOL"; toolId: string }
  | { kind: "EMIT_SCENARIO_EVENT"; scenarioKind: ScenarioEventKind; label: string; payload?: Record<string, JsonValue> };

export interface SimulationEventDefinition {
  id: string;
  label: string;
  trigger: EventTrigger;
  actions: EventAction[];
  /** Fire at most once unless false. */
  once?: boolean;
}

export interface WorldStateSchema {
  /** Declared flags with default values. */
  flags: Record<string, JsonValue>;
}

export interface WorldStateSnapshot {
  flags: Record<string, JsonValue>;
  scenarioEvents: ScenarioEvent[];
  notifications: Array<{
    id: string;
    message: string;
    tone: "neutral" | "warning" | "success" | "risk";
    createdAtMs: number;
  }>;
  unlockedTools: string[];
}
