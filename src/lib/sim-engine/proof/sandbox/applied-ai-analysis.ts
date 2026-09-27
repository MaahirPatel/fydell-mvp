import { z } from "zod";
import type { EvidenceClaimDraft, EvidenceDirection, ProofEventRecord, RunSnapshot } from "../types";
import { APPLIED_AI_EVALUATOR_VERSION } from "./applied-ai-workspace";
import { deriveInterviewPlan, type InterviewPlan } from "./review-outputs";

const RUBRIC_VERSION = "aai-proof-v1";
const PROMPT_VERSION = "aai-structured-analysis-v2";
const MODEL_VERSION = "deterministic-event-analysis-v2";
const REQUIREMENTS = ["PR-AI-04", "PR-AI-05", "PR-AI-07", "PR-AI-08"] as const;
type RequirementId = (typeof REQUIREMENTS)[number];

const rate = z.number().finite().min(0).max(100);
const evaluatorMetricsSchema = z.object({
  evaluatorVersion: z.literal(APPLIED_AI_EVALUATOR_VERSION),
  workspaceHash: z.string().regex(/^[a-f0-9]{64}$/),
  caseCount: z.number().int().min(1).max(1000),
  quality: rate,
  criticalSliceQuality: rate,
  schemaFailureRate: rate,
  semanticFailureRate: rate,
  duplicateSideEffectRate: rate,
  p50LatencySeconds: z.number().finite().nonnegative().max(3600),
  p95LatencySeconds: z.number().finite().nonnegative().max(3600),
  estimatedCostDollars: z.number().finite().nonnegative().max(10000),
  modelCallCount: z.number().int().nonnegative().max(100),
  explanations: z.array(z.string()).optional(),
}).strict();

const eventEnvelopeSchema = z.object({
  stream: z.enum(["candidate_work", "scenario_delivery", "analysis", "review"]),
  event_type: z.string().min(1),
  correlation_id: z.string().min(1),
  idempotency_key: z.string().min(1),
  actor_type: z.string().min(1),
  actor_id: z.string().nullable().optional(),
  occurred_at: z.string().min(1),
  received_at: z.string().min(1),
  payload_version: z.literal(1),
  payload: z.record(z.string(), z.unknown()),
}).strict();

const evalPayloadSchema = z.object({
  phase: z.enum(["baseline", "post_fact"]),
  evaluator_version: z.literal(APPLIED_AI_EVALUATOR_VERSION),
  workspace_hash: z.string().regex(/^[a-f0-9]{64}$/),
  metrics: evaluatorMetricsSchema,
}).passthrough();

const factPayloadSchema = z.object({
  fact_id: z.literal("LATENCY_001"),
  p95_threshold_seconds: z.number().finite().positive().max(60),
}).passthrough();

const configPayloadSchema = z.object({
  workspace_hash_before: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  changed_fields: z.array(z.string().min(1)).min(1),
}).passthrough();

const evalCasePayloadSchema = z.object({
  case_id: z.string().min(1),
  slice: z.enum([
    "standard",
    "critical_authorization",
    "malformed_output",
    "duplicate_write",
    "missing_information",
  ]),
}).passthrough();

const architecturePayloadSchema = z.object({
  workspace_hash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  decision_length: z.number().int().positive(),
}).passthrough();

const explicitDefenseLabelSchema = z.object({
  human_review_label: z.enum(["STRONG", "ADEQUATE", "WEAK"]),
  reviewer_id: z.string().min(1),
}).passthrough();

interface NormalizedEvent {
  id: string;
  sequence: number;
  type: string;
  payload: Record<string, unknown>;
}

interface NormalizedAnalysisInput {
  events: NormalizedEvent[];
  malformedEventIds: string[];
  orderingValid: boolean;
  factEvents: Array<NormalizedEvent & { fact: z.infer<typeof factPayloadSchema> }>;
  baselineRuns: Array<NormalizedEvent & { evaluation: z.infer<typeof evaluatorMetricsSchema> }>;
  postFactRuns: Array<NormalizedEvent & { evaluation: z.infer<typeof evaluatorMetricsSchema> }>;
  configEvents: Array<NormalizedEvent & { config: z.infer<typeof configPayloadSchema> }>;
  evalCaseEvents: Array<NormalizedEvent & { evalCase: z.infer<typeof evalCasePayloadSchema> }>;
  architectureEvents: Array<NormalizedEvent & { architecture: z.infer<typeof architecturePayloadSchema> }>;
  defenseEvents: NormalizedEvent[];
  explicitDefenseLabels: Array<z.infer<typeof explicitDefenseLabelSchema>>;
}

