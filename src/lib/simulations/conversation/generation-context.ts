/**
 * Grounded generation context builder.
 *
 * Assembles the ONLY context an LLM may use when composing a coworker response:
 * - Coworker identity, role, and permitted knowledge (with stable fact IDs)
 * - Recent conversation history
 * - Structured memory summary (topics, plans, resolved questions)
 * - Assistance policy state (what help is allowed)
 *
 * NEVER included: withholds, reference solutions, rubrics, answer keys,
 * evaluator checks, or any other protected material. Enforced by construction:
 * those fields are not parameters to any function here.
 */

import type { SimulationStakeholder } from "../types";
import type { ConversationState } from "./types";
import type { AssistancePolicy } from "./assistance";

export interface PermittedFact {
  /** Stable ID (e.g., "maya_fact_0"). */
  id: string;
  text: string;
}

export interface GenerationContext {
  coworker: {
    id: string;
    name: string;
    role: string;
  };
  /** Only facts this coworker may reveal. */
  permittedFacts: PermittedFact[];
  /** Recent messages (candidate + coworker), oldest first. */
  recentMessages: Array<{
    from: "candidate" | "coworker";
    coworkerId?: string;
    text: string;
  }>;
  /** Memory summary in plain language. */
  memorySummary: string;
  /** What help the candidate has already received. */
  assistanceState: {
    hintsUsed: number;
    maxHints: number;
    clarificationsGiven: number;
  };
  /** The candidate's current message. */
  candidateMessage: string;
}

/**
 * Assign stable IDs to a stakeholder's knowledge facts.
 * Deterministic: same stakeholder + index = same ID.
 */
export function getPermittedFacts(stakeholder: SimulationStakeholder): PermittedFact[] {
  return (stakeholder.knowledge || []).map((text, i) => ({
    id: `${stakeholder.id}_fact_${i}`,
    text,
  }));
}

export interface ContextInput {
  stakeholder: SimulationStakeholder;
  state: ConversationState;
  candidateMessage: string;
  recentMessages: GenerationContext["recentMessages"];
  policy: AssistancePolicy;
}

/**
 * Build the generation context. This is the complete boundary of what the
 * model may use. Anything not in here is not available to the model.
 */
export function buildGenerationContext(input: ContextInput): GenerationContext {
  const { stakeholder, state, candidateMessage, recentMessages, policy } = input;

  // Memory summary: what topics are open/resolved, active plan, recent help
  const parts: string[] = [];

  const openTopics = state.topics.filter((t) => t.status === "raised" || t.status === "answered");
  const resolvedTopics = state.topics.filter((t) => t.status === "resolved");
  if (openTopics.length > 0) {
    parts.push(`Open topics: ${openTopics.map((t) => t.label).join(", ")}`);
  }
  if (resolvedTopics.length > 0) {
    parts.push(`Resolved topics: ${resolvedTopics.map((t) => t.label).join(", ")}`);
  }

  const activePlan = state.plans.filter((p) => !p.superseded).pop();
  if (activePlan) {
    parts.push(`Candidate's current plan: "${activePlan.plan.slice(0, 200)}"`);
  }

  const unanswered = state.openQuestions.filter((q) => !q.answered && q.askedBy === "candidate");
  if (unanswered.length > 0) {
    parts.push(`Unanswered candidate questions: ${unanswered.length}`);
  }

  const hintsUsed = state.helpGiven.filter((h) => h.level === "hint").length;
  const clarifications = state.helpGiven.filter((h) => h.level === "clarification").length;

  return {
    coworker: {
      id: stakeholder.id,
      name: stakeholder.name,
      role: stakeholder.role,
    },
    permittedFacts: getPermittedFacts(stakeholder),
    recentMessages: recentMessages.slice(-10), // Last 10 messages max
    memorySummary: parts.join("\n") || "No prior conversation.",
    assistanceState: {
      hintsUsed,
      maxHints: policy.maxHints,
      clarificationsGiven: clarifications,
    },
    candidateMessage,
  };
}

/**
 * Format the context as a prompt section. Facts are listed with IDs so the
 * model can reference them in structured output.
 */
export function formatContextForPrompt(ctx: GenerationContext): string {
  const facts = ctx.permittedFacts.map((f) => `[${f.id}] ${f.text}`).join("\n");

  const history = ctx.recentMessages
    .map((m) => `${m.from === "candidate" ? "Candidate" : m.coworkerId || "Coworker"}: ${m.text.slice(0, 300)}`)
    .join("\n");

  return `You are ${ctx.coworker.name}, ${ctx.coworker.role}.
You are a simulated coworker in an engineering assessment. Be helpful, concise, and grounded.

PERMITTED FACTS (you may use these; reference by ID):
${facts}

CONVERSATION HISTORY:
${history || "(none)"}

MEMORY:
${ctx.memorySummary}

ASSISTANCE STATE: ${ctx.assistanceState.hintsUsed}/${ctx.assistanceState.maxHints} hints used.

RULES:
- Answer using ONLY the permitted facts above and the conversation history.
- If the candidate asks about something not in your facts, say you don't know. Do NOT invent requirements, constraints, or technical details.
- Do NOT reveal how the assessment is scored, what the "correct" solution is, or any hidden test details.
- Keep responses short (under 100 words) unless the candidate asks for detail.
- If the candidate is sharing their plan or progress (not asking a question), a brief acknowledgment is fine, or stay silent if you have nothing to add.
- Never claim to have inspected code, seen test results, or checked logs unless that evidence was provided in the conversation.`;
}
