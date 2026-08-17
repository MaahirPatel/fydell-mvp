import type { SimulationScenarioDefinition } from "../../types";
import { ridgelinePeople } from "./personas";

/**
 * Ridgeline Executive Queue — BSA reference scenario.
 *
 * Config-only polymorphism proof: uses workflow_rules + shared panels via
 * ConfigDrivenSandbox (no RoleKey-specific layout branching required).
 *
 * Multiple valid paths:
 * A) Rules → purchases → systems note → select R0 → quantify → compliant fix → summary
 * B) Systems note first → ask Farah about intent → confirm R0 → fix
 * C) Purchases → quantify impact → rules → fix
 *
 * Dead-end: delete R0 or blanket auto-approve under $5k.
 */
export const ridgelineExecutiveQueueScenario: SimulationScenarioDefinition = {
  metadata: {
    id: "ridgeline-executive-queue",
    slug: "ridgeline-executive-queue",
    title: "Ridgeline — the executive queue",
    description:
      "Ordinary purchases are routing to executives after a policy update. The system isn't broken — find the rule interaction, quantify impact, and recommend a compliance-safe fix.",
    roleKey: "business_systems_analyst",
    estimatedDurationMinutes: 25,
    timeLimitSeconds: 25 * 60,
    difficulty: "intermediate",
    companyName: "Ridgeline Manufacturing",
    instructions: `You are the Business Systems Analyst for procurement approvals.

Situation:
- Since a policy update, ordinary purchases route to executives.
- Teams are starting to bypass the system.
- Compliance will not accept blanket auto-approval.

Your job:
1. Understand approval rule order and vendor data state.
2. Identify the rule interaction (not a mysterious bug).
3. Quantify impact from the sample POs.
4. Choose a fix that matches policy intent and preserves audit review.
5. Write a stakeholder summary separating system behavior from policy intent.

Multiple investigation paths are valid.`,
  },

  versions: {
    scenarioId: "ridgeline-executive-queue",
    scenarioVersion: "1.0.0",
    engineVersion: "0.1.0",
    competencyModelVersion: "bsa-queue-1.0.0",
    evidenceDerivationVersion: "1.0.0",
    analysisVersion: "1.0.0",
  },

  capabilities: [
    "tasks",
    "resources",
    "internal_chat",
    "ai_assistant",
    "artifact_composer",
    "timed_events",
    "documentation",
    "workflow_rules",
  ],

  constraints: {
    aiPolicy: "ALLOWED",
    externalResourcesPolicy: "CLOSED",
    clipboardPolicy: "TRACKED",
  },

  competencies: [
    {
      id: "root_cause_analysis",
      label: "Root-cause analysis",
      description: "Traces routing to rule order + vendor status data, not a system bug.",
      weight: 1.2,
    },
    {
      id: "process_analysis",
      label: "Process analysis",
      description: "Quantifies wrongly routed cases from evidence.",
      weight: 1.1,
    },
    {
      id: "systems_judgment",
      label: "Systems judgment",
      description: "Chooses a fix matching policy intent with audit constraints.",
      weight: 1.2,
    },
    {
      id: "stakeholder_summary",
      label: "Stakeholder summary",
      description: "Separates system behavior from policy intent in writing.",
      weight: 1,
    },
    {
      id: "ai_judgment",
      label: "AI judgment",
      description: "Uses AI as an aid and verifies against rules/data.",
      weight: 0.7,
    },
  ],

  tasks: [
    {
      id: "task_rules",
      title: "Review approval rules",
      description: "Understand top-down evaluation order, especially R0.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["root_cause_analysis"],
      completion: { kind: "WORLD_FLAG", flag: "opened_rules", equals: true },
    },
    {
      id: "task_data",
      title: "Inspect purchases and systems note",
      description: "Connect vendor_status to routing outcomes.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["process_analysis"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "WORLD_FLAG", flag: "opened_purchases", equals: true },
          { kind: "WORLD_FLAG", flag: "opened_systems_note", equals: true },
        ],
      },
    },
    {
      id: "task_cause",
      title: "Identify the rule interaction",
      description: "Select the rule that explains executive routing.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["root_cause_analysis"],
      completion: { kind: "WORLD_FLAG", flag: "identified_rule_interaction", equals: true },
    },
    {
      id: "task_impact",
      title: "Quantify impact",
      description: "How many sample POs under $5k were wrongly routed?",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["process_analysis"],
      completion: { kind: "WORLD_FLAG", flag: "quantified_impact", equals: true },
    },
    {
      id: "task_fix",
      title: "Recommend a compliance-safe fix",
      description: "Backfill + precise 'new vendor' definition — not delete R0.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["systems_judgment"],
      completion: { kind: "WORLD_FLAG", flag: "correct_fix_chosen", equals: true },
    },
    {
      id: "task_summary",
      title: "Write stakeholder summary",
      description: "System vs policy, impact, recommendation.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["stakeholder_summary"],
      completion: { kind: "ARTIFACT_EXISTS", artifactKind: "analysis_memo" },
    },
  ],

  people: ridgelinePeople,

  resources: [
    {
      id: "res_brief",
      title: "Brief — executive queue",
      kind: "brief",
      initiallyVisible: true,
      summary: "Routine buys hitting CFO desk",
      searchableText: "executive routing policy R0",
      content: `# Brief — Executive queue

Ordinary purchases are landing on executives. Teams are starting to bypass approvals.

**Hypothesis pressure:** "the system is broken" vs "the system is doing what the rules say."

Deliverable: root cause, quantified impact, compliance-safe recommendation, stakeholder summary.
`,
    },
    {
      id: "res_rules",
      title: "Approval rules (top-down)",
      kind: "schema",
      initiallyVisible: true,
      summary: "R0 → R1 → R2 → R3",
      searchableText: "R0 vendor_status approved executive",
      onOpenFlags: { opened_rules: true },
      content: `# Approval rules (evaluated top-down)

| Rule | Condition | Routes to |
| --- | --- | --- |
| R0 (new) | vendor_status ≠ 'approved' | Executive |
| R1 | amount < $500 | Auto-approve |
| R2 | $500 – $5,000 | Manager |
| R3 | > $5,000 | Director |

R0 is evaluated **before** all amount-based rules.
`,
    },
    {
      id: "res_purchases",
      title: "Recent purchase orders",
      kind: "csv",
      initiallyVisible: true,
      summary: "6 sample POs",
      searchableText: "PO-501 pending_verification executive",
      onOpenFlags: { opened_purchases: true },
      content: `# Recent purchase orders

| PO | Vendor | vendor_status | Amount | Routed to |
| --- | --- | ---: | ---: | --- |
| PO-501 | Apex Supply | pending_verification | $80 | Executive |
| PO-502 | Corewood | approved | $340 | Auto-approved |
| PO-503 | Apex Supply | pending_verification | $1,200 | Executive |
| PO-504 | Danner Tools | pending_verification | $95 | Executive |
| PO-505 | Veritas Labs | approved | $7,800 | Director |
| PO-506 | Mistral Parts | pending_verification | $2,300 | Executive |
`,
    },
    {
      id: "res_systems_note",
      title: "Systems note — vendor migration",
      kind: "documentation",
      initiallyVisible: true,
      summary: "pending_verification until first completed PO",
      searchableText: "migration pending_verification new vendor policy",
      onOpenFlags: { opened_systems_note: true },
      content: `# Systems note

## Vendor master migration

Last month's vendor migration created records with \`vendor_status = 'pending_verification'\`. Status changes to \`'approved'\` only **after a vendor's first completed purchase order** in the new system.

## Policy update

The new policy requires executive review for purchases from **new vendors**. It was implemented as rule R0, evaluated before all other rules.
`,
    },
    {
      id: "res_audit_excerpt",
      title: "Audit excerpt (last year)",
      kind: "log",
      initiallyVisible: false,
      summary: "Revealed after opening rules + systems note",
      searchableText: "p-card bypass audit",
      content: `# Audit excerpt

Auditors flagged p-card bypasses when approval queues became unusable. Any fix that removes review for genuinely new vendors will fail the next review.
`,
    },
  ],

  artifacts: [
    {
      id: "art_summary",
      kind: "analysis_memo",
      title: "Stakeholder summary",
      required: true,
    },
    {
      id: "art_reco",
      kind: "technical_recommendation",
      title: "Systems recommendation",
      required: false,
    },
  ],

  tools: [
    { id: "tool_resources", label: "Resources", capability: "resources", initiallyUnlocked: true },
    { id: "tool_rules", label: "Workflow rules", capability: "workflow_rules", initiallyUnlocked: true },
    { id: "tool_people", label: "People", capability: "internal_chat", initiallyUnlocked: true },
    { id: "tool_ai", label: "AI Assistant", capability: "ai_assistant", initiallyUnlocked: true },
    { id: "tool_artifacts", label: "Summary", capability: "artifact_composer", initiallyUnlocked: true },
  ],

  world: {
    flags: {
      opened_rules: false,
      opened_purchases: false,
      opened_systems_note: false,
      identified_rule_interaction: false,
      quantified_impact: false,
      correct_fix_chosen: false,
      unsafe_fix_chosen: false,
      separated_system_vs_policy: false,
      candidate_made_unsupported_promise: false,
    },
  },

  events: [
    {
      id: "evt_reveal_audit",
      label: "Reveal audit excerpt",
      once: true,
      trigger: {
        kind: "ALL",
        triggers: [
          { kind: "WORLD_STATE", flag: "opened_rules", equals: true },
          { kind: "WORLD_STATE", flag: "opened_systems_note", equals: true },
        ],
      },
      actions: [
        { kind: "REVEAL_RESOURCE", resourceId: "res_audit_excerpt" },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Audit excerpt unlocked",
          tone: "neutral",
        },
      ],
    },
    {
      id: "evt_lee_nudge",
      label: "Ops asks for quantified root cause",
      once: true,
      trigger: {
        kind: "ALL",
        triggers: [
          { kind: "TIME", afterMs: 7 * 60 * 1000 },
          { kind: "WORLD_STATE", flag: "opened_purchases", equals: true },
        ],
      },
      actions: [
        {
          kind: "SEND_MESSAGE",
          personId: "person_lee",
          body: "I need the root cause and a count before I escalate to Finance — and please don't propose deleting the new-vendor review entirely.",
        },
        { kind: "CHANGE_TASK_PRIORITY", taskId: "task_summary", priority: "critical" },
      ],
    },
    {
      id: "evt_unsafe_fix",
      label: "Farah rejects non-compliant fix",
      once: true,
      trigger: { kind: "WORLD_STATE", flag: "unsafe_fix_chosen", equals: true },
      actions: [
        {
          kind: "SEND_MESSAGE",
          personId: "person_farah",
          body: "Deleting R0 or blanket auto-approval fails compliance. Keep executive review for genuinely new vendors — fix the migration status and the definition.",
        },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Compliance rejected a non-compliant fix option",
          tone: "warning",
        },
      ],
    },
  ],

  rulesWorkbench: {
    title: "Approval rules (top-down)",
    rules: [
      {
        id: "R0",
        label: "R0 (new)",
        condition: "vendor_status ≠ 'approved'",
        routesTo: "Executive",
        order: 0,
      },
      {
        id: "R1",
        label: "R1",
        condition: "amount < $500",
        routesTo: "Auto-approve",
        order: 1,
      },
      {
        id: "R2",
        label: "R2",
        condition: "$500 – $5,000",
        routesTo: "Manager",
        order: 2,
      },
      {
        id: "R3",
        label: "R3",
        condition: "> $5,000",
        routesTo: "Director",
        order: 3,
      },
    ],
    rootCauseRuleIds: ["R0"],
    recommendedFixId: "fix_backfill_define",
    impactPrompt: "How many of the 6 sample POs under $5,000 were wrongly routed to an executive?",
    correctImpactCount: 4,
    impactOptions: [2, 3, 4, 5],
    fixOptions: [
      {
        id: "fix_backfill_define",
        label: "Backfill 'approved' for migrated vendors and define 'new vendor' precisely in R0",
        compliant: true,
      },
      {
        id: "fix_delete_r0",
        label: "Delete rule R0 entirely",
        compliant: false,
      },
      {
        id: "fix_blanket",
        label: "Auto-approve everything under $5,000 regardless of vendor",
        compliant: false,
      },
      {
        id: "fix_raise_threshold",
        label: "Raise the executive threshold to $50,000",
        compliant: false,
      },
    ],
  },

  aiAssistant: {
    modelLabel: "Fydell Assistant (mock)",
    fallbackResponse:
      "Separate what the rules do from what the policy meant. Check evaluation order and vendor_status after migration.",
    responses: [
      {
        id: "ai_r0",
        whenPromptIncludes: ["r0", "rule", "routing"],
        response:
          "R0 fires first. Migrated vendors still show pending_verification, so routine re-orders match R0 and route to executives even when amounts should auto-approve or go to a manager.",
      },
      {
        id: "ai_impact",
        whenPromptIncludes: ["how many", "impact", "count"],
        response:
          "Count POs under $5,000 routed to Executive with pending_verification: PO-501, PO-503, PO-504, PO-506 → four.",
      },
      {
        id: "ai_fix",
        whenPromptIncludes: ["fix", "recommend", "backfill"],
        response:
          "Prefer backfilling migrated vendor statuses and defining 'new vendor' precisely. Deleting R0 or blanket auto-approval fails compliance.",
      },
    ],
  },
};
