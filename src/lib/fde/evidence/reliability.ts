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
/** Bump this whenever the *math* (formulas below / aggregate.ts / score.ts) changes. */
export const FORMULA_VERSION = "evidence-formula-v2";

/** Floor for denominators — keeps every formula finite. */
export const EPS = 1e-9;

/**
 * Expert-prior variance folded into SE. Bernoulli variance peaks at 0.25;
 * we use a milder prior so SE is not dominated by the prior term at small N_eff.
 * Bounds contribution via `priorVar / (nEff + SE_PRIOR_LAMBDA)`.
 */
export const SE_PRIOR_VAR = 0.0625;
/** Pseudo-count strength for the SE prior term (matches shrink k scale). */
export const SE_PRIOR_LAMBDA = 2;

export function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clampFinite(value, 0, 1);
}

/**
 * Kish effective sample size for a set of non-negative weights:
 *
 *   N_eff = (Σ w)² / (Σ w² + ε)
 *
 * Bounds: empty → 0; otherwise finite in (0, weights.length]. Duplicate /
 * correlated mass in the same weight vector does not inflate N_eff the way a
 * raw count would — equal weights of 1 yield N_eff = n; one dominant weight
 * yields N_eff ≈ 1.
 */
export function effectiveSampleSize(weights: number[]): number {
  if (weights.length === 0) return 0;

  let sum = 0;
  let sumSq = 0;
  let usable = 0;
  for (const w of weights) {
    if (!Number.isFinite(w) || w <= 0) continue;
    sum += w;
    sumSq += w * w;
    usable += 1;
  }
  if (usable === 0 || sum <= 0) return 0;

  // Use max(sumSq, ε) so equal unit weights yield exactly `usable`, while
  // still guarding a degenerate all-zero sumSq path.
  const nEff = (sum * sum) / Math.max(sumSq, EPS);
  return clampFinite(nEff, 0, usable);
}

/**
 * Standard error of a [0,1] estimate under an effective sample size:
 *
 *   SE = √( p(1-p) / max(N_eff, ε)  +  priorVar / (N_eff + λ) )
 *
 * Bounds: always finite in [0, 0.5]. `priorVar` defaults to SE_PRIOR_VAR.
 */
export function standardError(
  estimate01: number,
  nEff: number,
  priorVar: number = SE_PRIOR_VAR
): number {
  const p = clamp01(estimate01);
  const safeN = Number.isFinite(nEff) && nEff > 0 ? nEff : 0;
  const safePriorVar = Number.isFinite(priorVar) && priorVar >= 0 ? priorVar : SE_PRIOR_VAR;
  const bernoulli = (p * (1 - p)) / Math.max(safeN, EPS);
  const priorTerm = safePriorVar / (safeN + SE_PRIOR_LAMBDA);
  const se = Math.sqrt(Math.max(0, bernoulli + priorTerm));
  return clampFinite(se, 0, 0.5);
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
 * A symmetric uncertainty band around an estimate.
 *
 * When `se` is provided (preferred in formula-v2), the margin is that SE
 * clamped to [0, 0.5]. Otherwise falls back to the legacy n-based margin
 * `0.5 / √(n+1)` so existing aggregate/predict call sites stay compatible.
 *
 * Never NaN/Infinity; low/high always in [0, 1] with low <= high.
 */
export function uncertaintyBand(
  estimate: number,
  n: number,
  se?: number
): { low: number; high: number } {
  const safeEstimate = clamp01(estimate);
  const margin =
    se != null && Number.isFinite(se)
      ? clampFinite(se, 0, 0.5)
      : clamp01(0.5 / Math.sqrt((Number.isFinite(n) && n > 0 ? n : 0) + 1));

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
