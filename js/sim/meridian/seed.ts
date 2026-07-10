/**
 * Part D — per-session randomization for FP&A Forecast Review.
 * Meridian Outdoor, VP Finance deciding Q3 hiring/marketing plan.
 * Single seed drives all numbers so the dataset stays internally consistent.
 */

export const TARGET_COMPANIES = [
  'Meridian Outdoor',
  'Meridian Outdoor Co',
  'Meridian Outdoor Group',
  'Meridian Outdoor Inc',
  'Meridian Outdoor LLC',
] as const;

export type MeridianSeedParams = {
  seed: string;
  company: string;
  quarter: string;

  // ── Editable forecast defaults (the "model knobs") ──────────────────────
  q3_revenue_growth: number;        // ~12%  — Q3 revenue growth target
  gross_margin: number;             // ~63%  — gross margin target
  churn_rate: number;               // ~7%   — gross annual churn rate
  sales_cycle_days: number;         // 45    — avg sales cycle length
  new_hire_ramp_days: number;       // 30    — ramp-to-productivity days
  opex_growth: number;              // ~18%  — operating expense growth
  cash_runway_months: number;       // 9     — months of cash runway
  enterprise_renewal_prob: number;  // ~85%  — enterprise renewal probability

  // ── Q2 actuals (seeded) ──────────────────────────────────────────────────
  q2_revenue: number;               // Q2 quarterly revenue ($M)
  q2_arr: number;                   // ARR at end of Q2 ($M)
  q2_headcount: number;             // headcount
  q2_ebitda_margin: number;         // Q2 EBITDA margin %

  // ── Industry benchmarks ─────────────────────────────────────────────────
  industry_churn_avg: number;       // ~5%  peer average gross churn
  industry_sales_cycle_avg: number; // ~55 days peer average sales cycle

  // ── Post-manager-update values ──────────────────────────────────────────
  updated_sales_cycle_days: number; // sales_cycle_days + 30
  at_risk_customer_count: number;   // 2 at-risk enterprise renewals
  at_risk_arr_pct: number;          // % of ARR concentrated in those accounts

  // ── Quarterly history (5 quarters) ──────────────────────────────────────
  hist: {
    quarter: string;
    revenue: number;
    arr: number;
    ebitda_margin: number;
    headcount: number;
    churn_rate: number;
  }[];

  // ── Compatibility aliases used by session.ts / evaluate.ts ──────────────
  // These map FP&A concepts onto existing field names so session.ts and
  // evaluate.ts require minimal structural change.
  forward_growth: number;         // = q3_revenue_growth
  exit_multiple: number;          // = gross_margin (semantic alias)
  comps_avg_multiple: number;     // = industry_churn_avg (peer benchmark alias)
  deal_value_label: string;       // e.g. "Q3 2025 Plan"
  deal_value_b: number;           // = q2_arr / 1000 (ARR in $B-equivalent)
  ltm_revenue: number;            // = q2_revenue * 4 (annualized proxy)
  top10_concentration: number;    // = at_risk_arr_pct
  declining_top10_count: number;  // = 2 (at-risk enterprise accounts)
  sector_growth_low: number;      // market growth low %
  sector_growth_high: number;     // market growth high %
  ebitda_margin_ltm: number;      // = q2_ebitda_margin
  comps: { name: string; year: number; ev_ebitda: number; note: string }[];
};

// ── PRNG ─────────────────────────────────────────────────────────────────────

