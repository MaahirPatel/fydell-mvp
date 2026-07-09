/**
 * Candidate event log helpers.
 * @module js/sim/events
 */

let _seq = 0;

/**
 * @returns {string}
 */
export function makeEventId() {
  _seq += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `ev_${Date.now().toString(36)}_${_seq.toString(36)}_${rand}`;
}

/**
 * Append a CandidateEvent to session.event_log.
 *
 * @param {import('./types.js').CandidateSession} session
 * @param {string} type
 * @param {Object} [payload]
 * @param {string} [payload.label]
 * @param {string} [payload.detail]
 * @param {string} [payload.dim]
 * @param {string} [payload.category]
 * @param {string} [payload.section]
 * @returns {import('./types.js').CandidateEvent}
 */
export function logEvent(session, type, payload = {}) {
  if (!session || typeof session !== 'object') {
    throw new Error('logEvent: session is required');
  }
  if (!type || typeof type !== 'string') {
    throw new Error('logEvent: type is required');
  }

  if (!Array.isArray(session.event_log)) session.event_log = [];

  const event = {
    id: makeEventId(),
    timestamp: new Date().toISOString(),
    type: String(type),
    payload: payload && typeof payload === 'object' ? { ...payload } : {},
  };

  session.event_log.push(event);
  session._dirty = true;
  return event;
}

/**
 * @param {import('./types.js').CandidateSession} session
 * @param {string|string[]|((e: import('./types.js').CandidateEvent) => boolean)} [typeFilter]
 * @returns {import('./types.js').CandidateEvent[]}
 */
export function listEvents(session, typeFilter) {
  const log = (session && Array.isArray(session.event_log)) ? session.event_log : [];
  if (typeFilter == null) return log.slice();

  if (typeof typeFilter === 'function') {
    return log.filter(typeFilter);
  }

  if (Array.isArray(typeFilter)) {
    const set = new Set(typeFilter.map(String));
    return log.filter((e) => set.has(e.type));
  }

  const t = String(typeFilter);
  return log.filter((e) => e.type === t);
}
