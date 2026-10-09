/**
 * Pure rules for simulated teammates, scenario events and the coding
 * assistant in employer-authored simulations. No I/O, so every rule here is
 * unit tested in scripts/test-collaboration.ts.
 *
 * Teammates answer only from the facts the scenario gave them. A fact is
 * disclosed when the question concerns one of its topics (or, failing that,
 * clearly overlaps its wording); the model may paraphrase a fact but cannot
 * add knowledge, and anything it writes is checked before it is stored.
 */
import type { ChatMessage } from "@/lib/ai/provider";
import type { Coworker, PackageFile, ProtectedMaterials, ScenarioPackage } from "../authoring/package";
import type { AiPolicyId } from "../authoring/registry";
import type { AssistantPatchFile, ScenarioEventKey, TeamMessageView } from "./collaboration-types";

export type Fact = { id: string; text: string; topics?: string[] };
export type Turn = { sender: "candidate" | "teammate"; teammateId: string | null; body: string; eventKey: ScenarioEventKey | null; factIds?: string[] };

export const ASSISTANT_LIMIT = 20;
export const ASSISTANT_STALE_SECONDS = 120;
export const ASSISTANT_CONTEXT_CHAR_BUDGET = 12_000;
export const REVIEW_QUESTION_ELAPSED_FRACTION = 0.7;

/* ------------------------------------------------------------------ */
/* Text matching                                                       */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(
  "a an the and or but if then so of to in on at for from by with about is are was were be been being do does did can could should would will i you we they he she it this that these those what which who whom how why when where there here my your our their me us them any some all no not just also than too very as into out up down over under again more most such only own same other its it's i'm don't doesn't isn't".split(" "),
);

function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function contentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/[\s_-]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

/**
 * How strongly a question concerns a fact, from 0 to 1. Topic phrases are the
 * author's disclosure rule: all words of a short topic, or most words of a
 * longer one, must appear. Without
 * topics, at least two distinctive words of the fact must appear.
 */
export function factRelevance(question: string, fact: Fact): number {
  const q = new Set(contentTokens(question));
  if (q.size === 0) return 0;
  const topics = (fact.topics ?? []).map(contentTokens).filter((t) => t.length > 0);
  if (topics.length > 0) {
    let best = 0;
    for (const t of topics) {
      const hits = t.filter((w) => q.has(w)).length;
      const need = t.length <= 2 ? t.length : Math.ceil(t.length * 0.6);
      if (hits >= need) best = Math.max(best, hits / t.length);
    }
    return best;
  }
  const words = [...new Set(contentTokens(fact.text))].filter((w) => w.length > 3);
  const hits = words.filter((w) => q.has(w)).length;
  return hits >= 2 ? Math.min(0.9, hits / Math.max(4, words.length)) + 0.1 : 0;
}

