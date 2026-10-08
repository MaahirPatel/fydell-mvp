/**
 * File contents for the "Add cursor pagination to the inventory list" work
 * sample. All data is synthetic. scripts/test-inventory-pagination-contract.ts
 * runs these files for real.
 */

/** Applies exact text edits to a file; throws when an edit no longer matches, so variants cannot drift silently. */
function variant(base: string, edits: Array<[string, string]>): string {
  let out = base;
  for (const [from, to] of edits) {
    if (!out.includes(from)) throw new Error(`inventory-pagination-contract variant edit not found: ${from.slice(0, 80)}`);
    out = out.split(from).join(to);
  }
  return out;
}

export const STARTER_README = `# inventory-api

Seller inventory endpoints for Marrowfield Market. Seller tools, our mobile app
and partner integrations (warehouses and repricing tools) read inventory through
these handlers. A handler takes a request \`{ params, query }\` and its
dependencies, and returns \`{ status, body }\`. The gateway adapter that turns
HTTP into these calls is not in this repository. Query values arrive as strings.

## Layout

- \`src/list-inventory.js\`: \`listInventory\`, the inventory list endpoint.
- \`src/get-inventory-item.js\`: \`getInventoryItem\`, a single item.
- \`src/inventory-repository.js\`: \`InventoryRepository\`, an in-memory stand-in for the inventory table.
- \`src/http.js\`: response and error helpers shared by every handler.
- \`src/routes.js\`: the route table the gateway adapter reads.
- \`fixtures/partner-sync-log.json\`: synthetic log of a partner sync from the recent incident.
- \`test/\`: unit tests. \`test/helpers.js\` builds listings and calls the handler.

## GET /v1/sellers/:sellerId/inventory

Lists a seller's inventory, oldest listing first (\`listedAt\` ascending).

Query parameters:

- \`offset\`: number of items to skip. Default 0.
- \`limit\`: page size. Default 50. Values above 200 are treated as 200.

Response body:

    {
      "items": [{ "id", "sku", "title", "quantity", "priceCents", "listedAt" }],
      "offset": 0,
      "limit": 50,
      "total": 312,
      "nextOffset": 50
    }

\`nextOffset\` is null on the last page. \`listedAt\` is set when a listing is
created and never changes.

## Compatibility

Published fields and parameters are never removed or renamed, and their meaning
does not change. Adding fields to a response is allowed. Several partners cannot
update their clients before next year, so existing requests must keep working as
documented here.

## Errors

Errors use status 400 or 404 with the body \`{ "error": { "code", "message" } }\`
(see \`src/http.js\`). Codes are lower snake case.

## Running

Node.js 22 or newer, no packages. From the project root:

    node --test
`;

export const STARTER_HTTP = `/** Response helpers shared by every handler. Error bodies are { error: { code, message } }. */
export function ok(body) {
  return { status: 200, body };
}

export function badRequest(code, message) {
  return { status: 400, body: { error: { code, message } } };
}

export function notFound(code, message) {
  return { status: 404, body: { error: { code, message } } };
}
`;

export const STARTER_REPOSITORY = `/**
 * In-memory stand-in for the inventory table. Like the real table, rows come
 * back in storage order, which carries no meaning: an update rewrites the row
 * at the end of storage. id, sellerId and listedAt never change.
 */
export class InventoryRepository {
  #rows = [];

  insert(item) {
    if (this.#rows.some((row) => row.id === item.id)) throw new Error("inventory item " + item.id + " already exists");
    this.#rows.push({ ...item });
  }

  update(id, changes) {
    const index = this.#rows.findIndex((row) => row.id === id);
    if (index === -1) throw new Error("inventory item " + id + " does not exist");
    const [row] = this.#rows.splice(index, 1);
    this.#rows.push({ ...row, ...changes, id: row.id, sellerId: row.sellerId, listedAt: row.listedAt });
  }

  remove(id) {
    const index = this.#rows.findIndex((row) => row.id === id);
    if (index !== -1) this.#rows.splice(index, 1);
  }

  findById(id) {
    const row = this.#rows.find((r) => r.id === id);
    return row ? { ...row } : null;
  }

  listBySeller(sellerId) {
    return this.#rows.filter((row) => row.sellerId === sellerId).map((row) => ({ ...row }));
  }
}
`;

