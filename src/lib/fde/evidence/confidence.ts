/**
 * Confidence decomposition for a trait (or composite) estimate.
 *
 *   Conf = (1 − e^{−N_eff / τ}) × (1 − SE*) × Diversity × Provenance
 *
 * All factors and Conf are finite in [0, 1]. Pure function — no I/O.
 *
 * Expert-prior constants below are design-weighted (not outcome-calibrated).
 */
import { clampFinite, EPS } from "./reliability";

/** Sufficiency scale: N_eff ≈ τ reaches ~63% of the sufficiency term. */
export const CONF_TAU = 2;

/**
 * SE is bounded to [0, 0.5]; SE* = clamp(SE / 0.5, 0, 1) so a max-width
 * band drives the consistency term to 0.
 */
export const SE_STAR_SCALE = 0.5;

/** Label thresholds on confidence01 (expert prior). */
export const CONF_LABEL_MEDIUM = 0.4;
export const CONF_LABEL_HIGH = 0.7;

export type ConfidenceLabel = "low" | "medium" | "high";

export type ConfidenceDecomposition = {
  /** 1 − e^{−N_eff / τ} — how much effective evidence we have. */
  sufficiency: number;
  /** 1 − SE* — how tight the estimate is. */
  consistency: number;
  /** Caller-supplied diversity of independent sources, [0, 1]. */
  diversity: number;
  /** Caller-supplied provenance / source-quality factor, [0, 1]. */
  provenance: number;
  /** Product of the four factors, [0, 1]. */
  confidence01: number;
  label: ConfidenceLabel;
};

function clamp01(value: number): number {
  return clampFinite(value, 0, 1);
}

function labelFor(confidence01: number): ConfidenceLabel {
  if (confidence01 >= CONF_LABEL_HIGH) return "high";
  if (confidence01 >= CONF_LABEL_MEDIUM) return "medium";
  return "low";
}

/**
 * Decompose confidence into sufficiency × consistency × diversity × provenance.
 *
 * @param nEff       Kish effective sample size (≥ 0)
 * @param se         Standard error in [0, 0.5]
 * @param diversity01  Independence / source diversity, [0, 1]
 * @param provenance01 Source-quality / reliability factor, [0, 1]
 * @param tau        Optional sufficiency scale (default CONF_TAU)
 */
export function decomposeConfidence(input: {
  nEff: number;
  se: number;
  diversity01: number;
  provenance01: number;
  tau?: number;
}): ConfidenceDecomposition {
  const nEff = Number.isFinite(input.nEff) && input.nEff > 0 ? input.nEff : 0;
  const tau = Number.isFinite(input.tau) && (input.tau as number) > 0 ? (input.tau as number) : CONF_TAU;
  const se = clampFinite(input.se, 0, 0.5);

  const sufficiency = clamp01(1 - Math.exp(-nEff / Math.max(tau, EPS)));
  const seStar = clamp01(se / SE_STAR_SCALE);
  const consistency = clamp01(1 - seStar);
  const diversity = clamp01(input.diversity01);
  const provenance = clamp01(input.provenance01);
  const confidence01 = clamp01(sufficiency * consistency * diversity * provenance);

  return {
    sufficiency,
    consistency,
    diversity,
    provenance,
    confidence01,
    label: labelFor(confidence01),
  };
}
