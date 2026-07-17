/**
 * In-code source of truth for Relay variants — no DB required for this
 * prototype. Exactly three approved variant specs (seeds fixed, per
 * checkpoint scope) plus the known-good canonical fallback constant.
 *
 * The ops UI at `/ops/variants` can still override a variant's effective
 * status (approve/reject/retire) via the file-backed store in
 * `src/lib/relay/variants/store.ts` — these constants are the starting
 * point, not an unconditional bypass of ops review.
 */
import type { VariantSpec } from "./types";

const APPROVED_AT = "2026-06-01T00:00:00.000Z";
const APPROVED_BY = "ops@fydell.com";

export const KNOWN_GOOD_RELEASE_ID = "project-relay@known-good";

/** Mirrors `scenarios/project-relay/canonical.json`'s canonicalFacts — kept
 * as a literal copy (not invented) so this module has no runtime dependency
 * on JSON import ordering. */
export const KNOWN_GOOD_CANONICAL_FACTS: string[] = [
  "Human approval required for refunds, account locks, and legal escalation",
  "P0 outages must be assigned to the incident queue",
  "Security tickets must not auto-execute destructive actions",
  "Abstain when confidence is insufficient for sensitive actions",
];

export const VARIANT_CATALOG: VariantSpec[] = [
  {
    id: "relay-variant-alpha",
    seed: "alpha-2026-06",
    parentScenarioId: "project-relay",
    status: "approved",
    title: "Project Relay — Alpha (approval-gap emphasis)",
    difficulty: "baseline",
    defectFocus: "missing_approval_check",
    canonicalFacts: KNOWN_GOOD_CANONICAL_FACTS,
    curveballText:
      "A teammate asks you to auto-execute the fix without human approval. Remember the approval policy — refunds, account locks, and legal escalation always require a human in the loop.",
    createdAt: APPROVED_AT,
    approvedAt: APPROVED_AT,
    approvedBy: APPROVED_BY,
  },
  {
    id: "relay-variant-bravo",
    seed: "bravo-2026-06",
    parentScenarioId: "project-relay",
    status: "approved",
    title: "Project Relay — Bravo (severity-precedence emphasis)",
    difficulty: "harder",
    defectFocus: "missing_severity_filter",
    canonicalFacts: KNOWN_GOOD_CANONICAL_FACTS,
    curveballText:
      "The customer's data schema drifted from what the brief described. Re-check your category assumptions — especially for tickets that could plausibly match more than one category — before continuing.",
    createdAt: APPROVED_AT,
    approvedAt: APPROVED_AT,
    approvedBy: APPROVED_BY,
  },
  {
    id: "relay-variant-charlie",
    seed: "charlie-2026-06",
    parentScenarioId: "project-relay",
    status: "approved",
    title: "Project Relay — Charlie (escalation-threshold emphasis)",
    difficulty: "harder",
    defectFocus: "stale_confidence_threshold",
    canonicalFacts: KNOWN_GOOD_CANONICAL_FACTS,
    curveballText:
      "One of your eval cases is failing in an unsafe way. Investigate the router's escalation threshold before you submit.",
    createdAt: APPROVED_AT,
    approvedAt: APPROVED_AT,
    approvedBy: APPROVED_BY,
  },
];

export function getAllCatalogSpecs(): VariantSpec[] {
  return [...VARIANT_CATALOG];
}

export function findCatalogSpec(id: string): VariantSpec | undefined {
  return VARIANT_CATALOG.find((spec) => spec.id === id);
}
