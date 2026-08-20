import { strict as assert } from "node:assert";
import {
  evaluateNorthlinePassA,
  evaluateNorthlinePassB,
} from "./northlineEvaluator";
import {
  acceptNorthlinePassB,
  createNorthlineEvidenceWorkflow,
  publishNorthlineBrief,
  recordNorthlineDefense,
} from "./northlineWorkflow";
import { northlineOperationsYieldScenario } from "../scenarios/data-analyst/northline-operations-yield";
import {
  buildNorthlineExcellentFixture,
  buildNorthlineIgnoresChangeFixture,
} from "../scenarios/data-analyst/fixtures";

const scenario = northlineOperationsYieldScenario;
const excellentAttempt = buildNorthlineExcellentFixture(scenario);
const passA = evaluateNorthlinePassA(scenario, excellentAttempt);
const initial = createNorthlineEvidenceWorkflow(scenario, excellentAttempt, passA);

assert.equal(initial.stage, "DEFENSE_REQUIRED");
assert.ok(initial.defenseQuestions.length >= 2);
assert.ok(initial.ledger.world.length > 0);
assert.ok(initial.ledger.candidate.length > 0);
assert.ok(initial.ledger.system.length > 0);
assert.equal(
  new Set(initial.ledger.ordered.map((event) => event.id)).size,
  initial.ledger.ordered.length,
  "Each ledger event must belong to one stream only"
);
assert.ok(
  initial.ledger.ordered.every(
    (event, index) =>
      event.localSequence === index + 1 &&
      event.orderingAuthority === "BROWSER_DEV_STAND_IN"
  )
);

const substantiveResponses = initial.defenseQuestions.map((question, index) => ({
  eventId: `defense-substantive-${index + 1}`,
  response:
    "The day 9 timing narrows the affected window, but it does not remove the L2 Day residual. I preserved that finding, avoided claiming a cause, and would verify the line before the next shift because prior periods were not restated.",
}));
const hollowResponses = initial.defenseQuestions.map((question, index) => ({
  eventId: `defense-hollow-${index + 1}`,
  response: "I don't know.",
}));

const substantive = evaluateNorthlinePassB(
  scenario,
  excellentAttempt,
  substantiveResponses
);
const hollow = evaluateNorthlinePassB(scenario, excellentAttempt, hollowResponses);
const substantiveChange = substantive.claims.find(
  (claim) => claim.competencyId === "changed_information_response"
);
const hollowChange = hollow.claims.find(
  (claim) => claim.competencyId === "changed_information_response"
);
assert.equal(substantiveChange?.direction, "STRENGTH");
assert.equal(substantiveChange?.confidence, "HIGH");
assert.equal(hollowChange?.direction, "CONCERN");
assert.notEqual(substantiveChange?.statement, hollowChange?.statement);

const ignoredAttempt = buildNorthlineIgnoresChangeFixture(scenario);
const ignoredPassA = evaluateNorthlinePassA(scenario, ignoredAttempt);
assert.equal(
  ignoredPassA.claims.find(
    (claim) => claim.competencyId === "changed_information_response"
  )?.direction,
  "CONCERN",
  "Archetype C must never look strong"
);

const responseMap = Object.fromEntries(
  initial.defenseQuestions.map((question) => [question.id, "I don't know."])
);
const withDefense = recordNorthlineDefense(initial, responseMap, 1_000);
const reviewed = acceptNorthlinePassB(withDefense, hollow, 2_000);
assert.equal(reviewed.stage, "REVIEW_REQUIRED");
const published = publishNorthlineBrief(
  reviewed,
  "Evidence links checked; defense remained hollow.",
  false,
  3_000
);
assert.equal(published.stage, "PUBLISHED");
assert.equal(published.brief?.recommendation, "MORE_EVIDENCE_NEEDED");
assert.ok(
  published.passBClaims.every(
    (claim) =>
      claim.direction === "INSUFFICIENT_EVIDENCE" && claim.confidence === "LOW"
  )
);

console.log("Northline two-pass workflow passed.");
