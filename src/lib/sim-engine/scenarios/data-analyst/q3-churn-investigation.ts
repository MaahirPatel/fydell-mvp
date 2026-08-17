import type { SimulationScenarioDefinition } from "../../types";
import { churnPeople } from "./personas";

/**
 * Q3 churn investigation — Data Analyst reference scenario.
 *
 * Multiple valid paths (none uniquely "correct sequence"):
 * A) Brief → schema → churn by plan → conclude mix/Growth
 * B) Brief → ask Product → mix disclosure → confirm with SQL
 * C) Brief → billing resource → billing query → refine with plan mix
 * D) Dead-end: ticket volume only (red herring) — should not unlock found_churn_driver
 *
 * Primary driver in ground truth: Growth plan mix shift + elevated Growth churn,
 * with billing failures as a secondary contributor — not support tickets.
 */
export const q3ChurnInvestigationScenario: SimulationScenarioDefinition = {
  metadata: {
    id: "q3-churn-investigation",
    slug: "q3-churn-investigation",
    title: "Q3 churn — mix, usage, or billing?",
    description:
      "Headline churn rose ~18% QoQ. Determine whether the increase is driven by customer mix, product usage, or billing failures — and write a defensible memo for the VP of CS.",
    roleKey: "data_analyst",
    estimatedDurationMinutes: 25,
    timeLimitSeconds: 25 * 60,
    difficulty: "intermediate",
    companyName: "Meridian SaaS",
    instructions: `You are the Data Analyst supporting Customer Success.

Situation:
- Board pack shows paid churn up ~18% quarter-over-quarter.
- Finance definition: paid subscriptions that entered status=churned in Q3 (Jul–Sep), excluding trials.
- Competing theories: plan mix shift, usage decline, billing failures, support quality.

Your job:
1. Understand the metric definition and available tables.
2. Investigate with SQL (multiple approaches are valid).
3. Rule out at least one plausible red herring.
4. Identify the primary driver with evidence.
5. Write an analysis memo for Amina (VP CS) with caveats.

Do not invent precision you cannot support from queries and people.`,
  },

  versions: {
    scenarioId: "q3-churn-investigation",
    scenarioVersion: "1.0.0",
    engineVersion: "0.1.0",
    competencyModelVersion: "da-churn-1.0.0",
    evidenceDerivationVersion: "1.0.0",
    analysisVersion: "1.0.0",
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
      id: "sql_investigation",
      label: "SQL investigation",
      description: "Writes and iterates queries that surface relevant evidence.",
      weight: 1.2,
    },
    {
      id: "analytical_correctness",
      label: "Analytical correctness",
      description: "Reaches a defensible driver conclusion consistent with evidence.",
      weight: 1.2,
    },
    {
      id: "information_discovery",
      label: "Information discovery",
      description: "Uses schema, people, and resources appropriately.",
      weight: 1,
    },
    {
      id: "stakeholder_communication",
      label: "Stakeholder communication",
      description: "Writes a clear memo with caveats for a non-analyst audience.",
      weight: 1,
    },
    {
      id: "ai_judgment",
      label: "AI judgment",
      description: "Uses AI as an aid and verifies against data.",
      weight: 0.7,
    },
  ],

  tasks: [
    {
      id: "task_brief",
      title: "Understand the question and definition",
      description: "Read the brief and confirm Finance churn definition.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["information_discovery"],
      completion: { kind: "TELEMETRY", eventType: "RESOURCE_OPENED", minCount: 1 },
    },
    {
      id: "task_explore",
      title: "Explore the data model",
      description: "Open the schema and identify tables relevant to churn.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["information_discovery", "sql_investigation"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "WORLD_FLAG", flag: "opened_schema", equals: true },
          { kind: "TELEMETRY", eventType: "SQL_EXECUTE", minCount: 1 },
        ],
      },
    },
    {
      id: "task_investigate",
      title: "Investigate drivers with SQL",
      description: "Run diagnostic queries. Multiple paths are valid.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["sql_investigation", "analytical_correctness"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "WORLD_FLAG", flag: "found_churn_driver", equals: true },
          { kind: "WORLD_FLAG", flag: "ran_plan_mix_query", equals: true },
        ],
      },
    },
    {
      id: "task_rule_out",
      title: "Rule out a red herring",
      description: "Show why tickets (or another weak theory) are insufficient.",
      initialStatus: "AVAILABLE",
      priority: "normal",
      competencyIds: ["analytical_correctness"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "WORLD_FLAG", flag: "ruled_out_tickets", equals: true },
          { kind: "ARTIFACT_EXISTS", artifactKind: "analysis_memo" },
        ],
      },
    },
    {
      id: "task_memo",
      title: "Write the analysis memo",
      description: "Primary driver, evidence, caveats, recommended next check.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["stakeholder_communication", "analytical_correctness"],
      completion: { kind: "ARTIFACT_EXISTS", artifactKind: "analysis_memo" },
    },
  ],

  people: churnPeople,

  resources: [
    {
      id: "res_churn_brief",
      title: "Brief — Q3 churn spike",
      kind: "brief",
      initiallyVisible: true,
      summary: "Board question, competing theories, deadline",
      searchableText: "churn board pack Growth billing usage tickets",
      content: `# Brief — Q3 churn spike

**Ask:** Why did paid churn rise ~18% QoQ?

**Definition (Finance):** paid subscriptions with \`status='churned'\` and \`churned_at\` in 2026-07-01 … 2026-10-01. Exclude trials.

## Competing theories
1. **Mix** — more Growth-plan customers (structurally higher churn)
2. **Usage** — engagement decline precedes cancel
3. **Billing** — payment failures → involuntary churn
4. **Support** — ticket volume / quality (often raised in Slack; treat carefully)

## Deliverable
A short memo to Amina Okonkwo (VP CS): primary driver, evidence, what you ruled out, caveats.
`,
    },
    {
      id: "res_schema",
      title: "Warehouse schema — subscriptions & related",
      kind: "schema",
      initiallyVisible: true,
      summary: "Tables and grain",
      searchableText: "subscriptions customers usage_events invoices support_tickets",
      onOpenFlags: { opened_schema: true },
      content: `# Schema

## customers
| column | type | notes |
|--------|------|-------|
| customer_id | text | PK |
| segment | text | enterprise / midmarket / smb |
| created_at | date | |

## subscriptions
| column | type | notes |
|--------|------|-------|
| subscription_id | text | PK |
| customer_id | text | FK |
| plan | text | Starter / Growth / Enterprise |
| status | text | active / churned / trial |
| started_at | date | |
| churned_at | date | null if active |
| mrr | number | |

## usage_events
| column | type | notes |
|--------|------|-------|
| customer_id | text | |
| event_date | date | |
| active_days_30d | number | rolling active days |

## invoices
| column | type | notes |
|--------|------|-------|
| invoice_id | text | |
| customer_id | text | |
| status | text | paid / failed / refunded |
| failed_at | date | |

## support_tickets
| column | type | notes |
|--------|------|-------|
| ticket_id | text | |
| customer_id | text | |
| category | text | |
| created_at | date | |
`,
    },
    {
      id: "res_metric_dict",
      title: "Metric dictionary — churn",
      kind: "documentation",
      initiallyVisible: true,
      summary: "Finance vs Product definitions",
      searchableText: "paid churn trial exclude Finance",
      content: `# Metric dictionary

**Paid churn (Finance, board):** count of paid subscriptions that became churned in the quarter / average paid base.

**Product cancel rate:** distinct from Finance — includes product-initiated cancels only; excludes involuntary billing churn in some reports.

Use **Finance paid churn** for this investigation unless Amina says otherwise.
`,
    },
    {
      id: "res_invoice_sample",
      title: "Invoice failure sample (Q3)",
      kind: "csv",
      initiallyVisible: true,
      summary: "Small extract — failed invoices by plan",
      searchableText: "invoices failed Growth expired card",
      onOpenFlags: { opened_billing_resource: true },
      content: `# Invoice failure sample (Q3 extract)

invoice_id,customer_id,plan,status,failed_at
i_8841,c_1201,Growth,failed,2026-08-10
i_8842,c_1208,Growth,failed,2026-08-11
i_8849,c_1302,Starter,failed,2026-08-14
i_8855,c_1401,Growth,paid,

Notes: Growth dominates failures. Pair with SQL on invoices + subscriptions before calling billing the primary board driver.
`,
    },
    {
      id: "res_billing_note",
      title: "Billing failure notes (August)",
      kind: "log",
      initiallyVisible: false,
      summary: "Revealed after opening invoice sample or running billing SQL",
      searchableText: "payment failure Growth expired card",
      onOpenFlags: { opened_billing_resource: true },
      content: `# Billing ops note — August

Elevated \`invoices.status='failed'\` on Growth plan, primarily expired cards.

Recovery within 7 days recovers ~60% of failures. Residual cancels still occur.

Do not treat billing failures as the sole board explanation without comparing plan mix.
`,
    },
    {
      id: "res_slack_noise",
      title: "Slack excerpt — support theory",
      kind: "markdown",
      initiallyVisible: true,
      summary: "Red herring pressure",
      searchableText: "tickets SSO password",
      content: `# Slack (excerpt)

**AE:** Ticket volume is through the roof — churn must be support quality.

**Support Lead:** Most are SSO password resets. Please don't put that in the board pack.
`,
    },
  ],

  artifacts: [
    {
      id: "art_sql",
      kind: "sql_query",
      title: "SQL investigation",
      required: false,
    },
    {
      id: "art_memo",
      kind: "analysis_memo",
      title: "Analysis memo",
      required: true,
      description: "Memo to VP CS",
    },
    {
      id: "art_exec",
      kind: "executive_summary",
      title: "One-paragraph exec summary",
      required: false,
    },
  ],

  tools: [
    { id: "tool_resources", label: "Resources", capability: "resources", initiallyUnlocked: true },
    { id: "tool_sql", label: "SQL workbench", capability: "sql_execution", initiallyUnlocked: true },
    { id: "tool_people", label: "People", capability: "internal_chat", initiallyUnlocked: true },
    { id: "tool_ai", label: "AI Assistant", capability: "ai_assistant", initiallyUnlocked: true },
    { id: "tool_artifacts", label: "Memo", capability: "artifact_composer", initiallyUnlocked: true },
  ],

  world: {
    flags: {
      opened_schema: false,
      opened_billing_resource: false,
      ran_plan_mix_query: false,
      ran_billing_query: false,
      ran_usage_query: false,
      ran_ticket_query: false,
      ruled_out_tickets: false,
      found_churn_driver: false,
      wrong_driver_claimed: false,
      sql_executed: false,
      sql_syntax_error: false,
      sql_unknown_table: false,
      last_sql_pattern: null,
    },
  },

  events: [
    {
      id: "evt_reveal_billing_notes",
      label: "Reveal billing notes after invoices exploration",
      once: true,
      trigger: {
        kind: "ANY",
        triggers: [
          { kind: "WORLD_STATE", flag: "ran_billing_query", equals: true },
          { kind: "WORLD_STATE", flag: "opened_billing_resource", equals: true },
        ],
      },
      actions: [
        { kind: "REVEAL_RESOURCE", resourceId: "res_billing_note" },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Billing failure notes are now available",
          tone: "neutral",
        },
      ],
    },
    {
      id: "evt_amina_nudge",
      label: "VP asks for a draft conclusion",
      once: true,
      trigger: {
        kind: "ALL",
        triggers: [
          { kind: "TIME", afterMs: 8 * 60 * 1000 },
          { kind: "WORLD_STATE", flag: "sql_executed", equals: true },
        ],
      },
      actions: [
        {
          kind: "SEND_MESSAGE",
          personId: "person_amina",
          body: "If you have a working theory, send me a draft memo — primary driver, what you ruled out, and what you'd want to verify next. Prefer honesty over false precision.",
        },
        { kind: "CHANGE_TASK_PRIORITY", taskId: "task_memo", priority: "critical" },
      ],
    },
    {
      id: "evt_ticket_warning",
      label: "Support warns after ticket-only query",
      once: true,
      trigger: { kind: "WORLD_STATE", flag: "ran_ticket_query", equals: true },
      actions: [
        {
          kind: "SEND_MESSAGE",
          personId: "person_sam",
          body: "If you're looking at ticket counts: most of the spike is SSO password resets. That is not cancel intent. Don't put tickets as the primary churn driver.",
        },
        { kind: "UPDATE_WORLD_STATE", flag: "ruled_out_tickets", value: true },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Sam Torres challenged the ticket-volume theory",
          tone: "warning",
        },
      ],
    },
  ],

  sqlRuntime: {
    dialectLabel: "PostgreSQL (mock)",
    knownTables: ["customers", "subscriptions", "usage_events", "invoices", "support_tickets"],
    tables: [
      {
        name: "subscriptions",
        columns: ["subscription_id", "customer_id", "plan", "status", "churned_at", "mrr"],
        rows: [
          { subscription_id: "s1", customer_id: "c1", plan: "Growth", status: "churned", churned_at: "2026-08-12", mrr: 89 },
          { subscription_id: "s2", customer_id: "c2", plan: "Growth", status: "churned", churned_at: "2026-08-19", mrr: 89 },
          { subscription_id: "s3", customer_id: "c3", plan: "Starter", status: "churned", churned_at: "2026-07-22", mrr: 29 },
          { subscription_id: "s4", customer_id: "c4", plan: "Enterprise", status: "active", churned_at: null, mrr: 1200 },
        ],
      },
      {
        name: "invoices",
        columns: ["invoice_id", "customer_id", "status", "failed_at"],
        rows: [
          { invoice_id: "i1", customer_id: "c1", status: "failed", failed_at: "2026-08-10" },
          { invoice_id: "i2", customer_id: "c9", status: "paid", failed_at: null },
        ],
      },
      {
        name: "support_tickets",
        columns: ["ticket_id", "customer_id", "category", "created_at"],
        rows: [
          { ticket_id: "t1", customer_id: "c5", category: "password_reset", created_at: "2026-08-03" },
          { ticket_id: "t2", customer_id: "c6", category: "password_reset", created_at: "2026-08-04" },
        ],
      },
      {
        name: "usage_events",
        columns: ["customer_id", "event_date", "active_days_30d"],
        rows: [
          { customer_id: "c1", event_date: "2026-08-01", active_days_30d: 2 },
          { customer_id: "c4", event_date: "2026-08-01", active_days_30d: 22 },
        ],
      },
      {
        name: "customers",
        columns: ["customer_id", "segment", "created_at"],
        rows: [
          { customer_id: "c1", segment: "smb", created_at: "2026-03-01" },
          { customer_id: "c4", segment: "enterprise", created_at: "2025-01-01" },
        ],
      },
    ],
    patterns: [
      {
        id: "churn_by_plan",
        label: "Churn counts by plan (Q3)",
        whenSqlIncludes: ["subscriptions", "churned", "group by", "plan"],
        columns: ["plan", "churned_accounts", "share_of_churn"],
        rows: [
          { plan: "Growth", churned_accounts: 142, share_of_churn: 0.61 },
          { plan: "Starter", churned_accounts: 68, share_of_churn: 0.29 },
          { plan: "Enterprise", churned_accounts: 23, share_of_churn: 0.1 },
        ],
        setFlags: { ran_plan_mix_query: true, found_churn_driver: true },
      },
      {
        id: "plan_base_mix",
        label: "Paid base mix shift",
        whenSqlIncludes: ["subscriptions", "plan", "active"],
        columns: ["plan", "avg_paid_base_q2", "avg_paid_base_q3"],
        rows: [
          { plan: "Growth", avg_paid_base_q2: 820, avg_paid_base_q3: 1180 },
          { plan: "Starter", avg_paid_base_q2: 1400, avg_paid_base_q3: 1320 },
          { plan: "Enterprise", avg_paid_base_q2: 210, avg_paid_base_q3: 218 },
        ],
        setFlags: { ran_plan_mix_query: true, found_churn_driver: true },
      },
      {
        id: "billing_failures",
        label: "Failed invoices in Q3",
        whenSqlIncludes: ["invoices", "failed"],
        columns: ["plan", "failed_invoices", "notes"],
        rows: [
          { plan: "Growth", failed_invoices: 96, notes: "mostly expired cards" },
          { plan: "Starter", failed_invoices: 21, notes: "" },
          { plan: "Enterprise", failed_invoices: 4, notes: "" },
        ],
        setFlags: { ran_billing_query: true, opened_billing_resource: true },
      },
      {
        id: "usage_low",
        label: "Low usage among churned",
        whenSqlIncludes: ["usage_events", "active_days"],
        columns: ["cohort", "avg_active_days_30d"],
        rows: [
          { cohort: "churned_q3", avg_active_days_30d: 3.1 },
          { cohort: "active_paid", avg_active_days_30d: 14.8 },
        ],
        setFlags: { ran_usage_query: true },
      },
      {
        id: "tickets_only",
        label: "Ticket volume (red herring)",
        whenSqlIncludes: ["support_tickets"],
        columns: ["category", "tickets_q3"],
        rows: [
          { category: "password_reset", tickets_q3: 410 },
          { category: "billing", tickets_q3: 38 },
          { category: "cancel_intent", tickets_q3: 22 },
        ],
        setFlags: { ran_ticket_query: true },
      },
      {
        id: "join_churn_billing",
        label: "Churned with prior failed invoice",
        whenSqlIncludes: ["subscriptions", "invoices", "join"],
        columns: ["plan", "churned_with_prior_failure", "churned_total"],
        rows: [
          { plan: "Growth", churned_with_prior_failure: 54, churned_total: 142 },
          { plan: "Starter", churned_with_prior_failure: 9, churned_total: 68 },
        ],
        setFlags: { ran_billing_query: true, ran_plan_mix_query: true },
      },
    ],
  },

  aiAssistant: {
    modelLabel: "Fydell Assistant (mock)",
    fallbackResponse:
      "I can help you structure the investigation. Compare plan mix, billing failures, and usage — and treat support ticket volume skeptically unless cancel_intent dominates.",
    responses: [
      {
        id: "ai_mix",
        whenPromptIncludes: ["mix", "plan"],
        response:
          "Start with churn counts and paid base by plan for Q2 vs Q3. If Growth share of the base rose and Growth has higher churn, mix can move the headline without a process break.",
      },
      {
        id: "ai_billing",
        whenPromptIncludes: ["billing", "failed", "invoice"],
        response:
          "Failed invoices can contribute, especially on Growth. Quantify churned accounts with a prior failure — and still compare against mix before calling billing the primary driver.",
      },
      {
        id: "ai_tickets",
        whenPromptIncludes: ["ticket", "support"],
        response:
          "Ticket volume is a weak primary driver unless cancel_intent is large. Password-reset spikes after SSO changes are a common red herring.",
      },
      {
        id: "ai_memo",
        whenPromptIncludes: ["memo", "write"],
        response:
          "Structure: (1) definition used, (2) primary driver with one supporting query result, (3) what you ruled out, (4) caveats / next verification.",
      },
    ],
  },
};

