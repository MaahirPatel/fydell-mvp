/**
 * Conversation coordinator.
 *
 * Decides whether a coworker should speak, who speaks, and what new
 * information the message provides. "No message" is always valid.
 *
 * Decision process:
 * 1. What happened? (classify the event/message)
 * 2. Is a response useful? (check against memory)
 * 3. Which coworker owns the response? (by topic ownership)
 * 4. What new information should it provide? (not already revealed)
 * 5. Has this already been addressed? (check topics/questions)
 */
import type {
  ClassifiedMessage,
  ConversationState,
  MessageIntent,
  SpeakingDecision,
} from "./types";
import { isTopicAddressed } from "./memory";
import { classifyHelpRequest, type AssistancePolicy, DEFAULT_POLICY } from "./assistance";

export interface CoworkerInfo {
  id: string;
  /** Topic IDs this coworker owns. */
  ownsTopics: string[];
  /** Whether this coworker can answer help requests. */
  canHelp: boolean;
}

export interface CoordinatorContext {
  state: ConversationState;
  classified: ClassifiedMessage;
  messageText: string;
  /** Available coworkers and their topic ownership. */
  coworkers: CoworkerInfo[];
  /** Time since last coworker message (ms). For cooldown. */
  msSinceLastCoworkerMsg: number;
  /** Minimum ms between unsolicited coworker messages. */
  unsolicitedCooldownMs: number;
  /** Assistance policy for this scenario. */
  assistancePolicy?: AssistancePolicy;
}

/**
 * Main entry: decide whether/how to respond to a candidate message.
 */
export function decideResponse(ctx: CoordinatorContext): SpeakingDecision & {
  helpLevel?: import("./types").HelpLevel;
  helpAllowed?: boolean;
  helpReason?: string;
} {
  const { state, classified, coworkers } = ctx;
  const policy = ctx.assistancePolicy || DEFAULT_POLICY;

  // --- Step 1: Silence gate (CONSERVATIVE) ---
  // Only suppress messages we are HIGHLY confident need no response.
  // Everything else goes to the model for interpretation — a good generation
  // engine cannot answer a question it never receives.
  //
  // The model itself can return no_response_needed with full context.
  // This gate only handles the clearest cases to save unnecessary API calls.

  // Pure acknowledgments with high confidence: "thanks", "got it", "ok"
  // Must be short, match acknowledgment patterns, and have no question marks,
  // no topic keywords, and no help/diagnosis indicators.
  if (
    classified.intent === "acknowledgment" &&
    classified.confidence >= 0.85 &&
    ctx.messageText.length < 50 &&
    !ctx.messageText.includes("?") &&
    classified.topicIds.length === 0
  ) {
    return {
      shouldSpeak: false,
      silenceReason: "High-confidence acknowledgment",
    };
  }

  // Everything else — including uncertain classifications, implicit questions
  // ("I can't tell whether retries should reuse the original ID"),
  // mixed statements/questions, plan sharing, and diagnosis sharing —
  // goes to the model. The model has the full conversation context and can
  // decide no_response_needed if truly nothing is useful to say.
  //
  // Rationale: silencing a plan that reveals a misunderstanding, or a
  // diagnosis that is wrong, loses the chance for useful coworker input.
  // The cost of an unnecessary model call is lower than the cost of a
  // missed opportunity to help.

  // --- Step 4: Handle questions ---
  const questionIntents: MessageIntent[] = [
    "question_requirement",
    "question_reproduction",
    "question_constraint",
    "question_help",
  ];

  if (questionIntents.includes(classified.intent)) {
    // Special handling for explicit help requests: check assistance policy
    if (classified.intent === "question_help") {
      const help = classifyHelpRequest(ctx.messageText, state, policy);
      if (!help.allowed) {
        return {
          shouldSpeak: true, // Still respond, but to decline politely
          speakerId: selectSpeaker(classified.topicIds, coworkers, state)?.id,
          purpose: `Decline ${help.level} (policy): ${help.reason}`,
          topicId: classified.topicIds[0],
          helpLevel: help.level,
          helpAllowed: false,
          helpReason: help.reason,
        };
      }
      // Help allowed — route to appropriate coworker with level info
      const speaker = selectSpeaker(classified.topicIds, coworkers, state);
      return {
        shouldSpeak: true,
        speakerId: speaker?.id,
        purpose: `Provide ${help.level}: ${help.reason}`,
        topicId: classified.topicIds[0],
        helpLevel: help.level,
        helpAllowed: true,
        helpReason: help.reason,
      };
    }

    // Direct questions ALWAYS get a response (answer, "I don't know", or
    // clarification). Never silently discard a question because its topic
    // was discussed before. The LLM generator has the conversation history
    // and can reference prior answers, be concise, or add new detail.
    // Only suppress if this is an exact duplicate still being processed
    // (handled by idempotency, not here).
    //
    // The old "already addressed → silent" logic was too blunt. A candidate
    // may legitimately ask for clarification, forget a detail, or revisit
    // after new evidence. The model decides how to handle the repeat
    // given the full context.

    // Find the right coworker (owns the most relevant topic)
    const speaker = selectSpeaker(classified.topicIds, coworkers, state);
    if (!speaker) {
      return {
        shouldSpeak: false,
        silenceReason: "No coworker owns these topics",
      };
    }

    // Check if this exact question was already answered
    const alreadyAnswered = state.openQuestions.some(
      (q) =>
        q.answered &&
        q.topicIds.length > 0 &&
        classified.topicIds.length > 0 &&
        q.topicIds.some((t) => classified.topicIds.includes(t))
    );
    if (alreadyAnswered) {
      return {
        shouldSpeak: false,
        silenceReason: "Question already answered (by topic)",
      };
    }

    return {
      shouldSpeak: true,
      speakerId: speaker.id,
      purpose: `Answer question about ${classified.topicIds.join(", ") || "general"}`,
      topicId: classified.topicIds[0],
    };
  }

  // --- Step 5: Unclear intent ---
  if (classified.intent === "unclear") {
    // Don't guess. If confidence is very low, stay silent rather than
    // firing the generic fallback question.
    if (classified.confidence < 0.5) {
      return {
        shouldSpeak: false,
        silenceReason: "Intent unclear, avoiding generic fallback",
      };
    }
    // Medium confidence: let the topic-based routing try
    if (classified.topicIds.length > 0) {
      const speaker = selectSpeaker(classified.topicIds, coworkers, state);
      if (speaker && !classified.topicIds.every((t) => isTopicAddressed(state, t))) {
        return {
          shouldSpeak: true,
          speakerId: speaker.id,
          purpose: `Address topics: ${classified.topicIds.join(", ")}`,
          topicId: classified.topicIds[0],
        };
      }
    }
    return {
      shouldSpeak: false,
      silenceReason: "Unclear intent, no confident topic match",
    };
  }

  return {
    shouldSpeak: false,
    silenceReason: "No useful response identified",
  };
}

