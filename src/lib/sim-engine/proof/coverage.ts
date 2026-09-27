/**
 * Applied AI Engineer proof-coverage domain.
 *
 * Fixture/domain-only: no persistence, UI, or production sim wiring.
 * Coverage is derived from typed source fields, never from narrative keywords.
 */

export const APPLIED_AI_PROOF_SPEC_VERSION = "aai-proof-v1" as const;
export const APPLIED_AI_ROLE_FAMILY = "Applied AI Engineering" as const;
export const APPLIED_AI_DISPLAY_ROLE = "Applied AI Engineer" as const;
export const APPLIED_AI_FLAGSHIP_INSTRUMENT_VERSION = "aai-workflow-hardening-v1" as const;

export const APPLIED_AI_ROLE_ALIASES = [
  "LLM Engineer",
  "AI Product Engineer",
  "Generative AI Engineer",
  "Software Engineer, AI",
  "Full-Stack AI Engineer",
  "Agent Engineer",
  "Founding AI Engineer",
] as const;

export type AppliedAiRoleAlias = (typeof APPLIED_AI_ROLE_ALIASES)[number];

export const APPLIED_AI_EXCLUSIONS = [
  "FOUNDATION_MODEL_RESEARCH",
  "PRETRAINING",
  "DEEP_LEARNING_RESEARCH",
  "DISTRIBUTED_GPU_INFRASTRUCTURE",
  "RESEARCH_SCIENTIST",
] as const;

export type AppliedAiExclusion = (typeof APPLIED_AI_EXCLUSIONS)[number];

export type AppliedAiRoleIntent =
  | { kind: "IN_SCOPE"; alias?: AppliedAiRoleAlias }
  | { kind: "EXCLUDED"; exclusion: AppliedAiExclusion };

export const PROOF_REQUIREMENT_IDS = [
  "PR-AI-01",
  "PR-AI-02",
  "PR-AI-03",
  "PR-AI-04",
  "PR-AI-05",
  "PR-AI-06",
  "PR-AI-07",
  "PR-AI-08",
] as const;

export type ProofRequirementId = (typeof PROOF_REQUIREMENT_IDS)[number];

export const EXISTING_PROOF_SOURCE_KINDS = [
  "PRIOR_WORK_RECEIPT",
  "CURRENT_FYDELL_WORK",
  "VERIFIED_ARTIFACT",
  "HUMAN_ATTESTATION",
  "OTHER_APPROVED",
] as const;

export type ExistingProofSourceKind = (typeof EXISTING_PROOF_SOURCE_KINDS)[number];

export const COVERAGE_STATES = [
  "PROVEN",
  "PARTIALLY_PROVEN",
  "NOT_PROVEN",
  "STALE",
  "NOT_APPLICABLE",
] as const;

export type CoverageState = (typeof COVERAGE_STATES)[number];

export const SOURCE_VERIFICATION_STATUSES = ["VERIFIED", "UNVERIFIED", "REJECTED"] as const;
export type SourceVerificationStatus = (typeof SOURCE_VERIFICATION_STATUSES)[number];

export const SOURCE_REVIEW_STATES = ["UNREVIEWED", "REVIEWED", "APPROVED", "REJECTED"] as const;
export type SourceReviewState = (typeof SOURCE_REVIEW_STATES)[number];

export const ROLE_RELEVANCE_STATES = ["IN_ROLE", "ADJACENT", "OUT_OF_ROLE"] as const;
export type RoleRelevance = (typeof ROLE_RELEVANCE_STATES)[number];

export const COVERAGE_COMPLETENESS = ["NONE", "PARTIAL", "COMPLETE"] as const;
export type CoverageCompleteness = (typeof COVERAGE_COMPLETENESS)[number];

export const PROOF_GAP_REASONS = [
  "NO_QUALIFYING_SOURCE",
  "INCOMPLETE_COVERAGE",
  "STALE_EVIDENCE",
  "UNVERIFIED_SOURCE",
  "REVIEW_INCOMPLETE",
  "EXECUTABLE_CODE_NOT_OBSERVED",
] as const;

export type ProofGapReason = (typeof PROOF_GAP_REASONS)[number];

export const FLAGSHIP_PRIMARY_TARGET_IDS = [
  "PR-AI-04",
  "PR-AI-05",
  "PR-AI-07",
  "PR-AI-08",
] as const satisfies readonly ProofRequirementId[];

export const FLAGSHIP_SECONDARY_OBSERVATION_IDS = [
  "PR-AI-01",
  "PR-AI-02",
  "PR-AI-03",
  "PR-AI-06",
] as const satisfies readonly ProofRequirementId[];

export class ProofCoverageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProofCoverageError";
  }
}

