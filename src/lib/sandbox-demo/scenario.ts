import type { TestMeta } from "./types";

/**
 * A demo-safe synthetic scenario. Lumen Ledger is fictional and none of this
 * content is used in a real hiring simulation. The task is small on purpose:
 * three source files, plain modern JavaScript, no dependencies, so it runs in
 * a browser Web Worker.
 */

export const SCENARIO_ID = "demo-event-inbox";
export const SCENARIO_VERSION = "1.0.0";
export const SCENARIO_TITLE = "Payment events go missing after a timeout";
export const COMPANY = "Lumen Ledger";
export const SUGGESTED_MINUTES = 45;

export const PUBLIC_TEST_FILE = "test/inbox.test.js";
export const PROTECTED_TEST_FILE = "test/inbox.protected.test.js";

const README = `# Event inbox

The inbox receives payment events from our providers and hands each one to a
handler. Providers redeliver events they are not sure we received, so the
same event can arrive more than once.

## Public API (keep it unchanged)

createInbox({ handler, store, maxAttempts })
  enqueue(event)   event: { source, id, type, payload }
  drain()          returns [{ id, source, status, error }]
                   status is "processed", "duplicate" or "failed"
                   error is present only when status is "failed"
  size()           number of events still waiting

maxAttempts defaults to 3 and counts every call to the handler,
including the first one.

## Files

src/inbox.js        the inbox
src/event-key.js    how two deliveries are recognised as the same event
src/seen-store.js   remembers which events were handled
test/inbox.test.js  public tests
`;

const EVENT_KEY = `// Two providers can reuse the same id, so the source is part of the key.
function eventKey(event) {
  if (!event || typeof event.id !== "string" || typeof event.source !== "string") {
    throw new TypeError("event needs a string source and id");
  }
  return event.source + ":" + event.id;
}

module.exports = { eventKey };
`;

const SEEN_STORE = `// In production this is a table with a unique key on the event key.
// The task keeps it in memory with the same three methods.
function createSeenStore() {
  const keys = new Set();
  return {
    has(key) {
      return keys.has(key);
    },
    add(key) {
      keys.add(key);
    },
    remove(key) {
      keys.delete(key);
    },
  };
}

module.exports = { createSeenStore };
`;

const INBOX_STARTER = `const { eventKey } = require("./event-key.js");
const { createSeenStore } = require("./seen-store.js");

function createInbox({ handler, store = createSeenStore(), maxAttempts = 3 }) {
  if (typeof handler !== "function") {
    throw new TypeError("handler must be a function");
  }
  const pending = [];

  function enqueue(event) {
    pending.push({ event, key: eventKey(event), attempts: 0 });
  }

  function drain() {
    const results = [];
    while (pending.length > 0) {
      const item = pending.shift();
      const { id, source } = item.event;

      if (store.has(item.key)) {
        results.push({ id, source, status: "duplicate" });
        continue;
      }

      // Claim the event so a redelivery in the same batch is skipped.
      store.add(item.key);

      try {
        handler(item.event);
        results.push({ id, source, status: "processed" });
      } catch (error) {
        item.attempts += 1;
        if (item.attempts < maxAttempts) {
          pending.push(item);
        } else {
          results.push({ id, source, status: "failed", error: error.message });
        }
      }
    }
    return results;
  }

  return { enqueue, drain, size: () => pending.length };
}

module.exports = { createInbox };
`;

const INBOX_REFERENCE = `const { eventKey } = require("./event-key.js");
const { createSeenStore } = require("./seen-store.js");

function createInbox({ handler, store = createSeenStore(), maxAttempts = 3 }) {
  if (typeof handler !== "function") {
    throw new TypeError("handler must be a function");
  }
  const pending = [];

  function enqueue(event) {
    pending.push({ event, key: eventKey(event), attempts: 0 });
  }

  function drain() {
    const results = [];
    while (pending.length > 0) {
      const item = pending.shift();
      const { id, source } = item.event;

      if (store.has(item.key)) {
        results.push({ id, source, status: "duplicate" });
        continue;
      }

      try {
        handler(item.event);
        // Only a handled event counts as seen, so a failed attempt can be
        // retried and a later redelivery of a failed event is processed.
        store.add(item.key);
        results.push({ id, source, status: "processed" });
      } catch (error) {
        item.attempts += 1;
        if (item.attempts < maxAttempts) {
          pending.push(item);
        } else {
          const message = error && error.message ? error.message : String(error);
          results.push({ id, source, status: "failed", error: message });
        }
      }
    }
    return results;
  }

  return { enqueue, drain, size: () => pending.length };
}

module.exports = { createInbox };
`;

