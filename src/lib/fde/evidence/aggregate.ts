/**
 * Evidence mathematics — atoms → a per-dimension qualitative state.
 *
 * Pure function, no I/O. There is deliberately no cross-dimension
 * combination anywhere in this file — each dimension is judged on its own
 * evidence, and there is no overall candidate score.
 */
import type { DimensionAggregate, EvidenceAtomInput, QualitativeState } from "./types";
import { geometricMeanReliability, independenceCap, shrinkEstimate, uncertaintyBand } from "./reliability";

/** Minimum independent opportunities before we'll say anything at all. Mirrors
 * EvaluationDimension.minimumIndependentOpportunities in evaluation-contract.ts,
 * which is 2 for every primary dimension in the current contract. */
const MIN_INDEPENDENT_OPPORTUNITIES = 2;

/** An atom's magnitude at/above this counts as "strong" for the strong-support
 * vs strong-counter conflict check. */
const STRONG_MAGNITUDE_THRESHOLD = 0.7;

/** Shrinkage prior: with no evidence, a dimension is neutral, not counter. */
const SHRINK_PRIOR = 0.5;
/** Shrinkage strength: requires real independent evidence to move far from
 * the neutral prior — two weak-ish independent atoms should not swing wildly. */
const SHRINK_K = 2;

/** "strong_supporting" additionally requires more independent opportunities
 * than the bare minimum — two strong-but-thin data points is "supporting",
 * not yet "strong_supporting". */
const STRONG_SUPPORT_MIN_INDEPENDENT = 3;
const STRONG_SUPPORT_MIN_RELIABILITY = 0.5;

const COUNTER_CEILING = 0.4;
const MIXED_CEILING = 0.55;
const STRONG_FLOOR = 0.8;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function directionSign(direction: EvidenceAtomInput["direction"]): number {
  if (direction === "supporting") return 1;
  if (direction === "counter") return -1;
  return 0;
}

/**
 * Aggregates one dimension's atoms into a qualitative state.
 *
 * Rules (in order):
 *  1. Fewer than 2 independent opportunities → "insufficient" (this also
 *     covers zero atoms — a missing opportunity is insufficient, not counter).
 *  2. A strong "supporting" atom and a strong "counter" atom both present →
 *     "mixed", regardless of the net weighted score.
 *  3. Otherwise, shrink the relevance-weighted net score toward a neutral
 *     prior (more independent evidence → less shrinkage) and classify by
 *     the shrunk estimate. "strong_supporting" additionally requires at
 *     least 3 independent opportunities and decent combined reliability.
 */
export function aggregateDimension(atoms: EvidenceAtomInput[]): DimensionAggregate {
  const dimensionId = atoms.find((a) => a.dimensionId)?.dimensionId ?? "";
  const atomCount = atoms.length;

  const { independentCount, representatives } = independenceCap(atoms);

  if (independentCount < MIN_INDEPENDENT_OPPORTUNITIES || representatives.length === 0) {
    return { dimensionId, state: "insufficient", atomCount, independentCount };
  }

  const hasStrongSupport = representatives.some(
    (a) => a.direction === "supporting" && a.magnitude >= STRONG_MAGNITUDE_THRESHOLD
  );
  const hasStrongCounter = representatives.some(
    (a) => a.direction === "counter" && a.magnitude >= STRONG_MAGNITUDE_THRESHOLD
  );

  if (hasStrongSupport && hasStrongCounter) {
    const estimate = 0.5;
    return {
      dimensionId,
      state: "mixed",
      estimate,
      band: uncertaintyBand(estimate, independentCount),
      atomCount,
      independentCount,
    };
  }

  const weights = representatives.map((a) => clamp01(a.relevance));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const signedScore =
    totalWeight > 0
      ? representatives.reduce(
          (sum, a, i) => sum + directionSign(a.direction) * clamp01(a.magnitude) * weights[i],
          0
        ) / totalWeight
      : 0;

  const rawEstimate01 = clamp01((signedScore + 1) / 2);
  const estimate = shrinkEstimate(rawEstimate01, SHRINK_PRIOR, independentCount, SHRINK_K);
  const band = uncertaintyBand(estimate, independentCount);
  const combinedReliability = geometricMeanReliability(representatives.map((a) => a.reliability));

  let state: QualitativeState;
  if (estimate < COUNTER_CEILING) {
    state = "counter";
  } else if (estimate < MIXED_CEILING) {
    state = "mixed";
  } else if (
    estimate >= STRONG_FLOOR &&
    independentCount >= STRONG_SUPPORT_MIN_INDEPENDENT &&
    combinedReliability >= STRONG_SUPPORT_MIN_RELIABILITY
  ) {
    state = "strong_supporting";
  } else {
    state = "supporting";
  }

  return { dimensionId, state, estimate, band, atomCount, independentCount };
}
