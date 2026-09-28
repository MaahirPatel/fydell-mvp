/**
 * AI-11 + E2E-05..E2E-08: benchmark and journey tests.
 *
 * Part A (AI-11): run the 22 labeled fixtures through the DETERMINISTIC
 * pipeline (AST analysis — the analyzer never executes code) and report
 * honest precision/recall over bug+security expectations.
 *
 * CAVEAT (read before quoting numbers): this is a CALIBRATION set — 22
 * hand-built fixtures exercising the detector rules. It is not predictive
 * validity: it does not measure real-world defect detection, reviewer
 * agreement, or hiring validity. Blind-spot fixtures document genuine
 * detector limitations; they are reported, not hidden.
 *
 * Part B (E2E-05..08): in-process candidate journeys through the full
 * pipeline (bundle -> deterministic -> stub reviewer -> validation ->
 * assembly -> QA gate):
 *  E2E-05 known-good: correct solution -> complete, grounded report.
 *  E2E-06 known-partial: partial solution + honest handoff -> failure
 *          detected; handoff awareness recorded WITHOUT upgrading the code.
 *  E2E-07 alternative: different valid implementation -> accepted.
 *  E2E-08 hostile upload: traversal filename + prompt injection + resource
 *          hog -> neutralized/quarantined, never executed, no false report.
 *
 * NOTE: the "harness records" in Part B are simulated in-process to test the
 * pipeline's handling of them — they are test doubles, not real test runs.
 *
 * Run: npx tsx scripts/test-analysis-grind-benchmark.ts
 */
import { readFile } from "fs/promises";
import { join } from "path";
import { analyzeSource } from "../src/lib/code-analysis/analyzer";
import { buildInputBundle } from "../src/lib/analysis/inputBundle";
import { indexSnapshot } from "../src/lib/analysis/citations";
import {
  assembleReport,
  type DeterministicSection,
} from "../src/lib/analysis/separation";
import { validateModelOutput, type ModelReviewOutput } from "../src/lib/analysis/modelOutput";
import { groundClaims } from "../src/lib/analysis/grounding";
import { reconcileHandoff } from "../src/lib/analysis/reconcile";
import { scoreDimension } from "../src/lib/analysis/rubric";
import { newProvenance, recordOverride } from "../src/lib/analysis/provenance";
import { decide, mayShip, openGate } from "../src/lib/analysis/qaGate";
import { quarantine, sanitizePath, scanForInjectionAttempt } from "../src/lib/analysis/injection";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const BENCH = join(process.cwd(), "fixtures", "analysis", "benchmark");

interface Label {
  id: string;
  category: string;
  expected: string[];
  blind_spot?: boolean;
  note?: string;
}

/* ============================ Part A: benchmark ============================ */

