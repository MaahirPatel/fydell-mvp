/**
 * Numeric scoring layer on top of evidence aggregates.
 *
 * Formulas (versioned via FORMULA_VERSION in reliability.ts):
 *
 *   direction_sign ∈ {+1 supporting, −1 counter, 0 mixed/neutral}
 *   signed = Σ (sign × magnitude × relevance) / Σ relevance
 *   raw01  = (signed + 1) / 2
 *   estimate = shrinkEstimate(raw01, prior=0.5, n=independentCount, k=2)
 *   score100 = round(estimate × 100)   // deterministic integer rounding
 *
 * Composite fit (primary dimensions only):
 *   composite01 = weighted mean of available dimension estimates
 *               (equal weights; insufficient/null dims omitted from mean,
 *                but reduce predictive confidence)
 *   fitScore100 = round(composite01 × 100)
 */
import type { DimensionAggregate, EvidenceAtomInput, QualitativeState } from "./types";
import {
  FORMULA_VERSION,
  POLICY_VERSION,
  geometricMeanReliability,
  independenceCap,
  shrinkEstimate,
  uncertaintyBand,
} from "./reliability";
import { aggregateDimension } from "./aggregate";
import { PRIMARY_DIMENSION_IDS } from "../evaluation-contract";

export { FORMULA_VERSION, POLICY_VERSION };

const SHRINK_PRIOR = 0.5;
const SHRINK_K = 2;
const STRONG_MAGNITUDE_THRESHOLD = 0.7;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function directionSign(direction: EvidenceAtomInput["direction"]): number {
  if (direction === "supporting") return 1;
  if (direction === "counter") return -1;
  return 0;
}

/** Compute shrunk estimate from representatives (works for n ≥ 1). */
export function computeShrunkEstimate(
  representatives: EvidenceAtomInput[],
  independentCount: number
): { estimate: number; band: { low: number; high: number }; reliability: number } {
  if (representatives.length === 0) {
    return { estimate: SHRINK_PRIOR, band: uncertaintyBand(SHRINK_PRIOR, 0), reliability: 0 };
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
      estimate,
      band: uncertaintyBand(estimate, independentCount),
      reliability: geometricMeanReliability(representatives.map((a) => a.reliability)),
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
  return {
    estimate,
    band: uncertaintyBand(estimate, independentCount),
    reliability: geometricMeanReliability(representatives.map((a) => a.reliability)),
  };
}

export type DimensionScore = DimensionAggregate & {
  /** 0–100 integer, null only when zero atoms. */
  score100: number | null;
  /** True when independentCount < 2 — score is shown but labeled provisional. */
  provisional: boolean;
  reliability: number;
  label: string;
};

const DIMENSION_LABELS: Record<string, string> = {
  discovery_problem_framing: "Discovery and problem framing",
  technical_scoping_prioritization: "Technical scoping and prioritization",
  engineering_applied_ai_execution: "Engineering and applied-AI execution",
  evaluation_production_judgment: "Evaluation and production judgment",
  adaptation_customer_communication: "Adaptation and customer communication",
};

export function scoreDimension(atoms: EvidenceAtomInput[]): DimensionScore {
  const agg = aggregateDimension(atoms);
  const { independentCount, representatives } = independenceCap(atoms);
  const dimensionId = agg.dimensionId || atoms[0]?.dimensionId || "";

  if (representatives.length === 0) {
    return {
      ...agg,
      dimensionId,
      score100: null,
      provisional: true,
      reliability: 0,
      label: DIMENSION_LABELS[dimensionId] || dimensionId,
    };
  }

  const { estimate, band, reliability } = computeShrunkEstimate(representatives, independentCount);
  const score100 = Math.round(estimate * 100);

  return {
    dimensionId,
    state: agg.state,
    estimate,
    band,
    atomCount: atoms.length,
    independentCount,
    score100,
    provisional: independentCount < 2 || agg.state === "insufficient",
    reliability,
    label: DIMENSION_LABELS[dimensionId] || dimensionId,
  };
}

export type CompositeFit = {
  fitScore100: number | null;
  composite01: number | null;
  band: { low: number; high: number } | null;
  scoredDimensionCount: number;
  provisionalDimensionCount: number;
  insufficientDimensionIds: string[];
  dimensions: DimensionScore[];
  policyVersion: string;
  formulaVersion: string;
};

/** Equal-weight composite across primary dimensions that have at least one atom. */
export function compositeFitScore(allAtoms: EvidenceAtomInput[]): CompositeFit {
  const dimensions: DimensionScore[] = PRIMARY_DIMENSION_IDS.map((id) => {
    const dimAtoms = allAtoms.filter((a) => a.dimensionId === id);
    if (dimAtoms.length === 0) {
      return {
        dimensionId: id,
        state: "insufficient" as QualitativeState,
        atomCount: 0,
        independentCount: 0,
        score100: null,
        provisional: true,
        reliability: 0,
        label: DIMENSION_LABELS[id] || id,
      };
    }
    return scoreDimension(dimAtoms);
  });

  const usable = dimensions.filter((d) => d.estimate != null && Number.isFinite(d.estimate));
  const insufficientDimensionIds = dimensions
    .filter((d) => d.state === "insufficient" || d.score100 == null)
    .map((d) => d.dimensionId);

  if (usable.length === 0) {
    return {
      fitScore100: null,
      composite01: null,
      band: null,
      scoredDimensionCount: 0,
      provisionalDimensionCount: dimensions.filter((d) => d.provisional).length,
      insufficientDimensionIds,
      dimensions,
      policyVersion: POLICY_VERSION,
      formulaVersion: FORMULA_VERSION,
    };
  }

  const composite01 =
    usable.reduce((sum, d) => sum + (d.estimate as number), 0) / usable.length;
  const n = usable.length;
  const band = uncertaintyBand(composite01, n);
  // Prefer non-provisional dims for the headline fit when available
  const solid = usable.filter((d) => !d.provisional);
  const headline01 =
    solid.length > 0
      ? solid.reduce((sum, d) => sum + (d.estimate as number), 0) / solid.length
      : composite01;

  return {
    fitScore100: Math.round(headline01 * 100),
    composite01: headline01,
    band,
    scoredDimensionCount: usable.length,
    provisionalDimensionCount: dimensions.filter((d) => d.provisional).length,
    insufficientDimensionIds,
    dimensions,
    policyVersion: POLICY_VERSION,
    formulaVersion: FORMULA_VERSION,
  };
}
