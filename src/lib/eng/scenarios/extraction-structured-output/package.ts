import "server-only";
import { assemble, type BriefStage, type TestsStage } from "../../authoring/generate";
import { SECTIONS, type ProtectedMaterials, type ScenarioPackage } from "../../authoring/package";
import { DEFAULT_INPUT, parseInput, validateConfig, type AuthoringConfig, type AuthoringInput } from "../../authoring/registry";
import {
  FIXTURE_DOCUMENTS,
  FIXTURE_RESPONSES,
  REFERENCE_INTAKE,
  REFERENCE_VALIDATE,
  STARTER_INTAKE,
  STARTER_PROMPT,
  STARTER_README,
  STARTER_RECORDED_TRANSPORT,
  STARTER_REPLAY,
  STARTER_SCHEMA,
  STARTER_STORE,
  TEST_EVALUATION,
  TEST_PUBLIC,
  WRONG_IGNORES_RETRY_AFTER_INTAKE,
  WRONG_RETRIES_4XX_INTAKE,
  WRONG_TYPE_ONLY_VALIDATE,
  WRONG_UNBOUNDED_429_INTAKE,
  WRONG_UNSAFE_REPAIR_VALIDATE,
} from "./files";

export const EXTRACTION_SEED_MARKER = "fydell-template:extraction-structured-output:v1";
const AUTHORED_AT = "2026-10-07T00:00:00.000Z";
const DOCUMENTS_PATH = "fixtures/documents.json";
const RESPONSES_PATH = "fixtures/recorded_responses.json";

/** The creator-form input this sample corresponds to; stored with the draft. */
export const EXTRACTION_INPUT: AuthoringInput = {
  ...DEFAULT_INPUT,
  family: "applied_ai_engineer",
  specialization: "general",
  level: "mid",
  language: "javascript",
  framework: "none",
  database: "in-memory",
  technologies: ["recorded-model-outputs", "json", "validation", "retries"],
  taskType: "debugging",
  capabilities: ["correctness", "reliability", "testing", "technical_judgment"],
  taskMinutes: 60,
  setupMinutes: 10,
  aiPolicy: "assistants_disclosed",
  startingMaterial: "uploaded",
  description:
    "A freight company's document intake pipeline asks an extraction provider to return shipment fields as JSON and stores the result for billing and dispatch. A nightly batch crashed on a code-fenced response, and a manual rerun stored invalid records and failed on every provider error. Using recorded provider responses that include code-fenced, truncated, incomplete, wrongly typed and out-of-range output, rate limiting with a retry-after header, server errors and timeouts, the candidate validates every response against the documented schema, repairs only the safe cases, retries with a bounded policy that honors retry-after through an injected sleep, and sends anything unrecoverable to manual review with a reason. No model is called; every response is recorded.",
  outcomes: [
    "Valid records are stored with exactly the schema fields, and no invalid record is ever stored.",
    "Provider failures are retried within a bounded policy, and unrecoverable documents go to manual review with a reason.",
  ],
  constraints: ["Standard library only.", "Keep the createIntake interface and its injected dependencies.", "Use only recorded responses."],
  outOfScope: ["Calling the provider or changing the prompt.", "Changing the schema.", "Persisting records outside memory."],
  confirmedAssumptions: ["synthetic_data"],
};

function config(): AuthoringConfig {
  const { input, invalid } = parseInput(EXTRACTION_INPUT);
  const v = validateConfig(input, invalid);
  if (!v.ok || !v.resolved) {
    const reasons = [...v.errors, ...v.conflicts].map((e) => e.message).concat(v.clarifications.map((c) => c.question), v.assumptions.map((a) => a.statement));
    throw new Error(`extraction-structured-output config does not validate: ${reasons.join(" | ")}`);
  }
  return v.resolved;
}

