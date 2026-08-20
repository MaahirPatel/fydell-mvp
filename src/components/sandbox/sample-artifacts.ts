import type { SandboxSessionView } from "@/lib/sim-engine/proof/sandbox/view";

/**
 * Pre-built artifacts so a first-time visitor sees a finished evidence report
 * and work receipt immediately, without playing the scenario. These are static
 * illustrations of the product's output shape: they never touch the proof graph
 * and are always labelled as samples.
 */

export const SAMPLE_CLAIMS: SandboxSessionView["claims"] = [
  {
    id: "sample-claim-1",
    pass: "pass_b",
    claim:
      "Committed a first rollout recommendation from the discovery notes before the security constraint existed, and stated the sponsor adoption figure as an assumption rather than a measurement.",
    competency: "Discovery judgment",
    direction: "supports",
    confidence: "high",
  },
  {
    id: "sample-claim-2",
    pass: "pass_b",
    claim:
      "Rewrote the rollout sequence within the same work session once production access was blocked for six weeks, keeping enablement moving in sandbox instead of stalling the customer.",
    competency: "Adaptation",
    direction: "supports",
    confidence: "high",
  },
  {
    id: "sample-claim-3",
    pass: "pass_b",
    claim:
      "Translated the security review from an internal blocker into a customer-readable sequencing decision, without overstating what had been agreed.",
    competency: "Technical translation",
    direction: "supports",
    confidence: "moderate",
  },
  {
    id: "sample-claim-4",
    pass: "pass_b",
    claim:
      "The 200 weekly-active-user figure was never verified against team-level usage. It was carried from the sponsor estimate into the initial cohort sizing before being withdrawn under questioning.",
    competency: "Commercial judgment",
    direction: "contradicts",
    confidence: "moderate",
  },
  {
    id: "sample-claim-5",
    pass: "pass_b",
    claim:
      "Customer message stated the six-week constraint plainly and offered a concrete next step, though it did not confirm who owns the security questionnaire.",
    competency: "Customer communication",
    direction: "supports",
    confidence: "moderate",
  },
];

export const SAMPLE_BRIEF: NonNullable<SandboxSessionView["brief"]> = {
  recommendation: "Interview, with a focused probe on quantitative sizing",
  why: "Adapted correctly to a constraint that invalidated the original plan, and did not defend the invalidated recommendation. The weakness is sizing discipline: a sponsor estimate was treated as a planning input until challenged.",
  strengths: [
    "Revised the plan under a changed constraint rather than restating the original recommendation",
    "Separated what was agreed from what was assumed",
    "Kept enablement progressing while production access was blocked",
  ],
  concerns: [
    "Used an unverified sponsor estimate to size the first production cohort",
    "Did not establish ownership of the security questionnaire",
  ],
  probes: [
    "How would you verify weekly-active usage before sizing a production cohort?",
    "What would you have asked the security team in week one?",
    "When is a sponsor estimate good enough to plan against?",
  ],
  published: true,
};

export const SAMPLE_EVENTS: SandboxSessionView["events"] = [
  { id: "s1", sequence: 1, eventType: "RUN_STARTED", stream: "scenario_delivery" },
  { id: "s2", sequence: 2, eventType: "RESOURCE_OPENED", stream: "candidate_work" },
  { id: "s3", sequence: 3, eventType: "ARTIFACT_REVISION", stream: "candidate_work" },
  { id: "s4", sequence: 4, eventType: "PRELIMINARY_COMMITTED", stream: "candidate_work" },
  { id: "s5", sequence: 5, eventType: "FACT_RELEASED", stream: "scenario_delivery" },
  { id: "s6", sequence: 6, eventType: "ARTIFACT_REVISION", stream: "candidate_work" },
  { id: "s7", sequence: 7, eventType: "REVISION_SUBMITTED", stream: "candidate_work" },
  { id: "s8", sequence: 8, eventType: "ANALYSIS_PASS_A_COMPLETED", stream: "analysis" },
  { id: "s9", sequence: 9, eventType: "DEFENSE_QUESTION_ISSUED", stream: "scenario_delivery" },
  { id: "s10", sequence: 10, eventType: "DEFENSE_RESPONSE_RECORDED", stream: "candidate_work" },
  { id: "s11", sequence: 11, eventType: "ANALYSIS_PASS_B_COMPLETED", stream: "analysis" },
  { id: "s12", sequence: 12, eventType: "BRIEF_PUBLISHED", stream: "review" },
];

export const SAMPLE_RECEIPT: Record<string, unknown> = {
  label: "Sample work receipt from a fictional demo scenario. Not valid for employment verification.",
  completedWork: [
    "Reviewed discovery notes, security questionnaire status, and the rollout template",
    "Committed an initial rollout recommendation with assumptions stated separately from facts",
    "Received a mid-task constraint: production access blocked pending a six-week security review",
    "Submitted a revised rollout plan that sequenced sandbox enablement ahead of production access",
    "Answered an oral defense question on the unverified adoption assumption",
    "Produced a customer-ready message describing the revised sequencing",
  ],
  conditions: [
    "Controlled scenario",
    "Time-bounded work session",
    "AI assistance available and logged",
    "Fictional customer and data",
  ],
  integrityNotice:
    "This SHA-256 value is a receipt integrity hash for payload consistency and version verification. It is not an independent cryptographic credential and is not tamper-proof.",
  integrityHash: "sample0000000000000000000000000000000000000000000000000000000000",
};
