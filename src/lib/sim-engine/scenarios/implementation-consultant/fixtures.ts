import type { SimulationAttempt, SimulationScenarioDefinition } from "../../types";
import { createAttempt } from "../../runtime/simulationRuntime";
import { setWorldFlag } from "../../runtime/worldState";
import { upsertArtifact } from "../../runtime/artifactManager";

export function buildIcStrongFixture(scenario: SimulationScenarioDefinition): SimulationAttempt {
  let attempt = createAttempt(scenario, "icstrong");
  const startedAt = Date.now() - 14 * 60 * 1000;
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
          id: `tel_ic_strong_${attempt.telemetry.length}`,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  t("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: "icstrong" }, 0);
  t("RESOURCE_OPENED", { resourceId: "res_brief" }, 10_000);
  t("RESOURCE_OPENED", { resourceId: "res_import_file" }, 30_000);
  t("RESOURCE_OPENED", { resourceId: "res_import_rules" }, 50_000);
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "opened_import_file", true, 30_000) };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "opened_import_rules", true, 50_000) };

  for (const m of scenario.implementationWorkbench?.fieldMappings ?? []) {
    t(
      "FIELD_MAPPING_SET",
      {
        mappingId: m.id,
        sourceField: m.sourceField,
        targetField: m.correctTarget,
        correct: true,
      },
      80_000
    );
  }
  attempt = {
    ...attempt,
    workbench: {
      ...attempt.workbench,
      fieldMappings: Object.fromEntries(
        (scenario.implementationWorkbench?.fieldMappings ?? []).map((m) => [m.id, m.correctTarget])
      ),
    },
    world: setWorldFlag(attempt.world, "correct_mapping_complete", true, 80_000),
  };

  const checklist = { ...attempt.workbench.checklist };
  for (const item of scenario.implementationWorkbench?.checklist ?? []) {
    checklist[item.id] = true;
    t(
      "CHECKLIST_TOGGLED",
      {
        itemId: item.id,
        completed: true,
        completedCount: Object.values(checklist).filter(Boolean).length,
        total: scenario.implementationWorkbench?.checklist.length ?? 0,
      },
      110_000
    );
  }
  attempt = {
    ...attempt,
    workbench: { ...attempt.workbench, checklist },
    world: setWorldFlag(attempt.world, "checklist_complete", true, 110_000),
  };

  t("MESSAGE_SENT", {
    personId: "person_priya",
    conversationId: "c_ic_1",
    intent: "ask_schema",
    preview: "Is E-104 a rehire? Which start date should we keep?",
  }, 130_000);

  const plan = upsertArtifact(attempt.artifacts, {
    kind: "cutover_plan",
    title: "Launch / cutover plan",
    content:
      "Import clean rows today (phase 1). Fix date formats, manager email for Tom, and keep E-104 rehire row before Monday. Run pre-import validation and verify unique employee counts so nothing is silently lost.",
    elapsedMs: 160_000,
  });
  attempt = { ...attempt, artifacts: plan.artifacts };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "phased_plan_chosen", true, 160_000) };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "verification_mentioned", true, 160_000) };
  t("ARTIFACT_CREATED", { artifactId: Object.keys(plan.artifacts)[0], kind: "cutover_plan" }, 160_000);

  const customer = upsertArtifact(attempt.artifacts, {
    kind: "customer_message",
    title: "Customer update to Priya",
    content:
      "We'll import the clean rows today, fix dates/manager/duplicate before Monday, and validate counts so nothing is silently lost. Partial launch is safe.",
    elapsedMs: 170_000,
  });
  attempt = { ...attempt, artifacts: customer.artifacts };
  t("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 180_000);

  attempt.aiInteractions = [
    {
      id: "ai_ic1",
      kind: "ai_tool",
      prompt: "How should I phase the import?",
      response: "Clean rows now, fix before Monday, validate counts…",
      modelLabel: "mock",
      editedAfterResponse: true,
      createdAtMs: 100_000,
    },
  ];

  return attempt;
}

export function buildIcWeakFixture(scenario: SimulationScenarioDefinition): SimulationAttempt {
  let attempt = createAttempt(scenario, "icweak01");
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
          id: `tel_ic_weak_${attempt.telemetry.length}`,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  t("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: "icweak01" }, 0);
  t("AI_PROMPT", { interactionId: "aiw", prompt: "just tell me what to do", modelLabel: "mock" }, 20_000);
  const customer = upsertArtifact(attempt.artifacts, {
    kind: "customer_message",
    title: "Customer update to Priya",
    content:
      "We'll import everything as-is and fix issues after launch. Should be fine for Monday.",
    elapsedMs: 50_000,
  });
  attempt = { ...attempt, artifacts: customer.artifacts };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "unsafe_import_plan", true, 50_000) };
  t("ARTIFACT_CREATED", { artifactId: Object.keys(customer.artifacts)[0], kind: "customer_message" }, 50_000);
  t("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 60_000);

  return attempt;
}