const BRIEF: BriefStage = {
  title: "Stop invalid extractions from reaching the shipment store",
  summary:
    "The intake pipeline stores whatever the extraction provider returns and crashes the nightly batch on the first provider error. Validate every response against the shipment schema, repair only the safe cases, retry provider failures within a bounded policy, and send unrecoverable documents to manual review with a reason.",
  context: [
    "Corvane Freight receives scanned bills of lading and delivery receipts from carriers. OCR turns each scan into text, and the intake pipeline in src/intake.js asks an extraction provider, a hosted language model behind an internal gateway, to return the shipment fields as one JSON object. Stored records feed billing and dispatch, which read exactly the fields documented in src/schema.js. Documents the pipeline cannot handle go to a manual review queue, where the intake team keys them in by hand.",
    "On the night of 2026-09-22 the batch stopped at its second document, whose response was wrapped in a code fence, and nothing after it was processed. The next morning the team pushed the remaining documents through one at a time: records reached the store with a weight of \"1,250 kg\" and without a hazmat flag, and every rate limit, server error or timeout threw instead of being retried. The gateway's responses for that batch were recorded in fixtures/recorded_responses.json, for the documents in fixtures/documents.json, and scripts/replay-batch.js replays them through the pipeline. README.md describes the gateway's response format.",
  ].join("\n\n"),
  task: [
    "Change the intake so that every provider response is validated against the schema before anything is stored, the safe repairs listed below are applied and nothing else is, provider failures are retried within the retry policy below, and every document ends up either stored or in manual review with a reason. You may add modules under src/.",
    "The rules below are the whole contract. Hidden tests use documents and responses that are not in the fixtures, so do not special-case document ids or recorded bodies, and do not edit the fixtures.",
    "Add regression tests under test/ for what you fix. Two simulated teammates can answer questions: Priya about the intake pipeline and its priorities, Joel about the documents and how manual review works. If something is still unclear, make a reasonable assumption and state it in your handoff.",
  ].join("\n\n"),
  outcomes: [
    "Replaying the recorded batch processes every document: valid records are stored and every other document is in manual review with a reason.",
    "No record that breaks a schema rule is ever stored, and values are never guessed.",
    "Provider failures are retried within the retry policy, waiting only through the injected sleep.",
    "A regression test in test/ fails on the original code and passes with your change.",
    "A short handoff explains what was wrong, what you changed, how you checked it, and what remains open.",
  ],
  constraints: [
    "Node.js standard library only. No npm packages and no calls to the provider: use the recorded responses.",
    "Keep createIntake({ transport, store, reviewQueue, sleep }) with processDocument(document) and runBatch(documents). Wait only by awaiting the injected sleep(ms); never use timers directly.",
    "Do not change the schema in src/schema.js or the request built in src/prompt.js.",
    "Do not special-case document ids or recorded bodies, and do not edit the fixtures.",
  ],
  outOfScope: [
    "Calling the provider, changing the prompt or asking the provider to correct its own output.",
    "Changing the shipment schema.",
    "Persisting records or the review queue outside memory.",
  ],
  optionalExtensions: ["If you have time, note in your handoff what you would track so the intake team can see when the provider's output quality drops."],
  interfaceSpec: [
    "src/intake.js",
    "  createIntake({ transport, store, reviewQueue, sleep }) -> { processDocument, runBatch }",
    "  processDocument(document) -> Promise<Result>. Result: { documentId, outcome: \"stored\" | \"manual_review\", attempts }. attempts is the number of transport.send calls made for the document.",
    "  runBatch(documents) -> Promise<Result[]>: one result per document, in input order. A failing document never stops the batch.",
    "Dependencies",
    "  transport.send({ documentId, prompt }) -> Promise<{ status, headers, body }>; rejects on a timeout or connection error. Header names are lowercase.",
    "  store.save(documentId, record): called only with a valid record.",
    "  reviewQueue.add({ documentId, reason, fields, attempts }). reason is \"invalid_json\", \"invalid_fields\" or \"provider_failed\". fields lists the missing or invalid field names for invalid_fields, in schema order, and is [] for the other reasons.",
    "  sleep(ms) -> Promise<void>",
    "Validation (src/schema.js lists the fields)",
    "  A 200 body must be one JSON object. The only repair to the body: a markdown code fence around the whole body, with or without a json tag and with surrounding whitespace, is removed. JSON with any other text around it, a truncated object, an array, null or an empty body is invalid_json.",
    "  The only repair to values: pieces given as a string of digits only (\"12\") and weight_kg given as digits with an optional decimal part (\"840.5\") become numbers.",
    "  Every required field must be present and not null. A missing delivery_date is stored as null.",
    "  shipment_id matches SHP- and 6 digits. carrier_scac is 2 to 4 uppercase letters. pickup_date is a real calendar date as YYYY-MM-DD. delivery_date is null or a real YYYY-MM-DD date that is not before pickup_date; when it is earlier, delivery_date is the invalid field. pieces is an integer from 1 to 999. weight_kg is a number greater than 0 and at most 30000. hazmat is a boolean.",
    "  Nothing else is converted: no units or thousands separators removed, no other date formats parsed, no text turned into booleans, no rounding and no clamping. Such values make the field invalid.",
    "  The stored record has exactly the schema fields; any other fields in the output are dropped.",
    "Retry policy",
    "  At most 3 transport.send calls per document. A 429, any 5xx status and a rejected send are retried. Any other non-200 status is final after one attempt. After the last allowed attempt, or a final status, the document goes to manual review as provider_failed.",
    "  Before retrying a 429 that has a retry-after header of whole seconds, wait that many seconds. Otherwise wait 1000 ms before the second attempt and 2000 ms before the third. Never wait after the last attempt.",
    "  A 200 whose body is invalid is not retried: it goes to manual review with the attempts used so far.",
  ].join("\n"),
  acceptanceCriteria: [
    {
      id: "AC-1",
      capability: "correctness",
      text: "A valid response, including one that only needs the documented safe repairs (a surrounding code fence, plain numeric strings for pieces and weight_kg), is stored once with exactly the schema fields: other fields are dropped and a missing delivery_date is null.",
    },
    {
      id: "AC-2",
      capability: "correctness",
      text: "A response that is not a JSON object, or that breaks any schema rule, is never stored and never guessed at: it goes to manual review as invalid_json, or as invalid_fields listing every missing or invalid field, and is not retried.",
    },
    {
      id: "AC-3",
      capability: "reliability",
      text: "429 responses, 5xx responses and rejected sends are retried with at most 3 attempts per document, any other non-200 status is not retried, and a document whose attempts fail goes to manual review as provider_failed with the number of attempts.",
    },
    {
      id: "AC-4",
      capability: "reliability",
      text: "Before a retry the intake waits through the injected sleep: the retry-after seconds for a 429 that has the header, otherwise 1000 ms before the second attempt and 2000 ms before the third, and never after the last attempt.",
    },
    {
      id: "AC-5",
      capability: "reliability",
      text: "runBatch processes every document even when some fail, returns one result per document in input order, and each result's outcome matches whether the record was stored or sent to manual review.",
    },
  ],
  coworkers: [],
};

