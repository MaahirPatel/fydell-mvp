import "server-only";
import { assemble, type BriefStage, type TestsStage } from "../../authoring/generate";
import { SECTIONS, type ProtectedMaterials, type ScenarioPackage } from "../../authoring/package";
import { DEFAULT_INPUT, parseInput, validateConfig, type AuthoringConfig, type AuthoringInput } from "../../authoring/registry";
import {
  REFERENCE_RECEIVER,
  REFERENCE_STORE,
  STARTER_FIXTURE,
  STARTER_INIT,
  STARTER_README,
  STARTER_RECEIVER,
  STARTER_REPLAY,
  STARTER_SIGNING,
  STARTER_STORE,
  TEST_EVALUATION,
  TEST_HELPERS,
  TEST_PUBLIC,
  WRONG_DELIVERY_ID_RECEIVER,
  WRONG_MARK_FIRST_RECEIVER,
  WRONG_MODULE_GLOBAL_RECEIVER,
  WRONG_PAYMENT_KEY_RECEIVER,
} from "./files";

export const WEBHOOK_DEDUPE_SEED_MARKER = "fydell-template:webhook-dedupe:v1";
const AUTHORED_AT = "2026-10-07T00:00:00.000Z";
const FIXTURE_PATH = "fixtures/incident_deliveries.json";

/** The creator-form input this sample corresponds to; stored with the draft. */
export const WEBHOOK_DEDUPE_INPUT: AuthoringInput = {
  ...DEFAULT_INPUT,
  family: "backend_api_engineer",
  specialization: "general",
  level: "mid",
  language: "python",
  framework: "none",
  database: "sqlite",
  technologies: ["webhooks", "hmac", "retries", "concurrency"],
  taskType: "debugging",
  capabilities: ["correctness", "reliability", "testing"],
  taskMinutes: 60,
  setupMinutes: 10,
  aiPolicy: "assistants_disclosed",
  startingMaterial: "uploaded",
  description:
    "Customers sometimes receive duplicate payment events after a delivery timeout: the ledger is credited twice and two receipt emails are queued. The candidate investigates a supplied reproduction, fixes duplicate-event handling in the webhook receiver so each event is applied exactly once across workers, restarts and partial failures, and adds regression coverage.",
  outcomes: ["Each payment.succeeded event is applied exactly once.", "A regression test fails on the original code and passes with the fix."],
  constraints: ["Standard library only.", "Keep the WebhookReceiver.handle interface.", "Additive schema changes only."],
  outOfScope: ["Asynchronous job processing.", "Provider-side changes.", "Sending the email itself."],
  confirmedAssumptions: ["synthetic_data"],
};

function config(): AuthoringConfig {
  const { input, invalid } = parseInput(WEBHOOK_DEDUPE_INPUT);
  const v = validateConfig(input, invalid);
  if (!v.ok || !v.resolved) {
    const reasons = [...v.errors, ...v.conflicts].map((e) => e.message).concat(v.clarifications.map((c) => c.question), v.assumptions.map((a) => a.statement));
    throw new Error(`webhook-dedupe config does not validate: ${reasons.join(" | ")}`);
  }
  return v.resolved;
}

