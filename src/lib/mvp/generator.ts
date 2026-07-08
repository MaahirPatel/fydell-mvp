import "server-only";
import { getSupabaseAdmin } from "../supabase";
import type {
  CurveballType,
  Difficulty,
  DraftCurveball,
  DraftPhase,
  DraftResource,
  DraftRubricDimension,
  DraftTeamMessage,
  GeneratorInput,
  ResourceType,
  SimulationDraft,
  SimulationStyle,
  TeamSenderRole
} from "./generator-types";
import type { RubricDimension, ScenarioJson, Simulation } from "./types";

// ===========================================================================
// Deliverable B — Simulation Generator engine.
//
// This is a DETERMINISTIC template engine (not an ML model). A single shared
// `buildTemplate` assembles the full SimulationDraft from a compact per-role
// config, so adding a role means writing a few seed fields rather than a giant
// bespoke object. Output is validated, then saved to the existing `simulations`
// table as a draft. An optional LLM path enriches copy but always falls back to
// the deterministic builder, which is the actual deliverable.
// ===========================================================================

// ---------------------------------------------------------------------------
// Validation output (per the brief: { ok, errors[], warnings[] }).
// ---------------------------------------------------------------------------
export interface GeneratorValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const FAIRNESS_WARNING =
  "This criterion may create fairness or legal risk. Consider evaluating job-relevant behaviors instead.";

// Terms that hint at protected-class / non-job-relevant evaluation criteria.
const PROTECTED_TERMS = [
  "age",
  "gender",
  "sex",
  "race",
  "ethnic",
  "religion",
  "nationality",
  "national origin",
  "disab",
  "pregnan",
  "marital",
  "sexual orientation",
  "accent",
  "native speaker",
  "young",
  "old",
  "attractive",
  "good looking",
  "culture fit",
  "cultural fit"
];

// ---------------------------------------------------------------------------
// Compact per-role configuration. Everything role-specific lives here; the
// builder supplies all shared structure (brief, durations, report template,
// rubric level descriptors, evidence wiring).
// ---------------------------------------------------------------------------
interface SeedRubric {
  dimension: string;
  description: string;
  weight: number;
  evidence_sources: string[];
  levels?: DraftRubricDimension["levels"];
}

interface SeedResource {
  title: string;
  type: ResourceType;
  summary: string;
  content: string;
  relevance: string;
}

interface SeedPhase {
  title: string;
  objective: string;
  expected_actions: string[];
}

interface SeedCurveball {
  type: CurveballType;
  message: string;
  expected_response: string;
}

interface SeedTeamMessage {
  sender_role: TeamSenderRole;
  message: string;
  purpose: string;
}

interface RoleConfig {
  key: string;
  role: string;
  industry: string;
  department: string;
  defaultStyle: SimulationStyle;
  match: string[];
  scenario: {
    background: string;
    business_problem: string;
    success_definition: string;
    constraints: string[];
    ambiguity_points: string[];
  };
  coreTasks: string[];
  objectives: string[];
  resources: SeedResource[];
  phases: SeedPhase[];
  curveballs: SeedCurveball[];
  teamMessages: SeedTeamMessage[];
  rubric: SeedRubric[];
  evidence: { event_type: string; description: string; why_it_matters: string }[];
}

// Auto-generate the four-level rubric descriptors from a dimension name so role
// configs stay short. Configs may override `levels` when they need bespoke text.
function autoLevels(dim: string): DraftRubricDimension["levels"] {
  const d = dim.toLowerCase();
  return {
    weak: `Little evidence of ${d}; misses key signals and makes unsupported claims.`,
    adequate: `Basic ${d} with gaps; conclusions only partially supported by the materials.`,
    strong: `Consistent ${d} with structured, well-supported reasoning tied to the evidence.`,
    exceptional: `Mastery of ${d}: anticipates issues, quantifies trade-offs, and defends a clear recommendation.`
  };
}

