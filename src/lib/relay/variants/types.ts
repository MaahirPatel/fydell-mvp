/**
 * Bounded generative Relay variant pipeline — Northbeam Logistics family.
 * Every variant is a deterministic mutation of the canonical scenario files.
 */

export type VariantStatus = "draft" | "approved" | "rejected" | "retired";

/** Closed set of intentional defects. New focus ⇒ new mutator in materialize.ts. */
export type DefectFocus =
  | "naive_join_unfixed"
  | "wrong_late_definition"
  | "carrier_claim_trusted";

export type VariantDifficulty = "easier" | "baseline" | "harder";

export type VariantSpec = {
  id: string;
  seed: string;
  parentScenarioId: "project-relay";
  status: VariantStatus;
  title: string;
  difficulty: VariantDifficulty;
  defectFocus: DefectFocus;
  canonicalFacts: string[];
  curveballText: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
};
