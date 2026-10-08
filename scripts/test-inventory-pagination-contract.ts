/**
 * Proves the "Add cursor pagination to the inventory list without breaking
 * clients" work sample with the real authoring checks on the local runner: the
 * starter shows the problem, the reference passes every test, each incorrect
 * solution is caught by the test aimed at it (and only on the criterion it
 * breaks), results repeat, and nothing evaluator-only reaches the candidate
 * package. No model calls and no database.
 *
 * Run: npx tsx --conditions react-server scripts/test-inventory-pagination-contract.ts
 */
import assert from "node:assert/strict";
import { validatePackage } from "../src/lib/eng/authoring/checks";
import { packageSha256 } from "../src/lib/eng/authoring/package";
import { localRunner } from "../src/lib/eng/authoring/runner";
import { EXEMPLAR } from "../src/lib/eng/scenarios/inventory-pagination-contract/exemplar";
import { buildInventoryPaginationPackage } from "../src/lib/eng/scenarios/inventory-pagination-contract/package";

const EXPECTED_CATCH: Record<string, string> = {
  "wrong-1": "a cursor walk returns each item once while listings are added removed and restocked",
  "wrong-2": "a cursor walk keeps items that share a listedAt across a page boundary",
  "wrong-3": "a limit above 200 is still treated as 200 for offset clients",
  "wrong-4": "listings that share listedAt keep one order across requests after stock updates",
  "wrong-5": "a cursor issued for another seller is rejected",
  "wrong-6": "nextCursor does not expose the item id or listedAt",
};

/** Criteria an incorrect solution may fail. A mistake must not cost credit on criteria it does not break. */
const EXPECTED_CRITERIA: Record<string, string[]> = {
  "wrong-1": ["AC-2"],
  "wrong-2": ["AC-2"],
  "wrong-3": ["AC-1"],
  "wrong-4": ["AC-1"],
  "wrong-5": ["AC-3"],
  "wrong-6": ["AC-2"],
};

const PUBLIC_REPRODUCTION = "paging with offset while stock changes returns each item once";

const FAIL_ON_STARTER = [
  "listings that share listedAt keep one order across requests after stock updates",
  "a cursor walk returns each item once while listings are added removed and restocked",
  "a cursor walk keeps items that share a listedAt across a page boundary",
  "the last page has a null nextCursor, including for a seller with no items",
  "nextCursor does not expose the item id or listedAt",
  "an undecodable or malformed cursor is rejected with invalid_cursor",
  "a cursor issued for another seller is rejected",
  "offset and cursor in the same request are rejected",
  "limit and offset that are not valid numbers are rejected with their own codes",
];

/** Legacy behavior the starter already has; these must pass on it so the tests prove nothing was broken. */
const PASS_ON_STARTER = [
  "offset pages keep their documented fields",
  "offset clients page through every item with the documented fields",
  "a limit above 200 is still treated as 200 for offset clients",
  "a request without paging parameters returns the first 50 items",
];

