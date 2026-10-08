import type { Exemplar } from "../../exemplars/types";
import { buildJobLeaseRecoveryPackage } from "./package";

export const EXEMPLAR: Exemplar = {
  key: "job-lease-recovery",
  version: "1",
  track: "backend_api",
  taskFamily: "backend.jobs",
  level: "mid",
  difficulty: "moderate",
  businessContext: "Logistics",
  stack: { language: "javascript", label: "Node.js, in-memory job store" },
  summary: "Label jobs get stuck after deploys and some shipments are charged for two labels. Make leases, retries and dead-lettering recover correctly, and add regression coverage.",
  browserPreview: true,
  pattern: {
    problem:
      "A job queue hands out time-limited leases. Work from crashed or stalled workers must be recovered once the lease expires, but recovery can repeat a non-idempotent external side effect, let a stale worker overwrite the current owner's result, or retry without bound. A correct fix combines lease expiry checked at claim time, an idempotency key that is stable across attempts and workers, a fencing token unique to each claim, and bounded attempts that end in a dead-letter state on every path.",
    assesses: [
      "Reasoning about leases, timeouts and ownership when a worker can be slow rather than dead",
      "Choosing an idempotency key for an external side effect whose outcome is unknown after a timeout",
      "Fencing stale workers with a per-claim token rather than a reusable identity",
      "Bounding retries so exhausted work is surfaced instead of lost or stuck",
      "Writing deterministic regression tests with an injected clock and provider instead of sleeps",
    ],
    invariants: [
      "A public reproduction (a stopped worker's job is never recovered) fails on the starter and passes with a correct fix.",
      "Every acceptance criterion is checked by at least one protected test, and each protected test maps to a stated criterion.",
      "Each incorrect solution is caught by a specific protected test: an attempt-scoped key (takeover buys twice), a key on the wrong entity (separate jobs merged), reclaiming only while attempts remain (stuck on the last attempt), fencing on a reusable worker identity (restart with the same id), and no fencing (stale late failure).",
      "The brief discloses every fact the tests rely on: lease semantics, that worker ids are reused after restarts, that a timed-out side effect may have happened, the provider's idempotency contract, and when expiry is detected.",
      "Time and the external provider are injected; no test sleeps, uses real timers or depends on scheduling order beyond awaited promises.",
      "Standard library only, synthetic data only, and no separate background process required.",
    ],
    variationAxes: [
      "Business domain and the job (label purchase, payout transfer, invoice generation, SMS send, report export)",
      "The external side effect that must not repeat and how the provider supports idempotency (key header, client reference, lookup by reference)",
      "Which failure the incident surfaces first (stuck after deploy, duplicate charge after timeout, retry storm on a poison job)",
      "Store shape and claim API (table rows, visibility timeout on a message, lease records), keeping claim-time expiry",
      "Identity trap for fencing (host name, container name, worker slot number) and the per-claim token the fix uses",
      "Language and storage within validated stacks",
    ],
  },
  build: buildJobLeaseRecoveryPackage,
};
