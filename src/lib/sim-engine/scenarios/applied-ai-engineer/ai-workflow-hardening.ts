import type { SimulationScenarioDefinition } from "../../types";

/**
 * Honest fixture-first boundary for aai-workflow-hardening-v1:
 * - The current generic workbench has one proposal-oriented code buffer, not an
 *   editable multi-file workspace.
 * - runCode() performs structural integration checks; it does not execute this
 *   scenario's TypeScript or derive eval metrics from candidate mutations.
 * - Event firing is exactly-once within a runtime instance, but fired event IDs
 *   are not persisted across SimulationRuntime.restore().
 *
 * The definition therefore supplies canonical source/eval fixtures and typed
 * artifacts without claiming that the existing runtime executes arbitrary edits.
 * LATENCY_001 is still modeled honestly: a deterministic, once-only world event
 * triggered by a saved architecture_decision artifact.
 */
export const APPLIED_AI_RUNTIME_GAPS = [
  "Candidate source/config/eval resources are read-only fixtures; the generic code buffer is a proposal surface.",
  "The generic code runner does not execute the supplied TypeScript or calculate mutation-dependent eval results.",
  "Exactly-once event IDs are in-memory and are not preserved by SimulationRuntime.restore().",
] as const;

export const aiWorkflowHardeningScenario: SimulationScenarioDefinition = {
  metadata: {
    id: "ai-workflow-hardening",
    slug: "ai-workflow-hardening",
    title: "Harden an enterprise AI workflow",
    description:
      "A production implementation-planning workflow performs well in demos but has policy, retry, side-effect, evaluation, cost, and latency failures.",
    roleKey: "applied_ai_engineer",
    estimatedDurationMinutes: 45,
    timeLimitSeconds: 45 * 60,
    difficulty: "advanced",
    companyName: "Lantern Systems",
    instructions: `You inherit a small TypeScript service that turns enterprise customer material into a structured implementation plan.

The prototype looks good in sales demonstrations, but production traces show schema failures, duplicate writes, unsafe fallback behavior, and high latency. Inspect the requirements, source/config fixtures, evals, traces, and baseline metrics. Record assumptions, propose supported changes, expand the evaluation set, and run the available deterministic checks.

Commit a preliminary architecture decision before finalizing your approach. Production may release a changed constraint after that commitment. Respond with measured reasoning, preserve critical-case quality and deterministic authorization, and submit a production recommendation that names residual risk.

Multiple solutions are valid. No named framework or scripted investigation sequence is required.`,
  },

  versions: {
    scenarioId: "ai-workflow-hardening",
    scenarioVersion: "aai-workflow-hardening-v1",
    engineVersion: "0.1.0",
    competencyModelVersion: "aai-proof-v1",
    evidenceDerivationVersion: "aai-evidence-v1",
    analysisVersion: "aai-analysis-v1",
  },

  capabilities: [
    "tasks",
    "resources",
    "ai_assistant",
    "code_execution",
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
      id: "PR-AI-01",
      label: "Problem decomposition",
      description: "Separates product, model, data, orchestration, and operational failure modes.",
      weight: 0.8,
    },
    {
      id: "PR-AI-02",
      label: "AI system architecture",
      description: "Places probabilistic and deterministic components at defensible boundaries.",
      weight: 1,
    },
    {
      id: "PR-AI-03",
      label: "LLM and tool orchestration",
      description: "Designs safe model, tool, validation, fallback, and side-effect flow.",
      weight: 0.9,
    },
    {
      id: "PR-AI-04",
      label: "Evaluation engineering",
      description: "Builds representative evals and exposes critical slices instead of aggregate-only quality.",
      weight: 1.3,
    },
    {
      id: "PR-AI-05",
      label: "Reliability and failure recovery",
      description: "Handles retries, idempotency, semantic validation, and human escalation.",
      weight: 1.3,
    },
    {
      id: "PR-AI-06",
      label: "Software engineering quality",
      description: "Produces maintainable, testable implementation proposals within the runtime boundary.",
      weight: 0.6,
    },
    {
      id: "PR-AI-07",
      label: "Cost and latency judgment",
      description: "Measures and reasons about model calls, context, p50/p95 latency, and cost.",
      weight: 1.2,
    },
    {
      id: "PR-AI-08",
      label: "Product and model judgment",
      description: "Protects enterprise requirements while making evidence-backed model tradeoffs.",
      weight: 1.2,
    },
  ],

  tasks: [
    {
      id: "task_inspect_system",
      title: "Inspect the workflow and requirements",
      description: "Open source/config plus product or security requirements; record important assumptions.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["PR-AI-01", "PR-AI-02", "PR-AI-08"],
      completion: { kind: "TELEMETRY", eventType: "RESOURCE_OPENED", minCount: 2 },
    },
    {
      id: "task_inspect_failures",
      title: "Investigate production failures",
      description: "Inspect failed traces and baseline metrics before selecting changes.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["PR-AI-01", "PR-AI-05", "PR-AI-07"],
      completion: { kind: "WORLD_FLAG", flag: "failed_trace_inspected", equals: true },
    },
    {
      id: "task_baseline",
      title: "Run the baseline checks",
      description: "Use the generic code runner as a labeled structural check of your current proposal.",
      initialStatus: "AVAILABLE",
      priority: "high",
      competencyIds: ["PR-AI-04", "PR-AI-06"],
      completion: { kind: "TELEMETRY", eventType: "CODE_RUN", minCount: 1 },
    },
    {
      id: "task_improve_evals",
      title: "Expand critical-case evaluation",
      description: "Save an eval-case artifact covering policy, malformed output, retry, or duplicate-side-effect risk.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["PR-AI-04", "PR-AI-05"],
      completion: { kind: "ARTIFACT_EXISTS", artifactKind: "eval_case_set" },
    },
    {
      id: "task_commit_architecture",
      title: "Commit a preliminary architecture decision",
      description: "Record the proposed model/deterministic boundary, reliability changes, and evidence plan.",
      initialStatus: "AVAILABLE",
      priority: "critical",
      competencyIds: ["PR-AI-02", "PR-AI-03", "PR-AI-05", "PR-AI-08"],
      completion: { kind: "ARTIFACT_EXISTS", artifactKind: "architecture_decision" },
    },
    {
      id: "task_respond_latency",
      title: "Respond to the changed production constraint",
      description: "After LATENCY_001 is released, revise the approach without regressing quality or authorization.",
      initialStatus: "LOCKED",
      priority: "critical",
      dependsOn: ["task_commit_architecture"],
      competencyIds: ["PR-AI-02", "PR-AI-07", "PR-AI-08"],
      completion: {
        kind: "ALL",
        rules: [
          { kind: "WORLD_FLAG", flag: "latency_constraint_released", equals: true },
          { kind: "TELEMETRY", eventType: "CODE_RUN", minCount: 2 },
        ],
      },
    },
    {
      id: "task_recommend",
      title: "Submit a production recommendation",
      description: "State measured evidence, ship/no-ship judgment, residual risks, and follow-up validation.",
      initialStatus: "LOCKED",
      priority: "critical",
      dependsOn: ["task_respond_latency"],
      competencyIds: ["PR-AI-04", "PR-AI-05", "PR-AI-07", "PR-AI-08"],
      completion: { kind: "ARTIFACT_EXISTS", artifactKind: "production_recommendation" },
    },
  ],

  people: [
    {
      id: "person_maya",
      name: "Maya Ortiz",
      title: "Product Lead",
      channel: "internal",
      objectives: [
        "Ship a trustworthy enterprise workflow",
        "Preserve critical-case quality and clear escalation behavior",
      ],
      constraints: ["Will not accept irreversible actions without deterministic authorization"],
      communicationStyle: "Product-focused, concise, asks for evidence behind tradeoffs.",
      avatarInitials: "MO",
      knowledge: [
        {
          id: "maya_product",
          statement:
            "Missing required customer information should route to human review, never a confident synthetic plan.",
        },
        {
          id: "maya_latency",
          statement: "A changed latency requirement exists but is not disclosable before architecture commitment.",
          hidden: true,
          disclosure: {
            whenAskedAbout: ["ask_status", "request_clarification"],
            requiresWorldFlags: ["latency_constraint_released"],
          },
        },
      ],
    },
    {
      id: "person_eli",
      name: "Eli Grant",
      title: "Staff Platform Engineer",
      channel: "internal",
      objectives: ["Prevent duplicate side effects", "Keep traces auditable and retries bounded"],
      constraints: ["No paid provider or arbitrary network access in this fixture"],
      communicationStyle: "Technical and direct; distinguishes observed traces from hypotheses.",
      avatarInitials: "EG",
      knowledge: [
        {
          id: "eli_timeout",
          statement:
            "trace-024 timed out after the write completed; the retry used no stable idempotency key.",
          hidden: true,
          disclosure: { whenAskedAbout: ["ask_logs", "ask_evidence", "request_clarification"] },
        },
        {
          id: "eli_runtime",
          statement:
            "The walking slice runs deterministic synthetic fixtures and does not execute arbitrary candidate TypeScript.",
        },
      ],
    },
  ],

  resources: [
    {
      id: "res_readme",
      title: "README.md",
      kind: "markdown",
      initiallyVisible: true,
      summary: "Service overview and local fixture commands",
      searchableText: "workflow implementation plan tests eval architecture",
      content: `# Implementation-plan workflow

Converts a customer document plus account configuration into a typed implementation plan.

Flow: classify → model-selected tool → tool call → plan generation → JSON validation → store plan and trace.

Fixture commands:
- \`npm test\` validates orchestration contracts.
- \`npm run eval\` runs eight synthetic cases.

This simulation does not call a paid model provider.`,
    },
    {
      id: "res_workflow",
      title: "src/workflow.ts",
      kind: "documentation",
      initiallyVisible: true,
      summary: "Current TypeScript orchestration",
      searchableText: "classify selectTool generatePlan retry validate store",
      content: `export async function buildPlan(input: WorkflowInput): Promise<Plan> {
  const classification = await model.classify(input.document, input.account);
  const selectedTool = await model.selectTool(classification, input.document, input.account);
  const toolResult = await retry(() => tools.execute(selectedTool, input));
  const plan = await model.generatePlan({
    classification,
    toolResult,
    document: input.document,
    account: input.account,
  });
  const parsed = PlanSchema.parse(JSON.parse(plan.text));
  await store.write(parsed);
  return parsed;
}`,
    },
    {
      id: "res_models",
      title: "config/models.json",
      kind: "json",
      initiallyVisible: true,
      summary: "Model choices and context limits",
      searchableText: "planner router context timeout cost model",
      content: `{
  "classifier": { "model": "atlas-large", "timeoutMs": 8000 },
  "toolRouter": { "model": "atlas-large", "timeoutMs": 8000 },
  "planner": { "model": "atlas-large", "maxContextTokens": 24000, "timeoutMs": 12000 },
  "fallback": { "mode": "best_effort_plan", "confidence": "high" }
}`,
    },
    {
      id: "res_workflow_config",
      title: "config/workflow.json",
      kind: "json",
      initiallyVisible: true,
      summary: "Retry, routing, and tracing configuration",
      searchableText: "retry routing traces idempotency prompt version",
      content: `{
  "routing": "model",
  "maxAttempts": 3,
  "retryOn": ["timeout", "rate_limit", "validation_error"],
  "idempotencyKey": null,
  "traceFields": ["request_id", "model", "latency_ms"],
  "sharedContext": true
}`,
    },
    {
      id: "res_schema",
      title: "src/schema.ts",
      kind: "schema",
      initiallyVisible: true,
      summary: "JSON shape validation without account-policy semantics",
      searchableText: "zod region allowed semantic implementation plan",
      content: `export const PlanSchema = z.object({
  workflowType: z.enum(["standard", "regulated"]),
  region: z.string(),
  steps: z.array(z.object({
    action: z.string(),
    owner: z.string(),
  })).min(1),
  requiresHumanReview: z.boolean(),
});

// Shape is checked, but region is not compared with account.allowedRegions.`,
    },
    {
      id: "res_retry",
      title: "src/retry-policy.ts",
      kind: "documentation",
      initiallyVisible: true,
      summary: "Retries all thrown failures uniformly",
      searchableText: "retry permanent transient validation idempotency timeout",
      content: `export async function retry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      await sleep(250 * 2 ** attempt);
    }
  }
  throw lastError;
}`,
    },
    {
      id: "res_eval_cases",
      title: "eval/cases.json",
      kind: "json",
      initiallyVisible: true,
      summary: "Eight happy-path synthetic evaluation cases",
      searchableText: "eval cases quality success enterprise policy critical",
      content: `{
  "fixtureVersion": "eval-v1",
  "cases": [
    { "id": "standard-us-01", "expectedType": "standard", "allowedRegions": ["us-east-1"] },
    { "id": "standard-eu-02", "expectedType": "standard", "allowedRegions": ["eu-west-1"] },
    { "id": "regulated-us-03", "expectedType": "regulated", "allowedRegions": ["us-east-1"] },
    { "id": "regulated-eu-04", "expectedType": "regulated", "allowedRegions": ["eu-west-1"] },
    { "id": "standard-us-05", "expectedType": "standard", "allowedRegions": ["us-west-2"] },
    { "id": "standard-eu-06", "expectedType": "standard", "allowedRegions": ["eu-central-1"] },
    { "id": "regulated-us-07", "expectedType": "regulated", "allowedRegions": ["us-west-2"] },
    { "id": "regulated-eu-08", "expectedType": "regulated", "allowedRegions": ["eu-central-1"] }
  ]
}`,
    },
    {
      id: "res_graders",
      title: "eval/graders.ts",
      kind: "documentation",
      initiallyVisible: true,
      summary: "Aggregate-only quality grader",
      searchableText: "grader aggregate critical slice schema semantic side effect",
      content: `export function grade(results: EvalResult[]) {
  const passed = results.filter((result) => result.schemaValid && result.typeCorrect).length;
  return { quality: passed / results.length };
}

// No critical-policy slice, semantic-region check, duplicate-write check,
// abstention check, or per-case latency/cost explanation.`,
    },
    {
      id: "res_product_requirements",
      title: "requirements/product-brief.md",
      kind: "brief",
      initiallyVisible: true,
      summary: "Candidate-facing product acceptance requirements",
      searchableText: "typed plan human review auditable trace quality requirement",
      content: `# Product requirements

- Produce a typed implementation plan.
- Retain an auditable trace.
- Tolerate transient provider failure.
- Escalate when required information is absent.
- Preserve critical-case quality.
- Support multiple valid implementation approaches.
- Do not optimize aggregate quality by hiding critical-case regressions.`,
    },
    {
      id: "res_security_requirements",
      title: "requirements/security-and-data.md",
      kind: "brief",
      initiallyVisible: true,
      summary: "Authorization, residency, and trace constraints",
      searchableText: "irreversible authorization allowed region residency trace prompt config",
      content: `# Security and data requirements

1. Never execute an irreversible customer action without deterministic authorization.
2. A generated plan may reference only regions in account.allowedRegions.
3. Traces must include prompt version, config version, selected model, tool, and retry reason.
4. Customer source material must not be sent to unapproved tools or providers.`,
    },
    {
      id: "res_trace_schema",
      title: "traces/trace-017-schema-failure.json",
      kind: "log",
      initiallyVisible: true,
      summary: "Planner returned malformed JSON after successful tool execution",
      searchableText: "schema failure malformed json validation retry permanent",
      onOpenFlags: { failed_trace_inspected: true },
      content: `{
  "traceId": "trace-017",
  "classificationMs": 1420,
  "routingMs": 1310,
  "toolMs": 640,
  "plannerMs": 5980,
  "outcome": "schema_failure",
  "error": "Unexpected token } at position 481",
  "retryReason": null,
  "promptVersion": null,
  "configVersion": null
}`,
    },
    {
      id: "res_trace_duplicate",
      title: "traces/trace-024-duplicate-write.json",
      kind: "log",
      initiallyVisible: true,
      summary: "Timed-out write retried without an idempotency key",
      searchableText: "duplicate write timeout retry idempotency side effect",
      onOpenFlags: { failed_trace_inspected: true },
      content: `{
  "traceId": "trace-024",
  "tool": "write_implementation_record",
  "attempts": [
    { "attempt": 1, "result": "timeout_after_commit", "latencyMs": 4100 },
    { "attempt": 2, "result": "created", "latencyMs": 920 }
  ],
  "idempotencyKey": null,
  "duplicateRecords": 2
}`,
    },
    {
      id: "res_trace_slow",
      title: "traces/trace-031-slow-success.json",
      kind: "log",
      initiallyVisible: true,
      summary: "Successful request dominated by sequential model calls and shared context",
      searchableText: "slow latency sequential model calls context tokens p95",
      onOpenFlags: { failed_trace_inspected: true },
      content: `{
  "traceId": "trace-031",
  "outcome": "success",
  "modelCalls": 3,
  "contextTokens": [18200, 19400, 23100],
  "stagesMs": { "classify": 1680, "route": 1490, "tool": 730, "plan": 7240 },
  "totalMs": 11140,
  "estimatedCostUsd": 0.24
}`,
    },
    {
      id: "res_baseline",
      title: "metrics/baseline.json",
      kind: "json",
      initiallyVisible: true,
      summary: "Stable synthetic baseline for the eight-case evaluation",
      searchableText: "quality schema duplicate p50 p95 cost baseline",
      onOpenFlags: { baseline_metrics_inspected: true },
      content: `{
  "fixtureVersion": "aai-baseline-v1",
  "cases": 8,
  "quality": 0.78,
  "schemaFailureRate": 0.06,
  "duplicateSideEffectRateAfterRetry": 0.03,
  "p50LatencySeconds": 6.2,
  "p95LatencySeconds": 10.8,
  "estimatedCostUsdPerCompletedPlan": 0.18,
  "criticalSliceQuality": null
}`,
    },
    {
      id: "res_tool_contracts",
      title: "docs/tool-contracts.md",
      kind: "documentation",
      initiallyVisible: true,
      summary: "Deterministic tool authorization and side-effect contracts",
      searchableText: "tool contract deterministic configuration authorization idempotency",
      content: `# Tool contracts

- \`selectReadTool(account)\`: account.workflowMode deterministically selects the read adapter.
- \`writeImplementationRecord(plan, idempotencyKey)\`: irreversible side effect; requires a stable key.
- \`requestHumanReview(reason, traceId)\`: safe fallback when required information is absent.

The model may summarize unstructured material, but it must not authorize a customer action.`,
    },
    {
      id: "res_latency_constraint",
      title: "LATENCY_001 — changed production requirement",
      kind: "brief",
      initiallyVisible: false,
      summary: "Released only after preliminary architecture commitment",
      searchableText: "latency p95 four seconds quality authorization changed requirement",
      content: `# Changed production requirement — LATENCY_001

Enterprise deployment requirements changed. p95 end-to-end response time must be below 4 seconds. The current implementation is approximately 10–12 seconds.

Critical-case quality and authorization controls may not regress.

This requirement does not prescribe a model, framework, call count, or architecture.`,
    },
  ],

  artifacts: [
    {
      id: "art_assumptions",
      kind: "note",
      title: "Assumptions and investigation notes",
      required: false,
    },
    {
      id: "art_code_proposal",
      kind: "integration_code",
      title: "Workflow hardening proposal",
      required: true,
      description: "Proposal surface only; arbitrary TypeScript execution is not claimed.",
    },
    {
      id: "art_eval_cases",
      kind: "eval_case_set",
      title: "Expanded evaluation cases",
      required: true,
    },
    {
      id: "art_architecture",
      kind: "architecture_decision",
      title: "Preliminary architecture decision",
      required: true,
    },
    {
      id: "art_recommendation",
      kind: "production_recommendation",
      title: "Production recommendation",
      required: true,
    },
  ],

  tools: [
    { id: "tool_docs", label: "Workspace files", capability: "documentation", initiallyUnlocked: true },
    { id: "tool_code", label: "Code proposal", capability: "code_execution", initiallyUnlocked: true },
    { id: "tool_ai", label: "AI Assistant", capability: "ai_assistant", initiallyUnlocked: true },
    {
      id: "tool_artifacts",
      label: "Architecture, evals, recommendation",
      capability: "artifact_composer",
      initiallyUnlocked: true,
    },
    { id: "tool_logs", label: "Traces and metrics", capability: "logs", initiallyUnlocked: true },
  ],

  world: {
    flags: {
      failed_trace_inspected: false,
      baseline_metrics_inspected: false,
      latency_constraint_released: false,
      latency_fact_id: null,
    },
  },

  events: [
    {
      id: "evt_release_latency_001",
      label: "Release LATENCY_001 after architecture commitment",
      once: true,
      trigger: { kind: "ARTIFACT", artifactKind: "architecture_decision" },
      actions: [
        { kind: "UPDATE_WORLD_STATE", flag: "latency_constraint_released", value: true },
        { kind: "UPDATE_WORLD_STATE", flag: "latency_fact_id", value: "LATENCY_001" },
        { kind: "REVEAL_RESOURCE", resourceId: "res_latency_constraint" },
        {
          kind: "EMIT_SCENARIO_EVENT",
          scenarioKind: "CUSTOM",
          label: "FACT_RELEASED: LATENCY_001",
          payload: {
            factId: "LATENCY_001",
            baselineP95Seconds: 10.8,
            requiredP95SecondsBelow: 4,
            qualityMustNotRegress: true,
            authorizationMustNotRegress: true,
          },
        },
        {
          kind: "SHOW_NOTIFICATION",
          tone: "warning",
          message: "Production constraint released: LATENCY_001. Review the changed requirement.",
        },
        {
          kind: "CHANGE_TASK_PRIORITY",
          taskId: "task_respond_latency",
          priority: "critical",
        },
      ],
    },
  ],

  aiAssistant: {
    modelLabel: "Fydell Assistant (deterministic fixture)",
    fallbackResponse:
      "I can help compare hypotheses, but treat requirements, traces, and measured fixture output as authoritative. I cannot execute arbitrary TypeScript or call an external model.",
    responses: [
      {
        id: "ai_eval",
        whenPromptIncludes: ["eval"],
        response:
          "Inspect critical slices, not only aggregate quality. Consider malformed output, disallowed regions, duplicate side effects, missing information, and transient versus permanent failures.",
      },
      {
        id: "ai_retry",
        whenPromptIncludes: ["retry"],
        response:
          "Separate transient provider failures from permanent validation failures. Side-effect retries also need a stable idempotency contract.",
      },
      {
        id: "ai_latency",
        whenPromptIncludes: ["latency"],
        response:
          "Use the currently visible requirements and traces. Compare model-call count, context size, stage latency, cost, quality, and authorization rather than assuming a smaller model is automatically acceptable.",
      },
      {
        id: "ai_routing",
        whenPromptIncludes: ["routing", "tool"],
        response:
          "Ask whether account configuration already determines the valid tool. A model can interpret unstructured input without owning deterministic authorization.",
      },
    ],
  },
};