/** BI Analyst variant — same world, metric-reasoning emphasis in copy. */
export const q3ChurnInvestigationBiScenario: SimulationScenarioDefinition = {
  ...q3ChurnInvestigationScenario,
  metadata: {
    ...q3ChurnInvestigationScenario.metadata,
    id: "q3-churn-investigation-bi",
    slug: "q3-churn-investigation-bi",
    roleKey: "bi_analyst",
    title: "Q3 churn metric — reconcile the board pack",
    description:
      "Reconcile the board churn metric. Determine whether mix, usage, or billing explains the QoQ move — with explicit metric definitions.",
  },
  versions: {
    ...q3ChurnInvestigationScenario.versions,
    scenarioId: "q3-churn-investigation-bi",
    competencyModelVersion: "bi-churn-1.0.0",
  },
  competencies: [
    {
      id: "metric_reasoning",
      label: "Metric reasoning",
      description: "Holds definitions and populations carefully.",
      weight: 1.2,
    },
    {
      id: "sql_investigation",
      label: "SQL investigation",
      description: "Queries that isolate the metric movement.",
      weight: 1.1,
    },
    {
      id: "information_discovery",
      label: "Information discovery",
      description: "Uses dictionary, schema, and stakeholders.",
      weight: 1,
    },
    {
      id: "stakeholder_communication",
      label: "Stakeholder communication",
      description: "Explains the metric move without false precision.",
      weight: 1,
    },
    {
      id: "ai_judgment",
      label: "AI judgment",
      description: "Uses AI as an aid and verifies against data.",
      weight: 0.7,
    },
  ],
};
