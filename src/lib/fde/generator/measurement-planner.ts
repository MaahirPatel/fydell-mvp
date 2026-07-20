/**
 * measurement-planner.ts — selects which episodes (measurement modules) go
 * into a blueprint given a time budget, and returns the resulting per-trait
 * coverage (Coverage_k = 1 - Π_m(1 - B_km) over included modules m).
 *
 * The episode catalog below is a closed set of six module templates — the
 * same six "moments" the known-good Project Relay scenario already carries
 * (intake ambiguity, a data-integrity trap, a stakeholder contradiction, a
 * mid-session curveball, a verification gate, and a handoff). Nothing here
 * invents a new module shape at generation time; only *which* modules are
 * included, and their concrete world dressing (world-generator.ts), varies.
 *
 * Four modules are mandatory in every blueprint regardless of duration or
 * employer weighting — this is what guarantees Coverage_k for
 * data_integrity_vigilance and elicitation is always present, per the
 * platform's non-negotiable "trust the data, ask before you build" floor.
 *
 * Optional modules are chosen by D-optimal utility (selection.ts): coverage
 * gain + Δlogdet − time/risk penalties under expert_prior_v1.
 */
import { TRAIT_IDS, type TraitId } from "../evidence/traits";
import { selectModulesDOptimal, type SelectableModule } from "./selection";
import type {
  CompetencyLoading,
  Episode,
  EpisodeKind,
  PreferenceVector,
  RoleGraph,
  SelectionDiagnostics,
} from "./types";

export const MEASUREMENT_PLANNER_VERSION = "measurement-planner-v3";

export const CRITICAL_TRAITS: TraitId[] = ["data_integrity_vigilance", "elicitation"];
export const MIN_CRITICAL_COVERAGE = 0.7;

type EpisodeTemplate = {
  id: string;
  kind: EpisodeKind;
  title: string;
  description: string;
  minMinutes: number;
  mandatory: boolean;
  loadings: CompetencyLoading[];
  requiredFiles: string[];
};

const EPISODE_CATALOG: EpisodeTemplate[] = [
  {
    id: "intake_brief",
    kind: "intake_brief",
    title: "Underspecified intake brief",
    description:
      "A deliberately thin client ask with no feature list — the candidate must scope the smallest credible thing before building anything.",
    minMinutes: 5,
    mandatory: true,
    loadings: [
      { traitId: "elicitation", loading: 0.7 },
      { traitId: "communication_translation", loading: 0.2 },
    ],
    requiredFiles: ["README.md", "docs/customer-brief.md"],
  },
  {
    id: "data_defect_trap",
    kind: "data_defect_trap",
    title: "Silent data-integrity defect",
    description:
      "A naive join/parse silently drops or misreads a bounded percentage of records because of a deterministic ID-formatting quirk in one source file.",
    minMinutes: 15,
    mandatory: true,
    loadings: [
      { traitId: "data_integrity_vigilance", loading: 0.85 },
      { traitId: "verification_discipline", loading: 0.3 },
      { traitId: "technical_execution", loading: 0.3 },
    ],
    requiredFiles: ["docs/data-integrity.md", "data/primary_records.csv", "data/manual_tracking.csv"],
  },
  {
    id: "stakeholder_contradiction",
    kind: "stakeholder_contradiction",
    title: "Two stakeholders, two deliverables",
    description:
      "Two stakeholders want different, unreconciled deliverables from the same ask — managing the conflict is the candidate's job, not something the brief resolves.",
    minMinutes: 8,
    mandatory: false,
    loadings: [
      { traitId: "contradiction_handling", loading: 0.8 },
      { traitId: "communication_translation", loading: 0.3 },
      { traitId: "elicitation", loading: 0.2 },
    ],
    requiredFiles: ["data/inbox_thread.json"],
  },
  {
    id: "curveball_event",
    kind: "curveball_event",
    title: "Mid-session curveball",
    description:
      "A deadline or scope change lands mid-session and the candidate must visibly reprioritize and renegotiate scope.",
    minMinutes: 6,
    mandatory: false,
    loadings: [
      { traitId: "scope_renegotiation", loading: 0.75 },
      { traitId: "prioritization_under_pressure", loading: 0.75 },
    ],
    requiredFiles: [],
  },
  {
    id: "verification_gate",
    kind: "verification_gate",
    title: "Tests + evals gate",
    description:
      "A runnable test suite and eval harness the candidate can (and should) use before claiming the fix works.",
    minMinutes: 10,
    mandatory: true,
    loadings: [
      { traitId: "technical_execution", loading: 0.6 },
      { traitId: "verification_discipline", loading: 0.6 },
      { traitId: "ai_tool_judgment", loading: 0.4 },
    ],
    requiredFiles: ["evals/run_evals.py", "tests/test_reconcile.py"],
  },
  {
    id: "handoff_submission",
    kind: "handoff_submission",
    title: "Handoff writeup",
    description:
      "A final handoff the candidate writes for a non-technical stakeholder, naming what was verified and what remains uncertain.",
    minMinutes: 8,
    mandatory: true,
    loadings: [
      { traitId: "limitation_honesty", loading: 0.7 },
      { traitId: "communication_translation", loading: 0.5 },
      { traitId: "verification_discipline", loading: 0.3 },
    ],
    requiredFiles: [],
  },
];

