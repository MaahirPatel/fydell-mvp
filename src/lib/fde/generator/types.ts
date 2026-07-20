/**
 * Generative FDE simulation compiler — shared types.
 *
 * This module produces *constrained, editable, versioned* measurement
 * environments, not freeform LLM output. Every blueprint is:
 *   - deterministic (same intake + seed ⇒ byte-identical blueprint),
 *   - traceable (every episode carries explicit trait loadings B_km),
 *   - gated (a blueprint only reaches "auto_validated" maturity if it clears
 *     the hard gates in validators.ts),
 *   - editable (the whole thing is plain JSON an employer/ops reviewer can
 *     read and hand-edit before it is ever served to a candidate).
 *
 * Nothing in this folder calls an LLM or does open-ended generation — every
 * "generative" surface here is a bounded, seeded selection over a closed
 * catalog (episodes, name pools, quirk types), the same posture as the
 * existing bounded variant pipeline in src/lib/relay/variants.
 */
import type { TraitId } from "../evidence/traits";

// ---------------------------------------------------------------------------
// Employer intake — the only free-text input to the whole compiler.
// ---------------------------------------------------------------------------

export type EmployerIntake = {
  title: string;
  objective: string;
  customerContext: string;
  industry: string;
  durationMinutes: number;
  /** Optional raw slider values (any positive scale) per trait — normalized
   * internally. Missing/omitted traits are treated as "no employer signal",
   * not as zero-weight. */
  skillWeights?: Partial<Record<TraitId, number>>;
  /** Optional AI usage policy string from Studio (stored on the blueprint intake). */
  aiPolicy?: string;
  /** Optional employer-marked critical traits — boost coverage floors in planning. */
  criticalTraits?: TraitId[];
};

// ---------------------------------------------------------------------------
// Role graph — compiled, abstract shape of the role's measurement surface.
// ---------------------------------------------------------------------------

export type RoleGraphNodeKind = "stakeholder" | "system" | "deliverable" | "constraint";

export type RoleGraphNode = {
  id: string;
  kind: RoleGraphNodeKind;
  label: string;
  description: string;
};

export type RoleGraphRelation =
  | "wants"
  | "reports_to"
  | "feeds"
  | "depends_on"
  | "conflicts_with";

export type RoleGraphEdge = {
  from: string;
  to: string;
  relation: RoleGraphRelation;
};

export type RoleGraph = {
  roleTitle: string;
  industry: string;
  objective: string;
  nodes: RoleGraphNode[];
  edges: RoleGraphEdge[];
  /** Closed-vocabulary tags inferred from intake text — used by
   * measurement-planner and world-generator, never surfaced as "AI judgment". */
  inferredSkillTags: string[];
};

// ---------------------------------------------------------------------------
// Preference vector — w*, the reconciled per-trait weight distribution.
// ---------------------------------------------------------------------------

/** A probability distribution over the 10 FDE traits — always sums to ~1. */
export type PreferenceVector = Record<TraitId, number>;

// ---------------------------------------------------------------------------
// Measurement plan — episodes (modules) + their trait loadings B_km.
// ---------------------------------------------------------------------------

export type CompetencyLoading = {
  traitId: TraitId;
  /** B_km — how strongly this module (m) loads on this trait (k), 0–1. */
  loading: number;
};

export type EpisodeKind =
  | "intake_brief"
  | "data_defect_trap"
  | "stakeholder_contradiction"
  | "curveball_event"
  | "verification_gate"
  | "handoff_submission";

export type Episode = {
  id: string;
  kind: EpisodeKind;
  title: string;
  description: string;
  estimatedMinutes: number;
  loadings: CompetencyLoading[];
  requiredFiles: string[];
};

export type CurveballSpec = {
  id: string;
  key: string;
  label: string;
  triggerAfterMinutes: number;
  narrative: string;
  targetTraits: TraitId[];
};

// ---------------------------------------------------------------------------
// World — the concrete, materialized Northbeam-template surface.
// ---------------------------------------------------------------------------

export type DataQuirk = "leading_zero" | "excel_strip" | "id_prefix";

export type WorldStakeholder = {
  id: string;
  name: string;
  role: string;
  goal: string;
};

export type InboxMessage = {
  id: string;
  authorId: string;
  timestampOffsetMinutes: number;
  text: string;
};

export type InboxThread = {
  channel: string;
  participants: { id: string; name: string; role: string }[];
  messages: InboxMessage[];
};

