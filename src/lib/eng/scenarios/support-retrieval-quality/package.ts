import "server-only";
import { assemble, type BriefStage, type TestsStage } from "../../authoring/generate";
import { SECTIONS, type ProtectedMaterials, type ScenarioPackage } from "../../authoring/package";
import { DEFAULT_INPUT, parseInput, validateConfig, type AuthoringConfig, type AuthoringInput } from "../../authoring/registry";
import {
  FIXTURE_EVAL_QUESTIONS,
  FIXTURE_EXPORT,
  REFERENCE_CHUNKER,
  REFERENCE_RETRIEVER,
  REFERENCE_SEARCH_INDEX,
  STARTER_CHUNKER,
  STARTER_EVAL,
  STARTER_README,
  STARTER_RETRIEVER,
  STARTER_RUN_EVAL,
  STARTER_SEARCH_INDEX,
  STARTER_TEXT,
  TEST_EVALUATION,
  TEST_PUBLIC,
  WRONG_HARDCODED_IDS_SEARCH_INDEX,
  WRONG_LARGER_POOL_RETRIEVER,
  WRONG_NO_HEADINGS_CHUNKER,
  WRONG_PADDED_RETRIEVER,
  WRONG_STATE_ONLY_SEARCH_INDEX,
} from "./files";

export const SUPPORT_RETRIEVAL_SEED_MARKER = "fydell-template:support-retrieval-quality:v1";
const AUTHORED_AT = "2026-10-07T00:00:00.000Z";
const EXPORT_PATH = "fixtures/help_center_export.json";
const EVAL_PATH = "fixtures/eval_questions.json";

/** The creator-form input this sample corresponds to; stored with the draft. */
export const SUPPORT_RETRIEVAL_INPUT: AuthoringInput = {
  ...DEFAULT_INPUT,
  family: "applied_ai_engineer",
  specialization: "general",
  level: "mid",
  language: "javascript",
  framework: "none",
  database: "in-memory",
  technologies: ["json"],
  taskType: "debugging",
  capabilities: ["correctness", "testing", "technical_judgment"],
  taskMinutes: 60,
  setupMinutes: 10,
  aiPolicy: "assistants_disclosed",
  startingMaterial: "uploaded",
  description:
    "A B2B scheduling company's support assistant answers customer questions from help-center passages chosen by a lexical retrieval step. Customers get answers from superseded article versions, miss the article written for their plan, and get passages cut off from the heading that explains them. The candidate uses a recorded eval set of questions with expected source articles to diagnose the retrieval step, fixes versioning, plan filtering and chunking so the eval passes, and keeps the fix general because hidden tests use held-out articles and questions. No model is called; the task covers retrieval only.",
  outcomes: [
    "The recorded eval set passes with the live, on-plan article and the passage that answers the question.",
    "The same behavior holds for articles and questions that are not in the fixtures.",
  ],
  constraints: ["Standard library only.", "Keep the chunkArticle, buildIndex and retrieve interfaces.", "Keep lexical BM25 scoring."],
  outOfScope: ["Calling a model or generating answers.", "Replacing BM25 with another ranking method.", "Changing the help-center export."],
  confirmedAssumptions: ["synthetic_data"],
};

function config(): AuthoringConfig {
  const { input, invalid } = parseInput(SUPPORT_RETRIEVAL_INPUT);
  const v = validateConfig(input, invalid);
  if (!v.ok || !v.resolved) {
    const reasons = [...v.errors, ...v.conflicts].map((e) => e.message).concat(v.clarifications.map((c) => c.question), v.assumptions.map((a) => a.statement));
    throw new Error(`support-retrieval-quality config does not validate: ${reasons.join(" | ")}`);
  }
  return v.resolved;
}