export interface AppliedAiPassAResult {
  claims: EvidenceClaimDraft[];
  defensePrompt: string;
  defenseTarget: string;
  observations: string[];
  uncertainties: string[];
}

export interface AppliedAiPassBResult {
  claims: EvidenceClaimDraft[];
  brief: {
    recommendation: "INTERVIEW" | "HOLD" | "INSUFFICIENT_EVIDENCE";
    why: string;
    strengths: string[];
    concerns: string[];
    probes: string[];
  };
  interviewPlan: InterviewPlan;
}

function normalize(snapshot: RunSnapshot): NormalizedAnalysisInput {
  const malformedEventIds: string[] = [];
  const ids = new Set<string>();
  const sequences = new Set<number>();
  const events: NormalizedEvent[] = [];

  for (const event of snapshot.events) {
    if (
      typeof event.id !== "string" ||
      event.id.length === 0 ||
      ids.has(event.id) ||
      !Number.isInteger(event.sequence) ||
      event.sequence < 1 ||
      sequences.has(event.sequence)
    ) {
      if (typeof event.id === "string" && event.id.length > 0) malformedEventIds.push(event.id);
      continue;
    }
    const envelope = eventEnvelopeSchema.safeParse(event.payload);
    if (!envelope.success || envelope.data.event_type !== String(event.event_type)) {
      malformedEventIds.push(event.id);
      continue;
    }
    ids.add(event.id);
    sequences.add(event.sequence);
    events.push({
      id: event.id,
      sequence: event.sequence,
      type: String(event.event_type),
      payload: envelope.data.payload,
    });
  }
  events.sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));

  const factEvents: NormalizedAnalysisInput["factEvents"] = [];
  const baselineRuns: NormalizedAnalysisInput["baselineRuns"] = [];
  const postFactRuns: NormalizedAnalysisInput["postFactRuns"] = [];
  const configEvents: NormalizedAnalysisInput["configEvents"] = [];
  const evalCaseEvents: NormalizedAnalysisInput["evalCaseEvents"] = [];
  const architectureEvents: NormalizedAnalysisInput["architectureEvents"] = [];
  const defenseEvents: NormalizedEvent[] = [];
  const explicitDefenseLabels: NormalizedAnalysisInput["explicitDefenseLabels"] = [];

  for (const event of events) {
    if (event.type === "FACT_RELEASED") {
      const parsed = factPayloadSchema.safeParse(event.payload);
      if (parsed.success) factEvents.push({ ...event, fact: parsed.data });
      else malformedEventIds.push(event.id);
    } else if (event.type === "EVAL_RUN") {
      const parsed = evalPayloadSchema.safeParse(event.payload);
      if (
        parsed.success &&
        parsed.data.workspace_hash === parsed.data.metrics.workspaceHash &&
        parsed.data.evaluator_version === parsed.data.metrics.evaluatorVersion
      ) {
        const row = { ...event, evaluation: parsed.data.metrics };
        if (parsed.data.phase === "baseline") baselineRuns.push(row);
        else postFactRuns.push(row);
      } else {
        malformedEventIds.push(event.id);
      }
    } else if (event.type === "CONFIG_EDITED" || event.type === "CONFIG_REVISION") {
      const parsed = configPayloadSchema.safeParse(event.payload);
      if (parsed.success) configEvents.push({ ...event, config: parsed.data });
      else malformedEventIds.push(event.id);
    } else if (event.type === "EVAL_CASE_ADDED" || event.type === "EVAL_CASE_EDITED" || event.type === "EVAL_REVISION") {
      const parsed = evalCasePayloadSchema.safeParse(event.payload);
      if (parsed.success) evalCaseEvents.push({ ...event, evalCase: parsed.data });
      else malformedEventIds.push(event.id);
    } else if (event.type === "ARCHITECTURE_DECISION_COMMITTED") {
      const parsed = architecturePayloadSchema.safeParse(event.payload);
      if (parsed.success) architectureEvents.push({ ...event, architecture: parsed.data });
      else malformedEventIds.push(event.id);
    } else if (event.type === "DEFENSE_RESPONSE_RECEIVED") {
      defenseEvents.push(event);
      const label = explicitDefenseLabelSchema.safeParse(event.payload);
      if (label.success) explicitDefenseLabels.push(label.data);
    }
  }

  const factSequence = factEvents[0]?.sequence;
  const orderingValid =
    factEvents.length === 1 &&
    architectureEvents.length > 0 &&
    architectureEvents.some((event) => event.sequence < (factSequence ?? 0)) &&
    baselineRuns.length > 0 &&
    baselineRuns.every((event) => event.sequence < (factSequence ?? 0)) &&
    postFactRuns.length > 0 &&
    postFactRuns.every((event) => event.sequence > (factSequence ?? Number.MAX_SAFE_INTEGER));

  return {
    events,
    malformedEventIds: [...new Set(malformedEventIds)].sort(),
    orderingValid,
    factEvents,
    baselineRuns,
    postFactRuns,
    configEvents,
    evalCaseEvents,
    architectureEvents,
    defenseEvents,
    explicitDefenseLabels,
  };
}

