/**
 * ambiguity.ts — controlled ambiguity via entropy over a curated hypothesis set.
 *
 * H(H|O0) = -Σ_h P(h|O0) log2 P(h|O0)
 *
 * Validates Hmin <= H <= Hmax and that ideal evidence reduces entropy.
 */
import type { ScenarioHypothesis } from "./types";

export const AMBIGUITY_VERSION = "ambiguity-v1";

export const HMIN = 0.5;
export const HMAX = 2.5;

export type AmbiguityValidation = {
  ok: boolean;
  entropy: number;
  entropyAfterIdeal: number;
  hMin: number;
  hMax: number;
  plausibleHypothesisCount: number;
  flags: { code: string; severity: "info" | "warning" | "blocking"; message: string }[];
};

export function hypothesisEntropy(hypotheses: Pick<ScenarioHypothesis, "prior">[]): number {
  let entropy = 0;
  for (const hypothesis of hypotheses) {
    const p = hypothesis.prior;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 1000) / 1000;
}

function normalizeHypotheses(hypotheses: ScenarioHypothesis[]): ScenarioHypothesis[] {
  const sum = hypotheses.reduce((s, h) => s + Math.max(0, h.prior), 0) || 1;
  return hypotheses.map((h) => ({
    ...h,
    prior: Math.max(0, h.prior) / sum,
  }));
}

/** Default curated hypotheses for the data-integrity + stakeholder-conflict family. */
export function defaultScenarioHypotheses(dataQuirk: string): ScenarioHypothesis[] {
  return normalizeHypotheses([
    { id: "id_format_quirk", label: `Manual source uses a formatting quirk (${dataQuirk})`, prior: 0.34 },
    { id: "join_logic_bug", label: "Candidate introduced an incorrect join or filter", prior: 0.22 },
    { id: "stakeholder_misalignment", label: "Deliverable conflict drove the apparent failure", prior: 0.24 },
    { id: "upstream_export_gap", label: "Primary export is incomplete or stale", prior: 0.2 },
  ]);
}

/** Ideal evidence concentrates posterior mass on the true root cause. */
export function idealEvidencePosterior(hypotheses: ScenarioHypothesis[], trueCauseId = "id_format_quirk"): ScenarioHypothesis[] {
  return normalizeHypotheses(
    hypotheses.map((h) => ({
      ...h,
      prior: h.id === trueCauseId ? 0.82 : 0.06,
    }))
  );
}

export function validateAmbiguity(
  hypotheses: ScenarioHypothesis[],
  afterIdeal: ScenarioHypothesis[]
): AmbiguityValidation {
  const normalized = normalizeHypotheses(hypotheses);
  const normalizedAfter = normalizeHypotheses(afterIdeal);
  const entropy = hypothesisEntropy(normalized);
  const entropyAfterIdeal = hypothesisEntropy(normalizedAfter);
  const plausibleHypothesisCount = normalized.filter((h) => h.prior >= 0.12).length;

  const flags: AmbiguityValidation["flags"] = [];

  if (plausibleHypothesisCount < 2) {
    flags.push({
      code: "ambiguity.too_few_plausible_hypotheses",
      severity: "blocking",
      message: "Controlled ambiguity requires at least two plausible initial hypotheses.",
    });
  }
  if (entropy < HMIN) {
    flags.push({
      code: "ambiguity.below_hmin",
      severity: "blocking",
      message: `Initial entropy ${entropy} is below Hmin=${HMIN}.`,
    });
  }
  if (entropy > HMAX) {
    flags.push({
      code: "ambiguity.above_hmax",
      severity: "warning",
      message: `Initial entropy ${entropy} exceeds Hmax=${HMAX} — scenario may be overly ambiguous.`,
    });
  }
  if (entropyAfterIdeal >= entropy) {
    flags.push({
      code: "ambiguity.ideal_evidence_did_not_reduce_entropy",
      severity: "blocking",
      message: `Ideal evidence must reduce entropy; got ${entropy} → ${entropyAfterIdeal}.`,
    });
  }

  const ok = flags.every((f) => f.severity !== "blocking");
  return {
    ok,
    entropy,
    entropyAfterIdeal,
    hMin: HMIN,
    hMax: HMAX,
    plausibleHypothesisCount,
    flags,
  };
}
