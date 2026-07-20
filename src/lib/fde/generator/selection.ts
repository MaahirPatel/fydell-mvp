/**
 * selection.ts — D-optimal-style information design for episode (module) selection.
 *
 * For each module m with trait loading vector q_m ∈ R^K (K = |TRAIT_IDS|):
 *   F_M = Σ_m (q_m q_m^T) / σ²
 * Design quality ≈ log det(F_M + ε I)
 *
 * Module utility (expert_prior_v1):
 *   U(m | M) = λ_c · ΔCoverage_w + λ_i · Δlogdet − λ_t · timeMismatch − λ_r · risk
 *
 * Greedy selection with lexicographic id tie-break (seed-stable).
 */
import { TRAIT_IDS, type TraitId } from "../evidence/traits";
import type {
  CompetencyLoading,
  PreferenceVector,
  SelectionDiagnostics,
  SelectionReason,
} from "./types";

export const SELECTION_VERSION = "selection-expert-prior-v1";

/** Observation noise σ for Fisher information — expert_prior_v1. */
export const EXPERT_PRIOR_SIGMA = 0.55;
/** Ridge ε so F + εI is always SPD. */
export const LOGDET_EPS = 1e-6;

/**
 * expert_prior_v1 utility coefficients.
 * λ_c / λ_i balance coverage vs information; λ_t / λ_r penalize time & brittle designs.
 * Preference mass enters coverage as (1 + PREFERENCE_SCALE · w_k).
 */
export const EXPERT_PRIOR_V1 = {
  lambda_c: 1.2,
  lambda_i: 0.25,
  lambda_t: 0.08,
  lambda_r: 0.04,
  preferenceScale: 5,
  sigma: EXPERT_PRIOR_SIGMA,
  eps: LOGDET_EPS,
} as const;

export type SelectableModule = {
  id: string;
  loadings: CompetencyLoading[];
  estimatedMinutes: number;
  mandatory?: boolean;
};

export type ModuleUtilityBreakdown = {
  score: number;
  coverageGain: number;
  deltaLogdet: number;
  timeMismatch: number;
  risk: number;
};

export type DOptimalSelectionResult = {
  selected: SelectableModule[];
  diagnostics: SelectionDiagnostics;
};

function loadingForTrait(loadings: CompetencyLoading[], traitId: TraitId): number {
  return loadings.find((l) => l.traitId === traitId)?.loading ?? 0;
}

function clampUnit(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
}

/**
 * Coverage_k = 1 - Π_m(1 - B_km) — same product form as
 * measurement-planner.coverageProduct (kept local to avoid an import cycle).
 */
function coverageFromLoadings(loadingsMatrix: CompetencyLoading[][]): Record<TraitId, number> {
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

/** q_m — length-10 loading vector in TRAIT_IDS order. */
export function moduleLoadingVector(loadings: CompetencyLoading[]): number[] {
  return TRAIT_IDS.map((id) => loadingForTrait(loadings, id));
}

/** Outer product q q^T. */
function outerProduct(q: number[]): number[][] {
  const n = q.length;
  const out: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      out[i][j] = q[i] * q[j];
    }
  }
  return out;
}

function zeros(n: number): number[][] {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

function addScaled(target: number[][], source: number[][], scale: number): void {
  const n = target.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      target[i][j] += scale * source[i][j];
    }
  }
}

/** F_M = Σ_m q_m q_m^T / σ² */
export function informationMatrix(
  modules: Pick<SelectableModule, "loadings">[],
  sigma: number = EXPERT_PRIOR_V1.sigma
): number[][] {
  const n = TRAIT_IDS.length;
  const F = zeros(n);
  const invVar = 1 / Math.max(sigma * sigma, 1e-12);
  for (const m of modules) {
    const q = moduleLoadingVector(m.loadings);
    addScaled(F, outerProduct(q), invVar);
  }
  return F;
}

