/**
 * AI-07 — Ground technical criticisms.
 *
 * A consequential technical claim is either:
 *  - a REPRODUCED defect: a failing authoritative test, or a cited code path
 *    that demonstrably produces the failure; or
 *  - a HYPOTHESIS: a real pattern with stated unknowns, explicitly labeled.
 *
 * There is no third option. In particular, verbosity, superficial style, and
 * "this looks risky" without a mechanism are never defects.
 */

import type { Citation } from "./citations";
import type { DeterministicSection } from "./separation";

export type ClaimGrounding = "reproduced_defect" | "hypothesis" | "observation";

export interface TechnicalClaim {
  id: string;
  claim: string;
  /** What the model asserted. */
  assertedStatus: ClaimGrounding;
  material: boolean;
  citations: Citation[];
  /** ids of failing deterministic tests that reproduce this claim, if any. */
  reproducingTestIds?: string[];
}

export interface GroundedClaim extends TechnicalClaim {
  /** The status after grounding — may be demoted from the assertion. */
  groundedStatus: ClaimGrounding;
  groundingNote: string;
}

/**
 * Ground each claim against the deterministic record.
 *
 * Demotion rules (applied openly, with reasons):
 *  - asserted reproduced_defect with no reproducing test and no defect-role
 *    citation to the snapshot  -> demoted to hypothesis.
 *  - asserted reproduced_defect for a non-material stylistic claim
 *    ("verbose", "unidiomatic") -> demoted to observation; style is not a defect.
 */
export function groundClaims(
  claims: TechnicalClaim[],
  deterministic: DeterministicSection,
): GroundedClaim[] {
  const failing = new Set(
    deterministic.tests.filter((t) => t.status === "failed" || t.status === "error").map((t) => t.id),
  );
  const engineDefects = new Set(
    deterministic.engineFindings
      .filter((f) => f.severity === "bug" || f.severity === "security")
      .map((f) => f.code),
  );

  return claims.map((c) => {
    const reproducedByTest = (c.reproducingTestIds ?? []).some((id) => failing.has(id));
    const hasDefectCitation = c.citations.some(
      (cit) => cit.source === "snapshot" && /defect|reproduc/i.test(cit.note ?? ""),
    );
    const styleOnly = /\b(verbose|verbosity|unidiomatic|ugly|style|formatting|naming)\b/i.test(c.claim);

    if (c.assertedStatus === "reproduced_defect") {
      if (styleOnly) {
        return {
          ...c,
          groundedStatus: "observation",
          groundingNote:
            "Demoted: stylistic observations are not defects. Verbosity and superficial style are never scored as defects (AI-07).",
        };
      }
      if (reproducedByTest || hasDefectCitation) {
        return {
          ...c,
          groundedStatus: "reproduced_defect",
          groundingNote: reproducedByTest
            ? `Reproduced by failing test(s): ${(c.reproducingTestIds ?? []).filter((id) => failing.has(id)).join(", ")}`
            : "Grounded in cited defect-role evidence from the snapshot.",
        };
      }
      return {
        ...c,
        groundedStatus: "hypothesis",
        groundingNote:
          "Demoted: claimed as a defect but no failing test reproduces it and no defect-role citation grounds it. Treated as a hypothesis requiring review.",
      };
    }
    if (c.assertedStatus === "hypothesis" && (reproducedByTest || hasDefectCitation) && c.material) {
      void engineDefects;
      return {
        ...c,
        groundedStatus: "reproduced_defect",
        groundingNote: "Promoted: the deterministic record reproduces this claim.",
      };
    }
    return {
      ...c,
      groundedStatus: c.assertedStatus,
      groundingNote: "Status stands: labeled as stated, with its evidence.",
    };
  });
}
