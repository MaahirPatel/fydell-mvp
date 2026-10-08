import type { Exemplar } from "../../exemplars/types";
import { buildExtractionPackage } from "./package";

export const EXEMPLAR: Exemplar = {
  key: "extraction-structured-output",
  version: "1.0.0",
  track: "applied_ai",
  taskFamily: "ai.structured_output",
  level: "mid",
  difficulty: "moderate",
  businessContext:
    "A freight company's nightly document intake that asks an extraction provider for shipment fields as JSON and stores the records billing and dispatch rely on, with a manual review queue for anything it cannot handle.",
  stack: { language: "javascript", label: "Node.js 22, standard library only (recorded provider responses, injected sleep)" },
  summary: "Make a model-backed extraction pipeline safe: validate output against a schema, repair only safe cases, retry provider failures within a bounded policy that honors retry-after, and route unrecoverable documents to manual review.",
  browserPreview: true,
  pattern: {
    problem:
      "A pipeline trusts structured model output and a flaky provider. It stores whatever parses, crashes on malformed or code-fenced output, and has no retry policy, so one server error stops the batch. The fix needs a strict boundary between model output and stored data (parse, validate, repair only what is unambiguous) and a bounded retry policy that distinguishes rate limiting, server errors and timeouts from permanent rejections.",
    assesses: [
      "Treating model output as untrusted input: parsing defensively and validating every field against a documented schema before storing.",
      "Judging which repairs are safe (a wrapping code fence, a plain numeric string) and which would guess at data (units, separators, date formats, text booleans), and preferring manual review over guessing.",
      "Designing bounded retries: an attempt cap, honoring retry-after, backoff without a wait after the last attempt, and not retrying permanent 4xx errors.",
      "Testable time handling through an injected sleep rather than real timers.",
      "Keeping a batch running past individual failures and recording an actionable reason for each failed document.",
      "Writing regression tests with fake transports, and explaining tradeoffs in a handoff.",
    ],
    invariants: [
      "The public reproduction (the recorded batch replay) fails on the starter, and the replay script shows the crash and the invalid records.",
      "Every acceptance criterion is checked by at least one protected test that uses held-out documents and responses defined inline with its own fake transport, store, queue and sleep, never the candidate's fixtures or recorded transport.",
      "Each incorrect solution is caught by a specific protected test, and at least two pass every public test, so the scenario measures the policy rather than the recorded batch.",
      "Every behavior a protected test checks is stated in the brief: the schema rules, the exact safe repairs, the review reasons and item shape, the attempt cap, which statuses are retried, the retry-after and backoff waits, and that invalid output is not retried.",
      "Every incorrect solution terminates on every protected test (fakes repeat their last step rather than hang), so a wrong retry policy fails an assertion instead of timing out.",
      "Only recorded and synthetic data: no model calls, no network, no real waiting.",
    ],
    variationAxes: [
      "Business domain and document type: freight receipts, insurance claims, invoices, medical intake forms, purchase orders, resumes.",
      "Schema fields, types and rules: identifiers with patterns, enums, dates and date ordering, numeric ranges, booleans, optional versus required fields.",
      "Which safe repairs are allowed (code fence, plain numeric strings, surrounding whitespace) and which tempting unsafe repairs the recorded output invites (units, separators, locale dates, text booleans).",
      "Which output failures appear: truncated JSON, prose around JSON, arrays, missing fields, wrong types, out-of-range values, extra fields.",
      "Which provider failures appear and the retry policy: 429 with or without retry-after, 5xx, timeouts, permanent 4xx, attempt cap and backoff schedule.",
      "Review reason codes, coworker roles and names, and the downstream consumer of stored records.",
    ],
  },
  build: buildExtractionPackage,
};
