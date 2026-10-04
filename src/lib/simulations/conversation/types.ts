/**
 * Conversation coordinator types.
 *
 * One shared conversation state per session. The coordinator decides whether
 * a coworker should speak, who speaks, and what new information the message
 * provides. "No message" is always a valid outcome.
 */

export type ConversationPhase =
  | "opening"      // Session just started, welcome sent
  | "clarifying"   // Candidate asking about requirements/scope
  | "investigating" // Candidate diagnosing the problem
  | "implementing"  // Candidate writing the fix
  | "testing"       // Candidate running/adding tests
  | "handoff"       // Candidate explaining/submitting
  | "closed";       // Submitted, no unsolicited chat

export type TopicStatus =
  | "raised"    // Mentioned but not addressed
  | "answered"  // Addressed with a response
  | "resolved"  // Fully resolved, do not revisit
  | "obsolete"; // Made irrelevant by later work

export interface ConversationTopic {
  /** Stable topic ID (e.g., "retry_backoff_params", "api_compat_404"). */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Current status. */
  status: TopicStatus;
  /** Which coworker owns this topic. */
  ownerId: string;
  /** Message IDs that discussed this topic. */
  messageIds: string[];
  /** Key facts established about this topic. */
  facts: string[];
  /** When first raised (ISO timestamp). */
  firstRaisedAt: string;
  /** When resolved, if resolved. */
  resolvedAt?: string;
}

export interface CandidatePlan {
  /** What the candidate said they will do. */
  plan: string;
  /** Message ID where stated. */
  messageId: string;
  /** When stated. */
  statedAt: string;
  /** Whether the candidate has acted on it (inferred from events). */
  actedOn: boolean;
  /** Whether superseded by a newer plan. */
  superseded: boolean;
}

export interface OpenQuestion {
  /** Stable question ID. */
  id: string;
  /** The question text (as asked). */
  text: string;
  /** Who asked (coworker ID or "candidate"). */
  askedBy: string;
  /** Message ID of the question. */
  messageId: string;
  /** Whether the candidate/coworker has addressed it. */
  answered: boolean;
  /** The answer, if given. */
  answer?: string;
  /** Message ID of the answer. */
  answerMessageId?: string;
  /** Topic IDs this question relates to (for paraphrase detection). */
  topicIds: string[];
}

export type HelpLevel = "none" | "clarification" | "direction" | "hint" | "solution";

export interface HelpRecord {
  level: HelpLevel;
  topic: string;
  messageId: string;
  givenAt: string;
  /** Why this help level was appropriate. */
  reason: string;
}

export interface ConversationState {
  sessionId: string;
  scenarioId: string;
  scenarioVersion: string;
  phase: ConversationPhase;
  topics: ConversationTopic[];
  plans: CandidatePlan[];
  openQuestions: OpenQuestion[];
  helpGiven: HelpRecord[];
  /** Facts the coworkers have revealed (to avoid repeating). */
  revealedFacts: string[];
  /** Candidate's stated explanations/decisions. */
  candidateStatements: Array<{
    statement: string;
    messageId: string;
    statedAt: string;
    topicId?: string;
  }>;
  /** Sequence number of last processed event/message. */
  lastSequence: number;
  /** Message IDs already handled (idempotency). */
  handledMessageIds: string[];
  updatedAt: string;
}

export type MessageIntent =
  | "question_requirement"  // Asking about requirements, scope, expected behavior
  | "question_reproduction" // Asking how to reproduce
  | "question_constraint"   // Asking about constraints, allowed changes
  | "question_help"         // Explicitly requesting help
  | "sharing_plan"          // Stating what they intend to do
  | "sharing_diagnosis"     // Sharing what they found/think the problem is
  | "sharing_result"        // Reporting a test result or outcome
  | "sharing_explanation"   // Explaining their approach/decision
  | "acknowledgment"        // "ok", "thanks", "got it" — no response needed
  | "off_topic"             // Unrelated to the scenario
  | "unclear";              // Cannot determine intent

export interface ClassifiedMessage {
  intent: MessageIntent;
  /** Topic IDs this message relates to (may be empty). */
  topicIds: string[];
  /** Confidence 0-1. */
  confidence: number;
  /** Key entities mentioned (files, functions, concepts). */
  entities: string[];
}

export interface SpeakingDecision {
  /** Whether any coworker should speak. */
  shouldSpeak: boolean;
  /** Which coworker should speak (if shouldSpeak). */
  speakerId?: string;
  /** What new information or action the message provides. */
  purpose?: string;
  /** Topic this addresses (if any). */
  topicId?: string;
  /** Reason for silence (if not speaking). */
  silenceReason?: string;
}
