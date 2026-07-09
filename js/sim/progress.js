/**
 * Progress scoring and submit gates.
 * Rubric: started 5, brief +10, 2+ resources +15, model +10, assumption +15,
 * risk +15, chat +10, curveball +10, rec +5, memo>=300 +10; cap 95 until submitted=100.
 * @module js/sim/progress
 */

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {boolean}
 */
function hasBrief(session) {
  if (session._briefViewed) return true;
  if (Array.isArray(session.viewedTabs) && session.viewedTabs.includes('brief')) return true;
  return (session.event_log || []).some((e) =>
    e.type === 'brief_viewed' ||
    e.type === 'tab_viewed' && e.payload && e.payload.section === 'brief'
  );
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {number}
 */
function resourceCount(session) {
  const opened = Array.isArray(session.openedResources) ? session.openedResources : [];
  if (opened.length) return new Set(opened.map(String)).size;
  const fromEvents = new Set();
  for (const e of session.event_log || []) {
    if (e.type === 'resource_opened' || e.type === 'document_opened') {
      const id = (e.payload && (e.payload.resourceId || e.payload.id || e.payload.label)) || e.id;
      fromEvents.add(String(id));
    }
  }
  return fromEvents.size;
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {boolean}
 */
function hasModel(session) {
  if (session._modelViewed || session._finSeen || session._modelEdited) return true;
  if (session.fin) return true;
  if (Array.isArray(session.viewedTabs) && (
    session.viewedTabs.includes('model') ||
    session.viewedTabs.includes('analysis') ||
    session.viewedTabs.includes('financials')
  )) return true;
  return (session.event_log || []).some((e) =>
    e.type === 'model_viewed' ||
    e.type === 'financial_model_viewed' ||
    e.type === 'financials_viewed' ||
    e.type === 'scenario_changed' ||
    e.type === 'driver_changed' ||
    (e.type === 'tab_viewed' && e.payload && /model|analysis|financial/i.test(String(e.payload.section || e.payload.tab || '')))
  );
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {boolean}
 */
function hasAssumption(session) {
  if (Array.isArray(session.assumptions) && session.assumptions.length >= 1) return true;
  return (session.event_log || []).some((e) => e.type === 'assumption_added');
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {boolean}
 */
function hasRisk(session) {
  if (Array.isArray(session.risks) && session.risks.length >= 1) return true;
  return (session.event_log || []).some((e) => e.type === 'risk_added');
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {boolean}
 */
function hasChat(session) {
  if (session._requiredChatReplied) return true;
  const msgs = Array.isArray(session.chatMessages) ? session.chatMessages : [];
  if (msgs.some((m) => m && (m.from === 'candidate' || m.role === 'candidate' || m.senderType === 'candidate'))) {
    return true;
  }
  const chat = session.chat || {};
  if (chat.sentCount > 0 || chat.repliedToChat) return true;
  return (session.event_log || []).some((e) =>
    e.type === 'stakeholder_message_sent' ||
    e.type === 'chat_message_sent' ||
    e.type === 'chat_sent' ||
    e.type === 'candidate_message'
  );
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {boolean}
 */
function hasCurveball(session) {
  if (session._curveballSeen || session._curveballViewed || session.mgrFired) return true;
  return (session.event_log || []).some((e) =>
    e.type === 'curveball_fired' ||
    e.type === 'management_update_viewed' ||
    e.type === 'manager_update_viewed' ||
    e.type === 'message_market' ||
    e.type === 'stakeholder_curveball'
  );
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {boolean}
 */
function hasRecommendation(session) {
  if (session.selectedRecommendation) return true;
  return (session.event_log || []).some((e) => e.type === 'recommendation_selected');
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {boolean}
 */
function hasMemo(session) {
  const memo = String(session.finalMemo || '').trim();
  return memo.length >= 300;
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {number} 0–100
 */
export function calculateSimulationProgress(session) {
  if (!session) return 0;
  if (session.status === 'submitted' || session.submittedAt) return 100;

  let p = 5; // started
  if (hasBrief(session)) p += 10;
  if (resourceCount(session) >= 2) p += 15;
  if (hasModel(session)) p += 10;
  if (hasAssumption(session)) p += 15;
  if (hasRisk(session)) p += 15;
  if (hasChat(session)) p += 10;
  if (hasCurveball(session)) p += 10;
  if (hasRecommendation(session)) p += 5;
  if (hasMemo(session)) p += 10;

  return Math.min(95, p);
}

/**
 * Human-readable missing submit requirements.
 * @param {import('./types.js').CandidateSession} session
 * @returns {string[]}
 */
export function getMissingSubmissionRequirements(session) {
  if (!session) {
    return ['Start a simulation session'];
  }
  if (session.status === 'submitted') return [];

  /** @type {string[]} */
  const missing = [];

  if (!hasBrief(session)) {
    missing.push('Review the mandate / brief');
  }
  if (resourceCount(session) < 2) {
    missing.push('Open at least two data-room resources');
  }
  if (!hasModel(session)) {
    missing.push('Open the financial model');
  }
  if (!hasAssumption(session)) {
    missing.push('Record at least one assumption');
  }
  if (!hasRisk(session)) {
    missing.push('Log at least one risk');
  }
  if (!hasChat(session)) {
    missing.push('Reply to a stakeholder in chat');
  }
  if (!hasCurveball(session)) {
    missing.push('Review the management update / curveball');
  }
  if (!hasRecommendation(session)) {
    missing.push('Select a recommendation');
  }
  if (!hasMemo(session)) {
    const len = String(session.finalMemo || '').trim().length;
    missing.push(
      len > 0
        ? `Write a final memo of at least 300 characters (currently ${len})`
        : 'Write a final memo of at least 300 characters'
    );
  }

  return missing;
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @returns {boolean}
 */
export function canSubmit(session) {
  if (!session) return false;
  if (session.status === 'submitted') return false;
  return getMissingSubmissionRequirements(session).length === 0;
}
