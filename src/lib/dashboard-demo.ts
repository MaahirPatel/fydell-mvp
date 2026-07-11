// Demo data for the employer dashboard when Supabase is not configured.
// Realistic FP&A hiring scenario built around Project Meridian.

export const DEMO_WORKSPACE = {
  id: "demo-ws-001",
  name: "Acme Financial Group",
  created_by: null,
  created_at: "2024-10-01T00:00:00Z",
  updated_at: "2024-10-01T00:00:00Z",
};

export const DEMO_SIMULATION = {
  id: "sim-meridian-001",
  workspace_id: "demo-ws-001",
  title: "Project Meridian — FP&A Forecast Review",
  role: "Junior FP&A Analyst",
  industry: "Outdoor / Consumer Goods",
  description:
    "Candidate reviews Meridian Outdoor Co.'s Q3 hiring plan, models the financial impact of 8 proposed FTEs, surfaces risks, and delivers a Go / Hold / Revise recommendation.",
  duration_minutes: 25,
  difficulty: "Intermediate",
  status: "active" as const,
  simulation_type: "fpa_forecast_review",
  scenario_json: {},
  resources_json: [],
  rubric_json: [],
  created_by: null,
  created_at: "2024-10-01T00:00:00Z",
  updated_at: "2024-10-01T00:00:00Z",
};

export interface DemoCandidate {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "submitted" | "in_progress" | "reviewed";
  decision: "advance" | "hold" | "reject" | "not_decided";
  score: number;
  signal: "strong" | "moderate" | "weak";
  completionMins: number;
  submittedAt: string;
  verdict: "go" | "hold" | "revise" | null;
  flags: number;
  modelEdits: number;
}

export const DEMO_CANDIDATES: DemoCandidate[] = [
  {
    id: "cand-001",
    name: "Alex Chen",
    email: "alex.chen@example.com",
    role: "Junior FP&A Analyst",
    status: "reviewed",
    decision: "advance",
    score: 84,
    signal: "strong",
    completionMins: 22,
    submittedAt: "2024-11-14T10:22:00Z",
    verdict: "hold",
    flags: 3,
    modelEdits: 5,
  },
  {
    id: "cand-002",
    name: "Jordan Park",
    email: "jordan.park@example.com",
    role: "Junior FP&A Analyst",
    status: "reviewed",
    decision: "hold",
    score: 67,
    signal: "moderate",
    completionMins: 24,
    submittedAt: "2024-11-15T14:08:00Z",
    verdict: "go",
    flags: 1,
    modelEdits: 2,
  },
  {
    id: "cand-003",
    name: "Sam Rivera",
    email: "sam.rivera@example.com",
    role: "Junior FP&A Analyst",
    status: "submitted",
    decision: "not_decided",
    score: 79,
    signal: "moderate",
    completionMins: 21,
    submittedAt: "2024-11-16T09:45:00Z",
    verdict: "revise",
    flags: 2,
    modelEdits: 4,
  },
  {
    id: "cand-004",
    name: "Taylor Kim",
    email: "taylor.kim@example.com",
    role: "Junior FP&A Analyst",
    status: "in_progress",
    decision: "not_decided",
    score: 0,
    signal: "weak",
    completionMins: 0,
    submittedAt: "",
    verdict: null,
    flags: 0,
    modelEdits: 0,
  },
];

export interface DemoReport {
  id: string;
  candidateId: string;
  candidateName: string;
  overallSignal: "strong" | "moderate" | "weak";
  score: number;
  verdict: "go" | "hold" | "revise";
  summary: string;
  submittedAt?: string;
  execSummary: {
    headline: string;
    signalLabel: string;
    percentile: number;
    cohortAvg: number;
  };
  signalCards: Array<{
    label: string;
    score: number;
    rationale: string;
    evidencePresent: boolean;
  }>;
  strengths: string[];
  risks: string[];
  timeline: Array<{ time: string; event: string; stage: string }>;
  finalMemo: string;
  missedSignals: Array<{ signal: string; description: string }>;
  interviewQuestions: string[];
  compare: { percentile: number; avgScore: number; topScore: number; n: number };
}

