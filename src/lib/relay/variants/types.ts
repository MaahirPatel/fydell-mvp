/**
 * Checkpoint F — bounded generative Relay variant pipeline.
 *
 * A VariantSpec is a small, fully-specified description of a deterministic
 * mutation of the canonical `scenarios/project-relay` files. Nothing here is
 * open-ended generation: every variant is produced by `materializeVariant`
 * from a fixed seed + a named defect focus drawn from a closed set of
 * hand-written mutators (see `materialize.ts`).
 */

export type VariantStatus = "draft" | "approved" | "rejected" | "retired";

/** Closed set of intentional-defect mutations a variant can apply. Adding a
 * new focus requires adding a matching mutator in `materialize.ts` — this is
 * a deliberate design constraint, not an oversight. */
export type DefectFocus =
  | "missing_approval_check"
  | "missing_severity_filter"
  | "stale_confidence_threshold";

export type VariantDifficulty = "easier" | "baseline" | "harder";

export type VariantSpec = {
  id: string;
  /** Deterministic seed for `materializeVariant`. Same seed + same spec ⇒
   * byte-identical FileMap output, every time. */
  seed: string;
  parentScenarioId: "project-relay";
  status: VariantStatus;
  title: string;
  difficulty: VariantDifficulty;
  defectFocus: DefectFocus;
  /** Never invented — always a subset/rephrasing of the canonical facts in
   * `scenarios/project-relay/canonical.json`. */
  canonicalFacts: string[];
  curveballText: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
};
