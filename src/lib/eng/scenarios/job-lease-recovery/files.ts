/**
 * File contents for the "Recover label jobs after crashes and timeouts" work
 * sample. All data is synthetic. scripts/test-job-lease-recovery.ts runs these
 * files for real.
 */

/** Applies exact text edits to a file; throws when an edit no longer matches, so variants cannot drift silently. */
function variant(base: string, edits: Array<[string, string]>): string {
  let out = base;
  for (const [from, to] of edits) {
    if (!out.includes(from)) throw new Error(`job-lease-recovery variant edit not found: ${from.slice(0, 80)}`);
    out = out.split(from).join(to);
  }
  return out;
}

export const STARTER_README = `# label-jobs

Buys shipping labels for Brindlecourt Logistics. When a shipment is packed, the
fulfilment service enqueues a label job. Label workers claim jobs, buy a label
from our label provider (a carrier aggregator) and record the label and its
tracking number on the job. The warehouse prints whatever label is recorded.

## Layout

- \`src/job-store.js\`: \`JobStore\`, the shared label_jobs table.
- \`src/label-worker.js\`: \`LabelWorker\`, the body of one worker process's loop (\`runOnce\`).
- \`src/label-provider.js\`: the label provider client contract and its error type.
- \`src/config.js\`: production settings and the system clock.
- \`fixtures/incident-log.json\`: synthetic worker log and job rows from last week's incidents.
- \`test/\`: unit tests. \`test/helpers.js\` has a fake clock, a fake label provider
  and job builders.

## Job lifecycle

    queued -> leased -> succeeded
                     -> queued   (the attempt failed; retried after retryDelayMs)
                     -> dead     (we gave up; on-call is paged from the dead-letter view)

- \`claimNext\` gives a worker a lease on the oldest ready job. The lease lasts
  \`leaseMs\` from when it was granted. \`attempts\` counts claims.
- Label workers run on several hosts and share one label_jobs table. Each store
  method is one atomic statement.
- A worker's id is its host name, so a worker restarted by a deploy comes back
  with the same id.
- Deploys stop workers without warning, sometimes in the middle of a job.

## Label provider

\`purchaseLabel(request)\` charges our account for one label and resolves to
\`{ labelId, trackingNumber, costCents }\`.

- \`idempotencyKey\` (optional): a purchase with a key the provider has already
  seen in the last 24 hours returns the original label and is not charged again.
- Our client gives up after 20 seconds and throws. A purchase that timed out on
  our side may still have gone through at the provider.

## Running

Node.js 22 or newer, no packages. From the project root:

    node --test
`;

export const STARTER_CONFIG = `/** Production settings for label workers. Tests pass their own values. */
export const LABEL_JOB_DEFAULTS = Object.freeze({
  leaseMs: 30_000,
  maxAttempts: 5,
  retryDelayMs: 60_000,
});

/** The clock workers use in production: epoch milliseconds. */
export const systemClock = Object.freeze({
  now: () => Date.now(),
});
`;

export const STARTER_PROVIDER = `/**
 * Contract of the label provider client. Production wires an HTTP client with
 * this shape; tests inject a fake (see test/helpers.js).
 *
 * purchaseLabel(request) => Promise<{ labelId, trackingNumber, costCents }>
 *   request: { shipmentId, carrier, service, toPostcode, weightGrams, idempotencyKey? }
 *
 * Every label the provider creates is charged to our account. A purchase whose
 * idempotencyKey the provider has seen in the last 24 hours returns the
 * original label and is not charged again.
 *
 * The client gives up after 20 seconds and throws a LabelProviderError with
 * code "timeout". The provider may still have completed that purchase.
 */
export class LabelProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LabelProviderError";
    this.code = code;
  }
}

/** A one-line description of a failed purchase, stored as the job's lastError. */
export function describeError(error) {
  if (error instanceof LabelProviderError) return error.code + ": " + error.message;
  return error instanceof Error ? error.message : String(error);
}
`;

