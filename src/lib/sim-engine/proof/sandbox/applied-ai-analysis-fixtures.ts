import type { EvidenceDirection, RunSnapshot } from "../types";
import {
  createAppliedAiWorkspace,
  evaluateAppliedAiWorkspace,
  type AppliedAiConfig,
  type AppliedAiEvalCase,
} from "./applied-ai-workspace";
import { eventRecordForAppliedAiFixture } from "./applied-ai-analysis";

export type AppliedAiAnalysisFixtureName = "A" | "B" | "C" | "D" | "E";
export type AppliedAiExpectedOutcomes = Record<"PR-AI-04" | "PR-AI-05" | "PR-AI-07" | "PR-AI-08", EvidenceDirection>;

export interface AppliedAiAnalysisFixture {
  name: AppliedAiAnalysisFixtureName;
  description: string;
  snapshot: RunSnapshot;
  expected: AppliedAiExpectedOutcomes;
  expectedRecommendation: "INTERVIEW" | "HOLD" | "INSUFFICIENT_EVIDENCE";
}

const baselineWorkspace = createAppliedAiWorkspace();
const baselineEvaluation = evaluateAppliedAiWorkspace(baselineWorkspace);
const addedCases: AppliedAiEvalCase[] = [
  { id: "candidate-critical-02", title: "Second authorization boundary", slice: "critical_authorization", enabled: true },
  { id: "candidate-malformed-02", title: "Semantic malformed output", slice: "malformed_output", enabled: true },
  { id: "candidate-duplicate-02", title: "Repeated write after timeout", slice: "duplicate_write", enabled: true },
];

function workspaceFor(config: AppliedAiConfig) {
  return {
    ...baselineWorkspace,
    config,
    evalCases: [...baselineWorkspace.evalCases, ...addedCases],
  };
}

function baseSnapshot(runId: string): Omit<RunSnapshot, "events"> {
  return {
    run_id: runId,
    stage: "FINAL_SUBMITTED",
    released_facts: ["LATENCY_001"],
    artifact: {
      diagnosis: "Fixture artifact prose is not scored.",
      recommendation: "Fixture recommendation prose is not scored.",
      customer_message: "",
      internal_note: "",
      assumptions: "",
      limitations: "Synthetic evaluator.",
    },
    defense: [],
  };
}

function evalPayload(phase: "baseline" | "post_fact", evaluation: ReturnType<typeof evaluateAppliedAiWorkspace>) {
  return {
    phase,
    evaluator_version: evaluation.evaluatorVersion,
    workspace_hash: evaluation.workspaceHash,
    metrics: evaluation,
  };
}

function measuredSnapshot(
  runId: string,
  finalConfig: AppliedAiConfig,
  options?: {
    postMetrics?: ReturnType<typeof evaluateAppliedAiWorkspace>;
    defenseText?: string;
  },
): RunSnapshot {
  const postEvaluation = options?.postMetrics ?? evaluateAppliedAiWorkspace(workspaceFor(finalConfig));
  const e = (id: string, sequence: number, type: string, payload: Record<string, unknown>, stream?: "candidate_work" | "scenario_delivery") =>
    eventRecordForAppliedAiFixture({ id, runId, sequence, type, payload, stream });
  return {
    ...baseSnapshot(runId),
    events: [
      e(`${runId}-baseline`, 1, "EVAL_RUN", evalPayload("baseline", baselineEvaluation)),
      e(`${runId}-config-pre`, 2, "CONFIG_EDITED", {
        workspace_hash_before: baselineEvaluation.workspaceHash,
        changed_fields: ["semanticValidation", "idempotencyKey"],
      }),
      e(`${runId}-case-critical`, 3, "EVAL_CASE_ADDED", {
        case_id: addedCases[0]!.id,
        slice: addedCases[0]!.slice,
      }),
      e(`${runId}-case-malformed`, 4, "EVAL_CASE_ADDED", {
        case_id: addedCases[1]!.id,
        slice: addedCases[1]!.slice,
      }),
      e(`${runId}-architecture`, 5, "ARCHITECTURE_DECISION_COMMITTED", {
        workspace_hash: null,
        decision_length: 120,
      }),
      e(`${runId}-fact`, 6, "FACT_RELEASED", {
        fact_id: "LATENCY_001",
        p95_threshold_seconds: 4,
        body: "p95 must be below four seconds without critical quality or authorization regression.",
      }, "scenario_delivery"),
      e(`${runId}-config-post`, 7, "CONFIG_REVISION", {
        workspace_hash_before: null,
        changed_fields: ["model", "modelCalls", "contextTokens", "retryMode"],
      }),
      e(`${runId}-case-duplicate`, 8, "EVAL_REVISION", {
        case_id: addedCases[2]!.id,
        slice: addedCases[2]!.slice,
      }),
      e(`${runId}-post`, 9, "EVAL_RUN", evalPayload("post_fact", postEvaluation)),
      e(`${runId}-submission`, 10, "SUBMISSION_COMPLETED", {
        target_requirement_ids: ["PR-AI-04", "PR-AI-05", "PR-AI-07", "PR-AI-08"],
        workspace_hash: postEvaluation.workspaceHash,
      }),
      ...(options?.defenseText
        ? [
            e(`${runId}-defense`, 11, "DEFENSE_RESPONSE_RECEIVED", {
              question_id: `${runId}-question`,
            }),
          ]
        : []),
    ],
    defense: options?.defenseText
      ? [{ prompt: "Explain the measured tradeoff.", response: options.defenseText }]
      : [],
  };
}

