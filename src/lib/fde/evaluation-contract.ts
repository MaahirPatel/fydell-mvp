/**
 * Versioned evaluation contract — locks before the first candidate starts.
 * Behavioral evidence mathematics must not run without a locked contract.
 *
 * Primary dimensions (prototype, ~55 min): five only.
 * Secondary signals remain descriptive until the scenario creates
 * repeated independent opportunities.
 */

export type EvidenceOpportunity = {
  opportunityId: string;
  surface: "workspace" | "customer_chat" | "evals" | "curveball" | "handoff" | "preflight";
  description: string;
};

export type DimensionPriority = 1 | 2 | 3;

export type EvaluationDimension = {
  dimensionId: string;
  label: string;
  /** 1 = primary assessed; 2–3 = descriptive secondary */
  priority: DimensionPriority;
  behavioralAnchors: {
    counterEvidence: string[];
    mixedEvidence: string[];
    supportingEvidence: string[];
    strongSupportingEvidence: string[];
  };
  opportunities: EvidenceOpportunity[];
  prohibitedInferences: string[];
  minimumIndependentOpportunities: number;
};

export type EvaluationContract = {
  missionId: string;
  scenarioReleaseId: string;
  lockedAt: string;
  policyVersion: string;
  formulaVersion: string;
  dimensions: EvaluationDimension[];
};

/** Activity volume / speed / prompt counts are context only — never evidence. */
export const UNSCORED_CONTEXT_KEYS = [
  "time_spent_ms",
  "files_opened_count",
  "prompt_count",
  "question_count",
  "response_latency_ms",
  "typing_speed",
  "time_in_file_ms",
] as const;

export const PRIMARY_DIMENSION_IDS = [
  "discovery_problem_framing",
  "technical_scoping_prioritization",
  "engineering_applied_ai_execution",
  "evaluation_production_judgment",
  "adaptation_customer_communication",
] as const;

export const SECONDARY_DIMENSION_IDS = [
  "privacy_judgment",
  "reusable_abstraction_thinking",
  "handoff_quality",
  "ai_collaboration",
  "operational_reliability",
] as const;

export const EVAL_POLICY_VERSION = "eval-policy-v0";
export const EVAL_FORMULA_VERSION = "eval-formula-v0-placeholder";

/** Canonical primary dimension stubs for mission-create preview / future lock. */
export function defaultPrimaryDimensions(): EvaluationDimension[] {
  return [
    {
      dimensionId: "discovery_problem_framing",
      label: "Discovery and problem framing",
      priority: 1,
      behavioralAnchors: {
        counterEvidence: ["Accepted the brief without testing assumptions that later broke the solution"],
        mixedEvidence: ["Asked clarifying questions but did not update the plan when answers changed scope"],
        supportingEvidence: ["Asked a question that changed system scope before coding"],
        strongSupportingEvidence: ["Reframed the customer problem with a clear constraint set and verified it"],
      },
      opportunities: [
        { opportunityId: "chat_clarify", surface: "customer_chat", description: "Clarify ambiguous requirements" },
        { opportunityId: "plan_approach", surface: "workspace", description: "Write approach before deep implementation" },
      ],
      prohibitedInferences: ["Infer discovery skill from message count alone"],
      minimumIndependentOpportunities: 2,
    },
    {
      dimensionId: "technical_scoping_prioritization",
      label: "Technical scoping and prioritization",
      priority: 1,
      behavioralAnchors: {
        counterEvidence: ["Edited many files without addressing the failing evaluator path"],
        mixedEvidence: ["Identified the bug area but spent remaining time on polish"],
        supportingEvidence: ["Prioritized the policy/routing failure over cosmetic cleanup"],
        strongSupportingEvidence: ["Scoped a minimal fix, ran targeted tests, then expanded only as needed"],
      },
      opportunities: [
        { opportunityId: "triage_failing_eval", surface: "evals", description: "Read failing evals and choose a first cut" },
        { opportunityId: "curveball_reprioritize", surface: "curveball", description: "Reprioritize after mid-session change" },
      ],
      prohibitedInferences: ["Treat number of files opened as prioritization skill"],
      minimumIndependentOpportunities: 2,
    },
    {
      dimensionId: "engineering_applied_ai_execution",
      label: "Engineering and applied-AI execution",
      priority: 1,
      behavioralAnchors: {
        counterEvidence: ["Pastes AI output that fails tests without verification"],
        mixedEvidence: ["Fixes tests but leaves the approval-policy hole open"],
        supportingEvidence: ["Implements a working fix and verifies with allowlisted commands"],
        strongSupportingEvidence: ["Produces a correct, reviewed change that survives evals and privacy constraints"],
      },
      opportunities: [
        { opportunityId: "edit_and_test", surface: "workspace", description: "Edit code and run tests" },
        { opportunityId: "run_evals", surface: "evals", description: "Run evaluation suite against golden set" },
      ],
      prohibitedInferences: ["Score from typing speed or prompt count"],
      minimumIndependentOpportunities: 2,
    },
    {
      dimensionId: "evaluation_production_judgment",
      label: "Evaluation and production judgment",
      priority: 1,
      behavioralAnchors: {
        counterEvidence: ["Claims green without reading high-severity failures"],
        mixedEvidence: ["Improves accuracy but ignores false-automation / privacy risks"],
        supportingEvidence: ["Checks schema validity, privacy, or idempotency alongside accuracy"],
        strongSupportingEvidence: ["Documents residual risk and refuses unsafe automation"],
      },
      opportunities: [
        { opportunityId: "interpret_metrics", surface: "evals", description: "Interpret objective metrics honestly" },
        { opportunityId: "handoff_risks", surface: "handoff", description: "Call out unresolved production risks" },
      ],
      prohibitedInferences: ["Treat time spent reading logs as judgment quality"],
      minimumIndependentOpportunities: 2,
    },
    {
      dimensionId: "adaptation_customer_communication",
      label: "Adaptation and customer communication",
      priority: 1,
      behavioralAnchors: {
        counterEvidence: ["Ignores the curveball or hides unresolved risk from the customer"],
        mixedEvidence: ["Acknowledges the change but does not update the solution"],
        supportingEvidence: ["Communicates impact of the curveball and adjusts the plan"],
        strongSupportingEvidence: ["Negotiates a safe path with the customer and lands a verified adaptation"],
      },
      opportunities: [
        { opportunityId: "curveball_response", surface: "curveball", description: "Respond to mid-session requirement change" },
        { opportunityId: "customer_update", surface: "customer_chat", description: "Update the customer with clear status/risk" },
      ],
      prohibitedInferences: ["Infer communication quality from message volume alone"],
      minimumIndependentOpportunities: 2,
    },
  ];
}

export function assertContractLockable(contract: EvaluationContract): string[] {
  const errors: string[] = [];
  if (!contract.lockedAt) errors.push("lockedAt required");
  if (!contract.policyVersion) errors.push("policyVersion required");
  if (!contract.formulaVersion) errors.push("formulaVersion required");
  for (const dim of contract.dimensions.filter((d) => d.priority === 1)) {
    if (dim.opportunities.length < dim.minimumIndependentOpportunities) {
      errors.push(
        `${dim.dimensionId}: needs ≥${dim.minimumIndependentOpportunities} opportunities (has ${dim.opportunities.length})`
      );
    }
  }
  return errors;
}