export const STARTER_STORE = `export const JobStatus = Object.freeze({
  QUEUED: "queued",
  LEASED: "leased",
  SUCCEEDED: "succeeded",
  DEAD: "dead",
});

/**
 * The label_jobs table. Every worker process shares it, and each method runs
 * as one atomic statement, so calls from different workers never interleave.
 * Methods return copies; rows change only through these methods.
 */
export class JobStore {
  #jobs = new Map();

  enqueue({ id, shipmentId, payload }, now) {
    if (this.#jobs.has(id)) throw new Error("label job " + id + " already exists");
    this.#jobs.set(id, {
      id,
      shipmentId,
      payload: { ...payload },
      status: JobStatus.QUEUED,
      attempts: 0,
      availableAt: now,
      leaseOwner: null,
      leaseExpiresAt: null,
      label: null,
      lastError: null,
      updatedAt: now,
    });
    return this.get(id);
  }

  /** Leases the oldest ready job to workerId for leaseMs. Returns the leased row, or null when nothing is ready. */
  claimNext(workerId, now, leaseMs, maxAttempts) {
    for (const job of this.#jobs.values()) {
      if (job.status !== JobStatus.QUEUED || job.availableAt > now) continue;
      if (job.attempts >= maxAttempts) continue;
      job.status = JobStatus.LEASED;
      job.leaseOwner = workerId;
      job.leaseExpiresAt = now + leaseMs;
      job.attempts += 1;
      job.updatedAt = now;
      return copy(job);
    }
    return null;
  }

  markSucceeded(jobId, label, now) {
    const job = this.#require(jobId);
    job.status = JobStatus.SUCCEEDED;
    job.label = { ...label };
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
    job.updatedAt = now;
  }

  markFailed(jobId, error, retryAt, now) {
    const job = this.#require(jobId);
    job.status = JobStatus.QUEUED;
    job.availableAt = retryAt;
    job.lastError = error;
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
    job.updatedAt = now;
  }

  get(id) {
    const job = this.#jobs.get(id);
    return job ? copy(job) : null;
  }

  list() {
    return [...this.#jobs.values()].map(copy);
  }

  #require(id) {
    const job = this.#jobs.get(id);
    if (!job) throw new Error("label job " + id + " does not exist");
    return job;
  }
}

function copy(job) {
  return structuredClone(job);
}
`;

export const STARTER_WORKER = `import { LABEL_JOB_DEFAULTS } from "./config.js";
import { describeError } from "./label-provider.js";

/**
 * One label worker process. Production calls runOnce() in a loop on every
 * worker host; tests call it directly.
 */
export class LabelWorker {
  constructor({
    id,
    store,
    provider,
    clock,
    leaseMs = LABEL_JOB_DEFAULTS.leaseMs,
    maxAttempts = LABEL_JOB_DEFAULTS.maxAttempts,
    retryDelayMs = LABEL_JOB_DEFAULTS.retryDelayMs,
  }) {
    this.id = id;
    this.store = store;
    this.provider = provider;
    this.clock = clock;
    this.leaseMs = leaseMs;
    this.maxAttempts = maxAttempts;
    this.retryDelayMs = retryDelayMs;
  }

  /** Claims at most one job and runs it. Resolves to { outcome: "idle" } when nothing is ready. */
  async runOnce() {
    const job = this.store.claimNext(this.id, this.clock.now(), this.leaseMs, this.maxAttempts);
    if (!job) return { outcome: "idle" };

    try {
      const label = await this.provider.purchaseLabel({
        shipmentId: job.shipmentId,
        ...job.payload,
        idempotencyKey: job.id + ":" + job.attempts,
      });
      this.store.markSucceeded(job.id, label, this.clock.now());
      return { outcome: "succeeded", jobId: job.id, trackingNumber: label.trackingNumber };
    } catch (error) {
      const now = this.clock.now();
      this.store.markFailed(job.id, describeError(error), now + this.retryDelayMs, now);
      return { outcome: "retry_scheduled", jobId: job.id, attempt: job.attempts };
    }
  }
}
`;