/** Plausible but wrong: retries skip the duplicate check, so a failed event stays claimed forever. */
const INBOX_INCORRECT = `const { eventKey } = require("./event-key.js");
const { createSeenStore } = require("./seen-store.js");

function createInbox({ handler, store = createSeenStore(), maxAttempts = 3 }) {
  if (typeof handler !== "function") {
    throw new TypeError("handler must be a function");
  }
  const pending = [];

  function enqueue(event) {
    pending.push({ event, key: eventKey(event), attempts: 0 });
  }

  function drain() {
    const results = [];
    while (pending.length > 0) {
      const item = pending.shift();
      const { id, source } = item.event;

      // Retries were claimed by this inbox already, so only check new deliveries.
      if (item.attempts === 0 && store.has(item.key)) {
        results.push({ id, source, status: "duplicate" });
        continue;
      }

      // Claim the event so a redelivery in the same batch is skipped.
      store.add(item.key);

      try {
        handler(item.event);
        results.push({ id, source, status: "processed" });
      } catch (error) {
        item.attempts += 1;
        if (item.attempts < maxAttempts) {
          pending.push(item);
        } else {
          results.push({ id, source, status: "failed", error: error.message });
        }
      }
    }
    return results;
  }

  return { enqueue, drain, size: () => pending.length };
}

module.exports = { createInbox };
`;

const PUBLIC_TESTS = `const { createInbox } = require("../src/inbox.js");

function event(id, source = "stripe") {
  return { source, id, type: "payment.succeeded", payload: { amount: 1200 } };
}

test("processes a new event once", () => {
  const seen = [];
  const inbox = createInbox({ handler: (e) => seen.push(e.id) });
  inbox.enqueue(event("evt_1"));
  assert.deepEqual(inbox.drain(), [{ id: "evt_1", source: "stripe", status: "processed" }]);
  assert.deepEqual(seen, ["evt_1"]);
});

test("skips a redelivered event with the same source and id", () => {
  const seen = [];
  const inbox = createInbox({ handler: (e) => seen.push(e.id) });
  inbox.enqueue(event("evt_1"));
  inbox.enqueue(event("evt_1"));
  assert.deepEqual(inbox.drain().map((r) => r.status), ["processed", "duplicate"]);
  assert.equal(seen.length, 1);
});

test("retries an event after a temporary handler failure", () => {
  let calls = 0;
  const inbox = createInbox({
    handler: () => {
      calls += 1;
      if (calls === 1) throw new Error("timeout");
    },
  });
  inbox.enqueue(event("evt_2"));
  assert.deepEqual(inbox.drain(), [{ id: "evt_2", source: "stripe", status: "processed" }]);
  assert.equal(calls, 2);
});

test("leaves nothing pending after drain", () => {
  const inbox = createInbox({ handler: () => {} });
  inbox.enqueue(event("evt_3"));
  inbox.enqueue(event("evt_4"));
  inbox.drain();
  assert.equal(inbox.size(), 0);
});
`;

