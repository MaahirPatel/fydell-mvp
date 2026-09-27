export const ACME_FIXTURE_ID = "acme-rollout";
export const ACME_FIXTURE_VERSION = "acme-rollout-v1";
export const APPLIED_AI_FIXTURE_ID = "applied-ai-workflow-hardening";
export const APPLIED_AI_FIXTURE_VERSION = "aai-workflow-hardening-fixture-v2";
export const APPLIED_AI_ROLE_ID = "10000000-0000-4000-a000-000000000001";
export const APPLIED_AI_VERSION_ID = "10000000-0000-4000-a000-000000000010";
export const APPLIED_AI_ROLE_SLUG = "applied-ai-engineer";
export const APPLIED_AI_VERSION_KEY = "aai-workflow-hardening-v1";

export const SANDBOX_COMPETENCIES = [
  "Discovery judgment",
  "Technical translation",
  "Adaptation",
  "Commercial judgment",
  "Customer communication",
] as const;

export interface SandboxFixtureManifest {
  fixtureId: typeof ACME_FIXTURE_ID;
  fixtureVersion: typeof ACME_FIXTURE_VERSION;
  organization: { name: string; customer: string };
  role: { slug: "solutions-engineer"; title: string };
  simulationVersion: { key: string; title: string };
  candidate: { candidateId: string; label: string };
  candidates: Array<{
    candidateId: string;
    label: string;
    status: "ready" | "defense_pending" | "in_progress" | "invited";
  }>;
  resources: Array<{ id: string; title: string; body: string }>;
  rubric: { version: string; competencies: typeof SANDBOX_COMPETENCIES };
  initialFacts: string[];
  unverifiedAssumptions: string[];
  initialRecommendation: string;
  changedFact: { id: string; title: string; body: string };
  revisedRecommendation: string;
  defenseQuestion: { prompt: string; target: string };
  fixtureDefenseAnswer: string;
  expectedEvidenceSources: string[];
  expectedCounterevidence: string[];
  expectedReceiptItems: string[];
  discoveryNotes: string;
  architectureBrief: string;
  customerEmailInitial: string;
  customerEmailRevised: string;
  assumptions: string;
}

