/**
 * AI-01 tests: deterministic vs interpretive separation.
 *
 * The model must never mark tests passed. We test:
 *  - verdict-shaped data is rejected at top level, nested, and in arrays;
 *  - legitimate prose that CITES harness results is allowed through the
 *    separation check (contradiction is a separate check in AI-06);
 *  - assembleReport refuses verdict-smuggling output;
 *  - a clean interpretive section assembles fine.
 *
 * Run: npx tsx scripts/test-analysis-grind-separation.ts
 */
import {
  assembleReport,
  assertNoTestVerdict,
  findTestVerdicts,
  type DeterministicSection,
  type InterpretiveSection,
} from "../src/lib/analysis/separation";

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

const CLEAN: InterpretiveSection = {
  summary: "The harness reports one failure (t-118); the unmatched partition is only counted.",
  findings: [
    {
      id: "f1",
      dimension: "correctness",
      claim: "Unmatched rows never surface; see summarize().",
      status: "reproduced_defect",
      citations: [{ source: "snapshot", file: "merge.py", line: 12, note: "defect" }],
    },
  ],
  dimensionNotes: {
    correctness: { outcome: "below", rationale: "t-118 failed; defect cited at merge.py:12." },
  },
};

// 1. Clean output passes the verdict scan.
check("clean interpretive output has no verdicts", findTestVerdicts(CLEAN).length === 0);

// 2. Top-level verdict declaration is caught.
check(
  "testsPassed:true is rejected",
  findTestVerdicts({ ...CLEAN, testsPassed: true }).length === 1,
);
check(
  "allTestsPassed is rejected",
  findTestVerdicts({ summary: "x", allTestsPassed: false }).length === 1,
);

// 3. Nested verdicts are caught (the model cannot hide them in sub-objects).
const nested = {
  summary: "fine",
  findings: [],
  dimensionNotes: {},
  meta: { evaluation: { suitePassed: true } },
};
const nestedHits = findTestVerdicts(nested);
check("nested suitePassed:true is rejected", nestedHits.length === 1 && nestedHits[0].includes("suitePassed"), JSON.stringify(nestedHits));

// 4. Verdicts inside arrays are caught.
check(
  "verdict inside findings array is rejected",
  findTestVerdicts({ findings: [{ id: "f1", testVerdict: "pass" }] }).length === 1,
);

// 5. Prose that merely MENTIONS tests is not a verdict (citing is allowed).
const proseMention = {
  summary: "The harness reports 2 failures (t-118, t-121).",
  findings: [],
  dimensionNotes: {},
};
check("prose citing harness results is allowed", findTestVerdicts(proseMention).length === 0);

// 6. assertNoTestVerdict throws with an AI-01 message.
let threw = false;
try {
  assertNoTestVerdict({ testsPassed: true });
} catch (e) {
  threw = /AI-01/.test((e as Error).message);
}
check("assertNoTestVerdict throws AI-01 error", threw);

// 7. assembleReport refuses smuggled verdicts…
let assembleThrew = false;
try {
  assembleReport(DET, { ...CLEAN, passRate: 0.95 });
} catch {
  assembleThrew = true;
}
check("assembleReport rejects verdict-smuggling output", assembleThrew);

// …and accepts clean output with sections kept distinct.
const report = assembleReport(DET, CLEAN);
check(
  "assembleReport keeps sections distinct",
  report.sectionOrder[0] === "deterministic" &&
    report.sectionOrder[1] === "interpretive" &&
    report.deterministic.tests.length === 2,
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
