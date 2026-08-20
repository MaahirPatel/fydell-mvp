import type { SimulationAttempt, SimulationScenarioDefinition } from "../types";
import {
  buildSeparatedLabLedger,
  type OrderedLabEvent,
  type SeparatedLabEventLedger,
} from "../events/labEventLedger";
import type {
  NorthlineEvidenceClaim,
  NorthlinePassAResult,
  NorthlinePassBResult,
} from "./northlineEvaluator";

export type NorthlineWorkflowStage =
  | "DEFENSE_REQUIRED"
  | "REVIEW_REQUIRED"
  | "PUBLISHED";

export interface NorthlineDefenseQuestion {
  id: string;
  prompt: string;
}

export interface NorthlineDecisionBrief {
  recommendation: "WORTH_INTERVIEWING" | "MORE_EVIDENCE_NEEDED";
  why: string;
  claimIds: string[];
  interviewProbes: string[];
  publishedAt: string;
  reviewerNote: string;
}

export interface NorthlineEvidenceWorkflow {
  id: string;
  attemptId: string;
  scenarioId: string;
  stage: NorthlineWorkflowStage;
  passAClaims: NorthlineEvidenceClaim[];
  passBClaims: NorthlineEvidenceClaim[];
  defenseQuestions: NorthlineDefenseQuestion[];
  defenseResponses: Record<string, string>;
  ledger: SeparatedLabEventLedger;
  brief: NorthlineDecisionBrief | null;
}

function workflowId(attemptId: string): string {
  return `northline-evidence-${attemptId}`;
}

function appendLedgerEvent(
  ledger: SeparatedLabEventLedger,
  event: Omit<OrderedLabEvent, "localSequence">
): SeparatedLabEventLedger {
  const next = { ...event, localSequence: ledger.ordered.length + 1 };
  return {
    ...ledger,
    [next.stream.toLowerCase()]: [
      ...ledger[next.stream.toLowerCase() as "world" | "candidate" | "telemetry" | "system"],
      next,
    ],
    ordered: [...ledger.ordered, next],
  };
}

export function createNorthlineEvidenceWorkflow(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt,
  passA: NorthlinePassAResult
): NorthlineEvidenceWorkflow {
  let ledger = buildSeparatedLabLedger(attempt);
  const baseTime = attempt.metadata.submittedAt ?? Date.now();
  ledger = appendLedgerEvent(ledger, {
    id: `system-pass-a-${attempt.id}`,
    attemptId: attempt.id,
    stream: "SYSTEM",
    eventType: "PASS_A_COMPLETED",
    orderingAuthority: "BROWSER_DEV_STAND_IN",
    occurredAtMs: baseTime + 1,
    recordedAtMs: baseTime + 1,
    payload: { claimCount: passA.claims.length },
  });

  const defenseQuestions = passA.defenseQuestions.map((prompt, index) => ({
    id: `defense-question-${index + 1}`,
    prompt,
  }));
  for (const question of defenseQuestions) {
    ledger = appendLedgerEvent(ledger, {
      id: `system-${question.id}-${attempt.id}`,
      attemptId: attempt.id,
      stream: "SYSTEM",
      eventType: "DEFENSE_QUESTION_GENERATED",
      orderingAuthority: "BROWSER_DEV_STAND_IN",
      occurredAtMs: baseTime + ledger.ordered.length + 1,
      recordedAtMs: baseTime + ledger.ordered.length + 1,
      payload: { questionId: question.id },
    });
  }

  return {
    id: workflowId(attempt.id),
    attemptId: attempt.id,
    scenarioId: scenario.metadata.id,
    stage: "DEFENSE_REQUIRED",
    passAClaims: passA.claims,
    passBClaims: [],
    defenseQuestions,
    defenseResponses: {},
    ledger,
    brief: null,
  };
}

