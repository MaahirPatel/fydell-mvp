/**
 * Versioned evaluation contract — locks before the first candidate starts.
 * Behavioral evidence mathematics must not run without a locked contract.
 *
 * Primary dimensions: the 10 FDE traits (see src/lib/fde/evidence/traits.ts,
 * the single source of truth for trait identity, weights, opportunities, and
 * rubric anchors). There are no secondary/descriptive dimensions in this
 * version of the contract — every trait is either scored or explicitly
 * not_observed.
 */
import {
  FDE_W,
  RUBRIC_ANCHORS,
  TRAIT_IDS,
  TRAIT_LABELS,
  TRAIT_MIN_INDEPENDENT_FOR_STRONG,
  TRAIT_OPPORTUNITIES,
} from "./evidence/traits";

export type EvidenceOpportunity = {
  opportunityId: string;
  surface: "workspace" | "customer_chat" | "evals" | "curveball" | "handoff" | "preflight";
  description: string;
};

export type DimensionPriority = 1 | 2 | 3;

export type EvaluationDimension = {
  dimensionId: string;
  label: string;
  /** 1 = primary assessed; 2–3 = descriptive secondary */
  priority: DimensionPriority;
  behavioralAnchors: {
    counterEvidence: string[];
    mixedEvidence: string[];
    supportingEvidence: string[];
    strongSupportingEvidence: string[];
  };
  opportunities: EvidenceOpportunity[];
  prohibitedInferences: string[];
  minimumIndependentOpportunities: number;
};

export type EvaluationContract = {
  missionId: string;
  scenarioReleaseId: string;
  lockedAt: string;
  policyVersion: string;
  formulaVersion: string;
  dimensions: EvaluationDimension[];
};

/** Activity volume / speed / prompt counts are context only — never evidence. */
export const UNSCORED_CONTEXT_KEYS = [
  "time_spent_ms",
  "files_opened_count",
  "prompt_count",
  "question_count",
  "response_latency_ms",
  "typing_speed",
  "time_in_file_ms",
] as const;

/** The 10 FDE traits — see src/lib/fde/evidence/traits.ts for the source of truth. */
export const PRIMARY_DIMENSION_IDS = TRAIT_IDS;

/** No secondary/descriptive dimensions in this contract version — every trait is scored or not_observed. */
export const SECONDARY_DIMENSION_IDS = [] as const;

export const EVAL_POLICY_VERSION = "eval-policy-v2";
export const EVAL_FORMULA_VERSION = "eval-formula-v2";

/** Canonical primary dimension stubs (10 traits) for mission-create preview / future lock. */
export function defaultPrimaryDimensions(): EvaluationDimension[] {
  return TRAIT_IDS.map((traitId) => {
    const anchors = RUBRIC_ANCHORS[traitId];
    return {
      dimensionId: traitId,
      label: TRAIT_LABELS[traitId],
      priority: 1,
      behavioralAnchors: {
        counterEvidence: anchors.counter,
        mixedEvidence: anchors.mixed,
        supportingEvidence: anchors.supporting,
        strongSupportingEvidence: anchors.strong,
      },
      opportunities: TRAIT_OPPORTUNITIES[traitId],
      prohibitedInferences: [
        `Infer ${TRAIT_LABELS[traitId].toLowerCase()} from activity volume (message count, keystrokes, time-in-file) alone.`,
      ],
      // Catalog opportunity *kinds* per trait vary (1 or 2); a trait's actual
      // independent-moment count at scoring time can still exceed this via
      // repeated behavior within a single catalog opportunity (see score.ts).
      minimumIndependentOpportunities: Math.min(
        TRAIT_MIN_INDEPENDENT_FOR_STRONG,
        TRAIT_OPPORTUNITIES[traitId].length
      ),
    };
  });
}

/** Weighted role-fit composite weight per trait — re-exported for mission-preview UI. */
export const PRIMARY_DIMENSION_WEIGHTS = FDE_W;

export function assertContractLockable(contract: EvaluationContract): string[] {
  const errors: string[] = [];
  if (!contract.lockedAt) errors.push("lockedAt required");
  if (!contract.policyVersion) errors.push("policyVersion required");
  if (!contract.formulaVersion) errors.push("formulaVersion required");
  for (const dim of contract.dimensions.filter((d) => d.priority === 1)) {
    if (dim.opportunities.length < dim.minimumIndependentOpportunities) {
      errors.push(
        `${dim.dimensionId}: needs ≥${dim.minimumIndependentOpportunities} opportunities (has ${dim.opportunities.length})`
      );
    }
  }
  return errors;
}
