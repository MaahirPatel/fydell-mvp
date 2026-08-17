import type { SimulationAttempt, SimulationScenarioDefinition } from "../../types";
import { createAttempt } from "../../runtime/simulationRuntime";
import { setWorldFlag } from "../../runtime/worldState";
import { upsertArtifact } from "../../runtime/artifactManager";

export function buildTseStrongFixture(scenario: SimulationScenarioDefinition): SimulationAttempt {
  let attempt = createAttempt(scenario, "tsestrong");
  const startedAt = Date.now() - 12 * 60 * 1000;
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
          id: `tel_tse_strong_${attempt.telemetry.length}`,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  t("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: "tsestrong" }, 0);
  t("RESOURCE_OPENED", { resourceId: "res_auth_log" }, 20_000);
  t("RESOURCE_OPENED", { resourceId: "res_release_notes" }, 40_000);
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "opened_auth_log", true, 20_000) };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "opened_release_notes", true, 40_000) };

  const triage: Record<string, "incident" | "unrelated" | "unknown"> = {};
  for (const ticket of scenario.supportWorkbench?.tickets ?? []) {
    const classification = ticket.belongsToIncident ? "incident" : "unrelated";
    triage[ticket.id] = classification;
    t(
      "TICKET_TRIAGED",
      { ticketId: ticket.id, classification, correct: true },
      70_000
    );
  }
  attempt = {
    ...attempt,
    workbench: { ...attempt.workbench, ticketTriage: triage },
    world: setWorldFlag(attempt.world, "correct_triage", true, 70_000),
  };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "excluded_unrelated_ticket", true, 70_000) };

  t("MESSAGE_SENT", {
    personId: "person_sam",
    conversationId: "c_tse_1",
    intent: "ask_deployment",
    preview: "Did R-2214 change SAML clock skew?",
  }, 90_000);

  const escalation = upsertArtifact(attempt.artifacts, {
    kind: "escalation_note",
    title: "Escalation to platform",
    content:
      "Root cause: R-2214 tightened SAML clock-skew from 300s to 30s. Auth logs show saml_validate skew errors after 09:41. Please revert the skew-tolerance config flag. Password path unaffected.",
    elapsedMs: 120_000,
  });
  attempt = { ...attempt, artifacts: escalation.artifacts };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "identified_release_cause", true, 120_000) };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "escalated_with_evidence", true, 120_000) };
  t("ARTIFACT_CREATED", { artifactId: Object.keys(escalation.artifacts)[0], kind: "escalation_note" }, 120_000);

  const customer = upsertArtifact(attempt.artifacts, {
    kind: "customer_message",
    title: "Customer status update",
    content:
      "We're seeing intermittent SSO failures after today's auth release (R-2214 SAML skew tightening). Password login may still work. We're reverting the skew tolerance; no mass password reset needed.",
    elapsedMs: 140_000,
  });
  attempt = { ...attempt, artifacts: customer.artifacts };
  t("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 150_000);

  attempt.aiInteractions = [
    {
      id: "ai_tse1",
      kind: "ai_tool",
      prompt: "How do I explain green status with SSO failures?",
      response: "Status uses password checks…",
      modelLabel: "mock",
      editedAfterResponse: true,
      createdAtMs: 80_000,
    },
  ];

  return attempt;
}

export function buildTseWeakFixture(scenario: SimulationScenarioDefinition): SimulationAttempt {
  let attempt = createAttempt(scenario, "tseweak01");
  const startedAt = Date.now() - 5 * 60 * 1000;
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
          id: `tel_tse_weak_${attempt.telemetry.length}`,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  t("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: "tseweak01" }, 0);
  t("AI_PROMPT", { interactionId: "aiw", prompt: "write a customer update", modelLabel: "mock" }, 15_000);
  t(
    "TICKET_TRIAGED",
    { ticketId: "T-883", classification: "incident", correct: false },
    30_000
  );

  const customer = upsertArtifact(attempt.artifacts, {
    kind: "customer_message",
    title: "Customer status update",
    content:
      "Please reset all their passwords. The password database is failing intermittently and the status page is broken.",
    elapsedMs: 50_000,
  });
  attempt = { ...attempt, artifacts: customer.artifacts };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "misdiagnosed_incident", true, 50_000) };
  t("ARTIFACT_CREATED", { artifactId: Object.keys(customer.artifacts)[0], kind: "customer_message" }, 50_000);
  t("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 60_000);

  return attempt;
}
