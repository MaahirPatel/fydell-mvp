import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import type {
  EvidenceWorkerResult,
  GoldenPathRun,
  WorkerRunSnapshot,
} from "../src/lib/sim-engine/golden-path/contracts";
import {
  acceptInvite,
  acceptWorkerResult,
  approveClaim,
  assertOrderedEvents,
  buildWorkerSnapshot,
  completeSimulation,
  createGoldenPathRun,
  rejectClaim,
  submitDefense,
  submitPreliminaryRecommendation,
} from "../src/lib/sim-engine/golden-path/workflow";

const python =
  process.env.EVIDENCE_ENGINE_PYTHON || (process.platform === "win32" ? "python" : "python3");
const worker = path.join(process.cwd(), "services", "evidence-engine", "worker.py");

function runWorker(snapshot: WorkerRunSnapshot): EvidenceWorkerResult {
  const result = spawnSync(python, [worker], {
    input: JSON.stringify(snapshot),
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as EvidenceWorkerResult;
}

function answerAll(run: GoldenPathRun, body: string): Record<string, string> {
  return Object.fromEntries(run.defenseQuestions.map((question) => [question.id, body]));
}

function throughPassA(): { run: GoldenPathRun; passA: EvidenceWorkerResult } {
  let run = createGoldenPathRun("Golden path test candidate");
  run = acceptInvite(run);
  run = submitPreliminaryRecommendation(
    run,
    "Use the OAuth proxy endpoint and preserve the existing mapping."
  );

  assert.equal(run.events.at(-1)?.eventType, "FACT_RELEASED");
  assert.equal(run.changedFact.factId, "AUTH_001");
  assert.equal(run.artifacts[0]?.beforeFact, true);

  run = completeSimulation(
    run,
    "Use the supported server-to-server API with a scoped service account. Preserve the mapping and validate it before production."
  );
  assert.equal(run.status, "COMPLETED");
  assert.equal(run.analysisJob?.jobType, "EXTRACT_EVIDENCE_INITIAL");
  assert.equal(run.artifacts[1]?.beforeFact, false);
  assertOrderedEvents(run.events);

  const passA = runWorker(buildWorkerSnapshot(run));
  assert.equal(passA.runId, run.id);
  assert.equal(passA.analysisPass, "A");
  assert.equal(passA.claim.direction, "STRENGTH");
  assert.ok(passA.claim.supportingEventIds.length > 0);
  assert.ok(passA.claim.counterEventIds.length > 0);
  assert.ok(passA.defenseQuestions.length > 0);

  run = acceptWorkerResult(run, passA);

  // Pass A produces a provisional claim only. It must not be reviewable yet.
  assert.equal(run.status, "DEFENSE_REQUIRED");
  assert.equal(run.claim, null);
  assert.equal(run.initialClaim?.reviewStatus, "GENERATED");
  assert.equal(run.defenseQuestions.length, passA.defenseQuestions.length);
  assert.ok(run.events.some((event) => event.eventType === "DEFENSE_QUESTION_GENERATED"));
  assertOrderedEvents(run.events);
  return { run, passA };
}

// A defense that names production-shaped validation should hold the claim up.
{
  const { run: afterPassA } = throughPassA();
  let run = submitDefense(
    afterPassA,
    answerAll(
      afterPassA,
      "I would validate the new authentication path against a sandbox tenant that mirrors production scopes before committing to it."
    )
  );
  assert.equal(run.status, "DEFENSE_COMPLETED");
  assert.equal(run.analysisJob?.jobType, "EXTRACT_EVIDENCE_FINAL");
  assert.ok(run.defenseQuestions.every((question) => question.response));
  assert.ok(run.events.some((event) => event.eventType === "DEFENSE_RESPONSE_SUBMITTED"));
  assertOrderedEvents(run.events);

  const passB = runWorker(buildWorkerSnapshot(run));
  assert.equal(passB.analysisPass, "B");
  assert.equal(passB.claim.direction, "STRENGTH");
  assert.equal(passB.claim.confidence, "HIGH");
  assert.equal(passB.defenseQuestions.length, 0);

  run = acceptWorkerResult(run, passB);
  assert.equal(run.status, "REVIEW_REQUIRED");
  assert.equal(run.claim?.reviewStatus, "REVIEW_REQUIRED");
  assert.ok(
    run.claim?.supportingEventIds.every((id) => run.events.some((event) => event.id === id))
  );

  const reviewRun = run;
  run = approveClaim(run, "Provenance checked in test.");
  assert.equal(run.status, "PUBLISHED");
  assert.equal(run.claim?.reviewStatus, "PUBLISHED");
  assert.equal(run.brief?.recommendation, "WORTH_INTERVIEWING");
  assert.equal(run.brief?.claimIds[0], run.claim?.id);
  assertOrderedEvents(run.events);

  const rejected = rejectClaim(reviewRun, "Evidence is not sufficient for publication.");
  assert.equal(rejected.status, "PUBLISHED");
  assert.equal(rejected.claim?.reviewStatus, "REVIEWED");
  assert.equal(rejected.brief?.recommendation, "MORE_EVIDENCE_NEEDED");
  assert.equal(rejected.brief?.claimIds.length, 0);
}

// The same work with a hollow defense must not reach the same claim. This is the
// whole point of the second pass: the explanation has to carry weight.
{
  const { run: afterPassA } = throughPassA();
  const run = submitDefense(
    afterPassA,
    answerAll(afterPassA, "It seemed like the right call and the customer was happy with it.")
  );
  assert.equal(run.status, "DEFENSE_COMPLETED");

  const passB = runWorker(buildWorkerSnapshot(run));
  assert.equal(passB.analysisPass, "B");
  assert.equal(passB.claim.direction, "CONCERN");
  assert.notEqual(passB.claim.confidence, "HIGH");
}

// Guardrails: a run cannot skip the defense, and pass results cannot cross passes.
{
  const { run: afterPassA, passA } = throughPassA();
  assert.throws(() => buildWorkerSnapshot(afterPassA), /completed/i);

  const unanswered = submitDefense(afterPassA, {});
  assert.equal(unanswered.status, "DEFENSE_REQUIRED", "empty defense must not advance the run");

  const completed = submitDefense(
    afterPassA,
    answerAll(afterPassA, "Validate in a sandbox that mirrors production first.")
  );
  const passBSnapshot = buildWorkerSnapshot(completed);
  assert.equal(passBSnapshot.analysisPass, "B");
  assert.ok(passBSnapshot.initialClaim, "pass B must see the provisional claim");

  assert.throws(
    () => acceptWorkerResult(completed, { ...passA, runId: completed.id }),
    /analysis pass/i,
    "a pass A result must not satisfy a pass B job"
  );
}

console.log("Golden path skeleton passed.");
