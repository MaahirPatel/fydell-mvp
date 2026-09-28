/**
 * AI-06 tests: model-output validation.
 *
 * Invalid output routes to retry/human_review — never a fabricated complete
 * report. We test schema checks, permitted labels, citation validation,
 * bounded length, contradiction checks, and AI-01 verdict smuggling through
 * the full validateModelOutput path.
 *
 * Run: npx tsx scripts/test-analysis-grind-model-output.ts
 */
import {
  validateModelOutput,
  type ModelReviewOutput,
  type ValidationContext,
} from "../src/lib/analysis/modelOutput";
import { indexSnapshot } from "../src/lib/analysis/citations";
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

const DET: DeterministicSection = {
  submissionHash: "sha256:aaa",
  testSuiteHash: "sha256:bbb",
  tests: [
    { id: "t-101", name: "matches normalized ids", status: "passed" },
    { id: "t-118", name: "surfaces unmatched rows", status: "failed" },
  ],
  engineFindings: [],
  ranAt: new Date().toISOString(),
};

const CTX: ValidationContext = {
  snapshot: indexSnapshot([{ path: "merge.py", content: Array(20).fill("x").join("\n") }]),
  testOutputs: new Set(["t-101", "t-118"]),
  messages: new Set(["m-42"]),
  deterministic: DET,
};

function validReview(): ModelReviewOutput {
  return {
    schemaVersion: 1,
    summary: "The harness reports one failure (t-118): unmatched rows never surface.",
    findings: [
      {
        id: "f1",
        dimension: "correctness",
        claim: "summarize() reduces the unmatched partition to a count.",
        status: "reproduced_defect",
        material: true,
        citations: [
          { source: "snapshot", file: "merge.py", line: 12, note: "defect: dropped rows only counted" },
          { source: "test_output", refId: "t-118" },
        ],
      },
    ],
    dimensionNotes: {
      correctness: { outcome: "below", rationale: "t-118 failed; defect cited at merge.py:12." },
      robustness: { outcome: "meets", rationale: "No security findings." },
      code_quality: { outcome: "meets", rationale: "Clear control flow." },
      communication: { outcome: "insufficient_evidence", rationale: "No transcript submitted." },
    },
  };
}

// 1. A valid review passes.
const ok = validateModelOutput(validReview(), CTX);
check("valid review passes", ok.ok && ok.reasons.length === 0, JSON.stringify(ok.reasons));

// 2. Schema violations route to retry.
const badSchema = validateModelOutput({ nope: true }, CTX);
check("non-object routes to retry", !badSchema.ok && badSchema.route === "retry");
const badVersion = validateModelOutput({ ...validReview(), schemaVersion: 999 }, CTX);
check("wrong schema version routes to retry", !badVersion.ok && badVersion.route === "retry");

// 3. AI-01: smuggled verdicts go to human review, never a complete report.
const smuggled = validateModelOutput({ ...validReview(), testsPassed: true } as unknown, CTX);
check(
  "smuggled testsPassed routes to human_review",
  !smuggled.ok && smuggled.route === "human_review" && /AI-01/.test(smuggled.reasons.join(" ")),
  JSON.stringify(smuggled),
);

// 4. Contradiction: "all tests pass" vs a recorded failure.
const contra = validateModelOutput(
  { ...validReview(), summary: "All tests pass. Great submission." },
  CTX,
);
check(
  "universal-pass claim contradicting harness routes to human_review",
  !contra.ok && contra.route === "human_review" && /contradiction/.test(contra.reasons.join(" ")),
  JSON.stringify(contra.reasons),
);

// 5. Bad citations fail (AI-04 through the model path).
const badCite = validReview();
badCite.findings[0].citations = [{ source: "snapshot", file: "merge.py", line: 5000 }];
const badCiteRes = validateModelOutput(badCite, CTX);
check(
  "invalid citation fails validation",
  !badCiteRes.ok && /past the end/.test(badCiteRes.reasons.join(" ")),
  JSON.stringify(badCiteRes.reasons),
);

// 6. Material finding without citations fails.
const noCite = validReview();
noCite.findings[0].citations = [];
const noCiteRes = validateModelOutput(noCite, CTX);
check("material finding without citations fails", !noCiteRes.ok);

// 7. Permitted labels are enforced.
const badLabel = validReview();
(badLabel.findings[0] as { status: string }).status = "definitely_a_bug";
const badLabelRes = validateModelOutput(badLabel, CTX);
check("invented claim status is rejected", !badLabelRes.ok && badLabelRes.route === "retry");
const badOutcome = validReview();
badOutcome.dimensionNotes.correctness.outcome = "mostly_ok" as never;
const badOutcomeRes = validateModelOutput(badOutcome, CTX);
check("invented dimension outcome is rejected", !badOutcomeRes.ok);

// 8. Bounded length.
const long = validReview();
long.summary = "x".repeat(5000);
const longRes = validateModelOutput(long, CTX);
check("oversize summary is rejected", !longRes.ok && longRes.route === "retry");

// 9. AI-08 through the model path: culture-fit inference in communication notes.
const cultureFit = validReview();
cultureFit.dimensionNotes.communication = {
  outcome: "exceeds",
  rationale: "Candidate seems like a great culture fit with a confident personality.",
};
const cfRes = validateModelOutput(cultureFit, CTX);
check(
  "culture-fit inference routes to human_review",
  !cfRes.ok && cfRes.route === "human_review" && /AI-08/.test(cfRes.reasons.join(" ")),
  JSON.stringify(cfRes.reasons),
);

// 10. Duplicate finding ids are rejected.
const dup = validReview();
dup.findings.push({ ...dup.findings[0] });
const dupRes = validateModelOutput(dup, CTX);
check("duplicate finding ids are rejected", !dupRes.ok);

// 11. Invalid output never yields a "complete" report — the validator has no
//     complete-report path at all: ok:false carries no review payload.
check(
  "invalid output carries no fabricated review",
  !("review" in smuggled) && !("review" in contra),
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