// ---------------------------------------------------------------------------
// Role configs. Financial Analyst is the most detailed; the rest are compact.
// ---------------------------------------------------------------------------
const FINANCIAL_ANALYST: RoleConfig = {
  key: "financial_analyst",
  role: "Financial Analyst",
  industry: "Financial Services",
  department: "Finance",
  defaultStyle: "spreadsheet_analysis",
  match: ["financial analyst", "fp&a", "finance", "investment", "equity", "analyst"],
  scenario: {
    background:
      "You have joined the FP&A team at Meridian Components, a mid-market industrial supplier. The CFO is preparing a board update and needs an independent read on a proposed acquisition of a smaller competitor, Northbridge Tooling.",
    business_problem:
      "Should Meridian proceed with the $42M acquisition of Northbridge at the proposed price, and what conditions or risks should the board weigh before approving?",
    success_definition:
      "A defensible buy / hold / renegotiate recommendation supported by a valuation range, the key value drivers, and the two or three risks most likely to break the thesis.",
    constraints: [
      "Board memo is due before end of session; only the attached materials are available.",
      "No access to management beyond the provided Q&A notes.",
      "Synergy estimates are management-provided and unaudited."
    ],
    ambiguity_points: [
      "The target's last two quarters of revenue growth may be one-off, driven by a single customer.",
      "Working-capital assumptions in the model differ from the historical financials.",
      "Management's synergy number is aggressive relative to comparable deals."
    ]
  },
  coreTasks: [
    "Build or audit a valuation (DCF and comparables) and sanity-check the assumptions",
    "Identify the deal's key value drivers and the assumptions that swing the outcome",
    "Detect errors, inconsistencies, or aggressive assumptions buried in the model",
    "Write a concise recommendation memo for the CFO and board"
  ],
  objectives: [
    "Produce a valuation range, not a single false-precision number",
    "Surface the assumptions that most change the conclusion",
    "Flag at least two material risks with supporting evidence",
    "Deliver a clear, defensible recommendation"
  ],
  resources: [
    {
      title: "CFO kickoff memo",
      type: "memo",
      summary: "Context on the deal, the board's questions, and what the CFO expects back.",
      content:
        "Team — the board meets Thursday and wants an independent view on Northbridge. The bankers say it is a steal at 8x EBITDA, but our last two bolt-ons underdelivered on synergies, so I want a skeptical read. Give me a valuation range, the assumptions you would push back on, and the risks that would make you walk. Keep it to one page; I will present it directly. Do not just repeat the bankers' deck.",
      relevance: "Defines the success criteria and signals that uncritical acceptance of the banker case is a failure mode."
    },
    {
      title: "Northbridge operating model (3-statement)",
      type: "spreadsheet",
      summary: "Five-year projection with revenue build, margins, capex, and working capital.",
      content:
        "Revenue grows 18% per year for five years (vs. 4% historical). Gross margin steps up from 31% to 38% by year 3 with no stated driver. Working capital is modeled as a flat 6% of revenue, but the historical tab shows 14-16%. Synergies of $5.5M are added to EBITDA in year 1. A hardcoded value overrides the terminal growth cell (set to 5%).",
      relevance: "Core artifact. Contains the buried errors: unsupported margin ramp, inconsistent working capital, day-one synergies, and a hardcoded terminal growth rate."
    },
    {
      title: "Comparable transactions sheet",
      type: "market_data",
      summary: "Recent M&A comps in the industrial tooling space with multiples.",
      content:
        "Comparable deals cleared at 5.5x-7.0x EBITDA. The Northbridge ask of 8x sits above the range. One outlier comp at 9x involved a proprietary technology that Northbridge does not have.",
      relevance: "Lets the candidate triangulate value and challenge the 8x entry multiple."
    },
    {
      title: "Management Q&A notes",
      type: "document",
      summary: "Answers from a prior diligence call, including customer concentration.",
      content:
        "Q: How concentrated is revenue? A: Our top customer is ~40% of revenue and signed a 1-year contract. Q: Where do synergies come from? A: Mostly procurement; we have not modeled integration costs yet.",
      relevance: "Reveals customer-concentration risk and that synergies ignore integration cost — the thesis-breaking risks."
    },
    {
      title: "Industry outlook brief",
      type: "presentation",
      summary: "Sector demand trends and input-cost pressure for the next 18 months.",
      content:
        "Industrial demand is forecast to soften 2-3% next year; steel input costs remain volatile. Analysts expect margin compression across the sector, contrary to the model's margin expansion.",
      relevance: "Directly contradicts the model's margin ramp, testing whether the candidate reconciles external data with the model."
    }
  ],
  phases: [
    {
      title: "Orient and frame",
      objective: "Understand the decision, the CFO's questions, and what 'good' looks like.",
      expected_actions: [
        "Read the CFO memo and restate the decision in their own words",
        "Identify which materials are evidence vs. management claims"
      ]
    },
    {
      title: "Analyze the model",
      objective: "Audit the valuation and pressure-test assumptions.",
      expected_actions: [
        "Cross-check working-capital and margin assumptions against history",
        "Compare the entry multiple to the transaction comps",
        "Find and document the hardcoded / inconsistent inputs"
      ]
    },
    {
      title: "Identify risks",
      objective: "Surface the assumptions and facts most likely to break the thesis.",
      expected_actions: [
        "Connect customer concentration to revenue durability",
        "Note that synergies exclude integration costs"
      ]
    },
    {
      title: "Recommend",
      objective: "Deliver a defensible recommendation and valuation range.",
      expected_actions: [
        "State buy / hold / renegotiate with conditions",
        "Give a valuation range and the top two risks"
      ]
    }
  ],
  curveballs: [
    {
      type: "new_information",
      message: "Update from the deal team: Northbridge's top customer just put their renewal 'under review'.",
      expected_response: "Re-weight revenue durability and stress the downside case; reflect it in the recommendation."
    },
    {
      type: "manager_message",
      message: "CFO: the banker is pushing for a verbal read in 10 minutes — what is your headline?",
      expected_response: "Give a crisp, caveated headline (range + main risk) without overclaiming precision."
    },
    {
      type: "data_conflict",
      message: "The model shows margin expansion but the industry brief forecasts compression. Which do you trust?",
      expected_response: "Acknowledge the conflict, favor external evidence, and adjust assumptions transparently."
    }
  ],
  teamMessages: [
    {
      sender_role: "Manager",
      message: "Remember the board wants a view, not a data dump. Lead with the answer.",
      purpose: "Tests communication discipline and prioritization under a senior audience."
    },
    {
      sender_role: "Associate",
      message: "I pre-filled the model tabs — I think the synergy number looks high but I'm not sure.",
      purpose: "Invites the candidate to validate a peer's uncertain claim rather than accept it."
    },
    {
      sender_role: "Reviewer",
      message: "Before you send: can you defend your terminal value assumption?",
      purpose: "Probes depth of reasoning and willingness to justify key inputs."
    }
  ],
  rubric: [
    {
      dimension: "Analytical accuracy",
      description: "Correctly audits the model and catches the buried errors.",
      weight: 25,
      evidence_sources: ["Northbridge operating model", "Comparable transactions sheet"]
    },
    {
      dimension: "Business judgment",
      description: "Weighs value drivers and risks to reach a sound decision.",
      weight: 20,
      evidence_sources: ["Management Q&A notes", "Industry outlook brief"]
    },
    {
      dimension: "Risk detection",
      description: "Surfaces customer concentration, synergy, and integration risks.",
      weight: 20,
      evidence_sources: ["Management Q&A notes"]
    },
    {
      dimension: "Prioritization",
      description: "Focuses on the few assumptions that actually move the answer.",
      weight: 15,
      evidence_sources: ["Northbridge operating model"]
    },
    {
      dimension: "Communication clarity",
      description: "Delivers a board-ready, answer-first recommendation.",
      weight: 20,
      evidence_sources: ["Final recommendation memo"]
    }
  ],
  evidence: [
    {
      event_type: "resource_opened",
      description: "Which materials the candidate opens and in what order.",
      why_it_matters: "Shows whether they prioritize the model and Q&A over the banker-friendly comps."
    },
    {
      event_type: "assumption_added",
      description: "Assumptions or corrections the candidate records.",
      why_it_matters: "Reveals whether they caught the working-capital and synergy issues."
    },
    {
      event_type: "recommendation_submitted",
      description: "The final memo and valuation range.",
      why_it_matters: "Primary signal of judgment and communication quality."
    }
  ]
};