export function relevantFacts(question: string, facts: Fact[], max = 2): Fact[] {
  return facts
    .map((f) => ({ f, score: factRelevance(question, f) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.f);
}

/* ------------------------------------------------------------------ */
/* Teammate replies                                                    */
/* ------------------------------------------------------------------ */

function firstName(c: Coworker): string {
  return c.name.split(/\s+/)[0] ?? c.name;
}

/** Another teammate whose public topics fit the question, so a boundary reply can point the candidate on. */
export function betterTeammate(question: string, self: Coworker, coworkers: Coworker[]): Coworker | null {
  const q = new Set(contentTokens(question));
  const own = new Set(self.topics.flatMap(contentTokens));
  for (const c of coworkers) {
    if (c.id === self.id) continue;
    if (c.topics.flatMap(contentTokens).some((w) => w.length > 3 && q.has(w) && !own.has(w))) return c;
  }
  return null;
}

const QUESTION_MARK = /\?\s*$/;

export function noDashes(text: string): string {
  return text.replace(/\s*[\u2014\u2013]\s*/g, ", ").replace(/ ,/g, ",");
}

/**
 * The reply used when the model is unavailable or its draft is rejected.
 * Fixed wording around the author's facts, so it can never add knowledge.
 */
export function scenarioNotesReply(
  self: Coworker,
  coworkers: Coworker[],
  facts: Fact[],
  question: string,
  thread: Turn[],
): { body: string; factIds: string[] } {
  const last = thread[thread.length - 1];
  if (last && last.sender === "teammate" && last.teammateId === self.id && last.eventKey === "review_question" && !QUESTION_MARK.test(question)) {
    return { body: "Thanks for explaining. That answers my question.", factIds: [] };
  }
  const picked = relevantFacts(question, facts);
  if (picked.length > 0) {
    return { body: noDashes(picked.map((f) => f.text.trim()).join(" ")), factIds: picked.map((f) => f.id) };
  }
  const other = betterTeammate(question, self, coworkers);
  const pointer = other ? ` ${firstName(other)} would know more about that.` : "";
  return { body: `I don't have information on that beyond what's in the brief.${pointer}`, factIds: [] };
}

/** Fact ids recorded on a stored teammate reply (`gen:a+b`, `notes:a`, `notes:none`). */
export function factIdsOfRule(ruleId: string | null): string[] {
  const m = /^(?:gen|notes):(.+)$/.exec(ruleId ?? "");
  if (!m || m[1] === "none") return [];
  return m[1].split("+").filter(Boolean);
}

/** Facts this teammate already gave in the thread. */
export function disclosedFactIds(thread: Turn[], selfId: string): Set<string> {
  return new Set(thread.filter((t) => t.sender === "teammate" && t.teammateId === selfId).flatMap((t) => t.factIds ?? []));
}

function firstSentence(text: string): string {
  const t = text.trim();
  const m = /^(.{20,220}?[.!?])(\s|$)/.exec(t);
  return m ? m[1] : t.slice(0, 220);
}

/**
 * A question this teammate has already answered: every fact it concerns was
 * given earlier in the thread. The reply restates the key fact in one
 * sentence, so a candidate who asks again gets the same answer, shorter,
 * and no new knowledge is disclosed.
 */
export function repeatedQuestionReply(question: string, facts: Fact[], thread: Turn[], selfId: string): { body: string; factIds: string[] } | null {
  const picked = relevantFacts(question, facts);
  if (picked.length === 0) return null;
  const given = disclosedFactIds(thread, selfId);
  if (!picked.every((f) => given.has(f.id))) return null;
  return { body: noDashes(`As I said earlier, ${lowerFirst(firstSentence(picked[0].text))}`), factIds: [picked[0].id] };
}

function lowerFirst(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

export const TEAMMATE_REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "factIds"],
  properties: {
    reply: { type: "string" },
    factIds: { type: "array", items: { type: "string" } },
  },
} as const;

export function teammatePrompt(
  pkg: ScenarioPackage,
  self: Coworker,
  facts: Fact[],
  thread: Turn[],
  question: string,
): ChatMessage[] {
  const others = pkg.coworkers.filter((c) => c.id !== self.id);
  const given = [...disclosedFactIds(thread, self.id)].filter((id) => facts.some((f) => f.id === id));
  const history = thread
    .filter((t) => t.teammateId === self.id)
    .slice(-10)
    .map((t) => `${t.sender === "candidate" ? "Candidate" : self.name}${t.eventKey === "review_question" ? " (review question)" : ""}: ${t.body}`)
    .join("\n");
  const system = [
    `You are ${self.name}, ${self.title}, a simulated teammate in a timed engineering work sample about: ${pkg.brief.title}.`,
    `Your responsibilities: ${self.responsibilities}`,
    `Tone: ${self.tone}. Boundaries: ${self.boundaries}`,
    "You know ONLY these facts. Answer from them and nothing else:",
    ...facts.map((f) => `- [${f.id}] ${f.text}`),
    others.length ? `Colleagues: ${others.map((o) => `${o.name} (${o.title}) knows about ${o.topics.join(", ")}`).join("; ")}.` : "",
    given.length ? `You already told the candidate: ${given.map((id) => `[${id}]`).join(", ")}. If they ask about these again, answer in one short sentence without new detail.` : "",
    "Rules:",
    "- If the question is not covered by your facts, say you don't know, and if a colleague's topics fit, say they would know more. Never guess or invent details, numbers, names or history.",
    "- Never write code, never describe how to implement the fix, never reveal or hint at tests, and never add requirements or acceptance criteria beyond the brief.",
    "- Never judge or grade the candidate. If they answer a review question you asked, acknowledge it briefly and neutrally without asking more.",
    "- Reply in one to four short sentences, conversational, plain English, no markdown, no em dashes.",
    '- Return JSON {"reply": string, "factIds": string[]} where factIds lists only the ids of facts you used.',
  ]
    .filter(Boolean)
    .join("\n");
  const user = `${history ? `Conversation so far:\n${history}\n\n` : ""}Candidate's new message: ${question}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function longLines(files: PackageFile[]): string[] {
  const lines = new Set<string>();
  for (const f of files) {
    for (const raw of f.content.split("\n")) {
      const line = raw.trim();
      if (line.replace(/\s/g, "").length >= 25) lines.add(line);
    }
  }
  return [...lines];
}

/**
 * Checks a drafted teammate reply. Rejects code, references to facts the
 * teammate does not hold, and any text copied from the reference solution
 * or protected tests.
 */
export function checkTeammateDraft(
  raw: unknown,
  facts: Fact[],
  prot: Pick<ProtectedMaterials, "reference" | "protectedTests" | "protectedTestRefs">,
): { ok: true; body: string; factIds: string[] } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "not_object" };
  const r = raw as Record<string, unknown>;
  if (typeof r.reply !== "string") return { ok: false, reason: "no_reply" };
  const body = noDashes(r.reply.trim());
  if (body.length < 2 || body.length > 900) return { ok: false, reason: "length" };
  if (/```|^\s{4}\S/m.test(body)) return { ok: false, reason: "code" };
  const ids = Array.isArray(r.factIds) ? r.factIds.filter((x): x is string => typeof x === "string") : [];
  const known = new Set(facts.map((f) => f.id));
  if (ids.some((id) => !known.has(id))) return { ok: false, reason: "unknown_fact" };
  const lower = body.toLowerCase();
  for (const line of longLines([...prot.reference.files, ...prot.protectedTests])) {
    if (lower.includes(line.toLowerCase())) return { ok: false, reason: "protected_text" };
  }
  for (const t of prot.protectedTestRefs) {
    if (t.name.length >= 8 && lower.includes(t.name.toLowerCase())) return { ok: false, reason: "protected_test_name" };
  }
  return { ok: true, body, factIds: [...new Set(ids)] };
}

