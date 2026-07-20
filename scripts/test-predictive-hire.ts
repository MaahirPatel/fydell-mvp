/**
 * Golden cases for the 10-trait numeric scoring + predictive hiring formulas.
 */
import assert from "node:assert/strict";
import {
  analyzeSession,
  compositeFitScore,
  predictHire,
  scoreTrait,
  TRAIT_IDS,
  type EvidenceAtomInput,
  type OpportunityFlags,
  type RelayEventLike,
} from "../src/lib/fde/evidence";

let failures = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(err);
  }
}

function atom(
  partial: Partial<EvidenceAtomInput> & Pick<EvidenceAtomInput, "dimensionId" | "independenceGroup">
): EvidenceAtomInput {
  return {
    sessionId: "s1",
    direction: "supporting",
    magnitude: 0.8,
    relevance: 0.8,
    reliability: 0.9,
    sourceKind: "behavioral_direct",
    summary: "test",
    eventRefs: ["e1"],
    artifactRefs: [],
    ...partial,
  };
}

function allObserved(overrides: Partial<OpportunityFlags> = {}): OpportunityFlags {
  const flags = {} as OpportunityFlags;
  for (const id of TRAIT_IDS) flags[id] = true;
  return { ...flags, ...overrides };
}

function noneObserved(): OpportunityFlags {
  const flags = {} as OpportunityFlags;
  for (const id of TRAIT_IDS) flags[id] = false;
  return flags;
}

check("scoreTrait: two strong independent → score100 present and strong_evidence", () => {
  const result = scoreTrait(
    "technical_execution",
    [
      atom({ dimensionId: "technical_execution", independenceGroup: "g1", magnitude: 0.85 }),
      atom({ dimensionId: "technical_execution", independenceGroup: "g2", magnitude: 0.85 }),
      atom({ dimensionId: "technical_execution", independenceGroup: "g3", magnitude: 0.9 }),
    ],
    true
  );
  assert.ok(result.score100 != null);
  assert.ok((result.score100 as number) >= 60);
  assert.equal(result.bucket, "strong_evidence");
  assert.equal(result.opportunityFlag, true);
});

check("scoreTrait: opportunityFlag=false → not_observed regardless of atoms", () => {
  const result = scoreTrait(
    "ai_tool_judgment",
    [atom({ dimensionId: "ai_tool_judgment", independenceGroup: "only", magnitude: 0.9 })],
    false
  );
  assert.equal(result.bucket, "not_observed");
  assert.equal(result.score100, null);
});

check("scoreTrait: opportunity present but one atom → needs_review, not strong (no invented certainty)", () => {
  const result = scoreTrait(
    "elicitation",
    [atom({ dimensionId: "elicitation", independenceGroup: "only", magnitude: 0.95, relevance: 0.95, reliability: 0.95 })],
    true
  );
  assert.ok(result.score100 != null);
  assert.notEqual(result.bucket, "strong_evidence", "a single independent moment must never be labeled strong_evidence");
});

check("compositeFitScore: not_observed traits excluded from composite, not penalized", () => {
  const atoms: EvidenceAtomInput[] = [
    atom({ dimensionId: "technical_execution", independenceGroup: "e1", magnitude: 0.9 }),
    atom({ dimensionId: "technical_execution", independenceGroup: "e2", magnitude: 0.9 }),
    atom({ dimensionId: "verification_discipline", independenceGroup: "j1", magnitude: 0.9 }),
    atom({ dimensionId: "verification_discipline", independenceGroup: "j2", magnitude: 0.9 }),
  ];
  const flags = noneObserved();
  flags.technical_execution = true;
  flags.verification_discipline = true;
  const fit = compositeFitScore(atoms, flags);
  assert.ok(fit.fitScore100 != null);
  assert.equal(fit.observedTraitCount, 2);
  assert.equal(fit.notObservedTraitIds.length, 8);
  assert.ok((fit.fitScore100 as number) >= 60, "composite over two strong observed traits should be high, unaffected by 8 not_observed traits");
});

check("predictHire: strong evidence across all traits → advance", () => {
  const atoms: EvidenceAtomInput[] = [];
  for (const id of TRAIT_IDS) {
    atoms.push(atom({ dimensionId: id, independenceGroup: `${id}:a`, magnitude: 0.85 }));
    atoms.push(atom({ dimensionId: id, independenceGroup: `${id}:b`, magnitude: 0.85 }));
    atoms.push(atom({ dimensionId: id, independenceGroup: `${id}:c`, magnitude: 0.9 }));
  }
  const fit = compositeFitScore(atoms, allObserved());
  const pred = predictHire(fit);
  assert.ok(pred.hireProbabilityPct >= 60);
  assert.equal(pred.recommendation, "advance");
  assert.ok(pred.drivers.length > 0);
  assert.ok(pred.caveats.length > 0);
});

