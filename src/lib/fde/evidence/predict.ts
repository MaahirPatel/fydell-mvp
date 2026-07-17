/**
 * Predictive hiring model (prototype v1) built on formula-scored work-sample evidence.
 *
 * What it predicts:
 *   P(hire-relevant success) ≈ likelihood the candidate would advance a technical
 *   interview AND perform adequately in the first 90 days on similar FDE
 *   deployment work, estimated from this Project Relay work sample.
 *
 * Formula (PREDICT_FORMULA_VERSION):
 *   base = shrinkEstimate(composite01, prior=0.45, n=scoredDimensionCount, k=3)
 *   if any dimension state === 'counter'           → base *= 0.85
 *   if ≥2 dimensions state === 'strong_supporting' → base = min(0.98, base * 1.06)
 *   if provisionalDimensionCount ≥ 3               → base = shrinkEstimate(base, 0.45, 1, 4)
 *   hireProbability = clamp01(base)
 *
 * Recommendation thresholds (on hireProbability):
 *   ≥ 0.72 → strong_advance
 *   ≥ 0.58 → advance
 *   ≥ 0.42 → hold
 *   <  0.42 → decline
 *
 * Confidence from band width + scored/provisional mix — never claims certainty.
 */
import { clampFinite, shrinkEstimate, uncertaintyBand } from "./reliability";
import type { CompositeFit } from "./score";

export const PREDICT_MODEL_VERSION = "predict-hire-v1";
export const PREDICT_FORMULA_VERSION = "predict-formula-v1";

export type HireRecommendation = "strong_advance" | "advance" | "hold" | "decline";

export type PredictiveHire = {
  modelVersion: string;
  formulaVersion: string;
  /** 0–1 predicted probability of hire-relevant success on similar FDE work. */
  hireProbability: number;
  /** 0–100 integer for display. */
  hireProbabilityPct: number;
  band: { low: number; high: number };
  recommendation: HireRecommendation;
  recommendationLabel: string;
  confidence: "low" | "medium" | "high";
  /** Human-readable drivers. */
  drivers: string[];
  /** Explicit risk / limitation statements. */
  caveats: string[];
  /** What the model claims to predict. */
  predicts: string;
  /** Criterion-validation status for CHRO / legal. */
  validationStatus: "prototype_unvalidated" | "pilot_calibrating" | "validated";
};

function clamp01(n: number): number {
  return clampFinite(n, 0, 1);
}

function recommendationFor(p: number): HireRecommendation {
  if (p >= 0.72) return "strong_advance";
  if (p >= 0.58) return "advance";
  if (p >= 0.42) return "hold";
  return "decline";
}

const LABELS: Record<HireRecommendation, string> = {
  strong_advance: "Strong advance",
  advance: "Advance",
  hold: "Hold for interview calibration",
  decline: "Decline / do not advance",
};

export function predictHire(fit: CompositeFit): PredictiveHire {
  const caveats: string[] = [
    "Prototype predictive model — not a sole hiring authority. A human must record the final decision with rationale.",
    "Criterion validation (adverse-impact / 90-day outcome study) is in progress; treat probabilities as decision-support, not certified validity.",
  ];
  const drivers: string[] = [];

  if (fit.composite01 == null || fit.scoredDimensionCount === 0) {
    return {
      modelVersion: PREDICT_MODEL_VERSION,
      formulaVersion: PREDICT_FORMULA_VERSION,
      hireProbability: 0.45,
      hireProbabilityPct: 45,
      band: uncertaintyBand(0.45, 0),
      recommendation: "hold",
      recommendationLabel: LABELS.hold,
      confidence: "low",
      drivers: ["Insufficient scored dimensions — prediction defaults to hold."],
      caveats: [
        ...caveats,
        "No dimension reached scoreable evidence; do not treat the default probability as candidate weakness.",
      ],
      predicts:
        "Likelihood of advancing a technical interview and performing adequately in the first 90 days on similar FDE deployment work.",
      validationStatus: "prototype_unvalidated",
    };
  }

  let base = shrinkEstimate(fit.composite01, 0.45, fit.scoredDimensionCount, 3);
  drivers.push(
    `Composite fit ${fit.fitScore100}/100 from ${fit.scoredDimensionCount} scored primary dimension(s) (formula ${fit.formulaVersion}).`
  );

  const counterDims = fit.dimensions.filter((d) => d.state === "counter");
  if (counterDims.length > 0) {
    base = clamp01(base * 0.85);
    drivers.push(
      `Counter-evidence on: ${counterDims.map((d) => d.label).join(", ")} (−15% adjustment).`
    );
  }

  const strongDims = fit.dimensions.filter((d) => d.state === "strong_supporting");
  if (strongDims.length >= 2) {
    base = clamp01(Math.min(0.98, base * 1.06));
    drivers.push(
      `Strong supporting evidence on ${strongDims.length} dimensions (+6% capped adjustment).`
    );
  }

  if (fit.provisionalDimensionCount >= 3) {
    base = shrinkEstimate(base, 0.45, 1, 4);
    drivers.push("Three or more provisional dimensions — probability shrunk toward prior.");
    caveats.push("Several dimensions remain provisional (fewer than two independent opportunities).");
  }

  if (fit.insufficientDimensionIds.length > 0) {
    caveats.push(
      `Insufficient evidence on: ${fit.insufficientDimensionIds.join(", ")} — treated as inconclusive, not negative.`
    );
  }

  const hireProbability = clamp01(base);
  const band = uncertaintyBand(hireProbability, fit.scoredDimensionCount);
  const width = band.high - band.low;
  let confidence: "low" | "medium" | "high" = "medium";
  if (fit.scoredDimensionCount <= 2 || width > 0.35 || fit.provisionalDimensionCount >= 3) {
    confidence = "low";
  } else if (fit.scoredDimensionCount >= 4 && width < 0.22 && fit.provisionalDimensionCount === 0) {
    confidence = "high";
  }

  const recommendation = recommendationFor(hireProbability);

  return {
    modelVersion: PREDICT_MODEL_VERSION,
    formulaVersion: PREDICT_FORMULA_VERSION,
    hireProbability,
    hireProbabilityPct: Math.round(hireProbability * 100),
    band,
    recommendation,
    recommendationLabel: LABELS[recommendation],
    confidence,
    drivers,
    caveats,
    predicts:
      "Likelihood of advancing a technical interview and performing adequately in the first 90 days on similar FDE deployment work, estimated from this Project Relay work sample.",
    validationStatus: "prototype_unvalidated",
  };
}