export function recordNorthlineDefense(
  workflow: NorthlineEvidenceWorkflow,
  responses: Record<string, string>,
  now = Date.now()
): NorthlineEvidenceWorkflow {
  let ledger = workflow.ledger;
  for (const [index, question] of workflow.defenseQuestions.entries()) {
    const response = responses[question.id]?.trim() ?? "";
    ledger = appendLedgerEvent(ledger, {
      id: `candidate-defense-${question.id}-${now}`,
      attemptId: workflow.attemptId,
      stream: "CANDIDATE",
      eventType: "DEFENSE_RESPONSE_SUBMITTED",
      orderingAuthority: "BROWSER_DEV_STAND_IN",
      occurredAtMs: now + index,
      recordedAtMs: now + index,
      payload: { questionId: question.id, response },
    });
  }
  return { ...workflow, defenseResponses: responses, ledger };
}

export function acceptNorthlinePassB(
  workflow: NorthlineEvidenceWorkflow,
  passB: NorthlinePassBResult,
  now = Date.now()
): NorthlineEvidenceWorkflow {
  const ledger = appendLedgerEvent(workflow.ledger, {
    id: `system-pass-b-${workflow.attemptId}`,
    attemptId: workflow.attemptId,
    stream: "SYSTEM",
    eventType: "PASS_B_COMPLETED",
    orderingAuthority: "BROWSER_DEV_STAND_IN",
    occurredAtMs: now,
    recordedAtMs: now,
    payload: { claimCount: passB.claims.length },
  });
  return {
    ...workflow,
    stage: "REVIEW_REQUIRED",
    passBClaims: passB.claims,
    ledger,
  };
}

export function publishNorthlineBrief(
  workflow: NorthlineEvidenceWorkflow,
  reviewerNote: string,
  approve: boolean,
  now = Date.now()
): NorthlineEvidenceWorkflow {
  const finalClaims = workflow.passBClaims.map((claim) =>
    approve
      ? claim
      : {
          ...claim,
          direction: "INSUFFICIENT_EVIDENCE" as const,
          confidence: "LOW" as const,
          statement: "Human review found that the available evidence does not support publishing this claim.",
        }
  );
  const strengths = finalClaims.filter((claim) => claim.direction === "STRENGTH");
  const concerns = finalClaims.filter((claim) => claim.direction === "CONCERN");
  const note = reviewerNote.trim() || "Evidence provenance reviewed.";
  let ledger = appendLedgerEvent(workflow.ledger, {
    id: `system-human-review-${workflow.attemptId}`,
    attemptId: workflow.attemptId,
    stream: "SYSTEM",
    eventType: approve ? "CLAIMS_APPROVED" : "CLAIMS_REJECTED",
    orderingAuthority: "BROWSER_DEV_STAND_IN",
    occurredAtMs: now,
    recordedAtMs: now,
    payload: { reviewerNote: note },
  });
  const brief: NorthlineDecisionBrief = {
    recommendation:
      approve && strengths.length > concerns.length
        ? "WORTH_INTERVIEWING"
        : "MORE_EVIDENCE_NEEDED",
    why:
      finalClaims.find((claim) => claim.competencyId === "changed_information_response")
        ?.statement ?? "The available evidence requires further interview probing.",
    claimIds: approve ? finalClaims.map((claim) => claim.id) : [],
    interviewProbes: [
      "Explain how the day-9 correction changed the comparison window.",
      "Explain why the L2 Day residual is actionable without establishing a cause.",
      "Name the next operational check and the evidence that would change the recommendation.",
    ],
    publishedAt: new Date(now).toISOString(),
    reviewerNote: note,
  };
  ledger = appendLedgerEvent(ledger, {
    id: `system-brief-published-${workflow.attemptId}`,
    attemptId: workflow.attemptId,
    stream: "SYSTEM",
    eventType: "DECISION_BRIEF_PUBLISHED",
    orderingAuthority: "BROWSER_DEV_STAND_IN",
    occurredAtMs: now + 1,
    recordedAtMs: now + 1,
    payload: { recommendation: brief.recommendation },
  });
  return {
    ...workflow,
    stage: "PUBLISHED",
    passBClaims: finalClaims,
    ledger,
    brief,
  };
}

export function northlineWorkflowStorageKey(attemptId: string): string {
  return `fydell.sim-engine.dev.northline-evidence.${attemptId}`;
}
