/**
 * Stakeholder chat: variant picking, replies, no-repeat guard.
 * Compatible with Meridian stakeholder_script (normalized to StakeholderTrigger).
 * @module js/sim/chat
 */

import { detectCommitments } from './commitments.js';
import { logEvent } from './events.js';

/**
 * @param {import('./types.js').CandidateSession} session
 * @param {string} messageText
 * @returns {boolean} true if text is unused (and now reserved)
 */
export function ensureNoRepeat(session, messageText) {
  if (!session) return false;
  if (!Array.isArray(session.usedMessageVariantIds)) session.usedMessageVariantIds = [];

  const text = String(messageText || '').trim();
  if (!text) return false;

  const key = `body:${text}`;
  if (session.usedMessageVariantIds.includes(key)) return false;
  const prior = (session.chatMessages || []).some(
    (m) => String((m && (m.body || m.text)) || '').trim() === text
  );
  if (prior) return false;

  session.usedMessageVariantIds.push(key);
  session._dirty = true;
  return true;
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @param {string|null} variantId
 * @param {string} body
 * @returns {boolean}
 */
function claimVariant(session, variantId, body) {
  if (!session) return false;
  if (!Array.isArray(session.usedMessageVariantIds)) session.usedMessageVariantIds = [];

  if (variantId && session.usedMessageVariantIds.includes(variantId)) return false;
  if (body && session.usedMessageVariantIds.includes(`body:${body}`)) return false;

  if (variantId) session.usedMessageVariantIds.push(variantId);
  if (body) session.usedMessageVariantIds.push(`body:${body}`);
  session._dirty = true;
  return true;
}

/**
 * Pick an unused message variant from a StakeholderTrigger.
 *
 * @param {import('./types.js').StakeholderTrigger|Object} trigger
 * @param {import('./types.js').CandidateSession} session
 * @returns {Object|null}
 */
export function pickStakeholderMessage(trigger, session) {
  if (!trigger) return null;
  const variants = normalizeVariants(trigger);
  if (!variants.length) return null;

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (!v || !v.body) continue;
    const id = v.id || `var_${trigger.id || 't'}_${i}`;
    if (!claimVariant(session, id, v.body)) continue;
    return {
      id,
      body: v.body,
      requiresResponse: !!(v.requiresResponse || trigger.requiresReply || trigger.requires_reply),
      stakeholderId: trigger.stakeholderId || trigger.id,
      name: trigger.name || trigger.stakeholder_name,
      role: trigger.role || trigger.stakeholder_role,
      triggerId: trigger.id,
      isCurveball: !!(trigger.isCurveball || trigger.is_curveball),
    };
  }

  const deepen = deepenFallback(trigger, session);
  if (deepen && ensureNoRepeat(session, deepen)) {
    return {
      id: `deepen_${trigger.id || 't'}_${Date.now().toString(36)}`,
      body: deepen,
      requiresResponse: false,
      stakeholderId: trigger.stakeholderId || trigger.id,
      name: trigger.name || trigger.stakeholder_name,
      role: trigger.role || trigger.stakeholder_role,
      triggerId: trigger.id,
    };
  }
  return null;
}

/**
 * @param {Object} trigger
 * @returns {{ id?: string, body: string, requiresResponse?: boolean }[]}
 */
function normalizeVariants(trigger) {
  const raw = trigger.message_variants || [];
  return raw.map((v, i) => {
    if (typeof v === 'string') {
      return { id: `${trigger.id || 't'}_v${i}`, body: v, requiresResponse: !!trigger.requires_reply };
    }
    return {
      id: v.id || `${trigger.id || 't'}_v${i}`,
      body: v.body || v.text || '',
      requiresResponse: v.requiresResponse,
    };
  }).filter((v) => v.body);
}

/**
 * @param {Object} trigger
 * @param {import('./types.js').CandidateSession} session
 * @returns {string}
 */
function deepenFallback(trigger, session) {
  const tab = (session && session.currentTab) || 'the model';
  const n = ((session && session.usedMessageVariantIds) || []).length;
  const lines = [
    `Thanks — before we lock anything, can you walk me through what you see in ${tab}?`,
    `Got it. One more push: what would change your mind on this call?`,
    `Appreciate the update. Flag the single biggest risk you want the committee to own.`,
    `Understood. Summarize the assumption you are least confident in.`,
  ];
  return lines[n % lines.length];
}

/**
 * @param {import('./types.js').Scenario|null|undefined} scenario
 * @returns {Object[]}
 */
function triggersOf(scenario) {
  if (!scenario) return [];
  if (Array.isArray(scenario.stakeholder_triggers)) return scenario.stakeholder_triggers;
  if (Array.isArray(scenario.stakeholder_script)) return scenario.stakeholder_script;
  return [];
}

/**
 * Match Meridian reply_followups patterns (regex strings) against candidate text.
 * @param {Object} trigger
 * @param {string} candidateMessage
 * @returns {Object[]}
 */
function matchFollowups(trigger, candidateMessage) {
  const text = String(candidateMessage || '').toLowerCase();
  /** @type {Object[]} */
  const hits = [];
  const fu = trigger.reply_followups;

  if (Array.isArray(fu)) {
    for (const item of fu) {
      const pat = item.candidate_reply_pattern || item.pattern;
      if (!pat) continue;
      try {
        if (new RegExp(pat, 'i').test(text)) {
          hits.push({
            id: item.id,
            body: item.follow_up_message || item.body,
            integrity_concern: item.integrity_concern,
            integrity_strong: item.integrity_strong,
          });
        }
      } catch {
        /* bad pattern */
      }
    }
    return hits;
  }

  if (fu && typeof fu === 'object') {
    for (const [key, arr] of Object.entries(fu)) {
      let matched = false;
      try {
        matched = new RegExp(key, 'i').test(text);
      } catch {
        matched = text.includes(String(key).toLowerCase());
      }
      if (!matched) continue;
      for (const item of arr || []) {
        hits.push({
          id: item.id,
          body: item.body || item.follow_up_message,
          integrity_concern: item.integrity_concern,
          integrity_strong: item.integrity_strong,
        });
      }
    }
  }
  return hits;
}