/* ------------------------------------------------------------------ */
/* Scenario events                                                     */
/* ------------------------------------------------------------------ */

export function eventDisclosure(pkg: ScenarioPackage): string {
  const review = validReviewQuestion(pkg);
  const parts = [
    "Your simulated teammates answer from what their role would know. They will not change the requirements in the brief.",
    review ? `${review.coworker.name} may ask one question about your change near the end.` : "",
    "Messages are part of what the employer receives, but the number of messages is not scored.",
  ];
  return parts.filter(Boolean).join(" ");
}

export function validReviewQuestion(pkg: ScenarioPackage): { coworker: Coworker; text: string } | null {
  const q = pkg.reviewQuestion;
  if (!q || !q.text.trim()) return null;
  const coworker = pkg.coworkers.find((c) => c.id === q.coworkerId);
  return coworker ? { coworker, text: noDashes(q.text.trim()) } : null;
}

export function initialContextMessage(pkg: ScenarioPackage): { coworker: Coworker; body: string } | null {
  const lead = pkg.coworkers[0];
  if (!lead) return null;
  const others = pkg.coworkers.slice(1);
  const lines = [
    `Hi, I'm ${lead.name} (${lead.title}). ${lead.topics.length ? `Ask me about ${joinList(lead.topics.slice(0, 3))}.` : ""}`.trim(),
    ...others.map((o) => `${o.name} (${o.title}) can help with ${joinList(o.topics.slice(0, 3))}.`),
    "The brief has the requirements, and they won't change while you work. Ask either of us whenever something is unclear.",
  ];
  return { coworker: lead, body: noDashes(lines.join(" ")) };
}

export function finalHandoffMessage(pkg: ScenarioPackage): { coworker: Coworker; body: string } | null {
  const lead = pkg.coworkers[0];
  if (!lead) return null;
  return { coworker: lead, body: "Thanks, I have your handoff. Your submission was received and will be reviewed by the hiring team." };
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function reviewQuestionDue(startedAt: string | null, dueAt: Date | null, now = new Date()): boolean {
  if (!startedAt || !dueAt) return false;
  const start = new Date(startedAt).getTime();
  const total = dueAt.getTime() - start;
  if (total <= 0) return false;
  return (now.getTime() - start) / total >= REVIEW_QUESTION_ELAPSED_FRACTION;
}

/* ------------------------------------------------------------------ */
/* Message views                                                       */
/* ------------------------------------------------------------------ */

const EVENT_KEYS: ScenarioEventKey[] = ["initial_context", "review_question", "final_handoff"];

export function eventKeyOf(ruleId: string | null): ScenarioEventKey | null {
  if (!ruleId?.startsWith("event:")) return null;
  const key = ruleId.slice(6);
  return (EVENT_KEYS as string[]).includes(key) ? (key as ScenarioEventKey) : null;
}

export function messageView(row: {
  id: string;
  seq: number;
  sender: "candidate" | "teammate";
  teammate_id: string | null;
  body: string;
  rule_id: string | null;
  created_at: string;
}): TeamMessageView {
  const eventKey = eventKeyOf(row.rule_id);
  const answeredFrom = row.sender === "teammate" && !eventKey ? (row.rule_id?.startsWith("gen:") ? "model" : "scenario_notes") : null;
  return {
    id: row.id,
    seq: row.seq,
    sender: row.sender,
    teammateId: row.sender === "teammate" ? row.teammate_id : null,
    toTeammateId: row.sender === "candidate" ? row.teammate_id : null,
    body: row.body,
    createdAt: row.created_at,
    kind: eventKey ? "scenario_event" : "message",
    eventKey,
    answeredFrom,
  };
}

/* ------------------------------------------------------------------ */
/* Coding assistant                                                    */
/* ------------------------------------------------------------------ */

export function assistantEnabled(policy: AiPolicyId): boolean {
  return policy === "assistants_disclosed" || policy === "any_tools";
}

export const ASSISTANT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "patch"],
  properties: {
    answer: { type: "string" },
    patch: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "content"],
        properties: { path: { type: "string" }, content: { type: "string" } },
      },
    },
  },
} as const;

