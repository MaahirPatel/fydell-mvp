import type { ChatMessage } from "@/lib/ai/provider";
import type { ClarificationRule, ScenarioDefinition } from "./scenarios/types";

/**
 * Teammate replies. Facts always come from the scenario's authored
 * clarification rules, filtered by world state, so every candidate has access
 * to the same information and nothing about the hidden checks can leak. When a
 * model is configured it phrases the reply in the teammate's voice and in the
 * context of the conversation; `selectReply` is the deterministic fallback and
 * the relevance hint for the model.
 */
export function tokenize(text: string): Set<string> {
  const lowered = text.toLowerCase().replace(/retry[\s-]*after/g, " retryafter ");
  const tokens = lowered.split(/[^a-z0-9_]+/).filter(Boolean);
  const out = new Set<string>(tokens);
  for (const token of tokens) {
    if (/^\d{3}$/.test(token)) out.add(`${token[0]}xx`);
  }
  return out;
}

export interface TeammateReply {
  ruleId: string;
  teammateId: string;
  body: string;
}

function available(rule: ClarificationRule, updateReleased: boolean): boolean {
  if (rule.availability === "always") return true;
  return rule.availability === "after_update" ? updateReleased : !updateReleased;
}

export function selectReply(
  scenario: ScenarioDefinition,
  question: string,
  worldState: { updateReleased: boolean }
): TeammateReply {
  const tokens = tokenize(question);
  let best: { rule: ClarificationRule; hits: number; ratio: number } | null = null;
  for (const rule of scenario.clarificationRules) {
    if (rule.id === scenario.fallbackRuleId || !available(rule, worldState.updateReleased)) continue;
    const hits = rule.signals.filter((group) => group.some((token) => tokens.has(token))).length;
    if (hits < rule.minGroups || hits === 0) continue;
    const ratio = hits / rule.signals.length;
    if (!best || hits > best.hits || (hits === best.hits && ratio > best.ratio)) {
      best = { rule, hits, ratio };
    }
  }
  const rule =
    best?.rule ?? scenario.clarificationRules.find((r) => r.id === scenario.fallbackRuleId);
  if (!rule) throw new Error("Scenario has no fallback clarification rule");
  return { ruleId: rule.id, teammateId: rule.teammateId, body: rule.answer };
}

export interface ThreadTurn {
  sender: "candidate" | "teammate";
  teammateId: string | null;
  body: string;
}

export interface Fact {
  id: string;
  teammateId: string;
  text: string;
  mandatory: boolean;
}

/** Facts a teammate may state right now. The fallback rule is not a fact. */
export function availableFacts(scenario: ScenarioDefinition, updateReleased: boolean): Fact[] {
  return scenario.clarificationRules
    .filter((r) => r.id !== scenario.fallbackRuleId && available(r, updateReleased))
    .map((r) => ({ id: r.id, teammateId: r.teammateId, text: r.answer, mandatory: Boolean(r.mandatory) }));
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Deterministic reply that does not repeat itself word for word: a fact the
 * candidate has already been given is referred back to, and the "not covered"
 * answer rotates through equivalent wordings.
 */
export function authoredReply(scenario: ScenarioDefinition, question: string, thread: ThreadTurn[], updateReleased: boolean): TeammateReply {
  const reply = selectReply(scenario, question, { updateReleased });
  const said = thread.filter((t) => t.sender === "teammate").map((t) => normalize(t.body));
  if (reply.ruleId === scenario.fallbackRuleId) {
    const variants = [
      reply.body,
      "I don't have more on that than what's in the brief. Go with your best judgment and write the assumption down in your handoff.",
      "That's outside what we've decided for this fix. Pick the option you can defend and note it in the handoff.",
      "No decision on that one from our side. Make the call you'd make in production and say why in the handoff.",
    ];
    const fallbacks = said.filter((s) => variants.some((v) => normalize(v) === s)).length;
    return { ...reply, body: variants[fallbacks % variants.length] };
  }
  if (said.some((s) => s.includes(normalize(reply.body)))) {
    return { ...reply, body: `Same as I said earlier: ${reply.body}` };
  }
  return reply;
}

/**
 * What the model returns. It decides who speaks, which authored facts answer
 * the message, and writes the conversational framing. Policy is never taken
 * from the model: cited facts are inserted in their authored wording.
 */
export interface DraftedReply {
  teammateId: string;
  factIds: string[];
  opening: string;
  closing: string;
}

export interface GeneratedReply {
  teammateId: string;
  reply: string;
  factIds: string[];
  /** Framing lines that were dropped because they could state or endorse policy. */
  dropped: ("opening" | "closing")[];
}

export const DRAFTED_REPLY_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["teammateId", "factIds", "opening", "closing"],
  properties: {
    teammateId: { type: "string" },
    factIds: { type: "array", items: { type: "string" } },
    opening: { type: "string" },
    closing: { type: "string" },
  },
};

