import type { JsonValue } from "../types";
import type { ScenarioEvent, ScenarioEventKind, WorldStateSchema, WorldStateSnapshot } from "../types";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createWorldState(schema: WorldStateSchema): WorldStateSnapshot {
  return {
    flags: { ...schema.flags },
    scenarioEvents: [],
    notifications: [],
    unlockedTools: [],
  };
}

export function setWorldFlag(
  world: WorldStateSnapshot,
  flag: string,
  value: JsonValue,
  elapsedMs: number,
  emitEvent = true
): WorldStateSnapshot {
  const prev = world.flags[flag];
  if (Object.is(prev, value)) return world;
  const next: WorldStateSnapshot = {
    ...world,
    flags: { ...world.flags, [flag]: value },
  };
  if (emitEvent) {
    next.scenarioEvents = [
      ...world.scenarioEvents,
      {
        id: newId("sev"),
        kind: "WORLD_FLAG_CHANGED",
        label: `${flag} → ${JSON.stringify(value)}`,
        createdAtMs: elapsedMs,
        payload: { flag, value },
      },
    ];
  }
  return next;
}

export function getWorldFlag(world: WorldStateSnapshot, flag: string): JsonValue | undefined {
  return world.flags[flag];
}

export function flagEquals(world: WorldStateSnapshot, flag: string, equals?: JsonValue): boolean {
  const v = world.flags[flag];
  if (equals === undefined) return Boolean(v);
  return JSON.stringify(v) === JSON.stringify(equals);
}

export function pushScenarioEvent(
  world: WorldStateSnapshot,
  kind: ScenarioEventKind,
  label: string,
  elapsedMs: number,
  payload?: Record<string, JsonValue>,
  causedByEventIds?: string[]
): WorldStateSnapshot {
  const event: ScenarioEvent = {
    id: newId("sev"),
    kind,
    label,
    createdAtMs: elapsedMs,
    payload,
    causedByEventIds,
  };
  return {
    ...world,
    scenarioEvents: [...world.scenarioEvents, event],
  };
}

export function pushNotification(
  world: WorldStateSnapshot,
  message: string,
  tone: "neutral" | "warning" | "success" | "risk",
  elapsedMs: number
): WorldStateSnapshot {
  return {
    ...world,
    notifications: [
      ...world.notifications,
      { id: newId("note"), message, tone, createdAtMs: elapsedMs },
    ],
  };
}

export function unlockTool(world: WorldStateSnapshot, toolId: string): WorldStateSnapshot {
  if (world.unlockedTools.includes(toolId)) return world;
  return { ...world, unlockedTools: [...world.unlockedTools, toolId] };
}
