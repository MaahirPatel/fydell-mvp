import "server-only";
import { assemble, type BriefStage, type TestsStage } from "../../authoring/generate";
import { SECTIONS, type ProtectedMaterials, type ScenarioPackage } from "../../authoring/package";
import { DEFAULT_INPUT, parseInput, validateConfig, type AuthoringConfig, type AuthoringInput } from "../../authoring/registry";
import {
  REFERENCE_STORE,
  REFERENCE_WORKER,
  STARTER_CONFIG,
  STARTER_FIXTURE,
  STARTER_PROVIDER,
  STARTER_README,
  STARTER_STORE,
  STARTER_WORKER,
  TEST_EVALUATION,
  TEST_HELPERS,
  TEST_PUBLIC,
  WRONG_PER_ATTEMPT_KEY_WORKER,
  WRONG_SHIPMENT_KEY_WORKER,
  WRONG_STUCK_ON_LAST_ATTEMPT_STORE,
  WRONG_UNFENCED_STORE,
  WRONG_WORKER_ID_FENCE_STORE,
} from "./files";

export const JOB_LEASE_RECOVERY_SEED_MARKER = "fydell-template:job-lease-recovery:v1";
const AUTHORED_AT = "2026-10-07T00:00:00.000Z";
const FIXTURE_PATH = "fixtures/incident-log.json";

/** The creator-form input this sample corresponds to; stored with the draft. */
export const JOB_LEASE_RECOVERY_INPUT: AuthoringInput = {
  ...DEFAULT_INPUT,
  family: "backend_api_engineer",
  specialization: "general",
  level: "mid",
  language: "javascript",
  framework: "none",
  database: "in-memory",
  technologies: ["queues", "retries", "concurrency"],
  taskType: "debugging",
  capabilities: ["correctness", "reliability", "testing"],
  taskMinutes: 60,
  setupMinutes: 10,
  aiPolicy: "assistants_disclosed",
  startingMaterial: "uploaded",
  description:
    "Shipping label jobs claimed by workers that crash or stall during a deploy stay leased forever, retries after provider timeouts buy a second label, and jobs that keep failing never reach the dead-letter state. The candidate reproduces the failures with an injected clock and label provider, fixes lease expiry, purchase idempotency, max attempts and stale-worker results, and adds regression tests.",
  outcomes: [
    "Jobs left behind by stopped or stalled workers are completed once their lease expires.",
    "No job is charged for more than one label, and jobs that run out of attempts end dead.",
  ],
  constraints: ["Standard library only.", "Keep the LabelWorker and JobStore interfaces the tests use.", "No separate reaper process."],
  outOfScope: ["Classifying permanent provider errors.", "Refunding duplicate labels already bought.", "Lease heartbeats."],
  confirmedAssumptions: ["synthetic_data"],
};

function config(): AuthoringConfig {
  const { input, invalid } = parseInput(JOB_LEASE_RECOVERY_INPUT);
  const v = validateConfig(input, invalid);
  if (!v.ok || !v.resolved) {
    const reasons = [...v.errors, ...v.conflicts].map((e) => e.message).concat(v.clarifications.map((c) => c.question), v.assumptions.map((a) => a.statement));
    throw new Error(`job-lease-recovery config does not validate: ${reasons.join(" | ")}`);
  }
  return v.resolved;
}