const MANAGEMENT_CONSULTANT: RoleConfig = {
  key: "management_consultant",
  role: "Management Consultant",
  industry: "Professional Services",
  department: "Strategy",
  defaultStyle: "case_analysis",
  match: ["consultant", "consulting", "strategy", "advisory"],
  scenario: {
    background:
      "A regional grocery chain, FreshLine, has flat profits despite growing revenue. The partner has staffed you to diagnose the margin problem before the client steering committee.",
    business_problem:
      "Why is FreshLine's profit flat while revenue grows, and what are the two or three highest-impact moves to fix it?",
    success_definition:
      "A structured diagnosis with a clear hypothesis, supporting evidence, and prioritized, quantified recommendations.",
    constraints: [
      "Steering committee is in 45 minutes; only provided data is available.",
      "Recommendations must be feasible within one fiscal year."
    ],
    ambiguity_points: [
      "Revenue growth may be coming from low-margin categories.",
      "Cost data is split across two inconsistent files."
    ]
  },
  coreTasks: [
    "Structure the problem with a clear issue tree",
    "Form and test a hypothesis against the data",
    "Quantify the size of each opportunity",
    "Prioritize recommendations by impact and feasibility"
  ],
  objectives: [
    "State a sharp hypothesis early",
    "Tie each recommendation to evidence and a number",
    "Prioritize ruthlessly for the steering committee"
  ],
  resources: [
    {
      title: "Engagement brief",
      type: "memo",
      summary: "Partner's framing of the client problem and what the committee expects.",
      content:
        "FreshLine's revenue is up 9% but operating profit is flat. The CEO suspects pricing; the COO blames shrink. The committee wants a clear diagnosis and the top moves, not a list of 12 ideas. Be MECE and lead with the answer.",
      relevance: "Sets expectations for structure, prioritization, and answer-first communication."
    },
    {
      title: "Category P&L extract",
      type: "spreadsheet",
      summary: "Revenue and margin by category for the last eight quarters.",
      content:
        "Growth is concentrated in prepared foods and beverages, which carry below-average margins. High-margin produce is shrinking. Blended margin is falling even as revenue rises — a mix-shift problem, not pure pricing.",
      relevance: "Holds the core insight (margin mix shift). Tests whether the candidate diagnoses root cause vs. symptom."
    },
    {
      title: "Store operations notes",
      type: "document",
      summary: "Field notes on shrink, labor, and promotions across regions.",
      content:
        "Shrink is elevated in prepared foods. Promotions are deep and frequent in beverages. Labor hours rose with the prepared-foods expansion.",
      relevance: "Provides the operational levers behind the mix-shift problem."
    }
  ],
  phases: [
    {
      title: "Structure",
      objective: "Break the profit problem into a MECE issue tree.",
      expected_actions: ["Separate revenue, margin, and cost drivers", "State an initial hypothesis"]
    },
    {
      title: "Diagnose",
      objective: "Test the hypothesis against the data.",
      expected_actions: ["Identify the margin mix shift", "Quantify the impact by category"]
    },
    {
      title: "Recommend",
      objective: "Prioritize the highest-impact moves.",
      expected_actions: ["Rank moves by impact and feasibility", "Tie each to a number"]
    }
  ],
  curveballs: [
    {
      type: "constraint_change",
      message: "Partner: the CEO will only fund ONE initiative this year. Which one?",
      expected_response: "Force a single prioritized recommendation with a quantified rationale."
    },
    {
      type: "data_conflict",
      message: "The two cost files disagree on prepared-foods labor. How do you proceed?",
      expected_response: "Reconcile or caveat the discrepancy rather than ignoring it."
    }
  ],
  teamMessages: [
    {
      sender_role: "Manager",
      message: "Committee hates frameworks for their own sake — show the so-what.",
      purpose: "Tests whether structure is used to drive insight, not decoration."
    },
    {
      sender_role: "Associate",
      message: "Want me to build a sizing for the produce recovery?",
      purpose: "Invites delegation and quantification of an opportunity."
    }
  ],
  rubric: [
    {
      dimension: "Problem structuring",
      description: "Builds a clear, MECE structure that drives toward the answer.",
      weight: 25,
      evidence_sources: ["Engagement brief", "Issue tree notes"]
    },
    {
      dimension: "Analytical accuracy",
      description: "Diagnoses the true root cause from the data.",
      weight: 25,
      evidence_sources: ["Category P&L extract"]
    },
    {
      dimension: "Prioritization",
      description: "Ranks recommendations by impact and feasibility.",
      weight: 25,
      evidence_sources: ["Store operations notes"]
    },
    {
      dimension: "Communication clarity",
      description: "Leads with the answer for a senior audience.",
      weight: 25,
      evidence_sources: ["Final recommendation"]
    }
  ],
  evidence: [
    {
      event_type: "note_updated",
      description: "Working hypotheses and structure the candidate records.",
      why_it_matters: "Shows reasoning process, not just the final answer."
    },
    {
      event_type: "recommendation_submitted",
      description: "Final prioritized recommendation.",
      why_it_matters: "Primary signal of judgment and structure."
    }
  ]
};