export const STARTER_LIST = `import { ok } from "./http.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /v1/sellers/:sellerId/inventory
 * Query: offset, limit (strings, as parsed from the URL). See README.md for the contract.
 */
export function listInventory(request, { repository }) {
  const { sellerId } = request.params;
  const query = request.query ?? {};
  const limit = Math.min(Number(query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Number(query.offset) || 0;

  const rows = repository.listBySeller(sellerId).sort(byListedAt);
  const page = rows.slice(offset, offset + limit);
  const end = offset + page.length;
  return ok({
    items: page.map(toPublicItem),
    offset,
    limit,
    total: rows.length,
    nextOffset: end < rows.length ? end : null,
  });
}

function byListedAt(a, b) {
  if (a.listedAt === b.listedAt) return 0;
  return a.listedAt < b.listedAt ? -1 : 1;
}

export function toPublicItem(row) {
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    quantity: row.quantity,
    priceCents: row.priceCents,
    listedAt: row.listedAt,
  };
}
`;

export const STARTER_GET_ITEM = `import { notFound, ok } from "./http.js";
import { toPublicItem } from "./list-inventory.js";

/** GET /v1/sellers/:sellerId/inventory/:itemId */
export function getInventoryItem(request, { repository }) {
  const { sellerId, itemId } = request.params;
  const row = repository.findById(itemId);
  if (!row || row.sellerId !== sellerId) {
    return notFound("item_not_found", "No inventory item " + itemId + " for seller " + sellerId + ".");
  }
  return ok(toPublicItem(row));
}
`;

export const STARTER_ROUTES = `import { getInventoryItem } from "./get-inventory-item.js";
import { listInventory } from "./list-inventory.js";

/** Route table read by the gateway adapter. Each handler is called as handler({ params, query }, { repository }). */
export const routes = [
  { method: "GET", path: "/v1/sellers/:sellerId/inventory", handler: listInventory },
  { method: "GET", path: "/v1/sellers/:sellerId/inventory/:itemId", handler: getInventoryItem },
];
`;

const UPDATED_DURING_SYNC = ["0012", "0019", "0031", "0047", "0058", "0063", "0077", "0090", "0104", "0118", "0126", "0141", "0163", "0187"];
const NEVER_RECEIVED = Array.from({ length: 14 }, (_, i) => String(201 + i).padStart(4, "0"));

export const STARTER_FIXTURE = `${JSON.stringify(
  {
    description:
      "Synthetic log of Coldharbor Fulfilment's nightly inventory sync for seller sel_tidewater_goods on 30 September, the stock updates that landed during it, and the partner's reconciliation report. Times are UTC.",
    seller: "sel_tidewater_goods",
    sellerInventory: {
      total: 312,
      groups: [
        { listedAt: "2026-03-02T09:00:00Z", items: 286, ids: "inv_t0001 to inv_t0286", source: "one bulk CSV import" },
        { listedAt: "between 2026-04-11 and 2026-09-21", items: 26, ids: "inv_t0287 to inv_t0312", source: "created one at a time in seller tools" },
      ],
    },
    requests: [
      {
        at: "2026-09-30T02:00:01Z",
        client: "coldharbor-sync/2.3",
        path: "/v1/sellers/sel_tidewater_goods/inventory",
        query: "offset=0&limit=500",
        status: 200,
        itemsReturned: 200,
        body: { offset: 0, limit: 200, total: 312, nextOffset: 200 },
      },
      {
        at: "2026-09-30T02:00:09Z",
        client: "coldharbor-sync/2.3",
        path: "/v1/sellers/sel_tidewater_goods/inventory",
        query: "offset=200&limit=500",
        status: 200,
        itemsReturned: 112,
        body: { offset: 200, limit: 200, total: 312, nextOffset: null },
      },
    ],
    stockUpdatesBetweenRequests: UPDATED_DURING_SYNC.map((id, i) => ({
      at: `2026-09-30T02:00:0${2 + Math.floor(i / 3)}Z`,
      item: `inv_t${id}`,
      change: "quantity decreased by 1 (flash sale order)",
    })),
    partnerReport: {
      rowsReceived: 312,
      distinctItems: 298,
      receivedTwice: UPDATED_DURING_SYNC.map((id) => `inv_t${id}`),
      neverReceived: NEVER_RECEIVED.map((id) => `inv_t${id}`),
      partnerAction: "Stock for the 14 never-received items was set to 0 on the partner's storefronts. 3 of the items received twice oversold the next morning.",
    },
    otherClients: [
      { client: "marrowfield-mobile/4.2.1", pattern: "offset=0, 25, 50 and so on with limit=25", shareOfSessions: "8%" },
      { client: "seller-tools-web", pattern: "offset and limit=100" },
    ],
  },
  null,
  2,
)}\n`;