const BRIEF: BriefStage = {
  title: "Recover label jobs after crashes and timeouts",
  summary: "Label jobs get stuck after deploys, and some shipments are charged for two labels. Reproduce the failures, make leases, retries and dead-lettering recover correctly, and add regression coverage.",
  context: [
    "Brindlecourt Logistics buys a shipping label for every packed shipment. The fulfilment service enqueues a label job; label workers on several hosts claim jobs from a shared label_jobs table (src/job-store.js), buy a label from our label provider and record it on the job (src/label-worker.js). The warehouse prints whatever label is recorded.",
    "A claim is a lease: the worker holds the job for leaseMs (30 seconds in production) from when the lease was granted. Every deploy stops workers without warning, sometimes in the middle of a job. A worker's id is its host name, so a restarted worker comes back with the same id while the previous process may still be finishing a provider call.",
    "The label provider charges for every label it creates. It accepts an optional idempotencyKey: a purchase with a key it has seen in the last 24 hours returns the original label and is not charged again. Our client gives up after 20 seconds, and a purchase that timed out on our side may still have gone through at the provider (see src/label-provider.js).",
    "Last week, jobs claimed just before the 29 September deploy stayed leased for days and their shipments missed the carrier pickup. On 1 October the provider slowed down and 23 shipments were charged for two labels. Separately, a job with a bad postcode has sat in queued for four days without appearing in the dead-letter view, which lists jobs in the dead status. The worker log, job rows and the provider billing export are in fixtures/incident-log.json.",
  ].join("\n\n"),
  task: [
    "Own label job recovery. Reproduce the problems with the public tests or the incident log, work out why they happen, and change src/job-store.js and src/label-worker.js so that jobs recover from stopped and stalled workers, each job is charged for at most one label, retries stop at maxAttempts with the job moved to dead, and a worker that has lost its lease cannot overwrite the work of the worker that took over.",
    "Add regression tests under test/ that fail on the current code and pass with your change. The fakes in test/helpers.js let you control time and the provider's responses. Two simulated teammates can answer questions: Ines about the job contract and constraints, Kofi about the incidents and the data. If something is still unclear, make a reasonable assumption and state it in your handoff.",
  ].join("\n\n"),
  outcomes: [
    "Jobs left behind by stopped or stalled workers are completed by another worker once their lease expires.",
    "No job is charged for more than one label, and a job that runs out of attempts ends in dead.",
    "A regression test in test/ fails on the original code and passes with your change.",
    "A short handoff explains the causes, what you changed, how you checked it, and what remains open.",
  ],
  constraints: [
    "Node.js standard library only. No npm packages.",
    "Keep the LabelWorker constructor options and runOnce(), and the JobStore enqueue, claimNext and get signatures; the tests use them. You may change the other JobStore methods and add fields to rows.",
    "Expired leases are noticed when a worker calls claimNext. Do not add a separate reaper process or timers.",
    "Every provider failure counts as an attempt, whatever the error.",
    "Do not lengthen leaseMs or the client timeout to work around the problem. The provider has stalled for longer than both and will again.",
  ],
  outOfScope: [
    "Telling permanent provider errors, such as a rejected postcode, apart from retryable ones.",
    "Voiding or refunding the duplicate labels already bought.",
    "Heartbeats or lease extension while a purchase is in progress.",
    "The dead-letter view and paging. They already read jobs in the dead status.",
  ],
  optionalExtensions: ["If you have time, note in your handoff how you would tell permanent provider errors apart from retryable ones."],
  interfaceSpec: [
    "src/job-store.js",
    "  JobStatus: { QUEUED: \"queued\", LEASED: \"leased\", SUCCEEDED: \"succeeded\", DEAD: \"dead\" }.",
    "  JobStore(): the shared label_jobs table. Each method is one atomic statement and returns copies of rows.",
    "    enqueue({ id, shipmentId, payload }, now) -> row. payload: { carrier, service, toPostcode, weightGrams }.",
    "    claimNext(workerId, now, leaseMs, maxAttempts) -> row or null. Leases the oldest ready job and increments attempts.",
    "    get(id) -> row or null. list() -> rows.",
    "    markSucceeded(jobId, label, now) and markFailed(jobId, error, retryAt, now): starter signatures; you may change them.",
    "  Row: { id, shipmentId, payload, status, attempts, availableAt, leaseOwner, leaseExpiresAt, label, lastError, updatedAt }.",
    "    Times are epoch milliseconds. attempts counts claims. label is what the provider returned. lastError is the message of the last failure.",
    "src/label-worker.js",
    "  LabelWorker({ id, store, provider, clock, leaseMs = 30000, maxAttempts = 5, retryDelayMs = 60000 })",
    "    runOnce() -> Promise<{ outcome, ... }>: claims at most one job and runs it. outcome is \"idle\" when nothing was ready.",
    "src/label-provider.js",
    "  provider.purchaseLabel({ shipmentId, carrier, service, toPostcode, weightGrams, idempotencyKey? }) -> Promise<{ labelId, trackingNumber, costCents }>.",
    "  LabelProviderError(code, message) and describeError(error) -> string.",
    "clock: { now() -> epoch ms }. Tests inject a fake clock and a fake provider (test/helpers.js); nothing sleeps.",
  ].join("\n"),
  acceptanceCriteria: [
    {
      id: "AC-1",
      capability: "reliability",
      text: "When a worker stops before finishing a job (it crashed, was stopped by a deploy, or is stalled), another worker can claim the job once its lease has expired, and no worker can claim it before then. No job stays leased forever.",
    },
    {
      id: "AC-2",
      capability: "correctness",
      text: "Each job is charged for at most one label, including when it is retried after a failed or timed-out provider call and when another worker claims it while the first worker is still waiting on the provider. Separate jobs are charged separately, including a relabel job for a shipment that already has a label.",
    },
    {
      id: "AC-3",
      capability: "reliability",
      text: "A job is attempted at most maxAttempts times. A failed attempt with attempts left is retried no earlier than retryDelayMs later. When the last attempt fails or its lease expires, the job moves to dead with a lastError and is never claimed again.",
    },
    {
      id: "AC-4",
      capability: "correctness",
      text: "A worker process whose lease expired and was claimed again cannot change the job afterwards, even when the new claim came from a restarted process with the same worker id: its late success or failure leaves the status, attempts and label recorded for the current claim unchanged.",
    },
  ],
  coworkers: [],
};