const MAX_FACTS = 2;

export function buildTeammatePrompt(
  scenario: ScenarioDefinition,
  input: { facts: Fact[]; thread: ThreadTurn[]; question: string; updateReleased: boolean; hintRuleId: string | null }
): ChatMessage[] {
  const name = (id: string | null) => scenario.teammates.find((t) => t.id === id)?.name ?? "Teammate";
  const roster = scenario.teammates
    .map((t) => {
      const p = scenario.personas[t.id];
      const defers = (p?.defersTo ?? []).map((d) => `defers to ${name(d.teammateId)} on ${d.topics}`).join("; ");
      return `- id "${t.id}": ${t.name}, ${t.title}. ${p ? `${p.voice} Owns: ${p.owns}.${defers ? ` Also ${defers}.` : ""}` : ""}`;
    })
    .join("\n");
  const facts = input.facts.map((f) => `- [${f.id}] (${name(f.teammateId)}) ${f.text}`).join("\n");
  const update = input.updateReleased
    ? `The partner request has been posted to the thread: ${scenario.requirementUpdate.title}.`
    : "No partner request has been posted. Do not hint that one is coming.";

  const system = [
    `You write the next chat message from ONE teammate to a new engineer in a work simulation called "${scenario.title}".`,
    `Team context: ${scenario.teamContext}`,
    `Team:\n${roster}`,
    update,
    `Facts the team has decided (id, owner, wording):\n${facts}`,
    [
      "How the message is built: you pick the facts that answer the engineer, and our system inserts their exact wording between your opening and closing. So:",
      `- factIds: up to ${MAX_FACTS} fact ids that directly answer what the engineer asked or correct a wrong assumption in it. Empty for thanks, status updates, small talk, or anything the facts do not cover.`,
      "- opening: one short sentence reacting to what they actually wrote, in the speaker's voice (for example acknowledging a status update, \"Good question.\", \"Like I said earlier,\" when the fact was already given, or for uncovered topics saying it hasn't been decided and they should make a reasonable call and note it in the handoff). Never state policy, numbers or status codes in the opening, and never start with yes, no, correct or right; the facts do the answering.",
      "- The opening must not restate a cited fact. If a cited fact already says something is undecided, use a neutral acknowledgement like \"Good question.\" or leave the opening empty.",
      "- closing: optional short sentence, or empty. Same restrictions.",
      "- teammateId: the person who owns the facts you picked. If the engineer addresses someone by name and nothing is cited, that person replies.",
      "- Sound like a coworker on chat. Do not repeat your earlier openings. Do not mention being simulated (the identity fact covers that when asked). Never offer code or talk about grading.",
      `Return JSON {"teammateId": one of ${scenario.teammates.map((t) => `"${t.id}"`).join(", ")}, "factIds": [...], "opening": "...", "closing": "..."}.`,
    ].join("\n"),
    input.hintRuleId ? `A keyword match suggests fact ${input.hintRuleId}; use it only if it really answers the message.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const history: ChatMessage[] = input.thread.slice(-12).map((t) =>
    t.sender === "candidate" ? { role: "user", content: t.body } : { role: "assistant", content: `${name(t.teammateId)}: ${t.body}` },
  );
  return [{ role: "system", content: system }, ...history, { role: "user", content: input.question }];
}

const POLICY_TERMS =
  /\b(temporar\w*|permanent\w*|retr(y|ies|ied|ying)\w*|backoff|jitter\w*|attempts?|status|codes?|redirect\w*|idempoten\w*|dead.?letter\w*|headers?|caps?|capped|limits?|seconds?|minutes?|hours?|[345]xx|honou?r\w*|partners?|requirements?|tests?|graded|grading|checks?|deadline)\b|\d/i;
const VERDICT_START = /^\s*(yes|yeah|yep|yup|no|nope|nah|correct|right|exactly|sure|absolutely|indeed|true|false|that's (right|correct)|you're right|agreed)\b/i;
const SELF_REFERENCE = /simulat|not a real|\bai\b|language model|assistant/i;

function framingLine(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const line = text.trim().replace(/\s+/g, " ");
  if (!line || line.length > 200) return null;
  if (POLICY_TERMS.test(line) || VERDICT_START.test(line) || SELF_REFERENCE.test(line)) return null;
  if (/[#*`]|https?:/.test(line)) return null;
  return line;
}

