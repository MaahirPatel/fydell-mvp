import type { Exemplar } from "../../exemplars/types";
import { buildWebhookDedupePackage } from "./package";

export const EXEMPLAR: Exemplar = {
  key: "webhook-dedupe",
  version: "1",
  track: "backend_api",
  taskFamily: "backend.reliability",
  level: "mid",
  difficulty: "moderate",
  businessContext: "Payments",
  stack: { language: "python", label: "Python, SQLite" },
  summary: "A retried webhook credits a customer twice. Reproduce it, make event handling exactly once across workers and restarts, and add regression coverage.",
  browserPreview: false,
  pattern: {
    problem: "An at-least-once delivery source retries work after a timeout, and the receiver applies the same logical event more than once because it deduplicates on the wrong identity, in the wrong place, or outside the transaction that applies the effect.",
    assesses: ["Reproducing a production failure from logs and a replay", "Choosing the right idempotency key", "Making an effect and its dedupe record atomic", "Regression testing a concurrency defect"],
    invariants: [
      "A public reproduction fails on the starter and passes with a correct fix.",
      "Every acceptance criterion is checked by at least one protected test.",
      "Each incorrect solution (wrong key, marking before the effect, process-local memory, over-broad dedupe) is caught by a specific protected test.",
      "The brief states every behavior the protected tests check; nothing is hidden.",
      "Synthetic data only and standard library only.",
    ],
    variationAxes: [
      "Business domain and the event that is duplicated (orders, shipments, bookings, notifications)",
      "Delivery source (webhook provider, message queue, mobile client retry)",
      "Which identity is the trap (delivery id, attempt number, business fields)",
      "The side effect that must not repeat (ledger credit, email, inventory decrement, external API call)",
      "Language and storage within validated stacks",
    ],
  },
  build: buildWebhookDedupePackage,
};
