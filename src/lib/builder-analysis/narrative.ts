import { getProviderConfig, postChatCompletion, type ChatMessage } from "@/lib/ai/provider";
import { LEVEL_LABEL, citableIds, type Synthesis } from "./synthesize";
import type { ClaimRejection, Narrative, NarrativeParagraph } from "./types";

/** Words that would turn an evidence report into a judgment of the person. */
const BANNED = /\b(personality|culture fit|cultural fit|introvert|extrovert|lazy|genius|rockstar|ninja|10x|smart|intelligent|talented|passionate|hire|reject|score|rating|percentile|best|worst|senior|junior)\b/i;

/** Imported repositories may be other people's work; the analysis never establishes authorship. */
const AUTHORSHIP = /\b(you (wrote|authored|built|created|developed|implemented)|(code|tests?) you (wrote|authored)|your (own )?code)\b/i;

/** Phrases that turn a handful of findings into a trait of the person. */
const TRAIT = /\b(you demonstrate|you are|consistently|always|habitually|mindset)\b|[-\u2011]oriented\b/i;

/** Fydell does not run imported code, so prose may never say tests ran or passed unless it says they were not. */
const EXECUTION =
  /\b((tests?|suites?) (pass|passed|passes|passing|succeed\w*|ran|run|(was|were|are|is|get|gets) (run|executed)|executed)|(ran|runs|run|executes|executed) (the |its |all |these |automated )?(tests?|test suites?)|green build|builds? (is |are )?(green|pass\w*))\b/i;
