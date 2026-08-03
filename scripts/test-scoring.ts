/**
 * Unit tests for the evidence-weighted scoring engine.
 * Run: npx tsx scripts/test-scoring.ts
 */
import assert from "node:assert/strict";
import {
  analyze,
  assignIndependence,
  bandFor,
  scoreCompetency,
  validateRubricOutput,
  weightedStdDev,
  SOURCE_RELIABILITY,
  type CompetencySpec,
  type EvidenceItem,
} from "../src/lib/simulations/scoring";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const approx = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b}`);

function item(partial: Partial<EvidenceItem> & { id: string }): EvidenceItem {
  return {
    competencyKey: "analysis",
    rubricWeight: 1,
    source: "deterministic",
    relevance: 1,
    quality: 1,
    actionKey: partial.id,
    indicator: "test indicator",
    ...partial,
  };
}

const spec: CompetencySpec = {
  key: "analysis",
  label: "Analytical correctness",
  weight: 1,
  targetEvidenceWeight: 2,
};

// ---------------------------------------------------------------------------
test("source reliability constants match spec (1.00 / 0.90 / 0.70)", () => {
  approx(SOURCE_RELIABILITY.deterministic, 1.0);
  approx(SOURCE_RELIABILITY.authored_rule, 0.9);
  approx(SOURCE_RELIABILITY.ai_rubric, 0.7);
});

test("w(i,k) = rubricWeight × reliability × relevance × independence", () => {
  const [w] = assignIndependence([
    item({ id: "a", rubricWeight: 2, source: "ai_rubric", relevance: 0.5 }),
  ]);
  approx(w.weight, 2 * 0.7 * 0.5 * 1);
});

test("repeated evidence from same action gets reduced independence (1, 1/2, 1/3)", () => {
  const weighted = assignIndependence([
    item({ id: "a", actionKey: "same" }),
    item({ id: "b", actionKey: "same" }),
    item({ id: "c", actionKey: "same" }),
  ]);
  const inds = weighted.map((w) => w.independence).sort((a, b) => b - a);
  approx(inds[0], 1);
  approx(inds[1], 1 / 2);
  approx(inds[2], 1 / 3);
});

test("evidenceQuality is the weighted mean of quality", () => {
  const r = scoreCompetency(spec, [
    item({ id: "a", quality: 1, rubricWeight: 1 }),
    item({ id: "b", quality: 0, rubricWeight: 1 }),
  ]);
  approx(r.evidenceQuality, 0.5);
});

test("coverage = min(1, Σw / target); low evidence shrinks toward 0.50", () => {
  // One deterministic item, weight 1, target 2 → coverage 0.5.
  const r = scoreCompetency(spec, [item({ id: "a", quality: 1 })]);
  approx(r.coverage, 0.5);
  // adjusted = 0.5 + 0.5 × (1.0 − 0.5) = 0.75 — perfect quality but half coverage.
  approx(r.adjustedScore, 0.75);
});

test("full coverage with perfect quality reaches 1.0 adjusted", () => {
  const r = scoreCompetency(spec, [
    item({ id: "a", quality: 1 }),
    item({ id: "b", quality: 1 }),
  ]);
  approx(r.coverage, 1);
  approx(r.adjustedScore, 1);
});

test("coverage caps at 1 even with excess evidence", () => {
  const r = scoreCompetency(spec, [
    item({ id: "a" }),
    item({ id: "b" }),
    item({ id: "c" }),
    item({ id: "d" }),
  ]);
  approx(r.coverage, 1);
});

test("no evidence → neutral 0.50 score, zero confidence, insufficient band", () => {
  const r = scoreCompetency(spec, []);
  approx(r.adjustedScore, 0.5);
  approx(r.confidence, 0);
  assert.equal(r.band, "insufficient");
});

test("consistency = 1 − min(1, stddev/0.5); identical quality → consistency 1", () => {
  const r = scoreCompetency(spec, [
    item({ id: "a", quality: 0.8 }),
    item({ id: "b", quality: 0.8 }),
  ]);
  approx(r.consistency, 1);
  approx(r.confidence, r.coverage * 1);
});

test("weightedStdDev of {0,1} equal weights = 0.5 → consistency 0", () => {
  const weighted = assignIndependence([
    item({ id: "a", quality: 0 }),
    item({ id: "b", quality: 1 }),
  ]);
  approx(weightedStdDev(weighted), 0.5);
  const r = scoreCompetency(spec, [
    item({ id: "a", quality: 0 }),
    item({ id: "b", quality: 1 }),
  ]);
  approx(r.consistency, 0);
  // confidence = coverage × (0.5 + 0.5×0) = 1 × 0.5
  approx(r.confidence, 0.5);
});

test("bands: strong requires ≥0.80 score AND ≥0.65 confidence", () => {
  assert.equal(bandFor(0.85, 0.7), "strong");
  assert.equal(bandFor(0.85, 0.5), "established"); // high score, weak confidence
  assert.equal(bandFor(0.7, 0.7), "established");
  assert.equal(bandFor(0.55, 0.7), "developing");
  assert.equal(bandFor(0.4, 0.7), "limited");
  assert.equal(bandFor(0.9, 0.44), "insufficient"); // confidence below 0.45
});

test("overall = Σ weight × adjustedScore; weights must total 1.00", () => {
  const specs: CompetencySpec[] = [
    { key: "a", label: "A", weight: 0.6, targetEvidenceWeight: 1 },
    { key: "b", label: "B", weight: 0.4, targetEvidenceWeight: 1 },
  ];
  const summary = analyze(specs, [
    item({ id: "1", competencyKey: "a", quality: 1 }),
    item({ id: "2", competencyKey: "b", quality: 1 }),
  ]);
  approx(summary.overall, 0.6 * 1 + 0.4 * 1);
  assert.throws(() =>
    analyze([{ key: "a", label: "A", weight: 0.5, targetEvidenceWeight: 1 }], [])
  );
});

test("critical competency below 0.40 caps recommendation", () => {
  const specs: CompetencySpec[] = [
    { key: "tech", label: "Technical", weight: 0.5, targetEvidenceWeight: 1, critical: true },
    { key: "comm", label: "Communication", weight: 0.5, targetEvidenceWeight: 1 },
  ];
  const summary = analyze(specs, [
    // Critical failure: full coverage, quality 0 → adjusted 0.0
    item({ id: "1", competencyKey: "tech", quality: 0 }),
    // Excellent communication cannot erase it.
    item({ id: "2", competencyKey: "comm", quality: 1 }),
  ]);
  assert.equal(summary.recommendation, "further_evidence_required");
  assert.equal(summary.cappedByCritical, "tech");
});

test("strong evidence across the board recommends advance", () => {
  const specs: CompetencySpec[] = [
    { key: "a", label: "A", weight: 0.5, targetEvidenceWeight: 1, critical: true },
    { key: "b", label: "B", weight: 0.5, targetEvidenceWeight: 1 },
  ];
  const summary = analyze(specs, [
    item({ id: "1", competencyKey: "a", quality: 0.9 }),
    item({ id: "2", competencyKey: "b", quality: 0.85 }),
  ]);
  assert.equal(summary.recommendation, "advance");
});

test("rubric validator rejects entries without evidence references", () => {
  const entries = validateRubricOutput([
    { competency: "comm", indicator: "clarity", rating: 0.8, eventIds: [], excerpts: [], explanation: "no refs" },
    { competency: "comm", indicator: "clarity", rating: 0.8, eventIds: ["ev1"], excerpts: [], explanation: "ok", evaluatorConfidence: 0.7 },
    { competency: "comm", indicator: "clarity", rating: 1.4, eventIds: ["ev1"], excerpts: [], explanation: "bad rating" },
    "garbage",
  ]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].eventIds[0], "ev1");
});

test("rubric validator rejects non-array output", () => {
  assert.throws(() => validateRubricOutput({ not: "an array" }));
});

console.log(`\n${passed} scoring tests passed${process.exitCode ? " (with failures)" : ""}`);
