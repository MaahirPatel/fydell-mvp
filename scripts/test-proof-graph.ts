/**
 * Proof-graph contracts. No database required.
 * Run: npx tsx scripts/test-proof-graph.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  sourceForEventType,
  JOB_TYPES,
  EVENT_SOURCES,
} from "../src/lib/sim-engine/proof/types";
import { factTriggerSatisfied, FACT_AUTH, FACT_SALES } from "../src/lib/sim-engine/proof/state-machine";
import { validateAnalysisResult, AnalysisValidationError } from "../src/lib/sim-engine/proof/validate-analysis";
import { fixtureC, fixtureD, fixtureA, fixtureB } from "../src/lib/sim-engine/proof/fixtures";
import { validateAgentOutput } from "../src/lib/sim-engine/proof/agents";
import {
  acceptInvite,
  submitPreliminaryRecommendation,
  completeSimulation,
  buildWorkerSnapshot,
  acceptWorkerResult,
  approveClaim,
  createGoldenPathRun,
  submitDefense,
} from "../src/lib/sim-engine/golden-path/workflow";
import { spawnSync } from "child_process";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

console.log("\nEvent streams");
ok("FACT_RELEASED is WORLD", sourceForEventType("FACT_RELEASED") === "WORLD");
ok("ARTIFACT_REVISION is CANDIDATE", sourceForEventType("ARTIFACT_REVISION") === "CANDIDATE");
ok("TAB_BLUR is TELEMETRY", sourceForEventType("TAB_BLUR") === "TELEMETRY");
ok("AUTOSAVE_FAILED is SYSTEM", sourceForEventType("AUTOSAVE_FAILED") === "SYSTEM");
ok("four sources", EVENT_SOURCES.length === 4);
ok("four job types", JOB_TYPES.length === 4);

console.log("\nChanged-fact triggers");
ok(
  "AUTH_001 does not fire before preliminary",
  factTriggerSatisfied({
    factId: FACT_AUTH,
    released: [],
    stage: "DISCOVERY",
    preliminarySubmitted: false,
    authAcknowledged: false,
    salesReleased: false,
  }) === false,
);
ok(
  "AUTH_001 fires after preliminary commit",
  factTriggerSatisfied({
    factId: FACT_AUTH,
    released: [],
    stage: "PRELIMINARY_RECOMMENDATION",
    preliminarySubmitted: true,
    authAcknowledged: false,
    salesReleased: false,
  }) === true,
);
ok(
  "SALES_001 does not fire from LLM assumption",
  factTriggerSatisfied({
    factId: FACT_SALES,
    released: [],
    stage: "DISCOVERY",
    preliminarySubmitted: true,
    authAcknowledged: false,
    salesReleased: false,
  }) === false,
);

console.log("\nClaim schema");
try {
  validateAnalysisResult({
    job_type: "GENERATE_DEFENSE",
    defense_questions: [{ prompt: "Tell me about a time you adapted.", target: "x" }],
  });
  ok("rejects STAR questions", false);
} catch (e) {
  ok("rejects STAR questions", e instanceof AnalysisValidationError);
}
try {
  validateAnalysisResult({
    job_type: "EXTRACT_EVIDENCE_INITIAL",
    claims: [
      {
        claim: "Adapted",
        competency: "adaptability",
        direction: "STRENGTH",
        confidence: "HIGH",
        supporting_event_ids: [],
        counterevidence_event_ids: [],
        rubric_version: "test-rubric",
        prompt_version: "test-prompt",
        model_version: "test-model",
      },
    ],
  });
  ok("requires supporting events", false);
} catch (e) {
  ok("requires supporting events", e instanceof AnalysisValidationError);
}

console.log("\nAgent safety");
ok(
  "customer cannot leak unreleased AUTH_001",
  validateAgentOutput("customer", "will not support their authentication", []) === false,
);

console.log("\nIn-memory golden path");
let run = createGoldenPathRun("Skeleton");
run = acceptInvite(run);
run = submitPreliminaryRecommendation(run, "Use the oauth-proxy endpoint.");
run = completeSimulation(run, "Switch to a server-to-server API key path that is compatible.");
ok("events are ordered", run.events.every((e, i) => e.sequence === i + 1));
ok("AUTH_001 released after preliminary", run.events.some((e) => e.eventType === "FACT_RELEASED"));
const snapshot = buildWorkerSnapshot(run);
ok("snapshot has two artifact revisions", snapshot.artifacts.length === 2);
const fact = run.events.find((e) => e.eventType === "FACT_RELEASED");
const revision = run.events.find((e) => e.eventType === "ARTIFACT_REVISION");
const provisionalClaim = {
  competency: "ADAPTATION" as const,
  direction: "STRENGTH" as const,
  confidence: "HIGH" as const,
  statement: "Candidate changed the invalidated endpoint after AUTH_001.",
  supportingEventIds: [fact!.id, revision!.id],
  counterEventIds: [],
  sourceArtifactIds: run.artifacts.map((a) => a.id),
  modelVersion: "test",
  rubricVersion: run.rubricVersion,
  promptVersion: run.promptVersion,
};

run = acceptWorkerResult(run, {
  resultVersion: "1",
  runId: run.id,
  analysisPass: "A",
  claim: provisionalClaim,
  defenseQuestions: ["What would you validate before committing to the revised path?"],
});
ok("pass A yields a provisional claim, not a reviewable one", run.status === "DEFENSE_REQUIRED" && run.claim === null);
ok("pass A generates defense questions", run.defenseQuestions.length === 1);

run = submitDefense(
  run,
  Object.fromEntries(run.defenseQuestions.map((q) => [q.id, "Validate in a sandbox mirroring production scopes."])),
);
ok("defense responses are recorded as candidate events", run.events.some((e) => e.eventType === "DEFENSE_RESPONSE_SUBMITTED"));

run = acceptWorkerResult(run, {
  resultVersion: "1",
  runId: run.id,
  analysisPass: "B",
  claim: provisionalClaim,
  defenseQuestions: [],
});
ok("pass B claim is reviewable", run.status === "REVIEW_REQUIRED" && Boolean(run.claim));

run = approveClaim(run, "Provenance checked.");
ok("brief published after human approval", run.status === "PUBLISHED" && Boolean(run.brief));
ok("events stay ordered through both passes", run.events.every((e, i) => e.sequence === i + 1));

console.log("\nPython fixtures A–D");
const engine = resolve(__dirname, "../services/evidence-engine");
function pyAnalyze(job: string, snapshotObj: unknown) {
  const input = JSON.stringify({ job_type: job, snapshot: snapshotObj });
  const result = spawnSync("py", ["-3", "-m", "evidence_engine"], {
    cwd: engine,
    env: { ...process.env, PYTHONPATH: engine },
    input,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const fallback = spawnSync("python", ["-m", "evidence_engine"], {
      cwd: engine,
      env: { ...process.env, PYTHONPATH: engine },
      input,
      encoding: "utf8",
    });
    if (fallback.status !== 0) throw new Error(fallback.stderr || result.stderr || "python failed");
    return JSON.parse(fallback.stdout) as { brief?: { recommendation: string }; claims?: Array<{ competency: string; direction: string }> };
  }
  return JSON.parse(result.stdout) as { brief?: { recommendation: string }; claims?: Array<{ competency: string; direction: string }> };
}

try {
  const cBrief = pyAnalyze("GENERATE_DECISION_BRIEF", fixtureC());
  ok("fixture C is not Strong Interview", cBrief.brief?.recommendation !== "STRONG_INTERVIEW");
  const cClaims = pyAnalyze("EXTRACT_EVIDENCE_FINAL", fixtureC());
  const adaptC = cClaims.claims?.find((c) => c.competency === "adaptability");
  ok("fixture C adaptability is a concern", adaptC?.direction === "CONCERN");
  const dBrief = pyAnalyze("GENERATE_DECISION_BRIEF", fixtureD());
  ok("fixture D is Strong Interview", dBrief.brief?.recommendation === "STRONG_INTERVIEW");
  const aClaims = pyAnalyze("EXTRACT_EVIDENCE_INITIAL", fixtureA());
  ok("fixture A has claims", (aClaims.claims?.length ?? 0) > 0);
  const bClaims = pyAnalyze("EXTRACT_EVIDENCE_FINAL", fixtureB());
  const adaptB = bClaims.claims?.find((c) => c.competency === "adaptability");
  ok("fixture B overreacts", adaptB?.direction === "CONCERN");
} catch (err) {
  ok("python fixtures runnable", false, err instanceof Error ? err.message : String(err));
}

console.log("\nMigration contract");
const sql = readFileSync(resolve(__dirname, "../supabase/migrations/025_proof_graph.sql"), "utf8");
// Strip line comments first: the header comment mentions sim_session_events to
// promise it is untouched, and a naive substring check trips on that promise.
const executableSql = sql
  .split("\n")
  .map((line) => line.replace(/--.*/, ""))
  .join("\n");

ok("sequence trigger exists", executableSql.includes("proof_events_assign_sequence"));
ok("jobs have no client policy", executableSql.includes("proof_analysis_jobs_no_client"));
ok("briefs require published", executableSql.includes("published = true"));
ok("AUTH_001 seeded", executableSql.includes("AUTH_001"));
ok("does not touch sim_session_events", !executableSql.includes("sim_session_events"));
ok(
  "only creates proof_-prefixed tables",
  (executableSql.match(/create table if not exists public\.(\w+)/g) ?? []).every((m) =>
    m.includes("public.proof_"),
  ),
);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nproof graph contracts passed");