export type PlannedModules = {
  episodes: Episode[];
  coverage: Record<TraitId, number>;
  totalMinutes: number;
  criticalCoverageOk: boolean;
  selectionDiagnostics: SelectionDiagnostics;
};

function clampUnit(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
}

function loadingForTrait(loadings: CompetencyLoading[], traitId: TraitId): number {
  return loadings.find((l) => l.traitId === traitId)?.loading ?? 0;
}

/** Coverage_k = 1 - Π_m(1 - B_km), clamped to [0, 1]. */
export function coverageProduct(loadingsMatrix: CompetencyLoading[][]): Record<TraitId, number> {
  const coverage: Record<TraitId, number> = {} as Record<TraitId, number>;
  for (const traitId of TRAIT_IDS) {
    let missProb = 1;
    for (const moduleLoadings of loadingsMatrix) {
      const loading = loadingForTrait(moduleLoadings, traitId);
      if (loading > 0) missProb *= 1 - loading;
    }
    coverage[traitId] = clampUnit(1 - missProb);
  }
  return coverage;
}

function computeCoverage(episodes: Episode[]): Record<TraitId, number> {
  return coverageProduct(episodes.map((ep) => ep.loadings));
}

function toEpisode(t: EpisodeTemplate): Episode {
  return {
    id: t.id,
    kind: t.kind,
    title: t.title,
    description: t.description,
    estimatedMinutes: t.minMinutes,
    loadings: t.loadings,
    requiredFiles: t.requiredFiles,
  };
}

export type PlanModulesOptions = {
  criticalTraits?: TraitId[];
};

/**
 * Select which episodes go into the blueprint given a time budget and the
 * compiled role graph. Mandatory episodes are always included; optional
 * episodes are chosen by D-optimal module utility (coverage + Δlogdet).
 */
export function planModules(
  durationMinutes: number,
  roleGraph: RoleGraph,
  preferenceVector?: PreferenceVector,
  options?: PlanModulesOptions
): PlannedModules {
  const weights: PreferenceVector =
    preferenceVector ??
    ({
      elicitation: 0.1,
      contradiction_handling: 0.1,
      data_integrity_vigilance: 0.1,
      scope_renegotiation: 0.1,
      technical_execution: 0.1,
      ai_tool_judgment: 0.1,
      verification_discipline: 0.1,
      limitation_honesty: 0.1,
      prioritization_under_pressure: 0.1,
      communication_translation: 0.1,
    } as PreferenceVector);

  if (roleGraph.inferredSkillTags.includes("stakeholder_conflict")) {
    weights.contradiction_handling += 0.05;
    weights.elicitation += 0.03;
  }
  if (roleGraph.inferredSkillTags.includes("time_pressure")) {
    weights.prioritization_under_pressure += 0.05;
    weights.scope_renegotiation += 0.05;
  }

  // Boost preference mass on employer-marked critical traits (and platform floor).
  const criticalTraits = [
    ...CRITICAL_TRAITS,
    ...(options?.criticalTraits ?? []).filter((id) => !CRITICAL_TRAITS.includes(id)),
  ];
  for (const id of criticalTraits) {
    weights[id] = (weights[id] ?? 0) + 0.04;
  }

  const catalog: SelectableModule[] = EPISODE_CATALOG.map((t) => ({
    id: t.id,
    loadings: t.loadings,
    estimatedMinutes: t.minMinutes,
    mandatory: t.mandatory,
  }));

  const { selected, diagnostics } = selectModulesDOptimal({
    catalog,
    durationMinutes,
    preferenceVector: weights,
    criticalTraits,
  });

  const selectedIds = new Set(selected.map((m) => m.id));
  const catalogOrder = new Map(EPISODE_CATALOG.map((t, i) => [t.id, i]));
  const templates = EPISODE_CATALOG.filter((t) => selectedIds.has(t.id)).sort(
    (a, b) => (catalogOrder.get(a.id) ?? 0) - (catalogOrder.get(b.id) ?? 0)
  );

  const episodes = templates.map(toEpisode);
  const coverage = computeCoverage(episodes);
  const criticalCoverageOk = criticalTraits.every((id) => coverage[id] >= MIN_CRITICAL_COVERAGE);
  const totalMinutes = episodes.reduce((s, e) => s + e.estimatedMinutes, 0);

  return {
    episodes,
    coverage,
    totalMinutes,
    criticalCoverageOk,
    selectionDiagnostics: diagnostics,
  };
}