const TESTS: TestsStage = {
  publicTests: {
    file: { path: "test/public.test.js", content: TEST_PUBLIC },
    tests: [
      { name: "a job left leased by a stopped worker is labeled after its lease expires", criterionIds: ["AC-1"] },
      { name: "a ready job is labeled once and its tracking number recorded", criterionIds: ["AC-2"] },
      { name: "a failed purchase is retried after the retry delay", criterionIds: ["AC-3"] },
    ],
  },
  evaluationTests: {
    file: { path: "test/evaluation.test.js", content: TEST_EVALUATION },
    tests: [
      { name: "a live lease is not taken over before it expires", criterionIds: ["AC-1"] },
      { name: "jobs stranded by a deploy are recovered after their leases expire", criterionIds: ["AC-1"] },
      { name: "a retry after a provider timeout reuses the purchase instead of buying again", criterionIds: ["AC-2"] },
      { name: "a takeover while the first worker still waits on the provider buys one label", criterionIds: ["AC-2"] },
      { name: "a relabel job for the same shipment is charged as its own purchase", criterionIds: ["AC-2"] },
      { name: "a job that keeps failing is dead lettered after max attempts and never retried", criterionIds: ["AC-3"] },
      { name: "a job whose final attempt lease expires is dead lettered instead of left leased", criterionIds: ["AC-3", "AC-1"] },
      { name: "a late failure from a worker that lost its lease does not reopen the job", criterionIds: ["AC-4"] },
      { name: "a late failure from the previous process of a restarted worker is ignored", criterionIds: ["AC-4"] },
    ],
  },
  incorrectSolutions: [
    {
      description: "Reclaims expired leases, fences and dead-letters correctly, but keys the purchase on the job id plus the attempt number, so a takeover or a retry after a timeout buys a second label.",
      files: [
        { path: "src/job-store.js", content: REFERENCE_STORE },
        { path: "src/label-worker.js", content: WRONG_PER_ATTEMPT_KEY_WORKER },
      ],
    },
    {
      description: "Keys the purchase on the shipment id instead of the job, so a relabel job for the same shipment gets the old label back and is never charged.",
      files: [
        { path: "src/job-store.js", content: REFERENCE_STORE },
        { path: "src/label-worker.js", content: WRONG_SHIPMENT_KEY_WORKER },
      ],
    },
    {
      description: "Reclaims an expired lease only while attempts remain, so a job whose final attempt's worker died stays leased forever instead of moving to dead.",
      files: [
        { path: "src/job-store.js", content: WRONG_STUCK_ON_LAST_ATTEMPT_STORE },
        { path: "src/label-worker.js", content: REFERENCE_WORKER },
      ],
    },
    {
      description: "Fences late results on the worker id recorded with the lease. A restarted worker reuses its host name, so the previous process's late failure is accepted and requeues a job the new process is finishing.",
      files: [
        { path: "src/job-store.js", content: WRONG_WORKER_ID_FENCE_STORE },
        { path: "src/label-worker.js", content: REFERENCE_WORKER },
      ],
    },
    {
      description: "Fixes reclaiming, the idempotency key and dead-lettering but records results without checking the lease, so a stale worker's late failure reopens a job another worker already finished.",
      files: [
        { path: "src/job-store.js", content: WRONG_UNFENCED_STORE },
        { path: "src/label-worker.js", content: REFERENCE_WORKER },
      ],
    },
  ],
};