export type SimulationWorld = {
  companyName: string;
  industry: string;
  unitNoun: string;
  idPrefix: string;
  partnerNoun: string;
  ask: string;
  stakeholderA: WorldStakeholder;
  stakeholderB: WorldStakeholder;
  dataQuirk: DataQuirk;
  deadlineTwist: string;
  /** In-memory CSV-like tables, keyed by logical table name. */
  tables: {
    primaryRecords: string;
    partners: string;
    manualTracking: string;
  };
  inboxThread: InboxThread;
  /** Never invented — every fact here is derivable from the tables/thread above. */
  canonicalFacts: string[];
  /** Full candidate curveball pool for this world (a subset is selected into
   * the blueprint by measurement-planner based on the time budget). */
  curveballPool: CurveballSpec[];
};

// ---------------------------------------------------------------------------
// Blueprint — the versioned, compiled artifact.
// ---------------------------------------------------------------------------

export type SimulationMaturity = "draft" | "auto_validated";

export type DifficultyComponents = {
  technical: number;
  diagnostic: number;
  ambiguity: number;
  time: number;
  communication: number;
  adaptation: number;
};

export type DifficultyEstimate = {
  score: number;
  components: DifficultyComponents;
  parameterSource: "expert_prior";
  formulaVersion: string;
};

export type ScenarioHypothesis = {
  id: string;
  label: string;
  prior: number;
};

export type AmbiguityEstimate = {
  entropy: number;
  entropyAfterIdeal: number;
  hypotheses: ScenarioHypothesis[];
  ok: boolean;
  formulaVersion: string;
};

export type UtilityComponents = {
  reliability: number;
  coverage: number;
  scoreability: number;
  realism: number;
  discrimination: number;
  editability: number;
  engagement: number;
  ambiguity: number;
  leak: number;
  load: number;
  risk: number;
};

export type UtilityEstimate = {
  score: number;
  components: UtilityComponents;
  formulaVersion: string;
};

export type QualityCritics = {
  causalSolvability: number;
  measurementCoverage: number;
  scoreability: number;
  ambiguityControl: number;
  accessibility: number;
  fairnessRisk: number;
  privacySecurity: number;
  answerLeakage: number;
};

export type QualitySummary = {
  geometricQuality: number;
  critics: QualityCritics;
  formulaVersion: string;
};

export type SimulationBlueprint = {
  blueprintId: string;
  version: string;
  seed: string;
  createdAt: string;
  intake: EmployerIntake;
  roleGraph: RoleGraph;
  preferenceVector: PreferenceVector;
  episodes: Episode[];
  curveballs: CurveballSpec[];
  world: SimulationWorld;
  coverage: Record<TraitId, number>;
  durationMinutes: number;
  maturity: SimulationMaturity;
  difficulty?: DifficultyEstimate;
  utility?: UtilityEstimate;
  quality?: QualitySummary;
  ambiguity?: AmbiguityEstimate;
};

// ---------------------------------------------------------------------------
// Validation — gates a blueprint must clear before it can be marked published.
// ---------------------------------------------------------------------------

export type ValidationFlagSeverity = "info" | "warning" | "blocking";

export type ValidationFlag = {
  code: string;
  severity: ValidationFlagSeverity;
  message: string;
};

export type DurationEstimate = {
  criticalPathMinutes: number;
  estimatedMinutes: number;
  totalEpisodeMinutes: number;
  ambiguityEntropy: number;
  rho: number;
  kappa: number;
  rangeMinutes: { min: number; max: number };
  topoOk: boolean;
  cycles: string[];
  unreachable: string[];
  formulaVersion: string;
};

export type SelectionReason = {
  id: string;
  decision: "selected" | "rejected";
  score: number;
  reason: string;
  breakdown?: {
    score: number;
    coverageGain: number;
    deltaLogdet: number;
    timeMismatch: number;
    risk: number;
  };
};

export type SelectionDiagnostics = {
  formulaVersion: string;
  designQualityLogdet: number;
  selected: SelectionReason[];
  rejected: SelectionReason[];
};

export type PublishGate = {
  gate: "publishable" | "needs_revision";
  reasons: string[];
};

export type ValidationReport = {
  formulaVersion: string;
  flags: ValidationFlag[];
  consistencyOk: boolean;
  coverageOk: boolean;
  durationOk: boolean;
  /** 0–1 similarity of this blueprint's world signature against known
   * templates (the canonical Project Relay / Northbeam scenario) — a proxy
   * for "did this just regenerate the known-good scenario under a new name"
   * rather than a genuinely distinct measurement environment. */
  leakSimilarity: number;
  leakOk: boolean;
  solvableOk: boolean;
  traceableOk: boolean;
  noBlockingRiskOk: boolean;
  ambiguityOk: boolean;
  utilityScore: number;
  qualitySummary: QualitySummary;
  passesAllGates: boolean;
  /** Authoritative hard publish gate — set by publishGateFor. */
  publishGate: PublishGate;
  durationEstimate?: DurationEstimate;
  selectionDiagnostics?: SelectionDiagnostics;
};
