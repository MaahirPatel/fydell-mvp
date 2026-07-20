/**
 * difficulty.ts — expert-prior difficulty estimate D(s) for a compiled blueprint.
 *
 * D(s) = 0.30 technical + 0.22 diagnostic + 0.15 ambiguity + 0.12 time
 *      + 0.11 communication + 0.10 adaptation
 *
 * All component priors are deterministic functions of duration and role signals —
 * not inferred from protected attributes. parameterSource is always "expert_prior".
 */
import type { DifficultyEstimate, Episode, SimulationWorld } from "./types";

export const DIFFICULTY_VERSION = "difficulty-v1";

const COMPONENT_WEIGHTS = {
  technical: 0.3,
  diagnostic: 0.22,
  ambiguity: 0.15,
  time: 0.12,
  communication: 0.11,
  adaptation: 0.1,
} as const;

export type DifficultyInput = {
  durationMinutes: number;
  seniority?: string;
  episodes: Episode[];
  world: SimulationWorld;
  inferredSkillTags?: string[];
};

function clampUnit(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;
}

function seniorityPrior(seniority?: string): number {
  const normalized = (seniority ?? "mid-level").toLowerCase();
  if (normalized.includes("senior") || normalized.includes("staff") || normalized.includes("principal")) {
    return 0.75;
  }
  if (normalized.includes("junior") || normalized.includes("entry") || normalized.includes("associate")) {
    return 0.35;
  }
  return 0.55;
}

function durationPrior(durationMinutes: number): number {
  const midpoint = 60;
  const spread = 40;
  return clampUnit(0.35 + 0.5 * (1 / (1 + Math.exp(-(durationMinutes - midpoint) / spread))));
}

function technicalPrior(input: DifficultyInput): number {
  const hasVerification = input.episodes.some((e) => e.kind === "verification_gate");
  const hasDataTrap = input.episodes.some((e) => e.kind === "data_defect_trap");
  return clampUnit(0.45 + 0.25 * Number(hasVerification) + 0.2 * Number(hasDataTrap));
}

function diagnosticPrior(input: DifficultyInput): number {
  const distinctKinds = new Set(input.episodes.map((e) => e.kind)).size;
  return clampUnit(0.35 + 0.08 * distinctKinds);
}

function ambiguityPrior(input: DifficultyInput): number {
  const stakeholderConflict = input.inferredSkillTags?.includes("stakeholder_conflict") ?? false;
  const thinBrief = input.world.ask.length < 120;
  return clampUnit(0.4 + 0.2 * Number(stakeholderConflict) + 0.15 * Number(thinBrief));
}

function timePrior(input: DifficultyInput): number {
  const planned = input.episodes.reduce((s, e) => s + e.estimatedMinutes, 0);
  const pressure = planned / Math.max(input.durationMinutes, 1);
  return clampUnit(0.3 + 0.45 * Math.min(1, pressure));
}

function communicationPrior(input: DifficultyInput): number {
  const stakeholderEpisode = input.episodes.some((e) => e.kind === "stakeholder_contradiction");
  const handoff = input.episodes.some((e) => e.kind === "handoff_submission");
  return clampUnit(0.35 + 0.25 * Number(stakeholderEpisode) + 0.2 * Number(handoff));
}

function adaptationPrior(input: DifficultyInput): number {
  const curveball = input.episodes.some((e) => e.kind === "curveball_event");
  const timePressure = input.inferredSkillTags?.includes("time_pressure") ?? false;
  const seniorityBoost = seniorityPrior(input.seniority) * 0.15;
  return clampUnit(0.3 + 0.25 * Number(curveball) + 0.15 * Number(timePressure) + seniorityBoost);
}

export function computeDifficulty(input: DifficultyInput): DifficultyEstimate {
  const seniority = seniorityPrior(input.seniority);
  const duration = durationPrior(input.durationMinutes);

  const components = {
    technical: clampUnit(technicalPrior(input) * 0.7 + duration * 0.3),
    diagnostic: clampUnit(diagnosticPrior(input) * 0.65 + seniority * 0.35),
    ambiguity: ambiguityPrior(input),
    time: clampUnit(timePrior(input) * 0.6 + duration * 0.4),
    communication: communicationPrior(input),
    adaptation: adaptationPrior(input),
  };

  const score = clampUnit(
    COMPONENT_WEIGHTS.technical * components.technical +
      COMPONENT_WEIGHTS.diagnostic * components.diagnostic +
      COMPONENT_WEIGHTS.ambiguity * components.ambiguity +
      COMPONENT_WEIGHTS.time * components.time +
      COMPONENT_WEIGHTS.communication * components.communication +
      COMPONENT_WEIGHTS.adaptation * components.adaptation
  );

  return {
    score,
    components,
    parameterSource: "expert_prior",
    formulaVersion: DIFFICULTY_VERSION,
  };
}
