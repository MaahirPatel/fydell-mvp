import type { Stage } from "./types";

// Shared scenario copy for the candidate workstation and review report.

export const SIMULATION_MINUTES = 25;
export const SIMULATION_SECONDS = SIMULATION_MINUTES * 60;

export const LANDING_COPY = `This is not an interview. This is 25 minutes of real financial work. You will receive a role-specific scenario, source materials, and a timed workbook. Fydell measures how you reason, prioritize, and communicate under realistic conditions.`;

export const CONSENT_COPY = `I confirm that I will complete this simulation myself and that my responses represent my own thinking. I understand this session will be recorded for evaluation purposes.`;

export const CONFIRMATION_COPY = `Your simulation is complete. The hiring team will review your work and follow up with next steps. Thank you for your time.`;

export const SCENARIO_TITLE = "Financial Analyst Simulation";

export const SCENARIO_HEADER = `You are evaluating whether to recommend acquiring a target business for $2.4 billion. Your manager has asked you to assess whether the offer represents fair value. You have 25 minutes and access to the materials below. A teammate may reach out with updates. Use any resources available to you.`;

export const DCF_MODEL = {
  years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
  revenue: ["$820M", "$886M", "$957M", "$1,034M", "$1,117M"],
  ebitdaMargin: ["18.2%", "18.8%", "19.1%", "19.4%", "19.7%"],
  capexPctRevenue: ["4.2%", "4.2%", "4.2%", "4.2%", "4.2%"],
  workingCapitalChange: ["-$12M", "-$12M", "-$12M", "-$12M", "-$12M"],
  terminalGrowthRate: "4.8%",
  wacc: "7.2%",
  impliedEnterpriseValue: "$3.1 billion",
  note: "Note: Terminal growth rate reflects management's long-term outlook. Industry peers average 2.1% to 2.9% terminal growth."
};

export const CREDIT_AGREEMENT_SECTIONS: { n: number; title: string; body: string }[] = [
  {
    n: 1,
    title: "Facility Amount",
    body: "The lenders have made available to the borrower a senior secured term loan facility in an aggregate principal amount of $340,000,000, advanced in a single drawing on the closing date."
  },
  {
    n: 2,
    title: "Interest Rate",
    body: "Outstanding balances bear interest at a rate equal to the applicable benchmark rate plus a margin of 3.25% per annum, payable quarterly in arrears."
  },
  {
    n: 3,
    title: "Maturity Date",
    body: "The facility matures seven years from the closing date, at which point all outstanding principal, accrued interest, and fees are due and payable in full."
  },
  {
    n: 4,
    title: "Covenants Summary",
    body: "The borrower must maintain a maximum total net leverage ratio of 4.0x and a minimum interest coverage ratio of 2.5x, tested quarterly."
  },
  {
    n: 5,
    title: "Events of Default",
    body: "Customary events of default apply, including non-payment, covenant breach, cross-default to material indebtedness, insolvency, and material misrepresentation."
  },
  {
    n: 6,
    title: "Governing Law",
    body: "This agreement and any non-contractual obligations arising from it are governed by the laws of the State of New York."
  },
  {
    n: 7,
    title: "Change of Control Provision",
    body: "In the event of a change of control, the outstanding principal balance of $340 million becomes immediately due and payable within 30 days."
  },
  {
    n: 8,
    title: "Miscellaneous",
    body: "Notices, assignment, amendments, and severability provisions are set out in the schedules. No waiver is effective unless made in writing."
  }
];

export const MANAGEMENT_PRESENTATION = {
  intro:
    "Target business strategic rationale and value creation. The following summarizes the synergy case presented by management in support of the proposed transaction.",
  synergies: [
    {
      label: "Revenue synergies",
      amount: "$45M",
      detail: "annually, from cross-selling target products through the buyer's distribution network"
    },
    {
      label: "Cost synergies",
      amount: "$38M",
      detail: "annually, from procurement savings and shared services"
    },
    {
      label: "Total synergies",
      amount: "$83M",
      detail: "annually"
    }
  ],
  footnote:
    "Revenue synergy estimate includes $18M from expanded distribution channels already reflected in the base case revenue projections for Year 3 onward."
};

export interface ScenarioNotification {
  triggerMinute: number;
  from: string;
  kind: "message" | "market";
  body: string;
  stage: Stage;
  responseLabel: string;
  required: boolean;
  minChars?: number;
}

export const NOTIFICATIONS: ScenarioNotification[] = [
  {
    triggerMinute: 8,
    from: "Associate",
    kind: "message",
    body: "I reviewed recent precedent transactions. The closest deals closed at 6.2x and 6.8x EBITDA, which may affect your valuation range.",
    stage: "associate_update",
    responseLabel:
      "Response to associate update - what does this change about your analysis, if anything?",
    required: false
  },
  {
    triggerMinute: 16,
    from: "Manager",
    kind: "message",
    body: "Send a quick preliminary read with where you are landing on fair value and the key risks you have identified so far.",
    stage: "manager_read",
    responseLabel: "Preliminary read to manager",
    required: true,
    minChars: 50
  },
  {
    triggerMinute: 22,
    from: "Market Update",
    kind: "market",
    body: "The target business released a trading statement showing Q3 revenue 8% below consensus, citing weakness in core markets.",
    stage: "market_update",
    responseLabel: "Does this change your recommendation? If so, how?",
    required: false
  }
];

export const FINAL_QUESTIONS: { stage: Stage; prompt: string }[] = [
  { stage: "final_q1", prompt: "What was the single most important finding in the materials you reviewed?" },
  { stage: "final_q2", prompt: "Where were you least confident in your analysis and why?" },
  { stage: "final_q3", prompt: "If you had 30 more minutes, what would you do first?" }
];

export const STAGE_LABELS: Record<Stage, string> = {
  associate_update: "Response to associate update",
  manager_read: "Preliminary read to manager",
  market_update: "Response to market update",
  final_q1: "Most important finding",
  final_q2: "Least confident and why",
  final_q3: "What you would do with 30 more minutes"
};