const TESTS: TestsStage = {
  publicTests: {
    file: { path: "test/public.test.js", content: TEST_PUBLIC },
    tests: [
      { name: "nightly batch replay: every document gets a result and nothing invalid is stored", criterionIds: ["AC-2", "AC-3", "AC-5"] },
      { name: "a code-fenced response is stored as a clean record", criterionIds: ["AC-1"] },
      { name: "a rate-limited request is retried after the Retry-After delay", criterionIds: ["AC-4"] },
      { name: "a weight with units goes to manual review instead of the store", criterionIds: ["AC-2"] },
    ],
  },
  evaluationTests: {
    file: { path: "test/evaluation.test.js", content: TEST_EVALUATION },
    tests: [
      { name: "stores a valid response once, with exactly the schema fields", criterionIds: ["AC-1"] },
      { name: "repairs only a surrounding code fence and plain numeric strings", criterionIds: ["AC-1"] },
      { name: "output that is not a JSON object goes to manual review as invalid_json", criterionIds: ["AC-2"] },
      { name: "a missing or null required field is not filled in", criterionIds: ["AC-2"] },
      { name: "values that would need guessing are not repaired", criterionIds: ["AC-2"] },
      { name: "out-of-range and impossible values are not stored or clamped", criterionIds: ["AC-2"] },
      { name: "persistent rate limiting stops after three attempts and goes to manual review", criterionIds: ["AC-3"] },
      { name: "server errors and timeouts are retried, and a success on the third attempt is stored", criterionIds: ["AC-3"] },
      { name: "a 4xx response other than 429 is not retried", criterionIds: ["AC-3"] },
      { name: "a 429 waits for the Retry-After seconds before the next attempt", criterionIds: ["AC-4"] },
      { name: "server errors, timeouts and a 429 without Retry-After back off 1000 then 2000 ms, with no wait after the last attempt", criterionIds: ["AC-4"] },
      { name: "a batch continues past failing documents and returns one result per document in order", criterionIds: ["AC-5"] },
    ],
  },
  incorrectSolutions: [
    {
      description:
        "Retries a 429 for as long as the provider keeps rate limiting, honoring retry-after each time, on the reasoning that rate limiting is temporary. Server errors and timeouts are bounded. The recorded batch passes because its rate limit clears after one retry.",
      files: [
        { path: "src/validate.js", content: REFERENCE_VALIDATE },
        { path: "src/intake.js", content: WRONG_UNBOUNDED_429_INTAKE },
      ],
    },
    {
      description: "Bounds retries correctly but ignores retry-after and always uses the 1000 and 2000 ms backoff, so the gateway is hit again before the rate limit has cleared.",
      files: [
        { path: "src/validate.js", content: REFERENCE_VALIDATE },
        { path: "src/intake.js", content: WRONG_IGNORES_RETRY_AFTER_INTAKE },
      ],
    },
    {
      description:
        "Repairs too much: strips non-digit characters from numbers (\"1,250 kg\" becomes 1250), maps yes and no style strings to booleans, and converts US-style dates, so guessed values reach billing.",
      files: [
        { path: "src/validate.js", content: WRONG_UNSAFE_REPAIR_VALIDATE },
        { path: "src/intake.js", content: REFERENCE_INTAKE },
      ],
    },
    {
      description: "Checks presence and type of every field but none of the rules: a weight of 48000, zero pieces, an impossible date or a lowercase SCAC is stored.",
      files: [
        { path: "src/validate.js", content: WRONG_TYPE_ONLY_VALIDATE },
        { path: "src/intake.js", content: REFERENCE_INTAKE },
      ],
    },
    {
      description:
        "Retries every non-200 status up to 3 attempts, including 400 and 401 responses that will never succeed, wasting quota and delaying the batch. The recorded batch passes because its only 400 still ends in manual review.",
      files: [
        { path: "src/validate.js", content: REFERENCE_VALIDATE },
        { path: "src/intake.js", content: WRONG_RETRIES_4XX_INTAKE },
      ],
    },
  ],
};

