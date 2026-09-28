/**
 * AI-04 tests: citation validation.
 *
 * Every material finding must link to valid lines in the pinned snapshot, a
 * recorded test output, or a transcript message. Invalid references fail.
 *
 * Run: npx tsx scripts/test-analysis-grind-citations.ts
 */
import {
  indexSnapshot,
  validateCitation,
  validateFindingCitations,
} from "../src/lib/analysis/citations";

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

const snapshot = indexSnapshot([
  { path: "merge.py", content: "a\nb\nc\nd\ne\nf\ng\nh\ni\nj" }, // 10 lines
  { path: "util.py", content: "x\ny" }, // 2 lines
]);
const testOutputs = new Set(["t-118"]);
const messages = new Set(["m-42"]);

// Valid citations pass.
check(
  "valid snapshot citation passes",
  validateCitation({ source: "snapshot", file: "merge.py", line: 5 }, snapshot, testOutputs, messages, 0).length === 0,
);
check(
  "valid range citation passes",
  validateCitation({ source: "snapshot", file: "merge.py", line: 3, endLine: 7 }, snapshot, testOutputs, messages, 0).length === 0,
);
check(
  "valid test_output citation passes",
  validateCitation({ source: "test_output", refId: "t-118" }, snapshot, testOutputs, messages, 0).length === 0,
);
check(
  "valid message citation passes",
  validateCitation({ source: "message", refId: "m-42" }, snapshot, testOutputs, messages, 0).length === 0,
);

// Invalid references fail validation.
const probs = (i: number, c: Parameters<typeof validateCitation>[0]) =>
  validateCitation(c, snapshot, testOutputs, messages, i);

check("unknown file fails", probs(0, { source: "snapshot", file: "nope.py", line: 1 }).length === 1);
check("line 0 fails", probs(0, { source: "snapshot", file: "merge.py", line: 0 }).length === 1);
check("negative line fails", probs(0, { source: "snapshot", file: "merge.py", line: -3 }).length === 1);
check(
  "line past end fails",
  probs(0, { source: "snapshot", file: "merge.py", line: 11 }).length === 1,
  "merge.py has 10 lines",
);
check(
  "endLine past end fails",
  probs(0, { source: "snapshot", file: "merge.py", line: 9, endLine: 99 }).length === 1,
);
check(
  "endLine before line fails",
  probs(0, { source: "snapshot", file: "merge.py", line: 5, endLine: 4 }).length === 1,
);
check(
  "missing file field fails",
  probs(0, { source: "snapshot", line: 5 }).length === 1,
);
check(
  "unknown test output fails",
  probs(0, { source: "test_output", refId: "t-999" }).length === 1,
);
check(
  "unknown message fails",
  probs(0, { source: "message", refId: "m-999" }).length === 1,
);
check(
  "fabricated-looking citation index is reported",
  probs(2, { source: "snapshot", file: "merge.py", line: 500 })[0]?.citationIndex === 2,
);

// Material findings MUST have citations; non-material notes may omit them.
const materialNoCites = validateFindingCitations(undefined, true, snapshot, testOutputs, messages);
check("material finding without citations fails", !materialNoCites.valid);

const materialGood = validateFindingCitations(
  [{ source: "snapshot", file: "merge.py", line: 5 }],
  true,
  snapshot,
  testOutputs,
  messages,
);
check("material finding with valid citations passes", materialGood.valid);

const noteNoCites = validateFindingCitations(undefined, false, snapshot, testOutputs, messages);
check("non-material note without citations passes", noteNoCites.valid);

const mixed = validateFindingCitations(
  [
    { source: "snapshot", file: "merge.py", line: 2 },
    { source: "snapshot", file: "merge.py", line: 400 },
  ],
  true,
  snapshot,
  testOutputs,
  messages,
);
check(
  "one bad citation fails the whole finding",
  !mixed.valid && mixed.problems.length === 1 && mixed.problems[0].citationIndex === 1,
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
