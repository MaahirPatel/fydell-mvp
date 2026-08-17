import type { SimulationAttempt, SimulationScenarioDefinition } from "../../types";
import { createAttempt } from "../../runtime/simulationRuntime";
import { setWorldFlag } from "../../runtime/worldState";
import { upsertArtifact } from "../../runtime/artifactManager";

/**
 * Strong attempt: investigates, discovers deploy, fixes UUID, communicates cleanly.
 */
export function buildStrongFixture(scenario: SimulationScenarioDefinition): SimulationAttempt {
  let attempt = createAttempt(scenario, "strong01");
  const startedAt = Date.now() - 10 * 60 * 1000;
  attempt = {
    ...attempt,
    status: "SUBMITTED",
    metadata: {
      ...attempt.metadata,
      startedAt,
      submittedAt: Date.now(),
    },
  };

  const t = (type: string, payload: Record<string, unknown>, elapsedMs: number) => {
    const id = `tel_strong_${attempt.telemetry.length}`;
    attempt = {
      ...attempt,
      telemetry: [
        ...attempt.telemetry,
        {
          id,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  t("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: "strong01" }, 0);
  t("RESOURCE_OPENED", { resourceId: "res_customer_brief" }, 20_000);
  t("RESOURCE_OPENED", { resourceId: "res_api_docs" }, 40_000);
  t("API_EXECUTE", {
    method: "POST",
    path: "/v1/accounts",
    status: 422,
    success: false,
    requestBody: '{"customer_id":18402}',
    responseBody: '{"error":"INVALID_FIELD","field":"customer_id"}',
    requestId: "req_strong_1",
  }, 90_000);
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "candidate_has_seen_422", true, 90_000),
  };
  t("MESSAGE_SENT", {
    personId: "person_devon",
    conversationId: "conv_1",
    intent: "ask_deployment",
    preview: "Did anything deploy related to schema validation?",
  }, 120_000);
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "candidate_knows_about_deployment", true, 125_000),
  };
  t("RESOURCE_OPENED", { resourceId: "res_schema" }, 140_000);
  t("API_EXECUTE", {
    method: "POST",
    path: "/v1/accounts",
    status: 201,
    success: true,
    requestBody: '{"customer_id":"550e8400-e29b-41d4-a716-446655440000","owner_email":"alex@northstar.health","account_name":"Northstar Health"}',
    responseBody: '{"status":"created"}',
    requestId: "req_strong_2",
  }, 180_000);
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "api_succeeded", true, 180_000),
  };
  t("AI_PROMPT", { interactionId: "ai1", prompt: "How should I phrase a customer update after a 422?", modelLabel: "mock" }, 200_000);
  t("AI_RESPONSE", { interactionId: "ai1", responsePreview: "Keep it factual", editedAfterResponse: true }, 201_000);

  const customer = upsertArtifact(attempt.artifacts, {
    kind: "customer_message",
    title: "Customer update",
    content:
      "Priya — we confirmed the failures are schema validation on customer_id (UUID required after yesterday's validation deploy). Auth is healthy. We've corrected the payload and verified a 201. Residual risk: other jobs still sending numeric IDs should be updated before overnight sync.",
    elapsedMs: 220_000,
  });
  const reco = upsertArtifact(customer.artifacts, {
    kind: "technical_recommendation",
    title: "Technical recommendation",
    content:
      "Root cause: accounts-validation deploy removed integer coercion for customer_id. Fix: send UUID strings. Ruled out auth (Postman + eng). Ownership mismatch is a different error code.",
    elapsedMs: 230_000,
  });
  attempt = { ...attempt, artifacts: reco.artifacts };
  t("ARTIFACT_CREATED", { artifactId: customer.artifact.id, kind: "customer_message" }, 220_000);
  t("ARTIFACT_CREATED", { artifactId: reco.artifact.id, kind: "technical_recommendation" }, 230_000);
  t("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 240_000);

  attempt.aiInteractions = [
    {
      id: "ai1",
      kind: "ai_tool",
      prompt: "How should I phrase a customer update after a 422?",
      response: "Keep it factual…",
      modelLabel: "mock",
      editedAfterResponse: true,
      createdAtMs: 200_000,
    },
  ];

  return attempt;
}

/**
 * Weak attempt: flails, promises overnight fix, never corrects payload.
 */
export function buildWeakFixture(scenario: SimulationScenarioDefinition): SimulationAttempt {
  let attempt = createAttempt(scenario, "weak0001");
  const startedAt = Date.now() - 8 * 60 * 1000;
  attempt = {
    ...attempt,
    status: "SUBMITTED",
    metadata: { ...attempt.metadata, startedAt, submittedAt: Date.now() },
  };

  const t = (type: string, payload: Record<string, unknown>, elapsedMs: number) => {
    attempt = {
      ...attempt,
      telemetry: [
        ...attempt.telemetry,
        {
          id: `tel_weak_${attempt.telemetry.length}`,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  t("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: "weak0001" }, 0);
  t("API_EXECUTE", {
    method: "POST",
    path: "/v1/accounts",
    status: 422,
    success: false,
    requestId: "req_weak_1",
  }, 30_000);
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "candidate_has_seen_422", true, 30_000),
  };
  t("AI_PROMPT", { interactionId: "aiw", prompt: "fix this for me", modelLabel: "mock" }, 40_000);
  t("AI_PROMPT", { interactionId: "aiw2", prompt: "just give me the answer", modelLabel: "mock" }, 50_000);
  t("AI_PROMPT", { interactionId: "aiw3", prompt: "write the email promising overnight fix", modelLabel: "mock" }, 60_000);
  t("MESSAGE_SENT", {
    personId: "person_priya",
    conversationId: "c1",
    intent: "unsupported_promise",
    preview: "We guarantee this will be fixed tonight with no risk.",
  }, 70_000);
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "candidate_made_unsupported_promise", true, 70_000),
  };
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "scope_concern_raised", true, 75_000),
  };
  t("API_EXECUTE", {
    method: "POST",
    path: "/v1/accounts",
    status: 422,
    success: false,
    requestId: "req_weak_2",
  }, 90_000);

  const customer = upsertArtifact(attempt.artifacts, {
    kind: "customer_message",
    title: "Customer update",
    content: "We guarantee a full production fix tonight with no risk to the board demo.",
    elapsedMs: 100_000,
  });
  attempt = { ...attempt, artifacts: customer.artifacts };
  t("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 110_000);

  attempt.aiInteractions = [
    {
      id: "aiw",
      kind: "ai_tool",
      prompt: "fix this for me",
      response: "…",
      modelLabel: "mock",
      createdAtMs: 40_000,
    },
  ];

  return attempt;
}
