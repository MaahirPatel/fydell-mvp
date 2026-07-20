/**
 * compile.ts — the single entry point that turns employer intake into a
 * fully compiled, validated SimulationBlueprint.
 *
 *   compileBlueprint(intake, seed) → { blueprint, preview, validation, filesPreview, maturity }
 *
 * Pipeline: role-compiler (weights + role graph) → measurement-planner
 * (episode selection + coverage) → world-generator (concrete Northbeam-
 * template world) → validators (hard/soft gates) → assembled blueprint.
 *
 * Deterministic end-to-end: the same (intake, seed) pair always produces a
 * byte-identical blueprint except for `createdAt`, which reflects wall-clock
 * compile time rather than blueprint identity.
 */
import { TRAIT_IDS, TRAIT_LABELS, type TraitId } from "../evidence/traits";
import { buildRoleGraph, reconcileWeights, assertValidDuration } from "./role-compiler";
import { CRITICAL_TRAITS, planModules } from "./measurement-planner";
import { generateWorld } from "./world-generator";
import { publishGateFor, validateBlueprintParts, utilityScore } from "./validators";
import { computeDifficulty } from "./difficulty";
import { durationEstimate } from "./duration-cpm";
import { selectCurveballsByUtility } from "./curveball-utility";
import { designQualityLogdet } from "./selection";
import { validateEmployerIntake } from "./blueprint-schema";
import {
  defaultScenarioHypotheses,
  idealEvidencePosterior,
  validateAmbiguity,
  AMBIGUITY_VERSION,
} from "./ambiguity";
import type {
  CurveballSpec,
  EmployerIntake,
  Episode,
  PublishGate,
  SelectionDiagnostics,
  SimulationBlueprint,
  SimulationMaturity,
  SimulationWorld,
  ValidationFlag,
  ValidationReport,
  DurationEstimate,
} from "./types";

export const COMPILER_VERSION = "fde-generator-compile-v2";

function stableHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// ---------------------------------------------------------------------------
// Preview shape — what the employer-facing UI renders after "Generate".
// ---------------------------------------------------------------------------

export type BlueprintPreview = {
  companyName: string;
  industry: string;
  ask: string;
  competencyCoverage: { traitId: TraitId; label: string; coverage: number }[];
  requestedDurationMinutes: number;
  plannedDurationMinutes: number;
  trapsIncluded: { id: string; title: string; kind: string; estimatedMinutes: number }[];
  curveballsIncluded: { key: string; label: string }[];
  validationFlags: ValidationFlag[];
  maturity: SimulationMaturity;
  maturityLabel: string;
  topWeightedTraits: { traitId: TraitId; label: string; weight: number }[];
  difficultyScore?: number;
  utilityScore?: number;
  geometricQuality?: number;
  publishGate?: PublishGate;
  durationEstimate?: { min: number; max: number; criticalPathMinutes: number; estimatedMinutes: number };
  designQualityLogdet?: number;
  selectionDiagnostics?: SelectionDiagnostics;
};

export type CompileResult = {
  blueprint: SimulationBlueprint;
  preview: BlueprintPreview;
  validation: ValidationReport;
  filesPreview: Record<string, string>;
  maturity: SimulationMaturity;
};

export const MATURITY_LABEL: Record<SimulationMaturity, string> = {
  draft: "design-weighted draft — not outcome-validated",
  auto_validated: "auto-validated draft — not outcome-validated",
};