const PRODUCT_MANAGER: RoleConfig = {
  key: "product_manager",
  role: "Product Manager",
  industry: "Technology",
  department: "Product",
  defaultStyle: "product_decision",
  match: ["product manager", "product", "pm", "growth"],
  scenario: {
    background:
      "You are a PM at a B2B SaaS company. Activation has dropped 12% since a recent onboarding redesign, and leadership wants a plan before the next sprint.",
    business_problem:
      "What caused the activation drop, and what should the team build or change next sprint to recover it?",
    success_definition:
      "A prioritized, evidence-backed product decision with a clear hypothesis, success metric, and explicit trade-offs.",
    constraints: ["One sprint of capacity.", "Cannot fully roll back the redesign."],
    ambiguity_points: [
      "The drop could be tracking error rather than real behavior.",
      "Qualitative feedback conflicts with the funnel data."
    ]
  },
  coreTasks: [
    "Diagnose the activation drop from funnel and qualitative data",
    "Form a prioritized hypothesis",
    "Define the metric that proves success",
    "Make a build / iterate / rollback decision with trade-offs"
  ],
  objectives: [
    "Separate instrumentation issues from real behavior change",
    "Choose a single primary success metric",
    "Make a defensible prioritization call under capacity limits"
  ],
  resources: [
    {
      title: "Product brief",
      type: "memo",
      summary: "Leadership framing of the activation problem and constraints.",
      content:
        "Activation (first key action within 7 days) fell from 48% to 36% after the onboarding redesign. We have one sprint. Leadership wants a recommendation, not a research project. Tell us what to do and why.",
      relevance: "Defines the decision and the one-sprint constraint."
    },
    {
      title: "Funnel analytics",
      type: "spreadsheet",
      summary: "Step-by-step onboarding funnel before vs. after the redesign.",
      content:
        "The new flow added a mandatory team-invite step where 70% of users drop. The final activation step is unchanged. The drop is concentrated entirely at the new step.",
      relevance: "Pinpoints the regression to a specific added step."
    },
    {
      title: "User interview snippets",
      type: "chat",
      summary: "Five recent onboarding session quotes.",
      content:
        "Users say the invite step feels premature ('I just want to try it first'). Two users assumed the product required a team to work.",
      relevance: "Explains why the new step backfires; supports a make-it-optional fix."
    }
  ],
  phases: [
    {
      title: "Diagnose",
      objective: "Locate where and why activation dropped.",
      expected_actions: ["Read the funnel", "Reconcile qualitative feedback with the data"]
    },
    {
      title: "Decide",
      objective: "Choose the intervention and primary metric.",
      expected_actions: ["Pick a hypothesis", "Define the success metric"]
    },
    {
      title: "Plan",
      objective: "Scope the sprint and state trade-offs.",
      expected_actions: ["Fit the work into one sprint", "Name what is deprioritized"]
    }
  ],
  curveballs: [
    {
      type: "new_information",
      message: "Data eng says the invite-step event may be double-firing. Does that change your read?",
      expected_response: "Validate instrumentation before over-committing, but still act on the strong signal."
    },
    {
      type: "manager_message",
      message: "VP: can we just ship a full rollback instead?",
      expected_response: "Weigh rollback vs. targeted fix with explicit trade-offs."
    }
  ],
  teamMessages: [
    {
      sender_role: "Manager",
      message: "Pick one metric we will judge this by.",
      purpose: "Tests metric discipline."
    },
    {
      sender_role: "Associate",
      message: "Eng has bandwidth for either the invite fix or a new dashboard, not both.",
      purpose: "Forces an explicit prioritization trade-off."
    }
  ],
  rubric: [
    {
      dimension: "Problem diagnosis",
      description: "Locates the real cause of the activation drop.",
      weight: 25,
      evidence_sources: ["Funnel analytics", "User interview snippets"]
    },
    {
      dimension: "Prioritization",
      description: "Makes a defensible call within one sprint of capacity.",
      weight: 25,
      evidence_sources: ["Product brief"]
    },
    {
      dimension: "Metrics judgment",
      description: "Chooses a meaningful primary success metric.",
      weight: 25,
      evidence_sources: ["Funnel analytics"]
    },
    {
      dimension: "Communication clarity",
      description: "States the decision and trade-offs crisply.",
      weight: 25,
      evidence_sources: ["Final recommendation"]
    }
  ],
  evidence: [
    {
      event_type: "resource_opened",
      description: "Whether the candidate checks the funnel before deciding.",
      why_it_matters: "Distinguishes data-driven PMs from opinion-driven ones."
    },
    {
      event_type: "recommendation_submitted",
      description: "Final product decision.",
      why_it_matters: "Primary signal of product judgment."
    }
  ]
};

const OPERATIONS_MANAGER: RoleConfig = {
  key: "operations_manager",
  role: "Operations Manager",
  industry: "Logistics",
  department: "Operations",
  defaultStyle: "operations_prioritization",
  match: ["operations", "ops", "supply chain", "logistics", "fulfillment"],
  scenario: {
    background:
      "You run a regional fulfillment center. A carrier delay, a staffing shortage, and a VIP client escalation have all hit on the same morning.",
    business_problem:
      "How do you sequence and resource the day to protect on-time delivery and the key client relationship with limited staff?",
    success_definition:
      "A prioritized action plan that protects the highest-impact commitments and communicates trade-offs to stakeholders.",
    constraints: ["Two fewer staff than planned.", "Overtime budget is capped."],
    ambiguity_points: [
      "It is unclear whether the carrier delay will clear by noon.",
      "The VIP escalation may be lower-volume than it appears."
    ]
  },
  coreTasks: [
    "Triage competing priorities under a resource constraint",
    "Sequence work to protect the most important commitments",
    "Decide where to spend limited overtime",
    "Communicate trade-offs to stakeholders"
  ],
  objectives: [
    "Protect the highest-impact deliveries first",
    "Make a clear overtime allocation call",
    "Keep stakeholders informed of trade-offs"
  ],
  resources: [
    {
      title: "Shift handoff memo",
      type: "memo",
      summary: "Morning status: carrier delay, staffing, and open escalations.",
      content:
        "Carrier B is running 3 hours late on inbound. Two pickers called out. The VIP client (5% of volume, 30% of margin) escalated a missing pallet. SLA penalties trigger at 2pm for the bulk retail orders.",
      relevance: "Establishes the competing priorities and the real stakes (margin vs. volume vs. SLA)."
    },
    {
      title: "Order queue board",
      type: "spreadsheet",
      summary: "Open orders with volumes, deadlines, and penalty exposure.",
      content:
        "Bulk retail orders are high-volume with hard 2pm SLA penalties. The VIP order is low-volume but high-margin. Several low-priority orders have flexible deadlines.",
      relevance: "The data needed to sequence work and decide where overtime pays off."
    },
    {
      title: "Staffing roster",
      type: "document",
      summary: "Available staff, skills, and overtime budget.",
      content:
        "Six pickers available (planned eight). Two are cross-trained on packing. Overtime budget covers ~4 extra labor-hours total.",
      relevance: "Defines the constraint the plan must respect."
    }
  ],
  phases: [
    {
      title: "Assess",
      objective: "Understand the competing demands and constraints.",
      expected_actions: ["Read the handoff and queue", "Identify hard deadlines vs. flexible ones"]
    },
    {
      title: "Prioritize",
      objective: "Sequence work to protect the highest-impact commitments.",
      expected_actions: ["Protect the 2pm SLA volume", "Decide how to handle the VIP escalation"]
    },
    {
      title: "Communicate",
      objective: "Tell stakeholders the plan and trade-offs.",
      expected_actions: ["Allocate the limited overtime", "Set expectations on the de-prioritized orders"]
    }
  ],
  curveballs: [
    {
      type: "new_information",
      message: "Carrier B now says inbound will clear by 11am, not noon.",
      expected_response: "Re-sequence to take advantage of the earlier inbound without dropping the SLA work."
    },
    {
      type: "manager_message",
      message: "GM: the VIP just called me directly. Are we covered?",
      expected_response: "Give a clear status and the trade-off being made, without panicking the plan."
    }
  ],
  teamMessages: [
    {
      sender_role: "Manager",
      message: "We cannot miss the 2pm SLA. Tell me your plan for it.",
      purpose: "Anchors the candidate on the highest-penalty commitment."
    },
    {
      sender_role: "Associate",
      message: "Should I pull the two packers onto picking?",
      purpose: "Invites a concrete resourcing decision."
    }
  ],
  rubric: [
    {
      dimension: "Prioritization",
      description: "Sequences work to protect the most important commitments.",
      weight: 30,
      evidence_sources: ["Order queue board", "Shift handoff memo"]
    },
    {
      dimension: "Resource allocation",
      description: "Spends limited staff and overtime where it matters most.",
      weight: 25,
      evidence_sources: ["Staffing roster"]
    },
    {
      dimension: "Risk detection",
      description: "Anticipates SLA penalties and escalation fallout.",
      weight: 20,
      evidence_sources: ["Order queue board"]
    },
    {
      dimension: "Communication clarity",
      description: "Conveys the plan and trade-offs to stakeholders.",
      weight: 25,
      evidence_sources: ["Final plan"]
    }
  ],
  evidence: [
    {
      event_type: "note_updated",
      description: "The sequencing and resourcing decisions the candidate records.",
      why_it_matters: "Shows the reasoning behind the triage."
    },
    {
      event_type: "recommendation_submitted",
      description: "Final action plan.",
      why_it_matters: "Primary signal of operational judgment."
    }
  ]
};

