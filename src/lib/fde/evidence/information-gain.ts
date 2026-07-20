/**
 * Information-gain and diagnostic-efficiency helpers for evidence math.
 *
 *   H(p)  = −Σ p_i log2(p_i)          (bits; zero-mass terms skipped)
 *   IG    = H(before) − H(after)      (clamped ≥ 0)
 *   DE    = IG / (a·T + b·C + g·R + ε)
 *
 * Pure functions; always finite. Expert-prior cost weights below.
 */
import { clampFinite, EPS } from "./reliability";

/** Expert-prior cost weights for diagnostic efficiency (time / change / redundancy). */
export const DE_WEIGHT_TIME = 1.0;
export const DE_WEIGHT_CHANGE = 0.8;
export const DE_WEIGHT_REDUNDANCY = 0.6;

/**
 * Curated default hypothesis set for the data-integrity + stakeholder-conflict
 * family — same story as generator/ambiguity defaults, exported as plain
 * probabilities for evidence-side IG / DE calculations.
 */
export const DEFAULT_HYPOTHESIS_SET: ReadonlyArray<{ id: string; label: string; prior: number }> = [
  { id: "id_format_quirk", label: "Manual source uses a formatting quirk", prior: 0.34 },
  { id: "join_logic_bug", label: "Incorrect join or filter introduced", prior: 0.22 },
  { id: "stakeholder_misalignment", label: "Deliverable conflict drove the apparent failure", prior: 0.24 },
  { id: "upstream_export_gap", label: "Primary export is incomplete or stale", prior: 0.2 },
];

/** Prior vector only (sums to 1). */
export const DEFAULT_HYPOTHESIS_PROBS: readonly number[] = DEFAULT_HYPOTHESIS_SET.map((h) => h.prior);

/**
 * Shannon entropy of a discrete distribution in bits.
 * Non-finite / negative masses are treated as 0; empty → 0. Never NaN.
 */
export function hypothesisEntropy(probs: number[]): number {
  const clean = probs.filter((p) => Number.isFinite(p) && p > 0);
  if (clean.length === 0) return 0;

  const sum = clean.reduce((acc, p) => acc + p, 0);
  if (sum <= 0) return 0;

  let entropy = 0;
  for (const p of clean) {
    const q = p / sum;
    entropy -= q * Math.log2(q);
  }
  return clampFinite(entropy, 0, Number.MAX_SAFE_INTEGER);
}

/**
 * Information gain in bits: H(before) − H(after), floored at 0.
 * Ill-defined inputs → 0 (never NaN).
 */
export function informationGain(before: number[], after: number[]): number {
  const ig = hypothesisEntropy(before) - hypothesisEntropy(after);
  return clampFinite(ig, 0, Number.MAX_SAFE_INTEGER);
}

/**
 * Diagnostic efficiency: information gained per unit of normalized cost.
 *
 *   DE = totalIG / (a·timeNorm + b·changeNorm + g·redundancyNorm + ε)
 *
 * Each norm is expected in [0, 1] (caller-normalized). Result is finite ≥ 0.
 */
export function diagnosticEfficiency(input: {
  totalIG: number;
  timeNorm: number;
  changeNorm: number;
  redundancyNorm: number;
  a?: number;
  b?: number;
  g?: number;
}): number {
  const ig = Number.isFinite(input.totalIG) && input.totalIG > 0 ? input.totalIG : 0;
  const T = clampFinite(input.timeNorm, 0, 1);
  const C = clampFinite(input.changeNorm, 0, 1);
  const R = clampFinite(input.redundancyNorm, 0, 1);
  const a = Number.isFinite(input.a as number) && (input.a as number) >= 0 ? (input.a as number) : DE_WEIGHT_TIME;
  const b = Number.isFinite(input.b as number) && (input.b as number) >= 0 ? (input.b as number) : DE_WEIGHT_CHANGE;
  const g = Number.isFinite(input.g as number) && (input.g as number) >= 0 ? (input.g as number) : DE_WEIGHT_REDUNDANCY;

  const denom = a * T + b * C + g * R + EPS;
  return clampFinite(ig / denom, 0, Number.MAX_SAFE_INTEGER);
}