export interface ProofRequirement {
  id: ProofRequirementId;
  specVersion: typeof APPLIED_AI_PROOF_SPEC_VERSION;
  requirementVersion: 1;
  title: string;
  description: string;
  whyRoleRelevant: string;
  observationOpportunities: readonly string[];
  strongAnchor: string;
  moderateAnchor: string;
  weakAnchor: string;
  insufficientEvidenceAnchor: string;
  commonFailureModes: readonly string[];
  knownLimits: string;
}

export interface ExistingProofSource {
  id: string;
  kind: ExistingProofSourceKind;
  requirementId: ProofRequirementId;
  capturedAt: string;
  freshUntil: string | null;
  verificationStatus: SourceVerificationStatus;
  reviewState: SourceReviewState;
  roleRelevance: RoleRelevance;
  completeness: CoverageCompleteness;
  limitations: readonly string[];
  executableCodeObserved: boolean;
  explicitlyApproved: boolean;
  /** Human-readable context. Coverage derivation must not inspect this field. */
  narrative: string;
}

export interface CandidateRoleProofProfile {
  candidateId: string;
  label: string;
  specVersion: typeof APPLIED_AI_PROOF_SPEC_VERSION;
  roleFamily: typeof APPLIED_AI_ROLE_FAMILY;
  displayRole: typeof APPLIED_AI_DISPLAY_ROLE;
  roleIntent: AppliedAiRoleIntent;
  sources: readonly ExistingProofSource[];
}

export interface RequirementCoverage {
  requirementId: ProofRequirementId;
  state: CoverageState;
  contributingSourceIds: readonly string[];
  staleSourceIds: readonly string[];
  visibleLimitations: readonly string[];
  executableCodeObserved: boolean;
}

export interface ProofCoverageSnapshot {
  specVersion: typeof APPLIED_AI_PROOF_SPEC_VERSION;
  candidateId: string;
  asOf: string;
  byRequirement: Record<ProofRequirementId, RequirementCoverage>;
}

export interface ProofGap {
  requirementId: ProofRequirementId;
  coverageState: Extract<CoverageState, "NOT_PROVEN" | "PARTIALLY_PROVEN" | "STALE">;
  reason: ProofGapReason;
  priority: number;
}

export interface TargetedVerificationEpisode {
  id: string;
  specVersion: typeof APPLIED_AI_PROOF_SPEC_VERSION;
  instrumentVersion: string;
  targetRequirementIds: readonly ProofRequirementId[];
  secondaryObservationIds: readonly ProofRequirementId[];
}

export interface ExistingProofSourceInput {
  id: string;
  kind: ExistingProofSourceKind;
  requirementId: ProofRequirementId;
  capturedAt: string;
  freshUntil: string | null;
  verificationStatus: SourceVerificationStatus;
  reviewState: SourceReviewState;
  roleRelevance: RoleRelevance;
  completeness: CoverageCompleteness;
  limitations?: readonly string[];
  executableCodeObserved?: boolean;
  explicitlyApproved?: boolean;
  narrative?: string;
}

export interface CandidateRoleProofProfileInput {
  candidateId: string;
  label: string;
  roleIntent: AppliedAiRoleIntent;
  sources: readonly ExistingProofSource[];
}

export interface TargetedVerificationEpisodeInput {
  id: string;
  instrumentVersion: string;
  targetRequirementIds: readonly ProofRequirementId[];
  secondaryObservationIds?: readonly ProofRequirementId[];
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const GAP_STATE_PRIORITY: Record<ProofGap["coverageState"], number> = {
  NOT_PROVEN: 0,
  STALE: 1,
  PARTIALLY_PROVEN: 2,
};

export function isProofRequirementId(value: string): value is ProofRequirementId {
  return (PROOF_REQUIREMENT_IDS as readonly string[]).includes(value);
}

export function isExistingProofSourceKind(value: string): value is ExistingProofSourceKind {
  return (EXISTING_PROOF_SOURCE_KINDS as readonly string[]).includes(value);
}

export function isCoverageState(value: string): value is CoverageState {
  return (COVERAGE_STATES as readonly string[]).includes(value);
}

export function isAppliedAiRoleAlias(value: string): value is AppliedAiRoleAlias {
  return (APPLIED_AI_ROLE_ALIASES as readonly string[]).includes(value);
}

export function isAppliedAiExclusion(value: string): value is AppliedAiExclusion {
  return (APPLIED_AI_EXCLUSIONS as readonly string[]).includes(value);
}

function isIsoTimestamp(value: string): boolean {
  return ISO_TIMESTAMP.test(value) && Number.isFinite(Date.parse(value));
}

function assertNonEmptyString(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ProofCoverageError(`${field} required`);
  }
  return value;
}

function assertIsoTimestamp(value: string, field: string): string {
  if (!isIsoTimestamp(value)) {
    throw new ProofCoverageError(`${field} must be an ISO-8601 UTC timestamp`);
  }
  return value;
}

function includesValue<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