/** Shares the chosen files with the assistant, trimmed to the context budget. */
export function assistantContext(files: AssistantPatchFile[]): { text: string; truncated: string[] } {
  let budget = ASSISTANT_CONTEXT_CHAR_BUDGET;
  const parts: string[] = [];
  const truncated: string[] = [];
  for (const f of files) {
    if (budget <= 200) {
      truncated.push(f.path);
      continue;
    }
    const content = f.content.length > budget ? `${f.content.slice(0, budget)}\n... (truncated)` : f.content;
    if (content !== f.content) truncated.push(f.path);
    budget -= content.length;
    parts.push(`--- ${f.path}\n${content}`);
  }
  return { text: parts.join("\n\n"), truncated };
}

export function assistantPrompt(pkg: ScenarioPackage, prompt: string, files: AssistantPatchFile[]): ChatMessage[] {
  const ctx = assistantContext(files);
  const system = [
    "You are a coding assistant inside a timed engineering work sample. The candidate decides what to use; you only suggest.",
    `Task: ${pkg.brief.title}. ${pkg.brief.task}`,
    pkg.brief.constraints.length ? `Constraints: ${pkg.brief.constraints.join("; ")}` : "",
    "You see only the files the candidate shared. You cannot run code or tests, so never claim tests pass or that code works; say what the candidate should run to check.",
    "Keep answers concise. When you propose code changes, put COMPLETE new file contents in `patch` for at most 3 of the shared files; otherwise return an empty patch.",
    'Return JSON {"answer": string, "patch": [{"path": string, "content": string}]}.',
  ]
    .filter(Boolean)
    .join("\n");
  const user = [
    ctx.text ? `Shared files:\n${ctx.text}` : "No files shared.",
    ctx.truncated.length ? `(Truncated: ${ctx.truncated.join(", ")})` : "",
    `Request: ${prompt}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

const PASS_CLAIM = /\b(all\s+)?tests?\s+(will\s+|should\s+)?(now\s+)?pass(es|ed)?\b/i;

export function checkAssistantOutput(
  raw: unknown,
  shared: AssistantPatchFile[],
): { ok: true; answer: string; patch: AssistantPatchFile[] } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "not_object" };
  const r = raw as Record<string, unknown>;
  if (typeof r.answer !== "string" || !r.answer.trim()) return { ok: false, reason: "no_answer" };
  let answer = r.answer.trim().slice(0, 11_000);
  if (PASS_CLAIM.test(answer)) {
    answer += "\n\n(Fydell note: the assistant cannot run tests. Run the tests to check.)";
  }
  const sharedPaths = new Set(shared.map((f) => f.path));
  const patch: AssistantPatchFile[] = [];
  if (Array.isArray(r.patch)) {
    for (const p of r.patch.slice(0, 3)) {
      if (!p || typeof p !== "object") return { ok: false, reason: "bad_patch" };
      const { path, content } = p as Record<string, unknown>;
      if (typeof path !== "string" || typeof content !== "string") return { ok: false, reason: "bad_patch" };
      if (!sharedPaths.has(path)) return { ok: false, reason: "patch_outside_context" };
      const before = shared.find((f) => f.path === path);
      if (before && before.content === content) continue;
      if (content.length > 100_000) return { ok: false, reason: "patch_too_large" };
      patch.push({ path, content });
    }
  }
  return { ok: true, answer, patch };
}