export const ACME_ROLLOUT_FIXTURE: SandboxFixtureManifest = Object.freeze({
  fixtureId: ACME_FIXTURE_ID,
  fixtureVersion: ACME_FIXTURE_VERSION,
  organization: { name: "Northstar", customer: "Acme" },
  role: { slug: "solutions-engineer" as const, title: "Solutions Engineer" },
  simulationVersion: {
    key: "se-northstar-v1",
    title: "Acme Technical Discovery and Rollout",
  },
  candidate: { candidateId: "candidate-01", label: "Candidate 01" },
  candidates: [
    { candidateId: "candidate-01", label: "Candidate 01", status: "ready" as const },
    { candidateId: "candidate-02", label: "Candidate 02", status: "defense_pending" as const },
    { candidateId: "candidate-03", label: "Candidate 03", status: "in_progress" as const },
    { candidateId: "candidate-04", label: "Candidate 04", status: "invited" as const },
  ],
  resources: [
    {
      id: "discovery-notes",
      title: "Discovery call notes",
      body: "Acme wants a controlled first production cohort. The economic buyer is the VP Operations. The security team has not yet joined the thread. Sponsor estimates 200 weekly active users from licensed seats.",
    },
    {
      id: "security-questionnaire",
      title: "Security questionnaire status",
      body: "Questionnaire is in draft. Production data access is gated on a completed review. Sandbox tenancy is available without production connectors.",
    },
    {
      id: "rollout-template",
      title: "Rollout plan template",
      body: "Week 0 enablement. Week 1 first cohort. Expansion only after verified adoption and a production-access decision.",
    },
  ],
  rubric: { version: "se_rollout_v1", competencies: SANDBOX_COMPETENCIES },
  initialFacts: [
    "Acme wants a six-week technical discovery that ends in a production rollout recommendation.",
    "Northstar can provision a sandbox tenant immediately.",
    "The sponsor estimates 200 weekly active users from current licenses.",
  ],
  unverifiedAssumptions: [
    "The 200-user weekly-active figure is a sponsor estimate, not a measured adoption metric.",
  ],
  initialRecommendation:
    "Run a 200-user controlled production deploy in the first cohort, then expand after two weeks of observed usage.",
  changedFact: {
    id: "SECURITY_REVIEW_001",
    title: "Production access is blocked for six weeks",
    body: "Acme security confirmed the review takes six weeks and blocks production access until it completes. Sandbox enablement is allowed now. The 200-user weekly-active figure remains a sponsor estimate.",
  },
  revisedRecommendation:
    "Enable a sandbox tenant now. Defer production access until the six-week security review completes. Keep the first production cohort provisional and sized only after weekly-active use is verified by team, not by licenses.",
  defenseQuestion: {
    prompt:
      "Your adoption assumption comes from the sponsor. How would you test it before using it to size the first production cohort?",
    target: "unverified_wau_assumption",
  },
  fixtureDefenseAnswer:
    "I would ask for active-user counts by team versus licensed seats. If that data is unavailable, I would start with a smaller first cohort and treat the sponsor number as directional, not as a sizing input.",
  expectedEvidenceSources: [
    "initial_recommendation",
    "changed_fact",
    "revised_recommendation",
    "defense_response",
  ],
  expectedCounterevidence: [
    "The sponsor 200-user estimate was never verified against actual weekly-active usage.",
  ],
  expectedReceiptItems: [
    "Discovery notes recorded",
    "Initial rollout recommendation committed",
    "Security-review constraint received",
    "Revised rollout recommendation submitted",
    "Oral defense answered",
  ],
  discoveryNotes:
    "Acme wants production value in the first cohort. Security has not signed off. Sponsor quoted 200 WAU from licenses. Sandbox is available immediately.",
  architectureBrief:
    "Sandbox tenant with no production connectors for enablement; production connectors only after security review. First cohort should not assume production data access.",
  customerEmailInitial:
    "Recommend a 200-user controlled production deploy, then expand once we see usage.",
  customerEmailRevised:
    "We can start enablement in sandbox this week. Production access has to wait for the six-week security review. I will not size the first production cohort from the license estimate until we see active-user data.",
  assumptions:
    "200 weekly active users is a sponsor estimate from licensed seats. It has not been verified by team-level usage.",
});

export function getSandboxFixture(version: string = ACME_FIXTURE_VERSION): SandboxFixtureManifest {
  if (version !== ACME_FIXTURE_VERSION) {
    throw new Error(`Unsupported sandbox fixture version: ${version}`);
  }
  return ACME_ROLLOUT_FIXTURE;
}

export const APPLIED_AI_REQUIREMENTS = [
  { id: "PR-AI-01", title: "Problem decomposition", coverage: "PROVEN" },
  { id: "PR-AI-02", title: "AI system architecture", coverage: "PROVEN" },
  { id: "PR-AI-03", title: "LLM and tool orchestration", coverage: "PROVEN" },
  { id: "PR-AI-04", title: "Evaluation engineering", coverage: "PARTIALLY_PROVEN" },
  { id: "PR-AI-05", title: "Reliability and failure recovery", coverage: "PARTIALLY_PROVEN" },
  { id: "PR-AI-06", title: "Software engineering quality", coverage: "PROVEN" },
  { id: "PR-AI-07", title: "Cost and latency judgment", coverage: "NOT_PROVEN" },
  { id: "PR-AI-08", title: "Product and model judgment", coverage: "NOT_PROVEN" },
] as const;

export interface AppliedAiSandboxFixtureManifest {
  fixtureId: typeof APPLIED_AI_FIXTURE_ID;
  fixtureVersion: typeof APPLIED_AI_FIXTURE_VERSION;
  role: { id: typeof APPLIED_AI_ROLE_ID; slug: typeof APPLIED_AI_ROLE_SLUG; title: "Applied AI Engineer" };
  simulationVersion: { id: typeof APPLIED_AI_VERSION_ID; key: typeof APPLIED_AI_VERSION_KEY; title: string };
  organization: { name: string; customer: string };
  candidate: { candidateId: string; label: string };
  candidates: SandboxFixtureManifest["candidates"];
  resources: Array<{ id: string; title: string; body: string; kind: "requirement" | "config" | "trace" | "metric" | "contract" }>;
  requirements: typeof APPLIED_AI_REQUIREMENTS;
  changedFact: { id: "LATENCY_001"; title: string; body: string };
  defenseQuestion: { prompt: string; target: string };
  fixtureDefenseAnswer: string;
}

