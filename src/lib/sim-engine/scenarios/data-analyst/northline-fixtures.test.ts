import { strict as assert } from "node:assert";
import { evaluateNorthlinePassA } from "../../analysis/northlineEvaluator";
import { northlineOperationsYieldScenario } from "./northline-operations-yield";
import {
  buildNorthlineExcellentFixture,
  buildNorthlineIgnoresChangeFixture,
  buildNorthlineOverreactsFixture,
  buildNorthlineTechnicalStrongPoorCommunicationFixture,
} from "./fixtures";

const scenario = northlineOperationsYieldScenario;
const results = {
  A: evaluateNorthlinePassA(
    scenario,
    buildNorthlineTechnicalStrongPoorCommunicationFixture(scenario)
  ),
  B: evaluateNorthlinePassA(scenario, buildNorthlineOverreactsFixture(scenario)),
  C: evaluateNorthlinePassA(scenario, buildNorthlineIgnoresChangeFixture(scenario)),
  D: evaluateNorthlinePassA(scenario, buildNorthlineExcellentFixture(scenario)),
};

const byCompetency = (key: keyof typeof results, competencyId: string) =>
  results[key].claims.find((claim) => claim.competencyId === competencyId);

assert.equal(
  byCompetency("A", "analytical_correctness")?.direction,
  "STRENGTH",
  "A must remain technically strong"
);
assert.equal(
  byCompetency("A", "business_judgment")?.direction,
  "CONCERN",
  "A must surface poor communication"
);
assert.equal(
  byCompetency("B", "changed_information_response")?.direction,
  "CONCERN",
  "B must surface overreaction to the changed fact"
);
assert.match(
  byCompetency("B", "changed_information_response")?.statement ?? "",
  /overreacted/,
  "B must explain that valid work was discarded"
);
assert.equal(
  byCompetency("C", "changed_information_response")?.direction,
  "CONCERN",
  "C ignoring changed information must fail loudly"
);
assert.match(
  byCompetency("C", "changed_information_response")?.statement ?? "",
  /without revising/,
  "C must never read as strong"
);
assert.ok(
  results.D.claims.every((claim) => claim.direction === "STRENGTH"),
  "D must produce strengths across the observed Northline competencies"
);
assert.equal(
  new Set(
    Object.values(results).map((result) =>
      result.claims.map((claim) => claim.direction).join("|")
    )
  ).size,
  3,
  "Archetype outcomes must remain distinguishable"
);
assert.ok(
  Object.values(results)
    .flatMap((result) => result.claims)
    .every(
      (claim) =>
        claim.rubricVersion &&
        claim.promptVersion &&
        claim.modelVersion &&
        Array.isArray(claim.supportingEventIds) &&
        Array.isArray(claim.counterEventIds)
    ),
  "Every claim must retain versions and evidence IDs"
);

for (const [key, result] of Object.entries(results)) {
  console.log(
    `${key}: ${result.claims
      .map((claim) => `${claim.competencyId}=${claim.direction}`)
      .join(", ")}`
  );
}
console.log("Northline archetype fixtures passed.");
