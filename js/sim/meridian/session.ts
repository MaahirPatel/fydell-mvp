/**
 * Project Meridian — full session controller (Parts B–F).
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
  synergy_note: string;
  started_at: number; // epoch ms
  time_limit_sec: number;
  event_log: MeridianEvent[];
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
  const ltm = params.hist[params.hist.length - 1];
  const val = calculateValuation({
    ltm_ebitda: ltm.ebitda,
    exit_multiple: params.exit_multiple,
    growth_rate: params.forward_growth,
    discount_rate: 10,
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
      growth_rate: params.forward_growth,
      exit_multiple: params.exit_multiple,
      discount_rate: 10,
      ...val,
    },
    ai_usage_log: [],
    live_insights: buildLiveInsights(params),
    last_saved_at: null,
    plantedErrorFlags: {},
  } as MeridianSession;

  log(session, 'simulation_started', 'Started Project Meridian', { seed: params.seed });
  return session;
}

function buildLiveInsights(p: MeridianSeedParams) {
  const gapLow = Math.round((p.forward_growth - p.sector_growth_high) * 10) / 10;
  const gapHigh = Math.round((p.forward_growth - p.sector_growth_low) * 10) / 10;
  return [
    {
      id: 'ins_growth',
      title: 'Forward growth vs sector',
      body: `Plan assumes ${p.forward_growth}% vs sector ${p.sector_growth_low}–${p.sector_growth_high}% (gap ${gapLow}–${gapHigh} pp).`,
    },
    {
      id: 'ins_multiple',
      title: 'Exit multiple vs comps',
      body: `Materials frame ${p.exit_multiple}x vs comps average ${p.comps_avg_multiple}x.`,
    },
    {
      id: 'ins_concentration',
      title: 'Customer concentration',
      body: `Top-10 concentration is ${p.top10_concentration}% — check Retention_Cohort.csv before leaning on management longevity claims.`,
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
  log(session, 'brief_viewed', 'Viewed CFO brief');
  bumpTab(session, 'brief', 5);
}

export function openDocument(session: MeridianSession, docId: string): MeridianDoc | null {
  const doc = session.documents.find((d) => d.id === docId) || null;
  if (!doc) return null;
  if (!session.openedDocs.includes(docId)) session.openedDocs.push(docId);
  log(session, 'resource_opened', `Opened ${doc.title}`, { resourceId: docId });
  if (docId === 'retention_csv') session.m1_acknowledged = true;
  bumpTab(session, 'data_room', 15);
  tick(session);
  return doc;
}

export function viewFinancials(session: MeridianSession): void {
  session._financialsViewed = true;
  log(session, 'financials_viewed', 'Viewed Financials tab');
  bumpTab(session, 'financials', 10);
}

export function adjustValuation(
  session: MeridianSession,
  patch: Partial<{ growth_rate: number; exit_multiple: number; discount_rate: number }>
): MeridianSession['valuation'] {
  session._financialsViewed = true;
  session._valuationAdjusted = true;
  const next = { ...session.valuation, ...patch };
  const ltm = session.params.hist[session.params.hist.length - 1];
  const calc = calculateValuation({
    ltm_ebitda: ltm.ebitda,
    exit_multiple: next.exit_multiple,
    growth_rate: next.growth_rate,
    discount_rate: next.discount_rate,
  });
  session.valuation = { ...next, ...calc };
  log(session, 'model_edited', 'Adjusted valuation inputs', { ...session.valuation });
  bumpTab(session, 'financials', 20);
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
  // planted error flags
  if (/multiple|haircut|comp|precedent/i.test(row.text)) {
    session.plantedErrorFlags = session.plantedErrorFlags || {};
    session.plantedErrorFlags.err_exit_multiple_vs_comps = true;
  }
  if (/synergy|double|overlap|paydown/i.test(row.text)) {
    session.plantedErrorFlags = session.plantedErrorFlags || {};
    session.plantedErrorFlags.err_synergy_double_count = true;
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
  const blob = `${category} ${row.text}`.toLowerCase();
  if (/multiple|comp|precedent|valuation|overpay/.test(blob)) {
    session.plantedErrorFlags = session.plantedErrorFlags || {};
    session.plantedErrorFlags.err_exit_multiple_vs_comps = true;
  }
  if (/retention|concentration|contradict|management|90%|declin/.test(blob)) {
    if (session.openedDocs.includes('retention_csv')) {
      session.plantedErrorFlags = session.plantedErrorFlags || {};
      session.plantedErrorFlags.err_retention_contradiction = true;
    }
  }
  if (/synergy|double|overlap|paydown/.test(blob)) {
    session.plantedErrorFlags = session.plantedErrorFlags || {};
    session.plantedErrorFlags.err_synergy_double_count = true;
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
  }
  // timer toast
  const rem = getRemainingSec(session);
  if (rem <= 60 && rem > 0 && !session.toast_5min_shown) {
    // Spec: at 1:00 red + toast "5 minutes left..." — also amber at 5:00
    // Fire the one-time toast when crossing 5:00 as well
  }
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
      log(session, 'stakeholder_message', `Daniel follow-up`, { triggerId: result.followUp.triggerId });
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
  log(session, 'final_submitted', 'Submitted final investment memo');
  finalizeAiUsage(session, session.params);
  tick(session); // P5
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
