/**
 * Scenario template load + seeded instantiation.
 * Works with meridian.scenario.json (authored separately) or any compatible template.
 * @module js/sim/scenario
 */

import { instantiateAssumptions, calculateModel, seedToUint32 } from './fyModel.js';

/**
 * Try to load Meridian JSON. Returns null when the content file is not present.
 * Prefer passing a template into instantiateScenario from the bundler entrypoint.
 *
 * @returns {Promise<Object|null>}
 */
export async function loadMeridianTemplate() {
  // 1) Node 20.10+ / 22+: import attributes
  try {
    const mod = await import('./content/meridian.scenario.json', {
      with: { type: 'json' },
    });
    return (mod && (mod.default || mod)) || null;
  } catch {
    /* continue */
  }

  // 2) Older assert syntax
  try {
    const mod = await import('./content/meridian.scenario.json', {
      assert: { type: 'json' },
    });
    return (mod && (mod.default || mod)) || null;
  } catch {
    /* continue */
  }

  // 3) createRequire (Node CJS JSON load)
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    return require('./content/meridian.scenario.json');
  } catch {
    return null;
  }
}

/**
 * @param {Object|null|undefined} template
 * @returns {Object|null}
 */
export function resolveMeridianTemplate(template) {
  return template && typeof template === 'object' ? template : null;
}

/**
 * @param {number} n
 * @param {string} [style]
 * @returns {string}
 */
