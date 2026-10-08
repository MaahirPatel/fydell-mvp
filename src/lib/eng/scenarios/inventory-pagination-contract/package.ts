import "server-only";
import { assemble, type BriefStage, type TestsStage } from "../../authoring/generate";
import { SECTIONS, type ProtectedMaterials, type ScenarioPackage } from "../../authoring/package";
import { DEFAULT_INPUT, parseInput, validateConfig, type AuthoringConfig, type AuthoringInput } from "../../authoring/registry";
import {
  REFERENCE_LIST,
  REFERENCE_README,
  STARTER_FIXTURE,
  STARTER_GET_ITEM,
  STARTER_HTTP,
  STARTER_LIST,
  STARTER_README,
  STARTER_REPOSITORY,
  STARTER_ROUTES,
  TEST_EVALUATION,
  TEST_HELPERS,
  TEST_PUBLIC,
  WRONG_LISTED_AT_ONLY_CURSOR_LIST,
  WRONG_OFFSET_CURSOR_LIST,
  WRONG_READABLE_CURSOR_LIST,
  WRONG_REJECT_LARGE_LIMIT_LIST,
  WRONG_TIEBREAK_CURSOR_ONLY_LIST,
  WRONG_UNSCOPED_CURSOR_LIST,
} from "./files";

export const INVENTORY_PAGINATION_SEED_MARKER = "fydell-template:inventory-pagination-contract:v1";
const AUTHORED_AT = "2026-10-07T00:00:00.000Z";
const FIXTURE_PATH = "fixtures/partner-sync-log.json";

/** The creator-form input this sample corresponds to; stored with the draft. */
export const INVENTORY_PAGINATION_INPUT: AuthoringInput = {
  ...DEFAULT_INPUT,
  family: "backend_api_engineer",
  specialization: "general",
  level: "mid",
  language: "javascript",
  framework: "none",
  database: "in-memory",
  technologies: ["pagination", "validation"],
  taskType: "feature",
  capabilities: ["correctness", "security", "testing", "communication"],
  taskMinutes: 60,
  setupMinutes: 10,
  aiPolicy: "assistants_disclosed",
  startingMaterial: "uploaded",
  description:
    "Partners syncing a seller's inventory through the offset-paginated list endpoint receive duplicate and missing items when stock updates arrive between page requests. The candidate makes offset pages deterministic, adds opaque cursor pagination that stays exact while inventory changes, validates paging parameters so that a cursor never gives access to another seller's inventory, keeps existing offset and limit clients working, and documents the new behavior.",
  outcomes: [
    "Offset clients keep the same fields and get a deterministic order.",
    "Clients following nextCursor see every item exactly once while inventory changes.",
    "The endpoint documentation describes cursor pagination, validation errors and how offset and cursor relate.",
  ],
  constraints: ["Standard library only.", "Do not remove, rename or change the meaning of existing fields.", "Keep clamping limit values above 200."],
  outOfScope: ["Exact offset pages under inserts and deletes.", "Signed or expiring cursors.", "Other endpoints."],
  confirmedAssumptions: ["synthetic_data"],
};

function config(): AuthoringConfig {
  const { input, invalid } = parseInput(INVENTORY_PAGINATION_INPUT);
  const v = validateConfig(input, invalid);
  if (!v.ok || !v.resolved) {
    const reasons = [...v.errors, ...v.conflicts].map((e) => e.message).concat(v.clarifications.map((c) => c.question), v.assumptions.map((a) => a.statement));
    throw new Error(`inventory-pagination-contract config does not validate: ${reasons.join(" | ")}`);
  }
  return v.resolved;
}

