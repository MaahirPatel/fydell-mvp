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
  invitations: new Map<string, Record<string, unknown>>(),
  seq: 0,
};

export function __reset() {
  __store.sessions.clear();
  __store.states.clear();
  __store.events = [];
  __store.messages = [];
  __store.submissions.clear();
  __store.invitations.clear();
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
// invitations
// (2026-09-27) Added for the invitation accept-by-id hardening: mirrors the
// real db.ts invitation layer — invitationGate logic copied verbatim from
// src/lib/simulations/invitation-gate.ts, and acceptInvitation* follows the
// same steps (gate, idempotent same-candidate return, cross-candidate
// rejection, email-ownership check, session creation) with the same error
// messages. NOT a canned-response stub: it enforces the same contracts.
import { createHash } from "node:crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function invitationGate(inv: { status: string; expires_at: string }): {
  ok: boolean;
  reason?: string;
} {
  if (inv.status === "revoked")
    return { ok: false, reason: "This invitation has been revoked by the employer." };
  if (inv.status === "completed")
    return {
      ok: false,
      reason: "This invitation was already used and the simulation has been submitted.",
    };
  if (inv.status === "expired" || new Date(inv.expires_at) < new Date())
    return { ok: false, reason: "This invitation has expired. Ask the employer to resend it." };
  return { ok: true };
}

export interface InvitationSeed {
  id: string;
  candidateEmail?: string;
  candidateName?: string | null;
  status?: string;
  expiresAt?: string;
  rawToken?: string; // raw token; stored as hashToken(rawToken)
  organizationId?: string;
}

export function __seedInvitation(seed: InvitationSeed) {
  __store.invitations.set(seed.id, {
    id: seed.id,
    organization_id: seed.organizationId || "org-1",
    template_id: "tpl-1",
    template_version_id: "ver-1",
    cohort_id: null,
    candidate_email: (seed.candidateEmail || "candidate@test.local").toLowerCase(),
    candidate_name: seed.candidateName ?? null,
    status: seed.status || "sent",
    expires_at: seed.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
    token_hash: seed.rawToken ? hashToken(seed.rawToken) : null,
    accepted_by: null,
    accepted_at: null,
  });
}

export async function getInvitationByToken(token: string) {
  const h = hashToken(token);
  for (const inv of __store.invitations.values()) {
    if (inv.token_hash === h) return inv;
  }
  return null;
}

export async function getInvitationById(id: string) {
  return __store.invitations.get(id) || null;
}

async function acceptInvitationRow(
  inv: Record<string, unknown>,
  userId: string,
  userEmail: string
) {
  const gate = invitationGate(inv as { status: string; expires_at: string });
  if (!gate.ok) throw new Error(gate.reason);

  const existing = [...__store.sessions.values()].find(
    (s) => s.invitation_id === inv.id
  );
  if (existing) {
    if (existing.candidate_user_id !== userId)
      throw new Error("This invitation was already accepted by another account.");
    return { session: existing, invitation: inv };
  }

  if (inv.accepted_by && inv.accepted_by !== userId)
    throw new Error("This invitation was already accepted by another account.");

  if (inv.candidate_email && userEmail.toLowerCase() !== inv.candidate_email)
    throw new Error(
      `This invitation was sent to ${inv.candidate_email}. Sign in with that email to accept it.`
    );

  const session = {
    id: nextId("ses"),
    invitation_id: inv.id,
    organization_id: inv.organization_id,
    template_id: inv.template_id,
    template_version_id: inv.template_version_id,
    candidate_user_id: userId,
    status: "accepted",
    duration_minutes: 20,
    started_at: null,
    ends_at: null,
    submitted_at: null,
    created_at: new Date().toISOString(),
  };
  __store.sessions.set(session.id, session);
  __store.states.set(session.id, {
    session_id: session.id,
    revision: 0,
    current_task_id: null,
    open_resource_id: null,
    notes: "",
    deliverable: {},
    workspace: {},
    completed_task_ids: [],
  });
  inv.status = "accepted";
  inv.accepted_by = userId;
  inv.accepted_at = new Date().toISOString();
  return { session, invitation: inv };
}

export async function acceptInvitation(
  token: string,
  userId: string,
  userEmail: string
) {
  const inv = await getInvitationByToken(token);
  if (!inv) throw new Error("Invitation not found");
  return acceptInvitationRow(inv, userId, userEmail);
}

export async function acceptInvitationById(
  invitationId: string,
  userId: string,
  userEmail: string
) {
  const inv = await getInvitationById(invitationId);
  if (!inv) throw new Error("Invitation not found");
  return acceptInvitationRow(inv, userId, userEmail);
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
