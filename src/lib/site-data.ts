export const TRUST_CATEGORIES = [
  "Financial Services",
  "Technology",
  "Consulting",
  "Healthcare",
  "Operations",
  "Professional Services"
];

export const HERO_METRICS = [
  { value: "70%", label: "Less time to hire" },
  { value: "89%", label: "Stronger hire quality" },
  { value: "2x", label: "Improvement in ramp time" }
];

export const APPROVED_FEATURE_CARDS = [
  {
    title: "Real work, real decisions",
    body: "Candidates step into realistic scenarios and make decisions like they would on the job."
  },
  {
    title: "Data you can trust",
    body: "Our simulations are validated, role-specific, and designed to predict performance."
  },
  {
    title: "Fairer for everyone",
    body: "Every candidate gets the same opportunity to show their skills: structured, consistent, objective."
  },
  {
    title: "Faster, smarter hiring",
    body: "Automated scoring and insights help your team make confident decisions, faster."
  }
];

export const PLATFORM_FEATURES = [
  {
    title: "Realistic simulations",
    body: "Role-specific workflows with real documents, models, and deliverables - not multiple choice."
  },
  {
    title: "Live environment",
    body: "Teammates message mid-session. Interruptions fire based on pace. The clock is real."
  },
  {
    title: "Behavioral signal",
    body: "Every decision, edit, and message is logged and quality-scored in real time."
  },
  {
    title: "AI evaluation",
    body: "Evidence scoring across workbook, chat, model quality, assistance patterns, engagement, and errors."
  },
  {
    title: "Collaboration dynamics",
    body: "Observe how candidates communicate, prioritize, and adapt under pressure."
  },
  {
    title: "Company workflows",
    body: "Custom rubrics, roles, and simulations from your hiring dashboard."
  }
];

export const DEFAULT_SIMULATION = {
  id: "financial-analysis",
  title: "Financial Analyst Simulation",
  role: "Financial Analyst",
  scenario:
    "A candidate evaluates a business case, builds a working model, and prepares a recommendation under time pressure.",
  duration: "25 min",
  files: [
    "Case_Info_Memo.pdf",
    "Financial_Statements.xlsx",
    "Industry_Analysis.pdf",
    "Management_Presentation.pptx",
    "Market_Data.xlsx"
  ],
  objectives: [
    "Assess financial performance",
    "Evaluate strategic fit",
    "Identify key risks",
    "Build valuation",
    "Form recommendation"
  ]
};

export const SIMULATIONS = [
  {
    id: "financial-analysis",
    title: "Financial Analyst",
    subtitle: "Modeling and recommendation workflow",
    industry: "Financial Services",
    duration: "25 min",
    difficulty: "Intermediate",
    pressure: "High",
    deliverables: ["Valuation model", "Comps analysis", "Committee memo"],
    components: ["Spreadsheet", "Live chat", "AI observer"],
    featured: true
  },
  {
    id: "security-response",
    title: "Security Analyst",
    subtitle: "Incident response workflow",
    industry: "Cybersecurity",
    duration: "35 min",
    difficulty: "Advanced",
    pressure: "Critical",
    deliverables: ["Containment plan", "Stakeholder comms"],
    components: ["Log analysis", "Team chat"],
    featured: false
  },
  {
    id: "product-strategy",
    title: "Product Manager",
    subtitle: "Launch decision under market pressure",
    industry: "Product",
    duration: "30 min",
    difficulty: "Intermediate",
    pressure: "Medium",
    deliverables: ["PRD outline", "Go/no-go recommendation"],
    components: ["Roadmap", "Analytics"],
    featured: false
  }
];

export const CANDIDATES = [
  { rank: 1, name: "Candidate A", score: 88, decision: "Strong signal", skill: "Financial modeling" },
  { rank: 2, name: "Candidate B", score: 82, decision: "Strong signal", skill: "Data analysis" },
  { rank: 3, name: "Candidate C", score: 75, decision: "Review", skill: "Business judgment" },
  { rank: 4, name: "Candidate D", score: 68, decision: "Review", skill: "Communication" }
];

export const TEAM_FEATURES = [
  "Side-by-side candidate comparison",
  "Session replay with artifacts",
  "AI scoring with decision rationale",
  "Committee collaboration and audit trail"
];

export const PRICING = [
  {
    name: "Pilot",
    price: "Free",
    period: "/ cohort",
    billing: "",
    desc: "Ideal for teams validating Fydell with a single cohort.",
    features: [
      "Up to 20 candidates",
      "Standard simulation library",
      "PDF score reports",
      "Basic analytics dashboard",
      "Email support"
    ],
    cta: "Start your pilot",
    highlight: false
  },
  {
    name: "Team",
    price: "$499",
    period: "/ month",
    billing: "Billed monthly",
    desc: "For growing teams ready to standardize assessments.",
    features: [
      "Unlimited simulations",
      "Up to 200 candidates / month",
      "PDF score reports",
      "ATS integrations",
      "Admin controls",
      "Priority email support"
    ],
    cta: "Start free 14-day trial",
    highlight: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    billing: "Billed annually",
    desc: "For organizations that need scale, control, and flexibility.",
    features: [
      "Unlimited candidates",
      "Custom simulation studio",
      "Advanced analytics & exports",
      "SSO / SCIM",
      "Dedicated success manager",
      "SLA & enterprise support"
    ],
    cta: "Contact sales",
    highlight: false
  }
];

export const PRICING_FAQ = [
  {
    q: "How does the pilot work?",
    a: "Run one cohort of up to 20 candidates on the standard simulation library, with PDF score reports and a basic analytics dashboard, at no cost. It is the fastest way to validate signal quality with your own roles."
  },
  {
    q: "What's included in Team?",
    a: "Unlimited simulations, up to 200 candidates per month, ATS integrations, admin controls, and priority support. Most growing teams standardize their hiring on the Team plan."
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Start on the pilot, upgrade to Team when you see signal, and move to Enterprise as you scale across departments. Plan changes take effect immediately."
  },
  {
    q: "Do you offer integrations?",
    a: "Team and Enterprise include ATS integrations and exports. Enterprise adds SSO / SCIM and a dedicated success manager to fit your existing hiring stack."
  }
];

export const WHAT_TO_EXPECT = [
  "Real documents and data",
  "Live interruptions",
  "Time pressure",
  "AI debrief"
];

export const SKILL_AREAS = [
  { skill: "Financial Modeling", pct: 90 },
  { skill: "Data Analysis", pct: 88 },
  { skill: "Business Judgment", pct: 83 },
  { skill: "Communication", pct: 78 }
];

export const PERFORMANCE_TREND = [
  { month: "Jan", score: 72 },
  { month: "Feb", score: 74 },
  { month: "Mar", score: 78 },
  { month: "Apr", score: 81 },
  { month: "May", score: 84 },
  { month: "Jun", score: 86 }
];

export const EVAL_CHANNELS = [
  { name: "Workbook completion", weight: 40, score: 82 },
  { name: "Chat quality", weight: 22, score: 76 },
  { name: "Model accuracy", weight: 13, score: 88 },
  { name: "AI assist usage", weight: 10, score: 71 },
  { name: "Engagement", weight: 8, score: 79 },
  { name: "Error rate", weight: 7, score: 94 }
];

export const RESOURCE_ITEMS = [
  "Work Simulation Guide",
  "Hiring Signal Framework",
  "Simulation Design Checklist",
  "Candidate Experience Notes",
  "Structured Evaluation Template",
  "Reducing Bias in Skills Assessment"
];