export const STARTER_FIXTURE = `{
  "description": "Synthetic excerpt of label worker logs, label_jobs rows and the provider billing export from incidents INC-3107 and INC-3112. Times are UTC.",
  "settings": { "leaseMs": 30000, "maxAttempts": 5, "retryDelayMs": 60000, "providerClientTimeoutMs": 20000 },
  "log": [
    { "at": "2026-09-29T14:01:52Z", "worker": "label-worker-2", "job": "lj_50211", "shipment": "shp_88120", "event": "claimed", "attempt": 1 },
    { "at": "2026-09-29T14:01:55Z", "worker": "label-worker-3", "job": "lj_50212", "shipment": "shp_88121", "event": "claimed", "attempt": 1 },
    { "at": "2026-09-29T14:02:00Z", "worker": "deploy", "event": "label workers stopped for release 2026.09.29-2" },
    { "at": "2026-09-29T14:02:41Z", "worker": "label-worker-2", "event": "started" },
    { "at": "2026-09-29T14:02:41Z", "worker": "label-worker-3", "event": "started" },
    { "at": "2026-09-29T14:02:44Z", "worker": "label-worker-2", "event": "idle" },
    { "at": "2026-09-29T14:02:44Z", "worker": "label-worker-3", "event": "idle" },
    { "at": "2026-10-01T10:15:03Z", "worker": "label-worker-1", "job": "lj_50630", "shipment": "shp_88544", "event": "claimed", "attempt": 1 },
    { "at": "2026-10-01T10:15:23Z", "worker": "label-worker-1", "job": "lj_50630", "event": "purchase failed", "error": "timeout: no response from label provider after 20000 ms", "retryAt": "2026-10-01T10:16:23Z" },
    { "at": "2026-10-01T10:16:24Z", "worker": "label-worker-3", "job": "lj_50630", "shipment": "shp_88544", "event": "claimed", "attempt": 2 },
    { "at": "2026-10-01T10:16:25Z", "worker": "label-worker-3", "job": "lj_50630", "event": "succeeded", "labelId": "lbl_7Q2X81", "trackingNumber": "BCL0041987265" }
  ],
  "providerBilling": [
    { "shipment": "shp_88544", "labelId": "lbl_7Q2W55", "createdAt": "2026-10-01T10:15:41Z", "costCents": 845, "idempotencyKey": "lj_50630:1" },
    { "shipment": "shp_88544", "labelId": "lbl_7Q2X81", "createdAt": "2026-10-01T10:16:25Z", "costCents": 845, "idempotencyKey": "lj_50630:2" }
  ],
  "jobsSnapshot": {
    "takenAt": "2026-10-02T09:00:00Z",
    "rows": [
      { "id": "lj_49877", "shipmentId": "shp_87702", "status": "queued", "attempts": 5, "availableAt": "2026-09-28T16:41:10Z", "leaseOwner": null, "leaseExpiresAt": null, "lastError": "address_rejected: postcode QX9 0ZZ is not valid for carrier parcelnet" },
      { "id": "lj_50211", "shipmentId": "shp_88120", "status": "leased", "attempts": 1, "availableAt": "2026-09-29T14:01:50Z", "leaseOwner": "label-worker-2", "leaseExpiresAt": "2026-09-29T14:02:22Z", "lastError": null },
      { "id": "lj_50212", "shipmentId": "shp_88121", "status": "leased", "attempts": 1, "availableAt": "2026-09-29T14:01:51Z", "leaseOwner": "label-worker-3", "leaseExpiresAt": "2026-09-29T14:02:25Z", "lastError": null },
      { "id": "lj_50630", "shipmentId": "shp_88544", "status": "succeeded", "attempts": 2, "availableAt": "2026-10-01T10:16:23Z", "leaseOwner": null, "leaseExpiresAt": null, "lastError": "timeout: no response from label provider after 20000 ms" }
    ]
  }
}
`;

