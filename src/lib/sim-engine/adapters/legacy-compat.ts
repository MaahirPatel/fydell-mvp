/**
 * Compatibility boundary between NEW ENGINE DOMAIN and LEGACY/LIVE domain.
 *
 * Pure mappers, defined and unit-tested, NOT wired to production DB writes.
 */
import type { SimulationAttempt, TelemetryEvent, CompetencyEvidence, EvidenceObservation } from "../types";

/** Shape compatible with sim_session_events insert payload (not written yet). */
export interface LegacySessionEventShape {
  event_type: string;
  actor: "candidate" | "system";
  resource_id: string | null;
  task_id: string | null;
  payload: Record<string, unknown>;
  client_event_id: string;
}

export function telemetryToLegacyEvent(event: TelemetryEvent): LegacySessionEventShape {
  const resource_id =
    event.type === "RESOURCE_OPENED" ? event.payload.resourceId : null;
  const task_id =
    event.type === "TASK_OPENED" || event.type === "TASK_STATUS_CHANGED"
      ? event.payload.taskId
      : null;

  const legacyType = mapTelemetryType(event.type);

  return {
    event_type: legacyType,
    actor: "candidate",
    resource_id,
    task_id,
    payload: {
      engine: "sim-engine",
      originalType: event.type,
      elapsedMs: event.elapsedMs,
      ...("payload" in event ? (event.payload as Record<string, unknown>) : {}),
    },
    client_event_id: event.id,
  };
}

function mapTelemetryType(type: TelemetryEvent["type"]): string {
  switch (type) {
    case "RESOURCE_OPENED":
      return "resource_opened";
    case "MESSAGE_SENT":
      return "message_sent";
    case "SIMULATION_SUBMITTED":
      return "submission_confirmed";
    case "TASK_STATUS_CHANGED":
      return "task_completed";
    case "ARTIFACT_UPDATED":
    case "ARTIFACT_CREATED":
      return "deliverable_revised";
    case "API_EXECUTE":
    case "CODE_RUN":
      return "workspace_action";
    default:
      return "workspace_action";
  }
}

/** Minimal v2-ish evidence projection for future employer report adapters. */
export interface LegacyEvidenceItemShape {
  indicator: string;
  source: "deterministic";
  quality: "strong" | "partial" | "weak" | "insufficient";
  excerpt: string;
  competency_key: string;
}

export function competencyToLegacyEvidence(c: CompetencyEvidence): LegacyEvidenceItemShape[] {
  const quality =
    c.outcome === "DEMONSTRATED"
      ? "strong"
      : c.outcome === "PARTIALLY_DEMONSTRATED"
        ? "partial"
        : c.outcome === "CONCERN"
          ? "weak"
          : "insufficient";

  return c.observations.map((o: EvidenceObservation) => ({
    indicator: c.label,
    source: "deterministic" as const,
    quality,
    excerpt: o.statement,
    competency_key: c.competencyId,
  }));
}

export function attemptToLegacySessionProjection(attempt: SimulationAttempt): {
  status: string;
  engine_version: string;
  scenario_id: string;
  scenario_version: string;
  seed: string;
  started_at: number | null;
  submitted_at: number | null;
} {
  return {
    status:
      attempt.status === "SUBMITTED"
        ? "submitted"
        : attempt.status === "IN_PROGRESS"
          ? "active"
          : "accepted",
    engine_version: attempt.metadata.engineVersion,
    scenario_id: attempt.metadata.scenarioId,
    scenario_version: attempt.metadata.scenarioVersion,
    seed: attempt.metadata.seed,
    started_at: attempt.metadata.startedAt ?? null,
    submitted_at: attempt.metadata.submittedAt ?? null,
  };
}
