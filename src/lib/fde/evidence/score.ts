/**
 * Numeric scoring layer for the 10-trait FDE model.
 *
 * Per-trait formula (versioned via FORMULA_VERSION in reliability.ts):
 *
 *   z_i      = direction_sign(atom_i) × magnitude_i,             z_i ∈ [-1, 1]
 *   raw      = Σ(relevance_i × reliability_i × decay_i × z_i)
 *              ────────────────────────────────────────────────
 *              Σ(relevance_i × reliability_i × decay_i)
 *
 *   (decay_i is a reserved per-atom multiplier, currently always 1 — kept so
 *   a future recency/staleness weighting doesn't require a formula-shape
 *   change, only a version bump.)
 *
 *   raw01    = (raw + 1) / 2
 *   shrunk   = shrinkEstimate(raw01, prior=0.5, n=independentCount, k=2)
 *   N_eff    = effectiveSampleSize(relevance × reliability of reps)
 *   SE       = standardError(shrunk, N_eff)
 *   score100 = round(shrunk × 100)                                0–100
 *   Conf     = decomposeConfidence({ nEff, se, diversity, provenance })
 *
 * `raw` (the signed [-1,1] evidence signal) is an internal-only quantity —
 * it is never surfaced to the employer UI. What ships externally is always
 * one of: a qualitative bucket, score100, or a cited transcript moment.
 *
 * Composite (role fit), formula-v2:
 *   S_arith  = Σ w_j z_j / Σ w_j     over OBSERVED traits (z = score01)
 *   S_geom   = exp( Σ w_j log(ε+z_j) / Σ w_j )
 *   S        = α·S_arith + (1−α)·S_geom     α = 0.65
 *   fitScore100 = round(S×100) in [1,100], or null when
 *     observedTraitCount < 2 OR mean(N_eff) < 0.5
 *
 * A trait with Opportunity_flag = 0 (see opportunity.ts) is excluded from
 * the composite entirely — it is "not_observed", not a zero.
 */
import type { EvidenceAtomInput } from "./types";
import {
  EPS,
  FORMULA_VERSION,
  POLICY_VERSION,
  effectiveSampleSize,
  geometricMeanReliability,
  independenceCap,
  shrinkEstimate,
  standardError,
  uncertaintyBand,
} from "./reliability";
import { decomposeConfidence, type ConfidenceDecomposition } from "./confidence";
import type { OpportunityFlags } from "./opportunity";
import { FDE_W, TRAIT_IDS, TRAIT_LABELS, TRAIT_MIN_INDEPENDENT_FOR_STRONG, type TraitId } from "./traits";

export { FORMULA_VERSION, POLICY_VERSION };

const SHRINK_PRIOR = 0.5;
const SHRINK_K = 2;

/** Reserved per-atom decay multiplier — always 1 in formula v2; see module doc. */
const ATOM_DECAY = 1;

const STRONG_EVIDENCE_SCORE_FLOOR = 60;
const NEEDS_REVIEW_SCORE_FLOOR = 40;

/** Blend weight for arithmetic vs geometric composite (expert prior). */
export const COMPOSITE_ALPHA = 0.65;
/** Minimum average N_eff across observed traits before publishing fitScore100. */
export const COMPOSITE_MIN_MEAN_NEFF = 0.5;
/** Minimum observed traits before publishing fitScore100. */
export const COMPOSITE_MIN_OBSERVED_TRAITS = 2;

export type TraitBucket = "not_observed" | "limited_evidence" | "needs_review" | "strong_evidence";

export const CONFIDENCE_TAG = "design-weighted, not yet outcome-validated";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function directionSign(direction: EvidenceAtomInput["direction"]): number {
  if (direction === "supporting") return 1;
  if (direction === "counter") return -1;
  return 0;
}

function atomWeight(atom: EvidenceAtomInput): number {
  return clamp01(atom.relevance) * clamp01(atom.reliability) * ATOM_DECAY;
}

/**
 * Evidence-weighted raw signal in [-1, 1] over a fixed set of representative
 * (already independence-capped) atoms. Zero-weight input → 0 (neutral), never NaN.
 */
export function rawSignal(representatives: EvidenceAtomInput[]): number {
  let numerator = 0;
  let denominator = 0;
  for (const atom of representatives) {
    const weight = atomWeight(atom);
    const z = clamp01(Math.abs(atom.magnitude)) * directionSign(atom.direction);
    numerator += weight * z;
    denominator += weight;
  }
  if (denominator <= 0) return 0;
  return Math.max(-1, Math.min(1, numerator / denominator));
}