/**
 * Generate a stakeholder reply grounded in session + scenario scripts.
 *
 * @param {string} candidateMessage
 * @param {import('./types.js').CandidateSession} session
 * @param {import('./types.js').Scenario|null} [scenario]
 * @returns {{ id: string, body: string, name: string, role: string, senderType: string, requiresResponse: boolean }}
 */
export function generateStakeholderReply(candidateMessage, session, scenario) {
  const scen = scenario || (session && session.scenario) || null;
  const triggers = triggersOf(scen);
  const primary =
    triggers.find((t) => /manager|cfo|finance/i.test(String(t.role || t.stakeholder_role || t.name || t.stakeholder_name || t.id || ''))) ||
    triggers[0] ||
    null;

  const name = (primary && (primary.name || primary.stakeholder_name)) || 'Jordan Lee';
  const role = (primary && (primary.role || primary.stakeholder_role)) || 'Finance Manager';

  if (session && candidateMessage) {
    detectCommitments(candidateMessage, session);
    if (!Array.isArray(session.chatMessages)) session.chatMessages = [];
    session.chatMessages.push({
      id: `msg_${Date.now().toString(36)}`,
      from: 'candidate',
      senderType: 'candidate',
      body: String(candidateMessage),
      at: new Date().toISOString(),
    });
    logEvent(session, 'stakeholder_message_sent', {
      label: 'Candidate replied in chat',
      detail: String(candidateMessage).slice(0, 120),
      dim: 'communication',
      category: 'chat',
      section: 'chat',
    });
  }

  /** @type {{ id?: string, body: string, integrity_concern?: boolean, integrity_strong?: boolean }[]} */
  let pool = [];

  for (const t of triggers) {
    pool = pool.concat(matchFollowups(t, candidateMessage));
  }

  // Secondary: unused outbound variants ( sparingly )
  if (!pool.length && primary) {
    for (const v of normalizeVariants(primary)) {
      pool.push(v);
    }
  }

  let chosen = null;
  for (const v of pool) {
    if (!v || !v.body) continue;
    if (claimVariant(session, v.id || null, v.body)) {
      chosen = v;
      break;
    }
  }

  let body;
  if (chosen) {
    body = chosen.body;
    if (session) {
      if (chosen.integrity_concern) session.integrityConcern = true;
      if (chosen.integrity_strong) {
        session.integrityStrong = true;
        session.integrityConcern = false;
      }
    }
  } else {
    body = contextualFallback(candidateMessage, session);
    ensureNoRepeat(session, body);
  }

  const reply = {
    id: (chosen && chosen.id) || `reply_${Date.now().toString(36)}`,
    body,
    name,
    role,
    senderType: 'manager',
    requiresResponse: false,
  };

  if (session) {
    if (!Array.isArray(session.chatMessages)) session.chatMessages = [];
    session.chatMessages.push({
      id: reply.id,
      from: 'stakeholder',
      senderType: reply.senderType,
      senderName: reply.name,
      senderRole: reply.role,
      body: reply.body,
      requiresResponse: reply.requiresResponse,
      at: new Date().toISOString(),
    });
    logEvent(session, 'stakeholder_message_received', {
      label: `${reply.name} replied`,
      detail: reply.body.slice(0, 120),
      dim: 'communication',
      category: 'chat',
      section: 'chat',
    });
    session._dirty = true;
  }

  return reply;
}

/**
 * @param {string} candidateMessage
 * @param {import('./types.js').CandidateSession} session
 * @returns {string}
 */
function contextualFallback(candidateMessage, session) {
  const tab = (session && session.currentTab) || 'the work';
  const hasRisks = session && Array.isArray(session.risks) && session.risks.length > 0;
  const hasAssumptions = session && Array.isArray(session.assumptions) && session.assumptions.length > 0;
  const t = String(candidateMessage || '').toLowerCase();

  if (/retention|churn|cohort|top-?10|concentrat/.test(t)) {
    return 'On retention — separate the blended number from the top-10 cohort before you lean on it in the memo.';
  }
  if (/multiple|exit|precedent|valuation/.test(t)) {
    return 'Check the exit multiple against the precedent range in the market memo before you treat plan multiple as base case.';
  }
  if (/downside|stress|bear|worst/.test(t)) {
    return 'Good — run the downside case in the model and tell me which driver moves EV the most.';
  }
  if (/\?|clarif|which|what about|should i/.test(t)) {
    return `Happy to clarify. What specifically are you stuck on in ${tab}?`;
  }
  if (!hasAssumptions) {
    return 'Before we go further, write down the assumption you are relying on most — we need that in the trail.';
  }
  if (!hasRisks) {
    return 'I still do not see a risk logged. What is the failure mode you are most worried about?';
  }
  const snippet = String(candidateMessage || '').trim().slice(0, 40);
  return snippet
    ? `Noted on “${snippet}${String(candidateMessage).trim().length > 40 ? '…' : ''}”. Tie that back to a number in the model or a risk in the register.`
    : `Thanks — keep going in ${tab} and ping me when you have a draft call.`;
}
