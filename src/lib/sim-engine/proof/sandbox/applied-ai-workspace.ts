import { createHash } from "crypto";
import { z } from "zod";

export const APPLIED_AI_WORKSPACE_VERSION = "aai-workspace-v2" as const;
export const APPLIED_AI_EVALUATOR_VERSION = "synthetic-evaluator-v2" as const;

export const appliedAiConfigSchema = z.object({
  routing: z.enum(["model", "deterministic"]),
  model: z.enum(["quality", "balanced", "fast"]),
  modelCalls: z.number().int().min(1).max(3),
  contextTokens: z.number().int().min(1000).max(16000),
  retryMode: z.enum(["all_errors", "transient_only", "none"]),
  maxRetries: z.number().int().min(0).max(4),
  semanticValidation: z.boolean(),
  idempotencyKey: z.boolean(),
  humanReviewOnMissingInfo: z.boolean(),
});

export const appliedAiEvalCaseSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(3).max(120),
  slice: z.enum(["standard", "critical_authorization", "malformed_output", "duplicate_write", "missing_information"]),
  enabled: z.boolean(),
});

export const appliedAiWorkspaceSchema = z.object({
  workspaceVersion: z.literal(APPLIED_AI_WORKSPACE_VERSION),
  config: appliedAiConfigSchema,
  evalCases: z.array(appliedAiEvalCaseSchema).min(1).max(20),
  proposalCode: z.string().max(8000),
  architectureDecision: z.string().max(4000),
  productionRecommendation: z.string().max(5000),
});

export type AppliedAiConfig = z.infer<typeof appliedAiConfigSchema>;
export type AppliedAiEvalCase = z.infer<typeof appliedAiEvalCaseSchema>;
export type AppliedAiWorkspace = z.infer<typeof appliedAiWorkspaceSchema>;

export interface AppliedAiEvalResult {
  evaluatorVersion: typeof APPLIED_AI_EVALUATOR_VERSION;
  workspaceHash: string;
  caseCount: number;
  quality: number;
  criticalSliceQuality: number;
  schemaFailureRate: number;
  semanticFailureRate: number;
  duplicateSideEffectRate: number;
  p50LatencySeconds: number;
  p95LatencySeconds: number;
  estimatedCostDollars: number;
  modelCallCount: number;
  explanations: readonly string[];
}

