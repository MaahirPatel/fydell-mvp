/**
 * Proves the "Fix stale and off-plan support retrieval" work sample with the
 * real authoring checks on the local runner: the starter shows each defect,
 * the reference passes every test, each incorrect solution is caught by the
 * held-out test aimed at it, results repeat, and nothing evaluator-only
 * reaches the candidate package. No model calls and no database.
 *
 * Run: npx tsx --conditions react-server scripts/test-support-retrieval-quality.ts
 */
import assert from "node:assert/strict";
import { validatePackage } from "../src/lib/eng/authoring/checks";
import { packageSha256 } from "../src/lib/eng/authoring/package";
import { localRunner } from "../src/lib/eng/authoring/runner";
import { taskFamilyOf } from "../src/lib/eng/tracks";
import { EXEMPLAR } from "../src/lib/eng/scenarios/support-retrieval-quality/exemplar";
import { buildSupportRetrievalPackage } from "../src/lib/eng/scenarios/support-retrieval-quality/package";

const EXPECTED_CATCH: Record<string, string> = {
  "wrong-1": "held-out: the newest version is returned even when an older version matches the question better",
  "wrong-2": "held-out: an older version without a state field is not returned once a newer version exists",
  "wrong-3": "held-out: the customer's own article is returned even when many off-plan sections rank higher",
  "wrong-4": "held-out: a question phrased like a section heading retrieves that section's text",
  "wrong-5": "held-out: never returns an off-plan article, even when fewer than k on-plan articles match",
};

/** Incorrect solutions that look correct to the candidate: they pass every public test. */
const PASSES_PUBLIC = ["wrong-1", "wrong-2", "wrong-3"];

const REPRODUCTION = "recorded eval set: every question gets its live article with the answer, nothing superseded or off-plan";

async function main() {
  const { pkg, prot } = buildSupportRetrievalPackage();
  const again = buildSupportRetrievalPackage();
  assert.equal(packageSha256(pkg, prot), packageSha256(again.pkg, again.prot), "the package must be deterministic");
  assert.deepEqual(again.pkg.provenance, pkg.provenance);
  assert.equal(EXEMPLAR.build, buildSupportRetrievalPackage);
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
    assert.ok(!/fixtures\/|readFileSync/.test(f.content), `${f.path} reads candidate-editable fixtures`);
  }
  for (const marker of ["liveRecords", "SUPERSEDED", "bestPerArticle", "CANDIDATE_POOL = 50", "KB-7", "KB-8"]) assert.ok(!candidate.includes(marker), `solution or held-out material leaked: ${marker}`);
  for (const facts of Object.values(prot.coworkerFacts)) for (const f of facts) {
    assert.ok(!candidate.includes(f.text.slice(0, 60)), `coworker fact ${f.id} leaked`);
    assert.ok(f.id && f.text && f.topics && f.topics.length > 0, `coworker fact ${f.id} needs an id, text and topics`);
  }
  for (const note of Object.values(prot.rubricNotes)) assert.ok(!candidate.includes(note.slice(0, 60)), "rubric note leaked");
  for (const a of prot.reference.approaches) assert.ok(!candidate.includes(a.slice(0, 60)), "reference approach leaked");
  assert.deepEqual(Object.keys(prot.rubricNotes).sort(), pkg.rubric.map((r) => r.id).sort(), "every rubric criterion has a reviewer note");
  assert.deepEqual(pkg.coworkers.map((c) => c.id), ["lead", "support_ops"]);
  assert.deepEqual(pkg.submission.handoffPrompts.map((p) => p.id), ["what_changed", "how_checked", "unresolved"]);
  assert.deepEqual(pkg.fixturePaths, ["fixtures/help_center_export.json", "fixtures/eval_questions.json"]);
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
  for (const name of [
    "held-out: the newest version is returned even when an older version matches the question better",
    "held-out: an older version without a state field is not returned once a newer version exists",
    "held-out: the customer's own article is returned even when many off-plan sections rank higher",
    "held-out: chunks keep their section heading and never mix two sections",
    "held-out eval: unseen questions over an unseen corpus get their live article with the answer",
  ]) {
    const outcome = baseline.find((t) => t.name === name)?.outcome;
    assert.ok(outcome === "failed" || outcome === "error", `${name} should fail on the starter, got ${outcome}`);
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
  console.log("\nsupport-retrieval-quality work sample passes every check");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
