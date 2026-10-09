/**
 * Follow-up questions and decision brief for employer-authored work samples.
 * Pure functions over a synthetic evaluation. No network, no database.
 *
 *   npm run test:authored-follow-ups
 */
import assert from "node:assert/strict";
import type { RubricCriterion } from "../src/lib/eng/authoring/package";
import { authoredBriefText, buildAuthoredDecisionBrief, buildAuthoredFollowUps } from "../src/lib/eng/authored/follow-ups";
import type { AuthoredCriterionResult, EmployerAuthoredEvaluation } from "../src/lib/eng/authored/types";

function rubric(id: string, judgedBy: "tests" | "reviewer", acceptanceCriterionIds: string[]): RubricCriterion {
  return {
    id,
    capability: "testing" as RubricCriterion["capability"],
    label: `Criterion ${id}`,
    whyItMatters: "Synthetic.",
    observableEvidence: `Evidence for ${id}`,
    anchors: { concern_observed: "", partially_demonstrated: "", demonstrated: "" },
    insufficientEvidence: "",
    limitations: "",
    candidateExplanation: "",
    acceptanceCriterionIds,
    judgedBy,
  };
}

function criterion(id: string, state: AuthoredCriterionResult["state"], judgedBy: "tests" | "reviewer", acceptanceCriterionIds: string[]): AuthoredCriterionResult {
  return { id, label: `Criterion ${id}`, capability: "testing", judgedBy, state, rationale: "", acceptanceCriterionIds, evidence: { confirmed: 0, notConfirmed: 0, noResult: 0 } };
}

const evaluation: EmployerAuthoredEvaluation = {
  runId: "run-1",
  runner: { label: "Local runner", isolated: false } as EmployerAuthoredEvaluation["runner"],
  suite: { outcome: "ran", command: "npm test", exitCode: 1, durationMs: 1200 },
  tests: [
    { name: "trims input", file: "test/a.test.js", visibility: "public", outcome: "passed", criterionIds: ["AC-1"] },
    { name: "hidden rejects empty", file: "test/h.test.js", visibility: "protected", outcome: "failed", criterionIds: ["AC-2"] },
    { name: "skipped case", file: "test/h.test.js", visibility: "protected", outcome: "skipped", criterionIds: ["AC-2"] },
    { name: "no result case", file: "test/h.test.js", visibility: "protected", outcome: "missing", criterionIds: ["AC-3"] },
  ],
  acceptance: [
    { id: "AC-1", text: "Input is trimmed", state: "confirmed", passed: 1, failed: 0, missing: 0 },
    { id: "AC-2", text: "Empty input is rejected", state: "not_confirmed", passed: 0, failed: 1, missing: 0 },
    { id: "AC-3", text: "Errors are reported", state: "no_result", passed: 0, failed: 0, missing: 1 },
  ],
  criteria: [
    criterion("C1", "demonstrated", "tests", ["AC-1"]),
    criterion("C2", "concern_observed", "tests", ["AC-2"]),
    criterion("C3", "insufficient_evidence", "tests", ["AC-3"]),
    criterion("C4", "not_assessed", "reviewer", []),
  ],
  limitations: ["Synthetic limitation."],
  output: "",
  createdAt: new Date(0).toISOString(),
};
const rubricList = [rubric("C1", "tests", ["AC-1"]), rubric("C2", "tests", ["AC-2"]), rubric("C3", "tests", ["AC-3"]), rubric("C4", "reviewer", [])];

const followUps = buildAuthoredFollowUps(evaluation, rubricList);
let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok ${name}`);
}

check("demonstrated criteria get no follow-up", () => {
  assert.equal(followUps.some((f) => f.criterionId === "C1"), false);
});
check("a concern cites the unconfirmed requirement and the failing test, not the skipped one", () => {
  const f = followUps.find((x) => x.criterionId === "C2");
  assert.ok(f);
  assert.match(f.basis, /AC-2 was not confirmed/);
  assert.match(f.question, /Empty input is rejected/);
  assert.deepEqual(f.tests, ["hidden rejects empty"]);
});
check("insufficient evidence asks how the requirement was checked", () => {
  const f = followUps.find((x) => x.criterionId === "C3");
  assert.ok(f);
  assert.match(f.basis, /did not produce a result/);
  assert.match(f.question, /Errors are reported/);
});
check("reviewer-judged criteria point at the rubric's observable evidence", () => {
  const f = followUps.find((x) => x.criterionId === "C4");
  assert.ok(f);
  assert.match(f.question, /Evidence for C4/);
  assert.deepEqual(f.tests, []);
});

const brief = buildAuthoredDecisionBrief(evaluation);
check("the brief counts acceptance states", () => {
  assert.deepEqual(brief.acceptance, { confirmed: 1, notConfirmed: 1, noResult: 1, total: 3 });
  assert.deepEqual(brief.demonstrated, ["Criterion C1"]);
  assert.deepEqual(brief.concerns, ["Criterion C2"]);
  assert.deepEqual(brief.notAssessed, ["Criterion C3", "Criterion C4"]);
});
check("the exported brief has no score, no verdict and no protected test names", () => {
  const text = authoredBriefText({ candidate: "Candidate A", role: "Backend engineer", task: "Synthetic task", brief, followUps });
  assert.match(text, /1 of 3 confirmed by tests/);
  assert.doesNotMatch(text, /hidden rejects empty/);
  assert.doesNotMatch(text, /\bscore\b(?! the candidate)|recommend|hire\b/i);
  assert.doesNotMatch(text, /\u2014/);
});

console.log(`\n${passed} checks passed`);
