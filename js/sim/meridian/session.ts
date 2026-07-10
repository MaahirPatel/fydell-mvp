/**
 * Project Meridian — full session controller (FP&A Forecast Review).
 * VP Finance reviewing Q3 hiring/marketing plan for Meridian Outdoor.
 */

import { instantiateMeridianSeed, calculateValuation, type MeridianSeedParams } from './seed.js';
import {
  buildMeridianDocuments,
  synergyDoubleCountNote,
  type MeridianDoc,
} from './documents.js';
import {
  tickChatTriggers,
  handleCandidateChatReply,
  hasRepliedToD1AndSubstantive,
  type ChatMessage,
  type ChatSessionSlice,
} from './chatMachine.js';
import { askMeridianAI, finalizeAiUsage, type AIUsageEvent } from './ai.js';
import {
  canSubmitMeridian,
  getMeridianMissingRequirements,
  calculateMeridianProgress,
  getStageCompletion,
  type MeridianSessionState,
  type MissingItem,
} from './gates.js';
import { evaluateMeridianSession, formatMeridianReport, type EvaluationResult } from './evaluate.js';

export type MeridianEvent = {
  id: string;
  type: string;
  t: number;
  label: string;
  payload?: unknown;
  at: string;
};

export type MeridianSession = MeridianSessionState & {
  id: string;
  seed: string;
  params: MeridianSeedParams;
  documents: MeridianDoc[];
  synergy_note: string; // cash runway / opex stress note
  started_at: number;   // epoch ms
  time_limit_sec: number;
  event_log: MeridianEvent[];
  /**
   * Forecast model state (formerly "valuation panel").
   *
   * Field names kept unchanged for API compat — semantics updated to FP&A:
   *   growth_rate   → Q3 revenue growth % target
   *   exit_multiple → gross margin % target (63 = 63%)
   *   discount_rate → opex growth % (cost pressure)
   *   implied_ev    → projected Q3 revenue ($M)
   *   dcf_ev        → projected Q3 EBITDA ($M, after opex compression)
   *   range_low     → bear-case Q3 revenue
   *   range_high    → bull-case Q3 revenue
   */
  valuation: {
    growth_rate: number;
    exit_multiple: number;
    discount_rate: number;
    implied_ev: number;
    dcf_ev: number;
    range_low: number;
    range_high: number;
  };
  ai_usage_log: AIUsageEvent[];
  live_insights: { id: string; title: string; body: string }[];
  last_saved_at: number | null;
  toast_5min_shown?: boolean;
  plantedErrorFlags?: Record<string, boolean>;
  selectedRecommendation?: string | null;
  m1_acknowledged?: boolean;
};