const NEGATED = /\b(not|never|no|whether|cannot|could not|wasn't|weren't|unknown)\b/i;

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
  lines.push(`Sources: ${s.scope.deepProjects} imported projects analyzed in depth, ${s.scope.scannedRepos} public repositories scanned.`);
  for (const d of s.dimensions) {
    lines.push(`[dimension:${d.id}] ${d.label}: ${LEVEL_LABEL[d.level]}.`);
    for (const p of d.practices.slice(0, 5)) {
      lines.push(`  - ${p.label} in ${p.repos.length} project(s): ${p.repos.slice(0, 4).join(", ")}. Evidence: ${p.refs.slice(0, 2).map((r) => `[${r.id}] ${r.label.slice(0, 90)}`).join("; ")}`);
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
  "A paragraph about missing evidence cites the [dimension:...] ids of the areas it describes, never the evidence for a practice that was found.",
  "Call something an inference only when the facts mark it as an inference; observations are stated plainly.",
  "Fydell never runs the code. Never say tests ran, pass or are run by CI; say the project contains tests or a CI configuration.",
  "Imported projects can be other people's repositories. Never say the engineer wrote, built or authored the code; say what the analyzed projects contain.",
  "When practices are listed in the same project, say they are in the same project; never imply separate projects.",
  "Do not turn findings into traits or habits. Say how many projects showed a practice instead of calling it an approach or saying it happens consistently.",
  "Write in second person, plain sentences, no headings, no lists, no em dashes.",
  'Return JSON only: {"summary": "one or two sentences", "paragraphs": [{"text": "...", "refs": ["id"]}]} with 3 to 5 paragraphs.',
].join("\n");

type ModelNarrative = { summary: string; paragraphs: NarrativeParagraph[] };

/** Paragraphs about what was not found. Citing an observed practice there reads as evidence for the absence. */
const ABSENCE = /^(no (evidence|observable)|there (is|was) (no|not enough|insufficient|little)|not enough|your working style (cannot|could not|can't))/i;

/** Every citable id mapped to the dimension it belongs to. */
function dimensionIndex(s: Synthesis): Map<string, string> {
  const index = new Map<string, string>();
  for (const d of s.dimensions) {
    const dim = `dimension:${d.id}`;
    index.set(dim, dim);
    for (const p of d.practices) for (const r of p.refs) index.set(r.id, dim);
  }
  return index;
}

function overclaimReason(t: string): ClaimRejection["reason"] | null {
  if (BANNED.test(t)) return "judgment";
  if (AUTHORSHIP.test(t)) return "authorship";
  if (TRAIT.test(t)) return "trait";
  if (EXECUTION.test(t) && !NEGATED.test(t)) return "execution_claim";
  return null;
}

function parseNarrative(
  raw: string,
  allowed: Set<string>,
  dimensionOf: Map<string, string> = new Map(),
  rejected: ClaimRejection[] = [],
  proposed: { count: number } = { count: 0 },
): ModelNarrative | null {
  let data: unknown;
  try {
    data = JSON.parse(raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const clean = (t: string) => t.replace(/\u2014/g, ",").replace(/\u2011/g, "-");
  const excerpt = (t: string) => t.slice(0, 160);
  const summary = typeof obj.summary === "string" ? clean(obj.summary.trim()) : "";
  const summaryProblem = summary.length < 20 || summary.length > 400 ? "length" : overclaimReason(summary);
  if (summaryProblem) {
    rejected.push({ reason: summaryProblem, excerpt: excerpt(summary) });
    return null;
  }
  const paragraphs: NarrativeParagraph[] = [];
  for (const p of Array.isArray(obj.paragraphs) ? obj.paragraphs : []) {
    if (!p || typeof p !== "object") continue;
    proposed.count += 1;
    const rec = p as Record<string, unknown>;
    const text = typeof rec.text === "string" ? clean(rec.text.replace(/\s*\[[^\]]{2,60}\]/g, "").trim()) : "";
    let refs = (Array.isArray(rec.refs) ? rec.refs : []).filter((r): r is string => typeof r === "string" && allowed.has(r));
    if (ABSENCE.test(text)) refs = refs.flatMap((r) => (r.startsWith("dimension:") ? [r] : dimensionOf.has(r) ? [dimensionOf.get(r) as string] : []));
    const reason: ClaimRejection["reason"] | null =
      text.length < 30 || text.length > 900 ? "length" : overclaimReason(text) ?? (RAW_ID.test(text) ? "raw_id" : refs.length === 0 ? "unknown_citation" : null);
    if (reason) {
      rejected.push({ reason, excerpt: excerpt(text) });
      continue;
    }
    paragraphs.push({ text, refs: [...new Set(refs)].slice(0, 6) });
  }
  if (paragraphs.length < 2) return null;
  return { summary, paragraphs: paragraphs.slice(0, 5) };
}

/**
 * Model-written narrative constrained to cite the synthesis. Paragraphs that
 * cite nothing real, or use judgmental language, are dropped; if too little
 * survives, the deterministic template is used instead.
 */
export async function writeNarrative(s: Synthesis): Promise<Narrative> {
  const template = templateNarrative(s);
  const config = getProviderConfig();
  if (!config) return template;
  if (s.dimensions.every((d) => d.level === "insufficient_evidence")) return template;
  const allowed = citableIds(s);
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: compactSynthesis(s) },
  ];
  const extraBody = config.provider === "groq" && config.model.includes("gpt-oss") ? { reasoning_effort: "low" } : undefined;
  const rejected: ClaimRejection[] = [];
  const proposed = { count: 0 };
  const fallback = (): Narrative => ({ ...template, claimCheck: { proposed: proposed.count, kept: 0, rejected, fellBackToTemplate: true } });
  try {
    const raw = await postChatCompletion(config, messages, { schema: {}, schemaName: "narrative", temperature: 0.3, maxTokens: 1500, extraBody });
    const parsed = parseNarrative(raw, allowed, dimensionIndex(s), rejected, proposed);
    if (!parsed) return fallback();
    return {
      source: "model",
      model: `${config.provider}:${config.model}`,
      ...parsed,
      claimCheck: { proposed: proposed.count, kept: parsed.paragraphs.length, rejected, fellBackToTemplate: false },
    };
  } catch {
    return fallback();
  }
}

export const __test = { parseNarrative, dimensionIndex };
