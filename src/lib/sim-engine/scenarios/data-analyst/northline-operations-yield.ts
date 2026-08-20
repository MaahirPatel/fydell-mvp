import type { SimulationScenarioDefinition } from "../../types";
import { northlinePeople } from "./northline-personas";

type DataRow = Record<string, string | number | boolean | null>;

function buildProductionRuns(): DataRow[] {
  const rows: DataRow[] = [];
  const shifts = [
    { line: "L1", shift: "Day", priorGood: 94, currentGood: 94, hold: 3 },
    { line: "L1", shift: "Night", priorGood: 95, currentGood: 95, hold: 3 },
    { line: "L2", shift: "Day", priorGood: 92, currentGood: 90, hold: 4 },
    { line: "L2", shift: "Night", priorGood: 92, currentGood: 94, hold: 2 },
  ] as const;

  for (const period of ["prior", "current"] as const) {
    for (let day = 1; day <= 20; day += 1) {
      for (const config of shifts) {
        const holdReclass = period === "current" && day >= 9 ? config.hold : 0;
        const comparableGood = period === "prior" ? config.priorGood : config.currentGood;
        rows.push({
          run_id: `${period === "prior" ? "P" : "C"}-${String(day).padStart(2, "0")}-${config.line}-${config.shift === "Day" ? "D" : "N"}`,
          period,
          day,
          line: config.line,
          shift: config.shift,
          planned: 100,
          completed_good: comparableGood - holdReclass,
          scrap: 100 - comparableGood,
          hold_reclass: holdReclass,
          yield_pct: comparableGood - holdReclass,
        });
      }
    }
  }
  return rows;
}

function buildQualityEvents(): DataRow[] {
  const rows: DataRow[] = [];
  let eventNumber = 301;
  for (let day = 1; day <= 20; day += 1) {
    rows.push({
      event_id: `Q-${eventNumber++}`,
      period: "current",
      day,
      line: "L2",
      shift: "Day",
      disposition: "SCRAP",
      units: 10,
    });
    if (day >= 9) {
      for (const entry of [
        { line: "L1", shift: "Day", units: 3 },
        { line: "L1", shift: "Night", units: 3 },
        { line: "L2", shift: "Day", units: 4 },
        { line: "L2", shift: "Night", units: 2 },
      ] as const) {
        rows.push({
          event_id: `Q-${eventNumber++}`,
          period: "current",
          day,
          line: entry.line,
          shift: entry.shift,
          disposition: "HOLD_RECLASS",
          units: entry.units,
        });
      }
    }
  }
  return rows;
}

const productionRuns = buildProductionRuns();
const qualityEvents = buildQualityEvents();

/**
 * Northline Components, operations yield investigation (Data Analyst).
 *
 * SYNTHETIC. Northline Components is a fictional manufacturer. This is the
 * released Data Analyst evaluation the pilot actually ships, so the same
 * scenario can appear in the product and in marketing without drift.
 *
 * The question: reported yield fell from 93.2 percent. Is production actually
 * worse, or did reporting change? Ground truth, most of the drop is a
 * mid-period reporting change (HOLD_RECLASS, live day 9), but line L2 Day still
 * carries a genuine residual loss that should be checked before the next shift.
 *
 * Multiple valid paths: inspect quality events first, or run yield-by-period
 * SQL first, or read the metric dictionary and reason about comparability.
 */