const CODE = {
  starterFiles: [
    { path: "README.md", content: STARTER_README },
    { path: "src/schema.js", content: STARTER_SCHEMA },
    { path: "src/prompt.js", content: STARTER_PROMPT },
    { path: "src/store.js", content: STARTER_STORE },
    { path: "src/intake.js", content: STARTER_INTAKE },
    { path: "src/recorded-transport.js", content: STARTER_RECORDED_TRANSPORT },
    { path: "scripts/replay-batch.js", content: STARTER_REPLAY },
    { path: DOCUMENTS_PATH, content: FIXTURE_DOCUMENTS },
    { path: RESPONSES_PATH, content: FIXTURE_RESPONSES },
  ],
  referenceFiles: [
    { path: "src/validate.js", content: REFERENCE_VALIDATE },
    { path: "src/intake.js", content: REFERENCE_INTAKE },
  ],
  approaches: [
    "Add a validation module with two steps: parse the body (trim, strip one surrounding fence, JSON.parse, require a plain object) and validate a candidate record built from exactly the schema fields, converting only plain numeric strings for pieces and weight_kg and defaulting a missing delivery_date to null. In the intake, wrap the send in a loop of at most 3 attempts that treats 429, 5xx and rejected sends as retryable, waits retry-after seconds or the 1000/2000 ms backoff through sleep, and never waits after the last attempt.",
    "Keep validation inside intake.js as a table of per-field checks driven by SHIPMENT_FIELDS; equivalent as long as every invalid field is reported and no other conversion happens.",
    "Return a discriminated outcome from the provider call (ok with a response, or failed with attempts) so the review reason and attempts are set in one place.",
    "Starter defects: one send with no retry, a throw on any non-200 that stops runBatch (AC-3, AC-5), JSON.parse with no fence handling (AC-1), and the parsed object stored as-is with no schema check (AC-2).",
  ],
};