export const TEST_HELPERS = `import { InventoryRepository } from "../src/inventory-repository.js";
import { listInventory } from "../src/list-inventory.js";

export const SELLER = "sel_tidewater_goods";
export const BULK_IMPORT_AT = "2026-03-02T09:00:00Z";

/** A listing as seller tools create it. Listings from one bulk import share listedAt. */
export function listing(n, overrides = {}) {
  const suffix = String(n).padStart(4, "0");
  return {
    id: "inv_t" + suffix,
    sellerId: SELLER,
    sku: "TW-" + suffix,
    title: "Tidewater item " + n,
    quantity: 10 + (n % 7),
    priceCents: 1500 + n * 25,
    listedAt: BULK_IMPORT_AT,
    ...overrides,
  };
}

export function repositoryWith(items) {
  const repository = new InventoryRepository();
  for (const item of items) repository.insert(item);
  return repository;
}

/** Calls the handler as the gateway does: params from the path, query values as strings. */
export function list(repository, query = {}, sellerId = SELLER) {
  return listInventory({ params: { sellerId }, query }, { repository });
}

export function idsOf(response) {
  return response.body.items.map((item) => item.id);
}
`;

export const TEST_PUBLIC = `import test from "node:test";
import assert from "node:assert/strict";
import { idsOf, list, listing, repositoryWith } from "./helpers.js";

test("paging with offset while stock changes returns each item once", () => {
  const items = Array.from({ length: 12 }, (_, i) => listing(i + 1));
  const repository = repositoryWith(items);

  const seen = [];
  let offset = 0;
  for (let page = 0; page < 10 && offset !== null; page++) {
    const response = list(repository, { offset: String(offset), limit: "5" });
    assert.equal(response.status, 200);
    seen.push(...idsOf(response));
    if (page === 0) {
      for (const item of response.body.items.slice(0, 2)) repository.update(item.id, { quantity: item.quantity - 1 });
    }
    offset = response.body.nextOffset;
  }

  assert.deepEqual(seen, items.map((item) => item.id));
});

test("following nextCursor visits every listing once while listings are added and removed", () => {
  const repository = repositoryWith([
    ...Array.from({ length: 9 }, (_, i) => listing(i + 1)),
    listing(10, { listedAt: "2026-04-11T15:30:00Z" }),
    listing(11, { listedAt: "2026-04-11T15:30:00Z" }),
  ]);

  const seen = [];
  let response = list(repository, { limit: "4" });
  for (let page = 0; page < 10; page++) {
    assert.equal(response.status, 200);
    seen.push(...idsOf(response));
    if (page === 0) {
      repository.remove(listing(2).id);
      repository.insert(listing(12, { listedAt: "2026-10-01T08:00:00Z" }));
    }
    if (response.body.nextCursor === null) break;
    assert.equal(typeof response.body.nextCursor, "string", "every page needs nextCursor");
    response = list(repository, { cursor: response.body.nextCursor, limit: "4" });
  }

  assert.equal(new Set(seen).size, seen.length, "an item was returned twice");
  for (const n of [1, 3, 4, 5, 6, 7, 8, 9, 10, 11]) assert.ok(seen.includes(listing(n).id), listing(n).id + " was skipped");
});

test("offset pages keep their documented fields", () => {
  const repository = repositoryWith(Array.from({ length: 7 }, (_, i) => listing(i + 1)));

  const first = list(repository, { offset: "0", limit: "5" });
  const second = list(repository, { offset: "5", limit: "5" });

  assert.equal(first.status, 200);
  const { offset, limit, total, nextOffset } = first.body;
  assert.deepEqual({ offset, limit, total, nextOffset }, { offset: 0, limit: 5, total: 7, nextOffset: 5 });
  assert.deepEqual(Object.keys(first.body.items[0]).sort(), ["id", "listedAt", "priceCents", "quantity", "sku", "title"]);
  assert.equal(second.body.items.length, 2);
  assert.equal(second.body.nextOffset, null);
});

test("a limit that is not a positive integer is rejected", () => {
  const repository = repositoryWith([listing(1)]);

  for (const limit of ["0", "abc"]) {
    const response = list(repository, { limit });
    assert.equal(response.status, 400, "limit=" + limit);
    assert.equal(response.body.error.code, "invalid_limit");
  }
});
`;