const PROTECTED_TESTS = `const { createInbox } = require("../src/inbox.js");

function event(id, source = "stripe") {
  return { source, id, type: "payment.succeeded", payload: { amount: 1200 } };
}

test("treats the same id from different sources as separate events", () => {
  const seen = [];
  const inbox = createInbox({ handler: (e) => seen.push(e.source + ":" + e.id) });
  inbox.enqueue(event("evt_9", "stripe"));
  inbox.enqueue(event("evt_9", "adyen"));
  assert.deepEqual(inbox.drain().map((r) => r.status), ["processed", "processed"]);
  assert.deepEqual(seen, ["stripe:evt_9", "adyen:evt_9"]);
});

test("reports an event as failed after maxAttempts attempts, with the last error", () => {
  let calls = 0;
  const inbox = createInbox({
    maxAttempts: 3,
    handler: () => {
      calls += 1;
      throw new Error("attempt " + calls + " timed out");
    },
  });
  inbox.enqueue(event("evt_5"));
  assert.deepEqual(inbox.drain(), [
    { id: "evt_5", source: "stripe", status: "failed", error: "attempt 3 timed out" },
  ]);
  assert.equal(calls, 3);
});

test("processes a later redelivery of an event that failed every attempt", () => {
  let healthy = false;
  const inbox = createInbox({
    maxAttempts: 2,
    handler: () => {
      if (!healthy) throw new Error("downstream unavailable");
    },
  });
  inbox.enqueue(event("evt_6"));
  assert.equal(inbox.drain()[0].status, "failed");
  healthy = true;
  inbox.enqueue(event("evt_6"));
  assert.deepEqual(inbox.drain(), [{ id: "evt_6", source: "stripe", status: "processed" }]);
});

test("skips a redelivery after a retry succeeded", () => {
  let calls = 0;
  const inbox = createInbox({
    handler: () => {
      calls += 1;
      if (calls === 1) throw new Error("timeout");
    },
  });
  inbox.enqueue(event("evt_7"));
  inbox.drain();
  inbox.enqueue(event("evt_7"));
  assert.deepEqual(inbox.drain().map((r) => r.status), ["duplicate"]);
  assert.equal(calls, 2);
});
`;

export type TaskFile = {
  path: string;
  editable: boolean;
  language: "javascript" | "markdown";
};

/** Files the candidate sees, in tree order. Protected tests are never in this list. */
export const CANDIDATE_FILES: TaskFile[] = [
  { path: "README.md", editable: false, language: "markdown" },
  { path: "src/inbox.js", editable: true, language: "javascript" },
  { path: "src/event-key.js", editable: true, language: "javascript" },
  { path: "src/seen-store.js", editable: true, language: "javascript" },
  { path: PUBLIC_TEST_FILE, editable: false, language: "javascript" },
];

export const EDITABLE_PATHS = CANDIDATE_FILES.filter((f) => f.editable).map((f) => f.path);

export const STARTER_FILES: Record<string, string> = {
  "README.md": README,
  "src/inbox.js": INBOX_STARTER,
  "src/event-key.js": EVENT_KEY,
  "src/seen-store.js": SEEN_STORE,
  [PUBLIC_TEST_FILE]: PUBLIC_TESTS,
};

export const PROTECTED_FILES: Record<string, string> = {
  [PROTECTED_TEST_FILE]: PROTECTED_TESTS,
};

export type SolutionId = "starter" | "reference" | "incorrect";

export const SOLUTIONS: Record<SolutionId, { label: string; description: string; files: Record<string, string> }> = {
  starter: {
    label: "Starter code",
    description: "What the candidate receives. The targeted tests should fail here, which shows the issue reproduces.",
    files: { "src/inbox.js": INBOX_STARTER, "src/event-key.js": EVENT_KEY, "src/seen-store.js": SEEN_STORE },
  },
  reference: {
    label: "Reference solution",
    description: "Marks an event as seen only after the handler succeeds. Every test should pass.",
    files: { "src/inbox.js": INBOX_REFERENCE, "src/event-key.js": EVENT_KEY, "src/seen-store.js": SEEN_STORE },
  },
  incorrect: {
    label: "Representative incorrect solution",
    description:
      "Lets retries skip the duplicate check but still claims the event before the handler runs. It passes the public tests, so the protected tests have to catch it.",
    files: { "src/inbox.js": INBOX_INCORRECT, "src/event-key.js": EVENT_KEY, "src/seen-store.js": SEEN_STORE },
  },
};

