import type { Exemplar } from "../../exemplars/types";
import { buildInventoryPaginationPackage } from "./package";

export const EXEMPLAR: Exemplar = {
  key: "inventory-pagination-contract",
  version: "1",
  track: "backend_api",
  taskFamily: "backend.contract",
  level: "mid",
  difficulty: "moderate",
  businessContext: "Retail marketplace",
  stack: { language: "javascript", label: "Node.js, plain handler functions" },
  summary: "A partner's inventory sync gets duplicate and missing items. Add exact cursor pagination and parameter validation without breaking clients that still page with offset and limit.",
  browserPreview: true,
  pattern: {
    problem:
      "A list endpoint paginates by position over an order with ties, so rows that share a sort key come back in an order that changes as data is written, and clients paging while data changes skip and repeat items. The fix adds a deterministic tiebreaker for every request and an opaque, scoped keyset cursor for clients that need exact walks, while every behavior existing clients rely on (fields, defaults, clamping) stays the same and bad input is rejected explicitly.",
    assesses: [
      "Diagnosing pagination drift from a client's request log",
      "Changing a published API contract additively without breaking existing clients",
      "Keyset pagination on a non-unique sort key with a unique tiebreaker",
      "Designing an opaque, scoped cursor and validating untrusted paging input",
      "Documenting an API change so another team can adopt it",
    ],
    invariants: [
      "A public reproduction of the incident (offset pages over tied rows skip and repeat after updates) fails on the starter and passes with a correct fix.",
      "At least one legacy behavior that is easy to break while 'cleaning up' (here: clamping an oversize limit) is stated in the brief and protected by a test.",
      "Every acceptance criterion is checked by protected tests that change data between page requests, and each incorrect solution is caught by a test for the criterion it actually breaks: offset in disguise, cursor without tiebreaker, rejecting a tolerated legacy input, tiebreaker on one path only, unscoped cursor, readable cursor.",
      "Tests only use the handler's public request and response shape, so any valid cursor encoding passes.",
      "The brief states every rule the tests check: order and tiebreaker, defaults and clamping, error codes, cursor scope and opacity, and that offset pages are not required to be exact under inserts and deletes.",
      "Standard library only and synthetic data only.",
    ],
    variationAxes: [
      "Business domain and resource listed (orders, transactions, support tickets, audit events, catalog products)",
      "The non-unique sort key and why rows share it (bulk import time, batch settlement date, priority bucket)",
      "Which client and which legacy behavior must be preserved (oversize page size, default page size, field names, zero-based offset)",
      "What the incident surfaces first (duplicates, missing rows, a stock or balance mismatch downstream)",
      "Cursor scope (seller, account, tenant, filter set) and the error code conventions",
      "Handler style within validated stacks (plain function, node:http handler) and language",
    ],
  },
  build: buildInventoryPaginationPackage,
};