export const TEST_EVALUATION = `import test from "node:test";
import assert from "node:assert/strict";
import { InventoryRepository } from "../src/inventory-repository.js";
import { listInventory } from "../src/list-inventory.js";

const SELLER = "sel_harrow_supply";
const OTHER_SELLER = "sel_lindenfold";
const BULK = "2026-02-17T13:45:00Z";

function item(n, overrides = {}) {
  const suffix = String(n).padStart(4, "0");
  return {
    id: "inv_h" + suffix,
    sellerId: SELLER,
    sku: "HS-" + suffix,
    title: "Harrow item " + n,
    quantity: 5 + (n % 9),
    priceCents: 999 + n * 10,
    listedAt: BULK,
    ...overrides,
  };
}

function repo(items) {
  const r = new InventoryRepository();
  for (const i of items) r.insert(i);
  return r;
}

function list(r, query, sellerId = SELLER) {
  return listInventory({ params: { sellerId }, query }, { repository: r });
}

function ids(response) {
  return response.body.items.map((i) => i.id);
}

function range(from, to) {
  const out = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
}

function walkCursor(r, limit, between = () => {}) {
  const seen = [];
  let response = list(r, { limit: String(limit) });
  for (let page = 0; page < 40; page++) {
    assert.equal(response.status, 200, JSON.stringify(response.body));
    seen.push(...response.body.items);
    between(page);
    if (response.body.nextCursor === null) return seen;
    assert.equal(typeof response.body.nextCursor, "string", "nextCursor must be a string or null");
    response = list(r, { cursor: response.body.nextCursor, limit: String(limit) });
  }
  assert.fail("the cursor walk did not end");
}

function assertOrdered(items) {
  for (let i = 1; i < items.length; i++) {
    const a = items[i - 1];
    const b = items[i];
    assert.ok(a.listedAt < b.listedAt || (a.listedAt === b.listedAt && a.id < b.id), "out of order: " + a.id + " before " + b.id);
  }
}

function assertError(response, code, label) {
  assert.equal(response.status, 400, label + " answered " + response.status);
  assert.equal(response.body.error.code, code, label);
  assert.equal(typeof response.body.error.message, "string", label);
}

function base64url(text) {
  return btoa(text).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
}

test("offset clients page through every item with the documented fields", () => {
  const items = [...range(1, 6).map((n) => item(n)), ...range(7, 11).map((n) => item(n, { listedAt: "2026-05-04T08:00:00Z" }))];
  const r = repo(items);

  const pages = [];
  let offset = 0;
  while (offset !== null && pages.length < 10) {
    const response = list(r, { offset: String(offset), limit: "4" });
    assert.equal(response.status, 200);
    pages.push(response.body);
    offset = response.body.nextOffset;
  }

  assert.deepEqual(pages.map((p) => [p.offset, p.limit, p.total, p.nextOffset]), [[0, 4, 11, 4], [4, 4, 11, 8], [8, 4, 11, null]]);
  assert.deepEqual(pages.flatMap((p) => p.items.map((i) => i.id)), items.map((i) => i.id));
  assert.deepEqual(Object.keys(pages[0].items[0]).sort(), ["id", "listedAt", "priceCents", "quantity", "sku", "title"]);
  const past = list(r, { offset: "20", limit: "4" });
  assert.equal(past.status, 200);
  assert.deepEqual([past.body.items.length, past.body.offset, past.body.total, past.body.nextOffset], [0, 20, 11, null]);
});

test("a limit above 200 is still treated as 200 for offset clients", () => {
  const r = repo(range(1, 230).map((n) => item(n)));

  const response = list(r, { offset: "0", limit: "500" });

  assert.equal(response.status, 200, "a partner sends limit=500 on every request");
  assert.equal(response.body.limit, 200);
  assert.equal(response.body.items.length, 200);
  assert.equal(response.body.nextOffset, 200);
  assert.equal(response.body.total, 230);
});

test("listings that share listedAt keep one order across requests after stock updates", () => {
  const r = repo([4, 1, 6, 2, 5, 3].map((n) => item(n)));
  const expected = range(1, 6).map((n) => item(n).id);

  assert.deepEqual(ids(list(r, { offset: "0", limit: "6" })), expected);
  r.update(item(1).id, { quantity: 0 });
  r.update(item(4).id, { quantity: 2 });
  assert.deepEqual(ids(list(r, { offset: "0", limit: "6" })), expected);
  assert.deepEqual([...ids(list(r, { offset: "0", limit: "3" })), ...ids(list(r, { offset: "3", limit: "3" }))], expected);
});

test("a request without paging parameters returns the first 50 items", () => {
  const r = repo(range(1, 60).map((n) => item(n)));

  const first = list(r, {});
  const rest = list(r, { offset: "50" });

  assert.equal(first.status, 200);
  assert.deepEqual([first.body.items.length, first.body.offset, first.body.limit, first.body.total, first.body.nextOffset], [50, 0, 50, 60, 50]);
  assert.deepEqual(ids(first), range(1, 50).map((n) => item(n).id));
  assert.deepEqual([rest.body.items.length, rest.body.limit, rest.body.nextOffset], [10, 50, null]);
});

test("a cursor walk returns each item once while listings are added removed and restocked", () => {
  const r = repo([
    ...range(1, 8).map((n) => item(n)),
    ...range(9, 12).map((n) => item(n, { listedAt: "2026-04-11T15:30:00Z" })),
    ...range(13, 15).map((n) => item(n, { listedAt: "2026-06-20T11:05:00Z" })),
  ]);
  const removedBeforeSeen = item(10).id;

  const seen = walkCursor(r, 4, (page) => {
    if (page === 0) {
      r.remove(item(3).id);
      r.update(item(2).id, { quantity: 0 });
      r.update(item(6).id, { quantity: 40 });
    }
    if (page === 1) {
      r.insert(item(16, { listedAt: "2026-09-30T02:00:05Z" }));
      r.remove(removedBeforeSeen);
      r.update(item(13).id, { quantity: 1 });
    }
  });

  const seenIds = seen.map((i) => i.id);
  assert.equal(new Set(seenIds).size, seenIds.length, "an item was returned twice");
  for (const n of [1, 2, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15]) assert.ok(seenIds.includes(item(n).id), item(n).id + " was skipped");
  assert.ok(!seenIds.includes(removedBeforeSeen));
  assertOrdered(seen);
});

test("a cursor walk keeps items that share a listedAt across a page boundary", () => {
  const r = repo([...range(1, 7).map((n) => item(n)), item(8, { listedAt: "2026-03-01T00:00:00Z" }), item(9, { listedAt: "2026-03-01T00:00:00Z" })]);

  const seen = walkCursor(r, 3);

  assert.deepEqual(seen.map((i) => i.id), range(1, 9).map((n) => item(n).id));
});

test("the last page has a null nextCursor, including for a seller with no items", () => {
  const r = repo([...range(1, 5).map((n) => item(n)), item(6, { sellerId: OTHER_SELLER })]);

  const empty = list(r, {}, "sel_no_listings");
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.items, []);
  assert.equal(empty.body.nextCursor, null);
  assert.equal(empty.body.nextOffset, null);

  assert.equal(list(r, { limit: "5" }).body.nextCursor, null, "nothing follows the last item");
  const page = list(r, { limit: "3" });
  assert.equal(typeof page.body.nextCursor, "string");
  const last = list(r, { cursor: page.body.nextCursor, limit: "3" });
  assert.equal(last.status, 200);
  assert.deepEqual(ids(last), [item(4).id, item(5).id]);
  assert.equal(last.body.nextCursor, null);
});

test("nextCursor does not expose the item id or listedAt", () => {
  const r = repo(range(1, 6).map((n) => item(n, { listedAt: "2026-07-0" + n + "T10:00:00Z" })));

  const first = list(r, { limit: "2" });
  const second = list(r, { cursor: first.body.nextCursor, limit: "2" });

  for (const [cursor, last] of [[first.body.nextCursor, item(2)], [second.body.nextCursor, item(4)]]) {
    assert.equal(typeof cursor, "string");
    assert.ok(!cursor.includes(last.id) && !cursor.includes(last.id.slice(4)), "the cursor shows the item id: " + cursor);
    assert.ok(!cursor.includes(last.listedAt.slice(0, 10)), "the cursor shows listedAt: " + cursor);
  }
});

test("an undecodable or malformed cursor is rejected with invalid_cursor", () => {
  const r = repo(range(1, 4).map((n) => item(n)));

  for (const cursor of ["not a cursor", "%%%", "aGVsbG8", base64url(JSON.stringify({ page: 2 })), base64url("[1,2,3]")]) {
    assertError(list(r, { cursor, limit: "2" }), "invalid_cursor", "cursor " + JSON.stringify(cursor));
  }
});

test("a cursor issued for another seller is rejected", () => {
  const r = repo([
    ...range(1, 4).map((n) => item(n, { listedAt: "2026-08-1" + n + "T09:00:00Z" })),
    ...range(5, 8).map((n) => item(n, { sellerId: OTHER_SELLER, listedAt: "2026-08-1" + n + "T09:00:00Z" })),
  ]);
  const cursor = list(r, { limit: "2" }).body.nextCursor;
  assert.equal(typeof cursor, "string");

  assertError(list(r, { cursor, limit: "2" }, OTHER_SELLER), "invalid_cursor", "another seller's cursor");
  const own = list(r, { cursor, limit: "2" });
  assert.equal(own.status, 200);
  assert.deepEqual(ids(own), [item(3).id, item(4).id]);
});

test("offset and cursor in the same request are rejected", () => {
  const r = repo(range(1, 6).map((n) => item(n)));
  const cursor = list(r, { limit: "2" }).body.nextCursor;
  assert.equal(typeof cursor, "string");

  assertError(list(r, { offset: "2", cursor, limit: "2" }), "invalid_request", "offset with cursor");
});

test("limit and offset that are not valid numbers are rejected with their own codes", () => {
  const r = repo(range(1, 6).map((n) => item(n)));

  for (const limit of ["0", "-1", "2.5", "abc"]) assertError(list(r, { limit }), "invalid_limit", "limit=" + limit);
  for (const offset of ["-1", "abc", "1.5"]) assertError(list(r, { offset, limit: "2" }), "invalid_offset", "offset=" + offset);
  const cursor = list(r, { limit: "2" }).body.nextCursor;
  assert.equal(typeof cursor, "string");
  assertError(list(r, { cursor, limit: "0" }), "invalid_limit", "limit=0 with a cursor");
});
`;

