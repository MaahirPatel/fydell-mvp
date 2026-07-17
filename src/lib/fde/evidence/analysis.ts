/**
 * Full session analysis: events → atoms → dimension scores → predictive hire.
 */
import { PRIMARY_DIMENSION_IDS } from "../evaluation-contract";
import { eventsToAtoms, type EventsToAtomsOptions } from "./atoms";
import { compositeFitScore, type CompositeFit, type DimensionScore } from "./score";
import { predictHire, type PredictiveHire } from "./predict";
import type { EvidenceAtomInput, RelayEventLike } from "./types";
import { FORMULA_VERSION, POLICY_VERSION } from "./reliability";

export type AnalysisFinding = {
  dimension: string;
  observation: string;
  interpretation: string;
  confidence: "low" | "medium" | "high";
  limitation: string;
  event_ids: string[];
  artifact_ids: string[];
  score100: number | null;
  qualitativeState: string;
  provisional: boolean;
};

export type SessionAnalysis = {
  atoms: EvidenceAtomInput[];
  fit: CompositeFit;
  prediction: PredictiveHire;
  findings: AnalysisFinding[];
  policyVersion: string;
  formulaVersion: string;
};

function confidenceFromScore(dim: DimensionScore): "low" | "medium" | "high" {
  if (dim.provisional || dim.state === "insufficient") return "low";
  if (dim.reliability >= 0.7 && (dim.independentCount || 0) >= 3) return "high";
  return "medium";
}

function findingFromDimension(dim: DimensionScore, atoms: EvidenceAtomInput[]): AnalysisFinding {
  const dimAtoms = atoms.filter((a) => a.dimensionId === dim.dimensionId);
  const eventIds = Array.from(new Set(dimAtoms.flatMap((a) => a.eventRefs)));
  const artifactIds = Array.from(new Set(dimAtoms.flatMap((a) => a.artifactRefs)));

  const scoreText =
    dim.score100 == null
      ? "No scoreable evidence."
      : `Dimension score ${dim.score100}/100${dim.provisional ? " (provisional)" : ""} · state: ${dim.state.replace(/_/g, " ")}.`;

  const topSummaries = dimAtoms
    .slice(0, 3)
    .map((a) => a.summary)
    .join(" ");

  return {
    dimension: dim.dimensionId,
    observation: topSummaries || `No behavioral atoms recorded for ${dim.label}.`,
    interpretation: scoreText,
    confidence: confidenceFromScore(dim),
    limitation: dim.provisional
      ? "Fewer than two independent evidence opportunities — treat as inconclusive, not negative."
      : `Computed with ${POLICY_VERSION} / ${FORMULA_VERSION}; estimate shrunk toward a neutral prior.`,
    event_ids: eventIds,
    artifact_ids: artifactIds,
    score100: dim.score100,
    qualitativeState: dim.state,
    provisional: dim.provisional,
  };
}

export type AnalyzeSessionOptions = EventsToAtomsOptions & {
  /** Optional workspace plan/handoff text to mint additional atoms. */
  planText?: string;
  handoffText?: string;
};

/** Enrich atoms with plan/handoff content when present (behavioral, not volume). */
function enrichContextualAtoms(
  atoms: EvidenceAtomInput[],
  opts: AnalyzeSessionOptions
): EvidenceAtomInput[] {
  const extra: EvidenceAtomInput[] = [...atoms];
  const plan = (opts.planText || "").trim();
  const handoff = (opts.handoffText || "").trim();

  if (plan.length >= 40) {
    extra.push({
      sessionId: opts.sessionId,
      dimensionId: "discovery_problem_framing",
      direction: "supporting",
      magnitude: 0.55,
      relevance: 0.6,
      reliability: 0.75,
      independenceGroup: "discovery_problem_framing:plan_approach",
      sourceKind: "behavioral_heuristic",
      summary: "Documented an approach/plan before or during implementation.",
      eventRefs: [],
      artifactRefs: [],
    });
    extra.push({
      sessionId: opts.sessionId,
      dimensionId: "technical_scoping_prioritization",
      direction: "supporting",
      magnitude: 0.5,
      relevance: 0.55,
      reliability: 0.75,
      independenceGroup: "technical_scoping_prioritization:plan_risks",
      sourceKind: "behavioral_heuristic",
      summary: "Captured scoping notes (risks/test strategy) in the plan panel.",
      eventRefs: [],
      artifactRefs: [],
    });
  }

  if (handoff.length >= 40) {
    extra.push({
      sessionId: opts.sessionId,
      dimensionId: "evaluation_production_judgment",
      direction: "supporting",
      magnitude: 0.6,
      relevance: 0.65,
      reliability: 0.75,
      independenceGroup: "evaluation_production_judgment:handoff_risks",
      sourceKind: "behavioral_heuristic",
      summary: "Wrote a handoff covering residual risk / recommendation.",
      eventRefs: [],
      artifactRefs: [],
    });
  }

  return extra;
}

export function analyzeSession(
  events: RelayEventLike[],
  opts: AnalyzeSessionOptions
): SessionAnalysis {
  const baseAtoms = eventsToAtoms(events, opts);
  const atoms = enrichContextualAtoms(baseAtoms, opts);
  const fit = compositeFitScore(atoms);
  const prediction = predictHire(fit);

  const findings = PRIMARY_DIMENSION_IDS.map((id) => {
    const dim = fit.dimensions.find((d) => d.dimensionId === id)!;
    return findingFromDimension(dim, atoms);
  });

  return {
    atoms,
    fit,
    prediction,
    findings,
    policyVersion: POLICY_VERSION,
    formulaVersion: FORMULA_VERSION,
  };
}
