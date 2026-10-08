/**
 * Proves the "Recover label jobs after crashes and timeouts" work sample with
 * the real authoring checks on the local runner: the starter shows the defects,
 * the reference passes every test, each incorrect solution is caught by the
 * test aimed at it, results repeat, and nothing evaluator-only reaches the
 * candidate package. No model calls and no database.
 *
 * Run: npx tsx --conditions react-server scripts/test-job-lease-recovery.ts
 */
import assert from "node:assert/strict";
import { validatePackage } from "../src/lib/eng/authoring/checks";
import { packageSha256 } from "../src/lib/eng/authoring/package";
import { localRunner } from "../src/lib/eng/authoring/runner";
import { EXEMPLAR } from "../src/lib/eng/scenarios/job-lease-recovery/exemplar";
import { buildJobLeaseRecoveryPackage } from "../src/lib/eng/scenarios/job-lease-recovery/package";

const EXPECTED_CATCH: Record<string, string> = {
  "wrong-1": "a takeover while the first worker still waits on the provider buys one label",
  "wrong-2": "a relabel job for the same shipment is charged as its own purchase",
  "wrong-3": "a job whose final attempt lease expires is dead lettered instead of left leased",
  "wrong-4": "a late failure from the previous process of a restarted worker is ignored",
  "wrong-5": "a late failure from a worker that lost its lease does not reopen the job",
};

/** Criteria an incorrect solution may fail. A mistake must not cost credit on criteria it does not break. */
const EXPECTED_CRITERIA: Record<string, string[]> = {
  "wrong-1": ["AC-2"],
  "wrong-2": ["AC-2"],
  "wrong-3": ["AC-1", "AC-3"],
  "wrong-4": ["AC-4"],
  "wrong-5": ["AC-4"],
};

const PUBLIC_REPRODUCTION = "a job left leased by a stopped worker is labeled after its lease expires";

const FAIL_ON_STARTER = [
  "jobs stranded by a deploy are recovered after their leases expire",
  "a retry after a provider timeout reuses the purchase instead of buying again",
  "a job that keeps failing is dead lettered after max attempts and never retried",
  "a job whose final attempt lease expires is dead lettered instead of left leased",
  "a late failure from a worker that lost its lease does not reopen the job",
  "a late failure from the previous process of a restarted worker is ignored",
];

async function main() {
  const { pkg, prot } = buildJobLeaseRecoveryPackage();
  const again = EXEMPLAR.build();
  assert.equal(packageSha256(pkg, prot), packageSha256(again.pkg, again.prot), "the package must be deterministic");
  assert.deepEqual(again.pkg.provenance, pkg.provenance);
  assert.equal(EXEMPLAR.track, "backend_api");
  assert.equal(EXEMPLAR.taskFamily, "backend.jobs");
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
  for (const marker of ["leaseId", "markDead", "label-job/", "#held", "#bury", "leasesGranted"]) assert.ok(!candidate.includes(marker), `solution code leaked: ${marker}`);
  for (const facts of Object.values(prot.coworkerFacts)) for (const f of facts) assert.ok(!candidate.includes(f.text.slice(0, 60)), `coworker fact ${f.id} leaked`);
  for (const note of Object.values(prot.rubricNotes)) assert.ok(!candidate.includes(note.slice(0, 60)), "rubric note leaked");
  for (const a of prot.reference.approaches) assert.ok(!candidate.includes(a.slice(0, 60)), "reference approach leaked");
  for (const s of prot.incorrectSolutions) assert.ok(!candidate.includes(s.description.slice(0, 60)), `incorrect solution ${s.id} leaked`);
  assert.deepEqual(pkg.coworkers.map((c) => c.id), ["lead", "ops"]);
  for (const c of pkg.coworkers) for (const f of prot.coworkerFacts[c.id] ?? []) assert.ok(f.id && f.text && f.topics && f.topics.length > 0, `fact ${f.id} needs id, text and topics`);
  assert.deepEqual(pkg.submission.handoffPrompts.map((p) => p.id), ["what_changed", "how_checked", "unresolved"]);
  assert.deepEqual(pkg.fixturePaths, ["fixtures/incident-log.json"]);
  assert.ok(pkg.starterFiles.some((f) => f.path === "package.json" && JSON.parse(f.content).type === "module"), "package.json with type module");
  assert.ok(prot.incorrectSolutions.length >= 3);
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

  prot.incorrectSolutions.forEach((s, i) => {
    const ev = by.incorrect.evidence[i];
    const failed = ev.tests.filter((t) => t.outcome === "failed" || t.outcome === "error").map((t) => t.name);
    const expected = EXPECTED_CATCH[s.id];
    assert.ok(expected, `no expectation for ${s.id}`);
    assert.ok(failed.includes(expected), `${s.id} should be caught by "${expected}"; failed: ${failed.join(", ")}`);
    const refs = [...pkg.publicTests, ...prot.protectedTestRefs];
    const criteria = [...new Set(failed.flatMap((n) => refs.find((r) => r.name === n)?.criterionIds ?? []))].sort();
    assert.deepEqual(criteria, EXPECTED_CRITERIA[s.id], `${s.id} fails tests for ${criteria.join(", ")}`);
    console.log(`ok  ${s.id} caught by: ${failed.join("; ")} (${ev.durationMs} ms)`);
  });

  const ref = by.reference.evidence[0];
  const repeat = by.repeatability.evidence[0];
  assert.equal(ref.tests.length, pkg.publicTests.length + prot.protectedTestRefs.length);
  console.log(`\nreference suite: ${ref.tests.length} tests, ${ref.durationMs} ms (repeat run ${repeat.durationMs} ms, baseline ${by.baseline.evidence[0].durationMs} ms)`);
  console.log("\njob-lease-recovery work sample passes every check");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
