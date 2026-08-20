export const EVENT_STREAMS = ["candidate_work", "scenario_delivery", "analysis", "review"] as const;
export type EventStream = (typeof EVENT_STREAMS)[number];

export const SANDBOX_EVENT_TYPES = [
  "WALKTHROUGH_STARTED",
  "ARTIFACT_REVISION",
  "DECISION_COMMITTED",
  "FACT_RELEASED",
  "STAGE_CHANGED",
  "DEFENSE_QUESTION_ASKED",
  "DEFENSE_RESPONSE_RECEIVED",
  "ANALYSIS_STARTED",
  "ANALYSIS_COMPLETED",
  "REVIEW_RECORDED",
  "RECEIPT_ISSUED",
  "AUTOSAVE_FAILED",
  "RUN_RECOVERED",
] as const;
export type SandboxEventType = (typeof SANDBOX_EVENT_TYPES)[number];

export interface SandboxEventEnvelope {
  stream: EventStream;
  event_type: SandboxEventType;
  sequence_number: number | null;
  correlation_id: string;
  idempotency_key: string;
  actor_type: string;
  actor_id: string | null;
  occurred_at: string;
  received_at: string;
  payload_version: 1;
  payload: Record<string, unknown>;
}

export function streamForEventType(type: SandboxEventType): EventStream {
  if (type === "FACT_RELEASED" || type === "WALKTHROUGH_STARTED") return "scenario_delivery";
  if (type === "ANALYSIS_STARTED" || type === "ANALYSIS_COMPLETED" || type === "DEFENSE_QUESTION_ASKED") return "analysis";
  if (type === "REVIEW_RECORDED" || type === "RECEIPT_ISSUED") return "review";
  return "candidate_work";
}

export function sourceForStream(stream: EventStream): "WORLD" | "CANDIDATE" | "SYSTEM" {
  if (stream === "candidate_work") return "CANDIDATE";
  if (stream === "scenario_delivery") return "WORLD";
  return "SYSTEM";
}

export function buildEventPayload(envelope: Omit<SandboxEventEnvelope, "sequence_number">): Record<string, unknown> {
  return {
    stream: envelope.stream,
    event_type: envelope.event_type,
    correlation_id: envelope.correlation_id,
    idempotency_key: envelope.idempotency_key,
    actor_type: envelope.actor_type,
    actor_id: envelope.actor_id,
    occurred_at: envelope.occurred_at,
    received_at: envelope.received_at,
    payload_version: 1,
    payload: envelope.payload,
  };
}

export function parseEventContract(payload: unknown): {
  stream: EventStream;
  event_type: string;
  correlation_id: string;
  idempotency_key: string;
  payload_version: number;
} {
  if (!payload || typeof payload !== "object") {
    throw new Error("Event payload missing");
  }
  const row = payload as Record<string, unknown>;
  const stream = row.stream;
  if (typeof stream !== "string" || !(EVENT_STREAMS as readonly string[]).includes(stream)) {
    throw new Error("Event stream required");
  }
  if (typeof row.event_type !== "string") throw new Error("event_type required");
  if (typeof row.correlation_id !== "string") throw new Error("correlation_id required");
  if (typeof row.idempotency_key !== "string") throw new Error("idempotency_key required");
  if (row.payload_version !== 1) throw new Error("payload_version must be 1");
  return {
    stream: stream as EventStream,
    event_type: row.event_type,
    correlation_id: row.correlation_id,
    idempotency_key: row.idempotency_key,
    payload_version: 1,
  };
}