function latest<T extends NormalizedEvent>(events: T[]): T | undefined {
  return events.at(-1);
}

function claim(
  competency: RequirementId,
  direction: EvidenceDirection,
  text: string,
  supporting: string[],
  counterevidence: string[],
  confidence: EvidenceClaimDraft["confidence"] = "HIGH",
): EvidenceClaimDraft {
  return {
    claim: `${text} Limitation: this synthetic episode does not establish production-scale operation or execution of proposal code.`,
    competency,
    direction,
    confidence,
    supporting_event_ids: [...new Set(supporting)].sort(),
    counterevidence_event_ids: [...new Set(counterevidence)].sort(),
    rubric_version: RUBRIC_VERSION,
    prompt_version: PROMPT_VERSION,
    model_version: MODEL_VERSION,
  };
}

function buildClaims(input: NormalizedAnalysisInput): EvidenceClaimDraft[] {
  const baseline = latest(input.baselineRuns);
  const post = latest(input.postFactRuns);
  const fact = input.factEvents[0];
  const malformed = input.malformedEventIds;
  const pairIds = [baseline?.id, post?.id, fact?.id].filter((id): id is string => Boolean(id));
  const allStructured = [...pairIds, ...input.configEvents.map((event) => event.id), ...input.evalCaseEvents.map((event) => event.id)];

  if (!baseline || !post || !fact || !input.orderingValid) {
    const reason = input.factEvents.length !== 1
      ? "The structured record does not contain exactly one valid LATENCY_001 fact."
      : "The baseline, preliminary commitment, fact, and post-fact evaluation ordering is incomplete or conflicting.";
    return REQUIREMENTS.map((requirement) =>
      claim(
        requirement,
        "INSUFFICIENT_EVIDENCE",
        `${reason} ${requirement} cannot be inferred from prose or loop completion.`,
        allStructured,
        malformed,
        "MODERATE",
      ),
    );
  }

  const before = baseline.evaluation;
  const after = post.evaluation;
  const postFactCaseEvents = input.evalCaseEvents.filter((event) => event.sequence < post.sequence);
  const criticalCaseEvents = postFactCaseEvents.filter((event) => event.evalCase.slice === "critical_authorization");
  const failureCaseEvents = postFactCaseEvents.filter((event) =>
    ["malformed_output", "duplicate_write", "missing_information"].includes(event.evalCase.slice),
  );
  const coverageRegressed = after.caseCount < before.caseCount;
  const criticalRegressed = after.criticalSliceQuality < before.criticalSliceQuality;
  const qualityRegressed = after.quality < before.quality;
  const semanticRegressed = after.semanticFailureRate > before.semanticFailureRate;
  const duplicateRegressed = after.duplicateSideEffectRate > before.duplicateSideEffectRate;
  const schemaRegressed = after.schemaFailureRate > before.schemaFailureRate + 0.5;
  const latencyPassed = after.p95LatencySeconds < fact.fact.p95_threshold_seconds;
  const costRegressed = after.estimatedCostDollars > before.estimatedCostDollars;
  const configBeforeFact = input.configEvents.filter((event) => event.sequence < fact.sequence);
  const configAfterFact = input.configEvents.filter((event) => event.sequence > fact.sequence && event.sequence < post.sequence);
  const lineageValid = configBeforeFact.some(
    (event) => event.config.workspace_hash_before === before.workspaceHash,
  );
  const changedFields = new Set(input.configEvents.flatMap((event) => event.config.changed_fields));
  const metricCounter = [post.id];

  const evaluationDirection: EvidenceDirection =
    coverageRegressed || criticalCaseEvents.length === 0 || failureCaseEvents.length === 0 || !lineageValid
      ? "CONCERN"
      : "STRENGTH";
  const evaluationText = evaluationDirection === "STRENGTH"
    ? "Baseline and post-fact evaluator snapshots are linked by workspace hashes, and the measured suite includes critical authorization and failure-case changes."
    : "Before/after metrics exist, but the structured eval-case record is incomplete or evaluation coverage regressed.";

  const reliabilityUnsafe =
    semanticRegressed || duplicateRegressed || schemaRegressed || criticalRegressed;
  const reliabilityImproved =
    after.semanticFailureRate < before.semanticFailureRate &&
    after.duplicateSideEffectRate < before.duplicateSideEffectRate;
  const reliabilityDirection: EvidenceDirection = reliabilityUnsafe
    ? "CONCERN"
    : reliabilityImproved
      ? "STRENGTH"
      : "INSUFFICIENT_EVIDENCE";

  const latencyDirection: EvidenceDirection =
    !latencyPassed || criticalRegressed || qualityRegressed
      ? "CONCERN"
      : costRegressed
        ? "CONCERN"
        : "STRENGTH";

  const boundaryUnsafe = criticalRegressed || semanticRegressed || duplicateRegressed;
  const boundaryDirection: EvidenceDirection =
    configBeforeFact.length === 0 || configAfterFact.length === 0 || changedFields.size === 0 || !lineageValid
      ? "INSUFFICIENT_EVIDENCE"
      : boundaryUnsafe
        ? "CONCERN"
        : after.semanticFailureRate < before.semanticFailureRate || after.criticalSliceQuality > before.criticalSliceQuality
          ? "STRENGTH"
          : "INSUFFICIENT_EVIDENCE";

  return [
    claim(
      "PR-AI-04",
      evaluationDirection,
      evaluationText,
      [
        baseline.id,
        ...(evaluationDirection === "STRENGTH" ? [post.id] : []),
        ...postFactCaseEvents.map((event) => event.id),
      ],
      evaluationDirection === "CONCERN" ? metricCounter : malformed,
    ),
    claim(
      "PR-AI-05",
      reliabilityDirection,
      reliabilityDirection === "STRENGTH"
        ? "Measured semantic failures and duplicate side effects improved without a schema or critical-authorization regression."
        : reliabilityDirection === "CONCERN"
          ? "The post-fact evaluator shows a reliability or critical-authorization regression."
          : "The available snapshots do not demonstrate a material reliability improvement.",
      [
        baseline.id,
        ...(reliabilityDirection === "CONCERN" ? [] : [post.id]),
        ...failureCaseEvents.map((event) => event.id),
      ],
      reliabilityDirection === "CONCERN" ? metricCounter : malformed,
    ),
    claim(
      "PR-AI-07",
      latencyDirection,
      latencyDirection === "STRENGTH"
        ? `Measured p95 latency is ${after.p95LatencySeconds}s, below the ${fact.fact.p95_threshold_seconds}s constraint, with no measured cost or quality regression.`
        : `The result does not safely satisfy the latency tradeoff: p95 is ${after.p95LatencySeconds}s and quality, critical authorization, and cost must not regress.`,
      [baseline.id, fact.id, ...(latencyDirection === "CONCERN" ? [] : [post.id])],
      latencyDirection === "CONCERN" ? metricCounter : malformed,
    ),
    claim(
      "PR-AI-08",
      boundaryDirection,
      boundaryDirection === "STRENGTH"
        ? "Structured configuration changes produced a measured reliability or authorization improvement; no particular framework or configuration path was required."
        : boundaryDirection === "CONCERN"
          ? "The measured boundary change is unsafe because reliability or critical authorization regressed."
          : "Configuration changes were not sufficiently linked across the fact boundary to infer product/model judgment.",
      [
        ...input.configEvents.map((event) => event.id),
        baseline.id,
        ...(boundaryDirection === "CONCERN" ? [] : [post.id]),
      ],
      boundaryDirection === "CONCERN" ? metricCounter : malformed,
    ),
  ];
}