const SECURITY_ANALYST: RoleConfig = {
  key: "security_analyst",
  role: "Security Analyst",
  industry: "Technology",
  department: "Security",
  defaultStyle: "incident_response",
  match: ["security", "soc", "incident", "infosec", "cyber"],
  scenario: {
    background:
      "You are on the security on-call rotation. An alert fires for unusual data egress from a production service at 2am, and an employee has reported a suspicious login email.",
    business_problem:
      "Is this a real incident, what is its scope, and what containment and communication steps should you take now?",
    success_definition:
      "A correct triage of severity, sound containment steps that avoid destroying evidence, and clear stakeholder communication.",
    constraints: ["Limited info at 2am.", "Taking the service fully offline has customer impact."],
    ambiguity_points: [
      "The egress could be a legitimate backup job.",
      "The reported email may be unrelated phishing."
    ]
  },
  coreTasks: [
    "Triage alert severity and likely scope",
    "Decide containment without destroying forensic evidence",
    "Distinguish signal from noise across the two reports",
    "Communicate clearly to on-call leadership"
  ],
  objectives: [
    "Correctly assess severity before acting",
    "Contain without destroying evidence",
    "Escalate and communicate appropriately"
  ],
  resources: [
    {
      title: "On-call runbook",
      type: "document",
      summary: "Severity definitions and the incident response checklist.",
      content:
        "Sev-1 = confirmed data exfiltration or customer impact. Containment must preserve logs and snapshots before any rebuild. Escalate Sev-1/2 to the IC and legal immediately.",
      relevance: "The standard the candidate's actions are judged against; tests whether they preserve evidence."
    },
    {
      title: "Egress alert detail",
      type: "spreadsheet",
      summary: "The alert payload: volume, destination, time, and source.",
      content:
        "120GB egress to an unknown external IP over 20 minutes from the billing service. The destination is not a known backup endpoint. The service account used has more privileges than it needs.",
      relevance: "Strong evidence this is real and high-severity, not a routine backup."
    },
    {
      title: "Employee phishing report",
      type: "email",
      summary: "Forwarded suspicious 'reset your password' email.",
      content:
        "An employee forwarded a credential-reset email with a lookalike domain. They are unsure if they clicked. Timing is close to the egress event.",
      relevance: "Possible initial-access vector; tests whether the candidate links the two signals."
    }
  ],
  phases: [
    {
      title: "Triage",
      objective: "Assess severity and likely scope.",
      expected_actions: ["Classify severity using the runbook", "Decide if the two reports are linked"]
    },
    {
      title: "Contain",
      objective: "Stop the bleed without destroying evidence.",
      expected_actions: ["Preserve logs and snapshots", "Rotate the over-privileged credentials"]
    },
    {
      title: "Communicate",
      objective: "Escalate and update stakeholders.",
      expected_actions: ["Escalate per the runbook", "Give a clear status to leadership"]
    }
  ],
  curveballs: [
    {
      type: "new_information",
      message: "The destination IP is now also seen beaconing from a second host.",
      expected_response: "Escalate scope and severity; widen containment beyond the first service."
    },
    {
      type: "constraint_change",
      message: "Leadership asks if you can avoid any customer-facing downtime.",
      expected_response: "Balance containment against impact and state the residual risk explicitly."
    }
  ],
  teamMessages: [
    {
      sender_role: "Manager",
      message: "Do not wipe anything before we snapshot. Confirm you've preserved evidence.",
      purpose: "Tests forensic discipline under pressure."
    },
    {
      sender_role: "Reviewer",
      message: "What is your current severity call and why?",
      purpose: "Probes the candidate's reasoning for the severity rating."
    }
  ],
  rubric: [
    {
      dimension: "Threat triage",
      description: "Correctly assesses severity and scope from the evidence.",
      weight: 25,
      evidence_sources: ["Egress alert detail", "On-call runbook"]
    },
    {
      dimension: "Containment judgment",
      description: "Contains effectively while preserving forensic evidence.",
      weight: 25,
      evidence_sources: ["On-call runbook"]
    },
    {
      dimension: "Signal vs. noise",
      description: "Links related signals and discards red herrings.",
      weight: 25,
      evidence_sources: ["Employee phishing report"]
    },
    {
      dimension: "Communication clarity",
      description: "Escalates and updates stakeholders clearly.",
      weight: 25,
      evidence_sources: ["Final incident summary"]
    }
  ],
  evidence: [
    {
      event_type: "resource_opened",
      description: "Order in which the candidate reviews the runbook and alert.",
      why_it_matters: "Shows whether they ground actions in the runbook."
    },
    {
      event_type: "recommendation_submitted",
      description: "Final triage and containment plan.",
      why_it_matters: "Primary signal of incident-response judgment."
    }
  ]
};

