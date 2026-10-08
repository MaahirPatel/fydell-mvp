/**
 * Proves the "Make the triage evaluation report honest numbers" work sample
 * with the real authoring checks on the local runner: the starter shows the
 * defects, the reference passes every test, each incorrect solution is caught
 * by the test aimed at it, results repeat, and nothing evaluator-only reaches
 * the candidate package. No model calls and no database.
 *
 * Run: npx tsx --conditions react-server scripts/test-eval-harness-integrity.ts
 */
import assert from "node:assert/strict";
import { validatePackage } from "../src/lib/eng/authoring/checks";
import { packageSha256 } from "../src/lib/eng/authoring/package";
import { localRunner } from "../src/lib/eng/authoring/runner";
import { EXEMPLAR } from "../src/lib/eng/scenarios/eval-harness-integrity/exemplar";
import { buildEvalHarnessPackage } from "../src/lib/eng/scenarios/eval-harness-integrity/package";

const EXPECTED_CATCH: Record<string, string> = {
  "wrong-1": "EvaluationTests.test_leaked_examples_are_excluded_by_normalized_text",
  "wrong-2": "EvaluationTests.test_macro_f1_is_the_unweighted_mean_over_labels_with_examples",
  "wrong-3": "EvaluationTests.test_label_without_examples_is_undefined_and_left_out_of_macro",
  "wrong-4": "EvaluationTests.test_missing_prediction_counts_as_error",
};

async function main() {
  const { pkg, prot } = buildEvalHarnessPackage();
  const again = EXEMPLAR.build();
  assert.equal(packageSha256(pkg, prot), packageSha256(again.pkg, again.prot), "the package must be deterministic");
  assert.deepEqual(again.pkg.provenance, pkg.provenance);
  assert.equal(EXEMPLAR.track, "applied_ai");
  assert.equal(EXEMPLAR.browserPreview, false);

  const candidate = JSON.stringify(pkg);
  assert.ok(!candidate.includes("\u2014"), "candidate-facing text contains an em dash");
  assert.ok(!candidate.includes("test_evaluation"), "the evaluation test file is referenced in the candidate package");
  assert.ok(!candidate.includes("triage_cases"), "the held-out cases are referenced in the candidate package");
  for (const ref of prot.protectedTestRefs) assert.ok(!candidate.includes(ref.name.split(".").pop()!), `protected test ${ref.name} leaked`);
  for (const f of prot.protectedTests) {
    assert.ok(!pkg.starterFiles.some((s) => s.path === f.path), `${f.path} is a starter file`);
    assert.ok(!/from tests\b|import tests\b/.test(f.content), `${f.path} imports candidate-editable test helpers`);
  }
  for (const marker of ["import unicodedata", "missing_prediction", "_fmt("]) assert.ok(!candidate.includes(marker), `solution code leaked: ${marker}`);
  for (const facts of Object.values(prot.coworkerFacts)) for (const f of facts) assert.ok(!candidate.includes(f.text.slice(0, 60)), `coworker fact ${f.id} leaked`);
  for (const note of Object.values(prot.rubricNotes)) assert.ok(!candidate.includes(note.slice(0, 60)), "rubric note leaked");
  for (const a of prot.reference.approaches) assert.ok(!candidate.includes(a.slice(0, 60)), "reference approach leaked");
  assert.deepEqual(pkg.coworkers.map((c) => c.id), ["lead", "support"]);
  assert.deepEqual(pkg.submission.handoffPrompts.map((p) => p.id), ["what_changed", "how_checked", "unresolved"]);
  assert.deepEqual(pkg.fixturePaths, ["fixtures/labels.json", "fixtures/few_shot.json", "fixtures/eval_set.json", "fixtures/predictions.json"]);
  assert.equal(prot.protectedTests[0].path, "tests/test_evaluation.py");
  assert.equal(prot.incorrectSolutions.length, Object.keys(EXPECTED_CATCH).length);
  console.log("ok  candidate package is deterministic and holds no evaluator material");

  const record = await validatePackage(pkg, prot, localRunner(), null);
  console.log(`\nrunner: ${record.runner?.label ?? "none"}`);
  for (const c of record.checks) console.log(`  ${c.status.padEnd(7)} ${c.id.padEnd(22)} ${c.detail}`);
  const failing = record.checks.filter((c) => c.status !== "passed");
  assert.equal(failing.length, 0, JSON.stringify(failing.map((c) => ({ id: c.id, issues: c.issues, output: c.evidence[0]?.output.slice(0, 1500) })), null, 2));
  assert.equal(record.status, "passed");

  const by = Object.fromEntries(record.checks.map((c) => [c.id, c]));
  const setupTests = by.setup.evidence[0].tests;
  for (const name of ["test_few_shot_examples_do_not_leak_into_the_eval_set", "test_abstentions_and_errors_stay_in_the_denominator"]) {
    const outcome = setupTests.find((t) => t.name.endsWith(name))?.outcome;
    assert.ok(outcome === "failed" || outcome === "error", `the public reproduction ${name} must fail on the starter, got ${outcome}`);
  }

  const baseline = by.baseline.evidence[0].tests;
  for (const name of [
    "test_leaked_examples_are_excluded_by_normalized_text",
    "test_abstentions_and_recorded_errors_count_as_incorrect",
    "test_macro_f1_is_the_unweighted_mean_over_labels_with_examples",
    "test_label_without_examples_is_undefined_and_left_out_of_macro",
  ]) {
    const outcome = baseline.find((t) => t.name.endsWith(name))?.outcome;
    assert.ok(outcome === "failed" || outcome === "error", `${name} should fail on the starter, got ${outcome}`);
  }

  prot.incorrectSolutions.forEach((s, i) => {
    const ev = by.incorrect.evidence[i];
    const failed = ev.tests.filter((t) => t.outcome === "failed" || t.outcome === "error").map((t) => t.name);
    const expected = EXPECTED_CATCH[s.id];
    assert.ok(expected, `no expectation for ${s.id}`);
    assert.ok(failed.some((n) => n.endsWith(expected.split(".").pop()!)), `${s.id} should be caught by ${expected}; failed: ${failed.join(", ")}`);
    console.log(`ok  ${s.id} caught by ${failed.join(", ")} (${ev.durationMs} ms)`);
  });

  const ref = by.reference.evidence[0];
  const repeat = by.repeatability.evidence[0];
  assert.equal(ref.tests.length, pkg.publicTests.length + prot.protectedTestRefs.length);
  console.log(`\nreference suite: ${ref.tests.length} tests, ${ref.durationMs} ms (repeat run ${repeat.durationMs} ms, baseline ${by.baseline.evidence[0].durationMs} ms)`);
  console.log("\neval-harness-integrity work sample passes every check");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