export const APPLIED_AI_WORKFLOW_FIXTURE = Object.freeze({
  fixtureId: APPLIED_AI_FIXTURE_ID,
  fixtureVersion: APPLIED_AI_FIXTURE_VERSION,
  role: {
    id: APPLIED_AI_ROLE_ID as typeof APPLIED_AI_ROLE_ID,
    slug: APPLIED_AI_ROLE_SLUG as typeof APPLIED_AI_ROLE_SLUG,
    title: "Applied AI Engineer" as const,
  },
  simulationVersion: {
    id: APPLIED_AI_VERSION_ID as typeof APPLIED_AI_VERSION_ID,
    key: APPLIED_AI_VERSION_KEY as typeof APPLIED_AI_VERSION_KEY,
    title: "Harden an enterprise AI workflow",
  },
  organization: { name: "Northstar", customer: "Enterprise workflow team" },
  candidate: { candidateId: "candidate-01", label: "Candidate 01" },
  candidates: [
    { candidateId: "candidate-01", label: "Candidate 01", status: "ready" as const },
    { candidateId: "candidate-02", label: "Candidate 02", status: "defense_pending" as const },
    { candidateId: "candidate-03", label: "Candidate 03", status: "in_progress" as const },
    { candidateId: "candidate-04", label: "Candidate 04", status: "invited" as const },
  ],
  resources: [
    {
      id: "requirements/product-brief.md",
      title: "Product brief",
      kind: "requirement",
      body: "Produce a typed implementation plan, preserve an auditable trace, tolerate transient failure, and escalate when required information is absent.",
    },
    {
      id: "config/workflow.json",
      title: "Executable workflow config",
      kind: "config",
      body: "Supported structured controls drive the deterministic synthetic evaluator. Proposal code is not executed.",
    },
    {
      id: "traces/trace-024-duplicate-write.json",
      title: "Trace 024 · duplicate write",
      kind: "trace",
      body: "A write succeeded, the provider connection timed out, and the unrestricted retry repeated the side effect without a stable idempotency key.",
    },
    {
      id: "traces/trace-017-schema-failure.json",
      title: "Trace 017 · semantic policy failure",
      kind: "trace",
      body: "The response passed JSON shape validation but selected a region excluded by the account policy.",
    },
    {
      id: "metrics/baseline.json",
      title: "Baseline metrics",
      kind: "metric",
      body: "Synthetic fixture baseline: 78% quality, 6% schema failures, 3% duplicate side effects, 6.2s p50, 10.8s p95, $0.18 per plan.",
    },
    {
      id: "docs/runtime-boundary.md",
      title: "Runtime boundary",
      kind: "contract",
      body: "No arbitrary code, shell, network, packages, or paid model calls. Only supported config and eval-case mutations affect measured output.",
    },
  ],
  requirements: APPLIED_AI_REQUIREMENTS,
  changedFact: {
    id: "LATENCY_001",
    title: "Changed production latency requirement",
    body: "Enterprise deployment now requires p95 below 4 seconds. Critical-case quality and authorization controls may not regress.",
  },
  defenseQuestion: {
    prompt: "Your measured result reflects a deterministic synthetic fixture. What evidence would you gather before shipping this architecture to production?",
    target: "runtime_limit_and_release_judgment",
  },
  fixtureDefenseAnswer:
    "I would validate with production-shaped traffic, provider variance, concurrency, calibrated critical cases, and side-effect recovery tests before release.",
} satisfies AppliedAiSandboxFixtureManifest);

export function getAppliedAiSandboxFixture(
  version: string = APPLIED_AI_FIXTURE_VERSION,
): AppliedAiSandboxFixtureManifest {
  if (version !== APPLIED_AI_FIXTURE_VERSION) {
    throw new Error(`Unsupported Applied AI sandbox fixture version: ${version}`);
  }
  return APPLIED_AI_WORKFLOW_FIXTURE;
}