export const REFERENCE_LIST = `import { badRequest, ok } from "./http.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const CURSOR_VERSION = 1;
const INVALID = Symbol("invalid");

/**
 * GET /v1/sellers/:sellerId/inventory
 * Query: offset, limit, cursor (strings, as parsed from the URL). See README.md for the contract.
 */
export function listInventory(request, { repository }) {
  const { sellerId } = request.params;
  const query = request.query ?? {};

  const limit = parseCount(query.limit, 1);
  if (limit === INVALID) return badRequest("invalid_limit", "limit must be a positive integer.");
  const offset = parseCount(query.offset, 0);
  if (offset === INVALID) return badRequest("invalid_offset", "offset must be a non-negative integer.");
  if (query.cursor !== undefined && offset !== undefined) {
    return badRequest("invalid_request", "Send offset or cursor, not both.");
  }
  const pageSize = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const rows = repository.listBySeller(sellerId).sort(compareListing);

  if (query.cursor !== undefined) {
    const after = decodeCursor(query.cursor, sellerId);
    if (!after) return badRequest("invalid_cursor", "cursor is not valid for this seller.");
    const start = startAfter(rows, after);
    const page = rows.slice(start, start + pageSize);
    const end = start + page.length;
    return ok({
      items: page.map(toPublicItem),
      limit: pageSize,
      nextCursor: end < rows.length ? encodeCursor(sellerId, page[page.length - 1]) : null,
    });
  }

  const from = offset ?? 0;
  const page = rows.slice(from, from + pageSize);
  const end = from + page.length;
  return ok({
    items: page.map(toPublicItem),
    offset: from,
    limit: pageSize,
    total: rows.length,
    nextOffset: end < rows.length ? end : null,
    nextCursor: end < rows.length ? encodeCursor(sellerId, page[page.length - 1]) : null,
  });
}

/** listedAt ascending, then id ascending. Ids are unique, so this is a total order that updates cannot change. */
function compareListing(a, b) {
  if (a.listedAt !== b.listedAt) return a.listedAt < b.listedAt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/** Index of the first row that sorts after the cursor position. */
function startAfter(rows, after) {
  const index = rows.findIndex((row) => compareListing(row, after) > 0);
  return index === -1 ? rows.length : index;
}

function parseCount(raw, min) {
  if (raw === undefined) return undefined;
  if (typeof raw !== "string" || !/^\\d+$/.test(raw)) return INVALID;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= min ? value : INVALID;
}

function encodeCursor(sellerId, row) {
  return toBase64Url(JSON.stringify({ v: CURSOR_VERSION, s: sellerId, t: row.listedAt, i: row.id }));
}

function decodeCursor(cursor, sellerId) {
  if (typeof cursor !== "string" || cursor === "") return null;
  let data;
  try {
    data = JSON.parse(fromBase64Url(cursor));
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  if (data.v !== CURSOR_VERSION || data.s !== sellerId) return null;
  if (typeof data.t !== "string" || typeof data.i !== "string") return null;
  return { listedAt: data.t, id: data.i };
}

function toBase64Url(text) {
  return btoa(text).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new Error("cursor is not base64url");
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64 + "===".slice((base64.length + 3) % 4));
}

export function toPublicItem(row) {
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    quantity: row.quantity,
    priceCents: row.priceCents,
    listedAt: row.listedAt,
  };
}
`;

