/**
 * validators.ts — the hard/soft gates a compiled blueprint passes through
 * before it can be marked "auto_validated" or handed a `publishable` gate.
 *
 * Checks, each independently reportable:
 *   1. consistency  — internal structural sanity of the compiled blueprint
 *   2. coverage     — Coverage_k floor for the two non-negotiable critical traits
 *   3. duration     — planned episode minutes vs the requested time budget
 *   4. leak         — similarity against the known-good template signature
 *   5. utility U(s) — weighted generation utility (prototype expert weights)
 *   6. quality Q    — geometric mean over critic scores
 *   7. ambiguity    — entropy bounds + ideal-evidence reduction
 *
 * Hard publish gate overrides utility:
 *   Publish(s) = I(Consistent) I(Solvable) I(CriticalCoverage) I(Traceable)
 *                I(NoBlockingRisk) I(AmbiguityOk)
 */
import { CRITICAL_TRAITS, MIN_CRITICAL_COVERAGE } from "./measurement-planner";
import { MAX_DURATION_MINUTES, MIN_DURATION_MINUTES } from "./role-compiler";
import { TRAIT_IDS, type TraitId } from "../evidence/traits";
import type {
  AmbiguityEstimate,
  DifficultyEstimate,
  DurationEstimate,
  Episode,
  PreferenceVector,
  PublishGate,
  QualitySummary,
  SelectionDiagnostics,
  SimulationWorld,
  UtilityComponents,
  UtilityEstimate,
  ValidationFlag,
  ValidationReport,
} from "./types";

export const VALIDATORS_VERSION = "validators-v3";

const DURATION_TOLERANCE_PCT = 0.35;
const LEAK_SIMILARITY_BLOCKING_THRESHOLD = 0.9;
const LEAK_SIMILARITY_WARNING_THRESHOLD = 0.6;
const QUALITY_EPSILON = 0.02;

export const UTILITY_WEIGHTS = {
  reliability: 0.2,
  coverage: 0.15,
  scoreability: 0.12,
  realism: 0.12,
  discrimination: 0.1,
  editability: 0.08,
  engagement: 0.08,
  ambiguity: -0.05,
  leak: -0.04,
  load: -0.03,
  risk: -0.03,
} as const;

const QUALITY_CRITIC_WEIGHTS = {
  causalSolvability: 0.16,
  measurementCoverage: 0.16,
  scoreability: 0.14,
  ambiguityControl: 0.12,
  accessibility: 0.1,
  fairnessRisk: 0.1,
  privacySecurity: 0.1,
  answerLeakage: 0.12,
} as const;