const BRIEF: BriefStage = {
  title: "Add cursor pagination to the inventory list without breaking clients",
  summary: "A partner's nightly inventory sync received duplicate and missing items. Make the list endpoint's paging deterministic and exact, without breaking clients that still page with offset and limit.",
  context: [
    "Marrowfield Market is a marketplace for independent sellers. Seller tools, our mobile app and partner integrations read a seller's inventory through GET /v1/sellers/:sellerId/inventory, handled by listInventory in src/list-inventory.js. It pages with offset and limit, oldest listing first, as documented in README.md.",
    "Warehouse partners run a nightly sync that pages through a seller's whole inventory to update their stock counts. Stock changes all the time, and a stock update rewrites the inventory row, which changes the order in which the table returns rows (src/inventory-repository.js behaves the same way). Many listings share a listedAt second because sellers create them with bulk imports.",
    "On 30 September, Coldharbor Fulfilment's sync for one seller received 312 rows but only 298 distinct items: 14 were received twice and 14 never arrived, and the partner set stock for the missing ones to zero. The requests, the stock updates that landed during the sync and the partner's report are in fixtures/partner-sync-log.json.",
    "Some clients cannot be updated before next year: that partner's current integration, which sends limit=500, and older mobile app versions, which send offset with limit=25. Our compatibility rules are in README.md.",
  ].join("\n\n"),
  task: [
    "Own the pagination contract for this endpoint. Make offset pages deterministic, add cursor pagination that stays exact while inventory changes, and validate the paging parameters, without breaking clients that still send offset and limit. Document the new behavior in the endpoint section of README.md so partner engineers can adopt it.",
    "Add tests under test/ for the behavior you change. Two simulated teammates can answer questions: Anneke about the API contract and compatibility rules, Mateo about the partner incident and how clients call the endpoint. If something is still unclear, make a reasonable assumption and state it in your handoff.",
  ].join("\n\n"),
  outcomes: [
    "Offset clients get the same fields as before and a deterministic order.",
    "Clients that follow nextCursor see every item exactly once while inventory changes.",
    "README.md documents cursor pagination, the parameters and their errors, and how offset and cursor relate.",
    "Tests in test/ cover the behavior you changed, and a short handoff explains your decisions and what remains open.",
  ],
  constraints: [
    "Node.js standard library only. No npm packages.",
    "Keep the listInventory(request, { repository }) signature and the InventoryRepository methods: insert, update, remove, findById and listBySeller.",
    "Do not remove, rename or change the meaning of any field or parameter existing clients use. Adding response fields is allowed.",
    "Keep treating limit values above 200 as 200; a partner depends on it.",
    "Use the existing error body from src/http.js for new errors.",
  ],
  outOfScope: [
    "Making offset pages exact when items are added or removed between requests. Offset clients keep today's semantics; cursors are the fix.",
    "Signing, encrypting or expiring cursors.",
    "Filters, other sort orders and changes to other endpoints.",
    "Replacing the in-memory repository or adding indexes.",
  ],
  optionalExtensions: ["If you have time, describe in your handoff how you would help partners move from offset to cursor pagination."],
  interfaceSpec: [
    "src/list-inventory.js",
    "  listInventory(request, { repository }) -> { status, body }",
    "    request: { params: { sellerId }, query: { offset?, limit?, cursor? } }. Query values are strings.",
    "    Offset response today: { items, offset, limit, total, nextOffset }. nextOffset is null on the last page.",
    "    Cursor response: at least { items, limit, nextCursor }. Every successful response includes nextCursor, null on the last page.",
    "    Item: { id, sku, title, quantity, priceCents, listedAt }. listedAt is an ISO 8601 UTC string set at creation and never changed. Ids are unique strings, compared as strings.",
    "  toPublicItem(row) -> item.",
    "src/inventory-repository.js",
    "  InventoryRepository(): insert(item), update(id, changes), remove(id), findById(id), listBySeller(sellerId) -> rows in storage order.",
    "    Storage order carries no meaning: update moves the row to the end, as the production table can.",
    "src/http.js",
    "  ok(body), badRequest(code, message), notFound(code, message). Error body: { error: { code, message } }.",
    "src/get-inventory-item.js and src/routes.js: the single-item handler and the route table.",
  ].join("\n"),
  acceptanceCriteria: [
    {
      id: "AC-1",
      capability: "correctness",
      text: "Existing clients keep working: a request with offset and/or limit, or with neither, returns items, offset, limit, total and nextOffset as documented. limit defaults to 50 and values above 200 are treated as 200. Items are ordered by listedAt ascending, then id ascending, so the same request returns the same order after stock updates.",
    },
    {
      id: "AC-2",
      capability: "correctness",
      text: "Cursor pagination: every successful response includes nextCursor, which is null when no items follow. Following nextCursor from a request without offset or cursor returns every item that exists for the whole walk exactly once and in order, even when other items are added, removed or have their stock changed between requests. nextCursor is opaque: it does not contain the item id or listedAt as readable text.",
    },
    {
      id: "AC-3",
      capability: "security",
      text: "Invalid paging input is rejected with status 400 and the existing error body, never a 500: a limit that is not a positive integer (invalid_limit), an offset that is not a non-negative integer (invalid_offset), offset and cursor in the same request (invalid_request), and a cursor that cannot be decoded or was issued for a different seller (invalid_cursor).",
    },
  ],
  coworkers: [],
};