export const REFERENCE_README = variant(STARTER_README, [
  [
    `Lists a seller's inventory, oldest listing first (\`listedAt\` ascending).

Query parameters:

- \`offset\`: number of items to skip. Default 0.
- \`limit\`: page size. Default 50. Values above 200 are treated as 200.
`,
    `Lists a seller's inventory, oldest listing first: \`listedAt\` ascending, then
\`id\` ascending for listings created in the same second. The order does not
change when stock or other fields are updated.

Query parameters:

- \`limit\`: page size, a positive integer. Default 50. Values above 200 are
  treated as 200. Anything else is rejected with \`invalid_limit\`.
- \`offset\`: number of items to skip, a non-negative integer. Default 0.
  Anything else is rejected with \`invalid_offset\`.
- \`cursor\`: the \`nextCursor\` from a previous page. Cannot be combined with
  \`offset\` (\`invalid_request\`). A cursor is only valid for the seller it was
  issued for; an unreadable or foreign cursor is rejected with \`invalid_cursor\`.

### Cursor pagination (recommended)

Make the first request without \`offset\` or \`cursor\`, then repeat the request
with \`cursor\` set to the \`nextCursor\` you received, until \`nextCursor\` is
null. You may change \`limit\` between pages. Every item that exists for the
whole walk is returned exactly once, in order, even while items are added,
removed or restocked. Items added during the walk appear if they sort after
your position. Cursors are opaque: do not parse or build them.

Cursor pages return \`{ items, limit, nextCursor }\`.

### Offset pagination

Still supported, with the same fields as before. Offsets count positions, so if
items are added or removed between your requests, items can shift between pages
and be skipped or repeated. Use cursors for full syncs.
`,
  ],
  [
    `\`nextOffset\` is null on the last page.`,
    `\`nextOffset\` and \`nextCursor\` are null on the last page. Offset pages also
include \`nextCursor\`, so a client can switch to cursors at any page.`,
  ],
  [`      "nextOffset": 50
    }`, `      "nextOffset": 50,
      "nextCursor": "eyJ2IjoxLC..."
    }`],
]);

