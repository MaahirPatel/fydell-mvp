import type { SimulationScenarioDefinition } from "../../types";
import { skedraSupportPeople } from "./personas";

/**
 * Green status page incident, Technical Support Engineer reference scenario.
 *
 * Multiple valid paths:
 * A) Tickets → auth log → release notes → ask Sam → escalate + customer update
 * B) Release notes first → log confirmation → triage unrelated T-883 → escalate
 * C) Ask Sam about R-2214 after opening log → correct triage → customer-safe update
 *
 * Dead-end: blame password DB / tell everyone to reset passwords.
 */
export const greenStatusPageScenario: SimulationScenarioDefinition = {
  metadata: {
    id: "green-status-page-incident",
    slug: "green-status-page-incident",
    title: "Skedra, green status page, SSO login failures",
    description:
      "Multiple customers report intermittent SSO login failures. The status page is green. Triage tickets, isolate the likely cause, escalate with evidence, and write a customer update you can stand behind.",
    roleKey: "technical_support_engineer",
    estimatedDurationMinutes: 25,
    timeLimitSeconds: 25 * 60,
    difficulty: "intermediate",
    companyName: "Skedra",
    instructions: `You are the Technical Support Engineer on shift.

Situation:
- Several customers report intermittent SSO / login failures since this morning.
- Public status page is green.
- Queue is growing; CS wants a customer-safe update.

Your job:
1. Triage which tickets belong to the incident.
2. Inspect auth logs and release context.
3. Isolate the likely cause (do not invent).
4. Escalate to platform with evidence if needed.
5. Write a customer update that matches the diagnosis.

Multiple investigation paths are valid.`,
  },

  versions: {
    scenarioId: "green-status-page-incident",
    scenarioVersion: "1.0.0",
    engineVersion: "0.1.0",
    competencyModelVersion: "tse-incident-1.0.0",
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
    "logs",
  ],

  constraints: {
    aiPolicy: "ALLOWED",
    externalResourcesPolicy: "CLOSED",
    clipboardPolicy: "TRACKED",
  },

  competencies: [
    {
      id: "triage",
      label: "Triage",
      description: "Separates related incident tickets from unrelated noise.",
      weight: 1.1,
    },
    {
      id: "technical_diagnosis",
      label: "Technical diagnosis",
      description: "Links symptoms to release/log evidence.",
      weight: 1.2,
    },
    {
      id: "information_discovery",
      label: "Information discovery",
      description: "Uses logs, release notes, and people appropriately.",
      weight: 0.9,
    },
    {
      id: "escalation_judgment",
      label: "Escalation judgment",
      description: "Escalates with enough evidence for a fast config revert.",
      weight: 1.1,
    },
    {
      id: "customer_communication",
      label: "Customer communication",
      description: "Writes an update that matches the diagnosis without overclaiming.",
      weight: 1,
    },
    {
      id: "ai_judgment",
      label: "AI judgment",
      description: "Uses AI as an aid and verifies against logs.",
      weight: 0.7,
    },
  ],

  tasks: [
    {
      id: "task_triage",
      title: "Triage the ticket queue",
      description: "Mark which tickets are part of the SSO incident.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["triage"],
      completion: { kind: "WORLD_FLAG", flag: "correct_triage", equals: true },
    },
    {
      id: "task_logs",
      title: "Inspect auth evidence",
      description: "Open auth logs and release notes.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["technical_diagnosis", "information_discovery"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "WORLD_FLAG", flag: "opened_auth_log", equals: true },
          { kind: "WORLD_FLAG", flag: "opened_release_notes", equals: true },
        ],
      },
    },
    {
      id: "task_cause",
      title: "Isolate likely cause",
      description: "Connect failures to R-2214 skew change.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["technical_diagnosis"],
      completion: { kind: "WORLD_FLAG", flag: "identified_release_cause", equals: true },
    },
    {
      id: "task_escalate",
      title: "Escalate with evidence",
      description: "Request skew-tolerance revert with log/release citations.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["escalation_judgment"],
      completion: { kind: "WORLD_FLAG", flag: "escalated_with_evidence", equals: true },
    },
    {
      id: "task_customer",
      title: "Write customer update",
      description: "Scope, likely cause, next action, no password-reset misdirection.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["customer_communication"],
      completion: { kind: "ARTIFACT_EXISTS", artifactKind: "customer_message" },
    },
  ],

  people: skedraSupportPeople,

  resources: [
    {
      id: "res_incident_brief",
      title: "Incident brief",
      kind: "brief",
      initiallyVisible: true,
      summary: "Green status page, SSO failures",
      searchableText: "sso login status page green",
      content: `# Incident brief

Customers report intermittent SSO login failures since ~10:00 UTC.

Public status page is **green**. Password test checks are healthy.

Deliverables: triage, diagnosis, escalation note, customer-safe update.
`,
    },
    {
      id: "res_auth_log",
      title: "Auth log excerpt",
      kind: "log",
      initiallyVisible: true,
      summary: "saml_validate skew errors after deploy",
      searchableText: "saml_validate skew R-2214 assertion",
      onOpenFlags: { opened_auth_log: true },
      content: `# Auth log excerpt

\`\`\`
09:41:12 INFO  deploy complete: R-2214
09:47:03 ERROR saml_validate account=nordwind assertion_not_yet_valid skew=41s
09:52:44 INFO  login ok method=password account=pemble
09:58:19 ERROR saml_validate account=calder assertion_expired skew=67s
10:03:55 ERROR saml_validate account=nordwind assertion_not_yet_valid skew=38s
10:11:30 INFO  login ok method=password account=ostrom-admin
10:19:02 ERROR saml_validate account=ostrom assertion_expired skew=52s
10:26:47 ERROR password_mismatch account=pemble user=j.harmon
\`\`\`
`,
    },
    {
      id: "res_release_notes",
      title: "Release timeline",
      kind: "documentation",
      initiallyVisible: true,
      summary: "R-2214 tightened SAML skew to 30s",
      searchableText: "R-2214 SAML clock skew 300 30 status page password",
      onOpenFlags: { opened_release_notes: true },
      content: `# Recent releases

| Release | Deployed (UTC) | Notes |
| --- | --- | --- |
| R-2212 | Tuesday | Dashboard performance |
| R-2213 | Wednesday | Report export formats |
| R-2214 | **Today 09:41** | Auth hardening: SAML assertion time validation **300s → 30s** |

## Status page

Status checks log in with a **password test account** every 60 seconds. They do **not** use SSO.
`,
    },
    {
      id: "res_runbook",
      title: "SSO incident runbook (excerpt)",
      kind: "documentation",
      initiallyVisible: false,
      summary: "Revealed after log + release opened",
      searchableText: "revert skew config flag",
      content: `# SSO runbook excerpt

If \`saml_validate\` skew errors cluster after an auth release:

1. Confirm password path still healthy (explains green status).
2. Identify release that changed skew tolerance.
3. Escalate for config flag revert (~10 minutes) rather than telling customers to reset passwords.
`,
    },
  ],

  artifacts: [
    {
      id: "art_escalation",
      kind: "escalation_note",
      title: "Escalation to platform",
      required: true,
    },
    {
      id: "art_customer",
      kind: "customer_message",
      title: "Customer status update",
      required: true,
    },
    {
      id: "art_reco",
      kind: "technical_recommendation",
      title: "Internal technical note",
      required: false,
    },
  ],

  tools: [
    { id: "tool_tickets", label: "Tickets", capability: "logs", initiallyUnlocked: true },
    { id: "tool_resources", label: "Resources", capability: "resources", initiallyUnlocked: true },
    { id: "tool_people", label: "People", capability: "internal_chat", initiallyUnlocked: true },
    { id: "tool_customer", label: "Customer", capability: "customer_communication", initiallyUnlocked: true },
    { id: "tool_ai", label: "AI Assistant", capability: "ai_assistant", initiallyUnlocked: true },
    { id: "tool_artifacts", label: "Escalation", capability: "artifact_composer", initiallyUnlocked: true },
  ],

  world: {
    flags: {
      opened_auth_log: false,
      opened_release_notes: false,
      correct_triage: false,
      excluded_unrelated_ticket: false,
      triaged_incident_ticket: false,
      identified_release_cause: false,
      escalated_with_evidence: false,
      misdiagnosed_incident: false,
      candidate_made_unsupported_promise: false,
    },
  },

  events: [
    {
      id: "evt_reveal_runbook",
      label: "Reveal runbook after evidence opened",
      once: true,
      trigger: {
        kind: "ALL",
        triggers: [
          { kind: "WORLD_STATE", flag: "opened_auth_log", equals: true },
          { kind: "WORLD_STATE", flag: "opened_release_notes", equals: true },
        ],
      },
      actions: [
        { kind: "REVEAL_RESOURCE", resourceId: "res_runbook" },
        {
          kind: "SHOW_NOTIFICATION",
          message: "SSO runbook excerpt unlocked",
          tone: "neutral",
        },
      ],
    },
    {
      id: "evt_jordan_nudge",
      label: "CSM asks for customer update",
      once: true,
      trigger: {
        kind: "ALL",
        triggers: [
          { kind: "TIME", afterMs: 6 * 60 * 1000 },
          { kind: "WORLD_STATE", flag: "opened_auth_log", equals: true },
        ],
      },
      actions: [
        {
          kind: "SEND_MESSAGE",
          personId: "person_jordan",
          body: "I need a customer update in the next few minutes. Scope, likely cause, next action, and please don't push password resets if this is SSO.",
        },
        { kind: "CHANGE_TASK_PRIORITY", taskId: "task_customer", priority: "critical" },
      ],
    },
    {
      id: "evt_misdiagnosis_pushback",
      label: "Sam pushes back on password misdiagnosis",
      once: true,
      trigger: { kind: "WORLD_STATE", flag: "misdiagnosed_incident", equals: true },
      actions: [
        {
          kind: "SEND_MESSAGE",
          personId: "person_sam",
          body: "Password path looks fine in the logs. Don't send a password-reset blast, this is clustering on saml_validate after R-2214.",
        },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Platform challenged a password-centric diagnosis",
          tone: "warning",
        },
      ],
    },
  ],

  supportWorkbench: {
    ticketsTitle: "Open tickets",
    logResourceId: "res_auth_log",
    tickets: [
      {
        id: "T-881",
        customer: "Nordwind Health",
        reportedAt: "10:02 UTC",
        summary: "Staff intermittently can't log in via company SSO",
        severity: "high",
        belongsToIncident: true,
      },
      {
        id: "T-882",
        customer: "Calder Logistics",
        reportedAt: "10:15 UTC",
        summary: "SSO login fails about half the time; retry sometimes works",
        severity: "high",
        belongsToIncident: true,
      },
      {
        id: "T-883",
        customer: "Pemble & Co",
        reportedAt: "10:21 UTC",
        summary: "One user gets 'wrong password'; she recently changed it",
        severity: "medium",
        belongsToIncident: false,
      },
      {
        id: "T-884",
        customer: "Ostrom Manufacturing",
        reportedAt: "10:34 UTC",
        summary: "Whole team locked out through corporate identity provider",
        severity: "critical",
        belongsToIncident: true,
      },
    ],
  },

  aiAssistant: {
    modelLabel: "Fydell Assistant (mock)",
    fallbackResponse:
      "Compare ticket themes to auth log errors and today's release notes. Password-only issues may be unrelated when status checks use password accounts.",
    responses: [
      {
        id: "ai_saml",
        whenPromptIncludes: ["saml", "skew", "r-2214", "release"],
        response:
          "R-2214 tightened SAML skew from 300s to 30s. Skew errors above 30s after 09:41 point to IdP clock drift, not a global password outage.",
      },
      {
        id: "ai_triage",
        whenPromptIncludes: ["ticket", "triage", "t-883"],
        response:
          "T-881, T-882, and T-884 look SSO/IdP related. T-883 is a single-user password mismatch after a password change, usually unrelated.",
      },
      {
        id: "ai_customer",
        whenPromptIncludes: ["customer", "update", "status"],
        response:
          "Say: SSO validation tightened after a release; password login may still work; we're reverting the skew tolerance; no need for mass password resets.",
      },
    ],
  },
};