const CODE = {
  starterFiles: [
    { path: "README.md", content: STARTER_README },
    { path: "src/config.js", content: STARTER_CONFIG },
    { path: "src/label-provider.js", content: STARTER_PROVIDER },
    { path: "src/job-store.js", content: STARTER_STORE },
    { path: "src/label-worker.js", content: STARTER_WORKER },
    { path: FIXTURE_PATH, content: STARTER_FIXTURE },
    { path: "test/helpers.js", content: TEST_HELPERS },
  ],
  referenceFiles: [
    { path: "src/job-store.js", content: REFERENCE_STORE },
    { path: "src/label-worker.js", content: REFERENCE_WORKER },
  ],
  approaches: [
    "Give every claim a lease id (a per-store counter). claimNext also takes leased jobs whose lease has expired; a ready job with attempts >= maxAttempts is moved to dead instead. markSucceeded, markFailed and a new markDead take the claimed row and apply only while the job is still leased under that lease id. The worker passes an idempotency key derived from the job id alone, and on failure marks the job dead when lease.attempts >= maxAttempts.",
    "Use the attempts count as the fencing token instead of a separate lease id: a result applies only when the job is leased and its attempts equal the claimed row's attempts. Equivalent, because every claim increments attempts.",
    "Do the dead-letter decision for failed attempts inside markFailed (pass maxAttempts or store it on the row) rather than in the worker. Any placement works as long as expired final-attempt leases are also moved to dead by claimNext.",
    "Starter defects: claimNext never takes expired leases, so a stopped worker's job stays leased forever (AC-1). The idempotency key includes the attempt number, so a retry after an ambiguous timeout charges again, and so would a takeover once reclaiming exists (AC-2). An exhausted job is skipped in queued instead of moving to dead (AC-3). The mark methods do not check the lease, so a stale worker can overwrite the current claim (AC-4).",
  ],
};

const COWORKERS: ScenarioPackage["coworkers"] = [
  {
    id: "lead",
    name: "Ines Varga",
    title: "Engineering lead, Fulfilment platform",
    responsibilities: "Owns the label job contract, the job store and the integration with the label provider, and sets priorities for the fulfilment platform.",
    topics: ["leases", "worker ids and deploys", "label provider contract", "max attempts and dead jobs", "store changes", "scope"],
    tone: "Direct and calm. Answers the question asked and says plainly what she does not know.",
    boundaries: "Explains how jobs, leases and the provider are meant to behave and what matters most, but will not choose or write the fix. Does not know individual shipment details.",
  },
  {
    id: "ops",
    name: "Kofi Brandt",
    title: "Shipping operations analyst",
    responsibilities: "Handles warehouse escalations and carrier pickups, and reads the worker logs and the provider's billing export during incidents.",
    topics: ["incident timeline", "duplicate labels", "stuck jobs", "billing export", "relabels"],
    tone: "Friendly and concrete. Quotes timestamps, job ids and what the warehouse saw.",
    boundaries: "Knows what happened, what the logs and billing export show, and how the warehouse works. Does not know the code and will not suggest a fix.",
  },
];