export const DEMO_REPORTS: DemoReport[] = [
  {
    id: "report-001",
    candidateId: "cand-001",
    candidateName: "Alex Chen",
    overallSignal: "strong",
    score: 84,
    verdict: "hold",
    summary:
      "Alex demonstrated strong analytical instincts and correctly identified the $800K pipeline risk before receiving the manager update. The Hold recommendation was well-reasoned, with clear financial modeling and specific risk quantification.",
    execSummary: {
      headline: "Strong signal — recommend advancing to final interview",
      signalLabel: "STRONG",
      percentile: 88,
      cohortAvg: 71,
    },
    signalCards: [
      {
        label: "Forecast Accuracy",
        score: 87,
        rationale:
          "Challenged the 18% growth assumption, noting historical range of 12–15%. Modeled a downside scenario showing $800K revenue risk.",
        evidencePresent: true,
      },
      {
        label: "Risk Detection",
        score: 91,
        rationale:
          "Independently identified pipeline slippage risk from the Q4 coverage data before manager update was revealed. Quantified the cash impact.",
        evidencePresent: true,
      },
      {
        label: "Business Judgment",
        score: 82,
        rationale:
          "Recommended Hold rather than Go — appropriate given pipeline uncertainty. Clearly articulated conditions for revisiting the decision.",
        evidencePresent: true,
      },
      {
        label: "Communication Clarity",
        score: 79,
        rationale:
          "Memo was structured with a clear verdict, specific risks, and quantified assumptions. Could improve on clarity of recommendation conditions.",
        evidencePresent: true,
      },
      {
        label: "Prioritization",
        score: 88,
        rationale:
          "Focused on the three most material issues: revenue assumption, cash runway, and pipeline quality. Did not get distracted by secondary items.",
        evidencePresent: true,
      },
      {
        label: "Assumption Quality",
        score: 76,
        rationale:
          "Flagged 3 of 4 key assumptions correctly. Missed the \"current burn stays flat\" flag but identified all material revenue assumptions.",
        evidencePresent: true,
      },
    ],
    strengths: [
      "Proactively challenged the 18% revenue growth assumption against historical data (12–15% range)",
      "Modeled downside scenario showing EBITDA turning negative if pipeline slips",
      "Correctly identified Hold as the appropriate verdict — did not rubber-stamp the plan",
      "Quantified the HC cost at $96K/quarter and assessed against 6-month cash runway",
      "Raised a sharp question for management: 'What are the 90-day pipeline re-qualification criteria?'",
    ],
    risks: [
      "Did not flag the 'burn stays flat' assumption — new hires typically increase non-HC burn 8–12%",
      "Memo structure could be tighter; mixed assumptions and risks in the same section",
      "No explicit mention of the ramp timeline for 8 new hires (productivity lag, training cost)",
    ],
    timeline: [
      { time: "0:00", event: "Started simulation", stage: "brief" },
      { time: "1:20", event: "Opened Q3 Budget Bridge", stage: "data_room" },
      { time: "3:05", event: "Opened Headcount Request", stage: "data_room" },
      { time: "4:40", event: "Opened Revenue Forecast Assumptions", stage: "data_room" },
      { time: "6:10", event: "Opened Cash Flow Projection", stage: "data_room" },
      { time: "7:30", event: "Opened CFO Email", stage: "data_room" },
      { time: "8:45", event: "Entered Forecast Model — adjusted revenue to $3.8M (downside)", stage: "forecast" },
      { time: "10:20", event: "Modeled HC cost at $96K; recalculated EBITDA to $284K", stage: "forecast" },
      { time: "12:00", event: "Flagged: 18% growth assumption → Material Risk", stage: "assumptions" },
      { time: "12:30", event: "Flagged: 8 FTEs by Aug 15 → Needs Review", stage: "assumptions" },
      { time: "13:00", event: "Flagged: Pipeline slippage → Material Risk", stage: "assumptions" },
      { time: "13:40", event: "Manager update revealed", stage: "manager_update" },
      { time: "14:10", event: "Updated notes following manager update", stage: "manager_update" },
      { time: "15:00", event: "Began writing recommendation memo", stage: "recommendation" },
      { time: "22:00", event: "Submitted recommendation: Hold", stage: "recommendation" },
    ],
    finalMemo:
      "Recommendation: HOLD\n\nSummary: Based on my analysis of the Q3 financial plan and data room, I recommend holding on the full 8-FTE hire until Q3 pipeline risk is resolved.\n\nKey findings:\n1. Revenue forecast of $4.2M assumes 18% YoY growth — above our historical 12–15% range. Downside scenario shows $3.4M if $800K in late-stage deals slip to Q4.\n2. At $3.4M revenue, EBITDA turns negative once $96K HC cost is added. Combined with 6-month runway, this creates a cash risk.\n3. Pipeline coverage at 0.9x for late-stage deals is below our 1.2x threshold for comfort.\n\nConditions for Go:\n- Pipeline qualification showing < $400K slippage risk\n- CFO sign-off on downside scenario\n- Or: Revise HC plan to 4 high-priority FTEs in August, 4 contingent on Q3 close\n\nQuestions for management:\n1. What are the 90-day re-qualification criteria for the $800K at-risk pipeline?\n2. Has the CFO modeled the hiring ramp cost beyond the fully-loaded $96K?\n3. Is there flexibility to phase the hire (4+4) rather than all 8 simultaneously?",
    missedSignals: [
      {
        signal: "Burn rate increase",
        description:
          "New hires typically increase non-HC operational burn (equipment, SaaS seats, office) by 8–12%. This was not modeled, understating the cash impact.",
      },
      {
        signal: "Hiring ramp lag",
        description:
          "8 FTEs hired by Aug 15 means full productivity not until Q4 at earliest. The Q3 EBITDA benefit of new sales hires is near-zero.",
      },
    ],
    interviewQuestions: [
      "Walk me through how you determined that $800K in pipeline was at risk — what data signals led you there before the manager update?",
      "You recommended Hold. What specific metric or data point would move you to Go, and by when?",
      "How did you think about the hiring ramp effect on the revenue model? The sales reps wouldn't be productive until Q4.",
      "If you could revise one number in the forecast model, which would it be and why?",
      "You flagged 3 of 4 assumptions. What assumption did you not flag, and in hindsight, should you have?",
    ],
    compare: { percentile: 88, avgScore: 71, topScore: 91, n: 12 },
  },
  {
    id: "report-002",
    candidateId: "cand-002",
    candidateName: "Jordan Park",
    overallSignal: "moderate",
    score: 67,
    verdict: "go",
    summary:
      "Jordan completed the simulation and engaged with the forecast model but recommended Go — accepting the plan at face value without adequately stress-testing the revenue assumption or pipeline quality. Risk detection was limited.",
    execSummary: {
      headline: "Moderate signal — proceed with caution; deep-dive interview recommended",
      signalLabel: "MODERATE",
      percentile: 52,
      cohortAvg: 71,
    },
    signalCards: [
      {
        label: "Forecast Accuracy",
        score: 55,
        rationale:
          "Accepted the 18% growth assumption without challenge. Did not compare against historical seasonality data available in the data room.",
        evidencePresent: false,
      },
      {
        label: "Risk Detection",
        score: 48,
        rationale:
          "Did not independently identify pipeline slippage risk. Only noted it after the manager update was revealed.",
        evidencePresent: false,
      },
      {
        label: "Business Judgment",
        score: 61,
        rationale:
          "Recommended Go — underweighting the cash risk. Shows comfort with financial modeling but lacks judgment on downside scenarios.",
        evidencePresent: true,
      },
      {
        label: "Communication Clarity",
        score: 72,
        rationale:
          "Memo was clear and well-structured. Strong on presentation; weaker on the quality of underlying analysis.",
        evidencePresent: true,
      },
      {
        label: "Prioritization",
        score: 69,
        rationale:
          "Spent significant time on headcount details but less time on revenue and cash flow risks.",
        evidencePresent: true,
      },
      {
        label: "Assumption Quality",
        score: 58,
        rationale:
          "Only flagged 1 of 4 key assumptions (pipeline slippage, after manager update). Missed revenue growth and cash runway flags.",
        evidencePresent: false,
      },
    ],
    strengths: [
      "Modeled HC cost correctly at $96K/quarter",
      "Memo structure was clean and professional",
      "Engaged with all 6 data room documents",
    ],
    risks: [
      "Recommended Go without stress-testing revenue assumption",
      "Did not identify pipeline risk independently",
      "Only flagged 1 of 4 material assumptions",
      "No downside scenario modeled in forecast",
    ],
    timeline: [
      { time: "0:00", event: "Started simulation", stage: "brief" },
      { time: "2:00", event: "Opened Q3 Budget Bridge", stage: "data_room" },
      { time: "4:30", event: "Opened Headcount Request", stage: "data_room" },
      { time: "6:00", event: "Opened Revenue Forecast", stage: "data_room" },
      { time: "8:00", event: "Entered Forecast Model — added HC cost $96K", stage: "forecast" },
      { time: "12:00", event: "Flagged: pipeline slippage after manager update", stage: "assumptions" },
      { time: "13:40", event: "Manager update revealed", stage: "manager_update" },
      { time: "15:00", event: "Began writing recommendation memo", stage: "recommendation" },
      { time: "24:00", event: "Submitted recommendation: Go", stage: "recommendation" },
    ],
    finalMemo:
      "Recommendation: GO\n\nThe Q3 hiring plan looks sound. Revenue is tracking well at 18% growth and the team clearly needs additional capacity to hit targets. I recommend proceeding with all 8 FTEs as planned.\n\nThe cash position of $2.1M with 6-month runway is sufficient. Adding $96K/quarter is manageable. The team should monitor pipeline closely given the CFO's note about $800K at risk.",
    missedSignals: [
      {
        signal: "Revenue assumption not challenged",
        description:
          "18% growth is above the historical 12–15% range. The seasonality data clearly showed this — candidate did not compare.",
      },
      {
        signal: "Cash risk underweighted",
        description:
          "6-month runway + $32K/month increase in burn = meaningful risk if Q3 misses. This was not modeled.",
      },
      {
        signal: "No downside scenario",
        description:
          "Forecast model was edited but no downside case was built. The correct analysis requires modeling the $800K slippage.",
      },
    ],
    interviewQuestions: [
      "You recommended Go. Walk me through how you assessed the pipeline risk — what would have changed your recommendation?",
      "The 18% growth assumption is above historical range. Did you notice this in the data, and if so, how did you weigh it?",
      "What does a 6-month cash runway mean for hiring decisions in your view?",
      "If the $800K pipeline slips to Q4, what would be the impact on your recommendation?",
    ],
    compare: { percentile: 52, avgScore: 71, topScore: 91, n: 12 },
  },
  {
    id: "report-003",
    candidateId: "cand-003",
    candidateName: "Sam Rivera",
    overallSignal: "moderate",
    score: 79,
    verdict: "revise",
    summary:
      "Sam showed solid analytical capability and recommended Revise — a defensible position. Strong on risk identification but the quantitative modeling was partially incomplete. The memo was the best of the three reviewed so far.",
    execSummary: {
      headline: "Moderate-strong signal — advance pending structured interview",
      signalLabel: "MODERATE",
      percentile: 74,
      cohortAvg: 71,
    },
    signalCards: [
      {
        label: "Forecast Accuracy",
        score: 81,
        rationale:
          "Correctly noted that 18% growth exceeds historical range and built a conservative $3.8M scenario in the model.",
        evidencePresent: true,
      },
      {
        label: "Risk Detection",
        score: 77,
        rationale:
          "Identified pipeline risk and cash constraints. Did not fully quantify the burn rate increase from new hires.",
        evidencePresent: true,
      },
      {
        label: "Business Judgment",
        score: 85,
        rationale:
          "Revise recommendation was well-calibrated — specific about which 4 roles to approve immediately vs. defer.",
        evidencePresent: true,
      },
      {
        label: "Communication Clarity",
        score: 88,
        rationale:
          "Best-structured memo of the cohort. Clear verdict, numbered risks, explicit conditions for upgrading to Go.",
        evidencePresent: true,
      },
      {
        label: "Prioritization",
        score: 74,
        rationale:
          "Correctly prioritized revenue and cash risk. Spent slightly too long on headcount details vs. financial analysis.",
        evidencePresent: true,
      },
      {
        label: "Assumption Quality",
        score: 71,
        rationale:
          "Flagged 2 of 4 key assumptions. Missed the 'burn stays flat' and 'FTEs productive in Q3' flags.",
        evidencePresent: true,
      },
    ],
    strengths: [
      "Recommended Revise with a specific phased plan (4 FTEs now, 4 contingent)",
      "Built a downside revenue scenario at $3.8M",
      "Best-structured executive memo of the cohort",
      "Proactively asked CFO re-qualification questions",
    ],
    risks: [
      "Did not model ramp lag — new sales FTEs won't produce Q3 revenue",
      "Missed the non-HC burn increase assumption",
    ],
    timeline: [
      { time: "0:00", event: "Started simulation", stage: "brief" },
      { time: "1:30", event: "Opened Q3 Budget Bridge", stage: "data_room" },
      { time: "3:20", event: "Opened Revenue Forecast Assumptions", stage: "data_room" },
      { time: "5:00", event: "Opened Cash Flow Projection", stage: "data_room" },
      { time: "7:00", event: "Opened CFO Email", stage: "data_room" },
      { time: "8:30", event: "Entered Forecast Model — adjusted revenue to $3.8M", stage: "forecast" },
      { time: "10:00", event: "Added HC cost $96K; EBITDA at $204K (downside)", stage: "forecast" },
      { time: "11:30", event: "Flagged: 18% growth → Material Risk", stage: "assumptions" },
      { time: "12:10", event: "Flagged: 8 FTEs by Aug 15 → Needs Review", stage: "assumptions" },
      { time: "13:40", event: "Manager update revealed", stage: "manager_update" },
      { time: "14:30", event: "Updated model with $800K slippage", stage: "forecast" },
      { time: "16:00", event: "Began writing recommendation", stage: "recommendation" },
      { time: "21:00", event: "Submitted recommendation: Revise", stage: "recommendation" },
    ],
    finalMemo:
      "Recommendation: REVISE — Phased Hire Plan\n\nI recommend revising the hiring plan from 8 FTEs to a phased 4+4 approach.\n\nPhase 1 (Approve now): 2 ops analysts + 1 engineer + 1 marketing manager = $55K/quarter fully loaded\nPhase 2 (Contingent on Q3 close): 3 sales reps + 1 engineer = $41K/quarter\n\nRationale: At $3.4M–$3.8M downside revenue, adding $96K/quarter in HC cost eliminates our EBITDA buffer and brings cash runway to ~4.5 months — below our 6-month minimum. The phased plan reduces immediate burn impact while securing operations and marketing capacity (highest ROI roles).\n\nConditions for Phase 2: Q3 revenue ≥ $3.8M and pipeline re-qualification showing < $400K slippage.",
    missedSignals: [
      {
        signal: "Hiring ramp productivity lag",
        description:
          "3 new sales reps hired Aug 15 will not generate meaningful Q3 revenue. The Q3 revenue benefit of this hire is near-zero.",
      },
      {
        signal: "Non-HC operational burn",
        description:
          "8 new hires require equipment, SaaS seats, and possibly office space — typically 8–12% on top of the HC cost.",
      },
    ],
    interviewQuestions: [
      "You recommended a 4+4 phased approach. How did you decide which 4 roles to approve first?",
      "Walk me through your downside scenario — what numbers did you use and why?",
      "You set $3.8M as your Phase 2 threshold. How did you arrive at that number?",
      "What financial metric would you track weekly after a Revise decision to know if you can accelerate Phase 2?",
    ],
    compare: { percentile: 74, avgScore: 71, topScore: 91, n: 12 },
  },
];

export const DEMO_STATS = {
  activeSimulations: 1,
  invitesSent: 4,
  completedReports: 3,
  advanceRecommendations: 1,
};