function mulberry32(a: number): () => number {
  let t = a >>> 0;
  return function next() {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedToUint32(seed: string | number): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
  const s = String(seed ?? 'meridian');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function range(rand: () => number, min: number, max: number, decimals: number): number {
  return round(min + (max - min) * rand(), decimals);
}

// ── Quarterly history builder ─────────────────────────────────────────────────

function buildHistory(
  q2_revenue: number,
  q2_arr: number,
  q2_headcount: number,
  q2_ebitda_margin: number,
  rand: () => number
): MeridianSeedParams['hist'] {
  const rev_cagr = range(rand, 0.09, 0.14, 4);
  const arr_cagr = range(rand, 0.10, 0.16, 4);
  const quarters = ['Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025'];
  const result = [];
  for (let i = 0; i < 5; i++) {
    const factor = (1 + rev_cagr) ** (i / 4);
    const rev = round(q2_revenue * factor * (0.95 + rand() * 0.1), 2);
    const arr = round(q2_arr * ((1 + arr_cagr) ** (i / 4)), 1);
    const em = round(q2_ebitda_margin - (4 - i) * 0.8 + (rand() - 0.5) * 1.5, 1);
    const hc = Math.round(q2_headcount * ((1 + rev_cagr) ** (i / 4)) * (0.95 + rand() * 0.1));
    const churn = round(6.5 + (rand() - 0.5) * 1.5, 1);
    result.push({ quarter: quarters[i], revenue: rev, arr, ebitda_margin: em, headcount: hc, churn_rate: churn });
  }
  return result;
}

// ── Peer benchmark names ───────────────────────────────────────────────────────

const PEER_NAMES = [
  'Alpine Sports Direct (outdoor peer)',
  'TrailHead Gear Co',
  'Summit Outdoors Group',
  'Base Camp Equipment',
  'Ridge Line Brands',
];

// ── Main seed instantiation ───────────────────────────────────────────────────

export function instantiateMeridianSeed(seedInput: string | number): MeridianSeedParams {
  const seed = String(seedInput ?? 'meridian-default');
  const rand = mulberry32(seedToUint32(seed));

  const companyIndex = Math.floor(rand() * TARGET_COMPANIES.length);
  const company = TARGET_COMPANIES[companyIndex];
  const quarter = 'Q3 2025';

  // ── Forecast model defaults (seeded variation around brief defaults) ──
  const q3_revenue_growth = range(rand, 11.0, 13.0, 1);  // ~12%
  const gross_margin = range(rand, 62.0, 64.0, 1);        // ~63%
  const churn_rate = range(rand, 6.5, 7.5, 1);            // ~7%
  const sales_cycle_days = 45;
  const new_hire_ramp_days = 30;
  const opex_growth = range(rand, 17.0, 19.0, 1);         // ~18%
  const cash_runway_months = 9;
  const enterprise_renewal_prob = range(rand, 83.0, 87.0, 1); // ~85%

  // ── Q2 actuals ──
  const q2_revenue = range(rand, 3.2, 3.8, 2);            // quarterly revenue $M
  const q2_arr = range(rand, 14.0, 20.0, 1);              // ARR $M
  const q2_headcount = Math.round(range(rand, 42, 68, 0));
  const q2_ebitda_margin = range(rand, 10.0, 16.0, 1);

  // ── Industry benchmarks ──
  const industry_churn_avg = range(rand, 4.5, 5.5, 1);
  const industry_sales_cycle_avg = range(rand, 50, 62, 0);

  // ── Post-manager-update ──
  const updated_sales_cycle_days = sales_cycle_days + 30; // 75 days
  const at_risk_customer_count = 2;
  const at_risk_arr_pct = range(rand, 22, 32, 1); // % of ARR in those 2 accounts

  // ── Quarterly history ──
  const hist = buildHistory(q2_revenue, q2_arr, q2_headcount, q2_ebitda_margin, rand);

  // ── Market growth band ──
  const sector_growth_low = range(rand, 7, 9, 1);
  const sector_growth_high = range(rand, 9.5, 12.0, 1);

  // ── Peer benchmarks (comps analog) ──
  const comps = PEER_NAMES.map((name, i) => {
    const jitter = (i - 2) * 0.3 + (rand() - 0.5) * 0.4;
    const nrr = round(108 + jitter * 5, 1); // net revenue retention %
    return {
      name,
      year: 2024 + (i % 2),
      ev_ebitda: nrr, // repurposed: peer NRR
      note: i % 2 === 0 ? 'SaaS/outdoor peer' : 'B2B subscription peer',
    };
  });
  const avg = round(comps.reduce((s, c) => s + c.ev_ebitda, 0) / comps.length, 1);

  return {
    seed,
    company,
    quarter,
    q3_revenue_growth,
    gross_margin,
    churn_rate,
    sales_cycle_days,
    new_hire_ramp_days,
    opex_growth,
    cash_runway_months,
    enterprise_renewal_prob,
    q2_revenue,
    q2_arr,
    q2_headcount,
    q2_ebitda_margin,
    industry_churn_avg,
    industry_sales_cycle_avg,
    updated_sales_cycle_days,
    at_risk_customer_count,
    at_risk_arr_pct,
    hist,
    // ── Compat aliases ──
    forward_growth: q3_revenue_growth,
    exit_multiple: gross_margin,
    comps_avg_multiple: avg,
    deal_value_label: `${quarter} Plan`,
    deal_value_b: round(q2_arr / 1000, 2),
    ltm_revenue: round(q2_revenue * 4, 1),
    top10_concentration: at_risk_arr_pct,
    declining_top10_count: at_risk_customer_count,
    sector_growth_low,
    sector_growth_high,
    ebitda_margin_ltm: q2_ebitda_margin,
    comps,
  };
}

/**
 * Forecast scenario calculator (formerly "valuation" calculator).
 * Repurposed for FP&A: given Q2 baseline and growth/margin/opex assumptions,
 * returns projected Q3 revenue and EBITDA range.
 *
 * Field names kept identical to M&A version for backward-compatibility with
 * session.ts callers — semantics updated to FP&A.
 *
 *   ltm_ebitda    → Q2 quarterly revenue baseline ($M)
 *   exit_multiple → gross margin target % (e.g. 63)
 *   growth_rate   → Q3 revenue growth % vs Q2
 *   discount_rate → opex growth % (the cost pressure factor)
 *
 * Outputs:
 *   implied_ev  → projected Q3 revenue ($M)
 *   dcf_ev      → projected Q3 EBITDA ($M) — reflects opex compression
 *   range_low   → bear-case Q3 revenue (growth - 4pp)
 *   range_high  → bull-case Q3 revenue (growth + 2pp)
 */
export function calculateValuation(input: {
  ltm_ebitda: number;
  exit_multiple: number;
  growth_rate: number;
  discount_rate: number;
  years?: number;
}): { implied_ev: number; dcf_ev: number; range_low: number; range_high: number } {
  const q3_rev = round(input.ltm_ebitda * (1 + input.growth_rate / 100), 2);
  // Margin compression: opex growing faster than revenue squeezes EBITDA margin
  const margin_compression = Math.max(0, (input.discount_rate - input.growth_rate) / 2) / 100;
  const effective_margin = Math.max(0, input.exit_multiple / 100 - margin_compression);
  const q3_ebitda = round(q3_rev * effective_margin, 2);
  const bear = round(input.ltm_ebitda * (1 + (input.growth_rate - 4) / 100), 2);
  const bull = round(input.ltm_ebitda * (1 + (input.growth_rate + 2) / 100), 2);
  return {
    implied_ev: q3_rev,
    dcf_ev: q3_ebitda,
    range_low: Math.min(bear, q3_rev),
    range_high: Math.max(bull, q3_rev),
  };
}
