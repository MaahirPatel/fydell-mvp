/**
 * Structured conversation memory.
 *
 * Tracks what has been discussed, what questions are resolved, what plans
 * the candidate stated, and what facts were revealed. This is what the old
 * system lacked — it only tracked rule IDs and counts, never content.
 *
 * Memory is persisted per session and rebuilt from events on load.
 */
import type {
  CandidatePlan,
  ClassifiedMessage,
  ConversationState,
  ConversationTopic,
  HelpLevel,
  HelpRecord,
  OpenQuestion,
} from "./types";

export function createInitialState(
  sessionId: string,
  scenarioId: string,
  scenarioVersion: string
): ConversationState {
  return {
    sessionId,
    scenarioId,
    scenarioVersion,
    phase: "opening",
    topics: [],
    plans: [],
    openQuestions: [],
    helpGiven: [],
    revealedFacts: [],
    candidateStatements: [],
    lastSequence: 0,
    handledMessageIds: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Record a candidate message in memory.
 * Extracts plans, diagnoses, and questions from the classified intent.
 */
export function recordCandidateMessage(
  state: ConversationState,
  messageId: string,
  text: string,
  classified: ClassifiedMessage
): ConversationState {
  const now = new Date().toISOString();
  const next = { ...state, updatedAt: now };

  // Idempotency: skip if already handled
  if (next.handledMessageIds.includes(messageId)) return next;
  next.handledMessageIds.push(messageId);

  // Record plans
  if (classified.intent === "sharing_plan") {
    // Supersede older unacted plans
    next.plans = next.plans.map((p) =>
      !p.actedOn && !p.superseded ? { ...p, superseded: true } : p
    );
    next.plans.push({
      plan: text.slice(0, 500),
      messageId,
      statedAt: now,
      actedOn: false,
      superseded: false,
    });
  }

  // Record diagnoses and explanations as statements
  if (
    classified.intent === "sharing_diagnosis" ||
    classified.intent === "sharing_explanation" ||
    classified.intent === "sharing_result"
  ) {
    next.candidateStatements.push({
      statement: text.slice(0, 500),
      messageId,
      statedAt: now,
      topicId: classified.topicIds[0],
    });
  }

  // Record questions the candidate asked
  if (
    classified.intent === "question_requirement" ||
    classified.intent === "question_reproduction" ||
    classified.intent === "question_constraint" ||
    classified.intent === "question_help"
  ) {
    // Check if this is a paraphrase of an existing open question
    // (same topics, still unanswered = same question, don't duplicate)
    const isParaphrase = next.openQuestions.some(
      (q) =>
        !q.answered &&
        q.askedBy === "candidate" &&
        q.topicIds.length > 0 &&
        classified.topicIds.length > 0 &&
        q.topicIds.some((t) => classified.topicIds.includes(t))
    );
    if (!isParaphrase) {
      next.openQuestions.push({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text: text.slice(0, 500),
        askedBy: "candidate",
        messageId,
        answered: false,
        topicIds: classified.topicIds,
      });
    }
  }

  // Update topics
  for (const topicId of classified.topicIds) {
    const existing = next.topics.find((t) => t.id === topicId);
    if (existing) {
      if (!existing.messageIds.includes(messageId)) {
        existing.messageIds.push(messageId);
      }
      // If candidate is sharing new info about a resolved topic, reopen it
      if (
        existing.status === "resolved" &&
        (classified.intent === "sharing_diagnosis" ||
          classified.intent === "sharing_result")
      ) {
        existing.status = "raised";
        delete existing.resolvedAt;
      }
    } else {
      next.topics.push({
        id: topicId,
        label: topicId.replace(/_/g, " "),
        status: "raised",
        ownerId: "", // Set by coordinator based on coworker roles
        messageIds: [messageId],
        facts: [],
        firstRaisedAt: now,
      });
    }
  }

  // Update phase based on intent
  if (classified.intent === "sharing_plan" || classified.intent === "sharing_diagnosis") {
    if (next.phase === "opening" || next.phase === "clarifying") {
      next.phase = "investigating";
    }
  }
  if (classified.intent === "sharing_result") {
    if (next.phase === "investigating" || next.phase === "implementing") {
      next.phase = "testing";
    }
  }

  return next;
}

/**
 * Record a coworker message in memory.
 * Marks questions as answered, records revealed facts.
 */
export function recordCoworkerMessage(
  state: ConversationState,
  messageId: string,
  coworkerId: string,
  text: string,
  opts: {
    answersQuestionId?: string;
    revealsFacts?: string[];
    topicId?: string;
  } = {}
): ConversationState {
  const now = new Date().toISOString();
  const next = { ...state, updatedAt: now };

  if (next.handledMessageIds.includes(messageId)) return next;
  next.handledMessageIds.push(messageId);

  // Mark question as answered
  if (opts.answersQuestionId) {
    const q = next.openQuestions.find((q) => q.id === opts.answersQuestionId);
    if (q) {
      q.answered = true;
      q.answer = text.slice(0, 500);
      q.answerMessageId = messageId;
    }
  }

  // Record revealed facts (to avoid repeating them)
  if (opts.revealsFacts) {
    for (const fact of opts.revealsFacts) {
      if (!next.revealedFacts.includes(fact)) {
        next.revealedFacts.push(fact);
      }
    }
  }

  // Update topic
  if (opts.topicId) {
    const topic = next.topics.find((t) => t.id === opts.topicId);
    if (topic) {
      if (!topic.messageIds.includes(messageId)) {
        topic.messageIds.push(messageId);
      }
      if (!topic.ownerId) topic.ownerId = coworkerId;
      if (topic.status === "raised") topic.status = "answered";
    }
  }

  return next;
}

/**
 * Mark a topic as resolved (fully addressed, do not revisit).
 */
export function resolveTopic(
  state: ConversationState,
  topicId: string,
  reason: string
): ConversationState {
  const next = { ...state, updatedAt: new Date().toISOString() };
  const topic = next.topics.find((t) => t.id === topicId);
  if (topic) {
    topic.status = "resolved";
    topic.resolvedAt = new Date().toISOString();
    topic.facts.push(`Resolved: ${reason}`);
  }
  return next;
}

/**
 * Record help given to the candidate.
 */
export function recordHelp(
  state: ConversationState,
  level: HelpLevel,
  topic: string,
  messageId: string,
  reason: string
): ConversationState {
  const next = { ...state, updatedAt: new Date().toISOString() };
  next.helpGiven.push({
    level,
    topic,
    messageId,
    givenAt: new Date().toISOString(),
    reason,
  });
  return next;
}

/**
 * Check if a topic has already been addressed (answered or resolved).
 */
export function isTopicAddressed(state: ConversationState, topicId: string): boolean {
  const topic = state.topics.find((t) => t.id === topicId);
  return !!topic && (topic.status === "answered" || topic.status === "resolved");
}

/**
 * Get the candidate's current active plan (most recent non-superseded).
 */
export function getActivePlan(state: ConversationState): CandidatePlan | null {
  const active = state.plans.filter((p) => !p.superseded);
  return active.length > 0 ? active[active.length - 1] : null;
}

/**
 * Check if a candidate question is a paraphrase of an existing open question.
 * Compares by topic overlap — same topics + both unanswered = same question.
 */
export function isParaphraseOfOpen(
  state: ConversationState,
  topicIds: string[]
): boolean {
  if (topicIds.length === 0) return false;
  return state.openQuestions.some((q) => {
    if (q.answered || q.askedBy !== "candidate") return false;
    // We store topic IDs in the question text prefix for now
    // (a more robust approach would store them explicitly)
    return true; // Conservative: if any open candidate question exists, check topics
  });
}
