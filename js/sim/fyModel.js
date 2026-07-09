/**
 * FY financial model: seeded assumptions + live projection.
 * @module js/sim/fyModel
 */

/**
 * Mulberry32 seeded PRNG.
 * @param {number} a
 * @returns {() => number} returns [0, 1)
 */
export function mulberry32(a) {
  let t = a >>> 0;
  return function next() {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {string|number} seed
 * @returns {number}
 */
export function seedToUint32(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return seed >>> 0;
  }
  const s = String(seed ?? 'fydell');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param {number} value
 * @param {number} [decimals]
 * @returns {number}
 */
function roundTo(value, decimals) {
  if (decimals == null) return value;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Apply randomization rules to base assumptions using a seeded PRNG.
 *
 * @param {Object.<string, number|string>} base
 * @param {import('./types.js').RandomizationRule[]|Object} [rules]
 * @param {string|number} [seed]
 * @returns {Object.<string, number|string>}
 */
export function instantiateAssumptions(base, rules, seed) {
  const out = { ...(base || {}) };
  const rand = mulberry32(seedToUint32(seed));

  /** @type {import('./types.js').RandomizationRule[]} */
  let list = [];
  if (Array.isArray(rules)) {
    list = rules;
  } else if (rules && typeof rules === 'object') {
    // Allow map form: { growth: { min, max }, exit_multiple: { min, max } }
    list = Object.keys(rules).map((key) => ({ key, ...rules[key] }));
  }

  for (const rule of list) {
    if (!rule || !rule.key) continue;
    const key = rule.key;
    let value;

    if (rule.distribution === 'choice' && Array.isArray(rule.choices) && rule.choices.length) {
      const idx = Math.floor(rand() * rule.choices.length);
      value = rule.choices[idx];
    } else {
      const min = rule.min != null ? Number(rule.min) : Number(out[key]) || 0;
      const max = rule.max != null ? Number(rule.max) : min;
      value = min + (max - min) * rand();
      value = roundTo(value, rule.decimals != null ? rule.decimals : 1);
    }

    out[key] = value;
  }

  return out;
}

/**
 * Default Meridian-like history when template omits hist.
 */
const DEFAULT_HIST = {
  fy2023: {
    rev: 903.0, gp: 551.0, opex: 416.0, ebitda: 135.0, ni: 81.0,
    ocf: 148.0, capex: 36.0, fcf: 112.0, ret: 94, churn: 6,
  },
  fy2024: {
    rev: 1038.2, gp: 643.7, opex: 436.0, ebitda: 207.6, ni: 124.6,
    ocf: 228.0, capex: 42.0, fcf: 186.0, ret: 93, churn: 7,
  },
};

/**
 * Normalize driver keys from Meridian JSON names and short aliases.
 * @param {Object.<string, number|string>} assumptions
 * @returns {{ g: number, m: number, gm: number, opexg: number, ret: number, mult: number, offer: number, ltmRevenue: number, hist: Object, scenario: string }}
 */
function normalizeDrivers(assumptions) {
  const a = assumptions || {};
  const g = num(a.growth_rate ?? a.g ?? a.revenue_growth ?? a.growth, 15);
  const m = num(a.ebitda_margin ?? a.m ?? a.margin, 20);
  const gm = num(a.gross_margin ?? a.gm, 62);
  const opexg = num(a.opex_growth ?? a.opexg, 10);
  const ret = num(a.net_retention ?? a.ret ?? a.retention, 93);
  const mult = num(a.exit_multiple ?? a.mult ?? a.multiple, 11);
  const offer = num(a.offer_price ?? a.offer ?? a.offer_ev, 2400);
  const ltmRevenue = num(a.revenue_ltm ?? a.ltmRevenue ?? a.ltm_revenue, 1038.2);
  const hist = a.hist && typeof a.hist === 'object'
    ? a.hist
    : {
      fy2023: {
        ...DEFAULT_HIST.fy2023,
        rev: num(a.revenue_fy2023, DEFAULT_HIST.fy2023.rev),
      },
      fy2024: {
        ...DEFAULT_HIST.fy2024,
        rev: num(a.revenue_fy2024, DEFAULT_HIST.fy2024.rev),
      },
    };
  const scenario = String(a.scenario || 'base');
  return { g, m, gm, opexg, ret, mult, offer, ltmRevenue, hist, scenario };
}

/**
 * @param {*} v
 * @param {number} fallback
 * @returns {number}
 */
function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Project FY25E–FY28E from drivers and return model outputs.
 *
 * @param {Object.<string, number|string>} assumptions
 * @returns {Object}
 */
export function calculateModel(assumptions) {
  const d = normalizeDrivers(assumptions);
  const h23 = d.hist.fy2023 || DEFAULT_HIST.fy2023;
  const h24 = d.hist.fy2024 || DEFAULT_HIST.fy2024;

  const g = d.g / 100;
  const m = d.m / 100;
  const gm = d.gm / 100;
  const opexg = d.opexg / 100;
  const ret = d.ret;
  const mult = d.mult;
  const churn = Math.max(0, 100 - ret);

  const yrs = [];
  let rev = h24.rev != null ? h24.rev : d.ltmRevenue;
  let opex = h24.opex != null ? h24.opex : (rev * (1 - gm) - rev * m);
  let prevRev = h23.rev || (rev / 1.15);

  for (let i = 0; i < 4; i++) {
    prevRev = rev;
    rev = rev * (1 + g);
    const gp = rev * gm;
    opex = opex * (1 + opexg);
    const ebitda = rev * m;
    if (Math.abs((rev - gp) - opex) > rev * 0.35) {
      opex = Math.max(rev - gp - ebitda, rev * 0.25);
    }
    const ni = ebitda * 0.60;
    const ocf = ebitda * 1.08;
    const capex = rev * 0.04;
    const fcf = ocf - capex;
    const yoy = ((rev / prevRev) - 1) * 100;
    yrs.push({
      year: 2025 + i,
      rev, yoy, gp, gm: gm * 100, opex, ebitda, em: m * 100,
      ni, ocf, capex, fcf, ret, churn, mult,
    });
  }

  const exitEbitda = yrs[3].ebitda;
  const ev = exitEbitda * mult;
  const fwdRev = yrs[0].rev;

  return {
    drivers: {
      g: d.g, m: d.m, gm: d.gm, opexg: d.opexg, ret, mult, scenario: d.scenario,
    },
    hist: { fy2023: h23, fy2024: h24 },
    yrs,
    rev: fwdRev,
    ebitda: yrs[0].ebitda,
    exitEbitda,
    ev,
    evRev: ev / fwdRev,
    evEbitda: mult,
    churn,
    offer: d.offer,
    gap: ev - d.offer,
  };
}

/**
 * Named scenario packs (base / downside / upside) layered on current assumptions.
 * Supports Meridian `scenario_presets` delta objects when passed as third arg,
 * or reads `assumptions._scenario_presets`.
 *
 * @param {'base'|'downside'|'upside'|string} name
 * @param {Object.<string, number|string>} [assumptions]
 * @param {Object} [presets] Optional { base, downside, upside } delta maps
 * @returns {Object.<string, number|string>}
 */
export function scenarioPack(name, assumptions = {}, presets) {
  const base = { ...assumptions };
  const presetMap = presets || base._scenario_presets || null;
  const delta = presetMap && presetMap[name] ? presetMap[name] : null;

  let overlay;
  if (delta && Object.keys(delta).length) {
    overlay = applyPresetDeltas(base, delta);
  } else {
    const defaults = {
      base: {},
      downside: {
        growth_rate_delta: -7,
        net_retention_delta: -8,
        exit_multiple_delta: -2,
        ebitda_margin_delta: -3,
      },
      upside: {
        growth_rate_delta: 3,
        net_retention_delta: 3,
        exit_multiple_delta: 1,
        ebitda_margin_delta: 2,
      },
    };
    overlay = applyPresetDeltas(base, defaults[name] || {});
  }

  const merged = { ...base, ...overlay, scenario: name || 'base' };
  syncAssumptionAliases(merged);
  return merged;
}

/**
 * @param {Object} base
 * @param {Object} delta
 * @returns {Object}
 */
function applyPresetDeltas(base, delta) {
  const out = {};
  const g = num(base.growth_rate ?? base.g ?? base.revenue_growth, 15);
  const m = num(base.ebitda_margin ?? base.m, 20);
  const ret = num(base.net_retention ?? base.ret, 93);
  const mult = num(base.exit_multiple ?? base.mult, 11);
  const gm = num(base.gross_margin ?? base.gm, 62);
  const opexg = num(base.opex_growth ?? base.opexg, 10);

  if (delta.growth_rate_delta != null) out.growth_rate = g + Number(delta.growth_rate_delta);
  if (delta.net_retention_delta != null) out.net_retention = ret + Number(delta.net_retention_delta);
  if (delta.exit_multiple_delta != null) out.exit_multiple = roundTo(mult + Number(delta.exit_multiple_delta), 1);
  if (delta.ebitda_margin_delta != null) out.ebitda_margin = m + Number(delta.ebitda_margin_delta);
  if (delta.gross_margin_delta != null) out.gross_margin = gm + Number(delta.gross_margin_delta);
  if (delta.opex_growth_delta != null) out.opex_growth = opexg + Number(delta.opex_growth_delta);

  // Absolute overrides if provided
  for (const key of ['growth_rate', 'net_retention', 'exit_multiple', 'ebitda_margin', 'gross_margin', 'opex_growth', 'g', 'm', 'ret', 'mult', 'gm', 'opexg']) {
    if (delta[key] != null && !String(key).endsWith('_delta')) out[key] = delta[key];
  }
  return out;
}

/**
 * @param {Object} merged
 */
function syncAssumptionAliases(merged) {
  if (merged.growth_rate != null) { merged.g = merged.growth_rate; merged.revenue_growth = merged.growth_rate; }
  else if (merged.g != null) { merged.growth_rate = merged.g; merged.revenue_growth = merged.g; }
  if (merged.ebitda_margin != null) merged.m = merged.ebitda_margin;
  else if (merged.m != null) merged.ebitda_margin = merged.m;
  if (merged.net_retention != null) merged.ret = merged.net_retention;
  else if (merged.ret != null) merged.net_retention = merged.ret;
  if (merged.exit_multiple != null) merged.mult = merged.exit_multiple;
  else if (merged.mult != null) merged.exit_multiple = merged.mult;
  if (merged.gross_margin != null) merged.gm = merged.gross_margin;
  else if (merged.gm != null) merged.gross_margin = merged.gm;
  if (merged.opex_growth != null) merged.opexg = merged.opex_growth;
  else if (merged.opexg != null) merged.opex_growth = merged.opexg;
  if (merged.offer_price != null) merged.offer = merged.offer_price;
  else if (merged.offer != null) merged.offer_price = merged.offer;
}
