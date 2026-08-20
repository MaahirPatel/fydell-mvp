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

export const FIXTURE_LABEL = "Fixture · Acme rollout v1";

export type SampleStepState = "done" | "current" | "upcoming";

export const SAMPLE_STEPS: Array<{ label: string; state: SampleStepState }> = [
  { label: "Invited", state: "done" },
  { label: "Initial work", state: "done" },
  { label: "Constraint", state: "done" },
  { label: "Revision", state: "current" },
  { label: "Defense", state: "upcoming" },
  { label: "Analysis", state: "upcoming" },
  { label: "Receipt", state: "upcoming" },
];

export type SampleFile = {
  name: string;
  /** Rollout plan is the only artifact with a superseded revision to compare. */
  kind: "plan" | "note";
  body: string;
  meta: string;
};

export const SAMPLE_FILES: SampleFile[] = [
  {
    name: "Discovery notes",
    kind: "note",
    meta: "Captured 14:22 · Read-only source",
    body: "Acme wants a controlled first production cohort. The economic buyer is the VP Operations. The security team has not yet joined the thread. Sponsor estimates 200 weekly active users from licensed seats.",
  },
  {
    name: "Architecture brief",
    kind: "note",
    meta: "Revised 16:11 · Candidate authored",
    body: "Sandbox tenant with no production connectors for enablement. Production connectors only after the security review completes. The first cohort should not assume production data access.",
  },
  {
    name: "Rollout plan",
    kind: "plan",
    meta: "v2 submitted 16:13 · Candidate authored",
    body: "",
  },
  {
    name: "Customer email",
    kind: "note",
    meta: "Drafted 16:19 · Candidate authored",
    body: "We can start enablement in sandbox this week. Production access has to wait for the six-week security review. I will not size the first production cohort from the license estimate until we see active-user data.",
  },
  {
    name: "Assumptions",
    kind: "note",
    meta: "Updated 16:13 · Candidate authored",
    body: "200 weekly active users is a sponsor estimate from licensed seats. It has not been verified by team-level usage.",
  },
];

export const SAMPLE_ACTIVE_FILE = "Rollout plan";

export const SAMPLE_SUPERSEDED_RECOMMENDATION =
  "Begin enablement in a sandbox immediately. Defer production connectivity until security approval. Keep the first production cohort provisional until active-user data is verified.";

export const SAMPLE_CURRENT_RECOMMENDATION =
  "Begin enablement in a sandbox immediately. Defer production connectivity until security approval. Keep the first production cohort provisional until active-user data is verified.";

export type EvidenceStatus = "confirmed" | "unverified" | "blocking";

export const SAMPLE_EVIDENCE_CONSIDERED: Array<{
  item: string;
  status: EvidenceStatus;
  statusLabel: string;
  notes: string;
}> = [
  { item: "SAML SSO", status: "confirmed", statusLabel: "Confirmed", notes: "Acme uses Okta; SAML 2.0" },
  { item: "1,200 seats", status: "confirmed", statusLabel: "Confirmed", notes: "Planned for initial rollout" },
  { item: "Weekly active users", status: "unverified", statusLabel: "Unverified", notes: "Requires 2 weeks of usage data" },
  {
    item: "Six-week security review",
    status: "blocking",
    statusLabel: "Blocking constraint",
    notes: "Cannot connect production data first",
  },
];

export const SAMPLE_LIVE_TIMELINE: Array<{
  time: string;
  title: string;
  detail: string;
  state: SampleStepState;
  badge?: string;
}> = [
  {
    time: "14:22",
    title: "Initial assumption recorded",
    detail: "Candidate captured baseline assumptions.",
    state: "done",
  },
  {
    time: "16:08",
    title: "Security constraint delivered",
    detail: "Employer provided the six-week security review constraint.",
    state: "done",
  },
  {
    time: "16:13",
    title: "Plan revised",
    detail: "Candidate updated the rollout plan to accommodate the constraint.",
    state: "current",
  },
  {
    time: "",
    title: "Oral defense",
    detail: "Candidate will explain tradeoffs and respond to follow-up questions.",
    state: "upcoming",
    badge: "Upcoming",
  },
];