export const TEST_HELPERS = `import { JobStore } from "../src/job-store.js";
import { LabelWorker } from "../src/label-worker.js";

export const LEASE_MS = 30_000;
export const RETRY_DELAY_MS = 60_000;
export const MAX_ATTEMPTS = 3;
export const START = Date.UTC(2026, 8, 29, 14, 0, 0);

/** A clock that only moves when a test advances it. */
export class FakeClock {
  constructor(start = START) {
    this.current = start;
  }

  now() {
    return this.current;
  }

  advance(ms) {
    this.current += ms;
    return this.current;
  }
}

/**
 * A label provider that follows the documented contract. Queue behaviors for
 * the next calls with willRespond(); calls without a queued behavior succeed.
 *   "ok"           charges (or replays the label for a known idempotency key) and resolves.
 *   "unavailable"  rejects without charging.
 *   "timeout"      charges (or replays), then rejects as our client's timeout would.
 *   "hold"         charges (or replays) and stays pending until the test settles held[i].
 */
export class FakeLabelProvider {
  constructor() {
    this.calls = [];
    this.charges = [];
    this.held = [];
    this.plan = [];
    this.byKey = new Map();
  }

  willRespond(...behaviors) {
    this.plan.push(...behaviors);
  }

  async purchaseLabel(request) {
    this.calls.push({ ...request });
    const behavior = this.plan.shift() ?? "ok";
    if (behavior === "unavailable") throw new Error("label provider returned 503");
    const label = this.#labelFor(request);
    if (behavior === "timeout") throw new Error("no response from label provider after 20000 ms");
    if (behavior === "hold") {
      return new Promise((resolve, reject) => {
        this.held.push({
          succeed: () => resolve({ ...label }),
          fail: () => reject(new Error("no response from label provider after 20000 ms")),
        });
      });
    }
    return { ...label };
  }

  #labelFor(request) {
    const key = request.idempotencyKey;
    const keyed = key !== undefined && key !== null;
    if (keyed && this.byKey.has(String(key))) return this.byKey.get(String(key));
    const n = this.charges.length + 1;
    const label = { labelId: "lbl_t" + n, trackingNumber: "BCL" + String(n).padStart(10, "0"), costCents: 845 };
    this.charges.push({ shipmentId: request.shipmentId, labelId: label.labelId });
    if (keyed) this.byKey.set(String(key), label);
    return label;
  }
}

export function labelJob(id, shipmentId = "shp_" + id) {
  return {
    id,
    shipmentId,
    payload: { carrier: "parcelnet", service: "ground", toPostcode: "BX4 7RT", weightGrams: 1200 },
  };
}

/** One shared label_jobs table, clock and provider, and a way to start worker processes against them. */
export function setup({ maxAttempts = MAX_ATTEMPTS } = {}) {
  const clock = new FakeClock();
  const store = new JobStore();
  const provider = new FakeLabelProvider();
  const worker = (id) =>
    new LabelWorker({ id, store, provider, clock, leaseMs: LEASE_MS, maxAttempts, retryDelayMs: RETRY_DELAY_MS });
  return { clock, store, provider, worker };
}
`;

export const TEST_PUBLIC = `import test from "node:test";
import assert from "node:assert/strict";
import { LEASE_MS, MAX_ATTEMPTS, RETRY_DELAY_MS, labelJob, setup } from "./helpers.js";

test("a job left leased by a stopped worker is labeled after its lease expires", async () => {
  const { clock, store, provider, worker } = setup();
  store.enqueue(labelJob("lj_50211", "shp_88120"), clock.now());
  // label-worker-2 claims the job, then the deploy stops it before it calls the provider.
  assert.ok(store.claimNext("label-worker-2", clock.now(), LEASE_MS, MAX_ATTEMPTS));

  clock.advance(LEASE_MS + 1_000);
  await worker("label-worker-3").runOnce();

  const job = store.get("lj_50211");
  assert.equal(job.status, "succeeded");
  assert.equal(provider.charges.length, 1);
  assert.equal(job.label.labelId, provider.charges[0].labelId);
});

test("a ready job is labeled once and its tracking number recorded", async () => {
  const { clock, store, provider, worker } = setup();
  store.enqueue(labelJob("lj_1"), clock.now());

  await worker("label-worker-1").runOnce();
  await worker("label-worker-2").runOnce();

  const job = store.get("lj_1");
  assert.equal(job.status, "succeeded");
  assert.equal(job.attempts, 1);
  assert.equal(provider.charges.length, 1);
  assert.match(job.label.trackingNumber, /^BCL\\d{10}$/);
});

test("a failed purchase is retried after the retry delay", async () => {
  const { clock, store, provider, worker } = setup();
  provider.willRespond("unavailable");
  store.enqueue(labelJob("lj_2"), clock.now());
  const labelWorker = worker("label-worker-1");

  await labelWorker.runOnce();
  assert.equal(store.get("lj_2").status, "queued");

  clock.advance(RETRY_DELAY_MS - 1);
  await labelWorker.runOnce();
  assert.equal(provider.calls.length, 1, "retried before the retry delay");

  clock.advance(1);
  await labelWorker.runOnce();
  const job = store.get("lj_2");
  assert.equal(job.status, "succeeded");
  assert.equal(job.attempts, 2);
  assert.equal(provider.charges.length, 1);
});
`;

