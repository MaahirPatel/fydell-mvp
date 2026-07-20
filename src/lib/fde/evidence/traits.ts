/**
 * FDE trait model — the 10 primary traits the deep evidence engine scores.
 *
 * This file is the single source of truth for trait identity (TRAIT_IDS),
 * their composite weight (FDE_W), the surfaces/moments where a trait *could*
 * show up (TRAIT_OPPORTUNITIES — used to decide "not observed" vs "observed
 * but weak"), and the human-readable rubric anchors shown to employers when
 * they ask "what would counter / mixed / supporting / strong evidence look
 * like for this trait?".
 *
 * Nothing here touches events or I/O — pure data + pure helpers only.
 */

export const TRAIT_IDS = [
  "elicitation",
  "contradiction_handling",
  "data_integrity_vigilance",
  "scope_renegotiation",
  "technical_execution",
  "ai_tool_judgment",
  "verification_discipline",
  "limitation_honesty",
  "prioritization_under_pressure",
  "communication_translation",
] as const;

export type TraitId = (typeof TRAIT_IDS)[number];

export const TRAIT_LABELS: Record<TraitId, string> = {
  elicitation: "Elicitation",
  contradiction_handling: "Contradiction handling",
  data_integrity_vigilance: "Data integrity vigilance",
  scope_renegotiation: "Scope renegotiation",
  technical_execution: "Technical execution",
  ai_tool_judgment: "AI tool judgment",
  verification_discipline: "Verification discipline",
  limitation_honesty: "Limitation honesty",
  prioritization_under_pressure: "Prioritization under pressure",
  communication_translation: "Communication & translation",
};

/**
 * FDE_W — composite role weights. Must sum to 1 across all 10 traits; this is
 * asserted by `assertTraitWeightsSumToOne()` and checked in
 * scripts/test-fde-traits.ts so the composite formula never silently drifts.
 */
export const FDE_W: Record<TraitId, number> = {
  elicitation: 0.14,
  contradiction_handling: 0.1,
  data_integrity_vigilance: 0.16,
  scope_renegotiation: 0.08,
  technical_execution: 0.12,
  ai_tool_judgment: 0.08,
  verification_discipline: 0.12,
  limitation_honesty: 0.06,
  prioritization_under_pressure: 0.06,
  communication_translation: 0.08,
};

export function assertTraitWeightsSumToOne(tolerance = 1e-9): void {
  const sum = TRAIT_IDS.reduce((acc, id) => acc + FDE_W[id], 0);
  if (Math.abs(sum - 1) > tolerance) {
    throw new Error(`FDE_W must sum to 1, got ${sum}`);
  }
}

export type OpportunitySurface =
  | "workspace"
  | "customer_chat"
  | "evals"
  | "curveball"
  | "handoff"
  | "preflight";

export type TraitOpportunity = {
  opportunityId: string;
  surface: OpportunitySurface;
  /** What the candidate would have needed to do or notice for this moment to count. */
  description: string;
};

/**
 * Opportunity definitions per trait — descriptive metadata about *where* a
 * trait could be demonstrated. The actual per-session yes/no detection lives
 * in opportunity.ts (which reads the event timeline); this map is the
 * documentation + UI-facing catalog of what those detectors are looking for.
 */
export const TRAIT_OPPORTUNITIES: Record<TraitId, TraitOpportunity[]> = {
  elicitation: [
    {
      opportunityId: "pre_work_question",
      surface: "customer_chat",
      description: "Ask a clarifying question before running the first command.",
    },
    {
      opportunityId: "midwork_clarification",
      surface: "customer_chat",
      description: "Ask a clarifying question once ambiguity surfaces mid-task.",
    },
  ],
  contradiction_handling: [
    {
      opportunityId: "surface_conflicting_narrative",
      surface: "customer_chat",
      description: "Notice and name a conflict between ops/VP/dashboard accounts before proposing a fix.",
    },
  ],
  data_integrity_vigilance: [
    {
      opportunityId: "run_reconcile",
      surface: "workspace",
      description: "Run a reconciliation check before trusting the data.",
    },
    {
      opportunityId: "notice_integrity_signal",
      surface: "evals",
      description: "Notice and respond to dropped-rows / integrity-caught signals surfaced by the eval harness.",
    },
  ],
  scope_renegotiation: [
    {
      opportunityId: "renegotiate_after_curveball",
      surface: "curveball",
      description: "Tell the customer what is now in/out of scope after the mid-session change.",
    },
  ],
  technical_execution: [
    {
      opportunityId: "tests_pass",
      surface: "workspace",
      description: "Run the test suite and reach a passing state before submission.",
    },
    {
      opportunityId: "evals_pass",
      surface: "evals",
      description: "Run the evaluation suite and reach a passing result.",
    },
  ],
  ai_tool_judgment: [
    {
      opportunityId: "verify_ai_patch",
      surface: "workspace",
      description: "Apply an AI-suggested patch, then verify it rather than trusting it blindly.",
    },
  ],
  verification_discipline: [
    {
      opportunityId: "preview_or_test_before_handoff",
      surface: "workspace",
      description: "Use a preview/test command to check behavior before writing the handoff.",
    },
    {
      opportunityId: "handoff_verification_language",
      surface: "handoff",
      description: "State plainly what was verified and how.",
    },
  ],
  limitation_honesty: [
    {
      opportunityId: "name_limitations_in_handoff",
      surface: "handoff",
      description: "Name what remains uncertain or unverified rather than claiming full confidence.",
    },
  ],
  prioritization_under_pressure: [
    {
      opportunityId: "reprioritize_after_curveball",
      surface: "curveball",
      description: "Visibly reprioritize remaining work after the mid-session change.",
    },
  ],
  communication_translation: [
    {
      opportunityId: "plain_language_recommendation",
      surface: "handoff",
      description: "Write a handoff recommendation a non-technical stakeholder could act on.",
    },
  ],
};

