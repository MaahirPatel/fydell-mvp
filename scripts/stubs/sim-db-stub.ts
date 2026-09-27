/**
 * Test stub for @/lib/simulations/db.
 * In-memory implementation of the functions used by the traversed candidate
 * routes (session GET, start, state, events, messages, curveball, submit).
 * Mirrors the real contracts: optimistic-concurrency state saves, idempotent
 * event/message inserts, consent+preflight gating on start.
 */
import { MICRO_OPS_YIELD } from "../../src/lib/simulations/content/micro-ops-yield";
import type { SimulationContent } from "../../src/lib/simulations/types";

// ---------------------------------------------------------------------------
// test content: flagship micro sim + one context-gated test rule on Jordan
// ---------------------------------------------------------------------------
function buildTestContent(): SimulationContent {
  const c = JSON.parse(JSON.stringify(MICRO_OPS_YIELD)) as Record<string, unknown>;
  const stakeholders = c.stakeholders as Array<Record<string, unknown>>;
  const jordan = stakeholders.find((s) => s.id === "jordan")!;
  (jordan.responseRules as Array<Record<string, unknown>>).unshift({
    id: "test_ctx_rule",
    priority: 99,
    anyKeywords: ["context"],
    requires: { answeredQuestion: "primary_driver", minElapsedMinutes: 1 },
    reply:
      "Noted — you have answered {answeredCount} question(s), {elapsedMinutes} minutes in, after {eventCount} recorded actions.",
  });
  return c as unknown as SimulationContent;
}
const TEST_CONTENT = buildTestContent();

// ---------------------------------------------------------------------------
// stores
// ---------------------------------------------------------------------------
interface SessionSeed {
  id: string;
  candidateUserId?: string;
  status?: "accepted" | "active" | "submitted";
  startedAt?: string | null;
  consent?: boolean;
  preflight?: boolean;
}

export const __store = {
  sessions: new Map<string, Record<string, unknown>>(),
  states: new Map<string, Record<string, unknown>>(),
  events: [] as Array<Record<string, unknown>>,
  messages: [] as Array<Record<string, unknown>>,
  submissions: new Map<string, Record<string, unknown>>(),
  seq: 0,
};

export function __reset() {
  __store.sessions.clear();
  __store.states.clear();
  __store.events = [];
  __store.messages = [];
  __store.submissions.clear();
  __store.seq = 0;
}

export function __seedSession(seed: SessionSeed) {
  const id = seed.id;
  __store.sessions.set(id, {
    id,
    invitation_id: `inv-${id}`,
    organization_id: "org-1",
    template_id: "tpl-1",
    template_version_id: "ver-1",
    candidate_user_id: seed.candidateUserId || "cand-1",
    status: seed.status || "accepted",
    duration_minutes: 20,
    started_at: seed.startedAt ?? null,
    ends_at: null,
    submitted_at: null,
    curveball_presented_at: null,
    curveball_acknowledged_at: null,
    external_ai_disclosed: null,
    created_at: new Date().toISOString(),
    __consent: seed.consent !== false,
    __preflight: seed.preflight !== false,
  });
  __store.states.set(id, {
    session_id: id,
    revision: 0,
    current_task_id: null,
    open_resource_id: null,
    notes: "",
    deliverable: {},
    workspace: {},
    completed_task_ids: [],
  });
}

const nextId = (p: string) => `${p}_${++__store.seq}`;

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------
export async function getSessionForCandidate(id: string, userId: string) {
  const s = __store.sessions.get(id);
  if (!s || s.candidate_user_id !== userId) throw new Error("Session not found");
  return s;
}

export async function getVersionContent(_versionId: string): Promise<SimulationContent> {
  return TEST_CONTENT;
}

export async function getTemplateById(id: string) {
  return { id, slug: "__no_scenario__" };
}

export async function startSession(sessionId: string, userId: string) {
  const s = await getSessionForCandidate(sessionId, userId);
  if (s.status === "submitted" || s.status === "analyzed" || s.status === "report_ready")
    throw new Error("This session has already been submitted.");
  if (s.started_at) return s;
  if (!s.__consent) throw new Error("Accept the consent terms before starting the evaluation.");
  if (!s.__preflight)
    throw new Error("Complete the desktop and network checks successfully before starting.");
  const startedAt = new Date();
  s.started_at = startedAt.toISOString();
  s.ends_at = new Date(startedAt.getTime() + (s.duration_minutes as number) * 60000).toISOString();
  s.status = "active";
  __store.events.push({
    id: nextId("evt"),
    session_id: sessionId,
    event_type: "session_started",
    actor: "system",
    resource_id: null,
    task_id: null,
    payload: {},
    client_event_id: `start_${sessionId}`,
    created_at: new Date().toISOString(),
  });
  return s;
}

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------
export async function getSessionState(sessionId: string) {
  const st = __store.states.get(sessionId);
  if (!st) throw new Error("State not found");
  return st;
}