export const TEST_EVALUATION = `import test from "node:test";
import assert from "node:assert/strict";
import { JobStore } from "../src/job-store.js";
import { LabelWorker } from "../src/label-worker.js";

const LEASE_MS = 30_000;
const RETRY_DELAY_MS = 60_000;
const MAX_ATTEMPTS = 3;
const TIMEOUT_MESSAGE = "no response from label provider after 20000 ms";

class Clock {
  constructor() {
    this.t = Date.UTC(2026, 9, 1, 10, 15, 0);
  }
  now() {
    return this.t;
  }
  advance(ms) {
    this.t += ms;
  }
}

class Provider {
  constructor() {
    this.calls = [];
    this.returned = [];
    this.charges = [];
    this.held = [];
    this.plan = [];
    this.byKey = new Map();
  }
  respond(...behaviors) {
    this.plan.push(...behaviors);
  }
  async purchaseLabel(request) {
    this.calls.push({ ...request });
    const behavior = this.plan.shift() ?? "ok";
    if (behavior === "unavailable") {
      this.returned.push(null);
      throw new Error("label provider returned 503");
    }
    const label = this.label(request);
    this.returned.push(label);
    if (behavior === "timeout") throw new Error(TIMEOUT_MESSAGE);
    if (behavior === "hold") {
      return new Promise((resolve, reject) => {
        this.held.push({ succeed: () => resolve({ ...label }), fail: () => reject(new Error(TIMEOUT_MESSAGE)) });
      });
    }
    return { ...label };
  }
  label(request) {
    const key = request.idempotencyKey;
    const keyed = key !== undefined && key !== null;
    if (keyed && this.byKey.has(String(key))) return this.byKey.get(String(key));
    const n = this.charges.length + 1;
    const label = { labelId: "lbl_e" + n, trackingNumber: "BCL9" + String(n).padStart(9, "0"), costCents: 912 };
    this.charges.push({ shipmentId: request.shipmentId, labelId: label.labelId });
    if (keyed) this.byKey.set(String(key), label);
    return label;
  }
}

function harness() {
  const clock = new Clock();
  const store = new JobStore();
  const provider = new Provider();
  const worker = (id) =>
    new LabelWorker({ id, store, provider, clock, leaseMs: LEASE_MS, maxAttempts: MAX_ATTEMPTS, retryDelayMs: RETRY_DELAY_MS });
  return { clock, store, provider, worker };
}

function job(id, shipmentId = "shp_" + id) {
  return { id, shipmentId, payload: { carrier: "parcelnet", service: "ground", toPostcode: "KT2 9LW", weightGrams: 950 } };
}

test("a live lease is not taken over before it expires", async () => {
  const { clock, store, provider, worker } = harness();
  store.enqueue(job("lj_1"), clock.now());
  assert.ok(store.claimNext("label-worker-1", clock.now(), LEASE_MS, MAX_ATTEMPTS));

  clock.advance(LEASE_MS - 1);
  await worker("label-worker-2").runOnce();

  assert.equal(provider.calls.length, 0);
  const row = store.get("lj_1");
  assert.equal(row.status, "leased");
  assert.equal(row.attempts, 1);
});

test("jobs stranded by a deploy are recovered after their leases expire", async () => {
  const { clock, store, provider, worker } = harness();
  for (const id of ["lj_1", "lj_2", "lj_3"]) store.enqueue(job(id), clock.now());
  assert.ok(store.claimNext("label-worker-1", clock.now(), LEASE_MS, MAX_ATTEMPTS));
  assert.ok(store.claimNext("label-worker-2", clock.now(), LEASE_MS, MAX_ATTEMPTS));

  clock.advance(LEASE_MS + 5_000);
  const restarted = worker("label-worker-1");
  for (let i = 0; i < 5; i++) await restarted.runOnce();

  for (const id of ["lj_1", "lj_2", "lj_3"]) assert.equal(store.get(id).status, "succeeded", id);
  assert.deepEqual(provider.charges.map((c) => c.shipmentId).sort(), ["shp_lj_1", "shp_lj_2", "shp_lj_3"]);
  assert.equal(store.get("lj_1").attempts, 2);
  assert.equal(store.get("lj_3").attempts, 1);
});

test("a retry after a provider timeout reuses the purchase instead of buying again", async () => {
  const { clock, store, provider, worker } = harness();
  provider.respond("timeout");
  store.enqueue(job("lj_7"), clock.now());

  await worker("label-worker-1").runOnce();
  assert.equal(store.get("lj_7").status, "queued");
  clock.advance(RETRY_DELAY_MS);
  await worker("label-worker-2").runOnce();

  const row = store.get("lj_7");
  assert.equal(row.status, "succeeded");
  assert.equal(provider.charges.length, 1, "the retry bought a second label");
  assert.equal(row.label.labelId, provider.charges[0].labelId);
});

test("a takeover while the first worker still waits on the provider buys one label", async () => {
  const { clock, store, provider, worker } = harness();
  provider.respond("hold");
  store.enqueue(job("lj_8"), clock.now());

  const first = worker("label-worker-1").runOnce();
  assert.equal(provider.held.length, 1);
  clock.advance(LEASE_MS + 1);
  await worker("label-worker-2").runOnce();
  provider.held[0].succeed();
  await first;

  const row = store.get("lj_8");
  assert.equal(row.status, "succeeded");
  assert.equal(provider.charges.length, 1, "two labels were bought for one job");
  assert.equal(row.label.labelId, provider.charges[0].labelId);
});

test("a relabel job for the same shipment is charged as its own purchase", async () => {
  const { clock, store, provider, worker } = harness();
  const labelWorker = worker("label-worker-1");
  store.enqueue(job("lj_20", "shp_500"), clock.now());
  await labelWorker.runOnce();
  clock.advance(5_000);
  store.enqueue(job("lj_21", "shp_500"), clock.now());
  await labelWorker.runOnce();

  assert.equal(provider.charges.length, 2);
  const [original, relabel] = [store.get("lj_20"), store.get("lj_21")];
  assert.equal(original.status, "succeeded");
  assert.equal(relabel.status, "succeeded");
  assert.notEqual(original.label.labelId, relabel.label.labelId);
});

test("a job that keeps failing is dead lettered after max attempts and never retried", async () => {
  const { clock, store, provider, worker } = harness();
  provider.respond("unavailable", "unavailable", "unavailable", "unavailable");
  store.enqueue(job("lj_30"), clock.now());
  const labelWorker = worker("label-worker-1");

  await labelWorker.runOnce();
  clock.advance(RETRY_DELAY_MS - 1);
  await labelWorker.runOnce();
  assert.equal(provider.calls.length, 1, "retried before the retry delay");
  clock.advance(1);
  await labelWorker.runOnce();
  clock.advance(RETRY_DELAY_MS);
  await labelWorker.runOnce();
  clock.advance(RETRY_DELAY_MS * 10);
  await labelWorker.runOnce();
  await worker("label-worker-2").runOnce();

  const row = store.get("lj_30");
  assert.equal(row.status, "dead");
  assert.equal(row.attempts, MAX_ATTEMPTS);
  assert.match(row.lastError, /503/);
  assert.equal(provider.calls.length, MAX_ATTEMPTS);
  assert.equal(provider.charges.length, 0);
});

test("a job whose final attempt lease expires is dead lettered instead of left leased", async () => {
  const { clock, store, provider, worker } = harness();
  store.enqueue(job("lj_40"), clock.now());
  assert.ok(store.claimNext("label-worker-1", clock.now(), LEASE_MS, MAX_ATTEMPTS));
  for (let attempt = 2; attempt <= MAX_ATTEMPTS; attempt++) {
    clock.advance(LEASE_MS + 1);
    assert.ok(store.claimNext("label-worker-" + attempt, clock.now(), LEASE_MS, MAX_ATTEMPTS), "attempt " + attempt + " could not claim the expired job");
  }

  clock.advance(LEASE_MS + 1);
  await worker("label-worker-9").runOnce();
  clock.advance(RETRY_DELAY_MS * 10);
  await worker("label-worker-9").runOnce();

  const row = store.get("lj_40");
  assert.equal(row.status, "dead");
  assert.equal(row.attempts, MAX_ATTEMPTS);
  assert.ok(typeof row.lastError === "string" && row.lastError.length > 0, "a dead job needs a lastError");
  assert.equal(provider.calls.length, 0);
});

test("a late failure from a worker that lost its lease does not reopen the job", async () => {
  const { clock, store, provider, worker } = harness();
  provider.respond("hold");
  store.enqueue(job("lj_50"), clock.now());

  const stale = worker("label-worker-1").runOnce();
  clock.advance(LEASE_MS + 1);
  await worker("label-worker-2").runOnce();
  const current = store.get("lj_50");
  assert.equal(current.status, "succeeded");

  provider.held[0].fail();
  await stale;
  assert.equal(store.get("lj_50").status, "succeeded", "the stale worker reopened a finished job");

  clock.advance(RETRY_DELAY_MS * 2);
  await worker("label-worker-3").runOnce();
  const row = store.get("lj_50");
  assert.equal(row.status, "succeeded");
  assert.equal(row.attempts, current.attempts);
  assert.deepEqual(row.label, current.label);
  assert.equal(provider.calls.length, 2);
});

test("a late failure from the previous process of a restarted worker is ignored", async () => {
  const { clock, store, provider, worker } = harness();
  provider.respond("hold", "hold");
  store.enqueue(job("lj_60"), clock.now());

  const beforeRestart = worker("label-worker-1").runOnce();
  clock.advance(LEASE_MS + 1);
  const afterRestart = worker("label-worker-1").runOnce();
  assert.equal(provider.held.length, 2, "the restarted process did not take over the expired lease");

  provider.held[0].fail();
  await beforeRestart;
  provider.held[1].succeed();
  await afterRestart;

  const row = store.get("lj_60");
  assert.equal(row.status, "succeeded", "the previous process's late failure changed the job");
  assert.equal(row.attempts, 2);
  assert.equal(row.label.labelId, provider.returned[1].labelId);
});
`;

