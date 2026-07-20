/**
 * Checkpoint C golden cases for the evidence mathematics in
 * src/lib/fde/evidence/*. Imported by relative path (not the "@/..." alias)
 * so this keeps running standalone via `npx tsx`, matching the existing
 * scripts/test-relay-spike.ts / scripts/test-fde-loop-unit.ts convention.
 *
 * Run: npx tsx scripts/test-evidence-math.ts
 */
import assert from "node:assert/strict";
import {
  aggregateDimension,
  eventsToAtoms,
  geometricMeanReliability,
  independenceCap,
  shrinkEstimate,
  uncertaintyBand,
  capReliabilityForSource,
  SOURCE_RELIABILITY_CAP,
  effectiveSampleSize,
  standardError,
  decomposeConfidence,
  computeAiQuality,
  computeAdaptability,
  compositeFitScore,
  FORMULA_VERSION,
  COMPOSITE_ALPHA,
  hypothesisEntropy,
  informationGain,
  diagnosticEfficiency,
  DEFAULT_HYPOTHESIS_PROBS,
} from "../src/lib/fde/evidence";
import type { EvidenceAtomInput, OpportunityFlags, RelayEventLike } from "../src/lib/fde/evidence";
import { TRAIT_IDS } from "../src/lib/fde/evidence";

let failures = 0;

function goldenCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(err instanceof Error ? err.stack || err.message : err);
  }
}

function assertFinite(value: unknown, label: string): void {
  assert.equal(typeof value, "number", `${label} must be a number`);
  assert.ok(Number.isFinite(value as number), `${label} must be finite, got ${value}`);
}

