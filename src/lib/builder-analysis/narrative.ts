import { getProviderConfig, postChatCompletion, type ChatMessage } from "@/lib/ai/provider";
import { LEVEL_LABEL, citableIds, type Synthesis } from "./synthesize";
import type { Narrative, NarrativeParagraph } from "./types";

/** Words that would turn an evidence report into a judgment of the person. */
const BANNED = /\b(personality|culture fit|cultural fit|introvert|extrovert|lazy|genius|rockstar|ninja|10x|smart|intelligent|talented|passionate|hire|reject|score|rating|percentile|best|worst|senior|junior)\b/i;

/** Internal evidence ids must never appear in prose shown to the engineer. */
const RAW_ID = /\b(dimension|growth|pattern|strength|act|finding):[\w./:-]+/i;

export function templateNarrative(s: Synthesis): Narrative {
  const paragraphs: NarrativeParagraph[] = [];
  const observed = s.dimensions.filter((d) => d.level !== "insufficient_evidence");
  if (s.strengths.length) {
    const top = s.strengths[0];
    paragraphs.push({ text: `The most evidence is in ${top.title.toLowerCase()}: ${top.detail.charAt(0).toLowerCase()}${top.detail.slice(1)}`, refs: [top.id] });
  }
  if (s.patterns.length) {
    const names = s.patterns.slice(0, 3).map((p) => p.title.toLowerCase());
    paragraphs.push({ text: `Practices that repeat across projects: ${names.join(", ")}. Repetition matters more than any single project.`, refs: s.patterns.slice(0, 3).map((p) => p.id) });
  }
  const thin = s.dimensions.filter((d) => d.level === "insufficient_evidence" || d.level === "limited");
  if (thin.length) {
    paragraphs.push({
      text: `Least evidence: ${thin.map((d) => `${d.label.toLowerCase()} (${LEVEL_LABEL[d.level].toLowerCase()})`).join(", ")}. This can mean the work is not public yet rather than missing.`,
      refs: thin.map((d) => `dimension:${d.id}`),
    });
  }
  if (s.growth.length) {
    const g = s.growth[0];
    paragraphs.push({ text: `A useful next step: ${g.nextStep}`, refs: [g.id] });
  }
  const summary = observed.length
    ? `${s.scope.deepProjects + s.scope.scannedRepos} source${s.scope.deepProjects + s.scope.scannedRepos === 1 ? "" : "s"} read. ${s.headline}`
    : "Not enough public or imported work was found to describe how you build yet.";
  return { source: "template", summary, paragraphs };
}

function compactSynthesis(s: Synthesis): string {
  const lines: string[] = [];
  lines.push(`Working style (inference): ${s.workingStyle.label}. ${s.workingStyle.description}`);
  lines.push(`Sources: ${s.scope.deepProjects} imported projects analysed in depth, ${s.scope.scannedRepos} public repositories scanned.`);
  for (const d of s.dimensions) {
    lines.push(`[dimension:${d.id}] ${d.label}: ${LEVEL_LABEL[d.level]}.`);
    for (const p of d.practices.slice(0, 5)) {
      lines.push(`  - ${p.label} in ${p.repos.length} project(s). Evidence: ${p.refs.slice(0, 2).map((r) => `[${r.id}] ${r.label.slice(0, 90)}`).join("; ")}`);
    }
    if (d.notObserved.length) lines.push(`  Not observed: ${d.notObserved.slice(0, 4).join(", ")}`);
    for (const l of d.limits) lines.push(`  Not assessed: ${l}`);
  }
  for (const st of s.strengths) lines.push(`[${st.id}] Strength: ${st.title}. ${st.detail}`);
  for (const p of s.patterns) lines.push(`[${p.id}] Recurring: ${p.title}. ${p.detail}`);
  for (const g of s.growth) lines.push(`[${g.id}] Growth (${g.basis}): ${g.title}. ${g.observation} Next step: ${g.nextStep}`);
  return lines.join("\n").slice(0, 9000);
}

const SYSTEM = [
  "You write the narrative section of a private engineering evidence report for the engineer it describes.",
  "Use only the facts provided. Every paragraph must cite one or more ids, exactly as given in square brackets, in its refs array. Never write an id inside the text itself.",
  "Describe observable work and practices. Never judge the person, their personality, seniority or hireability, and never invent numbers.",
  "Treat missing evidence as missing, not as absence. Anything listed as not assessed must not be described at all except to say it was not assessed.",
  "Call something an inference only when the facts mark it as an inference; observations are stated plainly.",
  "Write in second person, plain sentences, no headings, no lists, no em dashes.",
  'Return JSON only: {"summary": "one or two sentences", "paragraphs": [{"text": "...", "refs": ["id"]}]} with 3 to 5 paragraphs.',
].join("\n");

type ModelNarrative = { summary: string; paragraphs: NarrativeParagraph[] };

function parseNarrative(raw: string, allowed: Set<string>): ModelNarrative | null {
  let data: unknown;
  try {
    data = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
  if (summary.length < 20 || summary.length > 400 || BANNED.test(summary)) return null;
  const paragraphs: NarrativeParagraph[] = [];
  for (const p of Array.isArray(obj.paragraphs) ? obj.paragraphs : []) {
    if (!p || typeof p !== "object") continue;
    const rec = p as Record<string, unknown>;
    const text = typeof rec.text === "string" ? rec.text.replace(/\s*\[[^\]]{2,60}\]/g, "").replace(/\u2014/g, ",").trim() : "";
    const refs = (Array.isArray(rec.refs) ? rec.refs : []).filter((r): r is string => typeof r === "string" && allowed.has(r));
    if (text.length < 30 || text.length > 900 || BANNED.test(text) || RAW_ID.test(text) || refs.length === 0) continue;
    paragraphs.push({ text, refs: [...new Set(refs)].slice(0, 6) });
  }
  if (paragraphs.length < 2) return null;
  return { summary: summary.replace(/\u2014/g, ","), paragraphs: paragraphs.slice(0, 5) };
}

/**
 * Model-written narrative constrained to cite the synthesis. Paragraphs that
 * cite nothing real, or use judgmental language, are dropped; if too little
 * survives, the deterministic template is used instead.
 */
export async function writeNarrative(s: Synthesis): Promise<Narrative> {
  const fallback = templateNarrative(s);
  const config = getProviderConfig();
  if (!config) return fallback;
  if (s.dimensions.every((d) => d.level === "insufficient_evidence")) return fallback;
  const allowed = citableIds(s);
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: compactSynthesis(s) },
  ];
  const extraBody = config.provider === "groq" && config.model.includes("gpt-oss") ? { reasoning_effort: "low" } : undefined;
  try {
    const raw = await postChatCompletion(config, messages, { schema: {}, schemaName: "narrative", temperature: 0.3, maxTokens: 1500, extraBody });
    const parsed = parseNarrative(raw, allowed);
    if (!parsed) return fallback;
    return { source: "model", model: `${config.provider}:${config.model}`, ...parsed };
  } catch {
    return fallback;
  }
}

export const __test = { parseNarrative };
