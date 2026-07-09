/**
 * Part D — per-session randomization. Single seed drives all numbers so the
 * dataset stays internally consistent.
 */

export const TARGET_COMPANIES = [
  'NorthBridge Brands',
  'Calder & Vine',
  'Ashworth Consumer Group',
  'Meridian Home Co',
  'Halcyon Consumer Partners',
] as const;

export type MeridianSeedParams = {
  seed: string;
  target_company: string;
  deal_value_b: number; // billions, 1 decimal
  deal_value_label: string; // e.g. "$2.4B"
  ltm_revenue: number;
  hist: { year: number | 'LTM'; revenue: number; ebitda: number; ebitda_margin: number; net_income: number; net_debt: number }[];
  forward_growth: number; // 14–22
  sector_growth_low: number; // 7–10 band
  sector_growth_high: number;
  exit_multiple: number; // 10.5–12.5
  comps_avg_multiple: number; // 9.0–10.2, always < exit
  comps: { name: string; year: number; ev_ebitda: number; note: string }[];
  top10_concentration: number; // fixed 34
  declining_top10_count: number; // fixed 2
  ebitda_margin_ltm: number;
};

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

/**
 * Build a consistent historical P&L ending at LTM revenue, with a smooth CAGR.
 */
function buildHistory(ltmRev: number, rand: () => number) {
  const cagr = range(rand, 0.08, 0.14, 4); // implied historical growth
  const y2024 = round(ltmRev / (1 + cagr * 0.15), 0); // LTM slightly above FY2024
  const y2023 = round(y2024 / (1 + cagr), 0);
  const y2022 = round(y2023 / (1 + cagr), 0);
  const y2021 = round(y2022 / (1 + cagr), 0);
  const years = [
    { year: 2021, revenue: y2021 },
    { year: 2022, revenue: y2022 },
    { year: 2023, revenue: y2023 },
    { year: 2024, revenue: y2024 },
    { year: 0, revenue: ltmRev, label: 'LTM' as const },
  ];
  const marginBase = range(rand, 0.165, 0.195, 4);
  return years.map((y, i) => {
    const margin = round(marginBase + i * 0.005, 3);
    const ebitda = round(y.revenue * margin, 0);
    const ni = round(ebitda * 0.62, 0);
    const netDebt = round(210 + i * 45 + rand() * 20, 0);
    return {
      year: (y.year === 0 ? 'LTM' : y.year) as number | 'LTM',
      revenue: y.revenue,
      ebitda,
      ebitda_margin: round(margin * 100, 1),
      net_income: ni,
      net_debt: netDebt,
    };
  });
}

const COMP_NAMES = [
  'Pinnacle Goods take-private',
  'Riverstone Brands / PE',
  'Oak & Ember acquisition',
  'Summit Consumer / strategic',
  'Lumen Home Co / sponsor',
];

export function instantiateMeridianSeed(seedInput: string | number): MeridianSeedParams {
  const seed = String(seedInput ?? 'meridian-default');
  const rand = mulberry32(seedToUint32(seed));

  const target_company = TARGET_COMPANIES[Math.floor(rand() * TARGET_COMPANIES.length)];
  const deal_value_b = range(rand, 1.8, 3.1, 1);
  const deal_value_label = `$${deal_value_b.toFixed(1)}B`;

  const ltm_revenue = range(rand, 1050, 1400, 0);
  const hist = buildHistory(ltm_revenue, rand) as MeridianSeedParams['hist'];

  const forward_growth = range(rand, 14, 22, 1);
  const sector_growth_low = range(rand, 7, 9, 1);
  let sector_growth_high = range(rand, sector_growth_low + 0.5, 10, 1);
  if (sector_growth_high >= forward_growth) sector_growth_high = Math.min(10, forward_growth - 1);

  const exit_multiple = range(rand, 10.5, 12.5, 1);
  let comps_avg_multiple = range(rand, 9.0, 10.2, 1);
  if (comps_avg_multiple >= exit_multiple) comps_avg_multiple = round(exit_multiple - 1.2, 1);

  // Spread five comps around the average, all below exit multiple
  const comps = COMP_NAMES.map((name, i) => {
    const jitter = (i - 2) * 0.25 + (rand() - 0.5) * 0.3;
    let m = round(comps_avg_multiple + jitter, 1);
    if (m >= exit_multiple) m = round(exit_multiple - 0.8, 1);
    if (m < 8.5) m = 8.5;
    return {
      name,
      year: 2022 + (i % 3),
      ev_ebitda: m,
      note: i % 2 === 0 ? 'Sponsor take-private' : 'Strategic acquisition',
    };
  });
  const avg =
    Math.round((comps.reduce((s, c) => s + c.ev_ebitda, 0) / comps.length) * 10) / 10;

  const ltm = hist[hist.length - 1];
  return {
    seed,
    target_company,
    deal_value_b,
    deal_value_label,
    ltm_revenue,
    hist,
    forward_growth,
    sector_growth_low,
    sector_growth_high,
    exit_multiple,
    comps_avg_multiple: avg,
    comps,
    top10_concentration: 34,
    declining_top10_count: 2,
    ebitda_margin_ltm: ltm.ebitda_margin,
  };
}

/** Simple multiple-based EV + optional DCF-lite for interactive panel */
export function calculateValuation(input: {
  ltm_ebitda: number;
  exit_multiple: number;
  growth_rate: number; // percent
  discount_rate: number; // percent
  years?: number;
}): { implied_ev: number; dcf_ev: number; range_low: number; range_high: number } {
  const years = input.years ?? 5;
  const g = input.growth_rate / 100;
  const r = input.discount_rate / 100;
  const exitEbitda = input.ltm_ebitda * Math.pow(1 + g, years);
  const implied_ev = round(exitEbitda * input.exit_multiple, 0);

  // DCF-lite: grow EBITDA, apply 70% FCF conversion, discount, + terminal
  let pv = 0;
  let ebitda = input.ltm_ebitda;
  for (let t = 1; t <= years; t++) {
    ebitda = ebitda * (1 + g);
    const fcf = ebitda * 0.7;
    pv += fcf / Math.pow(1 + r, t);
  }
  const terminal = (ebitda * input.exit_multiple) / Math.pow(1 + r, years);
  const dcf_ev = round(pv + terminal, 0);
  const range_low = Math.min(implied_ev, dcf_ev);
  const range_high = Math.max(implied_ev, dcf_ev);
  return { implied_ev, dcf_ev, range_low, range_high };
}