export const REFERENCE_STORE = `export const JobStatus = Object.freeze({
  QUEUED: "queued",
  LEASED: "leased",
  SUCCEEDED: "succeeded",
  DEAD: "dead",
});

/**
 * The label_jobs table. Every worker process shares it, and each method runs
 * as one atomic statement, so calls from different workers never interleave.
 * Methods return copies; rows change only through these methods.
 */
export class JobStore {
  #jobs = new Map();
  #leasesGranted = 0;

  enqueue({ id, shipmentId, payload }, now) {
    if (this.#jobs.has(id)) throw new Error("label job " + id + " already exists");
    this.#jobs.set(id, {
      id,
      shipmentId,
      payload: { ...payload },
      status: JobStatus.QUEUED,
      attempts: 0,
      availableAt: now,
      leaseId: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      label: null,
      lastError: null,
      updatedAt: now,
    });
    return this.get(id);
  }

  /**
   * Leases the oldest ready job to workerId for leaseMs. A job is ready when it
   * is queued and due, or leased with an expired lease. A ready job with no
   * attempts left moves to dead instead. Returns the leased row (its leaseId
   * identifies this claim), or null when nothing is ready.
   */
  claimNext(workerId, now, leaseMs, maxAttempts) {
    for (const job of this.#jobs.values()) {
      const expired = job.status === JobStatus.LEASED && job.leaseExpiresAt <= now;
      const due = job.status === JobStatus.QUEUED && job.availableAt <= now;
      if (!expired && !due) continue;
      if (job.attempts >= maxAttempts) {
        this.#bury(job, expired ? "lease expired on attempt " + job.attempts : job.lastError ?? "no attempts left", now);
        continue;
      }
      this.#leasesGranted += 1;
      job.status = JobStatus.LEASED;
      job.leaseId = this.#leasesGranted;
      job.leaseOwner = workerId;
      job.leaseExpiresAt = now + leaseMs;
      job.attempts += 1;
      job.updatedAt = now;
      return copy(job);
    }
    return null;
  }

  /** The mark methods apply only while lease (the row claimNext returned) is still the job's current lease, and return whether they did. */
  markSucceeded(lease, label, now) {
    const job = this.#held(lease);
    if (!job) return false;
    job.status = JobStatus.SUCCEEDED;
    job.label = { ...label };
    this.#release(job, now);
    return true;
  }

  markFailed(lease, error, retryAt, now) {
    const job = this.#held(lease);
    if (!job) return false;
    job.status = JobStatus.QUEUED;
    job.availableAt = retryAt;
    job.lastError = error;
    this.#release(job, now);
    return true;
  }

  markDead(lease, error, now) {
    const job = this.#held(lease);
    if (!job) return false;
    this.#bury(job, error, now);
    return true;
  }

  get(id) {
    const job = this.#jobs.get(id);
    return job ? copy(job) : null;
  }

  list() {
    return [...this.#jobs.values()].map(copy);
  }

  #held(lease) {
    const job = this.#jobs.get(lease.id);
    return job && job.status === JobStatus.LEASED && job.leaseId === lease.leaseId ? job : null;
  }

  #bury(job, error, now) {
    job.status = JobStatus.DEAD;
    job.lastError = error;
    this.#release(job, now);
  }

  #release(job, now) {
    job.leaseOwner = null;
    job.leaseExpiresAt = null;
    job.updatedAt = now;
  }
}

function copy(job) {
  return structuredClone(job);
}
`;

