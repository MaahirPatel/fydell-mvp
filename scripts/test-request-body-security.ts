/**
 * Typed JSON bodies: declared fields are type- and size-checked, absent and
 * null fields stay undefined, undeclared fields are dropped, and a body that
 * is not a JSON object is a 400.
 *
 *   npm run test:request-body
 */
import assert from "node:assert/strict";
import { parseBodyValue, parseJsonBody, readJsonObject } from "../src/lib/security/request-body";

let failed = 0;
async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL ${name}\n       ${err instanceof Error ? err.message : String(err)}`);
  }
}

const SPEC = {
  action: { type: "string", max: 10 },
  done: { type: "boolean" },
  count: { type: "number", min: 0, max: 5, integer: true },
  kind: { type: "enum", values: ["a", "b"] as const },
  ids: { type: "stringArray", maxItems: 2, maxLength: 4 },
  meta: { type: "object", maxBytes: 30 },
} as const;

function jsonRequest(body: string): Request {
  return new Request("http://localhost/x", { method: "POST", headers: { "Content-Type": "application/json" }, body });
}

async function errorOf(result: ReturnType<typeof parseBodyValue>): Promise<string> {
  assert.equal(result.ok, false, "expected a 400");
  if (result.ok) return "";
  assert.equal(result.response.status, 400);
  return String(((await result.response.json()) as { error?: unknown }).error);
}

async function main() {
  await check("valid body passes through unchanged", () => {
    const result = parseBodyValue({ action: "go", done: true, count: 3, kind: "b", ids: ["x"], meta: { k: 1 } }, SPEC);
    assert.deepEqual(result.ok && result.body, { action: "go", done: true, count: 3, kind: "b", ids: ["x"], meta: { k: 1 } });
  });
  await check("absent and null fields are undefined; undeclared fields are dropped", () => {
    const result = parseBodyValue({ action: null, extra: "x" }, SPEC);
    assert.deepEqual(result.ok && result.body, {});
  });
  await check("non-object bodies are refused", async () => {
    for (const raw of [null, [], "text", 4]) assert.match(await errorOf(parseBodyValue(raw, SPEC)), /JSON object/);
  });
  await check("wrong types are refused with the field name", async () => {
    assert.match(await errorOf(parseBodyValue({ action: 5 }, SPEC)), /action must be text/);
    assert.match(await errorOf(parseBodyValue({ done: "true" }, SPEC)), /done must be true or false/);
    assert.match(await errorOf(parseBodyValue({ count: "3" }, SPEC)), /count must be a number/);
    assert.match(await errorOf(parseBodyValue({ kind: "c" }, SPEC)), /kind must be one of/);
    assert.match(await errorOf(parseBodyValue({ ids: "x" }, SPEC)), /ids must be a list/);
    assert.match(await errorOf(parseBodyValue({ meta: [] }, SPEC)), /meta must be an object/);
  });
  await check("size and range caps are enforced", async () => {
    assert.match(await errorOf(parseBodyValue({ action: "x".repeat(11) }, SPEC)), /at most 10/);
    assert.match(await errorOf(parseBodyValue({ count: 6 }, SPEC)), /at most 5/);
    assert.match(await errorOf(parseBodyValue({ count: 1.5 }, SPEC)), /whole number/);
    assert.match(await errorOf(parseBodyValue({ count: Number.NaN }, SPEC)), /number/);
    assert.match(await errorOf(parseBodyValue({ ids: ["a", "b", "c"] }, SPEC)), /at most 2 items/);
    assert.match(await errorOf(parseBodyValue({ ids: ["abcde"] }, SPEC)), /at most 4 characters/);
    assert.match(await errorOf(parseBodyValue({ meta: { text: "x".repeat(40) } }, SPEC)), /too large/);
  });
  await check("invalid JSON is a 400 unless the body is optional", async () => {
    const required = await parseJsonBody(jsonRequest("{nope"), SPEC);
    assert.equal(required.ok, false);
    const optional = await parseJsonBody(jsonRequest("{nope"), SPEC, { optional: true });
    assert.deepEqual(optional.ok && optional.body, {});
    const optionalNull = await parseJsonBody(jsonRequest("null"), SPEC, { optional: true });
    assert.deepEqual(optionalNull.ok && optionalNull.body, {});
  });
  await check("readJsonObject turns non-objects into {}", async () => {
    assert.deepEqual(await readJsonObject(jsonRequest("[1,2]")), {});
    assert.deepEqual(await readJsonObject(jsonRequest("oops")), {});
    assert.deepEqual(await readJsonObject(jsonRequest('{"a":1}')), { a: 1 });
  });

  console.log(failed === 0 ? "\nAll request body checks passed." : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

void main();