const TESTS: TestsStage = {
  publicTests: {
    file: { path: "test/public.test.js", content: TEST_PUBLIC },
    tests: [
      { name: "paging with offset while stock changes returns each item once", criterionIds: ["AC-1"] },
      { name: "following nextCursor visits every listing once while listings are added and removed", criterionIds: ["AC-2"] },
      { name: "offset pages keep their documented fields", criterionIds: ["AC-1"] },
      { name: "a limit that is not a positive integer is rejected", criterionIds: ["AC-3"] },
    ],
  },
  evaluationTests: {
    file: { path: "test/evaluation.test.js", content: TEST_EVALUATION },
    tests: [
      { name: "offset clients page through every item with the documented fields", criterionIds: ["AC-1"] },
      { name: "a limit above 200 is still treated as 200 for offset clients", criterionIds: ["AC-1"] },
      { name: "listings that share listedAt keep one order across requests after stock updates", criterionIds: ["AC-1"] },
      { name: "a request without paging parameters returns the first 50 items", criterionIds: ["AC-1"] },
      { name: "a cursor walk returns each item once while listings are added removed and restocked", criterionIds: ["AC-2"] },
      { name: "a cursor walk keeps items that share a listedAt across a page boundary", criterionIds: ["AC-2"] },
      { name: "the last page has a null nextCursor, including for a seller with no items", criterionIds: ["AC-2"] },
      { name: "nextCursor does not expose the item id or listedAt", criterionIds: ["AC-2"] },
      { name: "an undecodable or malformed cursor is rejected with invalid_cursor", criterionIds: ["AC-3"] },
      { name: "a cursor issued for another seller is rejected", criterionIds: ["AC-3"] },
      { name: "offset and cursor in the same request are rejected", criterionIds: ["AC-3"] },
      { name: "limit and offset that are not valid numbers are rejected with their own codes", criterionIds: ["AC-3"] },
    ],
  },
  incorrectSolutions: [
    {
      description: "Wraps the next offset in an opaque base64 cursor. It looks like cursor pagination, but positions still shift, so a listing removed between pages makes the walk skip an item.",
      files: [{ path: "src/list-inventory.js", content: WRONG_OFFSET_CURSOR_LIST }],
    },
    {
      description: "Keys the cursor position on listedAt alone and continues from the first later timestamp, so listings that share a listedAt with the last item on a page are skipped.",
      files: [{ path: "src/list-inventory.js", content: WRONG_LISTED_AT_ONLY_CURSOR_LIST }],
    },
    {
      description: "Treats limit above 200 as invalid and answers 400, which breaks the partner integration that sends limit=500 on every request.",
      files: [{ path: "src/list-inventory.js", content: WRONG_REJECT_LARGE_LIMIT_LIST }],
    },
    {
      description: "Adds the id tiebreaker only for cursor requests and keeps the old sort for offset requests, so offset pages still reorder listings that share a listedAt after a stock update.",
      files: [{ path: "src/list-inventory.js", content: WRONG_TIEBREAK_CURSOR_ONLY_LIST }],
    },
    {
      description: "Validates the cursor's shape but not the seller it was issued for, so one seller's cursor positions a walk through another seller's inventory.",
      files: [{ path: "src/list-inventory.js", content: WRONG_UNSCOPED_CURSOR_LIST }],
    },
    {
      description: "Uses the URL-encoded JSON position as the cursor, so clients can read the item id and timestamp in it and start building cursors themselves.",
      files: [{ path: "src/list-inventory.js", content: WRONG_READABLE_CURSOR_LIST }],
    },
  ],
};