const BRIEF: BriefStage = {
  title: "Prevent duplicate webhook processing",
  summary: "Customers sometimes receive duplicate events after a delivery timeout. Investigate the supplied reproduction, fix the behavior, and add regression coverage.",
  context: [
    "Fernleaf Payments runs a small service that receives webhooks from its payment provider. For every payment.succeeded event, app/receiver.py credits the customer's ledger and queues a receipt email in an outbox table that a separate mailer drains.",
    "The provider signs each request body and waits 5 seconds for a 2xx response. On a timeout or any non-2xx response it retries later with the same event id in the body, a new X-Delivery-Id header and an incremented X-Delivery-Attempt header.",
    "Requests are served by several worker processes that share one SQLite database file. Workers are restarted on every deploy.",
    "Last week one customer was credited twice and received two receipts for a single payment. The deliveries from that incident are in fixtures/incident_deliveries.json, and scripts/replay_incident.py replays them against two workers and prints the resulting ledger and outbox rows.",
  ].join("\n\n"),
  task: [
    "Own duplicate-event handling in the receiver. Reproduce the problem with scripts/replay_incident.py or the public tests, work out why it happens, and change app/receiver.py (and app/store.py if you need to) so that each event is applied exactly once, whichever worker handles a delivery, however many times it is delivered, and even when processing fails partway.",
    "Add regression tests under tests/ that fail on the current code and pass with your change. Two simulated teammates can answer questions: Dana about the delivery contract and constraints, Leah about the incident and the logs. If something is still unclear, make a reasonable assumption and state it in your handoff.",
  ].join("\n\n"),
  outcomes: [
    "Each payment.succeeded event credits the ledger and queues a receipt exactly once.",
    "A regression test in tests/ fails on the original code and passes with your change.",
    "A short handoff explains the cause, what you changed, how you checked it, and what remains open.",
  ],
  constraints: [
    "Python standard library only.",
    "Keep the WebhookReceiver.handle(delivery) -> Response interface and the Delivery and Response dataclasses.",
    "You may add tables or indexes to the schema in Store. Do not change or remove existing columns.",
    "Process the event during the request. Moving the work to an asynchronous queue is out of scope.",
    "A delivery of an event that was already processed must still get a 2xx response so the provider stops retrying.",
  ],
  outOfScope: [
    "Moving processing to an asynchronous job queue.",
    "Changes on the payment provider's side, such as its retry schedule or timeout.",
    "Sending the receipt email itself. The mailer that drains the outbox is a separate service.",
  ],
  optionalExtensions: ["If you have time, note in your handoff how you would keep the handler under the provider's 5 second timeout."],
  interfaceSpec: [
    "app/receiver.py",
    "  Delivery(body: bytes, headers: dict): dataclass. Headers include X-Signature, X-Delivery-Id and X-Delivery-Attempt.",
    "  Response(status: int, body: str = \"\"): dataclass.",
    "  WebhookReceiver(store: Store, secret: bytes, now: Callable[[], str]): now returns an ISO 8601 timestamp.",
    "    handle(delivery: Delivery) -> Response: 401 for a bad signature, 400 for a malformed body, 200 \"ignored\" for other event types, 500 when processing fails.",
    "app/store.py",
    "  Store(path: str): opens SQLite with isolation_level=None and timeout=1.0 and creates SCHEMA.",
    "    transaction(): context manager that runs BEGIN IMMEDIATE, then COMMIT, or ROLLBACK on an exception. Yields the connection.",
    "    ledger_for(customer_id) -> list[dict], outbox_for(recipient) -> list[dict], close().",
    "app/signing.py",
    "  sign(secret: bytes, body: bytes) -> str and verify(secret, body, signature) -> bool (HMAC-SHA256, hex).",
    "Event body: {\"id\", \"type\", \"created\", \"data\": {\"payment_id\", \"customer_id\", \"amount_cents\", \"currency\", \"receipt_email\"}}.",
  ].join("\n"),
  acceptanceCriteria: [
    {
      id: "AC-1",
      capability: "correctness",
      text: "A redelivery of an already processed event (same event id, any X-Delivery-Id) does not credit the ledger again or queue another receipt, including when it is handled by a different receiver instance or after a process restart, and it responds with a 2xx.",
    },
    {
      id: "AC-2",
      capability: "reliability",
      text: "If processing fails partway (for example the receipt cannot be queued), nothing from that event is committed and it is not treated as processed, so a later redelivery processes it exactly once.",
    },
    { id: "AC-3", capability: "correctness", text: "Deliveries with an invalid signature are rejected with 401 and change nothing." },
    {
      id: "AC-4",
      capability: "correctness",
      text: "Distinct events are each processed, even when customer, amount and payment details are identical (deduplication is keyed on the event id).",
    },
  ],
  coworkers: [],
};

