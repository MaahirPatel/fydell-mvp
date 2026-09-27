export const APPLIED_AI_REQUIRED_EVENT_ORDER = [
  "RESOURCE_OPENED",
  "TRACE_OPENED",
  "EVAL_RUN:baseline",
  "CONFIG_EDITED",
  "EVAL_CASE_ADDED_OR_EDITED",
  "ARCHITECTURE_DECISION_COMMITTED",
  "FACT_RELEASED:LATENCY_001",
  "POST_FACT_REVISION",
  "EVAL_RUN:post_fact",
  "PRODUCTION_RECOMMENDATION_WRITTEN",
  "SUBMISSION_COMPLETED",
  "DEFENSE_RESPONSE_RECEIVED",
] as const;

export function releaseLatencyFactOnce(releasedFacts: readonly string[]): readonly string[] {
  return releasedFacts.includes("LATENCY_001")
    ? releasedFacts
    : Object.freeze([...releasedFacts, "LATENCY_001"]);
}

export interface CandidateLoopProgress {
  traceOpened: boolean;
  baselineRun: boolean;
  configEdited: boolean;
  evalCaseEdited: boolean;
  architectureCommitted: boolean;
  factReleased: boolean;
  postFactRevision: boolean;
  postFactEvalRun: boolean;
  recommendationWritten: boolean;
  submissionCompleted: boolean;
}

export function candidateLoopMissing(progress: CandidateLoopProgress): readonly string[] {
  const required: Array<[keyof CandidateLoopProgress, string]> = [
    ["traceOpened", "TRACE_OPENED"],
    ["baselineRun", "baseline EVAL_RUN"],
    ["configEdited", "CONFIG_EDITED"],
    ["evalCaseEdited", "EVAL_CASE_ADDED/EDITED"],
    ["architectureCommitted", "ARCHITECTURE_DECISION_COMMITTED"],
    ["factReleased", "FACT_RELEASED LATENCY_001"],
    ["postFactRevision", "post-fact revision"],
    ["postFactEvalRun", "post-fact EVAL_RUN"],
    ["recommendationWritten", "PRODUCTION_RECOMMENDATION_WRITTEN"],
    ["submissionCompleted", "SUBMISSION_COMPLETED"],
  ];
  return Object.freeze(required.filter(([key]) => !progress[key]).map(([, label]) => label));
}
