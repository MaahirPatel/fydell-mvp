/**
 * Part E — AI assistant with deliberate exit-multiple trap + AIUsageEvent logging.
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

function asksExitMultiple(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return /exit multiple|what multiple|which multiple|multiple should|ev\/ebitda|entry multiple/.test(p);
}

function asksCompsCheck(prompt: string): boolean {
  const p = prompt.toLowerCase();
  return /comp|precedent|peer|versus|vs\.?|against the comps|check.*multiple/.test(p);
}

/**
 * Deliberate trap: if candidate asks what exit multiple to use WITHOUT asking to check comps,
 * return a plausible uncritical answer that does NOT mention the comps gap.
 */
export function askMeridianAI(
  session: ChatSessionSlice & { ai_usage_log?: AIUsageEvent[]; plantedErrorFlags?: Record<string, boolean> },
  params: MeridianSeedParams,
  prompt: string
): AiAskResult {
  recordAiAsk(session);
  const trap = asksExitMultiple(prompt) && !asksCompsCheck(prompt);
  let response: string;

  if (trap) {
    response = `For a mid-market consumer platform with ${params.forward_growth}% forward growth and LTM EBITDA margin around ${params.ebitda_margin_ltm}%, a ${params.exit_multiple}x EBITDA exit framing is commonly used in IC packs and is consistent with how management has positioned the ${params.deal_value_label} offer. You can use ${params.exit_multiple}x as your base case unless you have a specific reason to haircut it.`;
  } else if (asksCompsCheck(prompt) || /comp|precedent/.test(prompt.toLowerCase())) {
    response = `The comps set averages about ${params.comps_avg_multiple}x EV/EBITDA, while the base materials frame closer to ${params.exit_multiple}x. That gap is material — haircut toward the comps mid-point unless you can underwrite a clear premium.`;
  } else if (/retention|customer|concentration/.test(prompt.toLowerCase())) {
    response = `Check Retention_Cohort.csv against the management deck. Concentration and any declining top accounts should be explicit in risks — don't rely on headline longevity claims alone.`;
  } else if (/growth|sector/.test(prompt.toLowerCase())) {
    response = `Plan growth is ${params.forward_growth}% vs sector roughly ${params.sector_growth_low}–${params.sector_growth_high}%. Quantify that gap in your memo if you keep the plan case.`;
  } else {
    response = `Focus on (1) whether ${params.deal_value_label} clears a comps-consistent multiple, (2) customer concentration / retention evidence, and (3) whether synergies are incremental. Cite exhibits; don't invent missing cohort detail.`;
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
  const corpus = [
    session.finalMemo || '',
    ...(session.assumptions || []).map((a) => `${a.title || ''} ${a.text || ''}`),
    ...(session.risks || []).map((r) => `${r.category || ''} ${r.title || ''} ${r.text || ''}`),
  ]
    .join('\n')
    .toLowerCase();

  const caughtComps =
    !!session.plantedErrorFlags?.err_exit_multiple_vs_comps ||
    (/(comp|precedent)/.test(corpus) && /(multiple|haircut|rich|above)/.test(corpus));

  for (const ev of session.ai_usage_log || []) {
    if (ev.trap_triggered) {
      ev.trap_caught = caughtComps;
    }
    const snippet = (ev.ai_response_summary || '').slice(0, 40).toLowerCase();
    if (snippet && corpus.includes(snippet.slice(0, 24))) {
      ev.candidate_action_after = 'accepted_as_is';
    } else if (ev.trap_triggered && caughtComps) {
      ev.candidate_action_after = 'edited';
    } else if (ev.trap_triggered && !caughtComps && corpus.includes(String(params.exit_multiple))) {
      ev.candidate_action_after = 'accepted_as_is';
    } else {
      ev.candidate_action_after = corpus.length > 40 ? 'edited' : 'rejected';
    }
  }
}
