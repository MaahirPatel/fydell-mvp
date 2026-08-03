import "server-only";
/**
 * Deterministic stakeholder response engine.
 *
 * Every simulation ships an authored response map so the conversation works
 * with no AI provider. When OPENAI_API_KEY is configured the matched reply
 * can be lightly redrafted by a model, but the authored reply is always the
 * fallback and the model never sees answer keys or rubrics.
 */
import type { SimulationContent, SimulationStakeholder } from "./types";

export interface ReplyContext {
  curveballPresented: boolean;
  usedRuleIds: string[];
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
    if (rule.onceOnly && ctx.usedRuleIds.includes(rule.id)) continue;
    const anyHit = rule.anyKeywords.some((k) => text.includes(k.toLowerCase()));
    if (!anyHit) continue;
    if (rule.allKeywords && !rule.allKeywords.every((k) => text.includes(k.toLowerCase())))
      continue;
    return { reply: rule.reply, ruleId: rule.id };
  }
  return { reply: stakeholder.fallbackReply, ruleId: null };
}

/**
 * Optionally redraft the authored reply with an LLM for conversational flow.
 * Strict guardrails: 8s timeout, authored reply on any failure, and the
 * prompt contains only the stakeholder persona + authored reply : never the
 * scenario's hidden answers.
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
              `APPROVED REPLY: ${authored.reply}`,
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