function clampUnit(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Consistency
// ---------------------------------------------------------------------------

function checkConsistency(world: SimulationWorld, episodes: Episode[]): { ok: boolean; flags: ValidationFlag[] } {
  const flags: ValidationFlag[] = [];

  if (!world.companyName.trim()) {
    flags.push({ code: "world.company_name_missing", severity: "blocking", message: "World is missing a company name." });
  }
  if (world.stakeholderA.id === world.stakeholderB.id) {
    flags.push({ code: "world.stakeholders_collide", severity: "blocking", message: "Stakeholder A and B resolved to the same identity." });
  }
  if (!world.tables.primaryRecords.trim() || !world.tables.manualTracking.trim()) {
    flags.push({ code: "world.tables_empty", severity: "blocking", message: "Primary records or manual tracking table is empty." });
  }
  if (world.inboxThread.messages.length === 0) {
    flags.push({ code: "world.inbox_empty", severity: "blocking", message: "Inbox thread has no messages." });
  }
  let lastOffset = -Infinity;
  for (const m of world.inboxThread.messages) {
    if (m.timestampOffsetMinutes < lastOffset) {
      flags.push({ code: "world.inbox_out_of_order", severity: "blocking", message: `Inbox message ${m.id} is out of chronological order.` });
      break;
    }
    lastOffset = m.timestampOffsetMinutes;
  }
  if (episodes.length === 0) {
    flags.push({ code: "plan.no_episodes", severity: "blocking", message: "No episodes were planned." });
  }
  const missingLoadings = episodes.filter((e) => e.loadings.length === 0);
  if (missingLoadings.length > 0) {
    flags.push({
      code: "plan.episode_missing_loadings",
      severity: "warning",
      message: `Episode(s) with no trait loadings: ${missingLoadings.map((e) => e.id).join(", ")}.`,
    });
  }

  const ok = flags.every((f) => f.severity !== "blocking");
  return { ok, flags };
}

function checkSolvable(world: SimulationWorld, episodes: Episode[]): { ok: boolean; flags: ValidationFlag[] } {
  const flags: ValidationFlag[] = [];
  const hasDataTrap = episodes.some((e) => e.kind === "data_defect_trap");
  const hasVerification = episodes.some((e) => e.kind === "verification_gate");
  if (!hasDataTrap || !hasVerification) {
    flags.push({
      code: "solvability.missing_core_path",
      severity: "blocking",
      message: "Solvable scenarios require both a data-integrity trap and a verification gate.",
    });
  }
  if (!world.dataQuirk || world.canonicalFacts.length === 0) {
    flags.push({
      code: "solvability.hidden_state_incomplete",
      severity: "blocking",
      message: "Hidden root cause or canonical facts are incomplete.",
    });
  }
  const ok = flags.every((f) => f.severity !== "blocking");
  return { ok, flags };
}

function checkTraceable(episodes: Episode[]): { ok: boolean; flags: ValidationFlag[] } {
  const flags: ValidationFlag[] = [];
  const untraceable = episodes.filter((e) => e.loadings.length === 0);
  if (untraceable.length > 0) {
    flags.push({
      code: "traceability.episode_without_loadings",
      severity: "blocking",
      message: `Episodes without evidence traceability: ${untraceable.map((e) => e.id).join(", ")}.`,
    });
  }
  const ok = flags.every((f) => f.severity !== "blocking");
  return { ok, flags };
}

function checkBlockingRisk(flags: ValidationFlag[]): { ok: boolean } {
  const blockingRisk = flags.some(
    (f) =>
      f.severity === "blocking" &&
      (f.code.startsWith("leak.") || f.code.startsWith("world.") || f.code.startsWith("ambiguity."))
  );
  return { ok: !blockingRisk };
}

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

function checkCoverage(
  coverage: Record<TraitId, number>,
  criticalTraits: TraitId[] = CRITICAL_TRAITS
): { ok: boolean; flags: ValidationFlag[] } {
  const flags: ValidationFlag[] = [];
  const critical = criticalTraits.length > 0 ? criticalTraits : CRITICAL_TRAITS;
  for (const traitId of critical) {
    if ((coverage[traitId] ?? 0) < MIN_CRITICAL_COVERAGE) {
      flags.push({
        code: `coverage.critical_below_floor.${traitId}`,
        severity: "blocking",
        message: `Coverage for critical trait "${traitId}" is ${coverage[traitId] ?? 0}, below the required floor of ${MIN_CRITICAL_COVERAGE}.`,
      });
    }
  }
  const zeroCoverageTraits = TRAIT_IDS.filter((id) => (coverage[id] ?? 0) === 0);
  if (zeroCoverageTraits.length > 0) {
    flags.push({
      code: "coverage.traits_with_no_opportunity",
      severity: "info",
      message: `No episode loads on: ${zeroCoverageTraits.join(", ")} — these traits will score not_observed for every session.`,
    });
  }
  const ok = flags.every((f) => f.severity !== "blocking");
  return { ok, flags };
}

// ---------------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------------

function checkDuration(
  durationMinutes: number,
  plannedMinutes: number,
  durationEstimate?: DurationEstimate
): { ok: boolean; flags: ValidationFlag[] } {
  const flags: ValidationFlag[] = [];
  if (durationMinutes < MIN_DURATION_MINUTES || durationMinutes > MAX_DURATION_MINUTES) {
    flags.push({
      code: "duration.out_of_bounds",
      severity: "blocking",
      message: `Requested duration ${durationMinutes}min is outside the allowed ${MIN_DURATION_MINUTES}-${MAX_DURATION_MINUTES}min range.`,
    });
  }

  const effectivePlanned =
    durationEstimate?.estimatedMinutes != null && Number.isFinite(durationEstimate.estimatedMinutes)
      ? durationEstimate.estimatedMinutes
      : plannedMinutes;

  if (durationEstimate && !durationEstimate.topoOk) {
    flags.push({
      code: "duration.dag_invalid",
      severity: "blocking",
      message: `Episode DAG failed topo validation (cycles=[${durationEstimate.cycles.join(",")}], unreachable=[${durationEstimate.unreachable.join(",")}]).`,
    });
  }

  const delta = Math.abs(effectivePlanned - durationMinutes);
  const tolerance = durationMinutes * DURATION_TOLERANCE_PCT;
  if (delta > tolerance) {
    flags.push({
      code: "duration.plan_mismatch",
      severity: effectivePlanned > durationMinutes ? "warning" : "info",
      message: `Planned episode content is ${effectivePlanned}min against a requested ${durationMinutes}min budget (${effectivePlanned > durationMinutes ? "over" : "under"} by ${delta}min)${durationEstimate ? ` [CPM=${durationEstimate.criticalPathMinutes}]` : ""}.`,
    });
  }
  const ok = flags.every((f) => f.severity !== "blocking");
  return { ok, flags };
}

// ---------------------------------------------------------------------------
// Ambiguity
// ---------------------------------------------------------------------------

function checkAmbiguity(
  ambiguity?: AmbiguityEstimate,
  externalFlags?: ValidationFlag[]
): { ok: boolean; flags: ValidationFlag[] } {
  if (!ambiguity) {
    return {
      ok: false,
      flags: [
        {
          code: "ambiguity.missing",
          severity: "blocking",
          message: "Ambiguity estimate is required for publishable blueprints.",
        },
      ],
    };
  }
  // Prefer caller-supplied validateAmbiguity flags when present.
  if (externalFlags && externalFlags.length > 0) {
    const ok = ambiguity.ok && externalFlags.every((f) => f.severity !== "blocking");
    return { ok, flags: [] };
  }
  if (ambiguity.ok) {
    return { ok: true, flags: [] };
  }
  return {
    ok: false,
    flags: [
      {
        code: "ambiguity.ok_failed",
        severity: "blocking",
        message: `Ambiguity gate failed (entropy=${ambiguity.entropy}, afterIdeal=${ambiguity.entropyAfterIdeal}).`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Leak similarity — Jensen–Shannon divergence over word-frequency vectors.
// ---------------------------------------------------------------------------

const KNOWN_TEMPLATE_SIGNATURE =
  "northbeam logistics ops manager vp of operations shipment delay visibility dashboard root cause board meeting " +
  "carrier self reported on time rate manual tracking sheet leading zero shp prefix naive join reconcile";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function wordFrequencyDistribution(tokens: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tokens) counts[t] = (counts[t] || 0) + 1;
  const total = tokens.length || 1;
  const dist: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) dist[k] = v / total;
  return dist;
}

/** Symmetric Jensen–Shannon divergence (log2, bounded [0,1]) over two
 * word-frequency distributions with a shared vocabulary union. Returns
 * *divergence* — callers wanting similarity should use `1 - divergence`. */
export function textJensenShannonDivergence(a: string, b: string): number {
  const distA = wordFrequencyDistribution(tokenize(a));
  const distB = wordFrequencyDistribution(tokenize(b));
  const vocab = new Set([...Object.keys(distA), ...Object.keys(distB)]);
  if (vocab.size === 0) return 0;

  const klTerm = (p: number, m: number) => (p <= 0 || m <= 0 ? 0 : p * Math.log2(p / m));
  let jsd = 0;
  for (const word of vocab) {
    const p = distA[word] || 0;
    const q = distB[word] || 0;
    const m = (p + q) / 2;
    jsd += 0.5 * klTerm(p, m) + 0.5 * klTerm(q, m);
  }
  return Math.max(0, Math.min(1, jsd));
}

function worldSignature(world: SimulationWorld): string {
  return [
    world.companyName,
    world.industry,
    world.ask,
    world.stakeholderA.role,
    world.stakeholderB.role,
    world.stakeholderA.goal,
    world.stakeholderB.goal,
    world.dataQuirk,
    world.deadlineTwist,
    ...world.canonicalFacts,
  ].join(" ");
}

function checkLeak(world: SimulationWorld): { ok: boolean; similarity: number; flags: ValidationFlag[] } {
  const divergence = textJensenShannonDivergence(worldSignature(world), KNOWN_TEMPLATE_SIGNATURE);
  const similarity = Math.round((1 - divergence) * 1000) / 1000;
  const flags: ValidationFlag[] = [];
  if (similarity >= LEAK_SIMILARITY_BLOCKING_THRESHOLD) {
    flags.push({
      code: "leak.matches_known_template",
      severity: "blocking",
      message: `World signature is ${Math.round(similarity * 100)}% similar to the known-good Project Relay template — this reads as a relabeled copy, not a distinct measurement environment.`,
    });
  } else if (similarity >= LEAK_SIMILARITY_WARNING_THRESHOLD) {
    flags.push({
      code: "leak.close_to_known_template",
      severity: "warning",
      message: `World signature is ${Math.round(similarity * 100)}% similar to the known-good Project Relay template — consider varying industry/company/quirk further.`,
    });
  }
  const ok = flags.every((f) => f.severity !== "blocking");
  return { ok, similarity, flags };
}

// ---------------------------------------------------------------------------
// Utility U(s) and geometric quality Q
// ---------------------------------------------------------------------------

export type UtilityInput = {
  world: SimulationWorld;
  episodes: Episode[];
  coverage: Record<TraitId, number>;
  durationMinutes: number;
  plannedMinutes: number;
  leakSimilarity: number;
  ambiguity?: AmbiguityEstimate;
  difficulty?: DifficultyEstimate;
  preferenceVector?: PreferenceVector;
};

function computeUtilityComponents(input: UtilityInput): UtilityComponents {
  const independentEvidenceSources = new Set(
    input.episodes.flatMap((e) => e.loadings.map((l) => `${e.id}:${l.traitId}`))
  ).size;
  const reliability = clampUnit(Math.min(1, independentEvidenceSources / 12));

  const criticalCoverage =
    CRITICAL_TRAITS.reduce((s, id) => s + (input.coverage[id] ?? 0), 0) / CRITICAL_TRAITS.length;
  const meanCoverage = TRAIT_IDS.reduce((s, id) => s + (input.coverage[id] ?? 0), 0) / TRAIT_IDS.length;
  const coverage = clampUnit(0.7 * criticalCoverage + 0.3 * meanCoverage);

  const scoreability = clampUnit(
    input.episodes.filter((e) => e.loadings.length > 0).length / Math.max(input.episodes.length, 1)
  );

  const realism = clampUnit(1 - input.leakSimilarity);

  const loadingValues = input.episodes.flatMap((e) => e.loadings.map((l) => l.loading));
  const meanLoading = loadingValues.reduce((s, v) => s + v, 0) / Math.max(loadingValues.length, 1);
  const loadingSpread =
    loadingValues.length > 1
      ? loadingValues.reduce((s, v) => s + Math.abs(v - meanLoading), 0) / loadingValues.length
      : 0;
  const discrimination = clampUnit(0.45 + loadingSpread);

  const editability = clampUnit(0.55 + input.episodes.length * 0.06);

  const distinctKinds = new Set(input.episodes.map((e) => e.kind)).size;
  const engagement = clampUnit(0.35 + distinctKinds * 0.08);

  const ambiguityPenalty = clampUnit(
    input.ambiguity ? Math.min(1, input.ambiguity.entropy / (input.ambiguity.entropyAfterIdeal + 0.5)) : 0.45
  );

  const leak = clampUnit(input.leakSimilarity);

  const loadRatio = input.plannedMinutes / Math.max(input.durationMinutes, 1);
  const load = clampUnit(Math.abs(loadRatio - 1) * 0.8);

  const risk = clampUnit(input.world.inboxThread.messages.length === 0 ? 1 : 0.08);

  return {
    reliability,
    coverage,
    scoreability,
    realism,
    discrimination,
    editability,
    engagement,
    ambiguity: ambiguityPenalty,
    leak,
    load,
    risk,
  };
}

export function utilityScore(input: UtilityInput): UtilityEstimate {
  const components = computeUtilityComponents(input);
  const score = clampUnit(
    UTILITY_WEIGHTS.reliability * components.reliability +
      UTILITY_WEIGHTS.coverage * components.coverage +
      UTILITY_WEIGHTS.scoreability * components.scoreability +
      UTILITY_WEIGHTS.realism * components.realism +
      UTILITY_WEIGHTS.discrimination * components.discrimination +
      UTILITY_WEIGHTS.editability * components.editability +
      UTILITY_WEIGHTS.engagement * components.engagement +
      UTILITY_WEIGHTS.ambiguity * components.ambiguity +
      UTILITY_WEIGHTS.leak * components.leak +
      UTILITY_WEIGHTS.load * components.load +
      UTILITY_WEIGHTS.risk * components.risk
  );

  return {
    score,
    components,
    formulaVersion: VALIDATORS_VERSION,
  };
}

export function qualitySummary(input: UtilityInput & { consistencyOk: boolean; coverageOk: boolean }): QualitySummary {
  const utility = computeUtilityComponents(input);
  const critics = {
    causalSolvability: clampUnit(input.episodes.some((e) => e.kind === "data_defect_trap") ? 0.9 : 0.4),
    measurementCoverage: utility.coverage,
    scoreability: utility.scoreability,
    ambiguityControl: clampUnit(1 - utility.ambiguity),
    accessibility: clampUnit(input.durationMinutes >= MIN_DURATION_MINUTES ? 0.85 : 0.3),
    fairnessRisk: clampUnit(1 - utility.risk),
    privacySecurity: clampUnit(input.world.canonicalFacts.length > 0 ? 0.88 : 0.5),
    answerLeakage: clampUnit(1 - utility.leak),
  };

  let geometricQuality = 100;
  for (const [key, weight] of Object.entries(QUALITY_CRITIC_WEIGHTS)) {
    const q = critics[key as keyof typeof critics];
    geometricQuality *= Math.pow(q + QUALITY_EPSILON, weight);
  }
  geometricQuality = Math.round(geometricQuality * 10) / 10;

  return {
    geometricQuality,
    critics,
    formulaVersion: VALIDATORS_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function validateBlueprintParts(input: {
  world: SimulationWorld;
  episodes: Episode[];
  coverage: Record<TraitId, number>;
  durationMinutes: number;
  plannedMinutes: number;
  ambiguity?: AmbiguityEstimate;
  ambiguityFlags?: ValidationFlag[];
  difficulty?: DifficultyEstimate;
  preferenceVector?: PreferenceVector;
  criticalTraits?: TraitId[];
  durationEstimate?: DurationEstimate;
  selectionDiagnostics?: SelectionDiagnostics;
}): ValidationReport {
  const consistency = checkConsistency(input.world, input.episodes);
  const coverage = checkCoverage(input.coverage, input.criticalTraits);
  const duration = checkDuration(input.durationMinutes, input.plannedMinutes, input.durationEstimate);
  const leak = checkLeak(input.world);
  const solvable = checkSolvable(input.world, input.episodes);
  const traceable = checkTraceable(input.episodes);
  const ambiguity = checkAmbiguity(input.ambiguity, input.ambiguityFlags);

  const flags = [
    ...consistency.flags,
    ...coverage.flags,
    ...duration.flags,
    ...leak.flags,
    ...solvable.flags,
    ...traceable.flags,
    ...ambiguity.flags,
    ...(input.ambiguityFlags ?? []),
  ];
  const noBlockingRisk = checkBlockingRisk(flags);
  const ambiguityOk = ambiguity.ok;

  const utilityInput: UtilityInput = {
    world: input.world,
    episodes: input.episodes,
    coverage: input.coverage,
    durationMinutes: input.durationMinutes,
    plannedMinutes: input.plannedMinutes,
    leakSimilarity: leak.similarity,
    ambiguity: input.ambiguity,
    difficulty: input.difficulty,
    preferenceVector: input.preferenceVector,
  };
  const utility = utilityScore(utilityInput);
  const quality = qualitySummary({ ...utilityInput, consistencyOk: consistency.ok, coverageOk: coverage.ok });

  const passesAllGates =
    consistency.ok &&
    coverage.ok &&
    duration.ok &&
    leak.ok &&
    solvable.ok &&
    traceable.ok &&
    noBlockingRisk.ok &&
    ambiguityOk;

  const reportWithoutGate: Omit<ValidationReport, "publishGate"> = {
    formulaVersion: VALIDATORS_VERSION,
    flags,
    consistencyOk: consistency.ok,
    coverageOk: coverage.ok,
    durationOk: duration.ok,
    leakSimilarity: leak.similarity,
    leakOk: leak.ok,
    solvableOk: solvable.ok,
    traceableOk: traceable.ok,
    noBlockingRiskOk: noBlockingRisk.ok,
    ambiguityOk,
    utilityScore: utility.score,
    qualitySummary: quality,
    passesAllGates,
    durationEstimate: input.durationEstimate,
    selectionDiagnostics: input.selectionDiagnostics,
  };

  const publishGate = publishGateFor(reportWithoutGate as ValidationReport);

  return {
    ...reportWithoutGate,
    publishGate,
  };
}

/** Hard publish gate — utility informs the panel but cannot override failed gates. */
export function publishGateFor(report: Pick<
  ValidationReport,
  | "consistencyOk"
  | "solvableOk"
  | "coverageOk"
  | "traceableOk"
  | "noBlockingRiskOk"
  | "ambiguityOk"
  | "passesAllGates"
  | "flags"
>): PublishGate {
  const hardGateOk =
    report.consistencyOk &&
    report.solvableOk &&
    report.coverageOk &&
    report.traceableOk &&
    report.noBlockingRiskOk &&
    report.ambiguityOk;

  if (hardGateOk && report.passesAllGates) {
    return { gate: "publishable", reasons: [] };
  }

  const reasons = report.flags.filter((f) => f.severity === "blocking").map((f) => f.message);
  if (!hardGateOk && reasons.length === 0) {
    reasons.push("Hard publish gate failed — one or more required checks did not pass.");
  }
  return { gate: "needs_revision", reasons };
}
