export const ACME_FIXTURE_ID = "acme-rollout";
export const ACME_FIXTURE_VERSION = "acme-rollout-v1";

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
  candidate: { label: string; displayName: string };
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
  candidate: { label: "Candidate 1", displayName: "Alex Rivera" },
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