const strongConfig: AppliedAiConfig = {
  routing: "deterministic",
  model: "balanced",
  modelCalls: 1,
  contextTokens: 4000,
  retryMode: "transient_only",
  maxRetries: 1,
  semanticValidation: true,
  idempotencyKey: true,
  humanReviewOnMissingInfo: true,
};

const alternativeConfig: AppliedAiConfig = {
  routing: "model",
  model: "balanced",
  modelCalls: 1,
  contextTokens: 4000,
  retryMode: "transient_only",
  maxRetries: 1,
  semanticValidation: true,
  idempotencyKey: true,
  humanReviewOnMissingInfo: true,
};

const unsafePost = {
  ...evaluateAppliedAiWorkspace(workspaceFor({
    ...strongConfig,
    model: "fast",
  })),
  quality: 68,
  criticalSliceQuality: 42,
  schemaFailureRate: 7,
  semanticFailureRate: 12,
  duplicateSideEffectRate: 5,
  p95LatencySeconds: 2.4,
  estimatedCostDollars: 0.04,
};

const fixtureA: AppliedAiAnalysisFixture = {
  name: "A",
  description: "Strong measured improvement meeting latency while preserving critical quality.",
  snapshot: measuredSnapshot("fixture-a", strongConfig),
  expected: {
    "PR-AI-04": "STRENGTH",
    "PR-AI-05": "STRENGTH",
    "PR-AI-07": "STRENGTH",
    "PR-AI-08": "STRENGTH",
  },
  expectedRecommendation: "INTERVIEW",
};

const fixtureB: AppliedAiAnalysisFixture = {
  name: "B",
  description: "Plausible fast result with unsafe reliability and authorization regressions.",
  snapshot: measuredSnapshot("fixture-b", { ...strongConfig, model: "fast" }, { postMetrics: unsafePost }),
  expected: {
    "PR-AI-04": "STRENGTH",
    "PR-AI-05": "CONCERN",
    "PR-AI-07": "CONCERN",
    "PR-AI-08": "CONCERN",
  },
  expectedRecommendation: "HOLD",
};

const fixtureC: AppliedAiAnalysisFixture = {
  name: "C",
  description: "Keyword-gaming prose without structured evaluator evidence.",
  snapshot: {
    ...baseSnapshot("fixture-c"),
    artifact: {
      diagnosis: "Evals idempotency semantic validation deterministic routing p95 cost authorization.",
      recommendation: "Ship because all the right Applied AI keywords are present.",
      customer_message: "",
      internal_note: "Exactly once retries critical quality.",
      assumptions: "",
      limitations: "",
    },
    events: [],
    defense: [{ prompt: "Defend it.", response: "Evals p95 idempotency deterministic authorization." }],
  },
  expected: {
    "PR-AI-04": "INSUFFICIENT_EVIDENCE",
    "PR-AI-05": "INSUFFICIENT_EVIDENCE",
    "PR-AI-07": "INSUFFICIENT_EVIDENCE",
    "PR-AI-08": "INSUFFICIENT_EVIDENCE",
  },
  expectedRecommendation: "INSUFFICIENT_EVIDENCE",
};

const malformed = eventRecordForAppliedAiFixture({
  id: "fixture-d-malformed",
  runId: "fixture-d",
  sequence: 1,
  type: "EVAL_RUN",
  payload: {
    phase: "post_fact",
    evaluator_version: "unknown",
    workspace_hash: "not-a-hash",
    metrics: { p95LatencySeconds: -1 },
  },
});
malformed.payload = { metrics: { p95LatencySeconds: 1 } };

const fixtureD: AppliedAiAnalysisFixture = {
  name: "D",
  description: "Incomplete and malformed structured evidence.",
  snapshot: { ...baseSnapshot("fixture-d"), events: [malformed] },
  expected: {
    "PR-AI-04": "INSUFFICIENT_EVIDENCE",
    "PR-AI-05": "INSUFFICIENT_EVIDENCE",
    "PR-AI-07": "INSUFFICIENT_EVIDENCE",
    "PR-AI-08": "INSUFFICIENT_EVIDENCE",
  },
  expectedRecommendation: "INSUFFICIENT_EVIDENCE",
};

const fixtureE: AppliedAiAnalysisFixture = {
  name: "E",
  description: "Alternative valid architecture retaining model routing while meeting measured outcomes.",
  snapshot: measuredSnapshot("fixture-e", alternativeConfig),
  expected: {
    "PR-AI-04": "STRENGTH",
    "PR-AI-05": "STRENGTH",
    "PR-AI-07": "STRENGTH",
    "PR-AI-08": "STRENGTH",
  },
  expectedRecommendation: "INTERVIEW",
};

export const APPLIED_AI_ANALYSIS_FIXTURES: readonly AppliedAiAnalysisFixture[] = [
  fixtureA,
  fixtureB,
  fixtureC,
  fixtureD,
  fixtureE,
];
