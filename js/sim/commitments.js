/**
 * Chat commitment detection and follow-through evaluation.
 * @module js/sim/commitments
 */

/**
 * @typedef {import('./types.js').Commitment} Commitment
 */

const COMMITMENT_PATTERNS = [
  {
    type: 'downside_case',
    evidenceRequired: 'Switch to or run the downside case in the financial model',
    re: /run downside|downside case|stress (the )?case|run a downside|build (a |the )?downside/,
  },
  {
    type: 'retention_review',
    evidenceRequired: 'Open retention / churn resources or cite retention in an assumption or risk',
    re: /review retention|look at retention|look into retention|check (the )?retention|churn|retention data/,
  },
  {
    type: 'risk_update',
    evidenceRequired: 'Add or update a risk in the risk register',
    re: /update the risk|add a risk|add (the )?risk|log (a |the )?risk|flag (a |the )?risk/,
  },
  {
    type: 'recommendation_revision',
    evidenceRequired: 'Change or revise the selected recommendation',
    re: /revise (the )?recommendation|update (the )?recommendation|change (my |the )?recommendation|revisit (my |the )?call/,
  },
  {
    type: 'customer_concentration',
    evidenceRequired: 'Review concentration / top-10 retention evidence or log a related risk',
    re: /customer concentration|top-?10|concentration risk/,
  },
];

/**
 * @returns {string}
 */
function makeCommitmentId() {
  return `cmt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Extract a short phrase around the first regex match.
 * @param {string} message
 * @param {RegExp} re
 * @returns {string}
 */
function extractPhrase(message, re) {
  const m = String(message || '').match(re);
  if (!m) return String(message || '').trim().slice(0, 80);
  const idx = Math.max(0, (m.index || 0) - 12);
  return String(message).slice(idx, idx + 96).trim();
}

/**
 * Detect new commitments in a candidate chat message and append to session.commitments.
 *
 * @param {string} message
 * @param {import('./types.js').CandidateSession} session
 * @returns {Commitment[]} Newly created commitments (may be empty)
 */
export function detectCommitments(message, session) {
  if (!session) return [];
  if (!Array.isArray(session.commitments)) session.commitments = [];

  const text = String(message || '');
  const lower = text.toLowerCase();
  if (!lower.trim()) return [];

  /** @type {Commitment[]} */
  const created = [];
  const now = new Date().toISOString();

  for (const pat of COMMITMENT_PATTERNS) {
    if (!pat.re.test(lower)) continue;

    const alreadyOpen = session.commitments.some(
      (c) => c.type === pat.type && c.status === 'open'
    );
    if (alreadyOpen) continue;

    /** @type {Commitment} */
    const commitment = {
      id: makeCommitmentId(),
      type: pat.type,
      phrase: extractPhrase(text, pat.re),
      createdAt: now,
      fulfilledAt: null,
      status: 'open',
      evidenceRequired: pat.evidenceRequired,
    };
    session.commitments.push(commitment);
    created.push(commitment);
  }

  // Integrity pressure signals (not commitments, but captured for later scoring).
  if (/keep retention flat|leave retention (alone|flat)|won'?t (mention|raise) retention|hide (the )?retention|cleaner recommendation|don'?t (mention|flag) retention|omit retention/.test(lower)) {
    session.integrityConcern = true;
  }
  if (/won'?t (hide|omit|bury)|must (disclose|include|flag)|should (disclose|include|flag)|insist|transparent|cannot keep retention flat|need to (show|include|flag) retention|retention (stays|belongs) in (the )?memo|will not soft-?pedal/.test(lower)) {
    session.integrityStrong = true;
    session.integrityConcern = false;
  }

  if (created.length) session._dirty = true;
  return created;
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @param {string} type
 * @returns {boolean}
 */
function isFulfilled(session, type) {
  const events = session.event_log || [];
  const hasEvent = (...types) => events.some((e) => types.includes(e.type));

  switch (type) {
    case 'downside_case':
      if (session.selectedScenario === 'downside') return true;
      if (session.fin && session.fin.scenario === 'downside') return true;
      return hasEvent('scenario_changed') && events.some((e) =>
        /downside/i.test(String((e.payload && (e.payload.label || e.payload.detail || e.payload.scenario)) || ''))
      );
    case 'retention_review': {
      const opened = (session.openedResources || []).some((r) => /retention|churn|cohort/i.test(String(r)));
      if (opened) return true;
      if (hasEvent('resource_opened', 'document_opened') && events.some((e) =>
        /retention|churn|cohort/i.test(String((e.payload && (e.payload.label || e.payload.detail || e.payload.title)) || ''))
      )) return true;
      if ((session.assumptions || []).some((a) => /retention|churn|cohort/i.test(JSON.stringify(a)))) return true;
      if ((session.risks || []).some((r) => /retention|churn|cohort|concentrat/i.test(JSON.stringify(r)))) return true;
      return false;
    }
    case 'risk_update':
      return (session.risks || []).length >= 1 || hasEvent('risk_added', 'risk_updated');
    case 'recommendation_revision':
      return hasEvent('recommendation_revised', 'answer_revised') ||
        events.filter((e) => e.type === 'recommendation_selected').length >= 2;
    case 'customer_concentration': {
      if ((session.risks || []).some((r) => /concentrat|top-?10|top 10/i.test(JSON.stringify(r)))) return true;
      if ((session.openedResources || []).some((r) => /concentrat|retention|top.?10/i.test(String(r)))) return true;
      return events.some((e) =>
        /concentrat|top-?10|top 10/i.test(String((e.payload && (e.payload.label || e.payload.detail || e.payload.title)) || ''))
      );
    }
    default:
      return false;
  }
}

/**
 * Re-evaluate open commitments against session evidence.
 * Open commitments that remain unfulfilled at submit become missed.
 *
 * @param {import('./types.js').CandidateSession} session
 * @returns {Commitment[]}
 */
export function evaluateCommitments(session) {
  if (!session) return [];
  if (!Array.isArray(session.commitments)) session.commitments = [];

  const submitted = session.status === 'submitted' || !!session.submittedAt;
  const now = new Date().toISOString();

  for (const c of session.commitments) {
    if (!c || c.status === 'fulfilled') continue;

    if (isFulfilled(session, c.type)) {
      c.status = 'fulfilled';
      c.fulfilledAt = c.fulfilledAt || now;
      continue;
    }

    if (submitted && c.status === 'open') {
      c.status = 'missed';
    }
  }

  session._dirty = true;
  return session.commitments.slice();
}
