/**
 * Proves the "Stop invalid extractions from reaching the shipment store" work
 * sample with the real authoring checks on the local runner: the starter
 * stores bad records, the reference passes every test, each incorrect
 * solution is caught by the protected test aimed at it, results repeat, and
 * nothing evaluator-only reaches the candidate package. Every model response
 * is recorded; no model calls and no database.
 *
 * Run: npx tsx --conditions react-server scripts/test-extraction-structured-output.ts
 */
import assert from "node:assert/strict";
import { validatePackage } from "../src/lib/eng/authoring/checks";
import { packageSha256 } from "../src/lib/eng/authoring/package";
import { localRunner } from "../src/lib/eng/authoring/runner";
import { taskFamilyOf } from "../src/lib/eng/tracks";
import { EXEMPLAR } from "../src/lib/eng/scenarios/extraction-structured-output/exemplar";
import { buildExtractionPackage } from "../src/lib/eng/scenarios/extraction-structured-output/package";

const EXPECTED_CATCH: Record<string, string> = {
  "wrong-1": "persistent rate limiting stops after three attempts and goes to manual review",
  "wrong-2": "a 429 waits for the Retry-After seconds before the next attempt",
  "wrong-3": "values that would need guessing are not repaired",
  "wrong-4": "out-of-range and impossible values are not stored or clamped",
  "wrong-5": "a 4xx response other than 429 is not retried",
};

/** Incorrect solutions that look correct to the candidate: they pass every public test. */
const PASSES_PUBLIC = ["wrong-1", "wrong-5"];

const REPRODUCTION = "nightly batch replay: every document gets a result and nothing invalid is stored";

async function main() {
  const { pkg, prot } = buildExtractionPackage();
  const again = buildExtractionPackage();
  assert.equal(packageSha256(pkg, prot), packageSha256(again.pkg, again.prot), "the package must be deterministic");
  assert.deepEqual(again.pkg.provenance, pkg.provenance);
  assert.equal(EXEMPLAR.build, buildExtractionPackage);
  assert.ok(taskFamilyOf(EXEMPLAR.track, EXEMPLAR.taskFamily), "exemplar task family must exist on its track");
  assert.equal(pkg.config.language, EXEMPLAR.stack.language);
  assert.equal(pkg.config.level, EXEMPLAR.level);
  assert.equal(pkg.environment.id, "node-stdlib");

  const candidate = JSON.stringify(pkg);
  const exemplarText = JSON.stringify({ ...EXEMPLAR, build: undefined });
  for (const [label, text] of [["candidate package", candidate], ["exemplar", exemplarText]] as const) {
    assert.ok(!text.includes("\u2014"), `${label} contains an em dash`);
  }
  assert.ok(!candidate.includes("evaluation.test"), "the evaluation test file is referenced in the candidate package");
  for (const ref of prot.protectedTestRefs) assert.ok(!candidate.includes(ref.name), `protected test "${ref.name}" leaked`);
  for (const f of prot.protectedTests) {
    assert.ok(!pkg.starterFiles.some((s) => s.path === f.path), `${f.path} is a starter file`);
    const imports = [...f.content.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    for (const spec of imports) assert.ok(spec.startsWith("node:") || spec.startsWith("../src/"), `${f.path} imports ${spec}, which is not the code under test`);
    assert.ok(!/fixtures\/|readFileSync|recorded-transport/.test(f.content), `${f.path} depends on candidate-editable fixtures or helpers`);
  }
  for (const marker of ["validateShipment", "parseModelOutput", "MAX_ATTEMPTS", "callProvider"]) assert.ok(!candidate.includes(marker), `solution material leaked: ${marker}`);
  for (const facts of Object.values(prot.coworkerFacts)) for (const f of facts) {
    assert.ok(!candidate.includes(f.text.slice(0, 60)), `coworker fact ${f.id} leaked`);
    assert.ok(f.id && f.text && f.topics && f.topics.length > 0, `coworker fact ${f.id} needs an id, text and topics`);
  }
  for (const note of Object.values(prot.rubricNotes)) assert.ok(!candidate.includes(note.slice(0, 60)), "rubric note leaked");
  for (const a of prot.reference.approaches) assert.ok(!candidate.includes(a.slice(0, 60)), "reference approach leaked");
  assert.deepEqual(Object.keys(prot.rubricNotes).sort(), pkg.rubric.map((r) => r.id).sort(), "every rubric criterion has a reviewer note");
  assert.deepEqual(pkg.coworkers.map((c) => c.id), ["lead", "intake_specialist"]);
  assert.deepEqual(pkg.submission.handoffPrompts.map((p) => p.id), ["what_changed", "how_checked", "unresolved"]);
  assert.deepEqual(pkg.fixturePaths, ["fixtures/documents.json", "fixtures/recorded_responses.json"]);
  assert.ok(pkg.starterFiles.some((f) => f.path === "package.json" && f.content.includes('"type": "module"')), "package.json with type module");
  console.log("ok  candidate package is deterministic and holds no evaluator material");

  const record = await validatePackage(pkg, prot, localRunner(), null);
  console.log(`\nrunner: ${record.runner?.label ?? "none"}`);
  for (const c of record.checks) console.log(`  ${c.status.padEnd(7)} ${c.id.padEnd(22)} ${c.detail}`);
  const failing = record.checks.filter((c) => c.status !== "passed");
  assert.equal(failing.length, 0, JSON.stringify(failing.map((c) => ({ id: c.id, issues: c.issues, output: c.evidence[0]?.output.slice(0, 1500) })), null, 2));
  assert.equal(record.status, "passed");

  const by = Object.fromEntries(record.checks.map((c) => [c.id, c]));
  const setupTests = by.setup.evidence[0].tests;
  assert.equal(setupTests.find((t) => t.name === REPRODUCTION)?.outcome, "failed", "the public reproduction must fail on the starter");

  const baseline = by.baseline.evidence[0].tests;
  for (const ref of prot.protectedTestRefs) {
    const outcome = baseline.find((t) => t.name === ref.name)?.outcome;
    assert.ok(outcome === "failed" || outcome === "error", `${ref.name} should fail on the starter, got ${outcome}`);
  }

  const publicNames = new Set(pkg.publicTests.map((t) => t.name));
  prot.incorrectSolutions.forEach((s, i) => {
    const ev = by.incorrect.evidence[i];
    const failed = ev.tests.filter((t) => t.outcome === "failed" || t.outcome === "error").map((t) => t.name);
    const expected = EXPECTED_CATCH[s.id];
    assert.ok(expected, `no expectation for ${s.id}`);
    assert.ok(failed.includes(expected), `${s.id} should be caught by "${expected}"; failed: ${failed.join(" | ")}`);
    if (PASSES_PUBLIC.includes(s.id)) assert.ok(!failed.some((n) => publicNames.has(n)), `${s.id} should pass every public test; failed: ${failed.join(" | ")}`);
    console.log(`ok  ${s.id} caught by "${expected}" (${failed.length} failing: ${failed.join(" | ")}) [${ev.durationMs} ms]`);
  });

  const ref = by.reference.evidence[0];
  const repeat = by.repeatability.evidence[0];
  assert.equal(ref.tests.length, pkg.publicTests.length + prot.protectedTestRefs.length);
  console.log(`\nreference suite: ${ref.tests.length} tests, ${ref.durationMs} ms (repeat run ${repeat.durationMs} ms, baseline ${by.baseline.evidence[0].durationMs} ms, starter public ${by.setup.evidence[0].durationMs} ms)`);
  console.log("\nextraction-structured-output work sample passes every check");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
