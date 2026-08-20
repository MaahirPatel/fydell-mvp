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
    content: `Primary driver: Growth plan mix shift, Growth share of paid base rose and accounts for ~61% of Q3 churned subscriptions.

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

export type NorthlineArchetype =
  | "TECHNICALLY_STRONG_POOR_COMMUNICATION"
  | "OVERREACTS_TO_CHANGE"
  | "IGNORES_CHANGE"
  | "EXCELLENT";

function buildNorthlineFixture(
  scenario: SimulationScenarioDefinition,
  archetype: NorthlineArchetype
): SimulationAttempt {
  let attempt = createAttempt(scenario, `northline-${archetype.toLowerCase()}`);
  const startedAt = 1_787_170_000_000;
  attempt = {
    ...attempt,
    status: "SUBMITTED",
    metadata: { ...attempt.metadata, startedAt, submittedAt: startedAt + 420_000 },
  };

  const record = (type: string, payload: Record<string, unknown>, elapsedMs: number) => {
    attempt = {
      ...attempt,
      telemetry: [
        ...attempt.telemetry,
        {
          id: `evt-${String(attempt.telemetry.length + 1).padStart(3, "0")}`,
          type,
          timestamp: startedAt + elapsedMs,
          elapsedMs,
          payload,
        } as SimulationAttempt["telemetry"][number],
      ],
    };
  };

  const flag = (name: string, value: string | number | boolean | null, elapsedMs: number) => {
    attempt = { ...attempt, world: setWorldFlag(attempt.world, name, value, elapsedMs) };
  };

  record("SIMULATION_STARTED", { scenarioId: scenario.metadata.id, seed: attempt.metadata.seed }, 0);
  record("RESOURCE_OPENED", { resourceId: "res_production" }, 20_000);
  record("RESOURCE_OPENED", { resourceId: "res_quality" }, 35_000);
  record("RESOURCE_OPENED", { resourceId: "res_dictionary" }, 50_000);
  flag("opened_quality_events", true, 35_000);
  flag("opened_metric_dictionary", true, 50_000);

  for (const query of [
    {
      elapsedMs: 80_000,
      sql: "SELECT period, AVG(yield_pct) FROM production_runs GROUP BY period",
      patternId: "yield_by_period",
      rowCount: 2,
      worldFlag: "ran_yield_query",
    },
    {
      elapsedMs: 110_000,
      sql: "SELECT period, SUM(units) FROM quality_events WHERE disposition='HOLD_RECLASS' GROUP BY period",
      patternId: "reclass_by_period",
      rowCount: 2,
      worldFlag: "ran_reclass_query",
    },
    {
      elapsedMs: 145_000,
      sql: "SELECT line, shift, SUM(scrap) FROM production_runs GROUP BY line, shift",
      patternId: "residual_scrap",
      rowCount: 4,
      worldFlag: "ran_residual_query",
    },
  ]) {
    record(
      "SQL_EXECUTE",
      {
        sql: query.sql,
        success: true,
        rowCount: query.rowCount,
        patternId: query.patternId,
        columns: [],
      },
      query.elapsedMs
    );
    flag(query.worldFlag, true, query.elapsedMs);
  }
  flag("identified_reporting_change", true, 110_000);
  flag("identified_residual_loss", true, 145_000);

  const firstMemo = upsertArtifact(attempt.artifacts, {
    kind: "analysis_memo",
    title: "Recommendation",
    content:
      "Working view: HOLD_RECLASS explains most of the headline movement. L2 Day retains a residual loss. Timing is still an assumption.",
    elapsedMs: 170_000,
  });
  attempt = { ...attempt, artifacts: firstMemo.artifacts };
  record(
    "ARTIFACT_CREATED",
    { artifactId: firstMemo.artifact.id, kind: "analysis_memo" },
    170_000
  );

  flag("changed_info_released", true, 180_000);
  attempt = {
    ...attempt,
    world: {
      ...attempt.world,
      scenarioEvents: [
        ...attempt.world.scenarioEvents,
        {
          id: "world-hold-reclass-day-9",
          kind: "PERSON_REPLIED",
          label: "Quality Lead corrected HOLD_RECLASS start date to day 9",
          createdAtMs: 180_000,
          payload: { factId: "HOLD_RECLASS_DAY_9" },
        },
      ],
    },
  };

  let finalMemo: string;
  if (archetype === "OVERREACTS_TO_CHANGE") {
    finalMemo =
      "The day-9 correction invalidates the entire analysis. Stop both lines immediately and discard all earlier findings. No conclusion is possible.";
  } else if (archetype === "EXCELLENT") {
    record(
      "MESSAGE_SENT",
      {
        personId: "person_marcus",
        conversationId: "northline-quality",
        intent: "ask_evidence",
        preview: "I have revised the period split. Can you confirm the release record and whether L2 Day has a known cause?",
      },
      205_000
    );
    finalMemo =
      "Recommendation: do not treat the 1.8-point reported drop as a plant-wide production decline. The 144 HOLD_RECLASS units introduced from day 9 explain the aggregate gap when restored for comparability. Preserve the L2 Day exception: residual scrap is 200 units versus 160 prior, while other shifts are flat or offsetting. Check L2 Day before the next shift, but do not claim a cause from these files. Limitation: prior periods were not restated, so the adjusted comparison is an estimate.";
  } else {
    finalMemo =
      "Adjusted result: HOLD_RECLASS from day 9 explains the aggregate yield gap; 144 held units restore comparability. L2 Day still has 40 more scrap units than prior. Validate the line before next shift. Prior periods were not restated.";
  }

  if (archetype !== "IGNORES_CHANGE") {
    const revised = upsertArtifact(attempt.artifacts, {
      kind: "analysis_memo",
      title: "Recommendation",
      content: finalMemo,
      elapsedMs: 240_000,
    });
    attempt = { ...attempt, artifacts: revised.artifacts };
    record(
      "ARTIFACT_UPDATED",
      { artifactId: revised.artifact.id, kind: "analysis_memo", length: finalMemo.length },
      240_000
    );
  }

  if (archetype === "TECHNICALLY_STRONG_POOR_COMMUNICATION") {
    attempt = {
      ...attempt,
      artifacts: Object.fromEntries(
        Object.entries(attempt.artifacts).map(([id, artifact]) => [
          id,
          {
            ...artifact,
            content:
              "ΔY decomposes to HOLD_RECLASS numerator exclusion (144 units from day 9); residual L2 Day Δscrap=+40. Recommend targeted process verification. Comparability caveat applies.",
          },
        ])
      ),
    };
  }

  record("SIMULATION_SUBMITTED", { artifactIds: Object.keys(attempt.artifacts) }, 300_000);
  return attempt;
}

export const buildNorthlineTechnicalStrongPoorCommunicationFixture = (
  scenario: SimulationScenarioDefinition
) => buildNorthlineFixture(scenario, "TECHNICALLY_STRONG_POOR_COMMUNICATION");

export const buildNorthlineOverreactsFixture = (scenario: SimulationScenarioDefinition) =>
  buildNorthlineFixture(scenario, "OVERREACTS_TO_CHANGE");

export const buildNorthlineIgnoresChangeFixture = (scenario: SimulationScenarioDefinition) =>
  buildNorthlineFixture(scenario, "IGNORES_CHANGE");

export const buildNorthlineExcellentFixture = (scenario: SimulationScenarioDefinition) =>
  buildNorthlineFixture(scenario, "EXCELLENT");