export function compileBlueprint(intake: EmployerIntake, seed: string): CompileResult {
  assertValidDuration(intake.durationMinutes);
  if (!seed || !seed.trim()) {
    throw new Error("A non-empty seed is required for deterministic compilation.");
  }
  const intakeCheck = validateEmployerIntake(intake);
  if (!intakeCheck.ok) {
    const first = intakeCheck.diagnostics.find((d) => d.severity === "blocking");
    throw new Error(first?.message || "Invalid employer intake.");
  }

  const weights = reconcileWeights(intake);
  const roleGraph = buildRoleGraph(intake, weights.jobSignalHits);
  const criticalTraits: TraitId[] = [
    ...CRITICAL_TRAITS,
    ...(intake.criticalTraits ?? []).filter((id) => !CRITICAL_TRAITS.includes(id)),
  ];

  const planned = planModules(intake.durationMinutes, roleGraph, weights.preferenceVector, {
    criticalTraits: intake.criticalTraits,
  });
  const world = generateWorld(seed, intake.industry, intake.objective);

  const curveballPick = selectCurveballsByUtility({
    pool: world.curveballPool,
    episodes: planned.episodes,
    preferenceVector: weights.preferenceVector,
    durationMinutes: intake.durationMinutes,
  });
  const curveballs = curveballPick.selected;

  const difficulty = computeDifficulty({
    durationMinutes: intake.durationMinutes,
    seniority: intake.title,
    episodes: planned.episodes,
    world,
    inferredSkillTags: roleGraph.inferredSkillTags,
  });

  const hypotheses = defaultScenarioHypotheses(world.dataQuirk);
  const ambiguityCheck = validateAmbiguity(hypotheses, idealEvidencePosterior(hypotheses));
  const ambiguity = {
    entropy: ambiguityCheck.entropy,
    entropyAfterIdeal: ambiguityCheck.entropyAfterIdeal,
    hypotheses,
    ok: ambiguityCheck.ok,
    formulaVersion: AMBIGUITY_VERSION,
  };

  const durationEst: DurationEstimate = durationEstimate({
    episodes: planned.episodes,
    ambiguityEntropy: ambiguity.entropy,
  });

  // Use critical-path estimate as the planned-minutes input to duration checks.
  const plannedMinutes = durationEst.estimatedMinutes;

  const ambiguityFlags: ValidationFlag[] = ambiguityCheck.flags.map((f) => ({
    code: f.code,
    severity: f.severity,
    message: f.message,
  }));

  const validation = validateBlueprintParts({
    world,
    episodes: planned.episodes,
    coverage: planned.coverage,
    durationMinutes: intake.durationMinutes,
    plannedMinutes,
    ambiguity,
    ambiguityFlags,
    difficulty,
    preferenceVector: weights.preferenceVector,
    criticalTraits,
    durationEstimate: durationEst,
    selectionDiagnostics: planned.selectionDiagnostics,
  });

  // Authoritative publish gate (also attached inside validateBlueprintParts).
  const publishGate = publishGateFor(validation);
  validation.publishGate = publishGate;

  const utility = utilityScore({
    world,
    episodes: planned.episodes,
    coverage: planned.coverage,
    durationMinutes: intake.durationMinutes,
    plannedMinutes,
    leakSimilarity: validation.leakSimilarity,
    ambiguity,
    difficulty,
    preferenceVector: weights.preferenceVector,
  });

  const designLogdet = designQualityLogdet(
    planned.episodes.map((e) => ({ loadings: e.loadings }))
  );

  const maturity: SimulationMaturity =
    validation.passesAllGates && publishGate.gate === "publishable" ? "auto_validated" : "draft";
  const blueprintId = `fdegen-${stableHash(`${seed}:${intake.title}:${intake.industry}:${intake.durationMinutes}`)}`;

  const blueprint: SimulationBlueprint = {
    blueprintId,
    version: COMPILER_VERSION,
    seed,
    createdAt: new Date().toISOString(),
    intake,
    roleGraph,
    preferenceVector: weights.preferenceVector,
    episodes: planned.episodes,
    curveballs,
    world,
    coverage: planned.coverage,
    durationMinutes: intake.durationMinutes,
    maturity,
    difficulty,
    utility,
    quality: validation.qualitySummary,
    ambiguity,
  };

  const topWeightedTraits = TRAIT_IDS.map((id) => ({
    traitId: id,
    label: TRAIT_LABELS[id],
    weight: Math.round(weights.preferenceVector[id] * 1000) / 1000,
  }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);

  const preview: BlueprintPreview = {
    companyName: world.companyName,
    industry: world.industry,
    ask: world.ask,
    competencyCoverage: TRAIT_IDS.map((id) => ({
      traitId: id,
      label: TRAIT_LABELS[id],
      coverage: planned.coverage[id] ?? 0,
    })),
    requestedDurationMinutes: intake.durationMinutes,
    plannedDurationMinutes: plannedMinutes,
    trapsIncluded: planned.episodes.map((e) => ({
      id: e.id,
      title: e.title,
      kind: e.kind,
      estimatedMinutes: e.estimatedMinutes,
    })),
    curveballsIncluded: curveballs.map((c) => ({ key: c.key, label: c.label })),
    validationFlags: validation.flags,
    maturity,
    maturityLabel: MATURITY_LABEL[maturity],
    topWeightedTraits,
    difficultyScore: difficulty.score,
    utilityScore: utility.score,
    geometricQuality: validation.qualitySummary.geometricQuality,
    publishGate,
    durationEstimate: {
      min: durationEst.rangeMinutes.min,
      max: durationEst.rangeMinutes.max,
      criticalPathMinutes: durationEst.criticalPathMinutes,
      estimatedMinutes: durationEst.estimatedMinutes,
    },
    designQualityLogdet: Math.round(designLogdet * 10000) / 10000,
    selectionDiagnostics: planned.selectionDiagnostics,
  };

  const filesPreview = buildFilesPreview(intake, world, planned.episodes, curveballs);

  return { blueprint, preview, validation, filesPreview, maturity };
}

function buildFilesPreview(
  intake: EmployerIntake,
  world: SimulationWorld,
  episodes: Episode[],
  curveballs: CurveballSpec[]
): Record<string, string> {
  const files: Record<string, string> = {};

  files["README.md"] =
    [
      `# ${intake.title.trim() || "Untitled role"} — ${world.companyName}`,
      "",
      `**Client ask, verbatim:** "${world.ask}"`,
      "",
      `${world.stakeholderA.name} (${world.stakeholderA.role}) sent over the files below and asked you to build "whatever's useful." Scoping the smallest credible thing is part of the exercise.`,
      "",
      "## What you've been handed",
      "",
      "- `data/primary_records.csv` — the system-of-record export.",
      `- \`data/partners.csv\` — one row per ${world.partnerNoun.replace(/s$/, "")}, including a self-reported reliability number.`,
      "- `data/manual_tracking.csv` — a hand-kept log that was never validated against the system of record.",
      "",
      "This is a synthetic exercise — every name, company, and row of data below is fabricated for this simulation.",
    ].join("\n") + "\n";

  files["docs/customer-brief.md"] =
    [
      `# Customer brief (synthetic): ${world.companyName}`,
      "",
      `**Client ask, verbatim:** "${world.ask}"`,
      "",
      `${world.stakeholderA.name} wants ${world.stakeholderA.goal}. ${world.stakeholderB.name} wants ${world.stakeholderB.goal}. They have not reconciled that between themselves — managing that conflict is the candidate's job.`,
      "",
      `Heads up: ${world.deadlineTwist}.`,
    ].join("\n") + "\n";

  files["docs/data-integrity.md"] =
    [
      "# Data integrity note (synthetic)",
      "",
      `This world ships with one deliberate, discoverable defect: the manual tracking sheet uses a "${world.dataQuirk.replace(/_/g, " ")}" ID-formatting quirk that a naive exact-match join against \`data/primary_records.csv\` will silently drop.`,
      "",
      "A dashboard or report built on top of the naive join would look confident and be quietly wrong.",
    ].join("\n") + "\n";

  files["data/primary_records.csv"] = world.tables.primaryRecords;
  files["data/partners.csv"] = world.tables.partners;
  files["data/manual_tracking.csv"] = world.tables.manualTracking;
  files["data/inbox_thread.json"] = JSON.stringify(world.inboxThread, null, 2) + "\n";
  files["canonical.json"] =
    JSON.stringify(
      {
        companyName: world.companyName,
        industry: world.industry,
        durationMinutes: intake.durationMinutes,
        episodes: episodes.map((e) => e.id),
        curveballs: curveballs.map((c) => c.key),
        canonicalFacts: world.canonicalFacts,
        aiPolicy: intake.aiPolicy ?? null,
      },
      null,
      2
    ) + "\n";

  return files;
}

// ---------------------------------------------------------------------------
// Mission bridge — packaging a compiled blueprint into fde_missions text
// columns without a schema migration. `systems_context` gets a human-
// readable structured summary; the full JSON round-trips through a clearly
// marked footer in `customer_context` (see 011_fde_core_loop.sql — neither
// column has a JSON type, both are free text).
// ---------------------------------------------------------------------------

const BLUEPRINT_JSON_START = "<!-- FDE_GENERATED_BLUEPRINT_JSON_START -->";
const BLUEPRINT_JSON_END = "<!-- FDE_GENERATED_BLUEPRINT_JSON_END -->";

export function renderSystemsContextMarkdown(blueprint: SimulationBlueprint): string {
  const lines: string[] = [
    `## Generated simulation — ${blueprint.world.companyName} (${blueprint.world.industry})`,
    "",
    `Blueprint \`${blueprint.blueprintId}\` (seed \`${blueprint.seed}\`, ${blueprint.version}) — ${MATURITY_LABEL[blueprint.maturity]}.`,
    "",
    `**Ask:** ${blueprint.world.ask}`,
    "",
    "### Episodes",
    "",
    ...blueprint.episodes.map((e) => `- **${e.title}** (${e.estimatedMinutes}min) — ${e.description}`),
    "",
    "### Coverage by trait",
    "",
    ...TRAIT_IDS.map((id) => `- ${TRAIT_LABELS[id]}: ${blueprint.coverage[id] ?? 0}`),
    "",
    "### Curveballs",
    "",
    ...(blueprint.curveballs.length > 0
      ? blueprint.curveballs.map((c) => `- ${c.label} — ${c.narrative}`)
      : ["- None planned at this duration."]),
  ];
  return lines.join("\n") + "\n";
}

/** Embeds the full blueprint JSON in a marked footer so it survives being
 * stored in a plain-text mission column and can be recovered losslessly. */
export function embedBlueprintInCustomerContext(customerContext: string, blueprint: SimulationBlueprint): string {
  const withoutOldFooter = customerContext
    .split(BLUEPRINT_JSON_START)[0]
    .trimEnd();
  const footer = [BLUEPRINT_JSON_START, JSON.stringify(blueprint), BLUEPRINT_JSON_END].join("\n");
  return `${withoutOldFooter}\n\n${footer}\n`;
}

export function extractBlueprintFromCustomerContext(customerContext: string): SimulationBlueprint | null {
  const start = customerContext.indexOf(BLUEPRINT_JSON_START);
  const end = customerContext.indexOf(BLUEPRINT_JSON_END);
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonText = customerContext.slice(start + BLUEPRINT_JSON_START.length, end).trim();
  try {
    return JSON.parse(jsonText) as SimulationBlueprint;
  } catch {
    return null;
  }
}