export type TraitScoreResult = {
  estimate: number;
  band: { low: number; high: number };
  reliability: number;
  raw: number;
  nEff: number;
  se: number;
};

/** Shrink the raw [-1,1] signal toward a neutral prior based on independent evidence count. */
export function computeShrunkTraitEstimate(
  representatives: EvidenceAtomInput[],
  independentCount: number
): TraitScoreResult {
  if (representatives.length === 0) {
    const se = standardError(SHRINK_PRIOR, 0);
    return {
      estimate: SHRINK_PRIOR,
      band: uncertaintyBand(SHRINK_PRIOR, 0, se),
      reliability: 0,
      raw: 0,
      nEff: 0,
      se,
    };
  }

  const raw = rawSignal(representatives);
  const raw01 = clamp01((raw + 1) / 2);
  const estimate = shrinkEstimate(raw01, SHRINK_PRIOR, independentCount, SHRINK_K);
  const nEff = effectiveSampleSize(representatives.map(atomWeight));
  const se = standardError(estimate, nEff);
  return {
    estimate,
    band: uncertaintyBand(estimate, independentCount, se),
    reliability: geometricMeanReliability(representatives.map((a) => a.reliability)),
    raw,
    nEff,
    se,
  };
}

function bucketFor(score100: number | null, independentCount: number, opportunityFlag: boolean): TraitBucket {
  if (!opportunityFlag) return "not_observed";
  if (score100 == null) return "needs_review";
  if (score100 >= STRONG_EVIDENCE_SCORE_FLOOR) {
    return independentCount >= TRAIT_MIN_INDEPENDENT_FOR_STRONG ? "strong_evidence" : "needs_review";
  }
  if (score100 >= NEEDS_REVIEW_SCORE_FLOOR) return "needs_review";
  return "limited_evidence";
}

function diversity01(independentCount: number, atomCount: number): number {
  if (atomCount <= 0 || independentCount <= 0) return 0;
  return clamp01(independentCount / atomCount);
}

export type TraitResult = {
  traitId: TraitId;
  label: string;
  weight: number;
  opportunityFlag: boolean;
  bucket: TraitBucket;
  /** 0–100 integer. Always present when opportunityFlag is true (defaults to the
   * neutral 50 prior with zero atoms); null only when the trait was not_observed. */
  score100: number | null;
  atomCount: number;
  independentCount: number;
  reliability: number;
  band: { low: number; high: number } | null;
  /** Kish effective sample size from independence-capped representative weights. */
  nEff: number;
  /** Standard error of the shrunk estimate in [0, 0.5]; null when not_observed. */
  se: number | null;
  /** Confidence decomposition; null when not_observed. */
  confidence: ConfidenceDecomposition | null;
  eventRefs: string[];
  artifactRefs: string[];
  summaries: string[];
};

function emptyTraitResult(
  traitId: TraitId,
  traitAtoms: EvidenceAtomInput[],
  eventRefs: string[],
  artifactRefs: string[],
  summaries: string[]
): TraitResult {
  return {
    traitId,
    label: TRAIT_LABELS[traitId],
    weight: FDE_W[traitId],
    opportunityFlag: false,
    bucket: "not_observed",
    score100: null,
    atomCount: traitAtoms.length,
    independentCount: 0,
    reliability: 0,
    band: null,
    nEff: 0,
    se: null,
    confidence: null,
    eventRefs,
    artifactRefs,
    summaries,
  };
}

/** Scores one trait from its atoms + whether the scenario ever created the opportunity. */
export function scoreTrait(traitId: TraitId, atoms: EvidenceAtomInput[], opportunityFlag: boolean): TraitResult {
  const traitAtoms = atoms.filter((a) => a.dimensionId === traitId);
  const eventRefs = Array.from(new Set(traitAtoms.flatMap((a) => a.eventRefs)));
  const artifactRefs = Array.from(new Set(traitAtoms.flatMap((a) => a.artifactRefs)));
  const summaries = traitAtoms.map((a) => a.summary);

  if (!opportunityFlag) {
    return emptyTraitResult(traitId, traitAtoms, eventRefs, artifactRefs, summaries);
  }

  const { independentCount, representatives } = independenceCap(traitAtoms);
  const { estimate, band, reliability, nEff, se } = computeShrunkTraitEstimate(
    representatives,
    independentCount
  );
  const score100 = Math.round(clamp01(estimate) * 100);
  const confidence = decomposeConfidence({
    nEff,
    se,
    diversity01: diversity01(independentCount, traitAtoms.length),
    provenance01: reliability,
  });

  return {
    traitId,
    label: TRAIT_LABELS[traitId],
    weight: FDE_W[traitId],
    opportunityFlag: true,
    bucket: bucketFor(score100, independentCount, true),
    score100,
    atomCount: traitAtoms.length,
    independentCount,
    reliability,
    band,
    nEff,
    se,
    confidence,
    eventRefs,
    artifactRefs,
    summaries,
  };
}