export const WRONG_OFFSET_CURSOR_LIST = variant(REFERENCE_LIST, [
  ["encodeCursor(sellerId, page[page.length - 1])", "encodeCursor(sellerId, end)"],
  ["const start = startAfter(rows, after);", "const start = Math.min(after.offset, rows.length);"],
  [
    `/** Index of the first row that sorts after the cursor position. */
function startAfter(rows, after) {
  const index = rows.findIndex((row) => compareListing(row, after) > 0);
  return index === -1 ? rows.length : index;
}

`,
    "",
  ],
  [
    `function encodeCursor(sellerId, row) {
  return toBase64Url(JSON.stringify({ v: CURSOR_VERSION, s: sellerId, t: row.listedAt, i: row.id }));
}`,
    `function encodeCursor(sellerId, nextOffset) {
  return toBase64Url(JSON.stringify({ v: CURSOR_VERSION, s: sellerId, o: nextOffset }));
}`,
  ],
  [
    `  if (typeof data.t !== "string" || typeof data.i !== "string") return null;
  return { listedAt: data.t, id: data.i };`,
    `  if (!Number.isSafeInteger(data.o) || data.o < 0) return null;
  return { offset: data.o };`,
  ],
]);

export const WRONG_LISTED_AT_ONLY_CURSOR_LIST = variant(REFERENCE_LIST, [
  ["const index = rows.findIndex((row) => compareListing(row, after) > 0);", "const index = rows.findIndex((row) => row.listedAt > after.listedAt);"],
]);

