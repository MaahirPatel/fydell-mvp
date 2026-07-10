/**
 * Part B.2 — Five Data Room documents for FP&A Forecast Review.
 * Meridian Outdoor — VP Finance Q3 hiring/marketing plan review.
 * Three planted concerns + one ambiguity point are embedded in content.
 */

import type { MeridianSeedParams } from './seed.js';

export type MeridianDoc = {
  id: string;
  title: string;
  tag: string;
  kind: 'pdf' | 'xlsx' | 'csv' | 'pptx';
  body: string;
  table?: unknown;
};

export function buildMeridianDocuments(p: MeridianSeedParams): MeridianDoc[] {
  const histRows = p.hist
    .map(
      (h) =>
        `${h.quarter}\t$${h.revenue}M\t${h.arr}M ARR\t${h.ebitda_margin}%\t${h.headcount} FTE\t${h.churn_rate}% churn`
    )
    .join('\n');

  const peerRows = p.comps
    .map((c) => `${c.name}\t${c.year}\t${c.ev_ebitda}% NRR\t${c.note}`)
    .join('\n');

  const briefMandate = `FROM: CFO, ${p.company}
RE: ${p.quarter} Hiring & Marketing Plan — VP Finance review

You are the VP of Finance at ${p.company}. The Q3 plan includes a significant investment in new hires (Sales and Marketing) and an expanded demand-generation spend. Before we present to the board, you need to pressure-test the forecast underlying these investments.

Your job: review the supporting data room materials, stress-test the key assumptions, identify the material risks, and deliver a short VP Memo. Your deliverable should state a clear recommendation (Go / Hold / Revise), your three key reasons, the risks you would flag, the assumptions you changed or questioned, and the verification steps you would take before approving the plan.

This is a real budget decision. We care as much about how you reason as about the final call.`;

  return [
    // ── 1. CFO Brief ─────────────────────────────────────────────────────
    {
      id: 'cfo_brief',
      title: 'CFO_Brief.pdf',
      tag: 'Brief',
      kind: 'pdf',
      body: `${briefMandate}

PLAN CONTEXT
The Q3 plan assumes ${p.q3_revenue_growth}% revenue growth, gross margin of ${p.gross_margin}%, and adds 8 net new hires in Sales and Marketing. Operating expenses are projected to grow ${p.opex_growth}% to support the hiring and demand-generation ramp. Cash runway is ${p.cash_runway_months} months at plan.

Working time: 25 minutes. Materials: Revenue Forecast, Churn Update, Hiring Plan, Customer Concentration Note.`,
    },

    // ── 2. Revenue Forecast ───────────────────────────────────────────────
    {
      id: 'revenue_forecast',
      title: 'Revenue_Forecast.xlsx',
      tag: 'Forecast',
      kind: 'xlsx',
      body: `REVENUE FORECAST — ${p.company} ${p.quarter}

Quarterly trend:
Quarter\tRevenue\tARR\tEBITDA Margin\tHeadcount\tGross Churn
${histRows}

PLAN ASSUMPTIONS (management base case)
• Q3 revenue growth target: ${p.q3_revenue_growth}%
• Gross margin target: ${p.gross_margin}%
• Gross churn rate: ${p.churn_rate}%
• Operating expense growth: ${p.opex_growth}%
• Cash runway at plan spend: ${p.cash_runway_months} months

Note: The Forecast Model tab lets you adjust growth rate, gross margin, and opex growth — outputs recalculate live. Use it to stress-test management's base case against the data room evidence.`,
      table: { hist: p.hist, q3_revenue_growth: p.q3_revenue_growth, gross_margin: p.gross_margin },
    },

    // ── 3. Churn Update ───────────────────────────────────────────────────
    {
      id: 'churn_update',
      title: 'Churn_Update.pdf',
      tag: 'Churn',
      kind: 'pdf',
      body: `CHURN UPDATE — ${p.company} Customer Health Report (Q2 2025)

GROSS CHURN: ${p.churn_rate}% annually (${round1(p.churn_rate / 4)}% quarterly)
Note: Gross churn is measured at the account level. Net revenue retention is not broken out in this extract.

PLAN MATH CHECK (internal FP&A working note)
Management's ${p.q3_revenue_growth}% revenue growth target sits ${round1(p.q3_revenue_growth - p.sector_growth_high)}–${round1(p.q3_revenue_growth - p.sector_growth_low)} pp above outdoor/B2B market growth of ${p.sector_growth_low}–${p.sector_growth_high}%.

With ${p.churn_rate}% gross churn, reaching ${p.q3_revenue_growth}% net revenue growth requires expansion revenue (upsell + cross-sell) and new logos to more than offset attrition. The plan does not explicitly show this pipeline build.

PEER BENCHMARKS
Peer group average gross churn: ~${p.industry_churn_avg}%
Implication: ${p.company} is running ${round1(p.churn_rate - p.industry_churn_avg)} pp above peer-average gross churn while targeting above-market growth.

PLANTED CONCERN 1: Is the ${p.q3_revenue_growth}% growth target achievable given the ${p.churn_rate}% gross churn rate? Do not assert the answer — verify the pipeline.`,
    },

    // ── 4. Hiring Plan ────────────────────────────────────────────────────
    {
      id: 'hiring_plan',
      title: 'Hiring_Plan.xlsx',
      tag: 'Hiring',
      kind: 'xlsx',
      body: `HIRING PLAN — ${p.company} ${p.quarter}

Q3 PROPOSED HEADCOUNT ADDITIONS
Role\tCount\tStart Month\tRamp (days)\tRevenue Contribution
AE (Enterprise)\t3\tJuly\t${p.new_hire_ramp_days}\tQ3 pipeline assumed
AE (Mid-Market)\t2\tJuly\t${p.new_hire_ramp_days}\tQ3 pipeline assumed
SDR\t2\tJuly\t${p.new_hire_ramp_days}\tQ3 pipeline assumed
Marketing Manager\t1\tAugust\t${p.new_hire_ramp_days}\tDemand gen support

PLAN ASSUMPTIONS
• Sales cycle length: ${p.sales_cycle_days} days
• Ramp-to-productivity: ${p.new_hire_ramp_days} days
• Revenue contribution window: Q3 (assumed, based on July start + ${p.new_hire_ramp_days}-day ramp)
• Q3 hiring cost impact: increases opex by ~${round1(p.opex_growth - 12)}pp above revenue growth

MATH CHECK (internal): A ${p.new_hire_ramp_days}-day ramp + ${p.sales_cycle_days}-day cycle = ${p.new_hire_ramp_days + p.sales_cycle_days} days until first closed deal.
July start + ${p.new_hire_ramp_days + p.sales_cycle_days} days = ${dateOffset('July 1 2025', p.new_hire_ramp_days + p.sales_cycle_days)}.

PLANTED CONCERN 3 (only visible after Manager Update): If the sales cycle extends by 30 days, the math becomes ${p.new_hire_ramp_days}-day ramp + ${p.updated_sales_cycle_days}-day cycle = ${p.new_hire_ramp_days + p.updated_sales_cycle_days} days. Q3 hires will not generate Q3 revenue.`,
      table: {
        sales_cycle: p.sales_cycle_days,
        ramp: p.new_hire_ramp_days,
        updated_cycle: p.updated_sales_cycle_days,
      },
    },

    // ── 5. Customer Concentration Note ───────────────────────────────────
    {
      id: 'concentration_note',
      title: 'Customer_Concentration.pdf',
      tag: 'Customers',
      kind: 'pdf',
      body: `CUSTOMER CONCENTRATION NOTE — ${p.company} Enterprise Account Summary

CONCENTRATION SNAPSHOT
Top-2 enterprise accounts: ~${p.at_risk_arr_pct}% of total ARR
Top-10 accounts: estimated 55–65% of total ARR
Peer-average top-10 concentration for comparable B2B firms: 40–50%

${p.company} is more concentrated than peers. Two of its largest accounts are approaching renewal this quarter.

RENEWAL STATUS
Account A (enterprise, multi-year): Contract expires Q3 2025. Renewal decision pending.
Account B (enterprise, strategic): Annual renewal Q3 2025. Procurement review in progress.

NOTE: ARR breakdown by account is NOT included in this document.
The VP Sales team holds the detailed account-level ARR data. Do not estimate specific renewal revenue impact without verifying with account managers.

PEER BENCHMARKS
${peerRows}

AMBIGUITY FLAG: The ${p.at_risk_arr_pct}% concentration figure is visible here, but the ARR amounts for Account A and Account B are not. Any specific dollar impact should be flagged as an estimate pending account manager confirmation.`,
      table: { at_risk_arr_pct: p.at_risk_arr_pct, at_risk_count: p.at_risk_customer_count },
    },
  ];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function dateOffset(startStr: string, days: number): string {
  try {
    const d = new Date(startStr);
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return `~${days} days from July 1`;
  }
}

// ── Planted errors (concerns) ─────────────────────────────────────────────────

export const PLANTED_ERRORS = [
  {
    id: 'err_growth_churn_mismatch',
    title: 'Revenue growth vs. churn rate',
    description:
      `${12}% revenue growth with ${7}% gross churn requires significant net expansion or new logo pipeline not shown in the plan. Detection requires flagging the churn/growth math in risks, memo, or an assumption that questions the growth premise.`,
  },
  {
    id: 'err_opex_margin_compression',
    title: 'Opex growth vs. revenue growth',
    description:
      'Operating expenses growing 18% while revenue grows 12% will compress EBITDA margins by ~3-4pp. The plan treats margins as stable. Detection requires flagging the divergence in risks, memo, or adjusting the model to reflect compression.',
  },
  {
    id: 'err_ramp_sales_cycle_mismatch',
    title: 'Hire ramp vs. extended sales cycle',
    description:
      'After the VP Sales update (+30 days on sales cycle), Q3 new hires cannot contribute Q3 revenue (30-day ramp + 75-day cycle = 105 days). The hiring plan revenue uplift should shift to Q4. Detection requires noting this conflict in risks or assumptions after the manager update fires.',
  },
] as const;

export const AMBIGUITY_POINT = {
  id: 'amb_at_risk_arr',
  title: 'At-risk customer ARR unknown',
  description:
    'Manager update flags two enterprise renewals as at risk but does not provide ARR breakdown. Good: note the data gap and list requesting ARR detail as a verification step. Poor: state a specific revenue impact (e.g., "$2.3M ARR at risk") as fact without verifying with account managers.',
} as const;

/**
 * Cash runway stress note (replaces synergy note). Describes the cash/opex pressure.
 * Exported as synergyDoubleCountNote to keep public API surface unchanged.
 */
export function synergyDoubleCountNote(p: MeridianSeedParams): string {
  const q3_rev_projected = round1(p.q2_revenue * (1 + p.q3_revenue_growth / 100));
  const opex_ratio = round1(p.opex_growth / p.q3_revenue_growth);
  return `CASH RUNWAY & OPEX STRESS — review carefully
Current cash runway: ${p.cash_runway_months} months at plan spend.
Q3 opex growth: ${p.opex_growth}% vs revenue growth ${p.q3_revenue_growth}% (ratio ${opex_ratio}x — expenses growing faster than revenue).
If Q3 revenue misses plan by 3pp (${round1(p.q3_revenue_growth - 3)}% actual), EBITDA loss widens and runway shortens.
At-risk enterprise renewals (~${p.at_risk_arr_pct}% of ARR) could accelerate the runway problem if lost.
Detection: flag the opex/revenue divergence and model a downside scenario before approving the hiring plan.`;
}