export const northlineOperationsYieldScenario: SimulationScenarioDefinition = {
  metadata: {
    id: "northline-operations-yield",
    slug: "northline-operations-yield",
    title: "Northline yield, real drop or reporting change?",
    description:
      "Reported plant yield fell from 93.2 percent. Determine whether production genuinely got worse or whether a mid-period reporting change moved the number, and write a defensible recommendation for the Operations Manager.",
    roleKey: "data_analyst",
    estimatedDurationMinutes: 25,
    timeLimitSeconds: 25 * 60,
    difficulty: "intermediate",
    companyName: "Northline Components",
    instructions: `You are the Data Analyst supporting Plant Operations.

Situation:
- Reported yield fell from 93.2 percent this period.
- Ops wants to know whether production is actually worse or whether reporting changed.
- A new disposition code, HOLD_RECLASS, appeared this period.

Your job:
1. Inspect production_runs and quality_events, and read how yield is defined.
2. Quantify how much of the reported drop is the reporting change versus a real loss.
3. React to changed information about when the code went live.
4. Identify any line and shift that still carries a genuine loss.
5. Save a working recommendation, respond to the corrected code timing, then revise and submit it to the Operations Manager.

Do not claim a cause you cannot support from the data and the people.`,
  },

  versions: {
    scenarioId: "northline-operations-yield",
    scenarioVersion: "2.0.0",
    engineVersion: "0.1.0",
    competencyModelVersion: "da-northline-2.0.0",
    evidenceDerivationVersion: "2.0.0",
    analysisVersion: "2.0.0",
  },

  capabilities: [
    "tasks",
    "resources",
    "internal_chat",
    "ai_assistant",
    "sql_execution",
    "artifact_composer",
    "timed_events",
    "documentation",
  ],

  constraints: {
    aiPolicy: "ALLOWED",
    externalResourcesPolicy: "CLOSED",
    clipboardPolicy: "TRACKED",
  },

  competencies: [
    {
      id: "source_comprehension",
      label: "Source comprehension and data quality",
      description: "Reads the files and the metric definition accurately.",
      weight: 1.1,
    },
    {
      id: "analytical_correctness",
      label: "Analytical correctness",
      description: "Separates the reporting change from a real production loss.",
      weight: 1.3,
    },
    {
      id: "metric_definition",
      label: "Metric definition and assumptions",
      description: "Holds the yield definition and comparability carefully.",
      weight: 1.1,
    },
    {
      id: "evidence_traceability",
      label: "Evidence traceability",
      description: "Connects each claim to a specific source.",
      weight: 1.1,
    },
    {
      id: "changed_information_response",
      label: "Response to changed information",
      description: "Revises appropriately when the code timing changes.",
      weight: 1,
    },
    {
      id: "business_judgment",
      label: "Business judgment and recommendation",
      description: "Gives Ops an honest, actionable answer with caveats.",
      weight: 1,
    },
  ],

  tasks: [
    {
      id: "task_brief",
      title: "Understand the question",
      description: "Read the brief and confirm what Ops is actually asking.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["source_comprehension"],
      completion: { kind: "TELEMETRY", eventType: "RESOURCE_OPENED", minCount: 1 },
    },
    {
      id: "task_inspect",
      title: "Inspect the sources",
      description: "Open the quality events and the metric dictionary.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["source_comprehension", "metric_definition"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "WORLD_FLAG", flag: "opened_quality_events", equals: true },
          { kind: "WORLD_FLAG", flag: "opened_metric_dictionary", equals: true },
        ],
      },
    },
    {
      id: "task_quantify",
      title: "Quantify the reporting change",
      description: "Establish how much of the drop is HOLD_RECLASS, not scrap.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["analytical_correctness", "evidence_traceability"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "WORLD_FLAG", flag: "ran_reclass_query", equals: true },
          { kind: "WORLD_FLAG", flag: "ran_yield_query", equals: true },
        ],
      },
    },
    {
      id: "task_residual",
      title: "Check for a real residual loss",
      description: "Back out reclassified volume and compare residual scrap by line and shift.",
      initialStatus: "AVAILABLE",
      priority: "normal",
      competencyIds: ["analytical_correctness", "business_judgment"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "WORLD_FLAG", flag: "ran_residual_query", equals: true },
          { kind: "ARTIFACT_EXISTS", artifactKind: "analysis_memo" },
        ],
      },
    },
    {
      id: "task_memo",
      title: "Draft, then revise the recommendation",
      description: "Save a working recommendation. When corrected timing arrives, revise what changed and preserve what still holds.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["business_judgment", "changed_information_response"],
      completion: { kind: "ARTIFACT_EXISTS", artifactKind: "analysis_memo" },
    },
  ],

  people: northlinePeople,

  resources: [
    {
      id: "res_brief",
      title: "Brief, reported yield drop",
      kind: "brief",
      initiallyVisible: true,
      summary: "Ops question, the new code, deadline",
      searchableText: "yield drop reporting HOLD_RECLASS production scrap",
      content: `# Brief, reported yield drop

**Ask:** Reported yield fell from 93.2 percent this period. Is production actually worse, or did reporting change?

## What changed
A new disposition code, \`HOLD_RECLASS\`, appears this period. Ops is not sure whether the drop is real scrap or a reporting artifact.

## Deliverable
A short recommendation to the Operations Manager: is the drop real, how much is the reporting change, what still needs a look, and what you would verify next.

Save a working draft once you have a view. A stakeholder may correct material information. Revise the same artifact after that correction before submitting.`,
    },
    {
      id: "res_production",
      title: "production_runs.csv",
      kind: "csv",
      initiallyVisible: true,
      summary: "Planned, completed_good, scrap and yield by line, shift, period",
      searchableText: "production runs planned completed scrap yield line shift L1 L2",
      onOpenFlags: { opened_production: true },
      content: `# production_runs.csv

160 run-level rows: two periods × 20 days × two lines × two shifts.

Columns: run_id, period, day, line, shift, planned, completed_good, scrap, hold_reclass, yield_pct

Open the Data tab to filter, sort, and cite rows. Prior-period rows were reported before HOLD_RECLASS existed. Do not assume current and prior are comparable until you inspect the metric definition.`,
    },
    {
      id: "res_quality",
      title: "quality_events.csv",
      kind: "csv",
      initiallyVisible: true,
      summary: "Disposition events including HOLD_RECLASS",
      searchableText: "quality events disposition HOLD_RECLASS SCRAP units day",
      onOpenFlags: { opened_quality_events: true },
      content: `# quality_events.csv

68 event rows at disposition-event grain. HOLD_RECLASS appears only in the current period. Prior periods were not restated.

Columns: event_id, period, day, line, shift, disposition, units

Use the Data tab for the complete extract. The file supports filtering by disposition, day, line, and shift.`,
    },
    {
      id: "res_dictionary",
      title: "Metric dictionary, yield",
      kind: "documentation",
      initiallyVisible: true,
      summary: "How yield is defined and what it excludes",
      searchableText: "yield definition completed_good planned HOLD_RECLASS restate",
      onOpenFlags: { opened_metric_dictionary: true },
      content: `# Metric dictionary, yield

**yield** = completed_good / planned

**completed_good** excludes any unit that does not leave as good output, including units in \`HOLD_RECLASS\`.

Prior periods are **not** restated when a disposition code changes. Two periods reported under different rules are not directly comparable.`,
    },
    {
      id: "res_ops_note",
      title: "Quality note, L2 Day (revealed)",
      kind: "log",
      initiallyVisible: false,
      summary: "Revealed after the residual comparison",
      searchableText: "L2 Day residual scrap real loss shift",
      content: `# Quality note, L2 Day

After backing out reclassified volume, L2 Day still shows more scrap than the prior period. The loss looks real, but the data does not establish a cause. Check the line before the next shift.`,
    },
  ],

  artifacts: [
    { id: "art_memo", kind: "analysis_memo", title: "Recommendation", required: true, description: "Recommendation to Ops" },
    { id: "art_exec", kind: "executive_summary", title: "One-paragraph summary", required: false },
  ],

  tools: [
    { id: "tool_resources", label: "Sources", capability: "resources", initiallyUnlocked: true },
    { id: "tool_sql", label: "Query", capability: "sql_execution", initiallyUnlocked: true },
    { id: "tool_people", label: "People", capability: "internal_chat", initiallyUnlocked: true },
    { id: "tool_ai", label: "Assistant", capability: "ai_assistant", initiallyUnlocked: true },
    { id: "tool_artifacts", label: "Recommendation", capability: "artifact_composer", initiallyUnlocked: true },
  ],

  world: {
    flags: {
      opened_production: false,
      opened_quality_events: false,
      opened_metric_dictionary: false,
      ran_yield_query: false,
      ran_reclass_query: false,
      ran_residual_query: false,
      identified_reporting_change: false,
      identified_residual_loss: false,
      changed_info_released: false,
      sql_executed: false,
    },
  },

  events: [
    {
      id: "evt_reveal_ops_note",
      label: "Reveal L2 Day note after residual comparison",
      once: true,
      trigger: { kind: "WORLD_STATE", flag: "ran_residual_query", equals: true },
      actions: [
        { kind: "REVEAL_RESOURCE", resourceId: "res_ops_note" },
        { kind: "SHOW_NOTIFICATION", message: "Ops note on L2 Day is now available", tone: "neutral" },
      ],
    },
    {
      id: "evt_changed_information",
      label: "Quality lead corrects the code start date",
      once: true,
      trigger: {
        kind: "ALL",
        triggers: [
          { kind: "ARTIFACT", artifactKind: "analysis_memo" },
          { kind: "WORLD_STATE", flag: "opened_quality_events", equals: true },
        ],
      },
      actions: [
        {
          kind: "SEND_MESSAGE",
          personId: "person_marcus",
          body: "Correction after checking the release record: HOLD_RECLASS went live on day 9 of this 20-day period, not on day 1. Days 1 through 8 used the old rule. Please revise the draft if you treated the full period as reclassified, and tell me what still holds.",
        },
        { kind: "UPDATE_WORLD_STATE", flag: "changed_info_released", value: true },
        {
          kind: "EMIT_SCENARIO_EVENT",
          scenarioKind: "CUSTOM",
          label: "HOLD_RECLASS start date corrected to day 9",
          payload: { factId: "HOLD_RECLASS_DAY_9" },
        },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Changed information: HOLD_RECLASS start date corrected",
          tone: "warning",
        },
        { kind: "CHANGE_TASK_PRIORITY", taskId: "task_memo", priority: "critical" },
      ],
    },
  ],

  sqlRuntime: {
    dialectLabel: "PostgreSQL analysis sandbox",
    knownTables: ["production_runs", "quality_events"],
    tables: [
      {
        name: "production_runs",
        columns: ["run_id", "period", "day", "line", "shift", "planned", "completed_good", "scrap", "hold_reclass", "yield_pct"],
        rows: productionRuns,
      },
      {
        name: "quality_events",
        columns: ["event_id", "period", "day", "line", "shift", "disposition", "units"],
        rows: qualityEvents,
      },
    ],
    patterns: [
      {
        id: "yield_by_period",
        label: "Average yield by period",
        whenSqlIncludes: ["production_runs", "yield", "group by", "period"],
        columns: ["period", "avg_yield_pct", "runs"],
        rows: [
          { period: "prior", avg_yield_pct: 93.25, runs: 80 },
          { period: "current", avg_yield_pct: 91.45, runs: 80 },
        ],
        setFlags: { ran_yield_query: true, sql_executed: true },
      },
      {
        id: "reclass_by_period",
        label: "HOLD_RECLASS volume by period",
        whenSqlIncludes: ["quality_events", "hold_reclass"],
        columns: ["period", "reclass_units", "scrap_units"],
        rows: [
          { period: "prior", reclass_units: 0, scrap_units: 540 },
          { period: "current", reclass_units: 144, scrap_units: 540 },
        ],
        setFlags: { ran_reclass_query: true, identified_reporting_change: true, sql_executed: true },
      },
      {
        id: "residual_scrap",
        label: "Residual scrap by line and shift",
        whenSqlIncludes: ["production_runs", "scrap", "line", "shift"],
        columns: ["line", "shift", "scrap_current", "scrap_prior", "delta"],
        rows: [
          { line: "L1", shift: "Day", scrap_current: 120, scrap_prior: 120, delta: 0 },
          { line: "L1", shift: "Night", scrap_current: 100, scrap_prior: 100, delta: 0 },
          { line: "L2", shift: "Day", scrap_current: 200, scrap_prior: 160, delta: 40 },
          { line: "L2", shift: "Night", scrap_current: 120, scrap_prior: 160, delta: -40 },
        ],
        setFlags: { ran_residual_query: true, identified_residual_loss: true, sql_executed: true },
      },
    ],
  },

  aiAssistant: {
    modelLabel: "Fydell Assistant (deterministic sandbox)",
    fallbackResponse:
      "Separate the reporting change from a real loss. Quantify HOLD_RECLASS volume this period, compare yield across periods knowing prior was not restated, then check residual scrap by line before naming a cause.",
    responses: [
      {
        id: "ai_reclass",
        whenPromptIncludes: ["reclass", "reporting", "code"],
        response:
          "HOLD_RECLASS only exists in the current period and leaves the numerator. Quantify its volume, then estimate how much of the reported drop it explains, but note prior periods were never restated, so any corrected gap is an estimate.",
      },
      {
        id: "ai_residual",
        whenPromptIncludes: ["residual", "scrap", "l2", "line"],
        response:
          "After backing out reclassified volume, compare residual scrap by line against the prior period. If one line is still elevated, that is a real loss, but the data shows the loss, not the cause.",
      },
      {
        id: "ai_memo",
        whenPromptIncludes: ["memo", "recommend", "write"],
        response:
          "Structure: (1) how much of the drop is the reporting change, (2) which line still carries a real loss, (3) the comparability caveat, (4) what you would verify next.",
      },
    ],
  },
};
