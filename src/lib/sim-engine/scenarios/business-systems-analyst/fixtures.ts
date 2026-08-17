import type { SimulationAttempt, SimulationScenarioDefinition } from "../../types";
import { createAttempt } from "../../runtime/simulationRuntime";
import { setWorldFlag } from "../../runtime/worldState";
import { upsertArtifact } from "../../runtime/artifactManager";

export function buildBsaStrongFixture(scenario: SimulationScenarioDefinition): SimulationAttempt {
  let attempt = createAttempt(scenario, "bsastrong");
  const startedAt = Date.now() - 11 * 60 * 1000;
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
          id: `tel_bsa_strong_${attempt.telemetry.length}`,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  t("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: "bsastrong" }, 0);
  t("RESOURCE_OPENED", { resourceId: "res_rules" }, 20_000);
  t("RESOURCE_OPENED", { resourceId: "res_purchases" }, 40_000);
  t("RESOURCE_OPENED", { resourceId: "res_systems_note" }, 55_000);
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "opened_rules", true, 20_000) };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "opened_purchases", true, 40_000) };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "opened_systems_note", true, 55_000) };

  t("RULE_SELECTED", { ruleId: "R0", isRootCause: true }, 70_000);
  attempt = {
    ...attempt,
    workbench: { ...attempt.workbench, selectedRuleId: "R0" },
    world: setWorldFlag(attempt.world, "identified_rule_interaction", true, 70_000),
  };

  t("IMPACT_SELECTED", { count: 4, correct: true }, 90_000);
  attempt = {
    ...attempt,
    workbench: { ...attempt.workbench, selectedImpactCount: 4 },
    world: setWorldFlag(attempt.world, "quantified_impact", true, 90_000),
  };

  t("FIX_SELECTED", {
    fixId: "fix_backfill_define",
    compliant: true,
    recommended: true,
  }, 110_000);
  attempt = {
    ...attempt,
    workbench: { ...attempt.workbench, selectedFixId: "fix_backfill_define" },
    world: setWorldFlag(attempt.world, "correct_fix_chosen", true, 110_000),
  };

  t("MESSAGE_SENT", {
    personId: "person_farah",
    conversationId: "c_bsa_1",
    intent: "ask_schema",
    preview: "What did the new-vendor policy intend for migrated vendors?",
  }, 120_000);

  const memo = upsertArtifact(attempt.artifacts, {
    kind: "analysis_memo",
    title: "Stakeholder summary",
    content:
      "The system is working as configured: R0 fires first and migrated vendors still have pending_verification, so routine re-orders hit executives (4 of 6 sample POs). Policy meant genuinely new vendors. Recommend backfill approved status for migrated vendors and define new vendor precisely, preserving audit review.",
    elapsedMs: 140_000,
  });
  attempt = { ...attempt, artifacts: memo.artifacts };
  attempt = { ...attempt, world: setWorldFlag(attempt.world, "separated_system_vs_policy", true, 140_000) };
  t("ARTIFACT_CREATED", { artifactId: Object.keys(memo.artifacts)[0], kind: "analysis_memo" }, 140_000);
  t("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 150_000);

  attempt.aiInteractions = [
    {
      id: "ai_bsa1",
      kind: "ai_tool",
      prompt: "Why are executives seeing $80 POs?",
      response: "Check R0 vs migration status…",
      modelLabel: "mock",
      editedAfterResponse: true,
      createdAtMs: 60_000,
    },
  ];

  return attempt;
}

export function buildBsaWeakFixture(scenario: SimulationScenarioDefinition): SimulationAttempt {
  let attempt = createAttempt(scenario, "bsaweak01");
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
          id: `tel_bsa_weak_${attempt.telemetry.length}`,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  t("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: "bsaweak01" }, 0);
  t("AI_PROMPT", { interactionId: "aiw", prompt: "just fix the system", modelLabel: "mock" }, 15_000);
  t("FIX_SELECTED", { fixId: "fix_delete_r0", compliant: false, recommended: false }, 30_000);
  attempt = {
    ...attempt,
    workbench: { ...attempt.workbench, selectedFixId: "fix_delete_r0" },
    world: setWorldFlag(attempt.world, "unsafe_fix_chosen", true, 30_000),
  };

  const memo = upsertArtifact(attempt.artifacts, {
    kind: "analysis_memo",
    title: "Stakeholder summary",
    content: "The system is broken. Delete R0 and auto-approve everything under $5,000.",
    elapsedMs: 50_000,
  });
  attempt = { ...attempt, artifacts: memo.artifacts };
  t("ARTIFACT_CREATED", { artifactId: Object.keys(memo.artifacts)[0], kind: "analysis_memo" }, 50_000);
  t("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 60_000);

  return attempt;
}
