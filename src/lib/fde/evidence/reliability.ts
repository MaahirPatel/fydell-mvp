/**
 * Evidence mathematics — reliability, independence, and shrinkage.
 *
 * Pure functions only. Every function here must return a finite number in
 * its documented range for any input, including empty arrays and zero
 * denominators — never NaN, never Infinity.
 */
import type { EvidenceAtomInput } from "./types";

/** Bump this whenever the *policy* (which evidence counts, thresholds, caps) changes. */
export const POLICY_VERSION = "evidence-policy-v1";
/** Bump this whenever the *math* (formulas below / aggregate.ts) changes. */
export const FORMULA_VERSION = "evidence-formula-v1";

export function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clampFinite(value, 0, 1);
}

/**
 * Geometric mean of a set of 0–1 reliability weights. Unlike an arithmetic
 * mean, a single unreliable input pulls the combined reliability down hard —
 * which is the point: one untrustworthy source should not be diluted away
 * by several trustworthy ones.
 *
 * Empty input, any non-finite input, or any weight <= 0 → 0 (never NaN).
 */
export function geometricMeanReliability(weights: number[]): number {
  const clean = weights.filter((w) => Number.isFinite(w));
  if (clean.length === 0) return 0;
  if (clean.some((w) => w <= 0)) return 0;

  const logSum = clean.reduce((acc, w) => acc + Math.log(clamp01(w)), 0);
  const mean = Math.exp(logSum / clean.length);
  return clampFinite(mean, 0, 1);
}

/** How much weight an atom carries when picking a representative per group. */
function atomWeight(atom: EvidenceAtomInput): number {
  return clamp01(atom.relevance) * clamp01(atom.reliability);
}

export type IndependenceCapResult = {
  /** All atoms bucketed by independence_group. */
  groups: Map<string, EvidenceAtomInput[]>;
  /** Number of distinct independence groups — the true count of independent
   * opportunities observed. Atoms in the same group are the same opportunity
   * seen more than once, not additional independent evidence. */
  independentCount: number;
  /** One representative atom per group (the strongest by relevance*reliability),
   * i.e. the capped, deduplicated evidence set. */
  representatives: EvidenceAtomInput[];
};

/**
 * Collapses atoms into independent opportunities. Atoms sharing an
 * independence_group are duplicates of the same opportunity — five atoms in
 * one group is still only one independent data point, not five.
 */
export function independenceCap(atoms: EvidenceAtomInput[]): IndependenceCapResult {
  const groups = new Map<string, EvidenceAtomInput[]>();
  atoms.forEach((atom, i) => {
    const key = atom.independenceGroup && atom.independenceGroup.length > 0
      ? atom.independenceGroup
      : `__ungrouped_${i}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(atom);
    else groups.set(key, [atom]);
  });

  const representatives: EvidenceAtomInput[] = [];
  for (const bucket of groups.values()) {
    const best = bucket.reduce((a, b) => (atomWeight(b) > atomWeight(a) ? b : a));
    representatives.push(best);
  }

  return { groups, independentCount: groups.size, representatives };
}

/**
 * Bayesian-style shrinkage toward a prior. `n` is the amount of real evidence
 * (independent opportunities), `k` is the strength of the prior (pseudo-count) —
 * higher `k` requires more real evidence before trusting the raw estimate.
 *
 * n + k <= 0 → returns the prior unchanged. Never NaN/Infinity.
 */
export function shrinkEstimate(raw: number, prior: number, n: number, k: number): number {
  const safeRaw = clamp01(raw);
  const safePrior = clamp01(prior);
  const safeN = Number.isFinite(n) && n > 0 ? n : 0;
  const safeK = Number.isFinite(k) && k > 0 ? k : 0;

  const denom = safeN + safeK;
  if (denom <= 0) return safePrior;

  return clamp01((safeRaw * safeN + safePrior * safeK) / denom);
}

/**
 * A symmetric uncertainty band around an estimate that narrows as the amount
 * of independent evidence `n` grows. With n=0 the band nearly spans [0, 1];
 * it shrinks toward zero width as n grows large. Never NaN/Infinity, and
 * low/high are always clamped to [0, 1] with low <= high.
 */
export function uncertaintyBand(estimate: number, n: number): { low: number; high: number } {
  const safeEstimate = clamp01(estimate);
  const safeN = Number.isFinite(n) && n > 0 ? n : 0;
  const margin = clamp01(0.5 / Math.sqrt(safeN + 1));

  return {
    low: clamp01(safeEstimate - margin),
    high: clamp01(safeEstimate + margin),
  };
}

/**
 * Reliability ceilings by source kind. An LLM-generated annotation, however
 * confident, is never as trustworthy as a directly-observed behavioral event
 * (a test run, a submission) — so it's capped well below 1.
 */
export const SOURCE_RELIABILITY_CAP: Record<string, number> = {
  behavioral_direct: 1,
  behavioral_heuristic: 0.75,
  llm_annotation: 0.55,
  self_report: 0.35,
};

const DEFAULT_SOURCE_RELIABILITY_CAP = 0.5;

/** Applies the source-kind ceiling to a raw reliability value. */
export function capReliabilityForSource(raw: number, sourceKind: string): number {
  const cap = SOURCE_RELIABILITY_CAP[sourceKind] ?? DEFAULT_SOURCE_RELIABILITY_CAP;
  return clamp01(Math.min(clamp01(raw), cap));
}