const SALES_REVENUE: RoleConfig = {
  key: "sales_revenue",
  role: "Account Executive",
  industry: "SaaS",
  department: "Revenue",
  defaultStyle: "customer_conversation",
  match: ["sales", "account executive", "ae", "revenue", "account manager"],
  scenario: {
    background:
      "You manage a strategic account that is up for renewal. The champion has gone quiet, a competitor is circling, and procurement is pushing for a 20% discount.",
    business_problem:
      "How do you run the renewal conversation to retain the account at healthy economics without simply caving on price?",
    success_definition:
      "A discovery-led approach that reconnects to value, handles the discount ask with trade-offs, and secures a clear next step.",
    constraints: ["Renewal date is in two weeks.", "You can offer at most one concession, with a trade."],
    ambiguity_points: [
      "It is unclear whether the competitor threat is real or a negotiating tactic.",
      "The quiet champion may have changed roles."
    ]
  },
  coreTasks: [
    "Re-establish the value and reconnect with the right stakeholders",
    "Diagnose the real reason behind the discount ask",
    "Handle the price objection with a trade, not a giveaway",
    "Secure a concrete next step"
  ],
  objectives: [
    "Lead with discovery before pitching",
    "Trade any concession for something of value",
    "Close on a clear next step"
  ],
  resources: [
    {
      title: "Account brief",
      type: "memo",
      summary: "Renewal context, usage trends, and stakeholder map.",
      content:
        "ACV is $180k. Product usage is up 22% year over year, but the original champion was promoted and the new contact is cost-focused. A competitor demo happened last month.",
      relevance: "Reveals that the value story is strong (usage up) despite the price pressure — the key leverage."
    },
    {
      title: "Procurement email",
      type: "email",
      summary: "The discount request and stated rationale.",
      content:
        "Procurement: 'We need a 20% reduction to renew; budgets are tight and we have other options.' No mention of product dissatisfaction.",
      relevance: "Signals a budget/negotiation play, not a value problem — tests whether the candidate diagnoses before discounting."
    },
    {
      title: "Usage dashboard",
      type: "spreadsheet",
      summary: "Adoption and outcome metrics for the account.",
      content:
        "Weekly active users up 22%; two new teams onboarded; a documented $400k cost saving from the platform last quarter.",
      relevance: "Hard ROI evidence the candidate should use to reframe the price conversation."
    }
  ],
  phases: [
    {
      title: "Prepare",
      objective: "Build the value case and a stakeholder plan.",
      expected_actions: ["Review usage and ROI", "Identify who actually owns the decision"]
    },
    {
      title: "Engage",
      objective: "Run a discovery-led renewal conversation.",
      expected_actions: ["Diagnose the real driver of the discount ask", "Reframe around value and ROI"]
    },
    {
      title: "Close",
      objective: "Handle the objection and secure a next step.",
      expected_actions: ["Trade any concession for a commitment", "Confirm a concrete next step"]
    }
  ],
  curveballs: [
    {
      type: "new_information",
      message: "The new contact mentions the competitor offered 30% less.",
      expected_response: "Probe the comparison's true scope and defend value rather than matching price."
    },
    {
      type: "manager_message",
      message: "Sales VP: do NOT lose this logo, but protect margin. What's your plan?",
      expected_response: "Balance retention and economics with a trade-based concession, not a giveaway."
    }
  ],
  teamMessages: [
    {
      sender_role: "Manager",
      message: "Any discount has to come with a multi-year or expansion commitment.",
      purpose: "Tests disciplined, trade-based negotiation."
    },
    {
      sender_role: "Associate",
      message: "I can pull the latest ROI numbers if useful.",
      purpose: "Invites the candidate to ground the pitch in evidence."
    }
  ],
  rubric: [
    {
      dimension: "Discovery and diagnosis",
      description: "Uncovers the real driver before responding to the discount.",
      weight: 25,
      evidence_sources: ["Procurement email", "Account brief"]
    },
    {
      dimension: "Value framing",
      description: "Reconnects the conversation to ROI and outcomes.",
      weight: 25,
      evidence_sources: ["Usage dashboard"]
    },
    {
      dimension: "Negotiation",
      description: "Handles the price objection with a trade, not a giveaway.",
      weight: 25,
      evidence_sources: ["Procurement email"]
    },
    {
      dimension: "Communication clarity",
      description: "Runs a structured conversation and closes on a next step.",
      weight: 25,
      evidence_sources: ["Conversation summary"]
    }
  ],
  evidence: [
    {
      event_type: "note_updated",
      description: "Discovery questions and the plan the candidate drafts.",
      why_it_matters: "Shows whether they lead with discovery or jump to discounting."
    },
    {
      event_type: "recommendation_submitted",
      description: "Final renewal approach and next step.",
      why_it_matters: "Primary signal of commercial judgment."
    }
  ]
};

const ROLE_CONFIGS: RoleConfig[] = [
  FINANCIAL_ANALYST,
  MANAGEMENT_CONSULTANT,
  PRODUCT_MANAGER,
  OPERATIONS_MANAGER,
  SECURITY_ANALYST,
  SALES_REVENUE
];

// ---------------------------------------------------------------------------
// Pipeline step 1 — normalize the raw form input.
// ---------------------------------------------------------------------------
export interface NormalizedInput extends GeneratorInput {
  config: RoleConfig;
}

function splitList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : value.split(/[\n,;]+/);
  return arr.map((s) => s.trim()).filter(Boolean);
}

function pickConfig(input: GeneratorInput): RoleConfig {
  const hay = `${input.role_title} ${input.industry} ${input.department ?? ""}`.toLowerCase();
  const styleMatch = ROLE_CONFIGS.find((c) => c.defaultStyle === input.simulation_type);
  const keywordMatch = ROLE_CONFIGS.find((c) => c.match.some((m) => hay.includes(m)));
  return keywordMatch ?? styleMatch ?? FINANCIAL_ANALYST;
}

export function normalizeRoleInput(input: GeneratorInput): NormalizedInput {
  const config = pickConfig(input);
  const duration =
    Number.isFinite(input.duration_minutes) && input.duration_minutes > 0
      ? Math.round(input.duration_minutes)
      : 30;
  return {
    ...input,
    role_title: input.role_title?.trim() || config.role,
    industry: input.industry?.trim() || config.industry,
    seniority: input.seniority?.trim() || "Mid-level",
    department: input.department?.trim() || config.department,
    duration_minutes: duration,
    difficulty: (input.difficulty as Difficulty) || "intermediate",
    simulation_type: input.simulation_type || config.defaultStyle,
    required_skills: splitList(input.required_skills),
    nice_to_have: splitList(input.nice_to_have),
    evaluation_criteria: splitList(input.evaluation_criteria),
    must_have_behaviors: splitList(input.must_have_behaviors),
    disqualifying_behaviors: splitList(input.disqualifying_behaviors),
    config
  };
}

// ---------------------------------------------------------------------------
// Pipeline steps 2-10 — small, focused generators feeding the shared builder.
// ---------------------------------------------------------------------------
export function inferCoreWorkTasks(input: NormalizedInput): string[] {
  const fromForm = splitList(input.real_tasks);
  return Array.from(new Set([...fromForm, ...input.config.coreTasks])).slice(0, 8);
}