function uniqueIds(ids: readonly string[], field: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new ProofCoverageError(`${field} must be unique`);
  }
}

export const APPLIED_AI_PROOF_REQUIREMENTS: readonly ProofRequirement[] = Object.freeze([
  {
    id: "PR-AI-01",
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    requirementVersion: 1,
    title: "Problem decomposition",
    description:
      "Converts an ambiguous product need into components, interfaces, assumptions, constraints, failure costs, and testable success conditions.",
    whyRoleRelevant:
      "Applied AI engineers routinely receive underspecified workflows. Production quality depends on defining what the system should do, where uncertainty is acceptable, and what must be measured before choosing models or frameworks.",
    observationOpportunities: Object.freeze([
      "produces a bounded system decomposition",
      "identifies users, irreversible actions, and failure costs",
      "separates quality, reliability, latency, cost, and security goals",
      "records unknowns and assumptions",
      "defines acceptance and release conditions",
    ]),
    strongAnchor:
      "Defines a coherent boundary and measurable success criteria, identifies high-cost failure modes, and uses the decomposition to prioritize work.",
    moderateAnchor:
      "Identifies major components and some measurable criteria, but leaves important assumptions or failure costs implicit.",
    weakAnchor:
      "Jumps into prompt/model changes without a defensible problem boundary or defines success as a subjective demo impression.",
    insufficientEvidenceAnchor:
      "The episode does not require the candidate to frame a problem or make scope choices.",
    commonFailureModes: Object.freeze([
      "solution-first framework selection",
      "conflating model quality with product success",
      "no critical-slice or failure-cost definition",
      "treating every workflow step as an LLM task",
    ]),
    knownLimits:
      "A short episode cannot establish long-horizon roadmap judgment, organization leadership, or domain expertise beyond the supplied materials.",
  },
  {
    id: "PR-AI-02",
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    requirementVersion: 1,
    title: "AI system architecture",
    description:
      "Designs an appropriate boundary across model calls, deterministic code, tools, state, persistence, retrieval where necessary, validation, and human review.",
    whyRoleRelevant:
      "Employers need engineers who can turn models into reliable systems, not merely call an API.",
    observationOpportunities: Object.freeze([
      "diagrams or records components and interfaces",
      "chooses where state and durable checkpoints live",
      "defines tool permissions and validation boundaries",
      "uses retrieval only when external knowledge is required",
      "preserves auditability and human escalation",
    ]),
    strongAnchor:
      "Chooses the simplest architecture that satisfies the requirements, keeps probabilistic boundaries explicit, and explains state, validation, and recovery.",
    moderateAnchor:
      "Architecture is plausible but leaves one important boundary—state, validation, permissions, or recovery—underspecified.",
    weakAnchor:
      "Adds opaque chains/agents without necessity, treats a framework as the architecture, or ignores persistence and failure boundaries.",
    insufficientEvidenceAnchor: "Only isolated prompt text is observed.",
    commonFailureModes: Object.freeze([
      "RAG or multi-agent design by default",
      "hidden mutable state",
      "model-controlled authorization",
      "no separation between generated suggestions and irreversible actions",
    ]),
    knownLimits:
      "The episode does not prove distributed model serving, large-scale ML infrastructure, or GPU systems design.",
  },
  {
    id: "PR-AI-03",
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    requirementVersion: 1,
    title: "LLM and tool orchestration",
    description:
      "Builds or reasons about multi-step workflows with typed tools, structured model output, explicit state transitions, bounded retries, and controlled behavior.",
    whyRoleRelevant:
      "Tool and state coordination is a recurring source of production failures in model-powered applications.",
    observationOpportunities: Object.freeze([
      "defines typed tool inputs and outputs",
      "validates model output before tool execution",
      "bounds loops and retries",
      "handles partial execution and resumed state",
      "makes side effects idempotent",
      "records model/config/tool versions",
    ]),
    strongAnchor:
      "Produces an inspectable, bounded workflow whose tools, states, errors, and side effects have explicit contracts.",
    moderateAnchor:
      "Happy-path orchestration is sound, but one recovery or idempotency path remains weak.",
    weakAnchor:
      "Relies on free-form output, unbounded loops, blind retry, or model discretion for permissions.",
    insufficientEvidenceAnchor: "No multi-step or tool-mediated behavior is observed.",
    commonFailureModes: Object.freeze([
      "retrying permanent errors",
      "duplicate writes after retry",
      "schema-valid but semantically invalid tool arguments",
      "broad tool permissions",
      "no maximum-iteration or timeout policy",
    ]),
    knownLimits:
      "One bounded workflow does not prove experience operating large multi-agent or long-running distributed systems.",
  },
  {
    id: "PR-AI-04",
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    requirementVersion: 1,
    title: "Evaluation engineering",
    description:
      "Defines success, creates representative and failure cases, builds regression checks, and combines deterministic, model-based, and human evaluation where appropriate.",
    whyRoleRelevant:
      "The research consistently separates production engineers from demo builders by whether they can measure quality and make evidence-based release decisions.",
    observationOpportunities: Object.freeze([
      "audits the existing eval set",
      "adds difficult, malformed, and known-failure cases",
      "chooses deterministic checks where possible",
      "defines a rubric for semantic judgment",
      "compares before/after versions",
      "identifies contamination, overfitting, and uncertainty",
    ]),
    strongAnchor:
      "Creates a representative evaluation path, captures discovered failures as regressions, and conditions claims on measured results and known limits.",
    moderateAnchor:
      "Improves the eval set and measures change, but coverage or judge calibration is incomplete.",
    weakAnchor:
      "Uses only happy-path examples, reports an aggregate improvement without slice analysis, or claims success from a few manual demos.",
    insufficientEvidenceAnchor: "No evaluation design or result is produced.",
    commonFailureModes: Object.freeze([
      "eval set too easy",
      "optimizing to the visible cases",
      "no baseline",
      "no failure taxonomy",
      "treating an LLM judge as ground truth",
      "ignoring latency/cost regressions",
    ]),
    knownLimits:
      "A small episode cannot prove large-scale evaluation infrastructure, long-term online experimentation, or domain-expert calibration.",
  },
  {
    id: "PR-AI-05",
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    requirementVersion: 1,
    title: "Reliability and failure recovery",
    description:
      "Handles malformed or semantically invalid output, provider and tool failures, partial execution, retries, fallback, idempotency, observability, and recovery.",
    whyRoleRelevant:
      "Production model systems fail in more ways than a deterministic happy path: provider limits, stochastic output, tool errors, and repeated side effects must be expected.",
    observationOpportunities: Object.freeze([
      "classifies transient and permanent errors",
      "honors retry guidance and applies bounded backoff",
      "validates semantics after schema validation",
      "prevents duplicate side effects",
      "adds fallback or human escalation",
      "creates useful traces and alerts",
    ]),
    strongAnchor:
      "Fixes the highest-impact failure with bounded recovery, verifies it against a regression case, and preserves auditability.",
    moderateAnchor:
      "Handles the primary failure but leaves a secondary recovery path or operational signal incomplete.",
    weakAnchor:
      "Blindly retries, catches and suppresses errors, or improves the demo while leaving duplicate/partial execution possible.",
    insufficientEvidenceAnchor: "No failure or recovery behavior is exercised.",
    commonFailureModes: Object.freeze([
      "retry storms",
      "retrying 4xx/permanent validation errors",
      "no idempotency key",
      "schema validation without business validation",
      "logs that omit the model/config/tool version",
      "sensitive content in telemetry",
    ]),
    knownLimits:
      "The episode does not prove sustained on-call performance or resilience at internet scale.",
  },
  {
    id: "PR-AI-06",
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    requirementVersion: 1,
    title: "Software engineering quality",
    description:
      "Writes maintainable surrounding software with clear modules, reasonable abstractions, tests, types/schemas, error handling, and readable code.",
    whyRoleRelevant:
      "Applied AI remains software engineering. Model integration does not excuse weak interfaces, untested code, or unmaintainable abstractions.",
    observationOpportunities: Object.freeze([
      "edits executable code or configuration",
      "adds focused tests",
      "uses typed schemas at boundaries",
      "keeps model-provider details behind clear interfaces",
      "handles errors without swallowing context",
      "avoids unnecessary architecture",
    ]),
    strongAnchor:
      "Makes a focused, readable change with appropriate tests and boundaries, and the executed checks pass.",
    moderateAnchor:
      "The change works and is understandable but has limited tests or one avoidable coupling.",
    weakAnchor:
      "Decorative code, broad rewrites, dead abstractions, no tests, or changes that cannot be executed.",
    insufficientEvidenceAnchor:
      "The environment cannot execute or meaningfully inspect candidate code. In that case Fydell must not issue a strong software-engineering claim.",
    commonFailureModes: Object.freeze([
      "notebook/demo code presented as production-ready",
      "framework-driven over-abstraction",
      "no type/schema boundary",
      "no regression tests",
      "unrelated rewrite instead of a targeted fix",
    ]),
    knownLimits:
      "A small repository does not prove performance in a large legacy codebase, distributed systems expertise, or long-term maintainership.",
  },
  {
    id: "PR-AI-07",
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    requirementVersion: 1,
    title: "Cost and latency judgment",
    description:
      "Makes realistic tradeoffs involving model choice, call count, context size, caching, batching, latency distributions, and cost.",
    whyRoleRelevant:
      "Production AI products are constrained by tail latency and per-request cost; quality-only optimization can make a system commercially unusable.",
    observationOpportunities: Object.freeze([
      "reads p50/p95 latency and cost data",
      "identifies the expensive/slow path",
      "considers fewer calls, smaller models, shorter context, caching, or deterministic logic",
      "measures rather than assumes improvement",
      "checks quality after optimization",
    ]),
    strongAnchor:
      "Chooses and validates a change against quality, p95 latency, and cost, and states the remaining tradeoff.",
    moderateAnchor:
      "Makes a plausible optimization and measures one or two axes, but leaves an important tradeoff unverified.",
    weakAnchor:
      "Selects a cheaper/faster model without eval evidence, optimizes average rather than tail latency, or ignores call amplification.",
    insufficientEvidenceAnchor: "No latency/cost constraint or measurement is available.",
    commonFailureModes: Object.freeze([
      "model swap by reputation",
      "no before/after measurement",
      "cache proposal without cacheability analysis",
      "reducing latency while regressing critical quality",
      "ignoring first-request/schema or retry latency",
    ]),
    knownLimits:
      "Fixture pricing and latency cannot prove capacity planning, provider negotiation, or large-scale serving expertise.",
  },
  {
    id: "PR-AI-08",
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    requirementVersion: 1,
    title: "Product and model judgment",
    description:
      "Determines when a step should use an LLM, deterministic software, retrieval, or human review.",
    whyRoleRelevant:
      "This is the signature Applied AI judgment repeatedly identified in employer and practitioner sources. Good engineers do not maximize the number of model calls.",
    observationOpportunities: Object.freeze([
      "identifies a deterministic step currently delegated to a model",
      "preserves model use where semantic ambiguity creates value",
      "places authorization and hard constraints outside the model",
      "explains where human review is required",
      "validates the boundary through evals",
    ]),
    strongAnchor:
      "Moves at least one boundary for a defensible product/system reason and verifies that the result improves reliability, latency, cost, or control without unacceptable quality loss.",
    moderateAnchor:
      "Articulates the correct boundary and makes a partial improvement, but validation is incomplete.",
    weakAnchor:
      "Uses the model for deterministic routing/authorization, removes a useful model step without evidence, or argues from preference rather than system behavior.",
    insufficientEvidenceAnchor: "No boundary decision is available to the candidate.",
    commonFailureModes: Object.freeze([
      "“AI everywhere” design",
      "deterministic rules for genuinely ambiguous semantic work",
      "authorization in prompts",
      "no human escalation for irreversible uncertainty",
      "no evidence that the boundary change helped",
    ]),
    knownLimits:
      "One scenario cannot establish product taste across domains or long-term user research ability.",
  },
]) satisfies readonly ProofRequirement[];