export const REFERENCE_WORKER = `import { LABEL_JOB_DEFAULTS } from "./config.js";
import { describeError } from "./label-provider.js";

/**
 * One label worker process. Production calls runOnce() in a loop on every
 * worker host; tests call it directly.
 */
export class LabelWorker {
  constructor({
    id,
    store,
    provider,
    clock,
    leaseMs = LABEL_JOB_DEFAULTS.leaseMs,
    maxAttempts = LABEL_JOB_DEFAULTS.maxAttempts,
    retryDelayMs = LABEL_JOB_DEFAULTS.retryDelayMs,
  }) {
    this.id = id;
    this.store = store;
    this.provider = provider;
    this.clock = clock;
    this.leaseMs = leaseMs;
    this.maxAttempts = maxAttempts;
    this.retryDelayMs = retryDelayMs;
  }

  /** Claims at most one job and runs it. Resolves to { outcome: "idle" } when nothing is ready. */
  async runOnce() {
    const lease = this.store.claimNext(this.id, this.clock.now(), this.leaseMs, this.maxAttempts);
    if (!lease) return { outcome: "idle" };

    let label;
    try {
      // One key per job, shared by every attempt: a purchase that timed out may still have gone through.
      label = await this.provider.purchaseLabel({
        shipmentId: lease.shipmentId,
        ...lease.payload,
        idempotencyKey: "label-job/" + lease.id,
      });
    } catch (error) {
      const now = this.clock.now();
      const message = describeError(error);
      if (lease.attempts >= this.maxAttempts) {
        return this.store.markDead(lease, message, now) ? { outcome: "dead", jobId: lease.id } : { outcome: "lease_lost", jobId: lease.id };
      }
      const scheduled = this.store.markFailed(lease, message, now + this.retryDelayMs, now);
      return scheduled ? { outcome: "retry_scheduled", jobId: lease.id, attempt: lease.attempts } : { outcome: "lease_lost", jobId: lease.id };
    }

    if (!this.store.markSucceeded(lease, label, this.clock.now())) return { outcome: "lease_lost", jobId: lease.id };
    return { outcome: "succeeded", jobId: lease.id, trackingNumber: label.trackingNumber };
  }
}
`;

