import type { EvidenceClaimDraft } from "../types";
import type { AppliedAiEvalResult } from "./applied-ai-workspace";
import type { SandboxReviewRecord } from "./repositories";

export const APPLIED_AI_RECEIPT_FORMAT_VERSION = "aai-work-receipt-v1";
export const APPLIED_AI_TARGET_REQUIREMENTS = ["PR-AI-04", "PR-AI-05", "PR-AI-07", "PR-AI-08"] as const;

export type ClaimReviewStatus =
  | "GENERATED"
  | "REVIEW_REQUIRED"
  | "REVIEWED"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED";

export interface InterviewPlan {
  confirm: string[];
  investigate: string[];
  challenge: string[];
}

type MeasuredEvaluation = Omit<AppliedAiEvalResult, "explanations"> & {
  explanations?: readonly string[];
};

export interface ClaimReviewAuditDraft {
  claim_id: string;
  reviewer: "sandbox_visitor" | "scripted_sandbox";
  action: SandboxReviewRecord["decision"];
  reason: string;
  before: { review_status: ClaimReviewStatus };
  after: { review_status: ClaimReviewStatus };
}

export function projectClaimEventIds(
  links: Array<{ event_id: string; relation: string }>,
): { supportingEventIds: string[]; counterevidenceEventIds: string[] } {
  return {
    supportingEventIds: links
      .filter((link) => link.relation === "supporting")
      .map((link) => link.event_id)
      .sort(),
    counterevidenceEventIds: links
      .filter((link) => link.relation === "counterevidence")
      .map((link) => link.event_id)
      .sort(),
  };
}

export interface AppliedAiReceiptPayload {
  formatVersion: typeof APPLIED_AI_RECEIPT_FORMAT_VERSION;
  kind: "sandbox_work_receipt";
  role: { title: "Applied AI Engineer"; proofSpecVersion: "aai-proof-v1"; fixtureVersion: string };
  targetRequirementIds: readonly string[];
  completedWork: string[];
  evaluatorSummary: {
    baseline: AppliedAiEvalResult | null;
    postFact: AppliedAiEvalResult | null;
  };
  changedFact: { id: "LATENCY_001"; released: boolean };
  defense: { questionExists: boolean; responseExists: boolean };
  reviewedClaims: Array<{
    id: string;
    requirementId: string;
    direction: EvidenceClaimDraft["direction"];
    summary: string;
    reviewStatus: string;
    supportingEventIds: string[];
    counterevidenceEventIds: string[];
  }>;
  sourceEventIds: string[];
  review: {
    label: string;
    kind: SandboxReviewRecord["kind"];
    decision: SandboxReviewRecord["decision"];
    disclaimer: string;
  };
  conditions: string[];
  limitations: string[];
  integrityNotice: string;
}

export function reviewStatusFor(
  decision: SandboxReviewRecord["decision"],
  publishApproved: boolean,
): ClaimReviewStatus {
  if (decision === "reject") return "REJECTED";
  if (decision === "limit" || decision === "follow_up") return "REVIEWED";
  return publishApproved ? "PUBLISHED" : "APPROVED";
}

export function shouldPublishBrief(record: SandboxReviewRecord): boolean {
  return record.decision === "approve";
}

export function claimReviewAuditDraft(input: {
  claimId: string;
  beforeStatus: ClaimReviewStatus;
  record: SandboxReviewRecord;
  reason?: string;
}): ClaimReviewAuditDraft {
  const reviewer = input.record.kind === "sandbox_visitor" ? "sandbox_visitor" : "scripted_sandbox";
  const next = reviewStatusFor(input.record.decision, input.record.decision === "approve");
  return {
    claim_id: input.claimId,
    reviewer,
    action: input.record.decision,
    reason: input.reason ?? `${input.record.label}: ${input.record.disclaimer}`,
    before: { review_status: input.beforeStatus },
    after: { review_status: next },
  };
}

function metricSummary(evaluation: MeasuredEvaluation | null): string {
  if (!evaluation) return "no valid post-fact evaluator snapshot";
  return `p95 ${evaluation.p95LatencySeconds}s, critical authorization ${evaluation.criticalSliceQuality}%, semantic failures ${evaluation.semanticFailureRate}%, duplicate side effects ${evaluation.duplicateSideEffectRate}%`;
}

export function deriveInterviewPlan(
  claims: EvidenceClaimDraft[],
  postFact: MeasuredEvaluation | null,
): InterviewPlan {
  const measured = metricSummary(postFact);
  const plan: InterviewPlan = { confirm: [], investigate: [], challenge: [] };
  for (const claim of claims) {
    const question =
      claim.direction === "STRENGTH"
        ? `${claim.competency}: Confirm how you would validate this result against production traffic beyond the synthetic runtime (${measured}).`
        : claim.direction === "INSUFFICIENT_EVIDENCE"
          ? `${claim.competency}: Investigate what production evidence would resolve the measured uncertainty (${measured}).`
          : `${claim.competency}: Challenge the tradeoff or regression shown by the evaluator (${measured}) and identify a safer release gate.`;
    if (claim.direction === "STRENGTH") plan.confirm.push(question);
    else if (claim.direction === "INSUFFICIENT_EVIDENCE") plan.investigate.push(question);
    else plan.challenge.push(question);
  }
  if (plan.investigate.length === 0) {
    plan.investigate.push(
      `PR-AI-04/05/07/08: Investigate whether the measured result (${measured}) survives real provider behavior, production traffic, and execution of the proposal code.`,
    );
  }
  return plan;
}

export function buildAppliedAiReceiptPayload(input: {
  fixtureVersion: string;
  completedWork: string[];
  baseline: AppliedAiEvalResult | null;
  postFact: AppliedAiEvalResult | null;
  factReleased: boolean;
  defenseQuestionExists: boolean;
  defenseResponseExists: boolean;
  claims: AppliedAiReceiptPayload["reviewedClaims"];
  sourceEventIds: string[];
  review: SandboxReviewRecord;
  conditions: string[];
}): AppliedAiReceiptPayload {
  return {
    formatVersion: APPLIED_AI_RECEIPT_FORMAT_VERSION,
    kind: "sandbox_work_receipt",
    role: {
      title: "Applied AI Engineer",
      proofSpecVersion: "aai-proof-v1",
      fixtureVersion: input.fixtureVersion,
    },
    targetRequirementIds: APPLIED_AI_TARGET_REQUIREMENTS,
    completedWork: input.completedWork,
    evaluatorSummary: { baseline: input.baseline, postFact: input.postFact },
    changedFact: { id: "LATENCY_001", released: input.factReleased },
    defense: {
      questionExists: input.defenseQuestionExists,
      responseExists: input.defenseResponseExists,
    },
    reviewedClaims: input.claims,
    sourceEventIds: [...new Set(input.sourceEventIds)].sort(),
    review: {
      label: input.review.label,
      kind: input.review.kind,
      decision: input.review.decision,
      disclaimer: input.review.disclaimer,
    },
    conditions: input.conditions,
    limitations: [
      "Deterministic synthetic evaluator; no production traffic was observed.",
      "Proposal code was recorded but not executed by the sandbox.",
      "This receipt records sandbox work and review state; it is not an independent credential or a tamper-proof attestation.",
    ],
    integrityNotice:
      "The SHA-256 value checks canonical payload consistency and format version. It is not an independent credential and is not tamper-proof.",
  };
}
