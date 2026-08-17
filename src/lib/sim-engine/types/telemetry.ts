import type { JsonValue } from "./common";
import type { MessageIntent } from "./people";

/**
 * Candidate / system telemetry — what the candidate did or the runtime observed.
 * Distinct from ScenarioEvent (world events).
 */
export type TelemetryEventType =
  | "SIMULATION_STARTED"
  | "SIMULATION_SUBMITTED"
  | "TASK_OPENED"
  | "TASK_STATUS_CHANGED"
  | "RESOURCE_OPENED"
  | "RESOURCE_SEARCHED"
  | "PERSON_CONTACTED"
  | "MESSAGE_SENT"
  | "MESSAGE_RECEIVED"
  | "AI_PROMPT"
  | "AI_RESPONSE"
  | "CODE_RUN"
  | "SQL_EXECUTE"
  | "API_EXECUTE"
  | "INPUT_CHANGE"
  | "ARTIFACT_CREATED"
  | "ARTIFACT_UPDATED"
  | "TAB_CHANGE"
  | "WINDOW_BLUR"
  | "TAB_BLUR"
  | "PASTE_DETECTION"
  | "KEYSTROKE"
  | "CHECKLIST_TOGGLED"
  | "FIELD_MAPPING_SET"
  | "TICKET_SELECTED"
  | "TICKET_TRIAGED"
  | "RULE_SELECTED"
  | "FIX_SELECTED"
  | "IMPACT_SELECTED";

interface TelemetryBase {
  id: string;
  timestamp: number;
  elapsedMs: number;
  target?: string;
  source?: string;
}

export type TelemetryEvent =
  | (TelemetryBase & { type: "SIMULATION_STARTED"; payload: { scenarioId: string; seed: string } })
  | (TelemetryBase & { type: "SIMULATION_SUBMITTED"; payload: { artifactIds: string[] } })
  | (TelemetryBase & { type: "TASK_OPENED"; payload: { taskId: string } })
  | (TelemetryBase & {
      type: "TASK_STATUS_CHANGED";
      payload: { taskId: string; from: string; to: string };
    })
  | (TelemetryBase & { type: "RESOURCE_OPENED"; payload: { resourceId: string } })
  | (TelemetryBase & { type: "RESOURCE_SEARCHED"; payload: { query: string; hitCount: number } })
  | (TelemetryBase & { type: "PERSON_CONTACTED"; payload: { personId: string } })
  | (TelemetryBase & {
      type: "MESSAGE_SENT";
      payload: {
        personId: string;
        conversationId: string;
        intent: MessageIntent;
        preview: string;
      };
    })
  | (TelemetryBase & {
      type: "MESSAGE_RECEIVED";
      payload: { personId: string; conversationId: string; preview: string };
    })
  | (TelemetryBase & {
      type: "AI_PROMPT";
      payload: { interactionId: string; prompt: string; modelLabel: string };
    })
  | (TelemetryBase & {
      type: "AI_RESPONSE";
      payload: {
        interactionId: string;
        responsePreview: string;
        accepted?: boolean;
        editedAfterResponse?: boolean;
      };
    })
  | (TelemetryBase & {
      type: "CODE_RUN";
      payload: {
        language: "javascript" | "typescript" | "python" | "sql";
        code: string;
        output: string;
        success: boolean;
        durationMs?: number;
      };
    })
  | (TelemetryBase & {
      type: "SQL_EXECUTE";
      payload: {
        sql: string;
        success: boolean;
        error?: string;
        rowCount: number;
        patternId?: string;
        columns: string[];
      };
    })
  | (TelemetryBase & {
      type: "API_EXECUTE";
      payload: {
        method: string;
        path: string;
        status: number;
        success: boolean;
        requestBody?: string;
        responseBody?: string;
        requestId?: string;
      };
    })
  | (TelemetryBase & {
      type: "INPUT_CHANGE";
      payload: { field: string; length: number };
    })
  | (TelemetryBase & {
      type: "ARTIFACT_CREATED";
      payload: { artifactId: string; kind: string };
    })
  | (TelemetryBase & {
      type: "ARTIFACT_UPDATED";
      payload: { artifactId: string; kind: string; length: number };
    })
  | (TelemetryBase & { type: "TAB_CHANGE"; payload: { tab: string } })
  | (TelemetryBase & { type: "WINDOW_BLUR"; payload: { reason: "window" | "visibility" } })
  | (TelemetryBase & { type: "TAB_BLUR"; payload: Record<string, never> })
  | (TelemetryBase & { type: "PASTE_DETECTION"; payload: { length: number; target?: string } })
  | (TelemetryBase & {
      type: "KEYSTROKE";
      payload: { target: string; key?: string };
    })
  | (TelemetryBase & {
      type: "CHECKLIST_TOGGLED";
      payload: { itemId: string; completed: boolean; completedCount: number; total: number };
    })
  | (TelemetryBase & {
      type: "FIELD_MAPPING_SET";
      payload: { mappingId: string; sourceField: string; targetField: string; correct: boolean };
    })
  | (TelemetryBase & {
      type: "TICKET_SELECTED";
      payload: { ticketId: string };
    })
  | (TelemetryBase & {
      type: "TICKET_TRIAGED";
      payload: {
        ticketId: string;
        classification: "incident" | "unrelated" | "unknown";
        correct: boolean;
      };
    })
  | (TelemetryBase & {
      type: "RULE_SELECTED";
      payload: { ruleId: string; isRootCause: boolean };
    })
  | (TelemetryBase & {
      type: "FIX_SELECTED";
      payload: { fixId: string; compliant: boolean; recommended: boolean };
    })
  | (TelemetryBase & {
      type: "IMPACT_SELECTED";
      payload: { count: number; correct: boolean };
    });

export type CandidateActionEvent = TelemetryEvent;

export interface SystemRuntimeEvent {
  id: string;
  kind: "SYSTEM";
  label: string;
  createdAtMs: number;
  payload?: Record<string, JsonValue>;
}
