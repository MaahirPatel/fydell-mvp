import type { SimulationCapability } from "./roles";
import type { JsonValue } from "./common";

export type TaskStatus =
  | "LOCKED"
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED";

export type TaskPriority = "low" | "normal" | "high" | "critical";

export interface SimulationTaskDefinition {
  id: string;
  title: string;
  description: string;
  initialStatus: TaskStatus;
  priority: TaskPriority;
  /** Task IDs that must complete before this can become AVAILABLE. */
  dependsOn?: string[];
  /** If present, completion is derived — not checkbox-driven. */
  completion?: TaskCompletionRule;
  competencyIds?: string[];
}

export type TaskCompletionRule =
  | { kind: "WORLD_FLAG"; flag: string; equals?: JsonValue }
  | { kind: "ARTIFACT_EXISTS"; artifactKind: string }
  | { kind: "ARTIFACT_FIELD"; artifactKind: string; field: string; equals?: JsonValue }
  | { kind: "TELEMETRY"; eventType: string; minCount?: number }
  | { kind: "ALL"; rules: TaskCompletionRule[] }
  | { kind: "ANY"; rules: TaskCompletionRule[] };

export interface SimulationTaskRuntime {
  id: string;
  status: TaskStatus;
  priority: TaskPriority;
  openedAtMs?: number;
  completedAtMs?: number;
  blockedReason?: string;
}

export interface SimulationResourceDefinition {
  id: string;
  title: string;
  kind:
    | "markdown"
    | "json"
    | "log"
    | "schema"
    | "payload"
    | "csv"
    | "documentation"
    | "brief";
  /** Initially visible to the candidate. */
  initiallyVisible: boolean;
  summary?: string;
  content: string;
  tags?: string[];
  /** Optional search keywords for resource browser. */
  searchableText?: string;
  /** World flags set when this resource is opened. */
  onOpenFlags?: Record<string, JsonValue>;
}

export interface SimulationResourceRuntime {
  id: string;
  visible: boolean;
  opened: boolean;
  openedAtMs?: number;
  searchHits?: number;
}

export type ArtifactKind =
  | "integration_code"
  | "api_request"
  | "customer_message"
  | "internal_message"
  | "executive_summary"
  | "technical_recommendation"
  | "analysis_memo"
  | "sql_query"
  | "cutover_plan"
  | "escalation_note"
  | "note"
  | "other";

export interface SimulationArtifactDefinition {
  id: string;
  kind: ArtifactKind;
  title: string;
  required: boolean;
  description?: string;
}

export interface SimulationArtifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  createdAtMs: number;
  updatedAtMs: number;
  metadata?: Record<string, JsonValue>;
}

export interface SimulationConstraints {
  aiPolicy: "DISALLOWED" | "ALLOWED" | "REQUIRED" | "INTEGRATED_ONLY";
  externalResourcesPolicy: "CLOSED" | "LIMITED" | "OPEN";
  clipboardPolicy?: "DISALLOWED" | "ALLOWED" | "TRACKED";
  maxTabBlurs?: number;
}

export interface SimulationCompetencyDefinition {
  id: string;
  label: string;
  description: string;
  /** Weight for presentation only — never a magic score alone. */
  weight?: number;
}

export type SimulationCapabilitySet = readonly SimulationCapability[];