export function requirementById(id: ProofRequirementId): ProofRequirement {
  const found = APPLIED_AI_PROOF_REQUIREMENTS.find((requirement) => requirement.id === id);
  if (!found) {
    throw new ProofCoverageError(`unknown requirement ${id}`);
  }
  return found;
}

export function createExistingProofSource(input: ExistingProofSourceInput): ExistingProofSource {
  const id = assertNonEmptyString(input.id, "id");
  if (!isExistingProofSourceKind(input.kind)) {
    throw new ProofCoverageError("invalid source kind");
  }
  if (!isProofRequirementId(input.requirementId)) {
    throw new ProofCoverageError("invalid requirementId");
  }
  const capturedAt = assertIsoTimestamp(input.capturedAt, "capturedAt");
  const freshUntil =
    input.freshUntil === null ? null : assertIsoTimestamp(input.freshUntil, "freshUntil");
  if (freshUntil !== null && Date.parse(freshUntil) < Date.parse(capturedAt)) {
    throw new ProofCoverageError("freshUntil must be at or after capturedAt");
  }
  if (!includesValue(SOURCE_VERIFICATION_STATUSES, input.verificationStatus)) {
    throw new ProofCoverageError("invalid verificationStatus");
  }
  if (!includesValue(SOURCE_REVIEW_STATES, input.reviewState)) {
    throw new ProofCoverageError("invalid reviewState");
  }
  if (!includesValue(ROLE_RELEVANCE_STATES, input.roleRelevance)) {
    throw new ProofCoverageError("invalid roleRelevance");
  }
  if (!includesValue(COVERAGE_COMPLETENESS, input.completeness)) {
    throw new ProofCoverageError("invalid completeness");
  }
  const explicitlyApproved = input.explicitlyApproved === true;
  if (input.kind === "OTHER_APPROVED" && !explicitlyApproved) {
    throw new ProofCoverageError("OTHER_APPROVED sources require explicitlyApproved");
  }
  const limitations = Object.freeze([...(input.limitations ?? [])]);
  if (!limitations.every((item) => typeof item === "string")) {
    throw new ProofCoverageError("limitations must be strings");
  }

  return Object.freeze({
    id,
    kind: input.kind,
    requirementId: input.requirementId,
    capturedAt,
    freshUntil,
    verificationStatus: input.verificationStatus,
    reviewState: input.reviewState,
    roleRelevance: input.roleRelevance,
    completeness: input.completeness,
    limitations,
    executableCodeObserved: input.executableCodeObserved === true,
    explicitlyApproved,
    narrative: input.narrative ?? "",
  });
}