const CODE = {
  starterFiles: [
    { path: "README.md", content: STARTER_README },
    { path: "src/http.js", content: STARTER_HTTP },
    { path: "src/inventory-repository.js", content: STARTER_REPOSITORY },
    { path: "src/list-inventory.js", content: STARTER_LIST },
    { path: "src/get-inventory-item.js", content: STARTER_GET_ITEM },
    { path: "src/routes.js", content: STARTER_ROUTES },
    { path: FIXTURE_PATH, content: STARTER_FIXTURE },
    { path: "test/helpers.js", content: TEST_HELPERS },
  ],
  referenceFiles: [
    { path: "src/list-inventory.js", content: REFERENCE_LIST },
    { path: "README.md", content: REFERENCE_README },
  ],
  approaches: [
    "Sort every request by (listedAt, id). Keep the offset branch as it was (same fields, clamp above 200) and add nextCursor to it. For cursor requests, decode a base64url JSON cursor { v, sellerId, listedAt, id }, reject it unless it decodes, has that shape and names this seller, then return the rows that sort strictly after that position. Validate limit and offset as digit strings before anything else.",
    "Keyset pagination with a separately encoded cursor (for example hex or base64 of a delimited string) is equally valid, as long as the position is (listedAt, id), the seller is bound into the cursor and readable ids or timestamps do not appear in it. Signing the cursor with HMAC is also fine but not required.",
    "A request with neither offset nor cursor stays an offset request for compatibility (offset 0) and also carries nextCursor, which is how new clients start a walk. Returning a different shape for that request would break existing clients.",
    "Starter defects: the sort has no tiebreaker, so rows that share listedAt come back in storage order, which a stock update changes, and offset pages skip and repeat items even without inserts (AC-1). There is no cursor (AC-2). Number(...) || default accepts garbage and negative values silently (AC-3).",
  ],
};

const COWORKERS: ScenarioPackage["coworkers"] = [
  {
    id: "lead",
    name: "Anneke Solberg",
    title: "API platform lead",
    responsibilities: "Owns the public API contract, the compatibility rules and the error conventions, and approves changes to published endpoints.",
    topics: ["compatibility rules", "response fields", "limit and clamping", "cursor format", "error codes", "scope"],
    tone: "Precise and patient. Explains the reason behind each rule in a sentence.",
    boundaries: "Explains the contract, the compatibility rules and what partners rely on, but will not design or write the pagination code. Does not know individual partner incidents in detail.",
  },
  {
    id: "partner",
    name: "Mateo Lindqvist",
    title: "Partner integrations engineer",
    responsibilities: "Supports warehouse and repricing partners, reads their request logs, and handled the Coldharbor sync incident.",
    topics: ["sync incident", "partner requests", "bulk imports", "mobile app clients", "partner migration"],
    tone: "Practical and specific. Quotes requests, counts and what partners told him.",
    boundaries: "Knows how clients call the endpoint and what went wrong for the partner. Does not know the handler code and will not suggest a fix.",
  },
];

