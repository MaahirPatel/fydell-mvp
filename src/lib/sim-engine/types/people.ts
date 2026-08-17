import type { JsonValue } from "./common";

/** Candidate intent classes for deterministic persona routing. */
export type MessageIntent =
  | "ask_evidence"
  | "ask_status"
  | "request_escalation"
  | "ask_deployment"
  | "ask_auth"
  | "ask_schema"
  | "ask_logs"
  | "request_clarification"
  | "make_recommendation"
  | "unsupported_promise"
  | "acknowledge"
  | "irrelevant"
  | "greeting"
  | "other";

export type PersonChannel = "internal" | "customer" | "manager";

export interface KnowledgeFact {
  id: string;
  statement: string;
  /** Facts the persona will not volunteer until disclosure rules fire. */
  hidden?: boolean;
  disclosure?: KnowledgeDisclosure;
}

export interface KnowledgeDisclosure {
  /** Intents that unlock this fact. */
  whenAskedAbout: MessageIntent[];
  /** Optional world-state flags that must be true. */
  requiresWorldFlags?: string[];
  /** Optional world-state flags that must be false. */
  forbidsWorldFlags?: string[];
  /** Optional prior conversation topics already discussed with this person. */
  requiresPriorTopics?: string[];
}

export interface SimulationPersonDefinition {
  id: string;
  name: string;
  title: string;
  channel: PersonChannel;
  objectives: string[];
  constraints: string[];
  communicationStyle: string;
  knowledge: KnowledgeFact[];
  /** Topics this persona refuses or deflects. */
  outOfScope?: string[];
  avatarInitials?: string;
}

export interface SimulationPersonRuntime {
  id: string;
  contacted: boolean;
  unlockedFactIds: string[];
  topicsDiscussed: string[];
  lastContactedAtMs?: number;
}

export interface SimulationMessage {
  id: string;
  conversationId: string;
  personId: string;
  direction: "inbound" | "outbound";
  /** Person conversation — never an AI tool interaction. */
  kind: "person_message";
  body: string;
  intent?: MessageIntent;
  createdAtMs: number;
  metadata?: Record<string, JsonValue>;
}

export interface SimulationConversation {
  id: string;
  personId: string;
  channel: PersonChannel;
  subject?: string;
  messageIds: string[];
  unread: boolean;
}

/** AI assistant / tool usage — distinct from PersonConversation. */
export interface AiToolInteraction {
  id: string;
  kind: "ai_tool";
  prompt: string;
  response: string;
  modelLabel: string;
  accepted?: boolean;
  editedAfterResponse?: boolean;
  createdAtMs: number;
  metadata?: Record<string, JsonValue>;
}