export const SAMPLE_LATEST_MESSAGE =
  "Acme confirms the authentication security review itself takes six weeks. Production data cannot be connected first.";

export const SAMPLE_EVIDENCE_NOTE =
  "Candidate separated the blocking constraint from the unverified adoption estimate.";

export const SAMPLE_EVIDENCE_TIMELINE: Array<{ time: string; label: string; state: SampleStepState }> = [
  { time: "14:22", label: "Initial assumption recorded", state: "done" },
  { time: "14:24", label: "Initial rollout plan created", state: "done" },
  { time: "16:08", label: "Security constraint delivered", state: "done" },
  { time: "16:13", label: "Plan revised", state: "current" },
  { time: "16:31", label: "Oral defense completed", state: "upcoming" },
  { time: "17:05", label: "Sandbox review completed", state: "upcoming" },
];

export const SAMPLE_LINEAGE_CLAIM =
  "Candidate adapted the rollout recommendation when a material implementation constraint changed.";

export type LineageTone = "neutral" | "risk";

export const SAMPLE_LINEAGE_NODES: Array<{
  id: string;
  title: string;
  source: string;
  tone: LineageTone;
  column: 0 | 1 | 2;
}> = [
  { id: "initial", title: "Initial plan", source: "rollout_plan.md v1", tone: "neutral", column: 1 },
  { id: "constraint", title: "Constraint received", source: "event 07", tone: "neutral", column: 0 },
  { id: "revised", title: "Plan revised in five minutes", source: "rollout_plan.md v2", tone: "neutral", column: 1 },
  { id: "defense", title: "Defense answer", source: "response 01", tone: "neutral", column: 2 },
  { id: "unverified", title: "Unverified 200-user sizing retained", source: "assumption 03", tone: "risk", column: 1 },
];

export const SAMPLE_LINEAGE_EDGES: Array<{ from: string; to: string; label: "supports" | "limits" | "counters" }> = [
  { from: "constraint", to: "initial", label: "limits" },
  { from: "initial", to: "revised", label: "supports" },
  { from: "constraint", to: "revised", label: "supports" },
  { from: "defense", to: "revised", label: "supports" },
  { from: "unverified", to: "revised", label: "counters" },
];

export const SAMPLE_SUPPORTING_EVIDENCE = {
  body: "Revised sequencing after the blocking security constraint while preserving useful enablement work.",
  sources: ["event 07", "rollout_plan.md v2"],
};

export const SAMPLE_COUNTEREVIDENCE = {
  body: "The first cohort still depends on a sponsor estimate Candidate 01 marked as unverified.",
  sources: ["assumption 03"],
};

export const SAMPLE_BRIEF_RAIL = {
  recommendation: "Strong interview",
  reasons: [
    {
      competency: "Discovery judgment",
      detail: "Separated stated requirements from assumptions before recommending an architecture.",
    },
    {
      competency: "Adaptation",
      detail: "Revised the rollout plan in minutes after the blocking security constraint landed.",
    },
    {
      competency: "Customer communication",
      detail: "Explained tradeoffs in language an executive sponsor could use.",
    },
  ],
  remainingUncertainty: "Adoption sizing still depends on unverified weekly active-user data.",
  askNext: "How would you validate adoption before committing the implementation team?",
  reviewLabel: "Sandbox review · fictional",
  reviewDecision: "Approved with limitation",
  meta: "9 sources · 1 limitation · Analysis v1",
};

