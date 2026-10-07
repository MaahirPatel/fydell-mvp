/**
 * AI-09 - Reconcile evidence.
 *
 * The candidate's handoff (what they claim they did) is compared against the
 * deterministic record (what the harness observed). Disagreements are shown
 * explicitly. When the candidate correctly identifies their own limitation,
 * that is recorded as accurate self-assessment - it is evidence of judgment,
 * and it must never be used to "upgrade" failing code into passing code.
 *
 * Nothing is invented about unseen development history: only the submitted
 * handoff text, the transcript, and the deterministic record are compared.
 */

import type { DeterministicSection } from "./separation";

export type HandoffClaimKind = "test_status" | "limitation" | "feature" | "uncertainty";

export interface HandoffClaim {
  id: string;
  kind: HandoffClaimKind;
  /** The candidate's own words. */
  text: string;
}

export interface HandoffStatement {
  submittedAt: string;
  claims: HandoffClaim[];
}

export interface ReconciliationItem {
  claimId: string;
  kind: HandoffClaimKind;
  text: string;
  /** agrees | disagrees | unverifiable - never guessed. */
  verdict: "agrees" | "disagrees" | "unverifiable";
  detail: string;
}

export interface Reconciliation {
  items: ReconciliationItem[];
  /** Candidate named a real limitation the record confirms. */
  accurateSelfAssessments: string[];
  /** Handoff claims the record contradicts. */
  disagreements: string[];
}

const CLAIMS_ALL_PASS = /\ball tests? pass\b|\beverything (works|passes)\b|\bno failures\b/i;
const CLAIMS_FAILURE = /\bfail(?:s|ed|ing|ure)?\b|\bbroken\b|\bdoesn'?t work\b/i;

/**
 * Reconcile handoff claims against the deterministic test record.
 * Conservative by design: ambiguous claims are "unverifiable", not disagreements.
 */
export function reconcileHandoff(
  handoff: HandoffStatement,
  deterministic: DeterministicSection,
): Reconciliation {
  const failed = deterministic.tests.filter((t) => t.status === "failed" || t.status === "error");
  const failingIds = new Set(failed.map((t) => t.id));
  const failingNames = failed.map((t) => t.name.toLowerCase());

  const items: ReconciliationItem[] = handoff.claims.map((claim) => {
    if (claim.kind === "test_status") {
      if (CLAIMS_ALL_PASS.test(claim.text)) {
        return failed.length === 0
          ? { claimId: claim.id, kind: claim.kind, text: claim.text, verdict: "agrees", detail: "Harness records no failures." }
          : {
              claimId: claim.id,
              kind: claim.kind,
              text: claim.text,
              verdict: "disagrees",
              detail: `Handoff claims all tests pass; harness records ${failed.length} failure(s): ${failed.map((t) => t.id).join(", ")}.`,
            };
      }
      if (CLAIMS_FAILURE.test(claim.text)) {
        // Candidate says something fails - check whether the named thing is real.
        const namesSomethingReal =
          failingIds.size > 0 &&
          (failingNames.some((n) => claim.text.toLowerCase().includes(n.split(" ")[0] ?? "")) ||
            /\b(edge|empty|none|null|duplicate|timeout)\b/i.test(claim.text));
        return {
          claimId: claim.id,
          kind: claim.kind,
          text: claim.text,
          verdict: failingIds.size > 0 ? "agrees" : "disagrees",
          detail:
            failingIds.size > 0
              ? `Candidate reports failure; harness confirms ${failed.length} failure(s).${namesSomethingReal ? " The described area matches a recorded failure." : ""}`
              : "Candidate reports a failure the harness did not record. No failing tests in the deterministic section.",
        };
      }
      return {
        claimId: claim.id,
        kind: claim.kind,
        text: claim.text,
        verdict: "unverifiable",
        detail: "Test-status claim is ambiguous; not counted for or against.",
      };
    }
    if (claim.kind === "limitation" || claim.kind === "uncertainty") {
      const matchesFailure =
        failed.length > 0 && /\b(edge|empty|none|null|duplicate|drop|match|timeout|slow)\b/i.test(claim.text);
      const namesFailingTest = [...failingIds].some((id) => claim.text.includes(id));
      const matchesEngineFinding = deterministic.engineFindings.some(
        (f) =>
          (f.severity === "bug" || f.severity === "security" || f.severity === "risk") &&
          claim.text.toLowerCase().includes(f.code.toLowerCase().replace(/_/g, " ").split(" ")[0] ?? ""),
      );
      const grounded = matchesFailure || namesFailingTest || matchesEngineFinding;
      return {
        claimId: claim.id,
        kind: claim.kind,
        text: claim.text,
        verdict: grounded ? "agrees" : "unverifiable",
        detail: grounded
          ? "The limitation the candidate names is confirmed by the deterministic record. Accurate self-assessment."
          : "The named limitation has no counterpart in the deterministic record; recorded as stated, not judged.",
      };
    }
    // feature claims: recorded as stated; the tests judge the feature.
    return {
      claimId: claim.id,
      kind: claim.kind,
      text: claim.text,
      verdict: "unverifiable",
      detail: "Feature claim recorded as stated. Correctness is judged by the harness, not the claim.",
    };
  });

  return {
    items,
    accurateSelfAssessments: items
      .filter((i) => (i.kind === "limitation" || i.kind === "uncertainty") && i.verdict === "agrees")
      .map((i) => i.claimId),
    disagreements: items.filter((i) => i.verdict === "disagrees").map((i) => i.claimId),
  };
}