const TESTS: TestsStage = {
  publicTests: {
    file: { path: "tests/test_public.py", content: TEST_PUBLIC },
    tests: [
      { name: "PublicTests.test_retry_on_another_worker_is_not_credited_twice", criterionIds: ["AC-1"] },
      { name: "PublicTests.test_invalid_signature_is_rejected", criterionIds: ["AC-3"] },
      { name: "PublicTests.test_new_event_is_processed_once", criterionIds: ["AC-4"] },
    ],
  },
  evaluationTests: {
    file: { path: "tests/test_evaluation.py", content: TEST_EVALUATION },
    tests: [
      { name: "EvaluationTests.test_redelivery_after_restart_in_fresh_process_is_not_processed_again", criterionIds: ["AC-1"] },
      { name: "EvaluationTests.test_retry_with_new_delivery_id_and_attempt_is_deduplicated", criterionIds: ["AC-1"] },
      { name: "EvaluationTests.test_duplicate_is_acknowledged_with_2xx", criterionIds: ["AC-1"] },
      { name: "EvaluationTests.test_failure_while_queueing_receipt_commits_nothing", criterionIds: ["AC-2"] },
      { name: "EvaluationTests.test_redelivery_after_failure_processes_exactly_once", criterionIds: ["AC-2"] },
      { name: "EvaluationTests.test_distinct_events_with_identical_payment_details_are_each_processed", criterionIds: ["AC-4"] },
      { name: "EvaluationTests.test_invalid_signature_changes_nothing_and_does_not_block_the_real_event", criterionIds: ["AC-3"] },
    ],
  },
  incorrectSolutions: [
    {
      description: "Persists deduplication keyed on X-Delivery-Id. Every retry has a new delivery id, so retries are processed again.",
      files: [
        { path: "app/store.py", content: REFERENCE_STORE },
        { path: "app/receiver.py", content: WRONG_DELIVERY_ID_RECEIVER },
      ],
    },
    {
      description: "Deduplicates on customer, amount and payment id instead of the event id, so a distinct event with identical details is dropped.",
      files: [
        { path: "app/store.py", content: REFERENCE_STORE },
        { path: "app/receiver.py", content: WRONG_PAYMENT_KEY_RECEIVER },
      ],
    },
    {
      description: "Marks the event processed in its own transaction before crediting, and still commits the credit and the receipt separately, so a failure leaves a credit behind and blocks the retry.",
      files: [
        { path: "app/store.py", content: REFERENCE_STORE },
        { path: "app/receiver.py", content: WRONG_MARK_FIRST_RECEIVER },
      ],
    },
    {
      description: "Moves the seen-set to a module-level global and commits atomically. It survives a second receiver in the same process but not a worker restart.",
      files: [{ path: "app/receiver.py", content: WRONG_MODULE_GLOBAL_RECEIVER }],
    },
  ],
};

