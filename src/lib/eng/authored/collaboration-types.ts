/**
 * Candidate-visible shapes for the simulation workspace's collaboration
 * features: simulated teammates, the optional coding assistant and the small
 * set of planned scenario events. Nothing here names protected material:
 * disclosed fact ids, reference code and hidden tests stay on the server.
 *
 * Endpoints (all under /api/eng/attempts/[attemptId]/authored):
 *   GET  collaboration                         -> { collaboration: CollaborationView }
 *   POST team        TeamMessageRequest        -> { collaboration: CollaborationView }
 *   POST assistant   AssistantRequest          -> { interaction: AssistantInteractionView, used: number, limit: number }
 *   POST assistant/[interactionId]  AssistantDecisionRequest -> { interaction: AssistantInteractionView }
 *   POST review-opened (no body)               -> { collaboration: CollaborationView }
 */

export type ScenarioEventKey = "initial_context" | "review_question" | "final_handoff";

export interface TeammateView {
  id: string;
  name: string;
  title: string;
  responsibilities: string;
  /** What this simulated teammate can talk about, shown so the candidate knows whom to ask. */
  topics: string[];
}

export interface TeamMessageView {
  id: string;
  seq: number;
  sender: "candidate" | "teammate";
  teammateId: string | null;
  /** The teammate the candidate addressed; null for teammate messages. */
  toTeammateId: string | null;
  body: string;
  createdAt: string;
  kind: "message" | "scenario_event";
  eventKey: ScenarioEventKey | null;
  /**
   * How a teammate reply was produced: "model" wrote it from the scenario's
   * facts, "scenario_notes" means the model was unavailable or its draft was
   * rejected and a fixed reply from the scenario was used.
   */
  answeredFrom: "model" | "scenario_notes" | null;
}

/** "running" means the request is still being answered (another tab or a retry); poll the collaboration view. */
export type AssistantStatus = "running" | "answered" | "provider_unavailable" | "limit_reached" | "policy_blocked" | "invalid_output";

export interface AssistantPatchFile {
  path: string;
  /** Complete proposed file content. The candidate reviews a diff before accepting. */
  content: string;
}

export interface AssistantInteractionView {
  id: string;
  seq: number;
  prompt: string;
  contextPaths: string[];
  status: AssistantStatus;
  answer: string;
  patch: AssistantPatchFile[] | null;
  decision: "pending" | "accepted" | "rejected" | "none";
  decidedAt: string | null;
  /** Workspace revision saved immediately after an accepted patch was applied. */
  appliedRevision: number | null;
  createdAt: string;
}

export interface CollaborationView {
  teammates: TeammateView[];
  messages: TeamMessageView[];
  assistant: {
    enabled: boolean;
    /** The task's AI policy, as disclosed before the task started. */
    policyText: string;
    used: number;
    limit: number;
    interactions: AssistantInteractionView[];
  };
  events: Array<{ key: ScenarioEventKey; releasedAt: string }>;
  /** Disclosed before the task: which planned events can happen. */
  eventDisclosure: string;
  /** False once the attempt is submitted or closed; the thread stays readable. */
  open: boolean;
}

export interface TeamMessageRequest {
  teammateId: string;
  body: string;
  /** 8-64 chars of [A-Za-z0-9_-]; a retry with the same id never duplicates. */
  clientMsgId: string;
}

export interface AssistantRequest {
  prompt: string;
  clientMsgId: string;
  /** Files the candidate chose to share with the assistant (at most 6). */
  contextPaths: string[];
  /** Current editor content for those paths, including unsaved edits. */
  files: AssistantPatchFile[];
}

export interface AssistantDecisionRequest {
  decision: "accepted" | "rejected";
  appliedRevision?: number;
}
