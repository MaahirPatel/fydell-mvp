import type { SimulationScenarioDefinition } from "../../types";
import { northstarPeople } from "./personas";

/**
 * Assembled SimulationScenarioDefinition for Northstar Health integration failure.
 *
 * Multiple valid investigation paths:
 * A) Read docs first → spot UUID requirement → fix → succeed
 * B) Execute immediately → 422 → ask eng → discover deploy → fix
 * C) Execute → 422 → open schema docs → fix without asking eng
 *
 * Failure states: 401, 404, 400, 422 (missing/invalid field), 429
 * Dynamic events: escalation, scope concern, resource reveals, task reprioritization
 */
export const northstarIntegrationScenario: SimulationScenarioDefinition = {
  metadata: {
    id: "northstar-integration",
    slug: "northstar-integration",
    title: "Northstar Health — CRM sync failure before board demo",
    description:
      "Northstar Health is synchronizing enterprise accounts from its CRM into Acme Cloud. Auth works in Postman, but production requests intermittently return validation failures. Board demo is tomorrow.",
    roleKey: "solutions_engineer",
    estimatedDurationMinutes: 25,
    timeLimitSeconds: 25 * 60,
    difficulty: "intermediate",
    companyName: "Acme Cloud (customer: Northstar Health)",
    instructions: `You are the Solutions Engineer on the Northstar Health account.

Situation:
- CRM → Acme Cloud account sync is failing intermittently in production.
- Authentication succeeds in Postman with the same token.
- Customer board demo is tomorrow morning.
- Their SA suspects contact ownership; engineering suspects request schema.

Your job:
1. Understand the customer situation.
2. Investigate the integration failure.
3. Determine the likely root cause.
4. Produce/execute a correction.
5. Communicate a customer-safe update.
6. Leave a concise technical recommendation for leadership.

Multiple investigation paths are valid. Do not chase a single "correct sequence" — arrive at a defensible diagnosis and artifacts.`,
  },

  versions: {
    scenarioId: "northstar-integration",
    scenarioVersion: "1.0.0",
    engineVersion: "0.1.0",
    competencyModelVersion: "se-se-1.0.0",
    evidenceDerivationVersion: "1.0.0",
    analysisVersion: "1.0.0",
  },

  capabilities: [
    "tasks",
    "resources",
    "internal_chat",
    "customer_communication",
    "ai_assistant",
    "code_execution",
    "api_execution",
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
      id: "api_troubleshooting",
      label: "API troubleshooting",
      description: "Diagnoses API failures using status codes, payloads, and docs.",
      weight: 1.2,
    },
    {
      id: "information_discovery",
      label: "Information discovery",
      description: "Seeks the right evidence from people and resources.",
      weight: 1,
    },
    {
      id: "customer_communication",
      label: "Customer communication",
      description: "Communicates clearly without unsupported promises.",
      weight: 1,
    },
    {
      id: "ai_judgment",
      label: "AI judgment",
      description: "Uses AI as a tool; verifies and edits rather than blind-accepting.",
      weight: 0.8,
    },
    {
      id: "stakeholder_judgment",
      label: "Stakeholder judgment",
      description: "Balances urgency, scope, and technical risk.",
      weight: 1,
    },
  ],

  tasks: [
    {
      id: "task_understand",
      title: "Understand the customer situation",
      description: "Read the customer brief and identify constraints, demo timing, and conflicting theories.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["information_discovery"],
      completion: {
        kind: "TELEMETRY",
        eventType: "RESOURCE_OPENED",
        minCount: 1,
      },
    },
    {
      id: "task_investigate",
      title: "Investigate the integration failure",
      description: "Reproduce or inspect the failure via API Console / docs / engineering.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["api_troubleshooting"],
      completion: {
        kind: "WORLD_FLAG",
        flag: "candidate_has_seen_422",
        equals: true,
      },
    },
    {
      id: "task_root_cause",
      title: "Determine the likely root cause",
      description: "Reach a defensible diagnosis (schema validation vs ownership vs auth).",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["api_troubleshooting", "information_discovery"],
      completion: {
        kind: "ANY",
        rules: [
          { kind: "WORLD_FLAG", flag: "candidate_knows_about_deployment", equals: true },
          { kind: "WORLD_FLAG", flag: "api_succeeded", equals: true },
        ],
      },
    },
    {
      id: "task_fix",
      title: "Produce and execute a correction",
      description: "Correct the payload/script and obtain a successful API response.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["api_troubleshooting"],
      completion: { kind: "WORLD_FLAG", flag: "api_succeeded", equals: true },
    },
    {
      id: "task_customer_update",
      title: "Communicate an update to the customer",
      description: "Send a customer-safe status update that avoids unsupported promises.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["customer_communication"],
      completion: { kind: "ARTIFACT_EXISTS", artifactKind: "customer_message" },
    },
    {
      id: "task_leadership",
      title: "Prepare a technical explanation for leadership",
      description: "Write a concise technical recommendation for your manager.",
      initialStatus: "AVAILABLE",
      priority: "normal",
      competencyIds: ["stakeholder_judgment"],
      completion: { kind: "ARTIFACT_EXISTS", artifactKind: "technical_recommendation" },
    },
    {
      id: "task_escalation_response",
      title: "Respond to customer escalation",
      description: "Appears if the customer escalates — de-escalate with facts.",
      initialStatus: "LOCKED",
      priority: "critical",
      competencyIds: ["customer_communication", "stakeholder_judgment"],
      completion: {
        kind: "ALL",
        rules: [
          { kind: "WORLD_FLAG", flag: "customer_escalated", equals: true },
          { kind: "ARTIFACT_EXISTS", artifactKind: "customer_message" },
        ],
      },
    },
  ],

  people: northstarPeople,

  resources: [
    {
      id: "res_customer_brief",
      title: "Customer brief — Northstar Health",
      kind: "brief",
      initiallyVisible: true,
      summary: "Account context, demo timing, conflicting theories",
      searchableText: "board demo CRM sync ownership schema",
      content: `# Customer brief — Northstar Health

**Account:** Northstar Health (enterprise healthcare)
**Integration:** CRM → Acme Cloud account synchronization
**Demo:** Board presentation tomorrow 10:00 local

## What they report
- Authentication succeeds in Postman with the production Bearer token.
- Production sync jobs intermittently return validation failures.
- Their solutions architect believes **contact ownership** mapping is wrong.
- Engineering suspects the **request schema**.

## Constraints
- No unsupported custom sync paths.
- Demo dataset must sync cleanly overnight.
- Priya Shah (customer TL) is primary technical contact.
- Marcus Chen (AE) is commercially accountable.
`,
    },
    {
      id: "res_api_docs",
      title: "Acme Cloud Accounts API — documentation",
      kind: "documentation",
      initiallyVisible: true,
      summary: "Endpoints, auth, rate limits — contains a realistic ambiguity",
      searchableText: "POST /v1/accounts Authorization rate limit",
      content: `# Accounts API

## Authentication
All requests require:
\`Authorization: Bearer <token>\`

## Create / upsert account
\`POST /v1/accounts\`

### Body (legacy examples still shown)
\`\`\`json
{
  "customer_id": 18402,
  "owner_email": "alex@northstar.health",
  "account_name": "Northstar Health"
}
\`\`\`

> **Note (outdated section):** Older guides show \`customer_id\` as an integer.
> Current validation rules are maintained by the platform team — see schema reference.

## Rate limits
120 requests / minute per token. Bursting can return 429.

## Errors
- \`401\` Unauthorized
- \`404\` Unknown path
- \`422\` INVALID_FIELD — body failed schema validation
`,
    },
    {
      id: "res_auth_docs",
      title: "Authentication documentation",
      kind: "documentation",
      initiallyVisible: true,
      summary: "Token usage and common auth failures",
      searchableText: "Bearer token 401 unauthorized",
      content: `# Authentication

Use the Bearer token issued for the customer workspace.

Common mistakes:
- Missing \`Authorization\` header → 401
- Using query-string tokens (deprecated) → 401

If Postman succeeds with the same token, auth is unlikely to be the primary production defect.
`,
    },
    {
      id: "res_schema",
      title: "Request schema reference",
      kind: "schema",
      initiallyVisible: true,
      summary: "Field types for POST /v1/accounts",
      searchableText: "customer_id uuid owner_email account_name",
      content: `# Request schema — POST /v1/accounts

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| customer_id | **uuid (string)** | yes | Must be UUID. Numeric IDs no longer coerce. |
| owner_email | email string | yes | |
| account_name | string | yes | |

### Breaking change
Platform schema validation was tightened. Integer \`customer_id\` values that previously coerced will now fail with:

\`\`\`json
{ "error": "INVALID_FIELD", "field": "customer_id", "expected": "uuid" }
\`\`\`
`,
    },
    {
      id: "res_payload",
      title: "Customer payload sample",
      kind: "payload",
      initiallyVisible: true,
      summary: "Payload currently sent by Northstar's job",
      searchableText: "18402 customer_id payload",
      content: `{
  "customer_id": 18402,
  "owner_email": "alex@northstar.health",
  "account_name": "Northstar Health"
}
`,
    },
    {
      id: "res_deploy_notes",
      title: "Deployment notes — schema validation",
      kind: "markdown",
      initiallyVisible: false,
      summary: "Revealed after engineering discloses yesterday's deploy",
      searchableText: "schema validation deploy uuid",
      content: `# Deployment notes (yesterday 15:40 UTC)

- Service: \`accounts-validation\`
- Change: enforce UUID for \`customer_id\`; remove integer coercion
- Rollout: 100%
- Expected client impact: jobs still sending numeric IDs receive 422 INVALID_FIELD

Rollback is possible but not preferred before the customer demo if clients can correct payloads.
`,
    },
    {
      id: "res_server_log",
      title: "Server validation log excerpt",
      kind: "log",
      initiallyVisible: false,
      summary: "Revealed after request ID is known / asked for logs",
      searchableText: "INVALID_FIELD customer_id request_id",
      content: `2026-08-16T19:12:04.221Z level=ERROR service=accounts-validation
request_id=req_PLACEHOLDER
error=INVALID_FIELD field=customer_id expected=uuid received=number value=18402
hint=integer_coercion_removed_in_yesterday_deploy
`,
    },
    {
      id: "res_support_thread",
      title: "Prior support conversation (excerpt)",
      kind: "markdown",
      initiallyVisible: true,
      summary: "Includes a red herring about ownership",
      searchableText: "ownership OWNER_MISMATCH",
      content: `# Prior thread (last week)

**SA:** We saw OWNER_MISMATCH once in staging when owner_email was blank.

**Eng:** That code path is separate from INVALID_FIELD. Don't conflate them.

**SA:** Still, ownership feels fragile on this account.

*(Useful context, but may not explain today's intermittent validation failures.)*
`,
    },
  ],

  artifacts: [
    {
      id: "art_code",
      kind: "integration_code",
      title: "Integration script",
      required: false,
      description: "Working integration script / payload correction",
    },
    {
      id: "art_api",
      kind: "api_request",
      title: "API request evidence",
      required: false,
    },
    {
      id: "art_customer",
      kind: "customer_message",
      title: "Customer update",
      required: true,
      description: "Customer-safe status update",
    },
    {
      id: "art_reco",
      kind: "technical_recommendation",
      title: "Technical recommendation",
      required: true,
      description: "Leadership-facing technical explanation",
    },
    {
      id: "art_exec",
      kind: "executive_summary",
      title: "Executive summary",
      required: false,
    },
  ],

  tools: [
    { id: "tool_docs", label: "Documentation", capability: "documentation", initiallyUnlocked: true },
    { id: "tool_code", label: "Integration script", capability: "code_execution", initiallyUnlocked: true },
    { id: "tool_api", label: "API Console", capability: "api_execution", initiallyUnlocked: true },
    { id: "tool_chat", label: "People", capability: "internal_chat", initiallyUnlocked: true },
    { id: "tool_customer", label: "Customer message", capability: "customer_communication", initiallyUnlocked: true },
    { id: "tool_ai", label: "AI Assistant", capability: "ai_assistant", initiallyUnlocked: true },
    { id: "tool_artifacts", label: "Artifacts", capability: "artifact_composer", initiallyUnlocked: true },
    { id: "tool_logs", label: "Logs", capability: "logs", initiallyUnlocked: false },
  ],

  world: {
    flags: {
      candidate_has_seen_422: false,
      candidate_saw_401: false,
      candidate_saw_404: false,
      candidate_saw_429: false,
      candidate_saw_malformed_json: false,
      candidate_knows_about_deployment: false,
      candidate_has_request_id: false,
      candidate_cleared_auth: false,
      candidate_made_unsupported_promise: false,
      api_succeeded: false,
      customer_escalated: false,
      scope_concern_raised: false,
      request_id_available: false,
      last_api_status: null,
      last_request_id: null,
      invalid_field: null,
      rate_limit_cleared: false,
    },
  },

  events: [
    {
      id: "evt_reveal_deploy_notes",
      label: "Reveal deployment notes after deploy disclosure",
      once: true,
      trigger: { kind: "WORLD_STATE", flag: "candidate_knows_about_deployment", equals: true },
      actions: [
        { kind: "REVEAL_RESOURCE", resourceId: "res_deploy_notes" },
        {
          kind: "SHOW_NOTIFICATION",
          message: "New resource available: Deployment notes — schema validation",
          tone: "success",
        },
        { kind: "UNLOCK_TOOL", toolId: "tool_logs" },
      ],
    },
    {
      id: "evt_reveal_server_log",
      label: "Reveal server log when request id known",
      once: true,
      trigger: {
        kind: "ANY",
        triggers: [
          { kind: "WORLD_STATE", flag: "candidate_has_request_id", equals: true },
          { kind: "WORLD_STATE", flag: "request_id_available", equals: true },
        ],
      },
      actions: [
        { kind: "REVEAL_RESOURCE", resourceId: "res_server_log" },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Server validation log excerpt is now available",
          tone: "neutral",
        },
      ],
    },
    {
      id: "evt_customer_escalation",
      label: "Customer escalates under time pressure",
      once: true,
      trigger: {
        kind: "ANY",
        triggers: [
          { kind: "TIME", afterMs: 6 * 60 * 1000 },
          {
            kind: "ALL",
            triggers: [
              { kind: "WORLD_STATE", flag: "candidate_has_seen_422", equals: true },
              { kind: "TIME", afterMs: 3 * 60 * 1000 },
            ],
          },
        ],
      },
      actions: [
        { kind: "UPDATE_WORLD_STATE", flag: "customer_escalated", value: true },
        {
          kind: "ADD_INBOX_ITEM",
          personId: "person_priya",
          subject: "Escalation — board demo at risk",
          body: "We need a clear status in the next hour. If this isn't fixed overnight, the board demo fails. Please confirm root cause and whether we have a supported path — not a guess.",
        },
        {
          kind: "CREATE_TASK",
          task: {
            id: "task_escalation_response",
            title: "Respond to customer escalation",
            description: "De-escalate with facts. Avoid unsupported promises.",
            initialStatus: "AVAILABLE",
            priority: "critical",
            competencyIds: ["customer_communication", "stakeholder_judgment"],
            completion: { kind: "ARTIFACT_EXISTS", artifactKind: "customer_message" },
          },
        },
        { kind: "CHANGE_TASK_PRIORITY", taskId: "task_customer_update", priority: "critical" },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Customer escalation received from Priya Shah",
          tone: "warning",
        },
        {
          kind: "EMIT_SCENARIO_EVENT",
          scenarioKind: "CUSTOMER_ESCALATION",
          label: "Customer escalated before board demo",
        },
      ],
    },
    {
      id: "evt_scope_concern",
      label: "AE raises scope concern on unsupported promise",
      once: true,
      trigger: { kind: "WORLD_STATE", flag: "candidate_made_unsupported_promise", equals: true },
      actions: [
        { kind: "UPDATE_WORLD_STATE", flag: "scope_concern_raised", value: true },
        {
          kind: "SEND_MESSAGE",
          personId: "person_marcus",
          subject: "Scope concern",
          body: "I saw language that sounded like a guaranteed overnight production fix. We cannot invent an unsupported path. Please keep the customer update factual: diagnosis, supported fix, residual risk.",
        },
        {
          kind: "EMIT_SCENARIO_EVENT",
          scenarioKind: "SCOPE_CONCERN",
          label: "AE raised scope concern",
        },
        {
          kind: "SHOW_NOTIFICATION",
          message: "Marcus Chen raised a scope concern",
          tone: "risk",
        },
      ],
    },
    {
      id: "evt_success_notify",
      label: "Notify on API success",
      once: true,
      trigger: { kind: "WORLD_STATE", flag: "api_succeeded", equals: true },
      actions: [
        {
          kind: "SHOW_NOTIFICATION",
          message: "API request succeeded — capture your customer update and technical recommendation",
          tone: "success",
        },
        { kind: "CHANGE_TASK_PRIORITY", taskId: "task_customer_update", priority: "critical" },
      ],
    },
    {
      id: "evt_manager_nudge",
      label: "Manager nudges for written artifacts",
      once: true,
      trigger: {
        kind: "ALL",
        triggers: [
          { kind: "WORLD_STATE", flag: "api_succeeded", equals: true },
          { kind: "TIME", afterMs: 90 * 1000 },
        ],
      },
      actions: [
        {
          kind: "SEND_MESSAGE",
          personId: "person_jordan",
          body: "If you've confirmed a fix path, send me the technical recommendation and a customer-safe update before you close the loop with Priya.",
        },
      ],
    },
  ],

  technicalRuntime: {
    apiBasePath: "/v1",
    authHeader: "Bearer demo-token",
    endpoints: [
      {
        method: "POST",
        path: "/v1/accounts",
        requiredFields: ["customer_id", "owner_email", "account_name"],
        fieldTypes: {
          customer_id: "uuid",
          owner_email: "email",
          account_name: "string",
        },
        successStatus: 201,
        successBody: {
          id: "acct_northstar_01",
          status: "created",
          message: "Account upserted",
        },
      },
    ],
  },

  aiAssistant: {
    modelLabel: "Fydell Assistant (mock)",
    fallbackResponse:
      "I can help you reason about the failure. Share the status code or ask about auth vs schema vs ownership. I won't invent production facts — verify against docs and engineering.",
    responses: [
      {
        id: "ai_422",
        whenPromptIncludes: ["422", "invalid_field"],
        response:
          "A 422 INVALID_FIELD usually means the body failed schema validation. Compare the payload field types to the current schema reference — especially customer_id. Auth succeeding in Postman makes 401 less likely as the primary cause.",
      },
      {
        id: "ai_auth",
        whenPromptIncludes: ["401", "auth"],
        response:
          "If Postman succeeds with the same Bearer token, treat auth as cleared unless you can reproduce a 401. Focus on the validation error body.",
      },
      {
        id: "ai_ownership",
        whenPromptIncludes: ["ownership"],
        response:
          "OWNER_MISMATCH is a different code path from INVALID_FIELD. Don't assume ownership is the cause unless you see that error code.",
      },
      {
        id: "ai_uuid",
        whenPromptIncludes: ["uuid", "customer_id"],
        response:
          "If customer_id is numeric in the payload but the schema expects UUID, that alone can explain intermittent failures after a validation tighten-up.",
      },
      {
        id: "ai_customer_msg",
        whenPromptIncludes: ["customer", "email", "update"],
        response:
          "Keep the customer update factual: what failed, what you ruled out, what you changed, residual risk, and next check. Avoid guaranteeing overnight production outcomes you haven't verified.",
      },
    ],
  },
};

