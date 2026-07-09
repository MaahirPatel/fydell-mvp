/**
 * Part B.2 — six Data Room documents, seed-consistent.
 * Part D planted errors + ambiguity are embedded in content.
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
    .map((h) => {
      const label = h.year === ('LTM' as unknown as number) || String(h.year) === 'LTM' ? 'LTM' : String(h.year);
      return `${label}\t$${h.revenue}M\t$${h.ebitda}M\t${h.ebitda_margin}%\t$${h.net_income}M\t$${h.net_debt}M`;
    })
    .join('\n');

  const compsRows = p.comps
    .map((c) => `${c.name}\t${c.year}\t${c.ev_ebitda}x\t${c.note}`)
    .join('\n');

  const mandate = `FROM: Office of the CFO
RE: ${p.target_company} acquisition — Investment Committee review

You are advising the CFO on whether we should proceed with the acquisition of ${p.target_company}, a mid-market consumer goods business. An offer of ${p.deal_value_label} is on the table and the Investment Committee meets at the end of this session.

Review the materials, analyze the financial and strategic case, identify the key risks, and submit a short investment memo. Your deliverable should state a clear recommendation (Proceed / Conditional Proceed / Hold / Pass), your three key reasons, the key risks, the most important assumptions behind your view, and the next diligence steps you would take before signing.

This is a real decision with real money behind it. We care as much about how you reason as about the final call.`;

  return [
    {
      id: 'exec_brief',
      title: 'Executive_Brief.pdf',
      tag: 'Brief',
      kind: 'pdf',
      body: `${mandate}

DEAL CONTEXT
The buyer is under timeline pressure: the seller has a competing process and wants a signed LOI within the week. Strategic rationale cited by Corp Dev: category adjacency, distribution leverage, and a path to mid-teens EBITDA margins. Your job is not to rubber-stamp that story — it is to pressure-test it against the data room before IC.

Working time: 25 minutes. Materials: Financial Model, Market Memo, Retention Cohort, Management Update, Comps & Precedents.`,
    },
    {
      id: 'financial_model',
      title: 'Financial_Model.xlsx',
      tag: 'Model',
      kind: 'xlsx',
      body: `FINANCIAL MODEL — ${p.target_company}
Interactive version is in the Financials tab. Static snapshot:

Metric\t2021\t2022\t2023\t2024\tLTM
${histRows}

Base case materials assume forward growth ${p.forward_growth}% and exit multiple ${p.exit_multiple}x EBITDA.
Use the Financials tab to adjust growth, exit multiple, and discount rate — implied EV recalculates live.`,
      table: { hist: p.hist, forward_growth: p.forward_growth, exit_multiple: p.exit_multiple },
    },
    {
      id: 'market_memo',
      title: 'Market_Memo.pdf',
      tag: 'Market',
      kind: 'pdf',
      body: `MARKET MEMO — Sector context for ${p.target_company}

Sector growth (consumer mid-market / branded goods): approximately ${p.sector_growth_low}–${p.sector_growth_high}% CAGR over the next three years (third-party research pack).

Management's forward growth assumption embedded in the base materials is ${p.forward_growth}%.
That is ${round1(p.forward_growth - p.sector_growth_high)}–${round1(p.forward_growth - p.sector_growth_low)} percentage points above the sector band.

Implication for diligence: if the plan assumes ${p.forward_growth}% while the sector clears closer to ${p.sector_growth_low}–${p.sector_growth_high}%, the growth premium must be earned by share gains, pricing, or mix — not asserted. Live Insights will surface the computed gap; verify it yourself against this memo.`,
    },
    {
      id: 'retention_csv',
      title: 'Retention_Cohort.csv',
      tag: 'Retention',
      kind: 'csv',
      body: `RETENTION COHORT EXTRACT — ${p.target_company}
Source: RevOps / CS export (partial)

customer_rank,arr_share_pct,years_with_us,revenue_trend_3yr,status
1,6.2,7,flat,active
2,5.1,6,declining,watch
3,4.4,8,up,active
4,3.8,5,flat,active
5,3.5,4,declining,at_risk
6,3.1,9,flat,active
7,2.8,6,up,active
8,2.5,3,flat,active
9,2.2,5,flat,active
10,2.0,2,up,active

SUMMARY
Top-10 customer revenue concentration: ${p.top10_concentration}% of total revenue.
Customers in top-10 with declining multi-year revenue: ${p.declining_top10_count} of 10 (ranks #2 and #5).

NOTE: Full mid-market cohort retention detail is "available on request" — not attached in this data room. Do not invent a company-wide retention percentage from incomplete files.

CONTRADICTION CHECK
Compare this extract to Management_Update.pptx claims about top-10 longevity and strength.`,
      table: {
        top10_concentration: p.top10_concentration,
        declining: p.declining_top10_count,
        rows: [
          { rank: 2, trend: 'declining' },
          { rank: 5, trend: 'declining' },
        ],
      },
    },
    {
      id: 'management_update',
      title: 'Management_Update.pptx',
      tag: 'Update',
      kind: 'pptx',
      body: `MANAGEMENT UPDATE — ${p.target_company}
Slide-style extract (seller materials)

SLIDE 1 — Headline
"${p.target_company} enters this process from a position of strength."

SLIDE 2 — Customer franchise (stated with confidence, no caveats)
"Over 90% of our top-10 customers have been with us 5+ years."

SLIDE 3 — Growth
Management reaffirms the ${p.forward_growth}% forward growth case supporting the ${p.deal_value_label} offer.

SLIDE 4 — Ask
Proceed to exclusivity at ${p.deal_value_label}.

FP&A note (internal): Treat slide 2 as advocacy. Cross-check against Retention_Cohort.csv before leaning on retention in your recommendation.`,
    },
    {
      id: 'comps_precedents',
      title: 'Comps_Precedents.pdf',
      tag: 'Comps',
      kind: 'pdf',
      body: `COMPS & PRECEDENTS — EV/EBITDA
Relevant mid-market consumer / branded goods transactions

Name\tYear\tEV/EBITDA\tNote
${compsRows}

Average EV/EBITDA (simple mean): ${p.comps_avg_multiple}x

Base case materials imply an exit / entry framing near ${p.exit_multiple}x.
The comps average (${p.comps_avg_multiple}x) is below that framing — Planted Error 1 if unexamined.

Do not accept ${p.exit_multiple}x without reconciling to this table.`,
      table: { comps: p.comps, avg: p.comps_avg_multiple, exit: p.exit_multiple },
    },
  ];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const PLANTED_ERRORS = [
  {
    id: 'err_exit_multiple_vs_comps',
    title: 'Exit multiple vs. precedent',
    description:
      'Base materials use an exit multiple above the comps average. Detection requires flagging the gap in Risks, memo, or an assumption that haircuts the multiple toward comps.',
  },
  {
    id: 'err_retention_contradiction',
    title: 'Retention contradiction',
    description:
      'Management claims 90%+ of top-10 customers have 5+ year tenure; Retention_Cohort.csv shows 34% concentration with 2 of 10 declining. Detection requires opening the CSV AND flagging the contradiction.',
  },
  {
    id: 'err_synergy_double_count',
    title: 'Synergy double-count',
    description:
      'Cost synergies overlap with a separately stated reduction in change-of-control debt paydown, double-counting the same savings.',
  },
] as const;

export const AMBIGUITY_POINT = {
  id: 'amb_missing_cohort',
  title: 'Missing cohort data',
  description:
    'A Data Room document references cohort retention data available on request with no such file provided. Good: note the gap / request it in diligence steps. Poor: state a specific retention conclusion as fact.',
} as const;

/** Synergy double-count detail embedded for detection / Live Insights */
export function synergyDoubleCountNote(p: MeridianSeedParams): string {
  return `SYNERGY BRIDGE (seller) — review carefully
Line A: G&A cost synergies $42M run-rate by Year 3.
Line B: "Change-of-control debt paydown savings" $28M (presented as separate value creation).
Overlap: $18M of Line B is the same cash interest / fee reduction already counted inside Line A's G&A synergy build. Counting both inflates pro forma EBITDA supporting the ${p.deal_value_label} offer.
Detection: call out the overlap in assumptions or memo, or back the duplicated amount out of your valuation.`;
}
