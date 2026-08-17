import type { SimulationScenarioDefinition } from "../../types";
import { brightpathPeople } from "./personas";

/**
 * Brightpath launch-day import — Implementation Consultant reference scenario.
 *
 * Multiple valid paths:
 * A) Import file → rules → map fields → phased plan to Priya
 * B) Rules first → ask Priya about duplicate → map → checklist → plan
 * C) Ask Marcus for silent-skip guidance → quantify → customer plan
 *
 * Unsafe dead-end: import everything as-is / fix after launch.
 */
export const brightpathLaunchImportScenario: SimulationScenarioDefinition = {
  metadata: {
    id: "brightpath-launch-import",
    slug: "brightpath-launch-import",
    title: "Brightpath — launch-day employee import",
    description:
      "Brightpath goes live Monday. Their employee import has date, manager, and duplicate issues. The importer silently skips invalid rows. Decide what can launch safely and tell the customer the plan.",
    roleKey: "implementation_consultant",
    estimatedDurationMinutes: 25,
    timeLimitSeconds: 25 * 60,
    difficulty: "intermediate",
    companyName: "Acme Cloud (customer: Brightpath Staffing)",
    instructions: `You are the Implementation Consultant for Brightpath Staffing.

Situation:
- Go-live is Monday and cannot move.
- Employee import file has problems; the system silently skips invalid rows.
- No automatic error report unless you run pre-import validation.

Your job:
1. Understand import rules and the file defects.
2. Map customer columns to system fields correctly.
3. Decide a safe launch approach (phased import is expected).
4. Complete the launch readiness checklist.
5. Send Priya a concrete plan: what launches, what's fixed, how you verify.

Multiple paths are valid. Do not invent a single scripted sequence.`,
  },

  versions: {
    scenarioId: "brightpath-launch-import",
    scenarioVersion: "1.0.0",
    engineVersion: "0.1.0",
    competencyModelVersion: "ic-launch-1.0.0",
    evidenceDerivationVersion: "1.0.0",
    analysisVersion: "1.0.0",
  },

  capabilities: [
    "tasks",
    "resources",
    "internal_chat",
    "customer_communication",
    "ai_assistant",
    "artifact_composer",
    "timed_events",
    "documentation",
    "schema_mapping",
    "project_timeline",
  ],

  constraints: {
    aiPolicy: "ALLOWED",
    externalResourcesPolicy: "CLOSED",
    clipboardPolicy: "TRACKED",
  },

  competencies: [
    {
      id: "implementation_judgment",
      label: "Implementation judgment",
      description: "Chooses a safe phased path under fixed-date pressure.",
      weight: 1.2,
    },
    {
      id: "data_integrity",
      label: "Data integrity",
      description: "Maps fields and respects import rules before launch.",
      weight: 1.2,
    },
    {
      id: "information_discovery",
      label: "Information discovery",
      description: "Uses file, rules, and people appropriately.",
      weight: 1,
    },
    {
      id: "customer_communication",
      label: "Customer communication",
      description: "Explains what launches, what's deferred, and how verification works.",
      weight: 1,
    },
    {
      id: "ai_judgment",
      label: "AI judgment",
      description: "Uses AI as an aid and verifies against rules/file.",
      weight: 0.7,
    },
  ],

  tasks: [
    {
      id: "task_brief",
      title: "Understand launch constraints",
      description: "Read the brief and confirm Monday cannot move.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["information_discovery"],
      completion: { kind: "TELEMETRY", eventType: "RESOURCE_OPENED", minCount: 1 },
    },
    {
      id: "task_rules",
      title: "Review import rules and file",
      description: "Identify silent-skip behavior and defect types.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["data_integrity", "information_discovery"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "WORLD_FLAG", flag: "opened_import_rules", equals: true },
          { kind: "WORLD_FLAG", flag: "opened_import_file", equals: true },
        ],
      },
    },
    {
      id: "task_map",
      title: "Map fields to system schema",
      description: "Map source columns to the correct system fields.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["data_integrity"],
      completion: { kind: "WORLD_FLAG", flag: "correct_mapping_complete", equals: true },
    },
    {
      id: "task_checklist",
      title: "Complete launch checklist",
      description: "Confirm readiness steps before Monday.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["implementation_judgment"],
      completion: { kind: "WORLD_FLAG", flag: "checklist_complete", equals: true },
    },
    {
      id: "task_plan",
      title: "Send customer launch plan",
      description: "Phased import, named fixes, verification of counts.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["customer_communication", "implementation_judgment"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "ARTIFACT_EXISTS", artifactKind: "cutover_plan" },
          { kind: "ARTIFACT_EXISTS", artifactKind: "customer_message" },
        ],
      },
    },
  ],

  people: brightpathPeople,

  resources: [
    {
      id: "res_brief",
      title: "Brief — Monday go-live",
      kind: "brief",
      initiallyVisible: true,
      summary: "Fixed date, silent skip risk",
      searchableText: "monday launch import brightpath",
      content: `# Brief — Brightpath launch

**Go-live:** Monday (contractual — cannot move).

**Risk:** Importer **silently skips** invalid rows. Customers will believe people are in the system when they are not.

**Your deliverable:** A safe plan for Priya: what imports today, what is fixed before Monday, and how you verify nothing is lost.
`,
    },
    {
      id: "res_import_file",
      title: "import.csv (sample)",
      kind: "csv",
      initiallyVisible: true,
      summary: "8 rows — defects present",
      searchableText: "employee_id start_date manager_email E-104",
      onOpenFlags: { opened_import_file: true },
      content: `# import.csv

| employee_id | name | start_date | manager_email |
| --- | --- | --- | --- |
| E-101 | Rosa Delgado | 2026-08-03 | m.ortiz@brightpath.com |
| E-102 | James Wu | 08/04/2026 | m.ortiz@brightpath.com |
| E-103 | Amara Osei | 2026-08-03 | k.boyle@brightpath.com |
| E-104 | Dan Reyes | 2026-08-05 | k.boyle@brightpath.com |
| E-104 | Dan Reyes | 2026-08-10 | k.boyle@brightpath.com |
| E-105 | Lena Kovac | 07/28/2026 | m.ortiz@brightpath.com |
| E-106 | Tom Aiello | 2026-08-03 |  |
| E-107 | Nia Brooks | 2026-08-04 | k.boyle@brightpath.com |

**Notes for investigation:** mixed date formats, blank manager, duplicate E-104.
`,
    },
    {
      id: "res_import_rules",
      title: "System import rules",
      kind: "documentation",
      initiallyVisible: true,
      summary: "Unique ID, required manager, YYYY-MM-DD",
      searchableText: "silent skip validation unique manager_email",
      onOpenFlags: { opened_import_rules: true },
      content: `# Import requirements

- \`employee_id\` must be **unique**
- \`manager_email\` is **required** (approval routing)
- \`start_date\` must be **YYYY-MM-DD**

## Behavior

Rows that violate any rule are **silently skipped**. There is no error report unless you run pre-import validation.

System field names: \`employee_external_id\`, \`legal_name\`, \`employment_start_date\`, \`manager_work_email\`.
`,
    },
    {
      id: "res_timeline",
      title: "Launch timeline",
      kind: "markdown",
      initiallyVisible: true,
      summary: "Monday contractual starts",
      searchableText: "go-live monday hires",
      onOpenFlags: { opened_timeline: true },
      content: `# Launch timeline

**Go-live:** Monday

12 new hires have contractual start dates next week. Partial launch is acceptable if you name who is missing and when they will be imported.
`,
    },
    {
      id: "res_validation_hint",
      title: "Pre-import validation note",
      kind: "log",
      initiallyVisible: false,
      summary: "Revealed after opening rules + file",
      searchableText: "validation count",
      content: `# Pre-import validation

Run validation before any bulk import. Expected clean count today (as-is, resolving duplicate by keeping one E-104): **4 rows**.

Defect classes: MM/DD/YYYY dates (E-102, E-105), missing manager (E-106), duplicate employee_id (E-104).
`,
    },
  ],

  artifacts: [
    {
      id: "art_cutover",
      kind: "cutover_plan",
      title: "Launch / cutover plan",
      required: true,
      description: "Phased import plan with verification",
    },
    {
      id: "art_customer",
      kind: "customer_message",
      title: "Customer update to Priya",
      required: true,
    },
    {
      id: "art_exec",
      kind: "executive_summary",
      title: "Internal exec note",
      required: false,
    },
  ],

  tools: [
    { id: "tool_resources", label: "Resources", capability: "resources", initiallyUnlocked: true },
    { id: "tool_mapping", label: "Field mapping", capability: "schema_mapping", initiallyUnlocked: true },
    { id: "tool_checklist", label: "Launch checklist", capability: "project_timeline", initiallyUnlocked: true },
    { id: "tool_people", label: "People", capability: "internal_chat", initiallyUnlocked: true },
    { id: "tool_customer", label: "Customer", capability: "customer_communication", initiallyUnlocked: true },
    { id: "tool_ai", label: "AI Assistant", capability: "ai_assistant", initiallyUnlocked: true },
    { id: "tool_artifacts", label: "Plan", capability: "artifact_composer", initiallyUnlocked: true },
  ],

  world: {
    flags: {
      opened_import_file: false,
      opened_import_rules: false,
      opened_timeline: false,
      correct_mapping_complete: false,
      mapped_at_least_one_correct: false,
      checklist_complete: false,
      phased_plan_chosen: false,
      verification_mentioned: false,
      unsafe_import_plan: false,
      candidate_made_unsupported_promise: false,
    },
  },

  events: [
    {
      id: "evt_reveal_validation",
      label: "Reveal validation note after file + rules",
      once: true,
      trigger: {
        kind: "ALL",
        triggers: [
          { kind: "WORLD_STATE", flag: "opened_import_file", equals: true },
          { kind: "WORLD_STATE", flag: "opened_import_rules", equals: true },
        ],
      },
      actions: [
        { kind: "REVEAL_RESOURCE", resourceId: "res_validation_hint" },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Pre-import validation note is now available",
          tone: "neutral",
        },
      ],
    },
    {
      id: "evt_priya_nudge",
      label: "Priya asks for plan",
      once: true,
      trigger: {
        kind: "ALL",
        triggers: [
          { kind: "TIME", afterMs: 7 * 60 * 1000 },
          { kind: "WORLD_STATE", flag: "opened_import_rules", equals: true },
        ],
      },
      actions: [
        {
          kind: "SEND_MESSAGE",
          personId: "person_priya",
          body: "I need the Monday plan today — what will be in the system, what's still being fixed, and how we'll know nothing was silently dropped.",
        },
        { kind: "CHANGE_TASK_PRIORITY", taskId: "task_plan", priority: "critical" },
      ],
    },
    {
      id: "evt_unsafe_warning",
      label: "Marcus warns on unsafe plan signal",
      once: true,
      trigger: { kind: "WORLD_STATE", flag: "unsafe_import_plan", equals: true },
      actions: [
        {
          kind: "SEND_MESSAGE",
          personId: "person_marcus",
          body: "Importing as-is is not acceptable here — silent skips mean people disappear without an error. Phase clean rows and validate counts.",
        },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Manager challenged an unsafe import approach",
          tone: "warning",
        },
      ],
    },
  ],

  implementationWorkbench: {
    checklistTitle: "Monday launch readiness",
    checklist: [
      {
        id: "chk_rules",
        label: "Confirm silent-skip behavior with import rules",
        required: true,
      },
      {
        id: "chk_defects",
        label: "Document defect classes (dates, manager, duplicate)",
        required: true,
      },
      {
        id: "chk_phase",
        label: "Decide phased import: clean now, fixes before Monday",
        required: true,
      },
      {
        id: "chk_validate",
        label: "Plan pre-import validation + unique employee count check",
        required: true,
      },
      {
        id: "chk_customer",
        label: "Customer informed who is in / out for Monday",
        required: true,
      },
    ],
    fieldMappings: [
      {
        id: "map_id",
        sourceField: "employee_id",
        sampleValue: "E-101",
        options: ["employee_external_id", "internal_user_id", "badge_number", "ignore"],
        correctTarget: "employee_external_id",
      },
      {
        id: "map_name",
        sourceField: "name",
        sampleValue: "Rosa Delgado",
        options: ["legal_name", "display_nickname", "email_local_part", "ignore"],
        correctTarget: "legal_name",
      },
      {
        id: "map_date",
        sourceField: "start_date",
        sampleValue: "2026-08-03",
        options: ["employment_start_date", "created_at", "last_login_at", "ignore"],
        correctTarget: "employment_start_date",
      },
      {
        id: "map_mgr",
        sourceField: "manager_email",
        sampleValue: "m.ortiz@brightpath.com",
        options: ["manager_work_email", "personal_email", "hr_shared_inbox", "ignore"],
        correctTarget: "manager_work_email",
      },
    ],
  },

  aiAssistant: {
    modelLabel: "Fydell Assistant (mock)",
    fallbackResponse:
      "Focus on silent-skip risk: quantify clean rows, fix dates/manager/duplicate before Monday, and verify unique employee counts.",
    responses: [
      {
        id: "ai_phase",
        whenPromptIncludes: ["phase", "import", "monday"],
        response:
          "Import clean rows now, fix date formats / manager email / duplicate E-104 before Monday, then validate counts so nothing is silently skipped.",
      },
      {
        id: "ai_map",
        whenPromptIncludes: ["map", "field", "schema"],
        response:
          "Map employee_id → employee_external_id, name → legal_name, start_date → employment_start_date, manager_email → manager_work_email.",
      },
      {
        id: "ai_count",
        whenPromptIncludes: ["how many", "clean", "count"],
        response:
          "As-is, four rows pass all rules once the duplicate is resolved to a single E-104. Two rows need date reformatting; one needs a manager email.",
      },
    ],
  },
};