function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : text).trim();
}

/**
 * Turns a model draft into the stored reply. The teammate must be on the
 * roster, cited facts must be available right now, and framing lines that could
 * state or endorse policy are dropped. A draft with no facts must still have a
 * usable opening, otherwise the caller falls back to the authored reply.
 */
const REFER_BACK = ["Same as before:", "As I mentioned,", "Repeating the key part:", "Still the same answer:"];

function addressedTeammate(scenario: ScenarioDefinition, question: string): string | null {
  const lowered = question.toLowerCase();
  const hit = scenario.teammates.find((t) => new RegExp(`\\b${t.name.split(" ")[0].toLowerCase()}\\b`).test(lowered));
  return hit?.id ?? null;
}

export function assembleReply(
  raw: unknown,
  scenario: ScenarioDefinition,
  ctx: { facts: Fact[]; thread: ThreadTurn[]; question?: string; hintRuleId?: string | null },
): { ok: true; value: GeneratedReply } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "not_object" };
  const r = raw as Record<string, unknown>;
  const teammateId = typeof r.teammateId === "string" ? r.teammateId : "";
  if (!scenario.teammates.some((t) => t.id === teammateId)) return { ok: false, reason: "unknown_teammate" };
  const factIndex = new Map(ctx.facts.map((f) => [f.id, f]));
  const factIds = [...new Set(Array.isArray(r.factIds) ? r.factIds.filter((x): x is string => typeof x === "string") : [])];
  if (factIds.some((id) => !factIndex.has(id))) return { ok: false, reason: "unavailable_fact" };
  if (factIds.length > MAX_FACTS) return { ok: false, reason: "too_many_facts" };

  let opening = framingLine(r.opening);
  const closing = framingLine(r.closing);
  const dropped: GeneratedReply["dropped"] = [];
  if (!opening && typeof r.opening === "string" && r.opening.trim()) dropped.push("opening");
  if (!closing && typeof r.closing === "string" && r.closing.trim()) dropped.push("closing");

  const hinted = ctx.hintRuleId ? factIndex.get(ctx.hintRuleId) : undefined;
  if (hinted?.mandatory && !factIds.includes(hinted.id)) {
    factIds.unshift(hinted.id);
    if (opening) dropped.push("opening");
    opening = null;
  }

  const said = ctx.thread.filter((t) => t.sender === "teammate").map((t) => normalize(t.body));
  const factTexts = factIds.map((id) => {
    const text = factIndex.get(id)!.text;
    return said.some((s) => s.includes(normalize(text))) ? firstSentence(text) : text;
  });
  if (!factTexts.length && !opening) return { ok: false, reason: "no_content" };

  let reply = [opening, ...factTexts, closing].filter(Boolean).join(" ");
  if (said.includes(normalize(reply))) {
    if (!factTexts.length) return { ok: false, reason: "verbatim_repeat" };
    const prefix = REFER_BACK.find((p) => !said.some((s) => s.startsWith(normalize(p)))) ?? REFER_BACK[0];
    const body = factTexts.join(" ");
    reply = `${prefix} ${prefix.endsWith(",") ? body.charAt(0).toLowerCase() + body.slice(1) : body}`;
  }

  const owners = [...new Set(factIds.map((id) => factIndex.get(id)!.teammateId))];
  const lastSpeaker = [...ctx.thread].reverse().find((t) => t.sender === "teammate")?.teammateId ?? null;
  const speaker =
    owners.length === 1
      ? owners[0]
      : owners.length === 0
        ? (ctx.question ? addressedTeammate(scenario, ctx.question) : null) ?? lastSpeaker ?? teammateId
        : teammateId;
  return { ok: true, value: { teammateId: speaker, reply, factIds, dropped } };
}

