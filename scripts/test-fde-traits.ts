/**
 * Golden cases for the deep 10-trait FDE analysis engine
 * (src/lib/fde/evidence/{traits,signals,opportunity,atoms,score,predict,analysis}.ts).
 *
 * Run: npx tsx scripts/test-fde-traits.ts
 */
import assert from "node:assert/strict";
import {
  FDE_W,
  TRAIT_IDS,
  assertTraitWeightsSumToOne,
  analyzeSession,
  buildOpportunityContext,
  compositeFitScore,
  computeOpportunityFlags,
  eventsToAtoms,
  opportunityFlagsFromEvents,
  scoreTrait,
  type EvidenceAtomInput,
  type RelayEventLike,
} from "../src/lib/fde/evidence";

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

function ev(partial: Partial<RelayEventLike> & Pick<RelayEventLike, "sequence_number" | "event_type">): RelayEventLike {
  return {
    id: `e${partial.sequence_number}`,
    session_id: "s1",
    actor: "candidate",
    payload: {},
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// 1. Trait model integrity — weights sum to 1, 10 traits, no dupes
// ---------------------------------------------------------------------------
goldenCase("FDE_W sums to 1 across all 10 traits", () => {
  assertTraitWeightsSumToOne();
  assert.equal(TRAIT_IDS.length, 10);
  assert.equal(new Set(TRAIT_IDS).size, 10, "trait ids must be unique");
  for (const id of TRAIT_IDS) {
    assert.ok(FDE_W[id] > 0, `${id} must have a positive weight`);
  }
});

// ---------------------------------------------------------------------------
// 2. Opportunity flag -> not_observed when no trap was presented
// ---------------------------------------------------------------------------
goldenCase("opportunity flag: no ai_patch_applied ever -> ai_tool_judgment is not_observed", () => {
  const events: RelayEventLike[] = [
    ev({ sequence_number: 1, event_type: "command_run", payload: { command: "test", ok: true } }),
    ev({ sequence_number: 2, event_type: "session_submitted" }),
  ];
  const flags = opportunityFlagsFromEvents(events);
  assert.equal(flags.ai_tool_judgment, false, "no AI patch was ever applied -- there was no opportunity");

  const atoms = eventsToAtoms(events, { sessionId: "s1" });
  const result = scoreTrait("ai_tool_judgment", atoms, flags.ai_tool_judgment);
  assert.equal(result.bucket, "not_observed");
  assert.equal(result.score100, null, "not_observed must never carry a numeric score");
});

goldenCase("opportunity flag: no curveball ever revealed -> scope_renegotiation and prioritization_under_pressure not_observed", () => {
  const events: RelayEventLike[] = [
    ev({ sequence_number: 1, event_type: "command_run", payload: { command: "test", ok: true } }),
  ];
  const flags = opportunityFlagsFromEvents(events);
  assert.equal(flags.scope_renegotiation, false);
  assert.equal(flags.prioritization_under_pressure, false);
});

goldenCase("opportunity flag: chat surfaces the ops/VP/dashboard conflict -> contradiction_handling is observed", () => {
  const events: RelayEventLike[] = [
    ev({
      sequence_number: 1,
      event_type: "customer_chat_message",
      payload: { text: "Ops says the queue is fine but the dashboard shows a totally different number — which one is right?" },
    }),
  ];
  const flags = opportunityFlagsFromEvents(events);
  assert.equal(flags.contradiction_handling, true);
});

// ---------------------------------------------------------------------------
// 3. Data integrity: a reconcile event drives a high dataint score
// ---------------------------------------------------------------------------
goldenCase("data integrity: reconcile command_run(ok=true) -> high data_integrity_vigilance", () => {
  const events: RelayEventLike[] = [
    ev({ sequence_number: 1, event_type: "command_run", payload: { command: "reconcile", ok: true } }),
    ev({ sequence_number: 2, event_type: "command_run", payload: { command: "reconcile", ok: true }, id: "e2b" }),
  ];
  const flags = opportunityFlagsFromEvents(events);
  assert.equal(flags.data_integrity_vigilance, true);

  const atoms = eventsToAtoms(events, { sessionId: "s1" });
  const dataintAtoms = atoms.filter((a) => a.dimensionId === "data_integrity_vigilance");
  assert.ok(dataintAtoms.length > 0, "reconcile command must mint a data_integrity_vigilance atom");
  assert.ok(dataintAtoms.every((a) => a.direction === "supporting"));

  const result = scoreTrait("data_integrity_vigilance", atoms, flags.data_integrity_vigilance);
  assert.ok(result.score100 != null);
  assert.ok((result.score100 as number) >= 60, `expected a high score, got ${result.score100}`);
});

goldenCase("data integrity: evals surfacing integrity_caught=false -> counter evidence, not high score", () => {
  const events: RelayEventLike[] = [
    ev({ sequence_number: 1, event_type: "command_run", payload: { command: "evals", ok: false, integrity_caught: false } }),
  ];
  const atoms = eventsToAtoms(events, { sessionId: "s1" });
  const dataintAtoms = atoms.filter((a) => a.dimensionId === "data_integrity_vigilance");
  assert.ok(dataintAtoms.length > 0);
  assert.ok(dataintAtoms.some((a) => a.direction === "counter"));
});

// ---------------------------------------------------------------------------
// 4. Elicitation: clarifying question before the first command_run
// ---------------------------------------------------------------------------
goldenCase("elicitation before work: '?' before first command_run scores high; after scores lower", () => {
  const before: RelayEventLike[] = [
    ev({ sequence_number: 1, event_type: "customer_chat_message", payload: { text: "What's the retention window before I start?" } }),
    ev({ sequence_number: 2, event_type: "command_run", payload: { command: "test", ok: true } }),
  ];
  const beforeAtoms = eventsToAtoms(before, { sessionId: "s1" }).filter((a) => a.dimensionId === "elicitation");
  assert.equal(beforeAtoms.length, 1);
  assert.equal(beforeAtoms[0].independenceGroup, "elicitation:pre_work_question");
  assert.ok(beforeAtoms[0].magnitude >= 0.6);

  const after: RelayEventLike[] = [
    ev({ sequence_number: 1, event_type: "command_run", payload: { command: "test", ok: true } }),
    ev({ sequence_number: 2, event_type: "customer_chat_message", payload: { text: "Can you clarify the retention window?" } }),
  ];
  const afterAtoms = eventsToAtoms(after, { sessionId: "s1" }).filter((a) => a.dimensionId === "elicitation");
  assert.equal(afterAtoms.length, 1);
  assert.equal(afterAtoms[0].independenceGroup, "elicitation:midwork_clarification");
  assert.ok(afterAtoms[0].magnitude < beforeAtoms[0].magnitude, "a pre-work question must score higher than a mid-work one");
});

// ---------------------------------------------------------------------------
// 5. Contradiction surfacing: naming the conflict outscores merely mentioning it
// ---------------------------------------------------------------------------
goldenCase("contradiction surfacing: naming the conflict -> supporting; vague mention -> mixed", () => {
  const surfaced: RelayEventLike[] = [
    ev({
      sequence_number: 1,
      event_type: "customer_chat_message",
      payload: { text: "The VP's numbers contradict what ops reported — I think the dashboard is the stale one." },
    }),
  ];
  const surfacedAtoms = eventsToAtoms(surfaced, { sessionId: "s1" }).filter((a) => a.dimensionId === "contradiction_handling");
  assert.equal(surfacedAtoms.length, 1);
  assert.equal(surfacedAtoms[0].direction, "supporting");

  const vague: RelayEventLike[] = [
    ev({ sequence_number: 1, event_type: "customer_chat_message", payload: { text: "I'll check with ops and the dashboard too." } }),
  ];
  const vagueAtoms = eventsToAtoms(vague, { sessionId: "s1" }).filter((a) => a.dimensionId === "contradiction_handling");
  assert.equal(vagueAtoms.length, 1);
  assert.equal(vagueAtoms[0].direction, "mixed");
  assert.ok(vagueAtoms[0].magnitude < surfacedAtoms[0].magnitude);
});

// ---------------------------------------------------------------------------
// 6. Composite determinism — same events + notes in, same composite out
// ---------------------------------------------------------------------------
function sampleEvents(): RelayEventLike[] {
  return [
    ev({ sequence_number: 1, event_type: "customer_chat_message", payload: { text: "What's the retention window?" } }),
    ev({ sequence_number: 2, event_type: "command_run", payload: { command: "test", ok: true } }),
    ev({ sequence_number: 3, event_type: "command_run", payload: { command: "reconcile", ok: true } }),
    ev({ sequence_number: 4, event_type: "curveball_revealed", actor: "system", payload: { key: "schema_drift" } }),
    ev({
      sequence_number: 5,
      event_type: "customer_chat_message",
      payload: { text: "Given the schema drift, I'm descoping the batch job for now." },
    }),
    ev({ sequence_number: 6, event_type: "ai_patch_applied", payload: {} }),
    ev({ sequence_number: 7, event_type: "command_run", payload: { command: "evals", ok: true } }),
    ev({ sequence_number: 8, event_type: "session_submitted" }),
  ];
}

goldenCase("composite determinism: identical events + notes -> byte-identical composite", () => {
  const opts = {
    sessionId: "s1",
    planText: "Plan: reconcile first, then fix router. Risk: dropped rows if schema drifts.",
    handoffText: "Verified with tests and evals. Recommend shipping. Residual risk: not fully sure about edge-case volumes.",
    knownsText: "Learned the retention window is 30 days from the customer.",
    unknownsText: "Still unsure whether the legacy importer also needs the same fix.",
  };
  const a = analyzeSession(sampleEvents(), opts);
  const b = analyzeSession(sampleEvents(), opts);
  assert.deepEqual(a.composite, b.composite, "composite must be byte-identical on reprocessing");
  assert.equal(a.composite.fitScore100, b.composite.fitScore100);
  assert.deepEqual(a.prediction, b.prediction);
});

goldenCase("composite determinism: reprocessing events alone (eventsToAtoms) is deterministic", () => {
  const events = sampleEvents();
  const run1 = eventsToAtoms(events, { sessionId: "s1" });
  const run2 = eventsToAtoms(sampleEvents(), { sessionId: "s1" });
  assert.deepEqual(run1, run2);
});

// ---------------------------------------------------------------------------
// 7. Buckets never invent certainty without evidence
// ---------------------------------------------------------------------------
goldenCase("buckets: one atom, however strong, is never strong_evidence", () => {
  const atoms: EvidenceAtomInput[] = [
    {
      sessionId: "s1",
      dimensionId: "technical_execution",
      direction: "supporting",
      magnitude: 0.99,
      relevance: 0.99,
      reliability: 0.99,
      independenceGroup: "only_one",
      sourceKind: "behavioral_direct",
      summary: "single very strong atom",
      eventRefs: [],
      artifactRefs: [],
    },
  ];
  const result = scoreTrait("technical_execution", atoms, true);
  assert.notEqual(result.bucket, "strong_evidence", "a single independent moment must never be labeled strong_evidence");
  assert.ok(result.independentCount < 2);
});

goldenCase("buckets: zero atoms but opportunity present -> neutral score, needs_review, not counter", () => {
  const result = scoreTrait("elicitation", [], true);
  assert.equal(result.score100, 50, "with zero evidence the score must sit at the neutral prior, not be penalized");
  assert.equal(result.bucket, "needs_review");
  assert.notEqual(result.bucket, "not_observed", "opportunity was present -- this must not silently become not_observed");
});

goldenCase("buckets: opportunity absent always wins over any atoms accidentally present", () => {
  const atoms: EvidenceAtomInput[] = [
    {
      sessionId: "s1",
      dimensionId: "ai_tool_judgment",
      direction: "supporting",
      magnitude: 0.9,
      relevance: 0.9,
      reliability: 0.9,
      independenceGroup: "g1",
      sourceKind: "behavioral_direct",
      summary: "stray atom",
      eventRefs: [],
      artifactRefs: [],
    },
  ];
  const result = scoreTrait("ai_tool_judgment", atoms, false);
  assert.equal(result.bucket, "not_observed");
  assert.equal(result.score100, null);
});

goldenCase("buckets: composite never assigns a score to a not_observed trait", () => {
  const ctx = buildOpportunityContext([]);
  const flags = computeOpportunityFlags(ctx);
  const fit = compositeFitScore([], flags);
  for (const trait of fit.traits) {
    assert.equal(trait.bucket, "not_observed");
    assert.equal(trait.score100, null);
  }
  assert.equal(fit.fitScore100, null, "an all-not_observed session must not produce a fabricated overall score");
});

// ---------------------------------------------------------------------------
// 8. ACTIVITY volume events never create atoms
// ---------------------------------------------------------------------------
goldenCase("activity-volume events never mint atoms", () => {
  const events: RelayEventLike[] = [
    ev({ sequence_number: 1, event_type: "keystroke_batch", payload: { count: 9999 } }),
    ev({ sequence_number: 2, event_type: "file_saved", payload: { paths: ["a.py"] } }),
    ev({ sequence_number: 3, event_type: "typing_metrics", payload: { wpm: 120 } }),
  ];
  const atoms = eventsToAtoms(events, { sessionId: "s1" });
  assert.equal(atoms.length, 0);
});

// ---------------------------------------------------------------------------

if (failures > 0) {
  console.error(`\n${failures} golden case(s) failed.`);
  process.exit(1);
}
console.log("\nAll FDE trait golden cases passed. FDE_TRAITS_OK");