export function createCandidateRoleProofProfile(
  input: CandidateRoleProofProfileInput,
): CandidateRoleProofProfile {
  const candidateId = assertNonEmptyString(input.candidateId, "candidateId");
  const label = assertNonEmptyString(input.label, "label");
  if (input.roleIntent.kind === "IN_SCOPE") {
    if (input.roleIntent.alias !== undefined && !isAppliedAiRoleAlias(input.roleIntent.alias)) {
      throw new ProofCoverageError("invalid role alias");
    }
  } else if (input.roleIntent.kind === "EXCLUDED") {
    if (!isAppliedAiExclusion(input.roleIntent.exclusion)) {
      throw new ProofCoverageError("invalid exclusion");
    }
  } else {
    const _exhaustive: never = input.roleIntent;
    throw new ProofCoverageError(`unhandled role intent ${JSON.stringify(_exhaustive)}`);
  }
  uniqueIds(
    input.sources.map((source) => source.id),
    "sources.id",
  );

  return Object.freeze({
    candidateId,
    label,
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    roleFamily: APPLIED_AI_ROLE_FAMILY,
    displayRole: APPLIED_AI_DISPLAY_ROLE,
    roleIntent: input.roleIntent,
    sources: Object.freeze([...input.sources]),
  });
}

export function createTargetedVerificationEpisode(
  input: TargetedVerificationEpisodeInput,
): TargetedVerificationEpisode {
  const id = assertNonEmptyString(input.id, "id");
  const instrumentVersion = assertNonEmptyString(input.instrumentVersion, "instrumentVersion");
  if (input.targetRequirementIds.length === 0) {
    throw new ProofCoverageError("targetRequirementIds required");
  }
  for (const requirementId of input.targetRequirementIds) {
    if (!isProofRequirementId(requirementId)) {
      throw new ProofCoverageError(`invalid target requirement ${requirementId}`);
    }
  }
  uniqueIds(input.targetRequirementIds, "targetRequirementIds");
  const secondaryObservationIds = input.secondaryObservationIds ?? [];
  for (const requirementId of secondaryObservationIds) {
    if (!isProofRequirementId(requirementId)) {
      throw new ProofCoverageError(`invalid secondary requirement ${requirementId}`);
    }
  }
  uniqueIds(secondaryObservationIds, "secondaryObservationIds");
  const overlap = secondaryObservationIds.filter((requirementId) =>
    input.targetRequirementIds.includes(requirementId),
  );
  if (overlap.length > 0) {
    throw new ProofCoverageError("secondaryObservationIds must be disjoint from targets");
  }

  return Object.freeze({
    id,
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    instrumentVersion,
    targetRequirementIds: Object.freeze([...input.targetRequirementIds]),
    secondaryObservationIds: Object.freeze([...secondaryObservationIds]),
  });
}

