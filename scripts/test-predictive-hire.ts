/**
 * Golden cases for numeric scoring + predictive hiring formulas.
 */
import assert from "node:assert/strict";
import {
  analyzeSession,
  compositeFitScore,
  predictHire,
  scoreDimension,
  type EvidenceAtomInput,
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

function atom(partial: Partial<EvidenceAtomInput> & Pick<EvidenceAtomInput, "dimensionId" | "independenceGroup">): EvidenceAtomInput {
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

check("scoreDimension: two strong independent → score100 present and supporting/strong", () => {
  const result = scoreDimension([
    atom({ dimensionId: "engineering_applied_ai_execution", independenceGroup: "g1", magnitude: 0.85 }),
    atom({ dimensionId: "engineering_applied_ai_execution", independenceGroup: "g2", magnitude: 0.85 }),
    atom({ dimensionId: "engineering_applied_ai_execution", independenceGroup: "g3", magnitude: 0.9 }),
  ]);
  assert.ok(result.score100 != null);
  assert.ok((result.score100 as number) >= 60);
  assert.ok(["supporting", "strong_supporting"].includes(result.state));
  assert.equal(result.provisional, false);
});

check("scoreDimension: one atom → provisional score with shrinkage", () => {
  const result = scoreDimension([
    atom({ dimensionId: "discovery_problem_framing", independenceGroup: "only", magnitude: 0.9 }),
  ]);
  assert.ok(result.score100 != null);
  assert.equal(result.provisional, true);
  // Heavy shrink toward 0.5 → should not be 90
  assert.ok((result.score100 as number) < 85);
});

check("compositeFitScore: equal-weight mean of scored dims", () => {
  const atoms: EvidenceAtomInput[] = [
    atom({ dimensionId: "engineering_applied_ai_execution", independenceGroup: "e1" }),
    atom({ dimensionId: "engineering_applied_ai_execution", independenceGroup: "e2" }),
    atom({ dimensionId: "evaluation_production_judgment", independenceGroup: "j1" }),
    atom({ dimensionId: "evaluation_production_judgment", independenceGroup: "j2" }),
  ];
  const fit = compositeFitScore(atoms);
  assert.ok(fit.fitScore100 != null);
  assert.ok(fit.scoredDimensionCount >= 2);
  assert.equal(fit.formulaVersion.length > 0, true);
});

check("predictHire: strong evidence → advance or strong_advance", () => {
  const dims = [
    "discovery_problem_framing",
    "technical_scoping_prioritization",
    "engineering_applied_ai_execution",
    "evaluation_production_judgment",
    "adaptation_customer_communication",
  ] as const;
  const atoms: EvidenceAtomInput[] = [];
  for (const d of dims) {
    atoms.push(atom({ dimensionId: d, independenceGroup: `${d}:a`, magnitude: 0.85 }));
    atoms.push(atom({ dimensionId: d, independenceGroup: `${d}:b`, magnitude: 0.85 }));
    atoms.push(atom({ dimensionId: d, independenceGroup: `${d}:c`, magnitude: 0.9 }));
  }
  const fit = compositeFitScore(atoms);
  const pred = predictHire(fit);
  assert.ok(pred.hireProbabilityPct >= 58);
  assert.ok(["advance", "strong_advance"].includes(pred.recommendation));
  assert.ok(pred.drivers.length > 0);
  assert.ok(pred.caveats.length > 0);
});

check("predictHire: counter-evidence lowers probability vs support-only", () => {
  const support = compositeFitScore([
    atom({ dimensionId: "engineering_applied_ai_execution", independenceGroup: "a", direction: "supporting", magnitude: 0.8 }),
    atom({ dimensionId: "engineering_applied_ai_execution", independenceGroup: "b", direction: "supporting", magnitude: 0.8 }),
  ]);
  const mixed = compositeFitScore([
    atom({ dimensionId: "engineering_applied_ai_execution", independenceGroup: "a", direction: "supporting", magnitude: 0.8 }),
    atom({ dimensionId: "engineering_applied_ai_execution", independenceGroup: "b", direction: "counter", magnitude: 0.8 }),
  ]);
  const pSupport = predictHire(support).hireProbability;
  const pMixed = predictHire(mixed).hireProbability;
  assert.ok(pMixed <= pSupport);
});

check("predictHire: empty fit → hold with default prior", () => {
  const pred = predictHire(compositeFitScore([]));
  assert.equal(pred.recommendation, "hold");
  assert.equal(pred.confidence, "low");
});

check("analyzeSession: end-to-end events produce fit + prediction", () => {
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
      payload: { text: "Updated the router for the new refund policy." },
    },
    {
      id: "e6",
      session_id: "s1",
      sequence_number: 6,
      actor: "candidate",
      event_type: "command_run",
      payload: { command: "test", ok: true },
    },
  ];

  const analysis = analyzeSession(events, {
    sessionId: "s1",
    planText: "Fix approval hole first, then re-run evals. Risks: false automation on refunds.",
    handoffText: "Recommend ship after policy check. Residual risk: severity filter still thin.",
  });

  assert.ok(analysis.atoms.length >= 4);
  assert.ok(analysis.fit.fitScore100 != null);
  assert.ok(analysis.prediction.hireProbabilityPct > 0);
  assert.ok(analysis.findings.length === 5);
  assert.ok(analysis.findings.every((f) => Array.isArray(f.event_ids)));
});

check("deterministic reprocessing: identical events → identical fit + prediction", () => {
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
  assert.equal(a.fit.fitScore100, b.fit.fitScore100);
  assert.equal(a.prediction.hireProbabilityPct, b.prediction.hireProbabilityPct);
  assert.equal(a.prediction.recommendation, b.prediction.recommendation);
});

if (failures > 0) {
  console.error(`\n${failures} predictive-hire case(s) failed.`);
  process.exit(1);
}
console.log("\nAll predictive-hire golden cases passed. PREDICTIVE_HIRE_OK");