function defenseQuestionFor(input: NormalizedAnalysisInput, claims: EvidenceClaimDraft[]): {
  prompt: string;
  target: string;
} {
  const baseline = latest(input.baselineRuns)?.evaluation;
  const post = latest(input.postFactRuns)?.evaluation;
  const direction = (requirement: RequirementId) =>
    claims.find((claim) => claim.competency === requirement)?.direction;
  if (baseline && post && (direction("PR-AI-05") === "CONCERN" || direction("PR-AI-08") === "CONCERN")) {
    return {
      prompt: `Your change produced critical authorization ${post.criticalSliceQuality}% (was ${baseline.criticalSliceQuality}%), semantic failures ${post.semanticFailureRate}% (was ${baseline.semanticFailureRate}%), and duplicate side effects ${post.duplicateSideEffectRate}% (was ${baseline.duplicateSideEffectRate}%). What engineering choice caused the unsafe regression, and what release gate would you change?`,
      target: "PR-AI-05/08 reliability and authorization tradeoff",
    };
  }
  if (post && direction("PR-AI-07") === "CONCERN") {
    return {
      prompt: `The post-fact p95 is ${post.p95LatencySeconds}s against the 4s LATENCY_001 limit. Which engineering choice would you change next, and how would you verify quality and authorization do not regress?`,
      target: "PR-AI-07 unmet latency tradeoff",
    };
  }
  if (post && direction("PR-AI-04") !== "STRENGTH") {
    return {
      prompt: `The evaluator covers ${post.caseCount} cases with critical authorization at ${post.criticalSliceQuality}%. Which missing or weak eval slice most limits your production recommendation, and what would you add?`,
      target: "PR-AI-04 evaluation coverage",
    };
  }
  if (baseline && post) {
    return {
      prompt: `You moved p95 from ${baseline.p95LatencySeconds}s to ${post.p95LatencySeconds}s and cost from $${baseline.estimatedCostDollars} to $${post.estimatedCostDollars}. Which engineering choice drove that tradeoff, and what production validation is still required?`,
      target: "PR-AI-07/08 measured tradeoff and production validation",
    };
  }
  return {
    prompt: "The structured evaluator record is incomplete. Which engineering choice can you defend from recorded events, and what measurement is still required?",
    target: "PR-AI-04/05/07/08 evidence gap",
  };
}