export function generateScenario(input: NormalizedInput): SimulationDraft["scenario"] {
  const s = input.config.scenario;
  const background = input.job_description?.trim()
    ? `${s.background} Role context: ${input.job_description.trim()}`
    : s.background;
  return {
    background,
    candidate_role: input.role_title,
    business_problem: s.business_problem,
    success_definition: input.great_performance?.trim()
      ? `${s.success_definition} What great looks like here: ${input.great_performance.trim()}`
      : s.success_definition,
    constraints: s.constraints,
    ambiguity_points: s.ambiguity_points
  };
}

export function generateResources(input: NormalizedInput): DraftResource[] {
  return input.config.resources.map((r, i) => ({
    id: `res_${i + 1}`,
    title: r.title,
    type: r.type,
    summary: r.summary,
    content: r.content,
    relevance: r.relevance
  }));
}

export function generatePhases(input: NormalizedInput): DraftPhase[] {
  const phases = input.config.phases;
  const total = input.duration_minutes;
  const base = Math.max(1, Math.floor(total / phases.length));
  return phases.map((p, i) => ({
    id: `phase_${i + 1}`,
    title: p.title,
    duration_minutes: i === phases.length - 1 ? total - base * (phases.length - 1) : base,
    objective: p.objective,
    expected_actions: p.expected_actions
  }));
}

export function generateObjectives(input: NormalizedInput): string[] {
  const extra = splitList(input.evaluation_criteria);
  return Array.from(new Set([...input.config.objectives, ...extra])).slice(0, 8);
}

export function generateCurveballs(input: NormalizedInput): DraftCurveball[] {
  const cbs = input.config.curveballs;
  const total = input.duration_minutes;
  return cbs.map((c, i) => ({
    trigger_minute: Math.max(1, Math.round((total * (i + 1)) / (cbs.length + 1))),
    type: c.type,
    message: c.message,
    expected_response: c.expected_response
  }));
}

export function generateTeamMessages(input: NormalizedInput): DraftTeamMessage[] {
  const msgs = input.config.teamMessages;
  const total = input.duration_minutes;
  return msgs.map((m, i) => ({
    sender_role: m.sender_role,
    minute: Math.max(1, Math.round((total * (i + 1)) / (msgs.length + 2))),
    message: m.message,
    purpose: m.purpose
  }));
}

function normalizeWeights(dims: DraftRubricDimension[]): DraftRubricDimension[] {
  const sum = dims.reduce((acc, d) => acc + (Number(d.weight) || 0), 0);
  if (sum === 100 || sum === 0) return dims;
  let running = 0;
  return dims.map((d, i) => {
    if (i === dims.length - 1) return { ...d, weight: 100 - running };
    const w = Math.round(((Number(d.weight) || 0) / sum) * 100);
    running += w;
    return { ...d, weight: w };
  });
}

export function generateRubric(input: NormalizedInput): DraftRubricDimension[] {
  const dims = input.config.rubric.map((r) => ({
    dimension: r.dimension,
    description: r.description,
    weight: r.weight,
    levels: r.levels ?? autoLevels(r.dimension),
    evidence_sources: r.evidence_sources
  }));
  return normalizeWeights(dims);
}

export function generateEvidencePlan(input: NormalizedInput): SimulationDraft["evidence_capture"] {
  return input.config.evidence;
}

function generateCandidateBrief(
  input: NormalizedInput,
  scenario: SimulationDraft["scenario"],
  phases: DraftPhase[]
): SimulationDraft["candidate_brief"] {
  return {
    opening_message: `Welcome. You are stepping in as ${input.role_title}. ${scenario.business_problem} You have ${input.duration_minutes} minutes and the materials provided. Lead with your answer.`,
    instructions: [
      "Review the resources and identify what is evidence vs. assertion.",
      ...phases.map((p) => `${p.title}: ${p.objective}`),
      "Submit a clear, defensible recommendation before time runs out."
    ],
    deliverables: ["A written recommendation with supporting rationale and the top risks."],
    time_limit_minutes: input.duration_minutes
  };
}

function generateReportTemplate(): SimulationDraft["report_template"] {
  return {
    summary_sections: ["Overall signal", "What they did well", "Where they fell short", "Recommendation"],
    skill_breakdown: ["Score per rubric dimension with the evidence behind it"],
    interview_followups: [
      "Walk me through the assumption you were least sure about.",
      "What would change your recommendation?"
    ]
  };
}

// ---------------------------------------------------------------------------
// The single shared builder. Everything routes through here.
// ---------------------------------------------------------------------------
function buildTemplate(input: NormalizedInput): SimulationDraft {
  const config = input.config;
  const scenario = generateScenario(input);
  const phases = generatePhases(input);
  const styleLabel = STYLE_LABELS[input.simulation_type] ?? "simulation";

  return {
    title: deriveTitle(input),
    role: input.role_title,
    industry: input.industry,
    seniority: input.seniority,
    difficulty: input.difficulty,
    duration_minutes: input.duration_minutes,
    simulation_type: input.simulation_type,
    description: `A ${input.duration_minutes}-minute ${styleLabel} for a ${input.seniority} ${input.role_title} in ${input.industry}. The candidate works ${config.scenario.business_problem.toLowerCase()}`,
    scenario,
    candidate_brief: generateCandidateBrief(input, scenario, phases),
    resources: generateResources(input),
    phases,
    objectives: generateObjectives(input),
    curveballs: generateCurveballs(input),
    team_messages: generateTeamMessages(input),
    rubric: generateRubric(input),
    evidence_capture: generateEvidencePlan(input),
    report_template: generateReportTemplate()
  };
}

const STYLE_LABELS: Record<SimulationStyle, string> = {
  case_analysis: "case analysis",
  inbox_triage: "inbox triage",
  spreadsheet_analysis: "spreadsheet analysis",
  customer_conversation: "customer conversation",
  incident_response: "incident response",
  product_decision: "product decision",
  operations_prioritization: "operations prioritization",
  written_recommendation: "written recommendation"
};

function deriveTitle(input: NormalizedInput): string {
  const label = STYLE_LABELS[input.simulation_type] ?? "simulation";
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  return `${input.role_title} ${cap}`;
}

/** Main deterministic entry point: input -> full SimulationDraft. */
export function generateSimulation(input: GeneratorInput): SimulationDraft {
  return buildTemplate(normalizeRoleInput(input));
}