const BRIEF: BriefStage = {
  title: "Fix stale and off-plan support retrieval",
  summary:
    "The support assistant answers from superseded help articles, misses the article written for the customer's plan, and returns passages without the part that answers the question. Diagnose the retrieval step with the recorded eval set and fix it without overfitting to that set.",
  context: [
    "Rostermint sells workforce scheduling software to businesses on three plans: Starter, Team and Enterprise. Its support assistant answers questions in the help widget using only the three help-center passages that retrieve() in src/retriever.js returns for the question and the customer's plan. The model call happens in another service; this repository only decides which passages the model sees.",
    "Every night the help center is exported to fixtures/help_center_export.json. The export holds every version of every article ever published. Versions of one article share a slug, and the live article is the record with the highest version. The state field was only added in March 2026, so records exported before then have none. Each record lists the plans it applies to.",
    "Support operations collected tickets where the assistant answered from an old version of an article, told a Starter customer that no article covered a question when one does, or cited the right article but not the section that answers the question. They turned the patterns into a recorded eval set in fixtures/eval_questions.json: each question has the plan of the customer who asked, the live article that should be retrieved, and the sentence fragment the answer needs. scripts/run-eval.js runs it and prints what went wrong for each question.",
  ].join("\n\n"),
  task: [
    "Own the retrieval step. Use the eval set and the public tests to work out why these failures happen, then change src/chunker.js, src/search-index.js and src/retriever.js as needed so that retrieval returns only live articles, respects the customer's plan without losing the articles written for it, and returns the section that answers the question.",
    "The fix has to hold for articles and questions that are not in the fixtures. Hidden tests use a held-out help center and held-out questions, so do not special-case article ids, slugs or eval questions, and do not edit the fixtures to make the eval pass.",
    "Add regression tests under test/ for what you fix. Two simulated teammates can answer questions: Tomas about the assistant's constraints and priorities, Mei about the help-center data and the tickets. If something is still unclear, make a reasonable assumption and state it in your handoff.",
  ].join("\n\n"),
  outcomes: [
    "The recorded eval set passes: every question gets its live article in the top 3, with the passage that answers it, and nothing superseded or off-plan.",
    "Retrieval behaves the same way for help-center articles and questions that are not in the fixtures.",
    "A regression test in test/ fails on the original code and passes with your change.",
    "A short handoff explains the causes you found, what you changed, how you checked it, and what remains open.",
  ],
  constraints: [
    "Node.js standard library only. No npm packages, no model calls, no embeddings.",
    "Keep the interfaces of chunkArticle(record), buildIndex(records) and retrieve(index, question, { plan, k }), including the fields of chunks and results.",
    "retrieve returns at most k results (3 by default), best first, with at most one result per article.",
    "Keep lexical BM25 scoring in src/text.js. Changing the ranking method is not needed to fix these problems.",
    "Do not special-case article ids, slugs or eval questions, and do not edit the fixtures.",
  ],
  outOfScope: [
    "Calling a model, generating answers or changing the prompt.",
    "Replacing BM25 with embeddings or another ranking method.",
    "Changing how the help center is exported.",
  ],
  optionalExtensions: ["If you have time, note in your handoff how you would extend the eval set so regressions like these are caught before release."],
  interfaceSpec: [
    "Record (one entry of the export): { id, slug, version, state?, title, plans, updated, body }. plans lists \"starter\", \"team\" and/or \"enterprise\". body is plain text with \"## \" section headings.",
    "src/chunker.js",
    "  chunkArticle(record) -> Chunk[]. Chunk: { articleId, slug, title, plans, heading, text }. heading is the \"## \" heading of the section the text came from, or \"\" for text before the first heading.",
    "src/search-index.js",
    "  buildIndex(records) -> { chunks, df, avgLength }. Each indexed chunk also has tf (Map of term to count) and length (token count).",
    "src/retriever.js",
    "  retrieve(index, question, { plan, k = 3 }) -> Result[], best first. Result: { articleId, slug, title, heading, text, score }.",
    "src/text.js",
    "  tokenize(text) -> string[], termFrequencies(tokens) -> Map, bm25(index, chunk, terms) -> number.",
    "src/eval.js",
    "  evaluate(index, records, evalSet, k = 3) -> [{ id, question, plan, retrieved, passed, problems }].",
  ].join("\n"),
  acceptanceCriteria: [
    {
      id: "AC-1",
      capability: "correctness",
      text: "Only the live version of each article is retrieved: for every slug, only the record with the highest version can appear in results, whether or not older records have a state field, and a record without a state field is live when it is the highest version of its slug. No two results come from the same article.",
    },
    {
      id: "AC-2",
      capability: "correctness",
      text: "Results contain only articles whose plans include the customer's plan, and off-plan passages never push out matching on-plan articles, however many off-plan passages score higher. When fewer than k on-plan articles match, fewer results are returned rather than off-plan ones.",
    },
    {
      id: "AC-3",
      capability: "correctness",
      text: "Each chunk holds text from exactly one section and records that section's heading, and a question phrased like a section heading retrieves that section's text rather than another part of the same article.",
    },
    {
      id: "AC-4",
      capability: "correctness",
      text: "The recorded eval set passes, and the same behavior holds for articles and questions that are not in the fixtures: no article ids, slugs or eval questions are special-cased.",
    },
  ],
  coworkers: [],
};