export function analyzeAppliedAiPassA(snapshot: RunSnapshot): AppliedAiPassAResult {
  const input = normalize(snapshot);
  const claims = buildClaims(input).map((draft) =>
    input.malformedEventIds.length > 0 && draft.direction === "STRENGTH"
      ? {
          ...draft,
          direction: "CONCERN" as const,
          claim: `${draft.claim} Malformed structured evidence prevents a strength finding.`,
          counterevidence_event_ids: [
            ...new Set([...draft.counterevidence_event_ids, ...input.malformedEventIds]),
          ].sort(),
        }
      : draft,
  );
  const validEvalCount = input.baselineRuns.length + input.postFactRuns.length;
  const defense = defenseQuestionFor(input, claims);
  return {
    claims,
    defensePrompt: defense.prompt,
    defenseTarget: defense.target,
    observations: [
      `${validEvalCount} valid evaluator snapshot(s) were observed.`,
      `${input.configEvents.length} typed configuration mutation event(s) and ${input.evalCaseEvents.length} typed eval-case mutation event(s) were observed.`,
      `${input.factEvents.length} valid LATENCY_001 fact event(s) were observed.`,
    ],
    uncertainties: [
      ...(input.malformedEventIds.length > 0
        ? [`Malformed or conflicting structured events were excluded: ${input.malformedEventIds.join(", ")}.`]
        : []),
      "The sandbox uses synthetic fixtures and does not execute proposal code or production traffic.",
    ],
  };
}

