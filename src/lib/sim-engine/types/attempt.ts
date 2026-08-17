import type { RoleKey } from "./roles";
import type { VersionedIdentity, JsonValue } from "./common";
import type { SimulationTaskRuntime } from "./tasks";
import type { SimulationResourceRuntime, SimulationArtifact } from "./tasks";
import type { SimulationPersonRuntime, SimulationConversation, SimulationMessage, AiToolInteraction } from "./people";
import type { WorldStateSnapshot, ScenarioEvent } from "./events";
import type { TelemetryEvent } from "./telemetry";

export type AttemptStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTING"
  | "SUBMITTED";

export interface SimulationAttemptMetadata {
  scenarioId: string;
  scenarioVersion: string;
  engineVersion: string;
  seed: string;
  startedAt?: number;
  submittedAt?: number;
  roleKey: RoleKey;
  versions: VersionedIdentity;
}

export interface SimulationAttempt {
  id: string;
  metadata: SimulationAttemptMetadata;
  status: AttemptStatus;
  remainingTimeSeconds: number;
  activeWorkspaceTab: string;
  tasks: Record<string, SimulationTaskRuntime>;
  resources: Record<string, SimulationResourceRuntime>;
  people: Record<string, SimulationPersonRuntime>;
  conversations: Record<string, SimulationConversation>;
  messages: Record<string, SimulationMessage>;
  aiInteractions: AiToolInteraction[];
  artifacts: Record<string, SimulationArtifact>;
  world: WorldStateSnapshot;
  telemetry: TelemetryEvent[];
  scenarioEvents: ScenarioEvent[];
  /** Role workbench buffers (API/code and/or SQL). */
  workbench: {
    code: string;
    language: "javascript" | "typescript" | "python";
    apiMethod: string;
    apiPath: string;
    apiHeaders: string;
    apiBody: string;
    lastApiResult?: {
      status: number;
      body: string;
      requestId?: string;
      success: boolean;
    };
    lastCodeOutput?: string;
    sqlQuery: string;
    lastSqlResult?: {
      success: boolean;
      error?: string;
      columns: string[];
      rows: Array<Record<string, JsonValue>>;
      patternId?: string;
      rowCount: number;
    };
    /** IC cutover / launch checklist completion by item id. */
    checklist: Record<string, boolean>;
    /** IC field mapping: mapping id → chosen target field. */
    fieldMappings: Record<string, string>;
    /** TSE active ticket in the queue. */
    selectedTicketId?: string;
    /** TSE triage classification by ticket id. */
    ticketTriage: Record<string, "incident" | "unrelated" | "unknown">;
    /** BSA selected rule id under investigation. */
    selectedRuleId?: string;
    /** BSA selected recommended fix id. */
    selectedFixId?: string;
    /** BSA quantified impact selection. */
    selectedImpactCount?: number;
  };
  integrity: {
    windowBlurCount: number;
    pasteCount: number;
  };
  /** Free-form runtime scratch for tools. */
  extras?: Record<string, JsonValue>;
}
