/**
 * Evidence mathematics — shared types.
 *
 * An "atom" is the smallest unit of behavioral evidence: one observed action,
 * scoped to one dimension, always traceable back to the event/artifact that
 * produced it. Atoms are combined per-dimension (never across dimensions,
 * never into an overall candidate score) by aggregate.ts.
 */

export type EvidenceDirection = "supporting" | "counter" | "mixed" | "neutral";

/** Minimal shape of a relay_execution_events row — kept local to avoid a
 * dependency from this pure-math module back onto the I/O-bound session code. */
export type RelayEventLike = {
  id: string;
  session_id: string;
  sequence_number: number;
  actor: string;
  event_type: string;
  source_surface?: string | null;
  payload: Record<string, unknown>;
  created_at?: string;
};

/** An evidence atom before it has been persisted (no id/createdAt yet). */
export type EvidenceAtomInput = {
  sessionId: string;
  eventId?: string | null;
  artifactId?: string | null;
  dimensionId: string;
  direction: EvidenceDirection;
  /** Strength of the observation within its direction, 0–1. */
  magnitude: number;
  /** How relevant this observation is to the dimension, 0–1. */
  relevance: number;
  /** How much to trust the observation itself (source quality), 0–1. */
  reliability: number;
  /**
   * Atoms sharing an independence group are evidence of the *same*
   * opportunity observed more than once (e.g. re-reading the same chat
   * message) — they are capped, not summed, when aggregated.
   */
  independenceGroup: string;
  /** e.g. "behavioral_direct", "behavioral_heuristic", "llm_annotation", "self_report". */
  sourceKind: string;
  summary: string;
  eventRefs: string[];
  artifactRefs: string[];
};

/** An evidence atom as stored (post-insert). */
export type EvidenceAtom = EvidenceAtomInput & {
  id: string;
  createdAt: string;
};

/**
 * Qualitative state of a dimension's evidence, ordered from least to most
 * confident support. There is no numeric candidate score — only this state
 * plus an optional estimate/band used to render it consistently.
 */
export type QualitativeState =
  | "insufficient"
  | "counter"
  | "mixed"
  | "supporting"
  | "strong_supporting";

export type DimensionAggregate = {
  dimensionId: string;
  state: QualitativeState;
  /** Present once independentCount >= 2. Shrunk toward a neutral prior — not raw. */
  estimate?: number;
  band?: { low: number; high: number };
  atomCount: number;
  independentCount: number;
};