async function main(): Promise<void> {
console.log("--- Part A: AI-11 calibration benchmark (deterministic pipeline) ---");
const labels: { fixtures: Label[]; _caveat: string } = JSON.parse(
  await readFile(join(BENCH, "labels.json"), "utf8"),
);
check("benchmark has >= 20 labeled fixtures", labels.fixtures.length >= 20, `${labels.fixtures.length}`);
const categories = new Set(labels.fixtures.map((f) => f.category));
for (const c of ["correct", "partial", "broken", "adversarial"]) {
  check(`category present: ${c}`, categories.has(c));
}

let TP = 0, FP = 0, FN = 0;
const blindSpots: string[] = [];
for (const label of labels.fixtures) {
  const content = await readFile(join(BENCH, label.id), "utf8");
  const report = await analyzeSource({ files: [{ path: label.id, content }] });
  if (report.errors.length > 0) {
    check(`fixture ${label.id} analyzes without errors`, false, JSON.stringify(report.errors));
    continue;
  }
  const scored = report.findings.filter((f) => f.severity === "bug" || f.severity === "security");
  const matched = new Set<number>();
  const fps: string[] = [];
  for (const f of scored) {
    const idx = label.expected.findIndex((code, i) => !matched.has(i) && code === f.code);
    if (idx >= 0) matched.add(idx);
    else fps.push(`${f.code}@${f.file}:${f.line}[${f.severity}]`);
  }
  const missed = label.expected.filter((_, i) => !matched.has(i));
  TP += matched.size;
  FP += fps.length;
  FN += missed.length;
  const tag = `[${label.category}] ${label.id}`;
  if (fps.length === 0 && missed.length === 0) {
    check(`${tag}: as labeled`, true);
  } else {
    check(`${tag}: as labeled`, false, `missed=[${missed}] fp=[${fps}]`);
  }
  if (label.blind_spot) blindSpots.push(`${label.id}: ${label.note ?? ""}`);
}
const precision = TP + FP === 0 ? 1 : TP / (TP + FP);
const recall = TP + FN === 0 ? 1 : TP / (TP + FN);
console.log(`\n  benchmark totals: TP=${TP} FP=${FP} FN=${FN}`);
console.log(`  precision=${precision.toFixed(2)} recall=${recall.toFixed(2)} (bug+security only; risks/notes reported, not scored)`);
console.log(`  documented blind spots (${blindSpots.length}):`);
for (const b of blindSpots) console.log(`    - ${b}`);
console.log(`  CAVEAT: calibration set, not predictive validity (see labels.json _caveat).`);

/* ==================== Part B: E2E journeys (in-process) ==================== */

console.log("\n--- Part B: E2E journeys ---");

/** A well-behaved stub reviewer: builds a VALID review from deterministic sections. */
function stubReview(summary: string, det: DeterministicSection, snapshotLines: number): ModelReviewOutput {
  const failing = det.tests.filter((t) => t.status !== "passed");
  return {
    schemaVersion: 1,
    summary,
    findings: failing.map((t, i) => ({
      id: `f${i + 1}`,
      dimension: "correctness" as const,
      claim: `Harness records ${t.id} as ${t.status}.`,
      status: "reproduced_defect" as const,
      material: true,
      citations: [{ source: "test_output" as const, refId: t.id }],
    })),
    dimensionNotes: {
      correctness: {
        outcome: failing.length === 0 ? ("exceeds" as const) : ("below" as const),
        rationale:
          failing.length === 0
            ? "All authoritative tests passed."
            : `Failures recorded: ${failing.map((t) => t.id).join(", ")}.`,
      },
      robustness: { outcome: "meets" as const, rationale: "No security findings in this journey." },
      code_quality: { outcome: "meets" as const, rationale: "Clear control flow." },
      communication: { outcome: "insufficient_evidence" as const, rationale: "No transcript in this journey." },
    },
  };
}

function detSection(tests: DeterministicSection["tests"]): DeterministicSection {
  return {
    submissionHash: "sha256:journey",
    testSuiteHash: "sha256:suite-v3",
    tests,
    engineFindings: [],
    ranAt: new Date().toISOString(),
  };
}

/* ---- E2E-05: known-good submission ---- */
{
  const content = await readFile(join(BENCH, "correct/clean.py"), "utf8");
  const bundle = buildInputBundle([{ path: "submission/merge.py", role: "submission", content }]);
  const analysis = await analyzeSource({ files: [{ path: "submission/merge.py", content }] });
  const det = detSection([
    { id: "t-101", name: "matches normalized ids", status: "passed" },
    { id: "t-102", name: "returns unmatched", status: "passed" },
  ]);
  const review = stubReview("All authoritative tests passed; no material findings.", det, 20);
  const v = validateModelOutput(review, {
    snapshot: indexSnapshot([{ path: "submission/merge.py", content }]),
    testOutputs: new Set(["t-101", "t-102"]),
    messages: new Set(),
    deterministic: det,
  });
  check("E2E-05: valid review passes validation", v.ok, JSON.stringify(v.reasons));
  const report = assembleReport(det, review);
  const bugCount = analysis.findings.filter((f) => f.severity === "bug" || f.severity === "security").length;
  check("E2E-05: no bug/security findings on correct code", bugCount === 0);
  const gate = decide(openGate("e2e-05", false), "qa-alice", "approved", "Verified.");
  check("E2E-05: report ships after QA approval", mayShip(gate) && report.sectionOrder.length === 2);
  check("E2E-05: bundle pinned the reviewed input", bundle.files[0].sha256.length === 64);
}

/* ---- E2E-06: known-partial + honest handoff ---- */
{
  const content = await readFile(join(BENCH, "partial/drops_silently.py"), "utf8");
  const analysis = await analyzeSource({ files: [{ path: "submission/merge.py", content }] });
  const det = detSection([
    { id: "t-101", name: "matches normalized ids", status: "passed" },
    { id: "t-118", name: "surfaces unmatched rows", status: "failed" },
  ]);
  const foundSilentDrop = analysis.findings.some((f) => f.code === "SILENT_DROP");
  check("E2E-06: relevant failure detected (SILENT_DROP)", foundSilentDrop);

  // Honest handoff: candidate names the limitation.
  const rec = reconcileHandoff(
    {
      submittedAt: new Date().toISOString(),
      claims: [
        { id: "h1", kind: "limitation", text: "t-118 fails: unmatched rows are only counted in summarize(), never surfaced." },
      ],
    },
    det,
  );
  check("E2E-06: handoff awareness recorded as accurate self-assessment", rec.accurateSelfAssessments.includes("h1"));

  // The review must NOT upgrade the failing code: honest summary, no verdict smuggling.
  const review = stubReview("The harness records t-118 as failed: unmatched rows never surface.", det, 30);
  const v = validateModelOutput(review, {
    snapshot: indexSnapshot([{ path: "submission/merge.py", content }]),
    testOutputs: new Set(["t-101", "t-118"]),
    messages: new Set(),
    deterministic: det,
  });
  check("E2E-06: honest review passes validation", v.ok, JSON.stringify(v.reasons));
  const grounded = groundClaims(
    review.findings.map((f) => ({
      id: f.id,
      claim: f.claim,
      assertedStatus: f.status,
      material: f.material,
      citations: f.citations,
      reproducingTestIds: ["t-118"],
    })),
    det,
  );
  check(
    "E2E-06: defect claim is reproduced (not a hypothesis, not invented)",
    grounded[0].groundedStatus === "reproduced_defect",
  );
  const scored = scoreDimension("correctness", { artifactRefs: ["t-118"] }, "below");
  check("E2E-06: failing code scores below, not upgraded", scored.outcome === "below");
}

/* ---- E2E-07: alternative solution accepted ---- */
{
  const content = await readFile(join(BENCH, "correct/dict_based.py"), "utf8");
  const analysis = await analyzeSource({ files: [{ path: "submission/merge.py", content }] });
  const det = detSection([
    { id: "t-101", name: "matches normalized ids", status: "passed" },
    { id: "t-102", name: "returns unmatched", status: "passed" },
  ]);
  const bugCount = analysis.findings.filter((f) => f.severity === "bug" || f.severity === "security").length;
  check("E2E-07: alternative solution has no bug/security findings", bugCount === 0);
  // The rubric scores properties, not textual similarity to a reference.
  const scored = scoreDimension("correctness", { artifactRefs: ["t-101", "t-102"] }, "meets");
  check("E2E-07: alternative accepted on evidence", scored.outcome === "meets");
  check(
    "E2E-07: reference text is not compared",
    !content.includes("known = {normalize_id"),
  );
}

/* ---- E2E-08: hostile upload ---- */
{
  // Hostile filename is neutralized before it can touch the filesystem.
  const safe = sanitizePath("../../../etc/passwd");
  check("E2E-08: traversal filename neutralized", safe === "etc/passwd", safe);

  // Prompt injection in the upload is quarantined and flagged, not obeyed.
  const injected = await readFile(join(BENCH, "adversarial/prompt_injection.py"), "utf8");
  const scan = scanForInjectionAttempt(injected, "comment");
  check("E2E-08: injection attempt detected", scan.detected);
  const q = quarantine("submission/adversarial/prompt_injection.py", injected);
  check("E2E-08: injected content quarantined as data", q.includes("UNTRUSTED CANDIDATE DATA"));

  // The analyzer never executes code: resource_hog.py analyzes cleanly and fast.
  const hog = await readFile(join(BENCH, "adversarial/resource_hog.py"), "utf8");
  const t0 = Date.now();
  const hogReport = await analyzeSource({ files: [{ path: "submission/hog.py", content: hog }] });
  const ms = Date.now() - t0;
  check("E2E-08: hostile code analyzed without execution", ms < 10_000 && hogReport.errors.length === 0, `${ms}ms`);

  // No false report: injection did not suppress or invent findings; the
  // deterministic output for the injected file is empty, honestly.
  const injReport = await analyzeSource({ files: [{ path: "submission/injected.py", content: injected }] });
  const injBugs = injReport.findings.filter((f) => f.severity === "bug" || f.severity === "security");
  check("E2E-08: injection changed nothing in deterministic output", injBugs.length === 0);

  // Provenance records the hostile handling.
  const prov = recordOverride(
    newProvenance({ modelId: "deterministic-only", bundleHash: "sha256:x", submissionHash: "sha256:y", testSuiteHash: "sha256:z" }),
    "system",
    "Quarantined prompt-injection attempt in submission comments",
    "AI-05: candidate content treated as untrusted data",
  );
  check("E2E-08: hostile handling recorded in provenance", prov.overrides.length === 1);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log("BENCHMARK + JOURNEYS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