/**
 * log det(A) via Cholesky: A = L L^T ⇒ log det(A) = 2 Σ log(L_ii).
 * Falls back to eigenvalue-product style diagonal dominance if Cholesky fails.
 */
export function logdet(matrix: number[][], eps: number = EXPERT_PRIOR_V1.eps): number {
  const n = matrix.length;
  const A: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => matrix[i][j] + (i === j ? eps : 0))
  );

  // In-place Cholesky (lower triangular).
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i][j];
      for (let k = 0; k < j; k++) sum -= A[i][k] * A[j][k];
      if (i === j) {
        if (sum <= 1e-18) {
          // Ill-conditioned — use product of clamped diagonal as fallback.
          let prod = 0;
          for (let d = 0; d < n; d++) {
            prod += Math.log(Math.max(A[d][d] + eps, eps));
          }
          return prod;
        }
        A[i][j] = Math.sqrt(sum);
      } else {
        A[i][j] = sum / A[j][j];
      }
    }
    for (let j = i + 1; j < n; j++) A[i][j] = 0;
  }

  let logDet = 0;
  for (let i = 0; i < n; i++) {
    logDet += 2 * Math.log(Math.max(A[i][i], eps));
  }
  return logDet;
}

export function designQualityLogdet(
  modules: Pick<SelectableModule, "loadings">[],
  sigma: number = EXPERT_PRIOR_V1.sigma,
  eps: number = EXPERT_PRIOR_V1.eps
): number {
  return logdet(informationMatrix(modules, sigma), eps);
}

function weightedCoverageGain(
  selected: SelectableModule[],
  candidate: SelectableModule,
  preferenceVector: PreferenceVector,
  criticalBoost: ReadonlySet<TraitId>
): number {
  const current = coverageFromLoadings(selected.map((m) => m.loadings));
  const next = coverageFromLoadings([...selected.map((m) => m.loadings), candidate.loadings]);
  let gain = 0;
  const scale = EXPERT_PRIOR_V1.preferenceScale;
  for (const traitId of TRAIT_IDS) {
    const delta = (next[traitId] ?? 0) - (current[traitId] ?? 0);
    const pref = preferenceVector[traitId] ?? 0;
    const weight = criticalBoost.has(traitId) ? 2 + scale * pref : 1 + scale * pref;
    gain += delta * weight;
  }
  return gain;
}

function riskTerm(candidate: SelectableModule): number {
  // Modules that load on only one trait are slightly riskier (brittle design).
  const q = moduleLoadingVector(candidate.loadings);
  const active = q.filter((v) => v > 0).length;
  if (active === 0) return 1;
  if (active === 1) return 0.2;
  return 0;
}

/**
 * U(m | M) under expert_prior_v1 coefficients.
 * Returns breakdown with total score.
 */
export function moduleUtility(
  selected: SelectableModule[],
  candidate: SelectableModule,
  preferenceVector: PreferenceVector,
  remainingMinutes: number,
  options?: { criticalTraits?: TraitId[] }
): ModuleUtilityBreakdown {
  const criticalBoost = new Set<TraitId>(
    options?.criticalTraits?.length
      ? options.criticalTraits
      : (["data_integrity_vigilance", "elicitation"] as TraitId[])
  );

  const coverageGain = weightedCoverageGain(selected, candidate, preferenceVector, criticalBoost);
  const before = designQualityLogdet(selected);
  const after = designQualityLogdet([...selected, candidate]);
  const deltaLogdet = after - before;

  const timeMismatch =
    candidate.estimatedMinutes > remainingMinutes
      ? (candidate.estimatedMinutes - remainingMinutes) / Math.max(remainingMinutes, 1)
      : candidate.estimatedMinutes / Math.max(remainingMinutes, 1);

  const risk = riskTerm(candidate);

  const { lambda_c, lambda_i, lambda_t, lambda_r } = EXPERT_PRIOR_V1;
  const score =
    lambda_c * coverageGain + lambda_i * deltaLogdet - lambda_t * timeMismatch - lambda_r * risk;

  return {
    score: Math.round(score * 10000) / 10000,
    coverageGain: Math.round(coverageGain * 10000) / 10000,
    deltaLogdet: Math.round(deltaLogdet * 10000) / 10000,
    timeMismatch: Math.round(timeMismatch * 10000) / 10000,
    risk: Math.round(risk * 10000) / 10000,
  };
}

