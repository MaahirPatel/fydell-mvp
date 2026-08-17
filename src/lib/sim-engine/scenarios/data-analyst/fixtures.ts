import type { SimulationAttempt, SimulationScenarioDefinition } from "../../types";
import { createAttempt } from "../../runtime/simulationRuntime";
import { setWorldFlag } from "../../runtime/worldState";
import { upsertArtifact } from "../../runtime/artifactManager";

/**
 * Strong DA/BI attempt: schema → plan-mix SQL → rules out tickets → memo with mix driver.
 */
export function buildDaStrongFixture(scenario: SimulationScenarioDefinition): SimulationAttempt {
  let attempt = createAttempt(scenario, "dastrong");
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
          id: `tel_da_strong_${attempt.telemetry.length}`,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  t("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: "dastrong" }, 0);
  t("RESOURCE_OPENED", { resourceId: "res_churn_brief" }, 15_000);
  t("RESOURCE_OPENED", { resourceId: "res_schema" }, 40_000);
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "opened_schema", true, 40_000),
  };

  t(
    "SQL_EXECUTE",
    {
      sql: "SELECT plan, COUNT(*) FROM subscriptions WHERE status='churned' GROUP BY plan",
      success: true,
      rowCount: 3,
      patternId: "churn_by_plan",
      columns: ["plan", "churned_accounts", "share_of_churn"],
    },
    90_000
  );
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "sql_executed", true, 90_000),
  };
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "ran_plan_mix_query", true, 90_000),
  };
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "found_churn_driver", true, 90_000),
  };

  t(
    "SQL_EXECUTE",
    {
      sql: "SELECT category, COUNT(*) FROM support_tickets GROUP BY category",
      success: true,
      rowCount: 3,
      patternId: "tickets_only",
      columns: ["category", "tickets_q3"],
    },
    120_000
  );
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "ran_ticket_query", true, 120_000),
  };
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "ruled_out_tickets", true, 130_000),
  };

  t("MESSAGE_SENT", {
    personId: "person_amina",
    conversationId: "c_da_1",
    intent: "ask_evidence",
    preview: "Confirming Finance paid-churn definition before I finalize the memo.",
  }, 150_000);

  t("AI_PROMPT", { interactionId: "ai_da1", prompt: "How should I structure a churn memo?", modelLabel: "mock" }, 160_000);

  const memo = upsertArtifact(attempt.artifacts, {
    kind: "analysis_memo",
    title: "Analysis memo",
    content: `Primary driver: Growth plan mix shift — Growth share of paid base rose and accounts for ~61% of Q3 churned subscriptions.

Evidence: churn-by-plan query and base mix shift; billing failures are elevated on Growth but secondary.

Ruled out: support ticket volume (mostly password_reset / SSO), not cancel intent.

Caveats: residual involuntary churn from failed invoices should be monitored; next check is churned-with-prior-failure by plan.`,
    elapsedMs: 180_000,
  });
  attempt = { ...attempt, artifacts: memo.artifacts };
  t("ARTIFACT_CREATED", { artifactId: Object.keys(memo.artifacts)[0], kind: "analysis_memo" }, 180_000);
  t("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 200_000);

  attempt.aiInteractions = [
    {
      id: "ai_da1",
      kind: "ai_tool",
      prompt: "How should I structure a churn memo?",
      response: "Structure: definition, primary driver, ruled out, caveats…",
      modelLabel: "mock",
      editedAfterResponse: true,
      createdAtMs: 160_000,
    },
  ];

  return attempt;
}

/**
 * Weak DA/BI attempt: ticket-only SQL, claims tickets as primary, little discovery.
 */
export function buildDaWeakFixture(scenario: SimulationScenarioDefinition): SimulationAttempt {
  let attempt = createAttempt(scenario, "daweak01");
  const startedAt = Date.now() - 6 * 60 * 1000;
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
          id: `tel_da_weak_${attempt.telemetry.length}`,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  t("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: "daweak01" }, 0);
  t("AI_PROMPT", { interactionId: "aiw1", prompt: "just tell me why churn is up", modelLabel: "mock" }, 20_000);
  t("AI_PROMPT", { interactionId: "aiw2", prompt: "write the memo for me", modelLabel: "mock" }, 30_000);
  t(
    "SQL_EXECUTE",
    {
      sql: "SELECT * FROM support_tickets",
      success: true,
      rowCount: 3,
      patternId: "tickets_only",
      columns: ["category", "tickets_q3"],
    },
    50_000
  );
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "sql_executed", true, 50_000),
  };
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "ran_ticket_query", true, 50_000),
  };

  const memo = upsertArtifact(attempt.artifacts, {
    kind: "analysis_memo",
    title: "Analysis memo",
    content:
      "Primary driver is support tickets. Ticket volume is through the roof so churn is driven by support quality. No need to look at plan mix.",
    elapsedMs: 80_000,
  });
  attempt = { ...attempt, artifacts: memo.artifacts };
  attempt = {
    ...attempt,
    world: setWorldFlag(attempt.world, "wrong_driver_claimed", true, 80_000),
  };
  t("ARTIFACT_CREATED", { artifactId: Object.keys(memo.artifacts)[0], kind: "analysis_memo" }, 80_000);
  t("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 90_000);

  attempt.aiInteractions = [
    {
      id: "aiw1",
      kind: "ai_tool",
      prompt: "just tell me why churn is up",
      response: "…",
      modelLabel: "mock",
      createdAtMs: 20_000,
    },
  ];

  return attempt;
}