const COWORKERS: ScenarioPackage["coworkers"] = [
  {
    id: "lead",
    name: "Priya Halvorsen",
    title: "Engineering lead, document intake",
    responsibilities: "Owns the intake pipeline, its contract with billing and dispatch, and the provider gateway quota.",
    topics: ["schema contract", "retries and quota", "manual review", "billing", "scope"],
    tone: "Calm and precise. Prefers a document in review over a wrong record.",
    boundaries: "Explains the pipeline's contract and priorities, but will not choose or write the fix. Does not know individual documents.",
  },
  {
    id: "intake_specialist",
    name: "Joel Ferreira",
    title: "Intake operations specialist",
    responsibilities: "Runs the manual review queue, keys in documents the pipeline cannot handle and reports bad records from billing.",
    topics: ["documents", "manual review", "bad records", "carriers", "nightly batch"],
    tone: "Friendly and concrete. Talks about specific documents and what went wrong downstream.",
    boundaries: "Knows the documents, the review queue and what billing reported. Does not know the code and will not suggest a fix.",
  },
];

const COWORKER_FACTS: ProtectedMaterials["coworkerFacts"] = {
  lead: [
    {
      id: "lead-f1",
      text: "Billing trusts every stored record. A document in manual review costs the intake team about two minutes; a wrong weight or hazmat flag on an invoice costs a dispute or a compliance problem. When in doubt, send it to review.",
      topics: ["review", "store", "guess", "doubt", "priority", "billing"],
    },
    {
      id: "lead-f2",
      text: "The gateway gives us a fixed request quota per minute. When it sends 429 with retry-after, retrying sooner just burns quota and gets us limited again. Three attempts per document is the cap; after that the document waits for a human.",
      topics: ["429", "rate limit", "retry-after", "quota", "attempts", "cap"],
    },
    {
      id: "lead-f3",
      text: "A 400 from the gateway means the request itself was rejected, usually a document over the page limit. Sending it again gets the same answer.",
      topics: ["400", "4xx", "rejected", "page limit", "retry"],
    },
    {
      id: "lead-f4",
      text: "The schema is the contract with billing and dispatch. Do not loosen it to make more documents pass, and do not add fields to the stored record, even useful ones like the model's confidence.",
      topics: ["schema", "contract", "extra fields", "confidence", "loosen"],
    },
    {
      id: "lead-f5",
      text: "Asking the provider to fix its own output is a reasonable idea for later, but not in this change. Malformed output goes to review for now.",
      topics: ["reprompt", "ask again", "malformed", "retry invalid", "provider"],
    },
  ],
  intake_specialist: [
    {
      id: "spec-f1",
      text: "The provider sometimes wraps the JSON in a code fence like a chat answer. The data inside is fine; it is the same object.",
      topics: ["code fence", "backticks", "markdown", "wrapped"],
    },
    {
      id: "spec-f2",
      text: "Billing flagged a record with weight \"1,250 kg\". Some carriers print pounds or mix units on the same receipt, so I would never want the pipeline to guess the number. I check the scan.",
      topics: ["weight", "units", "kg", "pounds", "1,250"],
    },
    {
      id: "spec-f3",
      text: "Carriers write dates in all sorts of ways. 09/24/2026 is clear enough to a person, but some of our carriers are European, and 03/04 means a different day to them. A human should read those.",
      topics: ["date", "format", "us date", "european", "09/24"],
    },
    {
      id: "spec-f4",
      text: "A missing hazmat flag is the one that worries me most. If the document does not say, we cannot assume no dangerous goods.",
      topics: ["hazmat", "missing", "dangerous goods", "default"],
    },
    {
      id: "spec-f5",
      text: "When something lands in my queue I want to know why: was the answer garbled, were specific fields wrong, or did the provider never answer? With field names I can fix it in a minute.",
      topics: ["reason", "review queue", "fields", "why"],
    },
    {
      id: "spec-f6",
      text: "Some receipts have no delivery date yet because the freight is still moving. That is normal; dispatch fills it in later.",
      topics: ["delivery date", "not delivered", "null", "missing delivery"],
    },
    {
      id: "spec-f7",
      text: "I don't know how the code works. Priya can tell you what the pipeline is supposed to do.",
      topics: ["code", "fix"],
    },
  ],
};

