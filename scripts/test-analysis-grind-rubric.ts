/**
 * AI-03 / AI-07 / AI-09 tests: rubric anchors, claim grounding, reconciliation.
 *
 *  AI-03: dimensions have explicit anchors; no evidence -> insufficient_evidence
 *         (never a default pass/fail); alternative solutions are acceptable.
 *  AI-07: consequential claims are reproduced_defect or labeled hypothesis;
 *         style is never a defect.
 *  AI-09: handoff claims are reconciled against the deterministic record;
 *         accurate self-assessment is recorded, never used to upgrade code.
 *
 * Run: npx tsx scripts/test-analysis-grind-rubric.ts
 */
import {
  PERMITTED_OUTCOMES,
  RUBRIC,
  RUBRIC_VERSION,
  getDimension,
  scoreDimension,
} from "../src/lib/analysis/rubric";
import { groundClaims } from "../src/lib/analysis/grounding";
import { reconcileHandoff } from "../src/lib/analysis/reconcile";
import type { DeterministicSection } from "../src/lib/analysis/separation";

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

/* ------------------------------- AI-03 ------------------------------- */

check("rubric has 4 dimensions", RUBRIC.length === 4);
check("rubric version is pinned", RUBRIC_VERSION === "2026-09-27.1");
for (const dim of RUBRIC) {
  check(
    `dimension ${dim.id} has anchors`,
    dim.evidenceRequired.length > 0 &&
      !!dim.levels.exceeds.description &&
      !!dim.levels.meets.description &&
      !!dim.levels.below.description &&
      dim.limitations.length > 0 &&
      dim.severityGuidance.length > 0,
  );
  check(`dimension ${dim.id} allows alternatives`, dim.alternativeSolutionsAllowed === true);
  check(
    `dimension ${dim.id} defines insufficient-evidence`,
    dim.insufficientEvidence.when.length > 0 && dim.insufficientEvidence.meaning.length > 0,
  );
}

// No evidence -> insufficient_evidence, never a silent pass or fail.
const noEvidence = scoreDimension("correctness", { artifactRefs: [] }, "meets");
check(
  "no evidence -> insufficient_evidence (not a default pass)",
  noEvidence.outcome === "insufficient_evidence",
  JSON.stringify(noEvidence),
);
const noEvidence2 = scoreDimension("robustness", { artifactRefs: [] }, "below");
check(
  "no evidence -> insufficient_evidence (not a default fail)",
  noEvidence2.outcome === "insufficient_evidence",
);
check(
  "insufficient_evidence is a permitted outcome label",
  PERMITTED_OUTCOMES.includes("insufficient_evidence"),
);

// With evidence, the requested level is recorded with its artifacts.
const scored = scoreDimension("correctness", { artifactRefs: ["t-101", "t-118"] }, "below");
check("evidence-backed score records outcome", scored.outcome === "below");

let unknownDim = false;
try {
  getDimension("charisma" as never);
} catch {
  unknownDim = true;
}
check("unknown dimension throws", unknownDim);

/* ------------------------------- AI-07 ------------------------------- */

const DET: DeterministicSection = {
  submissionHash: "sha256:aaa",
  testSuiteHash: "sha256:bbb",
  tests: [
    { id: "t-101", name: "matches", status: "passed" },
    { id: "t-118", name: "surfaces unmatched", status: "failed" },
  ],
  engineFindings: [],
  ranAt: new Date().toISOString(),
};

const grounded = groundClaims(
  [
    {
      id: "c1",
      claim: "Unmatched rows never surface.",
      assertedStatus: "reproduced_defect",
      material: true,
      citations: [{ source: "snapshot", file: "merge.py", line: 12, note: "defect: only counted" }],
      reproducingTestIds: ["t-118"],
    },
    {
      id: "c2",
      claim: "The join might be slow on large inputs.",
      assertedStatus: "reproduced_defect",
      material: true,
      citations: [{ source: "snapshot", file: "merge.py", line: 4, note: "context" }],
    },
    {
      id: "c3",
      claim: "The code is too verbose.",
      assertedStatus: "reproduced_defect",
      material: true,
      citations: [{ source: "snapshot", file: "merge.py", line: 1, note: "defect" }],
    },
  ],
  DET,
);
check(
  "reproduced claim stands as reproduced_defect",
  grounded[0].groundedStatus === "reproduced_defect",
  grounded[0].groundingNote,
);
check(
  "unreproduced defect claim is demoted to hypothesis",
  grounded[1].groundedStatus === "hypothesis" && /demoted/i.test(grounded[1].groundingNote),
  grounded[1].groundingNote,
);
check(
  "style claim is demoted to observation, never a defect",
  grounded[2].groundedStatus === "observation",
  grounded[2].groundingNote,
);

/* ------------------------------- AI-09 ------------------------------- */

const rec = reconcileHandoff(
  {
    submittedAt: new Date().toISOString(),
    claims: [
      { id: "h1", kind: "test_status", text: "All tests pass." },
      { id: "h2", kind: "limitation", text: "Unmatched rows are only counted, not surfaced — t-118 covers this." },
      { id: "h3", kind: "feature", text: "I used a dict index for clarity." },
    ],
  },
  DET,
);
const h1 = rec.items.find((i) => i.claimId === "h1")!;
const h2 = rec.items.find((i) => i.claimId === "h2")!;
const h3 = rec.items.find((i) => i.claimId === "h3")!;
check(
  "'all tests pass' vs a recorded failure is a disagreement",
  h1.verdict === "disagrees" && rec.disagreements.includes("h1"),
  h1.detail,
);
check(
  "accurate self-assessment is recorded",
  h2.verdict === "agrees" && rec.accurateSelfAssessments.includes("h2"),
  h2.detail,
);
check(
  "feature claim is recorded as stated, not judged",
  h3.verdict === "unverifiable",
);

// Honest handoff: candidate says something fails, harness agrees.
const rec2 = reconcileHandoff(
  {
    submittedAt: new Date().toISOString(),
    claims: [{ id: "h1", kind: "test_status", text: "t-118 fails: I could not surface unmatched rows." }],
  },
  DET,
);
check(
  "candidate-reported failure matching the harness is agreement",
  rec2.items[0].verdict === "agrees" && rec2.disagreements.length === 0,
);

// Candidate claims a failure the harness never saw -> disagreement, not invention.
const rec3 = reconcileHandoff(
  {
    submittedAt: new Date().toISOString(),
    claims: [{ id: "h1", kind: "test_status", text: "Everything fails, nothing works." }],
  },
  { ...DET, tests: DET.tests.map((t) => ({ ...t, status: "passed" as const })) },
);
check(
  "claimed failure with a clean harness is a disagreement",
  rec3.items[0].verdict === "disagrees",
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