async function main() {
  const { pkg, prot } = buildInventoryPaginationPackage();
  const again = EXEMPLAR.build();
  assert.equal(packageSha256(pkg, prot), packageSha256(again.pkg, again.prot), "the package must be deterministic");
  assert.deepEqual(again.pkg.provenance, pkg.provenance);
  assert.equal(EXEMPLAR.track, "backend_api");
  assert.equal(EXEMPLAR.taskFamily, "backend.contract");
  assert.equal(pkg.config.language, "javascript");
  assert.equal(pkg.environment.id, "node-stdlib");

  const candidate = JSON.stringify(pkg);
  assert.ok(!candidate.includes("\u2014"), "candidate-facing text contains an em dash");
  assert.ok(!JSON.stringify(EXEMPLAR.pattern).includes("\u2014"), "exemplar pattern contains an em dash");
  assert.ok(!candidate.includes("evaluation.test"), "the evaluation test file is referenced in the candidate package");
  for (const ref of prot.protectedTestRefs) assert.ok(!candidate.includes(ref.name), `protected test "${ref.name}" leaked`);
  for (const f of prot.protectedTests) {
    assert.ok(!pkg.starterFiles.some((s) => s.path === f.path), `${f.path} is a starter file`);
    assert.ok(!/from\s+["']\.\/helpers(\.js)?["']/.test(f.content), `${f.path} imports candidate-editable test helpers`);
    assert.ok(!/from\s+["']\.\.\/test\//.test(f.content), `${f.path} imports from the candidate test folder`);
  }
  for (const marker of ["encodeCursor", "decodeCursor", "compareListing", "startAfter", "btoa", "atob", "base64url", "CURSOR_VERSION"]) {
    assert.ok(!candidate.includes(marker), `solution code leaked: ${marker}`);
  }
  for (const facts of Object.values(prot.coworkerFacts)) for (const f of facts) assert.ok(!candidate.includes(f.text.slice(0, 60)), `coworker fact ${f.id} leaked`);
  for (const note of Object.values(prot.rubricNotes)) assert.ok(!candidate.includes(note.slice(0, 60)), "rubric note leaked");
  for (const a of prot.reference.approaches) assert.ok(!candidate.includes(a.slice(0, 60)), "reference approach leaked");
  for (const s of prot.incorrectSolutions) assert.ok(!candidate.includes(s.description.slice(0, 60)), `incorrect solution ${s.id} leaked`);
  assert.deepEqual(pkg.coworkers.map((c) => c.id), ["lead", "partner"]);
  for (const c of pkg.coworkers) for (const f of prot.coworkerFacts[c.id] ?? []) assert.ok(f.id && f.text && f.topics && f.topics.length > 0, `fact ${f.id} needs id, text and topics`);
  assert.deepEqual(pkg.submission.handoffPrompts.map((p) => p.id), ["what_changed", "how_checked", "unresolved"]);
  assert.deepEqual(pkg.fixturePaths, ["fixtures/partner-sync-log.json"]);
  const fixture = pkg.starterFiles.find((f) => f.path === "fixtures/partner-sync-log.json");
  assert.ok(fixture);
  JSON.parse(fixture.content);
  assert.ok(pkg.starterFiles.some((f) => f.path === "package.json" && JSON.parse(f.content).type === "module"), "package.json with type module");
  assert.ok(prot.incorrectSolutions.length >= 3);
  assert.ok(prot.reference.files.some((f) => f.path === "README.md"), "the reference documents the new contract");
  const starterSource = pkg.starterFiles.filter((f) => f.path.startsWith("src/"));
  const starterLines = starterSource.reduce((n, f) => n + f.content.split("\n").length, 0);
  console.log(`ok  candidate package is deterministic and holds no evaluator material (${starterSource.length} source files, ${starterLines} lines)`);

  const record = await validatePackage(pkg, prot, localRunner(), null);
  console.log(`\nrunner: ${record.runner?.label ?? "none"}`);
  for (const c of record.checks) console.log(`  ${c.status.padEnd(7)} ${c.id.padEnd(22)} ${c.detail}`);
  const failing = record.checks.filter((c) => c.status !== "passed");
  assert.equal(failing.length, 0, JSON.stringify(failing.map((c) => ({ id: c.id, issues: c.issues, output: c.evidence[0]?.output.slice(0, 3000) })), null, 2));
  assert.equal(record.status, "passed");

  const by = Object.fromEntries(record.checks.map((c) => [c.id, c]));
  const setupTests = by.setup.evidence[0].tests;
  assert.equal(setupTests.find((t) => t.name === PUBLIC_REPRODUCTION)?.outcome, "failed", "the public reproduction must fail on the starter");

  const baseline = by.baseline.evidence[0].tests;
  for (const name of FAIL_ON_STARTER) {
    const outcome = baseline.find((t) => t.name === name)?.outcome;
    assert.ok(outcome === "failed" || outcome === "error", `${name} should fail on the starter, got ${outcome}`);
  }
  for (const name of PASS_ON_STARTER) assert.equal(baseline.find((t) => t.name === name)?.outcome, "passed", `${name} checks legacy behavior and should pass on the starter`);

  const refs = [...pkg.publicTests, ...prot.protectedTestRefs];
  prot.incorrectSolutions.forEach((s, i) => {
    const ev = by.incorrect.evidence[i];
    const failed = ev.tests.filter((t) => t.outcome === "failed" || t.outcome === "error").map((t) => t.name);
    const expected = EXPECTED_CATCH[s.id];
    assert.ok(expected, `no expectation for ${s.id}`);
    assert.ok(failed.includes(expected), `${s.id} should be caught by "${expected}"; failed: ${failed.join(", ")}`);
    const criteria = [...new Set(failed.flatMap((n) => refs.find((r) => r.name === n)?.criterionIds ?? []))].sort();
    assert.deepEqual(criteria, EXPECTED_CRITERIA[s.id], `${s.id} fails tests for ${criteria.join(", ")}`);
    console.log(`ok  ${s.id} caught by: ${failed.join("; ")} (${ev.durationMs} ms)`);
  });

  const ref = by.reference.evidence[0];
  const repeat = by.repeatability.evidence[0];
  assert.equal(ref.tests.length, pkg.publicTests.length + prot.protectedTestRefs.length);
  console.log(`\nreference suite: ${ref.tests.length} tests, ${ref.durationMs} ms (repeat run ${repeat.durationMs} ms, baseline ${by.baseline.evidence[0].durationMs} ms)`);
  console.log("\ninventory-pagination-contract work sample passes every check");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