export type CompositeFit = {
  /** 1–100 integer overall fit score, null when insufficient observed evidence. */
  fitScore100: number | null;
  composite01: number | null;
  /** Weighted arithmetic mean of observed trait score01 values. */
  arithmetic01: number | null;
  /** Weighted geometric mean via exp(Σ w log(ε+z) / Σ w). */
  geometric01: number | null;
  band: { low: number; high: number } | null;
  observedTraitCount: number;
  strongEvidenceTraitCount: number;
  notObservedTraitIds: TraitId[];
  traits: TraitResult[];
  /** Why fitScore100 is null, when suppressed. */
  reason?: string | null;
  policyVersion: string;
  formulaVersion: string;
  confidenceTag: string;
};

function emptyComposite(
  traits: TraitResult[],
  strongEvidenceTraitCount: number,
  notObservedTraitIds: TraitId[],
  reason: string | null
): CompositeFit {
  return {
    fitScore100: null,
    composite01: null,
    arithmetic01: null,
    geometric01: null,
    band: null,
    observedTraitCount: 0,
    strongEvidenceTraitCount,
    notObservedTraitIds,
    traits,
    reason,
    policyVersion: POLICY_VERSION,
    formulaVersion: FORMULA_VERSION,
    confidenceTag: CONFIDENCE_TAG,
  };
}

/** Scores all 10 traits and rolls them into the weighted composite fit score. */
export function compositeFitScore(atoms: EvidenceAtomInput[], opportunityFlags: OpportunityFlags): CompositeFit {
  const traits: TraitResult[] = TRAIT_IDS.map((id) => scoreTrait(id, atoms, opportunityFlags[id]));

  const observed = traits.filter((t) => t.bucket !== "not_observed" && t.score100 != null);
  const notObservedTraitIds = traits.filter((t) => t.bucket === "not_observed").map((t) => t.traitId);
  const strongEvidenceTraitCount = traits.filter((t) => t.bucket === "strong_evidence").length;

  if (observed.length === 0) {
    return emptyComposite(traits, strongEvidenceTraitCount, notObservedTraitIds, "no_observed_traits");
  }

  const weightSum = observed.reduce((sum, t) => sum + t.weight, 0);
  let arithAcc = 0;
  let logAcc = 0;
  for (const t of observed) {
    const z = clamp01((t.score100 as number) / 100);
    arithAcc += t.weight * z;
    logAcc += t.weight * Math.log(EPS + z);
  }
  const arithmetic01 = weightSum > 0 ? clamp01(arithAcc / weightSum) : 0;
  const geometric01 = weightSum > 0 ? clamp01(Math.exp(logAcc / weightSum)) : 0;
  const composite01 = clamp01(COMPOSITE_ALPHA * arithmetic01 + (1 - COMPOSITE_ALPHA) * geometric01);

  const meanNeff =
    observed.reduce((sum, t) => sum + (Number.isFinite(t.nEff) ? t.nEff : 0), 0) / observed.length;

  let fitScore100: number | null = Math.max(1, Math.min(100, Math.round(composite01 * 100)));
  let reason: string | null = null;

  if (observed.length < COMPOSITE_MIN_OBSERVED_TRAITS) {
    fitScore100 = null;
    reason = "observed_trait_count_below_minimum";
  } else if (meanNeff < COMPOSITE_MIN_MEAN_NEFF) {
    fitScore100 = null;
    reason = "mean_neff_below_minimum";
  }

  const meanSe =
    observed.reduce((sum, t) => sum + (t.se != null && Number.isFinite(t.se) ? t.se : 0.5), 0) /
    observed.length;
  const band = uncertaintyBand(composite01, observed.length, meanSe);

  return {
    fitScore100,
    // Underlying blend stays available even when fitScore100 is suppressed.
    composite01,
    arithmetic01,
    geometric01,
    band,
    observedTraitCount: observed.length,
    strongEvidenceTraitCount,
    notObservedTraitIds,
    traits,
    reason,
    policyVersion: POLICY_VERSION,
    formulaVersion: FORMULA_VERSION,
    confidenceTag: CONFIDENCE_TAG,
  };
}