export type RubricAnchors = {
  counter: string[];
  mixed: string[];
  supporting: string[];
  strong: string[];
};

export const RUBRIC_ANCHORS: Record<TraitId, RubricAnchors> = {
  elicitation: {
    counter: ["Started implementing immediately on an ambiguous brief without asking anything."],
    mixed: ["Asked a question, but it didn't change scope or approach once answered."],
    supporting: ["Asked a clarifying question before committing to an approach."],
    strong: ["Asked clarifying questions at more than one point and visibly used the answers to change direction."],
  },
  contradiction_handling: {
    counter: ["Saw conflicting ops/VP/dashboard accounts and picked one without flagging the conflict."],
    mixed: ["Mentioned the conflicting sources but didn't say which was correct or why."],
    supporting: ["Named the contradiction between stakeholder accounts explicitly."],
    strong: ["Named the contradiction, investigated it, and reported a resolved root cause."],
  },
  data_integrity_vigilance: {
    counter: ["Trusted the dataset even after a dropped-rows / integrity signal appeared."],
    mixed: ["Noticed a data issue but didn't reconcile or quantify its impact."],
    supporting: ["Ran a reconciliation check or explicitly responded to an integrity signal."],
    strong: ["Reconciled the data, quantified the discrepancy, and adjusted the fix accordingly."],
  },
  scope_renegotiation: {
    counter: ["Ignored the mid-session change and kept working the original plan unchanged."],
    mixed: ["Acknowledged the change to the customer but didn't adjust what was in/out of scope."],
    supporting: ["Told the customer what was now in or out of scope after the change."],
    strong: ["Negotiated a concrete reduced scope with the customer and delivered against it."],
  },
  technical_execution: {
    counter: ["Submitted without ever reaching a passing test or eval run."],
    mixed: ["Ran tests/evals but submitted despite a failing result."],
    supporting: ["Reached a passing test and/or eval result before submission."],
    strong: ["Reached passing tests and evals, verified with more than one independent check."],
  },
  ai_tool_judgment: {
    counter: ["Applied an AI-suggested patch and submitted without ever verifying it."],
    mixed: ["Applied an AI-suggested patch and ran a verification step, but didn't act on a failing result."],
    supporting: ["Applied an AI-suggested patch and then verified it with a test or eval run."],
    strong: ["Applied, verified, and iterated on an AI-suggested patch based on verification results."],
  },
  verification_discipline: {
    counter: ["Handed off work with no verification language and no preview/test run beforehand."],
    mixed: ["Ran a preview/test but the handoff doesn't say what was actually checked."],
    supporting: ["Used a preview/test before handoff and/or stated what was verified."],
    strong: ["Verified with a preview and tests, and the handoff explicitly states what was checked and how."],
  },
  limitation_honesty: {
    counter: ["Handoff claims full confidence with no mention of anything unverified or uncertain."],
    mixed: ["Handoff exists but limitations are vague or generic rather than specific to this task."],
    supporting: ["Handoff names a specific limitation, risk, or thing left unverified."],
    strong: ["Handoff names specific limitations and explains what would be needed to close them."],
  },
  prioritization_under_pressure: {
    counter: ["Kept working the pre-curveball plan with no visible reprioritization."],
    mixed: ["Mentioned the change but the remaining work plan didn't visibly shift."],
    supporting: ["Visibly reprioritized remaining work after the mid-session change."],
    strong: ["Reprioritized with a clear stated rationale for what got dropped or deferred and why."],
  },
  communication_translation: {
    counter: ["Handoff recommendation is missing or written entirely in implementation jargon."],
    mixed: ["Handoff recommendation exists but mixes technical detail with the actual ask."],
    supporting: ["Handoff includes a plain-language recommendation a non-technical stakeholder could act on."],
    strong: ["Handoff translates technical risk into business impact and a clear recommended action."],
  },
};

/** Below this many independent opportunities, a trait cannot be labeled "strong_evidence" — see score.ts. */
export const TRAIT_MIN_INDEPENDENT_FOR_STRONG = 2;
