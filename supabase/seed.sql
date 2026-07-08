-- ============================================================================
-- Seed: Project Meridian — Acquisition Analysis
-- Financial Analyst | Finance | 35 min | Intermediate
-- Seeded as a global template (workspace_id = null, status = active) so any
-- workspace can invite candidates against it. Fixed UUID for referenceability.
-- Idempotent: re-running updates the same row.
-- ============================================================================

insert into public.simulations (
  id, workspace_id, title, role, industry, description,
  duration_minutes, difficulty, status, simulation_type,
  scenario_json, resources_json, rubric_json, created_by
) values (
  '00000000-0000-4000-a000-000000000001',
  null,
  'Project Meridian — Acquisition Analysis',
  'Financial Analyst',
  'Finance',
  'Evaluate whether your firm should acquire a target company for $2.4B. Review the data room, build the valuation logic, surface the key risks, and submit a clear recommendation under time pressure.',
  35,
  'Intermediate',
  'active',
  'case_analysis',
  $json$
  {
    "background": "Your firm, Harbor Capital Partners, is evaluating the acquisition of Meridian Logistics, a mid-market freight and warehousing business, for a proposed enterprise value of $2.4B. The deal team needs an independent analyst view before the investment committee meets.",
    "candidate_role": "Financial Analyst on the deal team",
    "business_problem": "Is $2.4B a fair price for Meridian Logistics, and should Harbor proceed, renegotiate, or walk away?",
    "success_definition": "A defensible recommendation grounded in the financials, an explicit valuation view, the two or three risks that most threaten the thesis, and clear communication of assumptions and tradeoffs.",
    "constraints": [
      "35 minutes total",
      "The data room is imperfect — some figures conflict across documents",
      "The investment committee wants a recommendation, not just analysis"
    ],
    "ambiguity_points": [
      "Management's growth case is more optimistic than the industry analysis",
      "A large share of revenue is concentrated in a few customers",
      "Synergy estimates appear partly double-counted in the base case"
    ],
    "phases": ["Briefing", "Document review", "Financial analysis", "Risk assessment", "Final recommendation"],
    "objectives": [
      "Assess the target's financial performance",
      "Evaluate strategic fit",
      "Identify the key risks",
      "Build the valuation logic",
      "Form a recommendation"
    ]
  }
  $json$::jsonb,
  $json$
  [
    {
      "id": "case_info_memo",
      "title": "Case_Info_Memo.pdf",
      "type": "memo",
      "summary": "Deal context, mandate, and the questions the IC wants answered.",
      "content": "Harbor Capital is considering acquiring Meridian Logistics (EV $2.4B). Mandate: assess fair value, strategic fit, and risks. The seller is running a competitive process; an indicative bid is due shortly. The IC specifically wants your view on whether the price is justified and what would have to be true for the deal to work.",
      "relevance": "Frames the mandate and the decision the candidate must make."
    },
    {
      "id": "financial_statements",
      "title": "Financial_Statements.xlsx",
      "type": "spreadsheet",
      "summary": "Three years of P&L, balance sheet, and cash flow for Meridian.",
      "content": "Revenue grew from $1.42B to $1.61B (8% CAGR). EBITDA margin compressed from 19.5% to 17.8% on rising fuel and labor costs. Net debt is $310M. Maintenance capex runs ~4% of revenue. Working capital swings are seasonal. A footnote flags a $340M debt facility with a change-of-control acceleration clause.",
      "relevance": "Primary source for performance, margins, leverage, and the hidden debt trigger."
    },
    {
      "id": "industry_analysis",
      "title": "Industry_Analysis.pdf",
      "type": "document",
      "summary": "Third-party freight & warehousing market outlook.",
      "content": "Sector growth is expected at 3-4% annually with margin pressure from fuel and wage inflation. Comparable transactions closed at 7.5x-9.0x EBITDA. Analysts caution that recent freight volumes have softened versus prior consensus.",
      "relevance": "Independent benchmark to test management's growth and multiple assumptions."
    },
    {
      "id": "management_presentation",
      "title": "Management_Presentation.pptx",
      "type": "presentation",
      "summary": "Meridian leadership's value-creation and synergy story.",
      "content": "Management projects 10% revenue CAGR and 250bps of margin expansion from automation, plus $60M of cost synergies. Footnotes reveal ~$18M of those synergies are already embedded in the base-case forecast. Terminal growth is assumed at 4.8%.",
      "relevance": "Optimistic case; contains the synergy double-count and aggressive terminal growth."
    },
    {
      "id": "market_data",
      "title": "Market_Data.xlsx",
      "type": "market_data",
      "summary": "Trading comps, precedent multiples, and rate environment.",
      "content": "Public freight peers trade at 6.8x-8.2x forward EBITDA. Precedent deals: 7.5x, 8.1x, 8.9x. Cost of debt has risen ~150bps year over year. Top-3 customers represent ~38% of Meridian revenue.",
      "relevance": "Lets the candidate triangulate a valuation range and spot customer concentration risk."
    }
  ]
  $json$::jsonb,
  $json$
  [
    {"dimension": "analytical_accuracy", "description": "Correctly reads and uses the financials (margins, leverage, multiples).", "weight": 18},
    {"dimension": "business_judgment", "description": "Forms a sound, commercially reasonable view of the deal.", "weight": 16},
    {"dimension": "prioritization", "description": "Focuses on what matters most under time pressure.", "weight": 12},
    {"dimension": "communication_clarity", "description": "Communicates the recommendation and reasoning clearly.", "weight": 14},
    {"dimension": "risk_detection", "description": "Surfaces the material risks (concentration, hidden debt, synergy double-count).", "weight": 16},
    {"dimension": "ambiguity_handling", "description": "Handles conflicting/imperfect data and states assumptions.", "weight": 12},
    {"dimension": "recommendation_quality", "description": "Delivers a clear, defensible recommendation with tradeoffs.", "weight": 12}
  ]
  $json$::jsonb,
  null
)
on conflict (id) do update set
  title          = excluded.title,
  role           = excluded.role,
  industry       = excluded.industry,
  description    = excluded.description,
  duration_minutes = excluded.duration_minutes,
  difficulty     = excluded.difficulty,
  status         = excluded.status,
  simulation_type = excluded.simulation_type,
  scenario_json  = excluded.scenario_json,
  resources_json = excluded.resources_json,
  rubric_json    = excluded.rubric_json;