function sourceKindIsUsable(source: ExistingProofSource): boolean {
  if (source.kind === "OTHER_APPROVED") return source.explicitlyApproved;
  return true;
}

function sourceIsRejected(source: ExistingProofSource): boolean {
  return source.verificationStatus === "REJECTED" || source.reviewState === "REJECTED";
}

function sourceIsStale(source: ExistingProofSource, asOfMs: number): boolean {
  return source.freshUntil !== null && Date.parse(source.freshUntil) < asOfMs;
}

function sourceIsRoleRelevant(source: ExistingProofSource): boolean {
  return source.roleRelevance === "IN_ROLE";
}

function sourceIsQualifying(source: ExistingProofSource): boolean {
  return sourceKindIsUsable(source) && !sourceIsRejected(source) && sourceIsRoleRelevant(source);
}

function sourceIsVerifiedAndReviewed(source: ExistingProofSource): boolean {
  return (
    source.verificationStatus === "VERIFIED" &&
    (source.reviewState === "REVIEWED" || source.reviewState === "APPROVED")
  );
}

function meetsProvenBar(source: ExistingProofSource, requirementId: ProofRequirementId): boolean {
  if (!sourceIsQualifying(source)) return false;
  if (!sourceIsVerifiedAndReviewed(source)) return false;
  if (source.completeness !== "COMPLETE") return false;
  if (requirementId === "PR-AI-06" && !source.executableCodeObserved) return false;
  return true;
}

function meetsPartialBar(source: ExistingProofSource, requirementId: ProofRequirementId): boolean {
  if (!sourceIsQualifying(source)) return false;
  if (source.completeness === "NONE") return false;
  if (meetsProvenBar(source, requirementId)) return false;
  return true;
}

function limitationsOf(sources: readonly ExistingProofSource[]): readonly string[] {
  return Object.freeze(sources.flatMap((source) => [...source.limitations]));
}