const COWORKER_FACTS: ProtectedMaterials["coworkerFacts"] = {
  lead: [
    {
      id: "lead-f1",
      text: "Our rule: never remove, rename or change the meaning of a published field or parameter. New response fields are fine; every client we know of ignores fields it does not recognise.",
      topics: ["compatibility", "breaking change", "new field", "response shape", "rename"],
    },
    {
      id: "lead-f2",
      text: "limit above 200 has been treated as 200 since the endpoint shipped, and Coldharbor sends 500 on every request. Rejecting it would break their sync tonight.",
      topics: ["limit", "500", "clamp", "maximum", "200", "too large"],
    },
    {
      id: "lead-f3",
      text: "Cursors must be opaque so we can change how they work later without breaking anyone. They do not need to be signed or expire; nothing secret is in them. A cursor from one seller's walk sent for another seller is a client bug, and we want it rejected, not silently applied.",
      topics: ["cursor", "opaque", "sign", "expire", "other seller", "format", "encode"],
    },
    {
      id: "lead-f4",
      text: "When offset and cursor arrive together we don't guess which one the client meant: answer invalid_request. New error codes use the body from src/http.js and are lower snake case.",
      topics: ["both", "offset and cursor", "error code", "error body", "conflict"],
    },
    {
      id: "lead-f5",
      text: "The order is a published promise: oldest listing first. Breaking ties by id is fine; it only makes an order that was undefined deterministic. Clients must not see a different order for the same data.",
      topics: ["order", "sort", "tie", "tiebreaker", "listedAt", "same second"],
    },
    {
      id: "lead-f6",
      text: "Offset clients will still see shifts when listings are added or removed between their requests. We accept that and document it; making offsets exact is out of scope. The point of the cursor is to give partners something exact to move to.",
      topics: ["offset", "inserts", "deletes", "shift", "exact offset"],
    },
  ],
  partner: [
    {
      id: "partner-f1",
      text: "Coldharbor's sync on 30 September made two requests, offset=0&limit=500 and then offset=200&limit=500, eight seconds apart. Fourteen stock updates from a flash sale landed in between, all on listings from the 2 March bulk import. Those 14 came back twice, and 14 others never came back at all.",
      topics: ["incident", "duplicates", "missing", "30 september", "coldharbor", "sync"],
    },
    {
      id: "partner-f2",
      text: "Tidewater Goods created 286 listings in one CSV upload on 2 March, so they all have listedAt 2026-03-02T09:00:00Z. Bulk imports like that are normal; our largest seller has about 4,000 listings created in the same second.",
      topics: ["bulk import", "same listedAt", "timestamp", "csv", "same second"],
    },
    {
      id: "partner-f3",
      text: "Mobile app 4.2 and earlier page with offset 0, 25, 50 and so on with limit=25. About 8 percent of sessions still use those versions, and they will for months.",
      topics: ["mobile", "app", "old clients", "limit 25", "who uses offset"],
    },
    {
      id: "partner-f4",
      text: "Coldharbor said they can switch to cursors in their January release if the first request stays the same as today and they only have to follow a field from the response.",
      topics: ["partner", "migration", "cursor adoption", "january", "first request"],
    },
    {
      id: "partner-f5",
      text: "I've seen integrations send limit=0 or a negative offset by mistake. Today they silently get 50 items or a strange page, and the partners only find out much later. None of them rely on that.",
      topics: ["limit=0", "invalid limit", "negative offset", "bad parameters", "validation"],
    },
    {
      id: "partner-f6",
      text: "I don't know the handler code. Anneke owns the contract and can tell you how it is meant to behave.",
      topics: ["code", "fix", "implementation"],
    },
  ],
};