const COWORKER_FACTS: ProtectedMaterials["coworkerFacts"] = {
  lead: [
    {
      id: "lead-f1",
      text: "A lease is the only claim a worker has. Once it expires, the job belongs to whoever claims it next, even if the old worker is still running. Expiry is checked when a worker calls claimNext; we never built a reaper and I don't want a new process for it.",
      topics: ["lease", "expiry", "reaper", "claim", "stuck", "who owns"],
    },
    {
      id: "lead-f2",
      text: "Worker ids are host names. After a deploy the same host name comes back as a new process, so for a while two processes can carry the same id: the old one may still be waiting on a provider call while the new one starts claiming.",
      topics: ["worker id", "host name", "restart", "deploy", "same id", "process"],
    },
    {
      id: "lead-f3",
      text: "The provider's idempotency window is 24 hours and keys are per account. Our label jobs finish or die well inside that window. The returns service uses the same account with keys that start with return/, so ours must not collide with those.",
      topics: ["idempotency", "idempotency key", "key", "24 hours", "provider", "collide"],
    },
    {
      id: "lead-f4",
      text: "Priorities: a duplicate label costs money and confuses the carrier pickup, while a dead job costs one call from on-call. If you have to choose, prefer a dead job over a second label. Raising the lease or the client timeout is not a fix; the provider stalled for 40 seconds on 1 October.",
      topics: ["priority", "tradeoff", "lease length", "timeout", "longer lease", "choose"],
    },
    {
      id: "lead-f5",
      text: "maxAttempts is 5 in production. Once a job is dead, on-call decides what to do with it and workers must never pick it up again. Telling permanent errors from retryable ones is a follow-up, so treat every failure as an attempt for now.",
      topics: ["max attempts", "dead", "dead letter", "permanent error", "retry", "on-call"],
    },
    {
      id: "lead-f6",
      text: "Change JobStore internals and the mark methods however you need; production's version is a thin layer over the table and we will port your change. Keep enqueue, claimNext and get as they are because other services call them.",
      topics: ["schema", "store", "interface", "signature", "change", "fields"],
    },
  ],
  ops: [
    {
      id: "ops-f1",
      text: "29 September: the 14:02 deploy stopped label-worker-2 and label-worker-3 a few seconds after they claimed lj_50211 and lj_50212. On 2 October both were still leased, with leases that had run out on 29 September at 14:02. Those shipments missed two carrier pickups.",
      topics: ["deploy", "stuck", "leased", "29 september", "lj_50211", "missed pickup", "incident"],
    },
    {
      id: "ops-f2",
      text: "1 October, 10:15 to 10:40: provider responses took 30 to 40 seconds. Our log shows timeouts at 20 seconds and a retry about a minute later, often on another worker. The billing export shows two labels for each of 23 shipments, one created after our timeout and one at the retry, with different idempotency keys.",
      topics: ["duplicate", "two labels", "timeout", "1 october", "billing", "charged twice", "slow provider"],
    },
    {
      id: "ops-f3",
      text: "lj_49877 has a postcode the carrier rejects. It failed five times on 28 September and has been sitting in queued with 5 attempts ever since. The dead-letter view only shows dead jobs, so nobody noticed until the customer called.",
      topics: ["bad postcode", "dead letter", "lj_49877", "attempts", "queued", "never retried"],
    },
    {
      id: "ops-f4",
      text: "When a customer changes the delivery address after packing, we void the label and the fulfilment service enqueues a new job for the same shipment. That relabel job must buy a new label; the old one is void.",
      topics: ["relabel", "address change", "same shipment", "void", "new job"],
    },
    {
      id: "ops-f5",
      text: "I don't know the code, sorry. Ines can tell you how the workers are meant to behave.",
      topics: ["code", "fix", "implementation"],
    },
  ],
};