export function createAppliedAiWorkspace(): AppliedAiWorkspace {
  return appliedAiWorkspaceSchema.parse({
    workspaceVersion: APPLIED_AI_WORKSPACE_VERSION,
    config: {
      routing: "model",
      model: "quality",
      modelCalls: 2,
      contextTokens: 12000,
      retryMode: "all_errors",
      maxRetries: 2,
      semanticValidation: false,
      idempotencyKey: false,
      humanReviewOnMissingInfo: false,
    },
    evalCases: [
      { id: "standard-01", title: "Standard enterprise plan", slice: "standard", enabled: true },
      { id: "standard-02", title: "Standard account configuration", slice: "standard", enabled: true },
      { id: "critical-auth-01", title: "Disallowed account region", slice: "critical_authorization", enabled: true },
      { id: "malformed-01", title: "Malformed provider output", slice: "malformed_output", enabled: true },
      { id: "duplicate-01", title: "Timeout after write", slice: "duplicate_write", enabled: true },
      { id: "missing-01", title: "Required information absent", slice: "missing_information", enabled: true },
      { id: "standard-03", title: "Long customer document", slice: "standard", enabled: true },
      { id: "standard-04", title: "Known workflow type", slice: "standard", enabled: true },
    ],
    proposalCode:
      "// Proposal only — not executed by this sandbox.\n// Describe optional TypeScript changes here; measured results use supported config and eval mutations only.",
    architectureDecision: "",
    productionRecommendation: "",
  });
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

export function hashAppliedAiWorkspace(workspace: AppliedAiWorkspace): string {
  return createHash("sha256").update(JSON.stringify(workspace)).digest("hex");
}

export function evaluateAppliedAiWorkspace(workspaceInput: AppliedAiWorkspace): AppliedAiEvalResult {
  const workspace = appliedAiWorkspaceSchema.parse(workspaceInput);
  const c = workspace.config;
  const enabled = workspace.evalCases.filter((item) => item.enabled);
  const has = (slice: AppliedAiEvalCase["slice"]) => enabled.some((item) => item.slice === slice);
  const count = (slice: AppliedAiEvalCase["slice"]) => enabled.filter((item) => item.slice === slice).length;

  let quality = c.model === "quality" ? 74 : c.model === "balanced" ? 71 : 65;
  if (c.routing === "deterministic") quality += 4;
  if (c.semanticValidation) quality += 5;
  if (c.humanReviewOnMissingInfo) quality += 3;
  if (c.contextTokens < 4000) quality -= 7;
  else if (c.contextTokens < 8000) quality -= 2;
  if (has("malformed_output")) quality += 2;
  if (has("critical_authorization")) quality += 2;
  quality -= Math.max(0, count("critical_authorization") - 1) * 2;

  let critical = 52;
  if (c.routing === "deterministic") critical += 14;
  if (c.semanticValidation) critical += 24;
  if (c.humanReviewOnMissingInfo) critical += 6;
  if (!has("critical_authorization")) critical -= 10;

  const schemaFailure = Math.max(
    0.4,
    6 + Math.max(0, count("malformed_output") - 1) * 0.8 - (c.semanticValidation ? 0.6 : 0),
  );
  const semanticFailure = Math.max(0.3, 8.5 - (c.semanticValidation ? 6.8 : 0) - (c.routing === "deterministic" ? 1.1 : 0));
  const duplicate = c.idempotencyKey
    ? 0.1
    : c.retryMode === "all_errors"
      ? 3 + Math.max(0, count("duplicate_write") - 1) * 0.7
      : 1.4;
  const modelFactor = c.model === "quality" ? 1 : c.model === "balanced" ? 0.72 : 0.48;
  const routingCalls = c.routing === "deterministic" ? Math.max(1, c.modelCalls - 1) : c.modelCalls;
  const contextFactor = c.contextTokens / 12000;
  const retryFactor = c.retryMode === "all_errors" ? c.maxRetries * 0.45 : c.retryMode === "transient_only" ? c.maxRetries * 0.2 : 0;
  const p50 = 1.1 + routingCalls * 2.1 * modelFactor * contextFactor + retryFactor;
  const p95 = p50 * 1.4 + routingCalls * 0.62 + retryFactor;
  const cost = routingCalls * 0.09 * modelFactor * contextFactor;

  const explanations = [
    `Routing uses ${c.routing} control with ${routingCalls} measured model call${routingCalls === 1 ? "" : "s"}.`,
    `Model profile ${c.model} and ${c.contextTokens} context tokens determine synthetic latency and cost.`,
    c.idempotencyKey ? "Stable idempotency reduces duplicate writes." : "No stable idempotency key leaves duplicate writes possible.",
    c.semanticValidation ? "Semantic validation catches schema-valid policy failures." : "Schema-valid semantic policy failures remain.",
    `Enabled eval coverage includes ${enabled.length} cases${has("critical_authorization") ? ", including the critical authorization slice" : ""}.`,
  ];

  return {
    evaluatorVersion: APPLIED_AI_EVALUATOR_VERSION,
    workspaceHash: hashAppliedAiWorkspace(workspace),
    caseCount: enabled.length,
    quality: Math.max(0, Math.min(100, Math.round(quality))),
    criticalSliceQuality: Math.max(0, Math.min(100, Math.round(critical))),
    schemaFailureRate: round(schemaFailure, 1),
    semanticFailureRate: round(semanticFailure, 1),
    duplicateSideEffectRate: round(duplicate, 1),
    p50LatencySeconds: round(p50, 1),
    p95LatencySeconds: round(p95, 1),
    estimatedCostDollars: round(cost, 3),
    modelCallCount: routingCalls,
    explanations,
  };
}

export function parseAppliedAiWorkspace(value: unknown): AppliedAiWorkspace {
  return appliedAiWorkspaceSchema.parse(value);
}