const CODE = {
  starterFiles: [
    { path: "README.md", content: STARTER_README },
    { path: "app/__init__.py", content: STARTER_INIT },
    { path: "app/signing.py", content: STARTER_SIGNING },
    { path: "app/store.py", content: STARTER_STORE },
    { path: "app/receiver.py", content: STARTER_RECEIVER },
    { path: "scripts/replay_incident.py", content: STARTER_REPLAY },
    { path: FIXTURE_PATH, content: STARTER_FIXTURE },
    { path: "tests/helpers.py", content: TEST_HELPERS },
  ],
  referenceFiles: [
    { path: "app/store.py", content: REFERENCE_STORE },
    { path: "app/receiver.py", content: REFERENCE_RECEIVER },
  ],
  approaches: [
    "Add a processed_events(event_id PRIMARY KEY) table. In handle, inside one store.transaction(): INSERT OR IGNORE the event id; if rowcount is 0 return 200 \"duplicate\"; otherwise credit the ledger and insert the outbox row in the same transaction. Any exception rolls everything back and returns 500. Remove the in-memory set.",
    "Add a unique index on ledger_entries.reference (which holds the event id) and do the ledger insert and the outbox insert in one transaction, treating sqlite3.IntegrityError on the ledger insert as a duplicate that returns 2xx.",
    "Inside one BEGIN IMMEDIATE transaction, SELECT from a processed table and return 2xx if the event id is present; otherwise insert the marker, the credit and the receipt before COMMIT. BEGIN IMMEDIATE serializes writers across worker processes, so the check and the insert cannot interleave.",
    "Starter defect: processed ids live in the per-instance, in-memory self._seen set, so a retry on another worker or after a restart credits again (AC-1). _credit and _queue_receipt commit in separate transactions, so a receipt failure leaves the credit committed while returning 500 (AC-2).",
  ],
};

const COWORKERS: ScenarioPackage["coworkers"] = [
  {
    id: "lead",
    name: "Dana Okafor",
    title: "Engineering lead, Payments platform",
    responsibilities: "Owns the webhook delivery contract with the provider, the receiver's architecture and its API constraints.",
    topics: ["delivery contract", "retries", "schema changes", "workers and deploys", "scope"],
    tone: "Brief and precise. Answers exactly what was asked.",
    boundaries: "Explains the delivery contract and the constraints, but will not choose or write the fix. Does not know individual customer details.",
  },
  {
    id: "support",
    name: "Leah Moreno",
    title: "Support engineer",
    responsibilities: "Handles customer reports and incident timelines, and reads the request logs.",
    topics: ["customer impact", "incident timeline", "logs", "past incidents"],
    tone: "Friendly and concrete. Quotes what customers and the logs said.",
    boundaries: "Knows what customers reported and what the logs showed. Does not know the code and will not suggest a fix.",
  },
];

const COWORKER_FACTS: ProtectedMaterials["coworkerFacts"] = {
  lead: [
    {
      id: "lead-f1",
      text: "Retries reuse the original event id in the body. X-Delivery-Id is new on every attempt and X-Delivery-Attempt goes up by one each time. The event id is the only stable identity.",
      topics: ["retry", "event id", "delivery id", "idempotency"],
    },
    {
      id: "lead-f2",
      text: "A 2xx means we accept responsibility for the event. We must answer within 5 seconds. Acknowledging before the work is committed is not acceptable here, because the work would be lost if the worker crashed.",
      topics: ["acknowledge", "ack", "respond before", "timeout", "5 seconds"],
    },
    {
      id: "lead-f3",
      text: "An additive change inside Store's SCHEMA is fine: a new table or index created with IF NOT EXISTS. Do not change existing columns, and there is no separate migration tool.",
      topics: ["schema", "migration", "table", "column"],
    },
    {
      id: "lead-f4",
      text: "Several worker processes share one SQLite file, and every deploy restarts all of them. Nothing kept in process memory survives a deploy or is visible to the other workers.",
      topics: ["workers", "restart", "deploy", "processes", "in-memory"],
    },
    {
      id: "lead-f5",
      text: "Moving processing to an async queue is out of scope for this change. Keep handling the event inside the request.",
      topics: ["queue", "async", "background"],
    },
  ],
  support: [
    {
      id: "support-f1",
      text: "The customer on cus_harbor_lane_coffee got two receipts for one 129.00 payment, and their balance showed the credit twice. Logs show the first attempt took 6.2 seconds on worker-1 and timed out at the provider. The retry 40 seconds later was handled by worker-2.",
      topics: ["observed", "customer", "duplicate", "logs", "which failure", "incident"],
    },
    {
      id: "support-f2",
      text: "Last month, while the mail queue was down, one delivery got a 500 from us and the provider retried it after the queue recovered. That customer received only one receipt, but finance found their account had been credited twice for the payment.",
      topics: ["mail", "outage", "500", "failure", "receipt"],
    },
    {
      id: "support-f3",
      text: "I don't know the code, sorry. Dana can tell you how the receiver is meant to behave.",
      topics: ["code", "fix"],
    },
  ],
};

