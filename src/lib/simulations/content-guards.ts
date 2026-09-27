/**
 * Content guards for rubric quality (WORK-07, SCEN-02).
 *
 * WORK-07 — no cultural-fit scoring: rubric indicators, deterministic checks
 * and stakeholder content must assess job-relevant clarification, accurate
 * risk communication and handoff completeness. They must not infer
 * personality, protected traits, mental state, or team belonging from writing
 * style or interaction speed.
 *
 * SCEN-02 — job-relevant dimensions with observable anchors: the rubric must
 * cover correctness, engineering judgment, response to requirements, and work
 * communication, and every indicator must carry observable anchors (what the
 * evaluator can actually see), not style preferences.
 */

import type { SimulationContent } from "./types";
import type { MicroSimContent } from "./micro-types";

/** Language that signals cultural-fit / trait inference rather than job evidence. */
const CULTURE_FIT_PATTERNS: { pattern: RegExp; why: string }[] = [
  { pattern: /culture\s*fit/i, why: "culture-fit term" },
  { pattern: /team\s*player/i, why: "trait term" },
  { pattern: /\bpersonality\b/i, why: "personality inference" },
  { pattern: /enthusias(tic|m)/i, why: "affect inference" },
  { pattern: /confident\b(?!.*evidence)/i, why: "confidence-as-trait (unless tied to evidence)" },
  { pattern: /communication style/i, why: "style preference, not job evidence" },
  { pattern: /professionalism/i, why: "vague trait term" },
  { pattern: /likeab/i, why: "likability inference" },
  { pattern: /charism/i, why: "charisma inference" },
  { pattern: /mental state/i, why: "mental-state inference" },
  { pattern: /\bmood\b/i, why: "mood inference" },
  { pattern: /belonging/i, why: "team-belonging inference" },
  { pattern: /executive presence/i, why: "trait term" },
  { pattern: /gravitas/i, why: "trait term" },
];

function scanText(text: string, where: string): string[] {
  const hits: string[] = [];
  for (const { pattern, why } of CULTURE_FIT_PATTERNS) {
    if (pattern.test(text)) hits.push(`${where}: ${why} (matched ${pattern})`);
  }
  return hits;
}

function stakeholderTexts(s: {
  name?: string;
  role?: string;
  blurb?: string;
  knowledge?: string[];
  withholds?: string[];
  responseRules?: { reply: string }[];
  fallbackReply?: string;
  proactiveMessages?: { body: string }[];
  aiPersona?: string;
}): string[] {
  return [
    s.blurb || "",
    ...(s.knowledge || []),
    ...(s.withholds || []),
    ...(s.responseRules || []).map((r) => r.reply),
    s.fallbackReply || "",
    ...(s.proactiveMessages || []).map((p) => p.body),
    s.aiPersona || "",
  ];
}

/**
 * WORK-07: scan all evaluator- and candidate-facing authored text for
 * cultural-fit / trait-inference language. Returns problems; empty = clean.
 */
export function scanForCultureFitLanguage(
  content: SimulationContent | MicroSimContent
): string[] {
  const hits: string[] = [];
  const isFull = (c: unknown): c is SimulationContent =>
    Boolean(c && typeof c === "object" && !("format" in (c as object)));

  for (const c of content.competencies || []) {
    hits.push(...scanText(`${c.label} ${"description" in c ? (c as { description?: string }).description || "" : ""}`, `competency ${c.key}`));
  }
  for (const s of content.stakeholders || []) {
    for (const t of stakeholderTexts(s)) hits.push(...scanText(t, `stakeholder ${s.id}`));
  }
  if (isFull(content)) {
    for (const ind of content.rubricIndicators || []) {
      hits.push(
        ...scanText(
          `${ind.indicator} ${ind.anchorLow} ${ind.anchorMid} ${ind.anchorHigh}`,
          `rubric indicator ${ind.id}`
        )
      );
    }
    for (const check of content.deterministicChecks || []) {
      hits.push(...scanText(check.indicator, `deterministic check ${check.id}`));
    }
  } else {
    const micro = content as MicroSimContent;
    for (const q of micro.questions || []) {
      hits.push(...scanText(`${q.prompt} ${q.helpText || ""}`, `question ${q.id}`));
      for (const c of q.concepts || []) hits.push(...scanText(c.label, `concept ${c.id}`));
    }
  }
  return hits;
}

/** SCEN-02: the four required job-relevant dimensions (matched loosely). */
export const REQUIRED_DIMENSIONS: { key: string; matchers: RegExp[] }[] = [
  { key: "correctness", matchers: [/correct/i, /accura/i, /technical/i] },
  { key: "engineering_judgment", matchers: [/judg/i, /design/i, /reasoning/i, /trade-?off/i] },
  { key: "response_to_requirements", matchers: [/requirement/i, /adapt/i, /change/i, /ambigu/i] },
  { key: "work_communication", matchers: [/communica/i, /stakeholder/i, /handoff/i, /clarif/i] },
];

/**
 * SCEN-02: every required dimension must be present as a competency AND have
 * at least one rubric indicator with non-empty observable anchors.
 */
export function validateDimensionCoverage(
  content: SimulationContent
): { errors: string[]; covered: string[]; missing: string[] } {
  const errors: string[] = [];
  const covered: string[] = [];
  const missing: string[] = [];

  const compText = (content.competencies || []).map((c) => ({
    key: c.key,
    text: `${c.key} ${c.label} ${c.description || ""}`,
  }));
  const indicatorsByComp = new Map<string, typeof content.rubricIndicators>();
  for (const ind of content.rubricIndicators || []) {
    const list = indicatorsByComp.get(ind.competencyKey) || [];
    list.push(ind);
    indicatorsByComp.set(ind.competencyKey, list);
  }

  for (const dim of REQUIRED_DIMENSIONS) {
    const comp = compText.find((c) => dim.matchers.some((m) => m.test(c.text)));
    if (!comp) {
      missing.push(dim.key);
      errors.push(`Missing required dimension: ${dim.key}`);
      continue;
    }
    const inds = indicatorsByComp.get(comp.key) || [];
    const anchored = inds.filter(
      (i) =>
        i.anchorLow?.trim() && i.anchorMid?.trim() && i.anchorHigh?.trim()
    );
    if (anchored.length === 0) {
      missing.push(dim.key);
      errors.push(
        `Dimension "${dim.key}" (competency ${comp.key}) has no rubric indicator with observable anchors`
      );
      continue;
    }
    // Anchors must describe observable behavior, not style preferences.
    for (const ind of anchored) {
      const anchorText = `${ind.anchorLow} ${ind.anchorMid} ${ind.anchorHigh}`;
      const styleHits = scanText(anchorText, `anchor ${ind.id}`);
      for (const h of styleHits) errors.push(h);
    }
    covered.push(dim.key);
  }
  return { errors, covered, missing };
}