function atom(overrides: Partial<EvidenceAtomInput>): EvidenceAtomInput {
  return {
    sessionId: "session-1",
    eventId: null,
    artifactId: null,
    dimensionId: "discovery_problem_framing",
    direction: "supporting",
    magnitude: 0.5,
    relevance: 0.5,
    reliability: 0.5,
    independenceGroup: "g1",
    sourceKind: "behavioral_heuristic",
    summary: "test atom",
    eventRefs: [],
    artifactRefs: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. One weak supporting atom → insufficient
// ---------------------------------------------------------------------------
goldenCase("one weak supporting atom -> insufficient", () => {
  const result = aggregateDimension([
    atom({ direction: "supporting", magnitude: 0.3, relevance: 0.4, reliability: 0.4, independenceGroup: "g1" }),
  ]);
  assert.equal(result.state, "insufficient");
  assert.equal(result.atomCount, 1);
  assert.equal(result.independentCount, 1);
});

// ---------------------------------------------------------------------------
// 2. Five duplicate atoms in the same independence_group → not five independent
// ---------------------------------------------------------------------------
goldenCase("five duplicates same independence_group -> not five independent", () => {
  const atoms = Array.from({ length: 5 }, (_, i) =>
    atom({
      direction: "supporting",
      magnitude: 0.6,
      relevance: 0.6,
      reliability: 0.6,
      independenceGroup: "same_opportunity",
      summary: `duplicate observation ${i}`,
    })
  );
  const capped = independenceCap(atoms);
  assert.equal(capped.independentCount, 1, "five atoms in one group must collapse to one independent opportunity");
  assert.notEqual(capped.independentCount, 5);

  const result = aggregateDimension(atoms);
  assert.equal(result.atomCount, 5);
  assert.equal(result.independentCount, 1);
  assert.notEqual(result.independentCount, 5);
  assert.equal(result.state, "insufficient", "one independent opportunity alone is still insufficient");
});

// ---------------------------------------------------------------------------
// 3. Two strong independent supporting atoms → supporting, but not (necessarily) strong
// ---------------------------------------------------------------------------
goldenCase("two strong independent supporting -> supporting (not strong)", () => {
  const result = aggregateDimension([
    atom({ direction: "supporting", magnitude: 0.9, relevance: 0.8, reliability: 0.9, independenceGroup: "g1", sourceKind: "behavioral_direct" }),
    atom({ direction: "supporting", magnitude: 0.9, relevance: 0.8, reliability: 0.9, independenceGroup: "g2", sourceKind: "behavioral_direct" }),
  ]);
  assert.equal(result.independentCount, 2);
  assert.ok(
    result.state === "supporting" || result.state === "strong_supporting",
    `expected a supportive state, got ${result.state}`
  );
  assert.notEqual(result.state, "counter");
  assert.notEqual(result.state, "mixed");
  assert.notEqual(result.state, "strong_supporting", "two data points at the minimum should not yet reach strong_supporting");
});

// ---------------------------------------------------------------------------
// 4. Strong support + strong counter → mixed
// ---------------------------------------------------------------------------
goldenCase("strong support + strong counter -> mixed", () => {
  const result = aggregateDimension([
    atom({ direction: "supporting", magnitude: 0.85, relevance: 0.8, reliability: 0.8, independenceGroup: "g1" }),
    atom({ direction: "counter", magnitude: 0.8, relevance: 0.8, reliability: 0.8, independenceGroup: "g2" }),
  ]);
  assert.equal(result.state, "mixed");
});

// ---------------------------------------------------------------------------
// 5. Missing opportunity → not negative
// ---------------------------------------------------------------------------
goldenCase("missing opportunity -> not negative", () => {
  const result = aggregateDimension([]);
  assert.equal(result.state, "insufficient");
  assert.notEqual(result.state, "counter");
  assert.equal(result.atomCount, 0);
  assert.equal(result.independentCount, 0);
});

// ---------------------------------------------------------------------------
// 6. LLM-only finding reliability capped (max 0.55)
// ---------------------------------------------------------------------------
goldenCase("llm-only finding reliability capped at 0.55", () => {
  assert.ok(SOURCE_RELIABILITY_CAP.llm_annotation <= 0.55);
  const capped = capReliabilityForSource(1, "llm_annotation");
  assert.ok(capped <= 0.55, `llm_annotation reliability must be capped, got ${capped}`);

  const behavioralCapped = capReliabilityForSource(1, "behavioral_direct");
  assert.ok(behavioralCapped > capped, "a direct behavioral observation must be trusted more than an LLM annotation");
});

// ---------------------------------------------------------------------------
// 7. Reprocessing identical events → identical atoms/findings (determinism)
// ---------------------------------------------------------------------------
function buildSampleEvents(): RelayEventLike[] {
  return [
    { id: "e1", session_id: "s1", sequence_number: 1, actor: "system", event_type: "session_started", payload: {} },
    {
      id: "e2",
      session_id: "s1",
      sequence_number: 2,
      actor: "candidate",
      event_type: "customer_chat_message",
      payload: { text: "Can you clarify the retention window before I start?" },
    },
    {
      id: "e3",
      session_id: "s1",
      sequence_number: 3,
      actor: "candidate",
      event_type: "command_run",
      payload: { command: "test", ok: true },
    },
    {
      id: "e4",
      session_id: "s1",
      sequence_number: 4,
      actor: "candidate",
      event_type: "command_run",
      payload: { command: "evals", ok: true },
    },
    { id: "e5", session_id: "s1", sequence_number: 5, actor: "system", event_type: "curveball_revealed", payload: { key: "schema_drift" } },
    {
      id: "e6",
      session_id: "s1",
      sequence_number: 6,
      actor: "candidate",
      event_type: "customer_chat_message",
      payload: { text: "Heads up — I found the schema drift and I'm adjusting the plan." },
    },
    {
      id: "e7",
      session_id: "s1",
      sequence_number: 7,
      actor: "candidate",
      event_type: "command_run",
      payload: { command: "test", ok: true },
    },
    // Activity-volume events must never turn into atoms.
    { id: "e8", session_id: "s1", sequence_number: 8, actor: "candidate", event_type: "keystroke_batch", payload: { count: 4231 } },
    { id: "e9", session_id: "s1", sequence_number: 9, actor: "candidate", event_type: "file_saved", payload: { paths: ["a.py"] } },
  ];
}

goldenCase("reprocessing identical events -> identical atoms (determinism)", () => {
  const events = buildSampleEvents();
  const run1 = eventsToAtoms(events, { sessionId: "s1" });
  const run2 = eventsToAtoms(buildSampleEvents(), { sessionId: "s1" });

  assert.ok(run1.length > 0, "sample events should produce at least one atom");
  assert.deepEqual(run1, run2, "reprocessing the same events must yield byte-identical atoms");

  for (const a of run1) {
    assert.notEqual(a.eventId, "e8", "keystroke_batch must never be cited as an atom's source event");
    assert.notEqual(a.eventId, "e9", "file_saved must never be cited as an atom's source event");
  }

  const dimensions = new Set(run1.map((a) => a.dimensionId));
  for (const dimensionId of dimensions) {
    const dimAtoms = run1.filter((a) => a.dimensionId === dimensionId);
    const agg1 = aggregateDimension(dimAtoms);
    const agg2 = aggregateDimension(eventsToAtoms(buildSampleEvents(), { sessionId: "s1" }).filter((a) => a.dimensionId === dimensionId));
    assert.deepEqual(agg1, agg2, `aggregate for ${dimensionId} must be deterministic across reprocessing`);
  }
});

// ---------------------------------------------------------------------------
// 8. No NaN / Infinity on empty or degenerate input
// ---------------------------------------------------------------------------
goldenCase("no NaN on empty or degenerate input", () => {
  assertFinite(geometricMeanReliability([]), "geometricMeanReliability([])");
  assert.equal(geometricMeanReliability([]), 0);

  assertFinite(geometricMeanReliability([Number.NaN, 0.5]), "geometricMeanReliability with a NaN input");

  assertFinite(shrinkEstimate(0, 0, 0, 0), "shrinkEstimate(0,0,0,0)");
  assertFinite(shrinkEstimate(Number.NaN, Number.NaN, Number.NaN, Number.NaN), "shrinkEstimate(NaN...)");

  const band = uncertaintyBand(0, 0);
  assertFinite(band.low, "uncertaintyBand(0,0).low");
  assertFinite(band.high, "uncertaintyBand(0,0).high");
  assert.ok(band.low <= band.high);

  const nanBand = uncertaintyBand(Number.NaN, Number.NaN);
  assertFinite(nanBand.low, "uncertaintyBand(NaN,NaN).low");
  assertFinite(nanBand.high, "uncertaintyBand(NaN,NaN).high");

  const capped = independenceCap([]);
  assert.equal(capped.independentCount, 0);
  assert.equal(capped.representatives.length, 0);

  const result = aggregateDimension([]);
  assert.equal(result.state, "insufficient");
  assert.equal(result.estimate, undefined);
  assert.equal(result.band, undefined);

  assertFinite(capReliabilityForSource(Number.NaN, "llm_annotation"), "capReliabilityForSource(NaN, ...)");
});

// ---------------------------------------------------------------------------
// 9. N_eff — duplicates / concentrated weights do not double the count
// ---------------------------------------------------------------------------
goldenCase("Neff: equal weights → n; duplicates do not double", () => {
  assert.equal(FORMULA_VERSION, "evidence-formula-v2");
  assert.equal(effectiveSampleSize([]), 0);
  assert.equal(effectiveSampleSize([1, 1, 1, 1]), 4);
  // Five identical atoms in one group collapse to one representative weight —
  // a single weight of 1 has N_eff = 1, not 5.
  assert.equal(effectiveSampleSize([1]), 1);
  // Concentrated mass: one large weight + tiny others ≈ 1, never > length.
  const concentrated = effectiveSampleSize([10, 0.01, 0.01]);
  assert.ok(concentrated < 1.1, `concentrated N_eff should stay near 1, got ${concentrated}`);
  assert.ok(concentrated <= 3);
  // Two equal strong weights → ~2 (same as a raw count of independent equals).
  const two = effectiveSampleSize([0.8, 0.8]);
  assert.ok(Math.abs(two - 2) < 1e-9, `expected ~2, got ${two}`);
});

// ---------------------------------------------------------------------------
// 10. SE — monotonic narrowing as N_eff grows
// ---------------------------------------------------------------------------
goldenCase("SE: monotonic narrowing as nEff grows", () => {
  const p = 0.6;
  const se1 = standardError(p, 1);
  const se4 = standardError(p, 4);
  const se16 = standardError(p, 16);
  assertFinite(se1, "se1");
  assertFinite(se4, "se4");
  assertFinite(se16, "se16");
  assert.ok(se1 >= se4 && se4 >= se16, `expected se1>=se4>=se16, got ${se1}, ${se4}, ${se16}`);
  assert.ok(se1 <= 0.5 && se16 >= 0);
  const degenerate = standardError(Number.NaN, Number.NaN);
  assertFinite(degenerate, "standardError(NaN,NaN)");
});

// ---------------------------------------------------------------------------
// 11. Confidence decomposition
// ---------------------------------------------------------------------------
goldenCase("confidence decomp: factors in [0,1] and product formula", () => {
  const low = decomposeConfidence({ nEff: 0.2, se: 0.4, diversity01: 0.5, provenance01: 0.5 });
  const high = decomposeConfidence({ nEff: 6, se: 0.05, diversity01: 1, provenance01: 0.9 });
  for (const key of ["sufficiency", "consistency", "diversity", "provenance", "confidence01"] as const) {
    assertFinite(low[key], `low.${key}`);
    assert.ok(low[key] >= 0 && low[key] <= 1);
    assertFinite(high[key], `high.${key}`);
  }
  assert.ok(high.confidence01 > low.confidence01);
  assert.ok(["low", "medium", "high"].includes(low.label));
  assert.ok(["low", "medium", "high"].includes(high.label));
  const expected =
    low.sufficiency * low.consistency * low.diversity * low.provenance;
  assert.ok(Math.abs(low.confidence01 - expected) < 1e-9);
});

// ---------------------------------------------------------------------------
// 12. AIQ — no AI → not observed (not a penalty)
// ---------------------------------------------------------------------------
goldenCase("AIQ: no AI → observed false, score null", () => {
  const none = computeAiQuality([
    { id: "e1", session_id: "s1", sequence_number: 1, actor: "candidate", event_type: "command_run", payload: { command: "test", ok: true } },
  ]);
  assert.equal(none.observed, false);
  assert.equal(none.score, null);

  const used = computeAiQuality([
    { id: "a1", session_id: "s1", sequence_number: 1, actor: "candidate", event_type: "ai_patch_applied", payload: {} },
    { id: "a2", session_id: "s1", sequence_number: 2, actor: "candidate", event_type: "command_run", payload: { command: "test", ok: true } },
  ]);
  assert.equal(used.observed, true);
  assert.ok(used.score != null && used.score >= 0 && used.score <= 1);
});

// ---------------------------------------------------------------------------
// 13. Adaptability — no curveball → not observed
// ---------------------------------------------------------------------------
goldenCase("adaptability: no curveball → observed false", () => {
  const none = computeAdaptability([
    { id: "e1", session_id: "s1", sequence_number: 1, actor: "candidate", event_type: "command_run", payload: { command: "test" } },
  ]);
  assert.equal(none.observed, false);
  assert.equal(none.score01, null);

  const withCurve = computeAdaptability([
    {
      id: "c1",
      session_id: "s1",
      sequence_number: 1,
      actor: "system",
      event_type: "curveball_revealed",
      payload: { key: "schema_drift" },
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "c2",
      session_id: "s1",
      sequence_number: 2,
      actor: "candidate",
      event_type: "customer_chat_message",
      payload: { text: "I'm adjusting the plan and cutting scope after the schema drift." },
      created_at: "2026-01-01T00:05:00.000Z",
    },
  ]);
  assert.equal(withCurve.observed, true);
  assert.ok(withCurve.score01 != null && withCurve.score01 > 0);
  assert.equal(withCurve.curveballEventId, "c1");
});

// ---------------------------------------------------------------------------
// 14. Geometric / arithmetic composite blend
// ---------------------------------------------------------------------------
goldenCase("composite: geometric blend S = alpha*arith + (1-alpha)*geom", () => {
  assert.equal(COMPOSITE_ALPHA, 0.65);
  const flags = {} as OpportunityFlags;
  for (const id of TRAIT_IDS) flags[id] = false;
  flags.technical_execution = true;
  flags.verification_discipline = true;

  const fit = compositeFitScore(
    [
      atom({
        dimensionId: "technical_execution",
        independenceGroup: "t1",
        direction: "supporting",
        magnitude: 0.9,
        relevance: 0.9,
        reliability: 0.9,
        sourceKind: "behavioral_direct",
      }),
      atom({
        dimensionId: "technical_execution",
        independenceGroup: "t2",
        direction: "supporting",
        magnitude: 0.9,
        relevance: 0.9,
        reliability: 0.9,
        sourceKind: "behavioral_direct",
      }),
      atom({
        dimensionId: "verification_discipline",
        independenceGroup: "v1",
        direction: "supporting",
        magnitude: 0.85,
        relevance: 0.85,
        reliability: 0.9,
        sourceKind: "behavioral_direct",
      }),
      atom({
        dimensionId: "verification_discipline",
        independenceGroup: "v2",
        direction: "supporting",
        magnitude: 0.85,
        relevance: 0.85,
        reliability: 0.9,
        sourceKind: "behavioral_direct",
      }),
    ],
    flags
  );

  assert.ok(fit.arithmetic01 != null && fit.geometric01 != null && fit.composite01 != null);
  const expected =
    COMPOSITE_ALPHA * (fit.arithmetic01 as number) + (1 - COMPOSITE_ALPHA) * (fit.geometric01 as number);
  assert.ok(Math.abs((fit.composite01 as number) - expected) < 1e-9);
  assert.ok(fit.fitScore100 != null, "two strong observed traits with healthy N_eff must publish a fit score");
  assert.ok((fit.geometric01 as number) <= (fit.arithmetic01 as number) + 1e-9);
});

// ---------------------------------------------------------------------------
// 15. IG / DE smoke
// ---------------------------------------------------------------------------
goldenCase("IG/DE: entropy drops and DE is finite", () => {
  const before = [...DEFAULT_HYPOTHESIS_PROBS];
  const after = [0.7, 0.1, 0.1, 0.1];
  const hBefore = hypothesisEntropy(before);
  const hAfter = hypothesisEntropy(after);
  assert.ok(hAfter < hBefore);
  const ig = informationGain(before, after);
  assert.ok(ig > 0);
  const de = diagnosticEfficiency({ totalIG: ig, timeNorm: 0.5, changeNorm: 0.2, redundancyNorm: 0.1 });
  assertFinite(de, "diagnosticEfficiency");
  assert.ok(de > 0);
});

// ---------------------------------------------------------------------------

if (failures > 0) {
  console.error(`\n${failures} golden case(s) failed.`);
  process.exit(1);
}
console.log("\nAll evidence-math golden cases passed. EVIDENCE_MATH_OK");