export const WRONG_REJECT_LARGE_LIMIT_LIST = variant(REFERENCE_LIST, [
  [
    "  const pageSize = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);",
    `  if (limit !== undefined && limit > MAX_LIMIT) return badRequest("invalid_limit", "limit must be at most " + MAX_LIMIT + ".");
  const pageSize = limit ?? DEFAULT_LIMIT;`,
  ],
]);

export const WRONG_TIEBREAK_CURSOR_ONLY_LIST = variant(REFERENCE_LIST, [
  [
    "const rows = repository.listBySeller(sellerId).sort(compareListing);",
    "const rows = repository.listBySeller(sellerId).sort(query.cursor === undefined ? byListedAt : compareListing);",
  ],
  [
    "/** listedAt ascending, then id ascending.",
    `function byListedAt(a, b) {
  if (a.listedAt === b.listedAt) return 0;
  return a.listedAt < b.listedAt ? -1 : 1;
}

/** listedAt ascending, then id ascending.`,
  ],
]);

export const WRONG_UNSCOPED_CURSOR_LIST = variant(REFERENCE_LIST, [
  ["if (data.v !== CURSOR_VERSION || data.s !== sellerId) return null;", "if (data.v !== CURSOR_VERSION) return null;"],
  ["cursor is not valid for this seller.", "cursor is not valid."],
]);

export const WRONG_READABLE_CURSOR_LIST = variant(REFERENCE_LIST, [
  [`  return btoa(text).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");`, "  return encodeURIComponent(text);"],
  [
    `  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new Error("cursor is not base64url");
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64 + "===".slice((base64.length + 3) % 4));`,
    "  return decodeURIComponent(text);",
  ],
  ["toBase64Url", "encodeText"],
  ["fromBase64Url", "decodeText"],
]);