const RUBRIC_NOTES: ProtectedMaterials["rubricNotes"] = {
  "CR-1": "Strong submissions key deduplication on the event id and persist it in the shared database, so it holds across workers and restarts. Delivery-id keys, payload keys and in-process or module-level sets are the common wrong turns; the evaluation tests catch each one.",
  "CR-2": "Look for the processed marker, the ledger credit and the outbox insert being committed in one transaction, or an equivalent unique-constraint design. Marking an event processed before the work commits, or committing the credit separately from the receipt, duplicates or loses work when a step fails.",
  "CR-3": "A useful regression test reproduces the cross-worker retry (two Store instances on one database file) or a restart, and ideally the partial-failure case. A test that only reuses one receiver instance passes on the original code and does not demonstrate the fix.",
};

function fixedSections(): ScenarioPackage["provenance"]["sections"] {
  const out = {} as ScenarioPackage["provenance"]["sections"];
  for (const s of SECTIONS) out[s] = { revision: 1, editedBy: "author", updatedAt: AUTHORED_AT };
  return out;
}

/** The hand-authored engineering incident work sample. Deterministic: no clock or randomness. */
export function buildWebhookDedupePackage(): { pkg: ScenarioPackage; prot: ProtectedMaterials } {
  const built = assemble(config(), BRIEF, CODE, TESTS, null, "template");
  const pkg: ScenarioPackage = {
    ...built.pkg,
    setupInstructions: [
      "Install Python 3.12 or newer. No packages are needed.",
      "Download the starter project and open it in your editor.",
      "From the project root, run the reproduction: python scripts/replay_incident.py",
      `Run the public tests: ${built.pkg.environment.testCommand} (use python instead of python3 on Windows). One public test fails on the starter project because it reproduces the incident.`,
    ],
    fixturePaths: [FIXTURE_PATH],
    coworkers: COWORKERS,
    submission: {
      requirements: [
        "Submit the project with your changes under app/ and the tests you added.",
        "Include a regression test in tests/ that fails on the original code and passes with your change.",
        "Keep the public tests in tests/test_public.py passing.",
        "Answer the three handoff questions.",
      ],
      handoffPrompts: [
        { id: "what_changed", label: "What did you change?", help: "The cause you found, the files you changed and the behavior that changed." },
        { id: "how_checked", label: "How did you check it?", help: "Tests you added or ran, and anything you verified by hand." },
        { id: "unresolved", label: "What remains unresolved?", help: "Risks, assumptions and anything you would do next." },
      ],
    },
    accommodations: ["Extra time can be granted per invitation. Ask the hiring team before you start.", "Screen readers and keyboard-only use are supported in the browser workspace."],
    reviewQuestion: {
      coworkerId: "lead",
      text: "Before you hand this off: if a worker crashes after crediting the ledger but before the receipt is queued, what happens with your change when the provider retries that event?",
    },
    interruptionPolicy: "Requirements will not change during the task. Dana may ask one question about your change near the end; nothing else will interrupt you. The timer keeps running if you step away or lose your connection; your saved files stay in the workspace, so reopen the invitation link to continue.",
    feedbackPolicy: "When the hiring team releases your report, you can see which acceptance criteria the tests confirmed and how each criterion was judged. Hidden test code is not shared. A reviewer reads your regression tests and your handoff.",
    provenance: { path: "template", model: null, generatedAt: AUTHORED_AT, sections: fixedSections() },
  };
  const prot: ProtectedMaterials = { ...built.prot, coworkerFacts: COWORKER_FACTS, rubricNotes: RUBRIC_NOTES };
  return { pkg, prot };
}