export const SAMPLE_INTERVIEW_PLAN: Array<{ focus: string; question: string; why: string }> = [
  {
    focus: "Quantitative sizing",
    question: "How would you verify weekly-active usage before sizing a production cohort?",
    why: "The sponsor estimate was retained longer than the evidence supported.",
  },
  {
    focus: "Security sequencing",
    question: "What would you have asked the security team in week one?",
    why: "The blocking constraint arrived late and reshaped the whole plan.",
  },
  {
    focus: "Judgment under estimates",
    question: "When is a sponsor estimate good enough to plan against?",
    why: "Tests whether the correction under questioning was reasoning or deference.",
  },
];

export const SAMPLE_GUIDE_TOTAL = 8;

export const SAMPLE_RECEIPT_ID = "FYD-SBX-ACME-0001";

export const SAMPLE_RECEIPT_META: Array<{ label: string; value: string }> = [
  { label: "Role", value: "Solutions Engineer" },
  { label: "Issued by", value: "Northstar sandbox" },
  { label: "Simulation version", value: "Acme rollout v1" },
  { label: "Completed", value: "August 20, 2026" },
  { label: "Duration", value: "2h 43m" },
  { label: "Review state", value: "Sandbox review completed" },
];

export const SAMPLE_RECEIPT_WORK: Array<{
  time: string;
  label: string;
  source: string;
  state: SampleStepState;
}> = [
  { time: "14:22", label: "Recorded initial assumptions", source: "event 03", state: "done" },
  { time: "14:24", label: "Created initial rollout plan", source: "rollout_plan.md v1", state: "done" },
  { time: "16:08", label: "Received six-week security constraint", source: "event 07", state: "done" },
  { time: "16:13", label: "Revised rollout sequencing", source: "rollout_plan.md v2", state: "current" },
  { time: "16:31", label: "Completed oral defense", source: "response 01", state: "upcoming" },
  { time: "17:05", label: "Sandbox review completed", source: "review 01", state: "upcoming" },
];

export const SAMPLE_RECEIPT_ARTIFACTS: Array<{
  artifact: string;
  version: string;
  status: "Superseded" | "Submitted";
  change: string;
  source: string;
}> = [
  {
    artifact: "Rollout plan",
    version: "v1",
    status: "Superseded",
    change: "Initial six-week rollout",
    source: "artifact 01",
  },
  {
    artifact: "Rollout plan",
    version: "v2",
    status: "Submitted",
    change: "Sandbox-first, production after approval",
    source: "artifact 02",
  },
];

export const SAMPLE_RECEIPT_CHANGE = {
  from: "Production in six weeks",
  to: "Sandbox now, production after security approval",
};

export const SAMPLE_RECEIPT_OBSERVED: Array<{ competency: string; detail: string }> = [
  { competency: "Discovery judgment", detail: "Separated verified requirements from the sponsor estimate." },
  { competency: "Adaptation", detail: "Revised sequencing after a material constraint changed." },
  { competency: "Customer communication", detail: "Explained what could proceed and what had to wait." },
];

export const SAMPLE_RECEIPT_LIMITATION =
  "The 200-user cohort remained dependent on unverified weekly active-user data.";

export const SAMPLE_RECEIPT_VERIFICATION: Array<{ label: string; value: string; tone?: "good" }> = [
  { label: "Status", value: "Verified", tone: "good" },
  { label: "Receipt version", value: "1" },
  { label: "Payload records", value: "12" },
  { label: "Issued at", value: "17:05" },
  { label: "Canonical payload", value: "Available", tone: "good" },
];

export const SAMPLE_RECEIPT_HASH = "7c41...a92f";

export const SAMPLE_RECEIPT_HASH_NOTICE =
  "This hash verifies that the displayed receipt matches the issued sandbox payload. It is an integrity check, not an independent employment credential.";

export const SAMPLE_RECEIPT_LINEAGE: Array<{ label: string; state: SampleStepState }> = [
  { label: "Session", state: "done" },
  { label: "Events", state: "done" },
  { label: "Artifacts", state: "done" },
  { label: "Review", state: "done" },
  { label: "Receipt v1", state: "current" },
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