const RUBRIC_NOTES: ProtectedMaterials["rubricNotes"] = {
  "CR-1": "Strong submissions keyset-paginate on (listedAt, id) for cursors and use the same total order for offset requests, while keeping the offset response fields and the clamp above 200. Common wrong turns, each caught by an evaluation test: an offset hidden inside the cursor, a cursor on listedAt alone, rejecting large limits, and adding the tiebreaker only to the cursor path.",
  "CR-2": "Look for validation that happens before any data access and returns the existing error body with distinct codes. The cursor must be bound to the seller. Signing is optional; a cursor that is only URL-encoded JSON is readable and fails the opacity requirement.",
  "CR-3": "Useful tests change data between page requests (a stock update among tied listings, a removal before the cursor position) and check for each item exactly once. Tests that page over static data pass on the original code for most cases and show little.",
  "CR-4": "The README section should let a partner engineer adopt cursors without asking: how to start and continue a walk, what nextCursor null means, the parameter rules and error codes, that cursors are opaque and seller-specific, and what offset clients should still expect when items are added or removed. The handoff should state the compatibility decisions, such as keeping nextOffset and adding nextCursor to offset responses.",
};

function fixedSections(): ScenarioPackage["provenance"]["sections"] {
  const out = {} as ScenarioPackage["provenance"]["sections"];
  for (const s of SECTIONS) out[s] = { revision: 1, editedBy: "author", updatedAt: AUTHORED_AT };
  return out;
}

/** The hand-authored API contract work sample. Deterministic: no clock or randomness. */
export function buildInventoryPaginationPackage(): { pkg: ScenarioPackage; prot: ProtectedMaterials } {
  const built = assemble(config(), BRIEF, CODE, TESTS, null, "template");
  const pkg: ScenarioPackage = {
    ...built.pkg,
    setupInstructions: [
      "Install Node.js 22 or newer. No npm packages are needed.",
      "Download the starter project and open it in your editor.",
      "Read README.md for the current contract and fixtures/partner-sync-log.json for the partner incident.",
      `From the project root, run the public tests: ${built.pkg.environment.testCommand}. Three public tests fail on the starter project: one reproduces the partner incident with offset pages, and two describe behavior you are asked to add.`,
    ],
    fixturePaths: [FIXTURE_PATH],
    coworkers: COWORKERS,
    submission: {
      requirements: [
        "Submit the project with your changes under src/, the updated README.md and the tests you added.",
        "Include tests in test/ for the behavior you changed.",
        "Keep the public tests in test/public.test.js passing.",
        "Answer the three handoff questions.",
      ],
      handoffPrompts: [
        { id: "what_changed", label: "What did you change?", help: "The contract you implemented, the files you changed, and how existing clients are affected." },
        { id: "how_checked", label: "How did you check it?", help: "Tests you added or ran, and anything you verified by hand." },
        { id: "unresolved", label: "What remains unresolved?", help: "Risks, assumptions, and anything you would do next, such as partner migration." },
      ],
    },
    accommodations: ["Extra time can be granted per invitation. Ask the hiring team before you start.", "Screen readers and keyboard-only use are supported in the browser workspace."],
    reviewQuestion: {
      coworkerId: "lead",
      text: "Before you hand this off: Coldharbor keeps sending offset=0&limit=500 and then offset=200&limit=500. What exactly changes for them with your change, and what can still go wrong for them if listings are deleted between those two requests?",
    },
    interruptionPolicy: "Requirements will not change during the task. Anneke may ask one question about your change near the end; nothing else will interrupt you. The timer keeps running if you step away or lose your connection; your saved files stay in the workspace, so reopen the invitation link to continue.",
    feedbackPolicy: "When the hiring team releases your report, you can see which acceptance criteria the tests confirmed and how each criterion was judged. Hidden test code is not shared. A reviewer reads your tests, your README changes and your handoff.",
    provenance: { path: "template", model: null, generatedAt: AUTHORED_AT, sections: fixedSections() },
  };
  const prot: ProtectedMaterials = { ...built.prot, coworkerFacts: COWORKER_FACTS, rubricNotes: RUBRIC_NOTES };
  return { pkg, prot };
}
