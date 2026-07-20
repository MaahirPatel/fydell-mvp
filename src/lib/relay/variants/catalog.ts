/**
 * In-code source of truth for Northbeam Logistics Relay variants.
 * Ops UI can override status via `store.ts`.
 */
import type { VariantSpec } from "./types";

const APPROVED_AT = "2026-07-01T00:00:00.000Z";
const APPROVED_BY = "ops@fydell.com";

export const KNOWN_GOOD_RELEASE_ID = "project-relay@known-good";

/** Mirrors `scenarios/project-relay/canonical.json` canonicalFacts. */
export const KNOWN_GOOD_CANONICAL_FACTS: string[] = [
  "The ops manager (Dana Whitfield) wants an operational dashboard she can check every morning, not a one-off analysis",
  "The VP of Operations (Priya Anand) wants a defensible root-cause report for the board — this should only surface if the candidate asks about stakeholders, priorities, or what to build",
  "Dana and Priya want different deliverables and have not reconciled that between themselves — managing that conflict is the candidate's job, not something the brief resolves",
  "The manual delay-tracking sheet (delays_manual_tracking.csv) uses inconsistent shipment ID formats (missing leading zeros, missing the SHP- prefix) that a naive exact-match join will silently drop",
  "The board meeting was moved up to Thursday, pulling the delivery deadline earlier than originally planned",
  "Carrier-reported on-time rates in carriers.csv are self-reported and do not reconcile with the actual delivery data in shipments.csv",
];

export const VARIANT_CATALOG: VariantSpec[] = [
  {
    id: "relay-variant-alpha",
    seed: "alpha-2026-07",
    parentScenarioId: "project-relay",
    status: "approved",
    title: "Northbeam — Alpha (naive-join emphasis)",
    difficulty: "baseline",
    defectFocus: "naive_join_unfixed",
    canonicalFacts: KNOWN_GOOD_CANONICAL_FACTS,
    curveballText:
      "Dana asks whether the late rate you just quoted includes every manually tracked delay row. Check whether your join dropped mismatched shipment IDs before you answer.",
    createdAt: APPROVED_AT,
    approvedAt: APPROVED_AT,
    approvedBy: APPROVED_BY,
  },
  {
    id: "relay-variant-bravo",
    seed: "bravo-2026-07",
    parentScenarioId: "project-relay",
    status: "approved",
    title: "Northbeam — Bravo (metrics understatement emphasis)",
    difficulty: "harder",
    defectFocus: "wrong_late_definition",
    canonicalFacts: KNOWN_GOOD_CANONICAL_FACTS,
    curveballText:
      "Priya needs a board-ready late-% by Thursday. If your number came from naive_late_rate_stats, say so — or reconcile first and ship the true rate with limitations named.",
    createdAt: APPROVED_AT,
    approvedAt: APPROVED_AT,
    approvedBy: APPROVED_BY,
  },
  {
    id: "relay-variant-charlie",
    seed: "charlie-2026-07",
    parentScenarioId: "project-relay",
    status: "approved",
    title: "Northbeam — Charlie (carrier-claim trap emphasis)",
    difficulty: "harder",
    defectFocus: "carrier_claim_trusted",
    canonicalFacts: KNOWN_GOOD_CANONICAL_FACTS,
    curveballText:
      "A carrier rep forwards their on-time scorecard and asks you to use it in the board pack. Carrier OT in carriers.csv is self-reported — reconcile against shipments before you trust it.",
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