const TESTS: TestsStage = {
  publicTests: {
    file: { path: "test/public.test.js", content: TEST_PUBLIC },
    tests: [
      { name: "recorded eval set: every question gets its live article with the answer, nothing superseded or off-plan", criterionIds: ["AC-4"] },
      { name: "a Starter customer never gets an Enterprise-only article", criterionIds: ["AC-2"] },
      { name: "only the newest version of the swap-shifts article is returned", criterionIds: ["AC-1"] },
      { name: "the payroll article's answer stays with its section heading", criterionIds: ["AC-3"] },
    ],
  },
  evaluationTests: {
    file: { path: "test/evaluation.test.js", content: TEST_EVALUATION },
    tests: [
      { name: "held-out: the newest version is returned even when an older version matches the question better", criterionIds: ["AC-1"] },
      { name: "held-out: an older version without a state field is not returned once a newer version exists", criterionIds: ["AC-1"] },
      { name: "held-out: an article with a single version and no state field is still live", criterionIds: ["AC-1"] },
      { name: "held-out: at most k results, one per article, never two versions of the same article", criterionIds: ["AC-1"] },
      { name: "held-out: the customer's own article is returned even when many off-plan sections rank higher", criterionIds: ["AC-2"] },
      { name: "held-out: never returns an off-plan article, even when fewer than k on-plan articles match", criterionIds: ["AC-2"] },
      { name: "held-out: a question phrased like a section heading retrieves that section's text", criterionIds: ["AC-3"] },
      { name: "held-out: chunks keep their section heading and never mix two sections", criterionIds: ["AC-3"] },
      { name: "held-out eval: unseen questions over an unseen corpus get their live article with the answer", criterionIds: ["AC-4"] },
    ],
  },
  incorrectSolutions: [
    {
      description:
        "Overfits to the fixtures: skips the record ids listed in the eval file's superseded_records instead of computing the live version per slug. The public eval passes; superseded versions in any other export are still retrieved.",
      files: [
        { path: "src/chunker.js", content: REFERENCE_CHUNKER },
        { path: "src/search-index.js", content: WRONG_HARDCODED_IDS_SEARCH_INDEX },
        { path: "src/retriever.js", content: REFERENCE_RETRIEVER },
      ],
    },
    {
      description:
        "Drops records whose state is \"superseded\". Older versions exported before the state field existed have no state, so they stay in the index. The public eval passes.",
      files: [
        { path: "src/chunker.js", content: REFERENCE_CHUNKER },
        { path: "src/search-index.js", content: WRONG_STATE_ONLY_SEARCH_INDEX },
        { path: "src/retriever.js", content: REFERENCE_RETRIEVER },
      ],
    },
    {
      description:
        "Keeps filtering by plan after ranking but enlarges the candidate pool from 6 to 50 chunks until the eval passes. With enough higher-scoring off-plan passages the customer's own article is still pushed out.",
      files: [
        { path: "src/chunker.js", content: REFERENCE_CHUNKER },
        { path: "src/search-index.js", content: REFERENCE_SEARCH_INDEX },
        { path: "src/retriever.js", content: WRONG_LARGER_POOL_RETRIEVER },
      ],
    },
    {
      description:
        "Chunks by section and sets the heading field, but indexes only the section body, so a question phrased like a heading matches another section of the article.",
      files: [
        { path: "src/chunker.js", content: WRONG_NO_HEADINGS_CHUNKER },
        { path: "src/search-index.js", content: REFERENCE_SEARCH_INDEX },
        { path: "src/retriever.js", content: REFERENCE_RETRIEVER },
      ],
    },
    {
      description:
        "Filters by plan before ranking, but when fewer than k on-plan articles match it fills the remaining slots with the best off-plan articles so the assistant always has three passages.",
      files: [
        { path: "src/chunker.js", content: REFERENCE_CHUNKER },
        { path: "src/search-index.js", content: REFERENCE_SEARCH_INDEX },
        { path: "src/retriever.js", content: WRONG_PADDED_RETRIEVER },
      ],
    },
  ],
};

