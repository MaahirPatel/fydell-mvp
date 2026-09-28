/**
 * Real sample run gate (DEMO-08, P1).
 *
 * An optional short sandbox/example evaluation may be offered AFTER cost
 * limits, abuse protections and runtime reliability are verified. This
 * module is the eligibility gate: pure, testable, and honest about what is
 * still unverified.
 *
 * Status: the gate is implemented and unit-tested, but the underlying
 * verifications (cost limits, abuse protections, runtime reliability) have
 * not been performed, and no sandbox run path exists yet. The sample run
 * itself is NEEDS-LIVE.
 */

export interface SampleRunPreconditions {
  /** Cost limits for sandbox runs have been defined and verified. */
  costLimitsVerified: boolean;
  /** Abuse protections (throttles, identity checks) have been verified. */
  abuseProtectionsVerified: boolean;
  /** Runtime reliability has been verified (repeat runs succeed). */
  runtimeReliabilityVerified: boolean;
}

export type SampleRunEligibility =
  | { ok: true }
  | { ok: false; missing: string[] };

const PRECONDITION_LABELS: Record<keyof SampleRunPreconditions, string> = {
  costLimitsVerified: "cost limits",
  abuseProtectionsVerified: "abuse protections",
  runtimeReliabilityVerified: "runtime reliability",
};

/** All three preconditions must hold before a sample run may be offered. */
export function checkSampleRunEligibility(p: SampleRunPreconditions): SampleRunEligibility {
  const missing = (Object.keys(PRECONDITION_LABELS) as (keyof SampleRunPreconditions)[])
    .filter((k) => !p[k])
    .map((k) => PRECONDITION_LABELS[k]);
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}

/** Current platform truth: none of the preconditions are verified yet. */
export function currentPreconditions(): SampleRunPreconditions {
  return {
    costLimitsVerified: false,
    abuseProtectionsVerified: false,
    runtimeReliabilityVerified: false,
  };
}
