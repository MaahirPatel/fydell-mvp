/**
 * Candidate event replay by server cursor.
 *
 * A reconnecting client (desktop after sleep, a reloaded browser) asks for
 * everything after the last `seq` it saw and gets the candidate-visible
 * events in server order. Delivery may repeat; clients dedupe on `seq`.
 * There is no exactly-once transport claim.
 *
 * Only an allowlist of event types is exposed, and each exposes an explicit
 * payload projection: scoring-side details (authored rule ids, outage
 * counters, run internals) never reach the candidate.
 */

export interface StoredEvent {
  seq: number;
  event_type: string;
  actor: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ReplayEvent {
  seq: number;
  type: string;
  actor: string;
  at: string;
  data: Record<string, unknown>;
}

export interface ReplayPage {
  events: ReplayEvent[];
  /** Pass back as `after` to continue. Equal to the input cursor when nothing is new. */
  cursor: number;
  hasMore: boolean;
}

type Projection = (payload: Record<string, unknown>) => Record<string, unknown>;

const pick =
  (...keys: string[]): Projection =>
  (p) => {
    const out: Record<string, unknown> = {};
    for (const k of keys) if (p[k] !== undefined) out[k] = p[k];
    return out;
  };

/** Candidate-visible event types and the payload fields each may show. */
export const CANDIDATE_REPLAY: Record<string, Projection> = {
  session_started: pick(),
  curveball_presented: pick("curveballId"),
  curveball_acknowledged: pick(),
  message_sent: pick("stakeholderId"),
  message_received: pick("stakeholderId"),
  proactive_message_delivered: pick("stakeholderId"),
  deadline_extended: pick("extraMs", "reason", "newEndsAt"),
  teammate_service_outage: pick(),
  teammate_service_recovered: pick(),
  // Practice runs the candidate started; they already see these results.
  test_run_completed: pick("runId", "snapshotHash", "status", "summary"),
  submission_confirmed: pick(),
};

export const MAX_REPLAY_PAGE = 200;

export function parseCursor(raw: string | null): number | null {
  if (raw === null || raw === "") return 0;
  if (!/^\d{1,15}$/.test(raw)) return null;
  return Number(raw);
}

export function parseLimit(raw: string | null): number {
  const n = raw ? Number(raw) : MAX_REPLAY_PAGE;
  if (!Number.isInteger(n) || n < 1) return MAX_REPLAY_PAGE;
  return Math.min(n, MAX_REPLAY_PAGE);
}

/**
 * Build one page from rows already filtered to `seq > after` and ordered by
 * seq, fetched with limit + 1 so `hasMore` is exact. The cursor advances past
 * hidden events too, so a client never re-reads them.
 */
export function buildReplayPage(rows: StoredEvent[], after: number, limit: number): ReplayPage {
  const ordered = [...rows].filter((r) => r.seq > after).sort((a, b) => a.seq - b.seq);
  const page = ordered.slice(0, limit);
  const events: ReplayEvent[] = [];
  for (const r of page) {
    const project = CANDIDATE_REPLAY[r.event_type];
    if (!project) continue;
    events.push({ seq: r.seq, type: r.event_type, actor: r.actor, at: r.created_at, data: project(r.payload ?? {}) });
  }
  return {
    events,
    cursor: page.length > 0 ? page[page.length - 1].seq : after,
    hasMore: ordered.length > limit,
  };
}