const REFERENCE_KEY = `idempotencyKey: "label-job/" + lease.id,`;

export const WRONG_PER_ATTEMPT_KEY_WORKER = variant(REFERENCE_WORKER, [
  [REFERENCE_KEY, `idempotencyKey: "label-job/" + lease.id + "/" + lease.attempts,`],
  ["      // One key per job, shared by every attempt: a purchase that timed out may still have gone through.\n", ""],
]);

export const WRONG_SHIPMENT_KEY_WORKER = variant(REFERENCE_WORKER, [
  [REFERENCE_KEY, `idempotencyKey: "label-shipment/" + lease.shipmentId,`],
  ["      // One key per job, shared by every attempt: a purchase that timed out may still have gone through.\n", ""],
]);

export const WRONG_STUCK_ON_LAST_ATTEMPT_STORE = variant(REFERENCE_STORE, [
  [
    "const expired = job.status === JobStatus.LEASED && job.leaseExpiresAt <= now;",
    "const expired = job.status === JobStatus.LEASED && job.leaseExpiresAt <= now && job.attempts < maxAttempts;",
  ],
]);

const REFERENCE_FENCE = "return job && job.status === JobStatus.LEASED && job.leaseId === lease.leaseId ? job : null;";

export const WRONG_WORKER_ID_FENCE_STORE = variant(REFERENCE_STORE, [
  [REFERENCE_FENCE, "return job && job.status === JobStatus.LEASED && job.leaseOwner === lease.leaseOwner ? job : null;"],
]);

export const WRONG_UNFENCED_STORE = variant(REFERENCE_STORE, [[REFERENCE_FENCE, "return job ?? null;"]]);