function deriveRequirementCoverage(
  requirementId: ProofRequirementId,
  sources: readonly ExistingProofSource[],
  asOfMs: number,
  roleIntent: AppliedAiRoleIntent,
): RequirementCoverage {
  if (roleIntent.kind === "EXCLUDED") {
    return {
      requirementId,
      state: "NOT_APPLICABLE",
      contributingSourceIds: [],
      staleSourceIds: [],
      visibleLimitations: limitationsOf(sources),
      executableCodeObserved: sources.some((source) => source.executableCodeObserved),
    };
  }

  const forRequirement = sources.filter((source) => source.requirementId === requirementId);
  const qualifying = forRequirement.filter(sourceIsQualifying);
  const stale = qualifying.filter((source) => sourceIsStale(source, asOfMs));
  const fresh = qualifying.filter((source) => !sourceIsStale(source, asOfMs));
  const executableCodeObserved = qualifying.some((source) => source.executableCodeObserved);

  const freshProven = fresh.filter((source) => meetsProvenBar(source, requirementId));
  if (freshProven.length > 0) {
    return {
      requirementId,
      state: "PROVEN",
      contributingSourceIds: freshProven.map((source) => source.id),
      staleSourceIds: stale.map((source) => source.id),
      visibleLimitations: limitationsOf(freshProven),
      executableCodeObserved,
    };
  }

  const freshPartial = fresh.filter((source) => meetsPartialBar(source, requirementId));
  if (freshPartial.length > 0) {
    return {
      requirementId,
      state: "PARTIALLY_PROVEN",
      contributingSourceIds: freshPartial.map((source) => source.id),
      staleSourceIds: stale.map((source) => source.id),
      visibleLimitations: limitationsOf(freshPartial),
      executableCodeObserved,
    };
  }

  const staleProvenOrPartial = stale.filter(
    (source) => meetsProvenBar(source, requirementId) || meetsPartialBar(source, requirementId),
  );
  if (staleProvenOrPartial.length > 0) {
    return {
      requirementId,
      state: "STALE",
      contributingSourceIds: staleProvenOrPartial.map((source) => source.id),
      staleSourceIds: staleProvenOrPartial.map((source) => source.id),
      visibleLimitations: limitationsOf(staleProvenOrPartial),
      executableCodeObserved,
    };
  }

  return {
    requirementId,
    state: "NOT_PROVEN",
    contributingSourceIds: [],
    staleSourceIds: stale.map((source) => source.id),
    visibleLimitations: limitationsOf(forRequirement),
    executableCodeObserved,
  };
}

export function deriveProofCoverage(
  profile: CandidateRoleProofProfile,
  asOf: string,
): ProofCoverageSnapshot {
  const asOfStamp = assertIsoTimestamp(asOf, "asOf");
  const asOfMs = Date.parse(asOfStamp);
  const byRequirement = {} as Record<ProofRequirementId, RequirementCoverage>;
  for (const requirementId of PROOF_REQUIREMENT_IDS) {
    byRequirement[requirementId] = deriveRequirementCoverage(
      requirementId,
      profile.sources,
      asOfMs,
      profile.roleIntent,
    );
  }
  return Object.freeze({
    specVersion: APPLIED_AI_PROOF_SPEC_VERSION,
    candidateId: profile.candidateId,
    asOf: asOfStamp,
    byRequirement,
  });
}

function gapReason(coverage: RequirementCoverage): ProofGapReason {
  if (coverage.state === "STALE") return "STALE_EVIDENCE";
  if (coverage.state === "PARTIALLY_PROVEN") {
    if (coverage.requirementId === "PR-AI-06" && !coverage.executableCodeObserved) {
      return "EXECUTABLE_CODE_NOT_OBSERVED";
    }
    return "INCOMPLETE_COVERAGE";
  }
  if (coverage.staleSourceIds.length > 0) return "STALE_EVIDENCE";
  return "NO_QUALIFYING_SOURCE";
}

export function deriveProofGaps(snapshot: ProofCoverageSnapshot): readonly ProofGap[] {
  const gaps: ProofGap[] = [];
  for (const requirementId of PROOF_REQUIREMENT_IDS) {
    const coverage = snapshot.byRequirement[requirementId];
    if (
      coverage.state !== "NOT_PROVEN" &&
      coverage.state !== "PARTIALLY_PROVEN" &&
      coverage.state !== "STALE"
    ) {
      continue;
    }
    gaps.push({
      requirementId,
      coverageState: coverage.state,
      reason: gapReason(coverage),
      priority: 0,
    });
  }
  gaps.sort((left, right) => {
    const stateDelta = GAP_STATE_PRIORITY[left.coverageState] - GAP_STATE_PRIORITY[right.coverageState];
    if (stateDelta !== 0) return stateDelta;
    return PROOF_REQUIREMENT_IDS.indexOf(left.requirementId) - PROOF_REQUIREMENT_IDS.indexOf(right.requirementId);
  });
  return Object.freeze(
    gaps.map((gap, index) =>
      Object.freeze({
        ...gap,
        priority: index + 1,
      }),
    ),
  );
}