const RUBRIC_NOTES: ProtectedMaterials["rubricNotes"] = {
  "CR-1": "Strong submissions key the purchase on the job alone (stable across attempts and workers) and fence results with something unique per claim, such as a lease id or the attempt count. Keys that include the attempt, keys on the shipment, fencing on the worker id and no fencing at all are the common wrong turns; the evaluation tests catch each one.",
  "CR-2": "Look for expired leases being reclaimable in claimNext, and for a job with no attempts left reaching dead on both paths: a failed final attempt and an expired final lease. Skipping exhausted jobs in claimNext leaves them leased or queued forever, which is the original bug in a new place.",
  "CR-3": "A useful regression test drives time with the fake clock and the provider with held or timed-out responses: a stopped worker's job recovered after expiry, a timed-out purchase retried without a second charge, or a stale worker's late result ignored. A test that only runs the happy path passes on the original code and shows nothing.",
};

function fixedSections(): ScenarioPackage["provenance"]["sections"] {
  const out = {} as ScenarioPackage["provenance"]["sections"];
  for (const s of SECTIONS) out[s] = { revision: 1, editedBy: "author", updatedAt: AUTHORED_AT };
  return out;
}

/** The hand-authored background jobs work sample. Deterministic: no clock or randomness. */
export function buildJobLeaseRecoveryPackage(): { pkg: ScenarioPackage; prot: ProtectedMaterials } {
  const built = assemble(config(), BRIEF, CODE, TESTS, null, "template");
  const pkg: ScenarioPackage = {
    ...built.pkg,
    setupInstructions: [
      "Install Node.js 22 or newer. No npm packages are needed.",
      "Download the starter project and open it in your editor.",
      "Read fixtures/incident-log.json for the worker log, job rows and billing export from the incidents.",
      `From the project root, run the public tests: ${built.pkg.environment.testCommand}. One public test fails on the starter project because it reproduces the stuck jobs.`,
    ],
    fixturePaths: [FIXTURE_PATH],
    coworkers: COWORKERS,
    submission: {
      requirements: [
        "Submit the project with your changes under src/ and the tests you added.",
        "Include a regression test in test/ that fails on the original code and passes with your change.",
        "Keep the public tests in test/public.test.js passing.",
        "Answer the three handoff questions.",
      ],
      handoffPrompts: [
        { id: "what_changed", label: "What did you change?", help: "The causes you found, the files you changed and the behavior that changed." },
        { id: "how_checked", label: "How did you check it?", help: "Tests you added or ran, and anything you verified by hand." },
        { id: "unresolved", label: "What remains unresolved?", help: "Risks, assumptions and anything you would do next." },
      ],
    },
    accommodations: ["Extra time can be granted per invitation. Ask the hiring team before you start.", "Screen readers and keyboard-only use are supported in the browser workspace."],
    reviewQuestion: {
      coworkerId: "lead",
      text: "Before you hand this off: the provider stalls for 45 seconds on a purchase, the lease is 30 seconds, and a deploy restarts the stalled worker in the meantime. With your change, what does each process do, and how many labels are charged?",
    },
    interruptionPolicy: "Requirements will not change during the task. Ines may ask one question about your change near the end; nothing else will interrupt you. The timer keeps running if you step away or lose your connection; your saved files stay in the workspace, so reopen the invitation link to continue.",
    feedbackPolicy: "When the hiring team releases your report, you can see which acceptance criteria the tests confirmed and how each criterion was judged. Hidden test code is not shared. A reviewer reads your regression tests and your handoff.",
    provenance: { path: "template", model: null, generatedAt: AUTHORED_AT, sections: fixedSections() },
  };
  const prot: ProtectedMaterials = { ...built.prot, coworkerFacts: COWORKER_FACTS, rubricNotes: RUBRIC_NOTES };
  return { pkg, prot };
}