/**
 * Select which coworker should respond, based on topic ownership.
 * Prefers the coworker who owns the most relevant topics.
 * Falls back to the first available coworker.
 */
function selectSpeaker(
  topicIds: string[],
  coworkers: CoworkerInfo[],
  state: ConversationState
): CoworkerInfo | null {
  if (coworkers.length === 0) return null;
  if (coworkers.length === 1) return coworkers[0];

  // Score by topic ownership
  let best: CoworkerInfo | null = null;
  let bestScore = -1;

  for (const cw of coworkers) {
    let score = 0;
    for (const topicId of topicIds) {
      if (cw.ownsTopics.includes(topicId)) score += 2;
      // Bonus if this coworker already owns the topic in conversation state
      const topic = state.topics.find((t) => t.id === topicId);
      if (topic && topic.ownerId === cw.id) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = cw;
    }
  }

  // If no one owns these topics, use the first coworker
  // (they can say "I don't know" or redirect)
  return best || coworkers[0];
}

/**
 * Decide whether a proactive (unsolicited) message should be sent.
 * Much stricter than the old time-based system.
 */
export function decideProactive(
  state: ConversationState,
  trigger: {
    kind: "milestone" | "stuck" | "phase_change";
    detail: string;
  },
  msSinceLastCoworkerMsg: number,
  cooldownMs: number
): SpeakingDecision {
  // Never interrupt during active work phases without a good reason
  if (msSinceLastCoworkerMsg < cooldownMs) {
    return {
      shouldSpeak: false,
      silenceReason: "Cooldown active",
    };
  }

  // Don't send "any updates?" messages
  if (trigger.kind === "stuck") {
    return {
      shouldSpeak: false,
      silenceReason: "No status-demand messages",
    };
  }

  // Milestone acknowledgments are the only proactive messages we send
  if (trigger.kind === "milestone") {
    return {
      shouldSpeak: true,
      purpose: `Acknowledge milestone: ${trigger.detail}`,
    };
  }

  return {
    shouldSpeak: false,
    silenceReason: "No proactive message warranted",
  };
}
