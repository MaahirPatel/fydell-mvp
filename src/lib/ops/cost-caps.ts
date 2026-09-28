import "server-only";

/**
 * Per-attempt cost caps (OPS-06).
 *
 * Every attempt tracks metered dimensions: model calls, compute minutes,
 * storage MB and emails sent. Caps keep sold pricing sustainable: when an
 * attempt would exceed a cap, the run is held for operator review instead of
 * burning unbounded spend or failing the candidate silently.
 */

export interface AttemptCost {
  modelCalls: number;
  computeMinutes: number;
  storageMb: number;
  emailsSent: number;
  humanReviewMinutes?: number;
}

export interface CostCaps {
  maxModelCalls: number;
  maxComputeMinutes: number;
  maxStorageMb: number;
  maxEmails: number;
}

/** Default caps for the first paid contract; tune per plan in server config. */
export const DEFAULT_ATTEMPT_COST_CAPS: CostCaps = {
  maxModelCalls: 40,
  maxComputeMinutes: 30,
  maxStorageMb: 500,
  maxEmails: 5,
};

export interface CostCheckResult {
  allowed: boolean;
  /** dimensions that hit their cap, e.g. ["modelCalls"] */
  exceeded: (keyof AttemptCost)[];
  usage: AttemptCost;
  caps: CostCaps;
}

const DIMENSIONS: { key: keyof AttemptCost; cap: keyof CostCaps }[] = [
  { key: "modelCalls", cap: "maxModelCalls" },
  { key: "computeMinutes", cap: "maxComputeMinutes" },
  { key: "storageMb", cap: "maxStorageMb" },
  { key: "emailsSent", cap: "maxEmails" },
];

/** True when adding `delta` to `current` stays within caps. */
export function checkCostCap(
  current: AttemptCost,
  delta: Partial<AttemptCost>,
  caps: CostCaps = DEFAULT_ATTEMPT_COST_CAPS
): CostCheckResult {
  const usage: AttemptCost = {
    modelCalls: current.modelCalls + (delta.modelCalls ?? 0),
    computeMinutes: current.computeMinutes + (delta.computeMinutes ?? 0),
    storageMb: current.storageMb + (delta.storageMb ?? 0),
    emailsSent: current.emailsSent + (delta.emailsSent ?? 0),
    humanReviewMinutes: (current.humanReviewMinutes ?? 0) + (delta.humanReviewMinutes ?? 0),
  };
  const exceeded = DIMENSIONS.filter(({ key, cap }) => usage[key] > caps[cap]).map(({ key }) => key);
  return { allowed: exceeded.length === 0, exceeded, usage, caps };
}

export const ZERO_COST: AttemptCost = {
  modelCalls: 0,
  computeMinutes: 0,
  storageMb: 0,
  emailsSent: 0,
  humanReviewMinutes: 0,
};
