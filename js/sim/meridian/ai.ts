/**
 * Part E — AI assistant with deliberate revenue-growth trap + AIUsageEvent logging.
 *
 * FP&A version: trap fires when candidate asks about revenue growth forecast
 * WITHOUT asking about churn rate. The AI returns an uncritical endorsement of
 * the 12% growth target without mentioning the churn/pipeline math.
 */

import type { MeridianSeedParams } from './seed.js';
import { recordAiAsk, type ChatSessionSlice } from './chatMachine.js';

export type AIUsageEvent = {
  id: string;
  timestamp: string;
  prompt_text: string;
  ai_response_summary: string;
  candidate_action_after: 'accepted_as_is' | 'edited' | 'rejected' | 'unknown';
  trap_triggered: boolean;
  trap_caught: boolean | null;
};

export type AiAskResult = {
  response: string;
  trap_triggered: boolean;
  event: AIUsageEvent;
};

function asksRevenueGrowth(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return /revenue.*growth|growth.*target|growth.*forecast|q3.*growth|forecast.*growth|growth.*rate|revenue.*plan/.test(p);
}

function asksChurnCheck(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return /churn|retention|net.*retention|gross.*retention|attrition|customer.*health/.test(p);
}

/**
 * Deliberate trap: if candidate asks about the revenue growth forecast WITHOUT
 * asking about churn rate, return a plausible uncritical answer that endorses
 * the plan without flagging the churn/pipeline gap.
 */
export function askMeridianAI(
  session: ChatSessionSlice & { ai_usage_log?: AIUsageEvent[]; plantedErrorFlags?: Record<string, boolean> },
  params: MeridianSeedParams,
  prompt: string
): AiAskResult {
  recordAiAsk(session);
  const trap = asksRevenueGrowth(prompt) && !asksChurnCheck(prompt);
  let response: string;

  if (trap) {
    response = `${params.q3_revenue_growth}% Q3 revenue growth is consistent with the ${params.company} plan and the Q2 momentum visible in the historical data. The hiring investment in Sales and Marketing supports the growth case, and the plan is within the range seen in comparable outdoor/B2B businesses. Use ${params.q3_revenue_growth}% as your base case unless you identify a specific downside driver.`;
  } else if (asksChurnCheck(prompt) || /churn|attrition/.test(prompt.toLowerCase())) {
    response = `Gross churn at ${params.churn_rate}% is above the peer average of ~${params.industry_churn_avg}%. To hit ${params.q3_revenue_growth}% net revenue growth from a ${params.churn_rate}% gross churn base, you need strong expansion revenue and/or new logo pipeline that offsets attrition. The plan should show that math explicitly — if it doesn't, that's a flag.`;
  } else if (/opex|margin|compress|expense/.test(prompt.toLowerCase())) {
    response = `Opex growing at ${params.opex_growth}% versus ${params.q3_revenue_growth}% revenue growth means EBITDA margin compression of roughly ${Math.round((params.opex_growth - params.q3_revenue_growth) / 2)}pp. The plan should reflect that — if the margin line looks flat, the model hasn't accounted for the cost growth. Adjust the gross margin input down to reflect the real squeeze before finalizing.`;
  } else if (/sales.*cycle|cycle|ramp/.test(prompt.toLowerCase())) {
    response = `With a ${params.sales_cycle_days}-day sales cycle and ${params.new_hire_ramp_days}-day ramp, July hires can contribute deals closed by around day ${params.sales_cycle_days + params.new_hire_ramp_days}. If the sales cycle extends at all — say by 30 days — that math shifts meaningfully and Q3 hires might not close anything until Q4.`;
  } else if (/cash|runway|burn/.test(prompt.toLowerCase())) {
    response = `${params.cash_runway_months} months runway at plan spend is tight. If Q3 revenue misses by 3+ pp, runway shortens materially. The two at-risk enterprise renewals add another layer of uncertainty — flag the downside scenario in your recommendation.`;
  } else if (/hire|hiring|headcount/.test(prompt.toLowerCase())) {
    response = `The hiring plan adds 8 net new sales and marketing FTEs in Q3. The key assumption is that ${params.sales_cycle_days}-day cycle + ${params.new_hire_ramp_days}-day ramp allows Q3 revenue contribution. If anything stretches that timeline — like a sales cycle extension — the Q3 revenue case for the new hires evaporates.`;
  } else {
    response = `Focus on three things: (1) whether the ${params.q3_revenue_growth}% growth target is achievable given ${params.churn_rate}% gross churn, (2) whether opex growth at ${params.opex_growth}% is sustainable versus ${params.q3_revenue_growth}% revenue, and (3) whether Q3 hires can realistically contribute Q3 revenue given the sales cycle. Cross-reference the Churn Update and Hiring Plan with the Forecast Model.`;
  }

  const event: AIUsageEvent = {
    id: `ai_${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    prompt_text: prompt,
    ai_response_summary: response.slice(0, 280),
    candidate_action_after: 'unknown',
    trap_triggered: trap,
    trap_caught: null,
  };
  if (!session.ai_usage_log) session.ai_usage_log = [];
  session.ai_usage_log.push(event);
  return { response, trap_triggered: trap, event };
}

/**
 * After final submission, derive candidate_action_after and whether trap was caught.
 * Trap catch = candidate eventually flagged the churn/growth mismatch despite getting
 * the uncritical AI endorsement of the growth rate.
 */
export function finalizeAiUsage(
  session: {
    ai_usage_log?: AIUsageEvent[];
    finalMemo?: string;
    assumptions?: { text?: string; title?: string }[];
    risks?: { text?: string; title?: string; category?: string }[];
    plantedErrorFlags?: Record<string, boolean>;
  },
  params: MeridianSeedParams
): void {
  const corpusText = [
    session.finalMemo || '',
    ...(session.assumptions || []).map((a) => `${a.title || ''} ${a.text || ''}`),
    ...(session.risks || []).map((r) => `${r.category || ''} ${r.title || ''} ${r.text || ''}`),
  ]
    .join('\n')
    .toLowerCase();

  // Trap is "caught" if candidate ultimately flagged churn vs growth
  const caughtChurn =
    !!session.plantedErrorFlags?.err_growth_churn_mismatch ||
    (/churn|attrition|net.*retention/.test(corpusText) && /growth|target|forecast/.test(corpusText));

  for (const ev of session.ai_usage_log || []) {
    if (ev.trap_triggered) {
      ev.trap_caught = caughtChurn;
    }
    const snippet = (ev.ai_response_summary || '').slice(0, 40).toLowerCase();
    if (snippet && corpusText.includes(snippet.slice(0, 24))) {
      ev.candidate_action_after = 'accepted_as_is';
    } else if (ev.trap_triggered && caughtChurn) {
      ev.candidate_action_after = 'edited';
    } else if (ev.trap_triggered && !caughtChurn && corpusText.includes(String(params.q3_revenue_growth))) {
      ev.candidate_action_after = 'accepted_as_is';
    } else {
      ev.candidate_action_after = corpusText.length > 40 ? 'edited' : 'rejected';
    }
  }
}
