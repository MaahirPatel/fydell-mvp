/**
 * Semantic event types for SimulationDefinitionV2 runtime + scoring.
 */

export type SemanticEventType =
  | "resource_opened"
  | "table_sorted"
  | "table_filtered"
  | "row_flagged"
  | "ticket_selected"
  | "step_toggled"
  | "rule_reviewed"
  | "decision_selected"
  | "evidence_selected"
  | "deliverable_revised"
  | "stakeholder_message_sent"
  | "stakeholder_reply_received"
  | "curveball_presented"
  | "submitted";

export interface SemanticEvent {
  type: SemanticEventType;
  /** Stable id when available (event log row or client-generated). */
  id?: string;
  at?: string | null;
  resourceId?: string;
  moduleId?: string;
  /** For stakeholder_reply_received: matched rule id. */
  ruleId?: string;
  /** Free-form safe payload. */
  payload?: Record<string, unknown>;
}

const KNOWN_TYPES = new Set<string>([
  "resource_opened",
  "table_sorted",
  "table_filtered",
  "row_flagged",
  "ticket_selected",
  "step_toggled",
  "rule_reviewed",
  "decision_selected",
  "evidence_selected",
  "deliverable_revised",
  "stakeholder_message_sent",
  "stakeholder_reply_received",
  "curveball_presented",
  "submitted",
]);

/** Map legacy micro event_type names onto semantic v2 types. */
const LEGACY_TYPE_MAP: Record<string, SemanticEventType> = {
  resource_opened: "resource_opened",
  deliverable_field_edited: "deliverable_revised",
  message_sent: "stakeholder_message_sent",
  message_received: "stakeholder_reply_received",
  submission_confirmed: "submitted",
  decision_selected: "decision_selected",
  evidence_selected: "evidence_selected",
  table_sorted: "table_sorted",
  table_filtered: "table_filtered",
  row_flagged: "row_flagged",
  ticket_selected: "ticket_selected",
  step_toggled: "step_toggled",
  rule_reviewed: "rule_reviewed",
  curveball_presented: "curveball_presented",
  stakeholder_message_sent: "stakeholder_message_sent",
  stakeholder_reply_received: "stakeholder_reply_received",
  submitted: "submitted",
};

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

/**
 * Normalize a loose event object (v2 or legacy micro) into a SemanticEvent.
 * Returns null when the type cannot be recognized.
 */
export function normalizeEvent(raw: unknown): SemanticEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const rawType = asString(e.type) || asString(e.event_type) || asString(e.eventType);
  if (!rawType) return null;

  const mapped = LEGACY_TYPE_MAP[rawType] || (KNOWN_TYPES.has(rawType) ? (rawType as SemanticEventType) : null);
  if (!mapped) return null;

  const payload =
    e.payload && typeof e.payload === "object" && !Array.isArray(e.payload)
      ? (e.payload as Record<string, unknown>)
      : undefined;

  const moduleId =
    asString(e.moduleId) ||
    asString(payload?.moduleId) ||
    asString(payload?.field) ||
    asString(payload?.fieldKey) ||
    asString(payload?.questionId) ||
    asString(payload?.key);

  const resourceId =
    asString(e.resourceId) ||
    asString(e.resource_id) ||
    asString(payload?.resourceId) ||
    asString(payload?.resource_id);

  const ruleId = asString(e.ruleId) || asString(payload?.ruleId) || asString(payload?.rule_id);

  return {
    type: mapped,
    id: asString(e.id),
    at: asString(e.at) || asString(e.created_at) || null,
    resourceId,
    moduleId,
    ruleId,
    payload,
  };
}
