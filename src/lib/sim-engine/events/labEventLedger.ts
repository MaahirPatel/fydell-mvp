import type { JsonValue, SimulationAttempt, TelemetryEvent } from "../types";

export type LabEventStream = "WORLD" | "CANDIDATE" | "TELEMETRY" | "SYSTEM";
export type EventOrderingAuthority =
  | "BROWSER_DEV_STAND_IN"
  | "POSTGRES_CANONICAL_SEQUENCE";

export interface OrderedLabEvent {
  id: string;
  attemptId: string;
  stream: LabEventStream;
  eventType: string;
  localSequence: number;
  /**
   * Production evidence must replace localSequence with a Postgres-assigned
   * canonical sequence. Browser order is a development-only stand-in.
   */
  canonicalSequence?: number;
  orderingAuthority: EventOrderingAuthority;
  occurredAtMs: number;
  recordedAtMs: number;
  payload: Record<string, JsonValue>;
}

export interface SeparatedLabEventLedger {
  orderingAuthority: EventOrderingAuthority;
  world: OrderedLabEvent[];
  candidate: OrderedLabEvent[];
  telemetry: OrderedLabEvent[];
  system: OrderedLabEvent[];
  ordered: OrderedLabEvent[];
}

const CANDIDATE_TYPES = new Set([
  "RESOURCE_OPENED",
  "RESOURCE_SEARCHED",
  "SQL_EXECUTE",
  "MESSAGE_SENT",
  "PERSON_CONTACTED",
  "ARTIFACT_CREATED",
  "ARTIFACT_UPDATED",
  "TASK_OPENED",
  "AI_PROMPT",
  "CHECKLIST_TOGGLED",
  "FIELD_MAPPING_SET",
  "TICKET_SELECTED",
  "TICKET_TRIAGED",
  "RULE_SELECTED",
  "FIX_SELECTED",
  "IMPACT_SELECTED",
]);

const TELEMETRY_TYPES = new Set([
  "WINDOW_BLUR",
  "TAB_BLUR",
  "PASTE_DETECTION",
  "INPUT_CHANGE",
  "TAB_CHANGE",
]);

function streamForTelemetry(event: TelemetryEvent): LabEventStream {
  if (event.type === "MESSAGE_RECEIVED") return "WORLD";
  if (CANDIDATE_TYPES.has(event.type)) return "CANDIDATE";
  if (TELEMETRY_TYPES.has(event.type)) return "TELEMETRY";
  return "SYSTEM";
}

export function buildSeparatedLabLedger(attempt: SimulationAttempt): SeparatedLabEventLedger {
  const staged: Array<Omit<OrderedLabEvent, "localSequence"> & { stableIndex: number }> = [];
  let stableIndex = 0;

  for (const event of attempt.telemetry) {
    staged.push({
      id: event.id,
      attemptId: attempt.id,
      stream: streamForTelemetry(event),
      eventType: event.type,
      orderingAuthority: "BROWSER_DEV_STAND_IN",
      occurredAtMs: event.timestamp,
      recordedAtMs: event.timestamp,
      payload: event.payload,
      stableIndex: stableIndex++,
    });
  }

  for (const event of attempt.world.scenarioEvents) {
    const timestamp = (attempt.metadata.startedAt ?? 0) + event.createdAtMs;
    staged.push({
      id: event.id,
      attemptId: attempt.id,
      stream: "WORLD",
      eventType: event.kind,
      orderingAuthority: "BROWSER_DEV_STAND_IN",
      occurredAtMs: timestamp,
      recordedAtMs: timestamp,
      payload: event.payload ?? {},
      stableIndex: stableIndex++,
    });
  }

  const ordered = staged
    .sort(
      (left, right) =>
        left.recordedAtMs - right.recordedAtMs || left.stableIndex - right.stableIndex
    )
    .map((event, index) => ({
      id: event.id,
      attemptId: event.attemptId,
      stream: event.stream,
      eventType: event.eventType,
      localSequence: index + 1,
      canonicalSequence: event.canonicalSequence,
      orderingAuthority: event.orderingAuthority,
      occurredAtMs: event.occurredAtMs,
      recordedAtMs: event.recordedAtMs,
      payload: event.payload,
    }));

  return {
    orderingAuthority: "BROWSER_DEV_STAND_IN",
    world: ordered.filter((event) => event.stream === "WORLD"),
    candidate: ordered.filter((event) => event.stream === "CANDIDATE"),
    telemetry: ordered.filter((event) => event.stream === "TELEMETRY"),
    system: ordered.filter((event) => event.stream === "SYSTEM"),
    ordered,
  };
}

export function assertCanonicalEventOrder(events: OrderedLabEvent[]): void {
  events.forEach((event, index) => {
    if (event.orderingAuthority !== "POSTGRES_CANONICAL_SEQUENCE") {
      throw new Error("Canonical analysis requires Postgres-assigned event ordering.");
    }
    if (event.canonicalSequence !== index + 1) {
      throw new Error(`Canonical event sequence is not contiguous at ${event.id}.`);
    }
  });
}