check("predictHire: counter-evidence lowers probability vs support-only", () => {
  const flags = noneObserved();
  flags.technical_execution = true;
  const support = compositeFitScore(
    [
      atom({ dimensionId: "technical_execution", independenceGroup: "a", direction: "supporting", magnitude: 0.8 }),
      atom({ dimensionId: "technical_execution", independenceGroup: "b", direction: "supporting", magnitude: 0.8 }),
    ],
    flags
  );
  const mixed = compositeFitScore(
    [
      atom({ dimensionId: "technical_execution", independenceGroup: "a", direction: "supporting", magnitude: 0.8 }),
      atom({ dimensionId: "technical_execution", independenceGroup: "b", direction: "counter", magnitude: 0.8 }),
    ],
    flags
  );
  const pSupport = predictHire(support).hireProbability;
  const pMixed = predictHire(mixed).hireProbability;
  assert.ok(pMixed <= pSupport);
});

check("predictHire: nothing observed → hold with default prior", () => {
  const pred = predictHire(compositeFitScore([], noneObserved()));
  assert.equal(pred.recommendation, "hold");
  assert.equal(pred.confidence, "low");
});

check("analyzeSession: end-to-end events produce traits + composite + prediction", () => {
  const events: RelayEventLike[] = [
    {
      id: "e1",
      session_id: "s1",
      sequence_number: 1,
      actor: "candidate",
      event_type: "customer_chat_message",
      payload: { text: "What is the approval threshold for refunds?" },
    },
    {
      id: "e2",
      session_id: "s1",
      sequence_number: 2,
      actor: "candidate",
      event_type: "command_run",
      payload: { command: "test", ok: true },
    },
    {
      id: "e3",
      session_id: "s1",
      sequence_number: 3,
      actor: "candidate",
      event_type: "command_run",
      payload: { command: "evals", ok: true },
    },
    {
      id: "e4",
      session_id: "s1",
      sequence_number: 4,
      actor: "system",
      event_type: "curveball_revealed",
      payload: { key: "policy_change" },
    },
    {
      id: "e5",
      session_id: "s1",
      sequence_number: 5,
      actor: "candidate",
      event_type: "customer_chat_message",
      payload: { text: "Given the change, I'm cutting scope to just the refund router for now." },
    },
    {
      id: "e6",
      session_id: "s1",
      sequence_number: 6,
      actor: "candidate",
      event_type: "command_run",
      payload: { command: "test", ok: true },
    },
    { id: "e7", session_id: "s1", sequence_number: 7, actor: "candidate", event_type: "session_submitted", payload: {} },
  ];

  const analysis = analyzeSession(events, {
    sessionId: "s1",
    planText: "Fix approval hole first, then re-run evals. Risks: false automation on refunds.",
    handoffText:
      "Verified with tests and evals. Recommend shipping the router fix. Residual risk: not sure the severity filter covers every edge case.",
  });

  assert.ok(analysis.atoms.length >= 4);
  assert.ok(analysis.composite.fitScore100 != null);
  assert.ok(analysis.prediction.hireProbabilityPct > 0);
  assert.equal(analysis.traits.length, 10);
  assert.equal(analysis.findings.length, 10);
  assert.ok(analysis.findings.every((f) => Array.isArray(f.event_ids)));
  assert.equal(analysis.validationMaturity, "design_weighted");
});

check("deterministic reprocessing: identical events → identical composite + prediction", () => {
  const events: RelayEventLike[] = [
    {
      id: "e1",
      session_id: "s1",
      sequence_number: 1,
      actor: "candidate",
      event_type: "command_run",
      payload: { command: "test", ok: true },
    },
    {
      id: "e2",
      session_id: "s1",
      sequence_number: 2,
      actor: "candidate",
      event_type: "command_run",
      payload: { command: "evals", ok: true },
    },
  ];
  const a = analyzeSession(events, { sessionId: "s1", planText: "x".repeat(50), handoffText: "y".repeat(50) });
  const b = analyzeSession(events, { sessionId: "s1", planText: "x".repeat(50), handoffText: "y".repeat(50) });
  assert.equal(a.composite.fitScore100, b.composite.fitScore100);
  assert.equal(a.prediction.hireProbabilityPct, b.prediction.hireProbabilityPct);
  assert.equal(a.prediction.recommendation, b.prediction.recommendation);
});

if (failures > 0) {
  console.error(`\n${failures} predictive-hire case(s) failed.`);
  process.exit(1);
}
console.log("\nAll predictive-hire golden cases passed. PREDICTIVE_HIRE_OK");
