/**
 * Multi-dimensional capability vector + provisional role fit.
 * Shown to employers as competency evidence — not a fake predictive %.
 */

export type CapabilityId =
  | "problem_framing"
  | "technical_execution"
  | "data_integrity"
  | "customer_communication"
  | "prioritization"
  | "verification"
  | "adaptation"
  | "ai_judgment"
  | "risk_management"
  | "handoff_quality";

export type CapabilityVector = Record<CapabilityId, number>;

export const CAPABILITY_IDS: CapabilityId[] = [
  "problem_framing",
  "technical_execution",
  "data_integrity",
  "customer_communication",
  "prioritization",
  "verification",
  "adaptation",
  "ai_judgment",
  "risk_management",
  "handoff_quality",
];

export type CriticalFailure =
  | "fabricated_verification"
  | "destructive_unsafe_action"
  | "ignored_blocking_constraint"
  | "shipped_known_incorrect";

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Default FDE / deployment-recovery role weights (sum ≈ 1). */
export const DEFAULT_ROLE_WEIGHTS: CapabilityVector = {
  problem_framing: 0.1,
  technical_execution: 0.12,
  data_integrity: 0.14,
  customer_communication: 0.1,
  prioritization: 0.08,
  verification: 0.14,
  adaptation: 0.08,
  ai_judgment: 0.08,
  risk_management: 0.08,
  handoff_quality: 0.08,
};

const CRITICAL_PENALTY: Record<CriticalFailure, number> = {
  fabricated_verification: 2.5,
  destructive_unsafe_action: 3,
  ignored_blocking_constraint: 2,
  shipped_known_incorrect: 2.2,
};

/**
 * Fit_r = 100 × sigmoid(β0 + β^T Θ − Σ ρ_k CriticalFailure_k)
 * Provisional only — never claim hire prediction without outcome data.
 */
export function roleFit(
  theta: CapabilityVector,
  opts?: {
    weights?: CapabilityVector;
    beta0?: number;
    criticalFailures?: CriticalFailure[];
  }
): { fit: number; provisional: true; criticalFailures: CriticalFailure[] } {
  const w = opts?.weights || DEFAULT_ROLE_WEIGHTS;
  const beta0 = opts?.beta0 ?? -0.5;
  let linear = beta0;
  for (const id of CAPABILITY_IDS) {
    linear += w[id] * (theta[id] * 2 - 1); // map [0,1] → [-1,1] contribution
  }
  const failures = opts?.criticalFailures || [];
  for (const f of failures) {
    linear -= CRITICAL_PENALTY[f];
  }
  return {
    fit: 100 * sigmoid(linear),
    provisional: true,
    criticalFailures: failures,
  };
}

export function emptyCapabilityVector(fill = 0.5): CapabilityVector {
  const out = {} as CapabilityVector;
  for (const id of CAPABILITY_IDS) out[id] = fill;
  return out;
}