export const TESTS: TestMeta[] = [
  {
    id: "public.processes_once",
    name: "processes a new event once",
    file: PUBLIC_TEST_FILE,
    visibility: "public",
    requirement: "A new event is handed to the handler once and reported as processed.",
    targetsIssue: false,
  },
  {
    id: "public.skips_redelivery",
    name: "skips a redelivered event with the same source and id",
    file: PUBLIC_TEST_FILE,
    visibility: "public",
    requirement: "A redelivered event is reported as a duplicate and not handled again.",
    targetsIssue: false,
  },
  {
    id: "public.retries_after_failure",
    name: "retries an event after a temporary handler failure",
    file: PUBLIC_TEST_FILE,
    visibility: "public",
    requirement: "A temporary handler failure is retried and the event ends up processed.",
    targetsIssue: true,
  },
  {
    id: "public.nothing_pending",
    name: "leaves nothing pending after drain",
    file: PUBLIC_TEST_FILE,
    visibility: "public",
    requirement: "drain() empties the queue.",
    targetsIssue: false,
  },
  {
    id: "protected.sources_distinct",
    name: "treats the same id from different sources as separate events",
    file: PROTECTED_TEST_FILE,
    visibility: "protected",
    requirement: "Events from different providers that share an id are handled as separate events.",
    targetsIssue: false,
  },
  {
    id: "protected.fails_after_max_attempts",
    name: "reports an event as failed after maxAttempts attempts, with the last error",
    file: PROTECTED_TEST_FILE,
    visibility: "protected",
    requirement: "An event that keeps failing is attempted maxAttempts times, then reported as failed with the last error.",
    targetsIssue: true,
  },
  {
    id: "protected.redelivery_after_failure",
    name: "processes a later redelivery of an event that failed every attempt",
    file: PROTECTED_TEST_FILE,
    visibility: "protected",
    requirement: "An event that failed every attempt is processed when the provider redelivers it later.",
    targetsIssue: true,
  },
  {
    id: "protected.no_rehandle_after_retry",
    name: "skips a redelivery after a retry succeeded",
    file: PROTECTED_TEST_FILE,
    visibility: "protected",
    requirement: "Once a retry succeeds, a later redelivery of that event is a duplicate.",
    targetsIssue: true,
  },
];

export const PUBLIC_TESTS_META = TESTS.filter((t) => t.visibility === "public");

export function testMeta(id: string): TestMeta | undefined {
  return TESTS.find((t) => t.id === id);
}

export type Requirement = { id: string; text: string; testIds: string[] };

/** The acceptance criteria in the brief, each with the tests that check it. */
export const REQUIREMENTS: Requirement[] = [
  {
    id: "R1",
    text: "Each event is processed at most once, even when the provider sends it again.",
    testIds: ["public.skips_redelivery", "protected.no_rehandle_after_retry"],
  },
  {
    id: "R2",
    text: "Events from different sources that share an id are separate events.",
    testIds: ["protected.sources_distinct"],
  },
  {
    id: "R3",
    text: "A temporary handler failure is retried, up to maxAttempts attempts in total.",
    testIds: ["public.retries_after_failure", "protected.fails_after_max_attempts"],
  },
  {
    id: "R4",
    text: "An event that fails every attempt is reported as failed with the last error, and a later redelivery of it is processed.",
    testIds: ["protected.fails_after_max_attempts", "protected.redelivery_after_failure"],
  },
  {
    id: "R5",
    text: "The public API and the result shape stay the same.",
    testIds: ["public.processes_once", "public.nothing_pending"],
  },
];

export type Criterion = {
  id: string;
  title: string;
  capability: string;
  whyItMatters: string;
  observableEvidence: string;
  anchors: { concern: string; partial: string; demonstrated: string };
  insufficientEvidence: string;
  testIds: string[];
  files: string[];
  followUpQuestion: string;
  /** Present when the demo cannot assess the criterion at all. */
  notAssessedReason?: string;
};