const RUBRIC_NOTES: ProtectedMaterials["rubricNotes"] = {
  "CR-1":
    "Strong submissions separate parsing from validation, build the stored record from exactly the schema fields, apply only the two documented repairs and report every invalid field. Unsafe repairs (stripping units, parsing other date formats, mapping text to booleans) and type-only checks are each caught by a protected test.",
  "CR-2":
    "Look for one bounded retry loop with an explicit attempt cap, retry-after honored for 429 with a fallback backoff, no wait after the last attempt, non-429 4xx treated as final, and a batch that never throws past a failing document. Retrying 429 without a cap or retrying every non-200 are the common wrong turns.",
  "CR-3":
    "A useful regression test drives the intake with its own small fake transport and sleep, for example a response sequence of 503, timeout, 200, and asserts the stored record, the waits and the review item. A test that only re-runs the recorded batch does not isolate the cause.",
  "CR-4":
    "Look for a handoff that explains why guessing values is worse than manual review, why the retry cap and retry-after matter for the shared quota, and what remains open, such as asking the provider to correct malformed output later.",
};

function fixedSections(): ScenarioPackage["provenance"]["sections"] {
  const out = {} as ScenarioPackage["provenance"]["sections"];
  for (const s of SECTIONS) out[s] = { revision: 1, editedBy: "author", updatedAt: AUTHORED_AT };
  return out;
}

/** The hand-authored Applied AI structured-output work sample. Deterministic: no clock or randomness. */
export function buildExtractionPackage(): { pkg: ScenarioPackage; prot: ProtectedMaterials } {
  const built = assemble(config(), BRIEF, CODE, TESTS, null, "template");
  const pkg: ScenarioPackage = {
    ...built.pkg,
    setupInstructions: [
      "Install Node.js 22 or newer. No npm packages are needed.",
      "Download the starter project and open it in your editor.",
      "From the project root, replay the recorded batch: node scripts/replay-batch.js",
      `Run the public tests: ${built.pkg.environment.testCommand}. Some public tests fail on the starter project because they reproduce the reported problems.`,
    ],
    fixturePaths: [DOCUMENTS_PATH, RESPONSES_PATH],
    coworkers: COWORKERS,
    submission: {
      requirements: [
        "Submit the project with your changes under src/ and the tests you added.",
        "Include a regression test in test/ that fails on the original code and passes with your change.",
        "Keep the public tests in test/public.test.js passing.",
        "Answer the three handoff questions.",
      ],
      handoffPrompts: [
        { id: "what_changed", label: "What did you change?", help: "What was wrong, the files you changed and the behavior that changed." },
        { id: "how_checked", label: "How did you check it?", help: "Tests you added or ran, the replay results, and anything you verified by hand." },
        { id: "unresolved", label: "What remains unresolved?", help: "Risks, assumptions and anything you would do next." },
      ],
    },
    accommodations: ["Extra time can be granted per invitation. Ask the hiring team before you start.", "Screen readers and keyboard-only use are supported in the browser workspace."],
    reviewQuestion: {
      coworkerId: "lead",
      text: "Before you hand this off: the gateway starts answering 429 with retry-after: 600 for every request during tonight's batch of 400 documents. What does your intake do, how long does the batch take, and is that what we want?",
    },
    interruptionPolicy:
      "Requirements will not change during the task. Priya may ask one question about your change near the end; nothing else will interrupt you. The timer keeps running if you step away or lose your connection; your saved files stay in the workspace, so reopen the invitation link to continue.",
    feedbackPolicy:
      "When the hiring team releases your report, you can see which acceptance criteria the tests confirmed and how each criterion was judged. Hidden test code and the held-out responses are not shared. A reviewer reads your regression tests and your handoff.",
    provenance: { path: "template", model: null, generatedAt: AUTHORED_AT, sections: fixedSections() },
  };
  const prot: ProtectedMaterials = { ...built.prot, coworkerFacts: COWORKER_FACTS, rubricNotes: RUBRIC_NOTES };
  return { pkg, prot };
}