function eid(): string {
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createMeridianSession(opts: {
  seed?: string;
  inviteToken?: string;
  candidateName?: string;
  candidateEmail?: string;
}): MeridianSession {
  const seed = opts.seed || opts.inviteToken || `meridian_${Date.now().toString(36)}`;
  const params = instantiateMeridianSeed(seed);
  const documents = buildMeridianDocuments(params);

  // Use Q2 revenue as baseline for the forecast model calc
  const val = calculateValuation({
    ltm_ebitda: params.q2_revenue,
    exit_multiple: params.gross_margin,
    growth_rate: params.q3_revenue_growth,
    discount_rate: params.opex_growth,
  });

  const session: MeridianSession = {
    id: `ms_${Date.now().toString(36)}`,
    seed: params.seed,
    params,
    documents,
    synergy_note: synergyDoubleCountNote(params),
    started_at: Date.now(),
    time_limit_sec: 25 * 60,
    event_log: [],
    openedDocs: [],
    assumptions: [],
    risks: [],
    recommendation: {},
    chatMessages: [],
    used_trigger_ids: [],
    d1_fired: false,
    d1_reply_text: null,
    d1_branch: null,
    tabSeconds: {},
    assumptionTexts: [],
    aiAskCountWindow: { t: 0, count: 0 },
    _elapsedSec: 0,
    valuation: {
      growth_rate: params.q3_revenue_growth,
      exit_multiple: params.gross_margin,
      discount_rate: params.opex_growth,
      ...val,
    },
    ai_usage_log: [],
    live_insights: buildLiveInsights(params),
    last_saved_at: null,
    plantedErrorFlags: {},
  } as MeridianSession;

  log(session, 'simulation_started', 'Started Project Meridian — FP&A Forecast Review', { seed: params.seed });
  return session;
}

function buildLiveInsights(p: MeridianSeedParams) {
  const churnGap = Math.round((p.churn_rate - p.industry_churn_avg) * 10) / 10;
  const opexGap = Math.round((p.opex_growth - p.q3_revenue_growth) * 10) / 10;
  const rampCycleDays = p.new_hire_ramp_days + p.sales_cycle_days;
  return [
    {
      id: 'ins_churn',
      title: 'Churn rate vs. industry avg',
      body: `Plan churn ${p.churn_rate}% vs. peer avg ${p.industry_churn_avg}% (${churnGap > 0 ? '+' : ''}${churnGap} pp above peers). At ${p.churn_rate}% gross churn, the ${p.q3_revenue_growth}% growth target requires strong net expansion.`,
    },
    {
      id: 'ins_opex',
      title: 'Opex growth vs. revenue growth',
      body: `Opex growing ${p.opex_growth}% vs. revenue ${p.q3_revenue_growth}% — a ${opexGap > 0 ? '+' : ''}${opexGap} pp divergence. EBITDA margin will compress unless revenue outperforms plan.`,
    },
    {
      id: 'ins_ramp',
      title: 'Hire ramp + sales cycle math',
      body: `${p.new_hire_ramp_days}-day ramp + ${p.sales_cycle_days}-day cycle = ${rampCycleDays} days to first deal. If cycle extends 30 days (${p.updated_sales_cycle_days} days total), Q3 hires don't contribute Q3 revenue.`,
    },
  ];
}

export function log(
  session: MeridianSession,
  type: string,
  label: string,
  payload?: unknown
): MeridianEvent {
  const ev: MeridianEvent = {
    id: eid(),
    type,
    t: getElapsedSec(session),
    label,
    payload,
    at: new Date().toISOString(),
  };
  session.event_log.push(ev);
  session.last_saved_at = Date.now();
  return ev;
}

export function getElapsedSec(session: MeridianSession): number {
  return Math.max(0, Math.floor((Date.now() - session.started_at) / 1000));
}

export function getRemainingSec(session: MeridianSession): number {
  return Math.max(0, session.time_limit_sec - getElapsedSec(session));
}

export function syncElapsed(session: MeridianSession): number {
  session._elapsedSec = getElapsedSec(session);
  return session._elapsedSec;
}

export function viewBrief(session: MeridianSession): void {
  session._briefViewed = true;
  log(session, 'brief_viewed', 'Viewed CFO Brief');
  bumpTab(session, 'brief', 5);
}

export function openDocument(session: MeridianSession, docId: string): MeridianDoc | null {
  const doc = session.documents.find((d) => d.id === docId) || null;
  if (!doc) return null;
  if (!session.openedDocs.includes(docId)) session.openedDocs.push(docId);
  log(session, 'resource_opened', `Opened ${doc.title}`, { resourceId: docId });
  // Acknowledge manager update if candidate opens the concentration note
  if (docId === 'concentration_note') session.m1_acknowledged = true;
  bumpTab(session, 'data_room', 15);
  tick(session);
  return doc;
}

export function viewFinancials(session: MeridianSession): void {
  session._financialsViewed = true;
  log(session, 'financials_viewed', 'Viewed Forecast Model tab');
  bumpTab(session, 'financials', 10);
}

/**
 * Adjust forecast model inputs. Field names kept identical to M&A version for API compat.
 * In FP&A context:
 *   growth_rate   = Q3 revenue growth % to use in the model
 *   exit_multiple = gross margin % target (e.g. 63 for 63%)
 *   discount_rate = opex growth % scenario
 */
export function adjustValuation(
  session: MeridianSession,
  patch: Partial<{ growth_rate: number; exit_multiple: number; discount_rate: number }>
): MeridianSession['valuation'] {
  session._financialsViewed = true;
  session._valuationAdjusted = true;
  const next = { ...session.valuation, ...patch };
  const calc = calculateValuation({
    ltm_ebitda: session.params.q2_revenue,
    exit_multiple: next.exit_multiple,
    growth_rate: next.growth_rate,
    discount_rate: next.discount_rate,
  });
  session.valuation = { ...next, ...calc };
  log(session, 'model_edited', 'Adjusted forecast model inputs', { ...session.valuation });
  bumpTab(session, 'financials', 20);

  // Planted error flag: if candidate lowers gross margin target, they spotted compression
  if (
    session.params &&
    next.exit_multiple <= session.params.gross_margin - 2
  ) {
    session.plantedErrorFlags = session.plantedErrorFlags || {};
    session.plantedErrorFlags.err_opex_margin_compression = true;
  }
  return session.valuation;
}

export function addAssumption(
  session: MeridianSession,
  text: string,
  affects?: string
): void {
  const row = {
    id: eid(),
    text: String(text || '').trim(),
    affects: affects || 'model',
    at: new Date().toISOString(),
  };
  if (!row.text) return;
  session.assumptions.push(row);
  session.assumptionTexts = session.assumptions.map((a) => a.text);
  log(session, 'assumption_added', `Assumption: ${row.text.slice(0, 80)}`, row);

  // Planted error detection via keyword patterns
  session.plantedErrorFlags = session.plantedErrorFlags || {};
  if (/churn|net.*retention|gross.*retention|attrition|growth.*gap|growth.*require/i.test(row.text)) {
    session.plantedErrorFlags.err_growth_churn_mismatch = true;
  }
  if (/opex|margin.*compres|operating.*expense.*revenue|expense.*grow.*faster|18.*12|faster.*revenue/i.test(row.text)) {
    session.plantedErrorFlags.err_opex_margin_compression = true;
  }
  if (/ramp|sales.*cycle.*extend|cycle.*extend|75.*day|q4.*revenue.*hire|hire.*q4|hire.*contribut/i.test(row.text)) {
    session.plantedErrorFlags.err_ramp_sales_cycle_mismatch = true;
    session.m1_acknowledged = true;
  }

  tick(session);
}

export function addRisk(
  session: MeridianSession,
  category: string,
  text: string
): void {
  const row = {
    id: eid(),
    category,
    text: String(text || '').trim(),
    at: new Date().toISOString(),
  };
  if (!row.text) return;
  session.risks.push(row);
  log(session, 'risk_added', `Risk: ${category}`, row);

  // Planted error detection
  const blob = `${category} ${row.text}`.toLowerCase();
  session.plantedErrorFlags = session.plantedErrorFlags || {};
  if (/churn|net.*retention|gross.*retention|attrition|growth.*gap|growth.*require/.test(blob)) {
    session.plantedErrorFlags.err_growth_churn_mismatch = true;
  }
  if (/opex|margin.*compres|operating.*expense|expense.*faster|revenue.*faster|compress/.test(blob)) {
    session.plantedErrorFlags.err_opex_margin_compression = true;
  }
  if (/ramp|sales.*cycle.*extend|cycle.*extend|75.*day|q4.*hire|hire.*q4|hire.*contribut|no.*q3.*revenue/.test(blob)) {
    session.plantedErrorFlags.err_ramp_sales_cycle_mismatch = true;
    session.m1_acknowledged = true;
  }

  bumpTab(session, 'risks', 15);
  tick(session);
}

export function setRecommendation(
  session: MeridianSession,
  rec: NonNullable<MeridianSessionState['recommendation']>
): void {
  session.recommendation = { ...(session.recommendation || {}), ...rec };
  if (rec.category) {
    session.selectedRecommendation = rec.category;
    session.recommendation_category = rec.category;
    log(session, 'recommendation_selected', `Selected ${rec.category}`);
  }
  const memo = [
    rec.category,
    rec.reason1,
    rec.reason2,
    rec.reason3,
    rec.diligence,
  ]
    .filter(Boolean)
    .join('\n\n');
  session.finalMemo = memo;
  bumpTab(session, 'recommend', 10);
}

function bumpTab(session: MeridianSession, tab: string, sec: number): void {
  session.tabSeconds = session.tabSeconds || {};
  session.tabSeconds[tab] = (session.tabSeconds[tab] || 0) + sec;
}

export function tick(session: MeridianSession): ChatMessage[] {
  syncElapsed(session);
  const msgs = tickChatTriggers(session);
  for (const m of msgs) {
    log(session, 'stakeholder_message', `${m.name}: ${m.body.slice(0, 60)}`, {
      triggerId: m.triggerId,
      sender: m.sender,
    });
    // Track M1 (Jordan's manager update) firing
    if (m.triggerId === 'J1') {
      session.m1_fired = true;
      log(session, 'manager_update', 'VP Sales update: sales cycle +30 days, 2 at-risk renewals');
    }
  }
  const rem = getRemainingSec(session);
  if (rem <= 5 * 60 && !session.toast_5min_shown) {
    session.toast_5min_shown = true;
    log(session, 'timer_warning', '5 minutes left — make sure your recommendation is ready to submit.');
  }
  session.last_saved_at = Date.now();
  return msgs;
}

export function replyToChat(session: MeridianSession, text: string) {
  syncElapsed(session);
  const result = handleCandidateChatReply(session, text);
  if (result.accepted) {
    log(session, 'chat_message_sent', 'Candidate chat reply', { text });
    if (result.followUp) {
      log(session, 'stakeholder_message', `Alex Kim follow-up`, { triggerId: result.followUp.triggerId });
    }
  }
  return result;
}

export function askAI(session: MeridianSession, prompt: string) {
  syncElapsed(session);
  const result = askMeridianAI(session, session.params, prompt);
  log(session, 'ai_assistant_asked', 'Asked AI assistant', {
    prompt,
    trap: result.trap_triggered,
  });
  tick(session);
  return result;
}

export function getMissing(session: MeridianSession): MissingItem[] {
  return getMeridianMissingRequirements(session);
}

export function canSubmit(session: MeridianSession): boolean {
  return canSubmitMeridian(session) && hasRepliedToD1AndSubstantive(session);
}

export function submitMeridian(session: MeridianSession): EvaluationResult {
  if (!canSubmit(session)) {
    throw new Error(
      'Submit blocked: ' +
        getMissing(session)
          .filter((m) => m.blocking)
          .map((m) => m.label)
          .join('; ')
    );
  }
  session.submitted = true;
  log(session, 'final_submitted', 'Submitted VP Memo — FP&A Forecast Review');
  finalizeAiUsage(session, session.params);
  tick(session); // C5
  const evaluation = evaluateMeridianSession({
    id: session.id,
    seed: session.seed,
    params: session.params,
    openedDocs: session.openedDocs,
    assumptions: session.assumptions,
    risks: session.risks,
    recommendation: session.recommendation,
    finalMemo: session.finalMemo,
    valuation: session.valuation,
    event_log: session.event_log,
    chatMessages: session.chatMessages,
    ai_usage_log: session.ai_usage_log,
    d1_reply_text: session.d1_reply_text,
    d1_branch: session.d1_branch,
    tabSeconds: session.tabSeconds,
    _elapsedSec: session._elapsedSec,
    plantedErrorFlags: session.plantedErrorFlags,
    used_trigger_ids: session.used_trigger_ids,
    m1_fired: session.m1_fired,
  });
  session.last_saved_at = Date.now();
  return evaluation;
}

export {
  calculateMeridianProgress,
  getStageCompletion,
  formatMeridianReport,
  hasRepliedToD1AndSubstantive,
  evaluateMeridianSession,
};