/**
 * Greedy D-optimal selection. Mandatory modules are always kept.
 * Tie-break: higher score wins; equal scores → lexicographic template id (stable).
 */
export function selectModulesDOptimal(input: {
  catalog: SelectableModule[];
  durationMinutes: number;
  preferenceVector: PreferenceVector;
  criticalTraits?: TraitId[];
}): DOptimalSelectionResult {
  const mandatory = input.catalog.filter((m) => m.mandatory);
  const optional = input.catalog.filter((m) => !m.mandatory);

  const selected: SelectableModule[] = [...mandatory];
  let remaining =
    input.durationMinutes - mandatory.reduce((s, m) => s + m.estimatedMinutes, 0);

  const selectedReasons: SelectionReason[] = mandatory.map((m) => ({
    id: m.id,
    decision: "selected" as const,
    score: Number.POSITIVE_INFINITY,
    reason: "mandatory module — always included",
  }));
  const rejectedReasons: SelectionReason[] = [];
  const remainingOptional = [...optional].sort((a, b) => a.id.localeCompare(b.id));

  while (remaining > 0 && remainingOptional.length > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    let bestBreakdown: ModuleUtilityBreakdown | undefined;
    let bestId = "";

    for (let i = 0; i < remainingOptional.length; i++) {
      const candidate = remainingOptional[i];
      if (candidate.estimatedMinutes > remaining) continue;
      const breakdown = moduleUtility(
        selected,
        candidate,
        input.preferenceVector,
        remaining,
        { criticalTraits: input.criticalTraits }
      );
      const betterScore = breakdown.score > bestScore;
      const tieBreak =
        breakdown.score === bestScore && (bestId === "" || candidate.id.localeCompare(bestId) < 0);
      if (betterScore || tieBreak) {
        bestScore = breakdown.score;
        bestIdx = i;
        bestBreakdown = breakdown;
        bestId = candidate.id;
      }
    }

    if (bestIdx === -1 || bestScore <= 0 || !bestBreakdown) break;

    const chosen = remainingOptional.splice(bestIdx, 1)[0];
    selected.push(chosen);
    remaining -= chosen.estimatedMinutes;
    selectedReasons.push({
      id: chosen.id,
      decision: "selected",
      score: bestBreakdown.score,
      reason: `greedy D-optimal pick (coverage=${bestBreakdown.coverageGain}, Δlogdet=${bestBreakdown.deltaLogdet})`,
      breakdown: bestBreakdown,
    });
  }

  for (const left of remainingOptional) {
    const breakdown = moduleUtility(
      selected,
      left,
      input.preferenceVector,
      Math.max(remaining, 0),
      { criticalTraits: input.criticalTraits }
    );
    const overBudget = left.estimatedMinutes > remaining;
    rejectedReasons.push({
      id: left.id,
      decision: "rejected",
      score: breakdown.score,
      reason: overBudget
        ? `rejected — exceeds remaining budget (${left.estimatedMinutes} > ${remaining})`
        : `rejected — utility ${breakdown.score} not selected by greedy pass`,
      breakdown,
    });
  }

  rejectedReasons.sort((a, b) => a.id.localeCompare(b.id));

  const diagnostics: SelectionDiagnostics = {
    formulaVersion: SELECTION_VERSION,
    designQualityLogdet: Math.round(designQualityLogdet(selected) * 10000) / 10000,
    selected: selectedReasons,
    rejected: rejectedReasons,
  };

  return { selected, diagnostics };
}
