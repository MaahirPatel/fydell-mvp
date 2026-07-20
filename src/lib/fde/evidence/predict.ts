/**
 * Predictive hiring model (design-weighted v2) built on the 10-trait FDE
 * composite fit score.
 *
 * What it predicts:
 *   P(hire-relevant success) ≈ likelihood the candidate would advance a
 *   technical interview AND perform adequately in the first 90 days on
 *   similar FDE deployment work, estimated from this Project Relay session.
 *
 * Formula (PREDICT_FORMULA_VERSION):
 *   base = shrinkEstimate(composite01, prior=0.45, n=observedTraitCount, k=3)
 *   if any trait bucket === 'limited_evidence' on a ≥0.12-weight trait → base *= 0.9
 *   if ≥2 traits bucket === 'strong_evidence'                          → base = min(0.97, base * 1.05)
 *   if observedTraitCount <= 3 (of 10)                                  → base = shrinkEstimate(base, 0.45, 1, 4)
 *   hireProbability = clamp01(base)
 *
 * Recommendation thresholds (on hireProbability), three-tier by design so the
 * model never manufactures false confidence with a "strong advance" tier:
 *   ≥ 0.60 → advance
 *   ≥ 0.40 → hold
 *   <  0.40 → decline
 *
 * Confidence from band width + observed/not-observed mix — never claims
 * certainty. This model is decision support only; see caveats below.
 */
import { clampFinite, shrinkEstimate, uncertaintyBand } from "./reliability";
import type { CompositeFit } from "./score";
import { FDE_W } from "./traits";

export const PREDICT_MODEL_VERSION = "predict-hire-traits-v2";
export const PREDICT_FORMULA_VERSION = "predict-formula-v2";

export type HireRecommendation = "advance" | "hold" | "decline";

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

const HEAVY_WEIGHT_THRESHOLD = 0.12;

function clamp01(n: number): number {
  return clampFinite(n, 0, 1);
}

function recommendationFor(p: number): HireRecommendation {
  if (p >= 0.6) return "advance";
  if (p >= 0.4) return "hold";
  return "decline";
}

const LABELS: Record<HireRecommendation, string> = {
  advance: "Advance",
  hold: "Hold for interview calibration",
  decline: "Decline / do not advance",
};

const BASE_CAVEATS = [
  "Design-weighted decision-support model — not a sole hiring authority. A human must record the final decision with rationale.",
  "Trait weights and thresholds are design-weighted, not yet outcome-validated. Criterion validation (adverse-impact / 90-day outcome study) is in progress; treat probabilities as decision-support, not certified validity.",
];

export function predictHire(fit: CompositeFit): PredictiveHire {
  const caveats: string[] = [...BASE_CAVEATS];
  const drivers: string[] = [];

  if (fit.composite01 == null || fit.observedTraitCount === 0) {
    return {
      modelVersion: PREDICT_MODEL_VERSION,
      formulaVersion: PREDICT_FORMULA_VERSION,
      hireProbability: 0.45,
      hireProbabilityPct: 45,
      band: uncertaintyBand(0.45, 0),
      recommendation: "hold",
      recommendationLabel: LABELS.hold,
      confidence: "low",
      drivers: ["No trait reached an observed opportunity — prediction defaults to hold."],
      caveats: [
        ...caveats,
        "Every trait is not_observed for this session; do not treat the default probability as candidate weakness.",
      ],
      predicts:
        "Likelihood of advancing a technical interview and performing adequately in the first 90 days on similar FDE deployment work.",
      validationStatus: "prototype_unvalidated",
    };
  }

  let base = shrinkEstimate(fit.composite01, 0.45, fit.observedTraitCount, 3);
  drivers.push(
    `Composite fit ${fit.fitScore100}/100 from ${fit.observedTraitCount} of 10 traits with an observed opportunity (formula ${fit.formulaVersion}).`
  );

  const limitedHeavyTraits = fit.traits.filter(
    (t) => t.bucket === "limited_evidence" && t.weight >= HEAVY_WEIGHT_THRESHOLD
  );
  if (limitedHeavyTraits.length > 0) {
    base = clamp01(base * 0.9);
    drivers.push(
      `Limited evidence on high-weight trait(s): ${limitedHeavyTraits.map((t) => t.label).join(", ")} (−10% adjustment).`
    );
  }

  if (fit.strongEvidenceTraitCount >= 2) {
    base = clamp01(Math.min(0.97, base * 1.05));
    drivers.push(`Strong evidence on ${fit.strongEvidenceTraitCount} trait(s) (+5% capped adjustment).`);
  }

  if (fit.observedTraitCount <= 3) {
    base = shrinkEstimate(base, 0.45, 1, 4);
    drivers.push("Three or fewer traits had an observed opportunity — probability shrunk toward prior.");
    caveats.push("Most traits are not_observed for this session — the scenario didn't create those moments.");
  }

  if (fit.notObservedTraitIds.length > 0) {
    const notObservedWeight = fit.notObservedTraitIds.reduce((sum, id) => sum + FDE_W[id], 0);
    caveats.push(
      `Not observed (no opportunity presented): ${fit.notObservedTraitIds.join(", ")} — ${Math.round(notObservedWeight * 100)}% of composite weight excluded, not penalized.`
    );
  }

  const needsReviewTraits = fit.traits.filter((t) => t.bucket === "needs_review");
  if (needsReviewTraits.length > 0) {
    caveats.push(
      `Needs review (thin evidence, treat as inconclusive not negative): ${needsReviewTraits.map((t) => t.label).join(", ")}.`
    );
  }

  const hireProbability = clamp01(base);
  const band = uncertaintyBand(hireProbability, fit.observedTraitCount);
  const width = band.high - band.low;
  let confidence: "low" | "medium" | "high" = "medium";
  if (fit.observedTraitCount <= 3 || width > 0.35) {
    confidence = "low";
  } else if (fit.observedTraitCount >= 7 && width < 0.22 && fit.notObservedTraitIds.length === 0) {
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
