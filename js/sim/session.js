/**
 * Candidate session create / persist / resume.
 * @module js/sim/session
 */

import { logEvent } from './events.js';
import { calculateSimulationProgress } from './progress.js';

export const STORAGE_PREFIX = 'fydell_sim_session_';
const INDEX_KEY = 'fydell_sim_session_index';

/**
 * @returns {string}
 */
function makeSessionId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `sess_${Date.now().toString(36)}_${rand}`;
}

/**
 * @returns {Storage|null}
 */
function storage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {string} sessionId
 * @returns {string}
 */
function storageKey(sessionId) {
  return STORAGE_PREFIX + sessionId;
}

/**
 * @returns {string[]}
 */
function readIndex() {
  const ls = storage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * @param {string[]} ids
 */
function writeIndex(ids) {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(INDEX_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {string} sessionId
 */
function rememberSessionId(sessionId) {
  const ids = readIndex();
  if (!ids.includes(sessionId)) {
    ids.push(sessionId);
    writeIndex(ids);
  }
}

/**
 * Create a new in-progress CandidateSession.
 *
 * @param {Object} opts
 * @param {string} [opts.scenarioId]
 * @param {string} [opts.inviteToken]
 * @param {string} [opts.candidateId]
 * @param {string} [opts.candidateName]
 * @param {string} [opts.candidateEmail]
 * @param {string|number} [opts.variantSeed]
 * @param {import('./types.js').Scenario|null} [opts.scenario]
 * @returns {import('./types.js').CandidateSession}
 */
export function createSession({
  scenarioId,
  inviteToken,
  candidateId,
  candidateName,
  candidateEmail,
  variantSeed,
  scenario,
} = {}) {
  const resolvedScenarioId =
    scenarioId ||
    (scenario && scenario.id) ||
    'meridian';

  const seed =
    variantSeed != null && variantSeed !== ''
      ? variantSeed
      : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  /** @type {import('./types.js').CandidateSession} */
  const session = {
    id: makeSessionId(),
    scenarioId: resolvedScenarioId,
    inviteToken: inviteToken || null,
    candidateId: candidateId || null,
    candidateName: candidateName || null,
    candidateEmail: candidateEmail || null,
    variantSeed: seed,
    scenario: scenario || null,
    event_log: [],
    startedAt: new Date().toISOString(),
    submittedAt: null,
    currentTab: 'brief',
    viewedTabs: [],
    openedResources: [],
    selectedScenario: 'base',
    assumptions: [],
    risks: [],
    chatMessages: [],
    commitments: [],
    selectedRecommendation: null,
    finalMemo: '',
    progress: 5,
    signalSnapshot: null,
    usedMessageVariantIds: [],
    ai_usage_log: [],
    plantedErrorFlags: {},
    ambiguityResponses: {},
    status: 'in_progress',
    _dirty: true,
    _briefViewed: false,
    _modelViewed: false,
    _curveballSeen: false,
    fin: null,
  };

  logEvent(session, 'session_started', {
    label: 'Simulation started',
    detail: resolvedScenarioId,
    category: 'lifecycle',
    section: 'session',
  });

  session.progress = calculateSimulationProgress(session);
  saveSession(session);
  return session;
}

/**
 * Persist session JSON to localStorage.
 * @param {import('./types.js').CandidateSession} session
 * @returns {boolean}
 */
export function saveSession(session) {
  if (!session || !session.id) return false;
  session.progress = calculateSimulationProgress(session);
  session._dirty = false;

  const ls = storage();
  if (!ls) return false;

  try {
    const clone = { ...session };
    // Keep runtime flag out of durable storage noise but allow reload to work.
    delete clone._dirty;
    ls.setItem(storageKey(session.id), JSON.stringify(clone));
    rememberSessionId(session.id);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} sessionId
 * @returns {import('./types.js').CandidateSession|null}
 */
export function loadSession(sessionId) {
  if (!sessionId) return null;
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(storageKey(sessionId));
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || typeof session !== 'object') return null;
    session._dirty = false;
    if (!Array.isArray(session.event_log)) session.event_log = [];
    if (!Array.isArray(session.assumptions)) session.assumptions = [];
    if (!Array.isArray(session.risks)) session.risks = [];
    if (!Array.isArray(session.chatMessages)) session.chatMessages = [];
    if (!Array.isArray(session.commitments)) session.commitments = [];
    if (!Array.isArray(session.usedMessageVariantIds)) session.usedMessageVariantIds = [];
    if (!Array.isArray(session.ai_usage_log)) session.ai_usage_log = [];
    if (!Array.isArray(session.viewedTabs)) session.viewedTabs = [];
    if (!Array.isArray(session.openedResources)) session.openedResources = [];
    if (!session.plantedErrorFlags) session.plantedErrorFlags = {};
    if (!session.ambiguityResponses) session.ambiguityResponses = {};
    session.progress = calculateSimulationProgress(session);
    return session;
  } catch {
    return null;
  }
}

/**
 * Find the latest in-progress session for an invite token.
 * @param {string} inviteToken
 * @returns {import('./types.js').CandidateSession|null}
 */
export function resumeSession(inviteToken) {
  if (!inviteToken) return null;
  const token = String(inviteToken);
  let best = null;

  for (const id of listSessionIds()) {
    const s = loadSession(id);
    if (!s) continue;
    if (String(s.inviteToken || '') !== token) continue;
    if (s.status === 'submitted' || s.status === 'abandoned') continue;
    if (!best) {
      best = s;
      continue;
    }
    const a = Date.parse(s.startedAt || 0) || 0;
    const b = Date.parse(best.startedAt || 0) || 0;
    if (a >= b) best = s;
  }

  return best;
}

/**
 * @returns {string[]}
 */
export function listSessionIds() {
  const indexed = readIndex();
  if (indexed.length) return indexed.slice();

  // Fallback scan when index is missing (older data / cleared index).
  const ls = storage();
  if (!ls) return [];
  const ids = [];
  try {
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key && key.startsWith(STORAGE_PREFIX) && key !== INDEX_KEY) {
        ids.push(key.slice(STORAGE_PREFIX.length));
      }
    }
  } catch {
    /* ignore */
  }
  if (ids.length) writeIndex(ids);
  return ids;
}

/**
 * Mark session submitted and persist.
 * @param {import('./types.js').CandidateSession} session
 * @returns {import('./types.js').CandidateSession}
 */
export function markSubmitted(session) {
  if (!session) throw new Error('markSubmitted: session is required');
  session.status = 'submitted';
  session.submittedAt = new Date().toISOString();
  logEvent(session, 'session_submitted', {
    label: 'Simulation submitted',
    category: 'lifecycle',
    section: 'session',
  });
  session.progress = 100;
  saveSession(session);
  return session;
}