function recommendationFor(claims: EvidenceClaimDraft[]): AppliedAiPassBResult["brief"]["recommendation"] {
  const targeted = claims.filter((claim) => (REQUIREMENTS as readonly string[]).includes(claim.competency));
  const strengths = targeted.filter((claim) => claim.direction === "STRENGTH").length;
  const concerns = targeted.filter((claim) => claim.direction === "CONCERN").length;
  const insufficient = targeted.filter((claim) => claim.direction === "INSUFFICIENT_EVIDENCE").length;
  if (insufficient >= 2) return "INSUFFICIENT_EVIDENCE";
  if (strengths === REQUIREMENTS.length) return "INTERVIEW";
  if (concerns > 0 || insufficient > 0) return "HOLD";
  return "INSUFFICIENT_EVIDENCE";
}

export function analyzeAppliedAiPassB(snapshot: RunSnapshot): AppliedAiPassBResult {
  const input = normalize(snapshot);
  const passA = analyzeAppliedAiPassA(snapshot);
  const recommendation = recommendationFor(passA.claims);
  const labeled = input.explicitDefenseLabels.length > 0;
  const responseRecorded = input.defenseEvents.length > 0 || snapshot.defense.some((row) => row.response.length > 0);
  const claimStrengths = passA.claims.filter((claim) => claim.direction === "STRENGTH").map((claim) => claim.competency);
  const claimConcerns = passA.claims
    .filter((claim) => claim.direction !== "STRENGTH")
    .map((claim) => `${claim.competency}: ${claim.direction}`);
  const postFact = latest(input.postFactRuns)?.evaluation ?? null;
  const interviewPlan = deriveInterviewPlan(passA.claims, postFact);

  return {
    claims: passA.claims,
    brief: {
      recommendation,
      why:
        recommendation === "INTERVIEW"
          ? "All four targeted requirements have structured measured strengths. Claims remain review-required and synthetic-runtime limits apply."
          : recommendation === "HOLD"
            ? "Structured evidence is mixed; resolve requirement concerns before advancing."
            : "The structured record is too incomplete or conflicting for a hiring recommendation.",
      strengths: claimStrengths,
      concerns: [
        ...claimConcerns,
        responseRecorded
          ? labeled
            ? "Defense response has an explicit structured reviewer label."
            : "Defense response is recorded as an observation; quality remains insufficient evidence pending human review."
          : "No defense response was recorded.",
        "Synthetic evaluator only; proposal code was not executed.",
      ],
      probes: [passA.defensePrompt, ...interviewPlan.investigate, ...interviewPlan.challenge],
    },
    interviewPlan,
  };
}

export function isAppliedAiSnapshot(snapshot: RunSnapshot): boolean {
  if (snapshot.released_facts.includes("LATENCY_001")) return true;
  return snapshot.events.some((event) => {
    if (String(event.event_type) !== "FACT_RELEASED") return false;
    const envelope = eventEnvelopeSchema.safeParse(event.payload);
    return envelope.success && envelope.data.payload.fact_id === "LATENCY_001";
  });
}

export function eventRecordForAppliedAiFixture(input: {
  id: string;
  runId: string;
  sequence: number;
  type: string;
  stream?: "candidate_work" | "scenario_delivery" | "analysis" | "review";
  payload: Record<string, unknown>;
}): ProofEventRecord {
  const timestamp = "2026-01-01T00:00:00.000Z";
  return {
    id: input.id,
    run_id: input.runId,
    sequence: input.sequence,
    event_type: input.type as ProofEventRecord["event_type"],
    event_version: 1,
    source: input.stream === "scenario_delivery" ? "WORLD" : "CANDIDATE",
    actor_type: input.stream === "scenario_delivery" ? "world" : "candidate",
    actor_id: null,
    stage_id: null,
    occurred_at: timestamp,
    recorded_at: timestamp,
    payload: {
      stream: input.stream ?? "candidate_work",
      event_type: input.type,
      correlation_id: input.runId,
      idempotency_key: `${input.runId}:${input.id}`,
      actor_type: input.stream === "scenario_delivery" ? "world" : "candidate",
      actor_id: null,
      occurred_at: timestamp,
      received_at: timestamp,
      payload_version: 1,
      payload: input.payload,
    },
  };
}
