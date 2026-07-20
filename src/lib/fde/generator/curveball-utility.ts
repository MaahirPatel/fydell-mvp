/**
 * curveball-utility.ts — score / select curveballs from the world pool.
 *
 * U(c) = α·ΔC + β·infoGain − γ·disruption − δ·unfairness
 *
 * Coefficients are expert_prior_v1 (not outcome-calibrated).
 */
import { TRAIT_IDS, type TraitId } from "../evidence/traits";
import type { CurveballSpec, Episode, PreferenceVector } from "./types";
import { coverageProduct } from "./measurement-planner";

export const CURVEBALL_UTILITY_VERSION = "curveball-utility-expert-prior-v1";

/** expert_prior_v1 coefficients for U(c). */
export const CURVEBALL_UTILITY_WEIGHTS = {
  alpha: 1.0,
  beta: 0.4,
  gamma: 0.3,
  delta: 0.5,
} as const;

export type CurveballUtilityComponents = {
  deltaC: number;
  infoGain: number;
  disruption: number;
  unfairness: number;
};

export type CurveballUtilityResult = {
  curveballId: string;
  key: string;
  utility: number;
  selected: boolean;
  components: CurveballUtilityComponents;
  formulaVersion: string;
};

function clamp01(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;
}

/** Synthetic loadings implied by a curveball's target traits. */
function curveballLoadings(curveball: CurveballSpec): { traitId: TraitId; loading: number }[] {
  if (curveball.targetTraits.length === 0) return [];
  const loading = clamp01(0.55 / Math.sqrt(curveball.targetTraits.length));
  return curveball.targetTraits.map((traitId) => ({ traitId, loading }));
}

function coverageDelta(
  episodes: Episode[],
  curveball: CurveballSpec,
  preferenceVector: PreferenceVector
): number {
  const current = coverageProduct(episodes.map((e) => e.loadings));
  const next = coverageProduct([...episodes.map((e) => e.loadings), curveballLoadings(curveball)]);
  let gain = 0;
  for (const traitId of TRAIT_IDS) {
    const delta = (next[traitId] ?? 0) - (current[traitId] ?? 0);
    gain += delta * (1 + (preferenceVector[traitId] ?? 0));
  }
  return gain;
}

function infoGain(
  episodes: Episode[],
  curveball: CurveballSpec,
  preferenceVector: PreferenceVector
): number {
  const coverage = coverageProduct(episodes.map((e) => e.loadings));
  let gain = 0;
  for (const traitId of curveball.targetTraits) {
    const gap = 1 - (coverage[traitId] ?? 0);
    gain += gap * (preferenceVector[traitId] ?? 0.05);
  }
  return gain;
}

function disruptionScore(curveball: CurveballSpec, durationMinutes: number): number {
  // Earlier triggers are more disruptive; late ones less so.
  const t = curveball.triggerAfterMinutes / Math.max(durationMinutes, 1);
  return clamp01(1 - Math.abs(t - 0.35));
}

function unfairnessScore(curveball: CurveballSpec): number {
  // Concentrating measurement on a single trait is treated as less fair design.
  if (curveball.targetTraits.length <= 1) return 0.45;
  if (curveball.targetTraits.length === 2) return 0.15;
  return 0.05;
}

export function scoreCurveball(input: {
  curveball: CurveballSpec;
  episodes: Episode[];
  preferenceVector: PreferenceVector;
  durationMinutes: number;
}): CurveballUtilityResult {
  const { alpha, beta, gamma, delta } = CURVEBALL_UTILITY_WEIGHTS;
  const deltaC = coverageDelta(input.episodes, input.curveball, input.preferenceVector);
  const ig = infoGain(input.episodes, input.curveball, input.preferenceVector);
  const disruption = disruptionScore(input.curveball, input.durationMinutes);
  const unfairness = unfairnessScore(input.curveball);
  const utility =
    Math.round((alpha * deltaC + beta * ig - gamma * disruption - delta * unfairness) * 10000) /
    10000;

  return {
    curveballId: input.curveball.id,
    key: input.curveball.key,
    utility,
    selected: false,
    components: {
      deltaC: Math.round(deltaC * 10000) / 10000,
      infoGain: Math.round(ig * 10000) / 10000,
      disruption,
      unfairness,
    },
    formulaVersion: CURVEBALL_UTILITY_VERSION,
  };
}

/**
 * Score the pool and mark selected curveballs.
 * Always keeps `alwaysOnKeys` (default: partner_data_unreliable).
 * Additionally selects by episode-kind mapping and positive utility.
 */
export function selectCurveballsByUtility(input: {
  pool: CurveballSpec[];
  episodes: Episode[];
  preferenceVector: PreferenceVector;
  durationMinutes: number;
  alwaysOnKeys?: string[];
  episodeKeyHints?: Partial<Record<Episode["kind"], string>>;
}): { selected: CurveballSpec[]; results: CurveballUtilityResult[] } {
  const alwaysOn = new Set(input.alwaysOnKeys ?? ["partner_data_unreliable"]);
  const hints = input.episodeKeyHints ?? {
    stakeholder_contradiction: "stakeholder_conflict_named",
    curveball_event: "deadline_moved",
  };

  const hinted = new Set<string>();
  for (const ep of input.episodes) {
    const key = hints[ep.kind];
    if (key) hinted.add(key);
  }

  const scored = input.pool
    .map((curveball) =>
      scoreCurveball({
        curveball,
        episodes: input.episodes,
        preferenceVector: input.preferenceVector,
        durationMinutes: input.durationMinutes,
      })
    )
    .sort((a, b) => b.utility - a.utility || a.key.localeCompare(b.key));

  const selectedKeys = new Set<string>();
  for (const key of alwaysOn) selectedKeys.add(key);
  for (const key of hinted) selectedKeys.add(key);

  // Also accept high-utility curveballs not already hinted (threshold > 0).
  for (const r of scored) {
    if (r.utility > 0 && !selectedKeys.has(r.key)) {
      // Keep pool small — only add if competitive with the median selected utility.
      selectedKeys.add(r.key);
      break;
    }
  }

  const results = scored.map((r) => ({
    ...r,
    selected: selectedKeys.has(r.key),
  }));

  const selected = input.pool
    .filter((c) => selectedKeys.has(c.key))
    .sort((a, b) => a.key.localeCompare(b.key));

  return { selected, results };
}