export function validateEpisodeTargets(
  episode: TargetedVerificationEpisode,
  snapshot: ProofCoverageSnapshot,
): { ok: true } | { ok: false; issues: readonly string[] } {
  const issues: string[] = [];
  if (episode.targetRequirementIds.length === 0) {
    issues.push("episode must record target requirement IDs");
  }
  for (const requirementId of episode.targetRequirementIds) {
    const coverage = snapshot.byRequirement[requirementId];
    if (!coverage) {
      issues.push(`unknown target ${requirementId}`);
      continue;
    }
    if (coverage.state === "PROVEN") {
      issues.push(`${requirementId} is already PROVEN and cannot be an episode target`);
    }
    if (coverage.state === "NOT_APPLICABLE") {
      issues.push(`${requirementId} is NOT_APPLICABLE and cannot be an episode target`);
    }
  }
  for (const requirementId of episode.secondaryObservationIds) {
    const coverage = snapshot.byRequirement[requirementId];
    if (coverage?.state === "NOT_APPLICABLE") {
      issues.push(`${requirementId} is NOT_APPLICABLE and cannot be a secondary observation`);
    }
  }
  if (issues.length > 0) return { ok: false, issues: Object.freeze(issues) };
  return { ok: true };
}

export const CANDIDATE_01_ID = "candidate-01" as const;
export const CANDIDATE_01_LABEL = "Candidate 01" as const;
export const CANDIDATE_01_PREWORK_AS_OF = "2026-08-21T00:00:00.000Z" as const;

function candidate01Source(
  requirementId: Exclude<ProofRequirementId, "PR-AI-04" | "PR-AI-05" | "PR-AI-07" | "PR-AI-08">,
): ExistingProofSource {
  const softwareEngineering = requirementId === "PR-AI-06";
  return createExistingProofSource({
    id: `c01-prior-${requirementId.toLowerCase()}`,
    kind: "PRIOR_WORK_RECEIPT",
    requirementId,
    capturedAt: "2026-05-01T00:00:00.000Z",
    freshUntil: "2027-05-01T00:00:00.000Z",
    verificationStatus: "VERIFIED",
    reviewState: "APPROVED",
    roleRelevance: "IN_ROLE",
    completeness: "COMPLETE",
    executableCodeObserved: false,
    limitations: Object.freeze([
      softwareEngineering
        ? "The prior receipt did not execute candidate-authored code, so software engineering remains partial."
        : "Prior receipt observed this requirement in a bounded Applied AI work episode.",
    ]),
    narrative: `Prior Fydell work receipt for ${requirementId}.`,
  });
}

function candidate01PartialTargetSource(
  requirementId: Extract<ProofRequirementId, "PR-AI-04" | "PR-AI-05">,
): ExistingProofSource {
  return createExistingProofSource({
    id: `c01-verified-${requirementId.toLowerCase()}`,
    kind: "VERIFIED_ARTIFACT",
    requirementId,
    capturedAt: "2026-06-12T00:00:00.000Z",
    freshUntil: "2027-06-12T00:00:00.000Z",
    verificationStatus: "VERIFIED",
    reviewState: "APPROVED",
    roleRelevance: "IN_ROLE",
    completeness: "PARTIAL",
    executableCodeObserved: false,
    limitations: Object.freeze([
      "The artifact supports part of the requirement but does not exercise the flagship reliability and latency constraint.",
    ]),
    narrative: `Verified project artifact with partial coverage for ${requirementId}.`,
  });
}

export function createCandidate01PreWorkProfile(): CandidateRoleProofProfile {
  return createCandidateRoleProofProfile({
    candidateId: CANDIDATE_01_ID,
    label: CANDIDATE_01_LABEL,
    roleIntent: { kind: "IN_SCOPE" },
    sources: Object.freeze([
      candidate01Source("PR-AI-01"),
      candidate01Source("PR-AI-02"),
      candidate01Source("PR-AI-03"),
      candidate01Source("PR-AI-06"),
      candidate01PartialTargetSource("PR-AI-04"),
      candidate01PartialTargetSource("PR-AI-05"),
    ]),
  });
}

export function createFlagshipTargetedEpisode(): TargetedVerificationEpisode {
  return createTargetedVerificationEpisode({
    id: "aai-flagship-hardening-episode",
    instrumentVersion: APPLIED_AI_FLAGSHIP_INSTRUMENT_VERSION,
    targetRequirementIds: FLAGSHIP_PRIMARY_TARGET_IDS,
    secondaryObservationIds: FLAGSHIP_SECONDARY_OBSERVATION_IDS,
  });
}
