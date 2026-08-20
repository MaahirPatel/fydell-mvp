/**
 * Destructive persistence round-trip for fydell-dev only.
 *
 * This script never loads .env.local and never accepts the normal app
 * NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY variables because those
 * may point at production. It runs only when both FYDELL_DEV_SUPABASE_URL and
 * FYDELL_DEV_SERVICE_ROLE_KEY are explicitly supplied.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { supabaseAdminStatus } from "../src/lib/supabase";
import { createAdminSupabaseClient } from "../src/lib/supabase/admin";
import { loadRun, saveRun } from "../src/lib/sim-engine/golden-path/persistence";
import {
  acceptInvite,
  acceptWorkerResult,
  approveClaim,
  completeSimulation,
  createGoldenPathRun,
  submitDefense,
  submitPreliminaryRecommendation,
} from "../src/lib/sim-engine/golden-path/workflow";
import type { EvidenceWorkerResult, GoldenPathRun } from "../src/lib/sim-engine/golden-path/contracts";

const PROJECT_REF = "btbmvrvynnrhapjdkunz";
const devUrl = process.env.FYDELL_DEV_SUPABASE_URL;
const devServiceRoleKey = process.env.FYDELL_DEV_SERVICE_ROLE_KEY;

if (!devUrl && !devServiceRoleKey) {
  const message =
    "SKIP golden-path persistence: FYDELL_DEV_SUPABASE_URL and FYDELL_DEV_SERVICE_ROLE_KEY are not configured.";
  if (process.env.REQUIRE_PROOF_DATABASE_TESTS === "true") throw new Error(message);
  console.log(message);
  process.exit(0);
}
if (!devUrl || !devServiceRoleKey) {
  throw new Error(
    "Refusing persistence test: set both FYDELL_DEV_SUPABASE_URL and FYDELL_DEV_SERVICE_ROLE_KEY."
  );
}

let devHost: string;
try {
  devHost = new URL(devUrl).hostname;
} catch {
  throw new Error("Refusing persistence test: FYDELL_DEV_SUPABASE_URL is not a valid URL.");
}
if (devHost !== `${PROJECT_REF}.supabase.co`) {
  throw new Error(
    `Refusing to run destructive tests against non-dev project; FYDELL_DEV_SUPABASE_URL must target ${PROJECT_REF}.`
  );
}

// The adapter uses the app's guarded admin factory. Populate its recognized
// names only after validating the dedicated variables, and remove every normal
// fallback so inherited app configuration cannot select a different project.
process.env.NEXT_PUBLIC_SUPABASE_URL = devUrl;
process.env.SUPABASE_SERVICE_ROLE_KEY = devServiceRoleKey;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const status = supabaseAdminStatus();
if (status.status !== "ready") {
  const message =
    "SKIP golden-path persistence: dev service-role credentials are not configured.";
  if (process.env.REQUIRE_PROOF_DATABASE_TESTS === "true") {
    throw new Error(`${message} ${status.detail}`);
  }
  console.log(message);
  process.exit(0);
}

function workerResult(run: GoldenPathRun, pass: "A" | "B"): EvidenceWorkerResult {
  const fact = run.events.find((event) => event.eventType === "FACT_RELEASED");
  const revision = run.events.find((event) => event.eventType === "ARTIFACT_REVISION");
  assert.ok(fact && revision);
  return {
    resultVersion: "1",
    runId: run.id,
    analysisPass: pass,
    claim: {
      competency: "ADAPTATION",
      direction: "STRENGTH",
      confidence: pass === "A" ? "MODERATE" : "HIGH",
      statement: `Pass ${pass} found evidence that the candidate adapted to AUTH_001.`,
      supportingEventIds: [
        fact.id,
        revision.id,
        ...(pass === "B"
          ? run.events
              .filter((event) => event.eventType === "DEFENSE_RESPONSE_SUBMITTED")
              .map((event) => event.id)
          : []),
      ],
      counterEventIds: [
        run.events.find(
          (event) => event.eventType === "PRELIMINARY_RECOMMENDATION_SUBMITTED"
        )!.id,
      ],
      sourceArtifactIds: run.artifacts.map((artifact) => artifact.id),
      modelVersion: "persistence-test-model-1",
      rubricVersion: run.rubricVersion,
      promptVersion: run.promptVersion,
    },
    defenseQuestions:
      pass === "A"
        ? ["What production evidence would make you change the revised recommendation?"]
        : [],
  };
}

function buildPublishedRun(): GoldenPathRun {
  let run = createGoldenPathRun("Persistence test candidate");
  run = acceptInvite(run);
  run = submitPreliminaryRecommendation(run, "Use the OAuth proxy endpoint.");
  run = completeSimulation(
    run,
    "Use a scoped service account and validate the supported endpoint in a production-shaped sandbox."
  );
  run = acceptWorkerResult(run, workerResult(run, "A"));
  run = submitDefense(
    run,
    Object.fromEntries(
      run.defenseQuestions.map((question) => [
        question.id,
        "I would validate scopes, token rotation, and failure behavior in a production-shaped sandbox.",
      ])
    )
  );
  run = acceptWorkerResult(run, workerResult(run, "B"));
  return approveClaim(run, "All supporting and counterevidence links were checked.");
}

async function main(): Promise<void> {
  const admin = createAdminSupabaseClient();
  const run = buildPublishedRun();
  const organizationId = randomUUID();
  const invitationId = randomUUID();
  const token = `persistence-${randomUUID()}`;

  try {
  const { error: organizationError } = await admin.from("organizations").insert({
    id: organizationId,
    name: "Golden path persistence test",
    status: "active",
    pilot_stage: "setup",
  });
  if (organizationError) throw new Error(organizationError.message);

  const { error: invitationError } = await admin.from("proof_invitations").insert({
    id: invitationId,
    organization_id: organizationId,
    role_id: "00000000-0000-4000-a000-000000000001",
    simulation_version_id: "00000000-0000-4000-a000-000000000010",
    email: `${run.id}@example.invalid`,
    token,
  });
  if (invitationError) throw new Error(invitationError.message);

  const { error: runError } = await admin.from("proof_runs").insert({
    id: run.id,
    invitation_id: invitationId,
    organization_id: organizationId,
    simulation_version_id: "00000000-0000-4000-a000-000000000010",
    rubric_version: run.rubricVersion,
    prompt_version: run.promptVersion,
    stage: "DISCOVERY",
    status: "in_progress",
  });
  if (runError) throw new Error(runError.message);

  await saveRun(run);
  const loaded = await loadRun(run.id);
  assert.deepStrictEqual(loaded, run);
  console.log("  ok   loadRun(saveRun(run)) preserves meaningful state");

  assert.deepStrictEqual(
    loaded.events.map((event) => ({ id: event.id, sequence: event.sequence })),
    run.events.map((event) => ({ id: event.id, sequence: event.sequence }))
  );
  console.log("  ok   event identity and order survive exactly");

  const { data: persistedEvents, error: eventError } = await admin
    .from("proof_events")
    .select("sequence")
    .eq("run_id", run.id)
    .order("sequence");
  if (eventError) throw new Error(eventError.message);
  assert.deepStrictEqual(
    (persistedEvents ?? []).map((event) => event.sequence),
    run.events.map((event) => event.sequence)
  );
  console.log("  ok   database trigger assigned contiguous event sequences");
  console.log("Golden path persistence passed.");
  } finally {
    await admin.from("proof_runs").delete().eq("id", run.id);
    await admin.from("proof_invitations").delete().eq("id", invitationId);
    await admin.from("organizations").delete().eq("id", organizationId);
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