// ---------------------------------------------------------------------------
// Validation — per the brief.
// ---------------------------------------------------------------------------
export function validateSimulationJson(draft: SimulationDraft): GeneratorValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!draft.title?.trim()) errors.push("Title is required.");
  if (!draft.role?.trim()) errors.push("Role is required.");
  if (!draft.duration_minutes || draft.duration_minutes <= 0)
    errors.push("Duration must be a positive number of minutes.");
  if (!draft.scenario?.business_problem?.trim() && !draft.scenario?.background?.trim())
    errors.push("Scenario is required.");

  const resources = draft.resources ?? [];
  if (resources.length < 3) errors.push("At least 3 resources are required.");
  if (resources.some((r) => !r.content?.trim()))
    errors.push("Every resource must have non-empty content.");

  const rubric = draft.rubric ?? [];
  if (rubric.length < 4) errors.push("At least 4 rubric dimensions are required.");

  const weightSum = rubric.reduce((acc, d) => acc + (Number(d.weight) || 0), 0);
  if (rubric.length > 0 && weightSum !== 100) {
    // Normalize in place so the saved draft is always clean.
    const normalized = normalizeWeights(rubric);
    for (let i = 0; i < rubric.length; i++) rubric[i].weight = normalized[i].weight;
    warnings.push(`Rubric weights summed to ${weightSum}; they were normalized to 100.`);
  }

  if ((draft.phases?.length ?? 0) < 3) errors.push("At least 3 phases are required.");
  if ((draft.candidate_brief?.deliverables?.length ?? 0) < 1)
    errors.push("At least 1 deliverable is required.");

  // Reject quiz-only structures: a real simulation needs work artifacts, not
  // just questions. We approximate this by requiring resources + a deliverable
  // that is not purely a set of questions.
  const looksLikeQuiz =
    resources.length === 0 &&
    (draft.objectives ?? []).every((o) => /\?$/.test(o.trim()));
  if (looksLikeQuiz) errors.push("Quiz-only structures are not allowed; provide work resources and a deliverable.");

  // Fairness / legal screen across all human-authored criteria text.
  const criteriaText = [
    ...rubric.map((d) => `${d.dimension} ${d.description}`),
    ...(draft.objectives ?? [])
  ]
    .join(" ")
    .toLowerCase();
  if (PROTECTED_TERMS.some((t) => criteriaText.includes(t))) {
    warnings.push(FAIRNESS_WARNING);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Same fairness screen, exposed for screening raw user-entered criteria. */
export function screenCriteriaForFairness(criteria: string[]): string[] {
  const flagged: string[] = [];
  for (const c of criteria) {
    if (PROTECTED_TERMS.some((t) => c.toLowerCase().includes(t))) flagged.push(c);
  }
  return flagged;
}

// ---------------------------------------------------------------------------
// Persistence — map the validated draft onto the existing `simulations` table.
// ---------------------------------------------------------------------------
function toScenarioJson(draft: SimulationDraft): ScenarioJson {
  return {
    background: draft.scenario.background,
    candidate_role: draft.scenario.candidate_role,
    business_problem: draft.scenario.business_problem,
    success_definition: draft.scenario.success_definition,
    constraints: draft.scenario.constraints,
    ambiguity_points: draft.scenario.ambiguity_points,
    phases: draft.phases.map((p) => p.title),
    objectives: draft.objectives,
    candidate_brief: draft.candidate_brief,
    phase_detail: draft.phases,
    curveballs: draft.curveballs,
    team_messages: draft.team_messages,
    evidence_capture: draft.evidence_capture,
    report_template: draft.report_template
  };
}

function toRubricJson(draft: SimulationDraft): RubricDimension[] {
  return draft.rubric.map((d) => ({
    dimension: d.dimension,
    description: d.description,
    weight: d.weight,
    levels: d.levels,
    evidence_sources: d.evidence_sources
  }));
}

export interface SaveResult {
  ok: boolean;
  simulation?: Simulation;
  validation: GeneratorValidation;
}

export async function saveDraftSimulation(
  workspaceId: string,
  draft: SimulationDraft,
  createdBy: string,
  status: "draft" | "active" = "draft"
): Promise<SaveResult> {
  const validation = validateSimulationJson(draft);
  if (!validation.ok) return { ok: false, validation };

  const { data, error } = await getSupabaseAdmin()
    .from("simulations")
    .insert({
      workspace_id: workspaceId,
      title: draft.title,
      role: draft.role,
      industry: draft.industry,
      description: draft.description,
      duration_minutes: draft.duration_minutes,
      difficulty: draft.difficulty,
      status,
      simulation_type: draft.simulation_type,
      scenario_json: toScenarioJson(draft),
      resources_json: draft.resources,
      rubric_json: toRubricJson(draft),
      created_by: createdBy
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { ok: true, simulation: data as Simulation, validation };
}

// ---------------------------------------------------------------------------
// Optional LLM enrichment. Clean interface; always falls back to deterministic.
// The deterministic builder is the deliverable — we never block on the LLM.
// ---------------------------------------------------------------------------
export interface GenerateOptions {
  useLLM?: boolean;
}

export async function generateSimulationWithLLM(
  input: GeneratorInput,
  options: GenerateOptions = {}
): Promise<{ draft: SimulationDraft; source: "llm" | "deterministic" }> {
  const draft = generateSimulation(input);
  if (!options.useLLM || !process.env.OPENAI_API_KEY) {
    return { draft, source: "deterministic" };
  }
  try {
    const enriched = await enrichDraftCopy(draft);
    return { draft: enriched, source: "llm" };
  } catch {
    return { draft, source: "deterministic" };
  }
}

// Narrow LLM enrichment: improve only the human-readable scenario copy, keep the
// validated structure intact. Failure returns the original draft unchanged.
async function enrichDraftCopy(draft: SimulationDraft): Promise<SimulationDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return draft;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You polish hiring-simulation copy. Return ONLY JSON {background, business_problem}. Keep it realistic, specific, and free of em-dashes. Do not invent facts not implied by the input."
        },
        {
          role: "user",
          content: `Role: ${draft.role}\nIndustry: ${draft.industry}\nBackground: ${draft.scenario.background}\nProblem: ${draft.scenario.business_problem}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
      temperature: 0.5
    })
  });
  if (!res.ok) return draft;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return draft;
  const parsed = JSON.parse(raw) as { background?: string; business_problem?: string };
  return {
    ...draft,
    scenario: {
      ...draft.scenario,
      background: typeof parsed.background === "string" ? parsed.background : draft.scenario.background,
      business_problem:
        typeof parsed.business_problem === "string"
          ? parsed.business_problem
          : draft.scenario.business_problem
    }
  };
}

/** Role catalog for the UI (compact metadata only). */
export function listRoleTemplates(): { key: string; role: string; industry: string; style: SimulationStyle }[] {
  return ROLE_CONFIGS.map((c) => ({
    key: c.key,
    role: c.role,
    industry: c.industry,
    style: c.defaultStyle
  }));
}