function formatPlaceholder(n, style) {
  if (!Number.isFinite(n)) return String(n);
  switch (style) {
    case 'pct':
      return `${Number(n).toFixed(Number.isInteger(n) ? 0 : 1)}%`;
    case 'x':
      return `${Number(n).toFixed(1)}x`;
    case 'usd_m':
      return `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
    case 'usd_b':
      return `$${(Number(n) / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })}B`;
    case 'int':
      return `${Math.round(n)}`;
    case 'raw':
      return String(Number.isInteger(n) ? n : Number(n).toFixed(1));
    default:
      // Meridian docs use bare numbers inside "$…M" / "…%" wrappers in the template.
      return String(Number.isInteger(n) ? n : Number(n).toFixed(1));
  }
}

/**
 * @param {*} v
 * @param {number} fallback
 */
function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {Object} assumptions
 * @param {Object} model
 * @returns {Object.<string, string>}
 */
function buildTokenMap(assumptions, model) {
  const a = assumptions || {};
  const m = model || {};
  const drivers = m.drivers || {};

  const growth = num(a.growth_rate ?? a.revenue_growth ?? a.g ?? drivers.g, 15);
  const margin = num(a.ebitda_margin ?? a.m ?? drivers.m, 20);
  const retention = num(a.net_retention ?? a.ret ?? drivers.ret, 93);
  const multiple = num(a.exit_multiple ?? a.mult ?? drivers.mult, 11);
  const gm = num(a.gross_margin ?? a.gm ?? drivers.gm, 62);
  const opexg = num(a.opex_growth ?? a.opexg ?? drivers.opexg, 10);
  const offer = num(a.offer_price ?? a.offer ?? m.offer, 2400);
  const ltm = num(a.revenue_ltm ?? a.ltmRevenue ?? m.hist?.fy2024?.rev, 1038.2);
  const fy23 = num(a.revenue_fy2023 ?? m.hist?.fy2023?.rev, 903);
  const fy24 = num(a.revenue_fy2024 ?? m.hist?.fy2024?.rev, 1038.2);
  const top10Ret = num(a.top10_retention ?? a.top_10_retention, 88);
  const top10Arr = num(a.top10_arr_pct ?? a.top10_arr_share ?? a.top_10_arr_share, 41);
  const sectorGrowth = num(a.sector_growth, 8.5);
  const precedentLow = num(a.precedent_multiple_low, 8.5);
  const precedentHigh = num(a.precedent_multiple_high, 10);

  /** @type {Object.<string, string>} */
  const tokens = {
    // Meridian.scenario.json tokens
    growth_rate: formatPlaceholder(growth, 'raw'),
    ebitda_margin: formatPlaceholder(margin, 'raw'),
    gross_margin: formatPlaceholder(gm, 'raw'),
    opex_growth: formatPlaceholder(opexg, 'raw'),
    net_retention: formatPlaceholder(retention, 'raw'),
    exit_multiple: formatPlaceholder(multiple, 'raw'),
    offer_price: formatPlaceholder(offer, 'raw'),
    revenue_ltm: formatPlaceholder(ltm, 'raw'),
    revenue_fy2023: formatPlaceholder(fy23, 'raw'),
    revenue_fy2024: formatPlaceholder(fy24, 'raw'),
    top10_retention: formatPlaceholder(top10Ret, 'raw'),
    top10_arr_pct: formatPlaceholder(top10Arr, 'raw'),

    // Friendly aliases
    revenue_growth: formatPlaceholder(growth, 'raw'),
    growth: formatPlaceholder(growth, 'raw'),
    g: formatPlaceholder(growth, 'raw'),
    margin: formatPlaceholder(margin, 'raw'),
    m: formatPlaceholder(margin, 'raw'),
    retention: formatPlaceholder(retention, 'raw'),
    ret: formatPlaceholder(retention, 'raw'),
    multiple: formatPlaceholder(multiple, 'raw'),
    mult: formatPlaceholder(multiple, 'raw'),
    gm: formatPlaceholder(gm, 'raw'),
    offer: formatPlaceholder(offer, 'raw'),
    offer_b: formatPlaceholder(offer, 'usd_b'),
    ev: formatPlaceholder(m.ev, 'raw'),
    gap: formatPlaceholder(m.gap, 'raw'),
    exit_ebitda: formatPlaceholder(m.exitEbitda, 'raw'),
    ltm_revenue: formatPlaceholder(ltm, 'raw'),
    top_10_retention: formatPlaceholder(top10Ret, 'raw'),
    top10_arr_share: formatPlaceholder(top10Arr, 'raw'),
    top_10_arr_share: formatPlaceholder(top10Arr, 'raw'),
    sector_growth: formatPlaceholder(sectorGrowth, 'raw'),
    precedent_multiple_low: formatPlaceholder(precedentLow, 'raw'),
    precedent_multiple_high: formatPlaceholder(precedentHigh, 'raw'),
    precedent_range: `${formatPlaceholder(precedentLow, 'raw')}–${formatPlaceholder(precedentHigh, 'raw')}`,
    variant_seed: String(a._seed ?? ''),
  };

  for (const [k, v] of Object.entries(a)) {
    if (tokens[k] != null) continue;
    if (typeof v === 'number') tokens[k] = formatPlaceholder(v, 'raw');
    else if (typeof v === 'string' || typeof v === 'boolean') tokens[k] = String(v);
  }

  return tokens;
}

/**
 * @param {string} text
 * @param {Object.<string, string>} tokens
 * @returns {string}
 */
function fillPlaceholders(text, tokens) {
  if (text == null) return text;
  return String(text).replace(/\{\{\s*([a-zA-Z0-9_.]+)(?:\|([a-zA-Z0-9_]+))?\s*\}\}/g, (_, key, style) => {
    if (tokens[key] == null) return `{{${key}}}`;
    if (!style) return tokens[key];
    const raw = Number(String(tokens[key]).replace(/[^0-9.\-]/g, ''));
    if (Number.isFinite(raw)) return formatPlaceholder(raw, style);
    return tokens[key];
  });
}

/**
 * @param {*} value
 * @returns {*}
 */
function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

/**
 * @param {*} node
 * @param {Object.<string, string>} tokens
 * @returns {*}
 */
function fillNode(node, tokens) {
  if (typeof node === 'string') return fillPlaceholders(node, tokens);
  if (Array.isArray(node)) return node.map((n) => fillNode(n, tokens));
  if (node && typeof node === 'object') {
    /** @type {Object} */
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = fillNode(v, tokens);
    }
    return out;
  }
  return node;
}

/**
 * Normalize Meridian stakeholder_script entries into StakeholderTrigger shape.
 * @param {Object} raw
 * @returns {import('./types.js').StakeholderTrigger}
 */
function normalizeStakeholderTrigger(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const variants = Array.isArray(raw.message_variants)
    ? raw.message_variants.map((v, i) => {
      if (typeof v === 'string') {
        return {
          id: `${raw.id || 'trig'}_v${i}`,
          body: v,
          requiresResponse: !!raw.requires_reply,
        };
      }
      return {
        id: v.id || `${raw.id || 'trig'}_v${i}`,
        body: v.body || v.text || '',
        requiresResponse: v.requiresResponse != null ? !!v.requiresResponse : !!raw.requires_reply,
      };
    })
    : [];

  /** @type {Object.<string, Object[]>} */
  const reply_followups = {};
  if (Array.isArray(raw.reply_followups)) {
    raw.reply_followups.forEach((fu, i) => {
      const key = fu.candidate_reply_pattern || fu.key || `fu_${i}`;
      if (!reply_followups[key]) reply_followups[key] = [];
      reply_followups[key].push({
        id: `${raw.id || 'trig'}_fu${i}`,
        body: fu.follow_up_message || fu.body || '',
        requiresResponse: false,
        integrity_concern: !!fu.integrity_concern,
        integrity_strong: !!fu.integrity_strong,
        pattern: fu.candidate_reply_pattern || null,
      });
    });
  } else if (raw.reply_followups && typeof raw.reply_followups === 'object') {
    Object.assign(reply_followups, raw.reply_followups);
  }

  return {
    id: raw.id,
    stakeholderId: raw.stakeholderId || raw.id,
    name: raw.stakeholder_name || raw.name || 'Colleague',
    role: raw.stakeholder_role || raw.role || '',
    when: raw.trigger_condition || raw.when || null,
    message_variants: variants,
    reply_followups,
    integrityPressure: !!(raw.integrity_pressure || raw.integrityPressure),
    isCurveball: !!(raw.is_curveball || raw.isCurveball),
    requiresReply: !!raw.requires_reply,
    relatedSignal: raw.related_signal || null,
    raw,
  };
}

/**
 * Instantiate a scenario template with a seed.
 *
 * @param {Object} template
 * @param {string|number} [seed]
 * @returns {import('./types.js').Scenario}
 */
export function instantiateScenario(template, seed) {
  if (!template || typeof template !== 'object') {
    throw new Error('instantiateScenario: template object is required');
  }

  const resolvedSeed = seed != null && seed !== '' ? seed : seedToUint32(Date.now());
  const scenario = clone(template);

  const fm = scenario.financial_model || scenario.financialModel || {};
  const base = fm.base_assumptions || fm.baseAssumptions || fm.drivers || {};
  const rules = fm.randomization_rules || fm.randomizationRules || [];

  const assumptions = instantiateAssumptions(base, rules, resolvedSeed);
  assumptions._seed = resolvedSeed;
  if (fm.hist) assumptions.hist = clone(fm.hist);
  if (fm.offer != null) assumptions.offer = fm.offer;
  if (fm.offer_price != null || assumptions.offer_price != null) {
    assumptions.offer = assumptions.offer_price ?? fm.offer_price;
    assumptions.offer_price = assumptions.offer;
  }
  if (fm.ltmRevenue != null) assumptions.ltmRevenue = fm.ltmRevenue;
  if (fm.scenario_presets) assumptions._scenario_presets = clone(fm.scenario_presets);

  const model = calculateModel(assumptions);
  const tokens = buildTokenMap(assumptions, model);

  if (scenario.mandate) scenario.mandate = fillPlaceholders(scenario.mandate, tokens);
  if (scenario.mandate_text) {
    scenario.mandate_text = fillPlaceholders(scenario.mandate_text, tokens);
    scenario.mandate = scenario.mandate || scenario.mandate_text;
  }

  if (Array.isArray(scenario.documents)) {
    scenario.documents = scenario.documents.map((doc) => fillNode(doc, tokens));
  }
  if (Array.isArray(scenario.docs)) {
    scenario.docs = scenario.docs.map((doc) => fillNode(doc, tokens));
  }

  // Normalize Meridian stakeholder_script → stakeholder_triggers
  const rawTriggers = scenario.stakeholder_triggers || scenario.stakeholder_script || [];
  if (Array.isArray(rawTriggers)) {
    scenario.stakeholder_triggers = rawTriggers
      .map(normalizeStakeholderTrigger)
      .map((t) => fillNode(t, tokens));
  }

  if (Array.isArray(scenario.planted_errors)) {
    scenario.planted_errors = fillNode(scenario.planted_errors, tokens);
  }
  if (Array.isArray(scenario.ambiguity_points)) {
    scenario.ambiguity_points = fillNode(scenario.ambiguity_points, tokens);
  }

  scenario.financial_model = {
    ...fm,
    base_assumptions: assumptions,
    assumptions,            // alias so callers can use either field
    randomization_rules: rules,
    instantiated: true,
    seed: resolvedSeed,
    computed: model,
  };

  scenario.variantSeed = resolvedSeed;
  scenario.id = scenario.id || 'meridian';
  scenario.title = scenario.title || 'Project Meridian';
  scenario.role = scenario.role || scenario.role_context || 'Finance Analyst';
  scenario.durationMin = scenario.durationMin || scenario.time_limit_minutes || 35;
  scenario.type = scenario.type || 'financial_analysis';
  scenario.meta = {
    ...(scenario.meta || {}),
    instantiatedAt: new Date().toISOString(),
    seed: resolvedSeed,
  };

  return scenario;
}