export async function saveSessionState(
  sessionId: string,
  baseRevision: number,
  patch: Record<string, unknown>
) {
  const st = await getSessionState(sessionId);
  if (st.revision !== baseRevision) return { ok: false as const, conflict: st };
  for (const [k, v] of Object.entries(patch)) st[k] = v;
  st.revision = (st.revision as number) + 1;
  return { ok: true as const, revision: st.revision as number };
}

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------
export async function listEvents(sessionId: string) {
  return __store.events.filter((e) => e.session_id === sessionId);
}

export async function recordEvent(
  sessionId: string,
  event: {
    eventType: string;
    actor?: string;
    resourceId?: string;
    taskId?: string;
    payload?: Record<string, unknown>;
    clientEventId?: string;
    schemaVersion?: number;
  }
) {
  if (event.clientEventId) {
    const existing = __store.events.find(
      (e) => e.session_id === sessionId && e.client_event_id === event.clientEventId
    );
    if (existing) return { id: existing.id as string, duplicate: true };
  }
  const row = {
    id: nextId("evt"),
    session_id: sessionId,
    event_type: event.eventType,
    actor: event.actor || "candidate",
    resource_id: event.resourceId || null,
    task_id: event.taskId || null,
    payload: event.payload || {},
    client_event_id: event.clientEventId || null,
    created_at: new Date().toISOString(),
  };
  __store.events.push(row);
  return { id: row.id, duplicate: false };
}

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------
export async function listMessages(sessionId: string) {
  return __store.messages.filter((m) => m.session_id === sessionId);
}

export async function insertMessage(input: {
  sessionId: string;
  thread: "stakeholder" | "assistant";
  stakeholderId?: string | null;
  sender: "candidate" | "stakeholder" | "assistant";
  body: string;
  clientMsgId?: string | null;
}) {
  if (input.clientMsgId) {
    const existing = __store.messages.find(
      (m) => m.session_id === input.sessionId && m.client_msg_id === input.clientMsgId
    );
    if (existing) return { message: existing, duplicate: true };
  }
  const row = {
    id: nextId("msg"),
    session_id: input.sessionId,
    thread: input.thread,
    stakeholder_id: input.stakeholderId || null,
    sender: input.sender,
    body: input.body,
    client_msg_id: input.clientMsgId || null,
    created_at: new Date().toISOString(),
  };
  __store.messages.push(row);
  return { message: row, duplicate: false };
}

// ---------------------------------------------------------------------------
// curveball
// ---------------------------------------------------------------------------
export async function presentCurveball(sessionId: string) {
  const s = __store.sessions.get(sessionId);
  if (!s) throw new Error("Session not found");
  if (s.curveball_presented_at) return false;
  // Backdate a few minutes so the curveball_elapsed_minutes proactive trigger
  // is exercisable in tests.
  s.curveball_presented_at = new Date(Date.now() - 3 * 60000).toISOString();
  return true;
}

export async function acknowledgeCurveball(sessionId: string) {
  const s = __store.sessions.get(sessionId);
  if (!s) throw new Error("Session not found");
  s.curveball_acknowledged_at = new Date().toISOString();
}

// ---------------------------------------------------------------------------
// submit (web path only)
// ---------------------------------------------------------------------------
export async function submitSession(sessionId: string, userId: string, disclosed: boolean) {
  const s = await getSessionForCandidate(sessionId, userId);
  const existing = __store.submissions.get(sessionId);
  if (existing) return { submissionId: existing.id as string, alreadySubmitted: true };
  if (s.status !== "active") throw new Error("Session is not active");
  s.status = "submitted";
  s.submitted_at = new Date().toISOString();
  s.external_ai_disclosed = disclosed;
  const sub = {
    id: nextId("sub"),
    session_id: sessionId,
    external_ai_disclosed: disclosed,
    created_at: new Date().toISOString(),
  };
  __store.submissions.set(sessionId, sub);
  return { submissionId: sub.id as string, alreadySubmitted: false };
}