const CODE = {
  starterFiles: [
    { path: "README.md", content: STARTER_README },
    { path: "src/text.js", content: STARTER_TEXT },
    { path: "src/chunker.js", content: STARTER_CHUNKER },
    { path: "src/search-index.js", content: STARTER_SEARCH_INDEX },
    { path: "src/retriever.js", content: STARTER_RETRIEVER },
    { path: "src/eval.js", content: STARTER_EVAL },
    { path: "scripts/run-eval.js", content: STARTER_RUN_EVAL },
    { path: EXPORT_PATH, content: FIXTURE_EXPORT },
    { path: EVAL_PATH, content: FIXTURE_EVAL_QUESTIONS },
  ],
  referenceFiles: [
    { path: "src/chunker.js", content: REFERENCE_CHUNKER },
    { path: "src/search-index.js", content: REFERENCE_SEARCH_INDEX },
    { path: "src/retriever.js", content: REFERENCE_RETRIEVER },
  ],
  approaches: [
    "In buildIndex, keep only the highest version of each slug before chunking. In retrieve, skip chunks whose plans do not include the customer's plan inside the scoring loop, then keep the best chunk per article and take the top k. In chunkArticle, cut one chunk per \"## \" section and prepend the article title and section heading to the chunk text.",
    "Index every record but store each chunk's version and the highest version per slug, and skip non-live chunks in retrieve. Long sections may be split further as long as every sub-chunk keeps the title and heading.",
    "Rank all chunks with no fixed pool and walk the full ranked list until k distinct on-plan articles are found; this is equivalent to filtering by plan before ranking.",
    "Starter defects: buildIndex indexes every version, so superseded records outrank or crowd out the live one (AC-1). retrieve applies the plan filter only to a fixed pool of 6 chunks, so off-plan passages push out the customer's own article (AC-2). chunkArticle cuts fixed 40-word windows, separating answers from their headings (AC-3).",
  ],
};

const COWORKERS: ScenarioPackage["coworkers"] = [
  {
    id: "lead",
    name: "Tomas Okoro",
    title: "Engineering lead, Support AI",
    responsibilities: "Owns the support assistant's retrieval and answer pipeline, its context budget and its release checks.",
    topics: ["context budget", "plans and filtering", "eval set", "ranking", "scope"],
    tone: "Direct and practical. Answers exactly what was asked.",
    boundaries: "Explains the assistant's constraints and priorities, but will not choose or write the fix. Does not know individual articles in detail.",
  },
  {
    id: "support_ops",
    name: "Mei Lindqvist",
    title: "Support operations specialist",
    responsibilities: "Maintains the help center, wrote the recorded eval set and reviews tickets where the assistant answered badly.",
    topics: ["help-center export", "article versions", "plans", "tickets", "eval set"],
    tone: "Friendly and specific. Quotes tickets and articles.",
    boundaries: "Knows the articles, the export format and what customers reported. Does not know the code and will not suggest a fix.",
  },
];

const COWORKER_FACTS: ProtectedMaterials["coworkerFacts"] = {
  lead: [
    {
      id: "lead-f1",
      text: "The assistant puts exactly three passages into the prompt, so k stays 3 by default. Two passages from one article, or a stale and a live version of the same article, waste the budget and can contradict each other.",
      topics: ["k", "three passages", "context", "budget", "duplicates"],
    },
    {
      id: "lead-f2",
      text: "Showing a customer an article for a plan they are not on is worse than showing nothing. If fewer than three on-plan passages match, send fewer. Never fill the gap with other plans.",
      topics: ["plan", "filter", "fewer results", "pad", "starter", "enterprise"],
    },
    {
      id: "lead-f3",
      text: "The eval set is a smoke test, not the target. The release check runs a larger held-out set of questions against tomorrow's export, so anything keyed on today's article ids or on the eval questions breaks the next time support publishes.",
      topics: ["eval", "overfit", "held-out", "hardcode", "article ids"],
    },
    {
      id: "lead-f4",
      text: "Keep BM25 for now. Embeddings are on next quarter's roadmap, and nothing in this change needs a different ranking method.",
      topics: ["bm25", "embeddings", "ranking", "scoring", "vector"],
    },
    {
      id: "lead-f5",
      text: "Latency is not a concern at our size. The index is a few thousand chunks, and scoring every chunk for each question is well within budget.",
      topics: ["performance", "latency", "speed", "pool", "scale"],
    },
  ],
  support_ops: [
    {
      id: "ops-f1",
      text: "When we update an article, the help center publishes a new record with the same slug and a higher version. The old record stays in the export. Nobody deletes them.",
      topics: ["version", "slug", "superseded", "old articles", "export"],
    },
    {
      id: "ops-f2",
      text: "The state field arrived with the March help-center upgrade. Anything exported before that has no state at all, including some old versions that were replaced later, like the first clock-in article.",
      topics: ["state", "march", "missing state", "field"],
    },
    {
      id: "ops-f3",
      text: "A Team customer was told overtime thresholds cannot be changed. That was true in early 2025. The current article explains daily, weekly and per-location thresholds.",
      topics: ["overtime", "ticket", "stale", "wrong answer", "incident"],
    },
    {
      id: "ops-f4",
      text: "Starter customers asking who approves time off get \"I could not find an article about that\", even though we published a Starter-specific time off article in March.",
      topics: ["starter", "time off", "not found", "missing article"],
    },
    {
      id: "ops-f5",
      text: "For the failed payroll export question, the assistant cited the right article but told the customer to contact support. The retry steps are in that article, under the Fix a failed payroll export heading.",
      topics: ["payroll", "heading", "section", "wrong part", "chunk"],
    },
    {
      id: "ops-f6",
      text: "I wrote the superseded_records list in the eval file by hand from today's export, only so the eval can flag stale answers. It goes out of date every time we publish.",
      topics: ["superseded_records", "list", "eval file"],
    },
    {
      id: "ops-f7",
      text: "I don't know how the code works, sorry. Tomas can tell you what the assistant needs.",
      topics: ["code", "fix"],
    },
  ],
};