export const CRITERIA: Criterion[] = [
  {
    id: "retry",
    title: "Recovers from temporary failures",
    capability: "Failure handling",
    whyItMatters: "Payment providers time out. An inbox that drops an event after one failure loses money movements silently.",
    observableEvidence: "A failing handler is retried, the attempt count is bounded by maxAttempts, and the final failure carries the last error.",
    anchors: {
      concern: "Retries are still swallowed or unbounded: the retry tests fail.",
      partial: "Retries happen, but the attempt limit or the reported error does not match the contract.",
      demonstrated: "Retries happen up to the limit and a final failure is reported with the last error.",
    },
    insufficientEvidence: "No change to the retry path, or the tests could not run to completion.",
    testIds: ["public.retries_after_failure", "protected.fails_after_max_attempts"],
    files: ["src/inbox.js"],
    followUpQuestion: "Walk me through what happens, attempt by attempt, when the handler fails three times in a row.",
  },
  {
    id: "idempotency",
    title: "Keeps processing idempotent",
    capability: "Idempotency",
    whyItMatters: "Duplicates are how providers guarantee delivery. Handling one twice can double a charge; dropping a retry loses one.",
    observableEvidence: "Duplicates are skipped by source and id, a failed event is not left marked as seen, and a successful retry is not handled again.",
    anchors: {
      concern: "Duplicates are handled twice, or events stay marked as seen after failing.",
      partial: "Most duplicate cases work, but at least one requirement about when an event counts as seen fails.",
      demonstrated: "An event counts as seen only after it was handled, across retries and later redeliveries.",
    },
    insufficientEvidence: "The duplicate-related tests did not run, or no change was made to when events are marked as seen.",
    testIds: [
      "public.skips_redelivery",
      "protected.sources_distinct",
      "protected.redelivery_after_failure",
      "protected.no_rehandle_after_retry",
    ],
    files: ["src/inbox.js", "src/event-key.js", "src/seen-store.js"],
    followUpQuestion: "If an event fails every attempt and the provider redelivers it an hour later, what does your inbox do, and why?",
  },
  {
    id: "contract",
    title: "Preserves the public contract",
    capability: "API stewardship",
    whyItMatters: "Other services read drain() results. Changing names or shapes breaks them even when the bug is fixed.",
    observableEvidence: "createInbox, enqueue, drain and size keep their behavior and result shape.",
    anchors: {
      concern: "The result shape or the queue behavior changed.",
      partial: "Most of the contract holds, with one visible change.",
      demonstrated: "The contract tests pass unchanged.",
    },
    insufficientEvidence: "The contract tests could not run.",
    testIds: ["public.processes_once", "public.nothing_pending"],
    files: ["src/inbox.js"],
    followUpQuestion: "Which parts of the inbox's behavior did you treat as fixed, and how did you check you kept them?",
  },
  {
    id: "reasoning",
    title: "Explains the tradeoff",
    capability: "Technical communication",
    whyItMatters: "Marking an event as seen after the handler means a crash between the two can handle it twice. A good engineer names that.",
    observableEvidence: "A handoff answer or a team message that names the at-least-once versus at-most-once tradeoff.",
    anchors: {
      concern: "The explanation is missing or contradicts the code.",
      partial: "The fix is described but the tradeoff is not named.",
      demonstrated: "The tradeoff and its consequence for the handler are stated plainly.",
    },
    insufficientEvidence: "No handoff answer or team message was written.",
    testIds: [],
    files: [],
    followUpQuestion: "What can still go wrong if the process crashes after the handler succeeds but before the event is marked as seen?",
    notAssessedReason: "Read by the reviewer; Fydell does not score writing. The candidate's handoff answers and team messages are shown as written.",
  },
];

export type Coworker = {
  id: string;
  name: string;
  title: string;
  initials: string;
  knows: string[];
  wontShare: string;
};

export const COWORKERS: Coworker[] = [
  {
    id: "dana",
    name: "Dana Okafor",
    title: "Engineering lead",
    initials: "DO",
    knows: [
      "The inbox's public contract and which services read drain() results.",
      "Why the source is part of the event key.",
      "That no new infrastructure is allowed for this change.",
    ],
    wontShare: "The protected tests or how the submission is reviewed.",
  },
  {
    id: "theo",
    name: "Theo Lindqvist",
    title: "Support engineer",
    initials: "TL",
    knows: [
      "Which merchants reported missing payments and when.",
      "That the missing events all had a provider timeout first.",
    ],
    wontShare: "Anything about the code. Theo is not an engineer on this team.",
  },
];

export const BRIEF = {
  title: SCENARIO_TITLE,
  company: COMPANY,
  context: [
    "Lumen Ledger records payments for small merchants. Payment events arrive from two providers and go through an inbox that hands each event to a handler, which writes it to the merchant's ledger.",
    "Providers redeliver events they are not sure we received, so the inbox skips duplicates. Last week several merchants reported payments missing from their ledgers. Support traced each one to a delivery where the handler had timed out the first time.",
    "Find out why those events were lost, fix the inbox, and keep everything else about it working.",
  ],
  constraints: [
    "Keep the public API and the result shape described in README.md.",
    "No new infrastructure. Use the seen store's existing has, add and remove methods.",
    "Plain JavaScript, no dependencies.",
  ],
  aiPolicy: "AI assistants are allowed. Say in your submission what you used them for.",
};

export type CreatorPackageSummary = {
  scenarioVersion: string;
  seed: string;
  engineVersion: string;
};

export const PACKAGE_META: CreatorPackageSummary = {
  scenarioVersion: SCENARIO_VERSION,
  seed: "lumen-inbox-0412",
  engineVersion: "demo-1",
};
