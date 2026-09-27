import "server-only";
/**
 * Deterministic stakeholder response engine.
 *
 * Every simulation ships an authored response map so the conversation works
 * with no AI provider. When OPENAI_API_KEY is configured the matched reply
 * can be lightly redrafted by a model, but the authored reply is always the
 * fallback and the model never sees answer keys or rubrics.
 *
 * Replies are session-aware: rules can require observable session conditions
 * (time elapsed, questions answered, resources opened) and the AI redraft
 * receives grounded session facts — never hidden scenario material.
 */
import type {
  RuleContextRequires,
  SimulationContent,
  SimulationStakeholder,
} from "./types";
import { describeSessionContext, type SessionChatContext } from "./chat-context";

export interface ReplyContext {
  curveballPresented: boolean;
  usedRuleIds: string[];
  /** Observable session facts. Required for context-gated rules. */
  chat: SessionChatContext;
}

function requiresSatisfied(req: RuleContextRequires | undefined, ctx: SessionChatContext): boolean {
  if (!req) return true;
  if (req.minElapsedMinutes !== undefined && ctx.elapsedMinutes < req.minElapsedMinutes)
    return false;
  if (req.minCandidateMessages !== undefined && ctx.candidateMessageCount < req.minCandidateMessages)
    return false;
  if (req.minCandidateEvents !== undefined && ctx.candidateEventCount < req.minCandidateEvents)
    return false;
  if (req.answeredQuestion !== undefined && !ctx.answeredQuestionIds.includes(req.answeredQuestion))
    return false;
  if (req.completedTask !== undefined && !ctx.completedTaskIds.includes(req.completedTask))
    return false;
  if (req.openedResource !== undefined && !ctx.openedResourceIds.includes(req.openedResource))
    return false;
  if (req.minFlaggedRows !== undefined && ctx.flaggedRowCount < req.minFlaggedRows) return false;
  return true;
}

/**
 * Interpolates a fixed allowlist of {tokens} from session context.
 * Unknown tokens are left untouched — never interpolated from raw input.
 */
export function interpolateReply(reply: string, ctx: SessionChatContext): string {
  const tokens: Record<string, string> = {
    elapsedMinutes: String(ctx.elapsedMinutes),
    answeredCount: String(ctx.answeredQuestionIds.length),
    messageCount: String(ctx.candidateMessageCount),
    eventCount: String(ctx.candidateEventCount),
    flaggedRows: String(ctx.flaggedRowCount),
  };
  return reply.replace(/\{([a-zA-Z]+)\}/g, (m, key: string) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : m
  );
}

export function selectAuthoredReply(
  stakeholder: SimulationStakeholder,
  candidateMessage: string,
  ctx: ReplyContext
): { reply: string; ruleId: string | null } {
  const text = candidateMessage.toLowerCase();
  const rules = [...stakeholder.responseRules].sort((a, b) => b.priority - a.priority);
  for (const rule of rules) {
    if (rule.requiresCurveball && !ctx.curveballPresented) continue;
    if (!requiresSatisfied(rule.requires, ctx.chat)) continue;
    if (rule.onceOnly && ctx.usedRuleIds.includes(rule.id)) continue;
    const anyHit = rule.anyKeywords.some((k) => text.includes(k.toLowerCase()));
    if (!anyHit) continue;
    if (rule.allKeywords && !rule.allKeywords.every((k) => text.includes(k.toLowerCase())))
      continue;
    return { reply: interpolateReply(rule.reply, ctx.chat), ruleId: rule.id };
  }
  return { reply: interpolateReply(stakeholder.fallbackReply, ctx.chat), ruleId: null };
}

/**
 * Optionally redraft the authored reply with an LLM for conversational flow.
 * Strict guardrails: 8s timeout, authored reply on any failure, and the
 * prompt contains only the stakeholder persona + authored reply + observed
 * session facts: never the scenario's hidden answers, rubrics, or answer key.
 */
export async function draftReply(
  stakeholder: SimulationStakeholder,
  candidateMessage: string,
  ctx: ReplyContext
): Promise<{ reply: string; ruleId: string | null; source: "authored" | "ai_redraft" }> {
  const authored = selectAuthoredReply(stakeholder, candidateMessage, ctx);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !stakeholder.aiPersona) return { ...authored, source: "authored" };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const sessionFacts = describeSessionContext(ctx.chat).join("\n- ");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 220,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              `You are ${stakeholder.name}, ${stakeholder.role}. Persona: ${stakeholder.aiPersona}\n` +
              `You must convey EXACTLY the facts in the approved reply below : no new facts, no speculation, no revealing anything beyond it. Rephrase it naturally as a short chat message responding to the candidate. Keep it under 80 words.\n` +
              `APPROVED REPLY: ${authored.reply}\n` +
              `OBSERVED SESSION FACTS (you may reference these conversationally; they are not secret):\n- ${sessionFacts}`,
          },
          { role: "user", content: candidateMessage.slice(0, 1000) },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return { ...authored, source: "authored" };
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const drafted = data.choices?.[0]?.message?.content?.trim();
    if (!drafted || drafted.length < 10) return { ...authored, source: "authored" };
    return { reply: drafted, ruleId: authored.ruleId, source: "ai_redraft" };
  } catch {
    return { ...authored, source: "authored" };
  }
}

export function findStakeholder(
  content: SimulationContent,
  stakeholderId: string
): SimulationStakeholder | null {
  return content.stakeholders.find((s) => s.id === stakeholderId) || null;
}