const RUBRIC_NOTES: ProtectedMaterials["rubricNotes"] = {
  "CR-1":
    "Strong submissions compute the live record per slug from version numbers (state is unreliable), filter by plan before ranking, and chunk by section with the title and heading in the indexed text. The common wrong turns are each caught by a held-out test: hardcoding the superseded ids from the eval file, filtering on state alone, enlarging the candidate pool instead of filtering first, padding with off-plan articles, and chunking by section while dropping the heading text.",
  "CR-2":
    "A useful regression test reproduces one defect with its own small corpus: two versions of one slug where the older matches better, an off-plan article that outranks an on-plan one, or a heading separated from its answer. A test that only re-runs the recorded eval set does not isolate the cause.",
  "CR-3":
    "Look for a handoff that names each cause separately, explains why the change generalizes beyond the eval set, and notes tradeoffs such as returning fewer than three passages for some plans and not relying on the state field.",
};

function fixedSections(): ScenarioPackage["provenance"]["sections"] {
  const out = {} as ScenarioPackage["provenance"]["sections"];
  for (const s of SECTIONS) out[s] = { revision: 1, editedBy: "author", updatedAt: AUTHORED_AT };
  return out;
}

/** The hand-authored Applied AI retrieval work sample. Deterministic: no clock or randomness. */
export function buildSupportRetrievalPackage(): { pkg: ScenarioPackage; prot: ProtectedMaterials } {
  const built = assemble(config(), BRIEF, CODE, TESTS, null, "template");
  const pkg: ScenarioPackage = {
    ...built.pkg,
    setupInstructions: [
      "Install Node.js 22 or newer. No npm packages are needed.",
      "Download the starter project and open it in your editor.",
      "From the project root, run the recorded eval: node scripts/run-eval.js",
      `Run the public tests: ${built.pkg.environment.testCommand}. Some public tests fail on the starter project because they reproduce the reported problems.`,
    ],
    fixturePaths: [EXPORT_PATH, EVAL_PATH],
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
        { id: "how_checked", label: "How did you check it?", help: "Tests you added or ran, the eval results, and anything you verified by hand." },
        { id: "unresolved", label: "What remains unresolved?", help: "Risks, assumptions and anything you would do next." },
      ],
    },
    accommodations: ["Extra time can be granted per invitation. Ask the hiring team before you start.", "Screen readers and keyboard-only use are supported in the browser workspace."],
    reviewQuestion: {
      coworkerId: "lead",
      text: "Before you hand this off: tomorrow support publishes version 4 of an article and limits it to Enterprise, while version 3 was on every plan. What does a Starter customer get for a question about it with your change, and why?",
    },
    interruptionPolicy:
      "Requirements will not change during the task. Tomas may ask one question about your change near the end; nothing else will interrupt you. The timer keeps running if you step away or lose your connection; your saved files stay in the workspace, so reopen the invitation link to continue.",
    feedbackPolicy:
      "When the hiring team releases your report, you can see which acceptance criteria the tests confirmed and how each criterion was judged. Hidden test code and the held-out data are not shared. A reviewer reads your regression tests and your handoff.",
    provenance: { path: "template", model: null, generatedAt: AUTHORED_AT, sections: fixedSections() },
  };
  const prot: ProtectedMaterials = { ...built.prot, coworkerFacts: COWORKER_FACTS, rubricNotes: RUBRIC_NOTES };
  return { pkg, prot };
}
