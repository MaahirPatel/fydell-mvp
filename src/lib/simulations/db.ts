import "server-only";
import { createHash, randomBytes } from "crypto";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { SimulationContent } from "./types";
import { invitationGate } from "./invitation-gate";
import { buildScenarioPackage, scenarioIdForTemplateSlug } from "./scenario-package";
import {
  buildSubmissionSnapshot,
  computeReceiptHash,
  isValidFileSnapshotShape,
  validateFileSnapshot,
  type FileSnapshotInput,
} from "./submission-files";
import { enqueueEmail } from "@/lib/ops/email-outbox";
import { appUrl } from "@/lib/app-url";
import { assertInboxVerified } from "@/lib/security/email-verification";

export { invitationGate } from "./invitation-gate";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
export function mintToken(): string {
  return randomBytes(24).toString("base64url");
}

type Admin = ReturnType<typeof createAdminSupabaseClient>;

// ---------------------------------------------------------------------------
// Row shapes (subset of columns the app reads)
// ---------------------------------------------------------------------------
export interface TemplateRow {
  id: string;
  slug: string;
  role_key: string;
  title: string;
  status: "draft" | "published" | "archived";
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVersionRow {
  id: string;
  template_id: string;
  version: number;
  content: SimulationContent;
  change_notes: string | null;
  published_at: string | null;
  created_at: string;
}

export interface InvitationRow {
  id: string;
  organization_id: string;
  template_id: string;
  template_version_id: string;
  cohort_id: string | null;
  candidate_email: string;
  candidate_name: string | null;
  status: string;
  email_delivery: string;
  resend_count: number;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  invitation_id: string;
  organization_id: string;
  template_id: string;
  template_version_id: string;
  candidate_user_id: string;
  status: "accepted" | "active" | "submitted" | "analyzed" | "report_ready";
  duration_minutes: number;
  started_at: string | null;
  ends_at: string | null;
  submitted_at: string | null;
  curveball_presented_at: string | null;
  curveball_acknowledged_at: string | null;
  external_ai_disclosed: boolean | null;
  created_at: string;
}

export interface SessionStateRow {
  session_id: string;
  revision: number;
  current_task_id: string | null;
  open_resource_id: string | null;
  notes: string;
  deliverable: Record<string, string | number | string[]>;
  workspace: Record<string, unknown>;
  completed_task_ids: string[];
  updated_at: string;
}

export interface MessageRow {
  id: string;
  session_id: string;
  thread: "stakeholder" | "assistant";
  stakeholder_id: string | null;
  sender: "candidate" | "stakeholder" | "assistant";
  body: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
export async function getPublishedTemplates(admin?: Admin): Promise<
  { template: TemplateRow; version: TemplateVersionRow }[]
> {
  const db = admin || createAdminSupabaseClient();
  const { data: templates, error } = await db
    .from("sim_templates")
    .select("*")
    .eq("status", "published")
    .order("created_at");
  if (error) throw new Error(`Could not load templates: ${error.message}`);
  const out: { template: TemplateRow; version: TemplateVersionRow }[] = [];
  for (const t of templates || []) {
    if (!t.current_version_id) continue;
    const { data: v } = await db
      .from("sim_template_versions")
      .select("*")
      .eq("id", t.current_version_id)
      .single();
    if (v) out.push({ template: t as TemplateRow, version: v as TemplateVersionRow });
  }
  return out;
}

export async function getTemplateBySlug(
  slug: string
): Promise<{ template: TemplateRow; version: TemplateVersionRow } | null> {
  const db = createAdminSupabaseClient();
  const { data: t } = await db.from("sim_templates").select("*").eq("slug", slug).maybeSingle();
  if (!t || !t.current_version_id) return null;
  const { data: v } = await db
    .from("sim_template_versions")
    .select("*")
    .eq("id", t.current_version_id)
    .single();
  if (!v) return null;
  return { template: t as TemplateRow, version: v as TemplateVersionRow };
}

export async function getVersionContent(versionId: string): Promise<SimulationContent> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("sim_template_versions")
    .select("content")
    .eq("id", versionId)
    .single();
  if (error || !data) throw new Error("Simulation version not found");
  return data.content as SimulationContent;
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateInviteRows(
  rows: { email: string; name?: string }[]
): { valid: { email: string; name: string | null }[]; errors: string[] } {
  const seen = new Set<string>();
  const valid: { email: string; name: string | null }[] = [];
  const errors: string[] = [];
  for (const row of rows) {
    const email = (row.email || "").trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_RE.test(email)) {
      errors.push(`Invalid email: ${row.email}`);
      continue;
    }
    if (seen.has(email)) {
      errors.push(`Duplicate email: ${email}`);
      continue;
    }
    seen.add(email);
    valid.push({ email, name: (row.name || "").trim() || null });
  }
  return { valid, errors };
}

export async function createInvitation(input: {
  organizationId: string;
  templateId: string;
  candidateEmail: string;
  candidateName: string | null;
  invitedBy: string;
  expiresInDays?: number;
  cohortId?: string | null;
  /** When set, pin this exact version instead of current. */
  templateVersionId?: string | null;
}): Promise<{ invitation: InvitationRow; token: string }> {
  const db = createAdminSupabaseClient();
  // Pin the version that is current at creation time (or cohort-bound version).
  const { data: t, error: tErr } = await db
    .from("sim_templates")
    .select("id, current_version_id, status")
    .eq("id", input.templateId)
    .single();
  if (tErr || !t) throw new Error("Simulation not found");
  if (t.status !== "published" || !t.current_version_id)
    throw new Error("This simulation is not published");

  const versionId = input.templateVersionId || t.current_version_id;
  const token = mintToken();
  const expiresAt = new Date(
    Date.now() + (input.expiresInDays ?? 14) * 86400000
  ).toISOString();
  const { data, error } = await db
    .from("sim_invitations")
    .insert({
      organization_id: input.organizationId,
      template_id: input.templateId,
      template_version_id: versionId,
      cohort_id: input.cohortId || null,
      candidate_email: input.candidateEmail.toLowerCase(),
      candidate_name: input.candidateName,
      token_hash: hashToken(token),
      status: "sent",
      invited_by: input.invitedBy,
      expires_at: expiresAt,
      email_delivery: "not_configured",
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not create invitation: ${error.message}`);
  return { invitation: data as InvitationRow, token };
}

export async function getInvitationByToken(token: string): Promise<InvitationRow | null> {
  if (!isSupabaseConfigured()) return null;
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("sim_invitations")
    .select("*")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  return (data as InvitationRow) || null;
}

export async function getInvitationById(id: string): Promise<InvitationRow | null> {
  if (!isSupabaseConfigured()) return null;
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("sim_invitations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as InvitationRow) || null;
}

/** Mark opened (first view) : non-fatal if racing. */
export async function markInvitationOpened(id: string): Promise<void> {
  const db = createAdminSupabaseClient();
  await db.from("sim_invitations").update({ status: "opened" }).eq("id", id).eq("status", "sent");
}

/**
 * Accept: associates the invitation with the signed-in candidate and creates
 * the session (idempotent : re-accepting returns the existing session).
 */
export async function acceptInvitation(
  token: string,
  userId: string,
  userEmail: string
): Promise<{ session: SessionRow; invitation: InvitationRow }> {
  const inv = await getInvitationByToken(token);
  if (!inv) throw new Error("Invitation not found");
  return acceptInvitationRow(inv, userId, userEmail);
}

/**
 * Accept by invitation id: same gate, same email-ownership check, same
 * idempotency as the token-based accept. Used by candidate clients (e.g.
 * the desktop inbox) that already have a server-scoped listing, so no token
 * needs to round-trip through the client.
 */
export async function acceptInvitationById(
  invitationId: string,
  userId: string,
  userEmail: string
): Promise<{ session: SessionRow; invitation: InvitationRow }> {
  const inv = await getInvitationById(invitationId);
  if (!inv) throw new Error("Invitation not found");
  return acceptInvitationRow(inv, userId, userEmail);
}

async function acceptInvitationRow(
  inv: InvitationRow,
  userId: string,
  userEmail: string
): Promise<{ session: SessionRow; invitation: InvitationRow }> {
  const db = createAdminSupabaseClient();
  const gate = invitationGate(inv);
  if (!gate.ok) throw new Error(gate.reason);

  // Open demo invitations (blank candidate_email) are reusable: every account
  // gets its own session. Addressed invitations stay single-use.
  const isOpen = !inv.candidate_email;

  // Existing session → idempotent return. For open invitations scope to this
  // user so each account gets its own session.
  let existingQuery = db.from("sim_sessions").select("*").eq("invitation_id", inv.id);
  if (isOpen) existingQuery = existingQuery.eq("candidate_user_id", userId);
  const { data: existing } = await existingQuery.maybeSingle();
  if (existing) {
    if (!isOpen && existing.candidate_user_id !== userId)
      throw new Error("This invitation was already accepted by another account.");
    return { session: existing as SessionRow, invitation: inv };
  }

  if (!isOpen && inv.accepted_by && inv.accepted_by !== userId)
    throw new Error("This invitation was already accepted by another account.");

  // The invitation is addressed to a specific email; enforce it.
  if (inv.candidate_email && userEmail.toLowerCase() !== inv.candidate_email)
    throw new Error(
      `This invitation was sent to ${inv.candidate_email}. Sign in with that email to accept it.`
    );
  if (inv.candidate_email) await assertInboxVerified({ id: userId, email: userEmail });

  const content = await getVersionContent(inv.template_version_id);
  const { data: session, error } = await db
    .from("sim_sessions")
    .insert({
      invitation_id: inv.id,
      organization_id: inv.organization_id,
      template_id: inv.template_id,
      template_version_id: inv.template_version_id,
      candidate_user_id: userId,
      status: "accepted",
      duration_minutes: content.durationMinutes,
    })
    .select("*")
    .single();
  if (error) {
    // Unique violation → concurrent accept; re-read.
    const { data: raced } = await db
      .from("sim_sessions")
      .select("*")
      .eq("invitation_id", inv.id)
      .maybeSingle();
    if (raced && raced.candidate_user_id === userId)
      return { session: raced as SessionRow, invitation: inv };
    throw new Error(`Could not accept invitation: ${error.message}`);
  }

  // Open demo invitations stay reusable: don't mark them accepted or bind
  // them to one account. Addressed invitations lock to the first accepter.
  if (!isOpen) {
    await db
      .from("sim_invitations")
      .update({ status: "accepted", accepted_by: userId, accepted_at: new Date().toISOString() })
      .eq("id", inv.id);
  }

  await db.from("sim_session_state").insert({ session_id: session.id }).select().maybeSingle();

  return { session: session as SessionRow, invitation: inv };
}

export async function revokeInvitation(id: string, organizationId: string): Promise<void> {
  const db = createAdminSupabaseClient();
  const { error } = await db
    .from("sim_invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId)
    .in("status", ["sent", "opened"]);
  if (error) throw new Error(`Could not revoke: ${error.message}`);
}

/** Resend mints a NEW token for the same invitation (old link stops working). */
export async function resendInvitation(
  id: string,
  organizationId: string
): Promise<{ invitation: InvitationRow; token: string }> {
  const db = createAdminSupabaseClient();
  const { data: inv } = await db
    .from("sim_invitations")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!inv) throw new Error("Invitation not found");
  if (["revoked", "accepted", "started", "completed"].includes(inv.status))
    throw new Error(`Cannot resend an invitation with status "${inv.status}"`);

  const token = mintToken();
  const { data, error } = await db
    .from("sim_invitations")
    .update({
      token_hash: hashToken(token),
      status: "sent",
      resend_count: (inv.resend_count || 0) + 1,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`Could not resend: ${error.message}`);
  return { invitation: data as InvitationRow, token };
}

// ---------------------------------------------------------------------------
// Self-serve attempts (five-minute public simulations)
// ---------------------------------------------------------------------------
const PILOT_ORG_SLUG = "fydell-pilot";

/** House organization that owns self-serve pilot attempts. */
export async function getOrCreatePilotOrg(): Promise<string> {
  const db = createAdminSupabaseClient();
  const { data: existing } = await db
    .from("organizations")
    .select("id")
    .eq("slug", PILOT_ORG_SLUG)
    .maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await db
    .from("organizations")
    .insert({ name: "Fydell Pilot", slug: PILOT_ORG_SLUG, status: "active" })
    .select("id")
    .single();
  if (error) {
    const { data: raced } = await db
      .from("organizations")
      .select("id")
      .eq("slug", PILOT_ORG_SLUG)
      .maybeSingle();
    if (raced) return raced.id;
    throw new Error(`Could not create pilot org: ${error.message}`);
  }
  return data.id;
}

/**
 * Start (or resume) a self-serve attempt for a published simulation.
 * An unsubmitted attempt for the same template is resumed, not duplicated.
 */
export async function createSelfServeAttempt(
  slug: string,
  userId: string
): Promise<{ sessionId: string; resumed: boolean }> {
  const db = createAdminSupabaseClient();
  const found = await getTemplateBySlug(slug);
  if (!found || found.template.status !== "published")
    throw new Error("Simulation not found");

  const { data: open } = await db
    .from("sim_sessions")
    .select("id")
    .eq("candidate_user_id", userId)
    .eq("template_id", found.template.id)
    .eq("origin", "self_serve")
    .in("status", ["accepted", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) return { sessionId: open.id, resumed: true };

  const orgId = await getOrCreatePilotOrg();
  const content = found.version.content as { durationMinutes?: number };
  const { data: session, error } = await db
    .from("sim_sessions")
    .insert({
      invitation_id: null,
      organization_id: orgId,
      template_id: found.template.id,
      template_version_id: found.version.id,
      candidate_user_id: userId,
      status: "accepted",
      origin: "self_serve",
      duration_minutes: content.durationMinutes || 5,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not create attempt: ${error.message}`);
  await db.from("sim_session_state").insert({ session_id: session.id }).select().maybeSingle();
  return { sessionId: session.id, resumed: false };
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export async function getSessionForCandidate(
  sessionId: string,
  userId: string
): Promise<SessionRow> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from("sim_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!data) throw new Error("Session not found");
  if (data.candidate_user_id !== userId) throw new Error("Forbidden");
  return data as SessionRow;
}

export async function getSessionForOrgMember(
  sessionId: string,
  userId: string
): Promise<SessionRow> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from("sim_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!data) throw new Error("Session not found");
  const { data: member } = await db
    .from("organization_members")
    .select("id")
    .eq("organization_id", data.organization_id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!member) throw new Error("Forbidden");
  return data as SessionRow;
}

/** Start (idempotent): sets started_at/ends_at from persisted timestamps. */
export async function startSession(sessionId: string, userId: string): Promise<SessionRow> {
  const db = createAdminSupabaseClient();
  const session = await getSessionForCandidate(sessionId, userId);
  if (session.status === "submitted" || session.status === "analyzed" || session.status === "report_ready")
    throw new Error("This session has already been submitted.");
  if (session.started_at) return session;

  // Consent is required before the authoritative timer starts.
  const { data: consent } = await db
    .from("candidate_consents")
    .select("id")
    .eq("invitation_id", session.invitation_id)
    .maybeSingle();
  if (!consent) {
    throw new Error("Accept the consent terms before starting the evaluation.");
  }

  const { data: preflight } = await db
    .from("preflight_checks")
    .select("desktop_suitable, network_ok, browser_ok")
    .eq("invitation_id", session.invitation_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!preflight?.desktop_suitable || !preflight?.network_ok || !preflight?.browser_ok) {
    throw new Error(
      "Complete the desktop and network checks successfully before starting. Small screens are not supported for the timed evaluation."
    );
  }

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + session.duration_minutes * 60000);
  const { data, error } = await db
    .from("sim_sessions")
    .update({
      status: "active",
      started_at: startedAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq("id", sessionId)
    .is("started_at", null)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Could not start session: ${error.message}`);
  if (!data) return getSessionForCandidate(sessionId, userId); // raced: already started

  await db
    .from("sim_invitations")
    .update({ status: "started" })
    .eq("id", session.invitation_id)
    .in("status", ["accepted"]);

  await recordEvent(sessionId, {
    eventType: "session_started",
    actor: "system",
    clientEventId: `start_${sessionId}`,
  });
  return data as SessionRow;
}

export async function getSessionState(sessionId: string): Promise<SessionStateRow> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("sim_session_state")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (data) return data as SessionStateRow;
  const { data: created, error } = await db
    .from("sim_session_state")
    .upsert({ session_id: sessionId }, { onConflict: "session_id" })
    .select("*")
    .single();
  if (error) throw new Error(`Could not init state: ${error.message}`);
  return created as SessionStateRow;
}

/**
 * Save state with optimistic concurrency. Returns the new revision, or the
 * current server state when the base revision is stale so the client can
 * reconcile (newest valid field revision wins client-side).
 */
export async function saveSessionState(
  sessionId: string,
  baseRevision: number,
  patch: Partial<
    Pick<
      SessionStateRow,
      "current_task_id" | "open_resource_id" | "notes" | "deliverable" | "workspace" | "completed_task_ids"
    >
  >
): Promise<{ ok: true; revision: number } | { ok: false; conflict: SessionStateRow }> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("sim_session_state")
    .update({ ...patch, revision: baseRevision + 1, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("revision", baseRevision)
    .select("revision")
    .maybeSingle();
  if (error) throw new Error(`Could not save: ${error.message}`);
  if (!data) {
    const current = await getSessionState(sessionId);
    return { ok: false, conflict: current };
  }
  return { ok: true, revision: data.revision };
}

// ---------------------------------------------------------------------------
// Events (append-only, idempotent by client_event_id)
// ---------------------------------------------------------------------------
export async function recordEvent(
  sessionId: string,
  event: {
    eventType: string;
    actor?: "candidate" | "stakeholder" | "assistant" | "system";
    resourceId?: string;
    taskId?: string;
    payload?: Record<string, unknown>;
    clientEventId?: string;
    schemaVersion?: number;
  }
): Promise<{ id: string; duplicate: boolean }> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("sim_session_events")
    .insert({
      session_id: sessionId,
      event_type: event.eventType,
      actor: event.actor || "candidate",
      resource_id: event.resourceId || null,
      task_id: event.taskId || null,
      payload: event.payload || {},
      client_event_id: event.clientEventId || null,
      schema_version: event.schemaVersion ?? 1,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505" && event.clientEventId) {
      const { data: existing } = await db
        .from("sim_session_events")
        .select("id")
        .eq("session_id", sessionId)
        .eq("client_event_id", event.clientEventId)
        .single();
      return { id: existing?.id || "", duplicate: true };
    }
    throw new Error(`Could not record event: ${error.message}`);
  }
  return { id: data.id, duplicate: false };
}

export async function listEvents(
  sessionId: string
): Promise<{ id: string; event_type: string; actor: string; resource_id: string | null; task_id: string | null; payload: Record<string, unknown>; created_at: string }[]> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("sim_session_events")
    .select("id, event_type, actor, resource_id, task_id, payload, created_at")
    .eq("session_id", sessionId)
    .order("seq");
  return data || [];
}

/** Events with seq > after, oldest first, at most `limit` rows (for cursor replay). */
export async function listEventsAfter(
  sessionId: string,
  after: number,
  limit: number
): Promise<{ seq: number; event_type: string; actor: string; payload: Record<string, unknown> | null; created_at: string }[]> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("sim_session_events")
    .select("seq, event_type, actor, payload, created_at")
    .eq("session_id", sessionId)
    .gt("seq", after)
    .order("seq")
    .limit(limit);
  if (error) throw new Error(`Could not load events: ${error.message}`);
  return (data || []).map((r) => ({ ...r, seq: Number(r.seq) }));
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
export async function listMessages(sessionId: string): Promise<MessageRow[]> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("sim_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at");
  return (data as MessageRow[]) || [];
}

export async function insertMessage(input: {
  sessionId: string;
  thread: "stakeholder" | "assistant";
  stakeholderId?: string | null;
  sender: "candidate" | "stakeholder" | "assistant";
  body: string;
  clientMsgId?: string | null;
}): Promise<{ message: MessageRow | null; duplicate: boolean }> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("sim_messages")
    .insert({
      session_id: input.sessionId,
      thread: input.thread,
      stakeholder_id: input.stakeholderId || null,
      sender: input.sender,
      body: input.body,
      client_msg_id: input.clientMsgId || null,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505" && input.clientMsgId) {
      const { data: existing } = await db
        .from("sim_messages")
        .select("*")
        .eq("session_id", input.sessionId)
        .eq("client_msg_id", input.clientMsgId)
        .single();
      return { message: (existing as MessageRow) || null, duplicate: true };
    }
    throw new Error(`Could not send message: ${error.message}`);
  }
  return { message: data as MessageRow, duplicate: false };
}

// ---------------------------------------------------------------------------
// AI interactions
// ---------------------------------------------------------------------------
export async function recordAiInteraction(input: {
  sessionId: string;
  prompt: string;
  response: string;
  contextResourceIds: string[];
}): Promise<string> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from("sim_ai_interactions")
    .insert({
      session_id: input.sessionId,
      prompt: input.prompt,
      response: input.response,
      context_resource_ids: input.contextResourceIds,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not record AI interaction: ${error.message}`);
  return data.id;
}

export async function markAiInserted(
  sessionId: string,
  interactionId: string,
  into: "notes" | "deliverable"
): Promise<void> {
  const db = createAdminSupabaseClient();
  await db
    .from("sim_ai_interactions")
    .update({ inserted_into: into })
    .eq("id", interactionId)
    .eq("session_id", sessionId);
}

// ---------------------------------------------------------------------------
// Curveball
// ---------------------------------------------------------------------------
export async function presentCurveball(sessionId: string): Promise<boolean> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("sim_sessions")
    .update({ curveball_presented_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("curveball_presented_at", null)
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

export async function acknowledgeCurveball(sessionId: string): Promise<void> {
  const db = createAdminSupabaseClient();
  await db
    .from("sim_sessions")
    .update({ curveball_acknowledged_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("curveball_acknowledged_at", null);
}

/**
 * Extend a session's deadline by extraMs (SIM-05 fair response window,
 * SIM-07 outage pause, SCEN-08 accommodations). The reason is recorded as a
 * system event so the extension is auditable. Returns the new ends_at.
 */
export async function extendSessionEndsAt(
  sessionId: string,
  extraMs: number,
  reason: string,
  opts?: { clientEventId?: string; extensionKey?: string }
): Promise<string> {
  if (!Number.isFinite(extraMs) || extraMs <= 0)
    throw new Error("extraMs must be positive");
  const db = createAdminSupabaseClient();
  const { data: session } = await db
    .from("sim_sessions")
    .select("ends_at, status")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session?.ends_at) throw new Error("Session has no deadline to extend");
  if (session.status !== "active") throw new Error("Only active sessions can be extended");
  const newEndsAt = new Date(new Date(session.ends_at).getTime() + extraMs).toISOString();
  const { error } = await db
    .from("sim_sessions")
    .update({ ends_at: newEndsAt })
    .eq("id", sessionId);
  if (error) throw new Error(`Could not extend deadline: ${error.message}`);
  await recordEvent(sessionId, {
    eventType: "deadline_extended",
    actor: "system",
    payload: {
      extraMs,
      reason,
      newEndsAt,
      ...(opts?.extensionKey ? { extensionKey: opts.extensionKey } : {}),
    },
    clientEventId: opts?.clientEventId || `deadline_ext_${sessionId}_${Date.now()}`,
  });
  return newEndsAt;
}

// ---------------------------------------------------------------------------
// Submission (idempotent; snapshot is immutable at the database level)
// ---------------------------------------------------------------------------

/**
 * Best-effort submission notifications. Enqueues the employer "candidate
 * submitted" email for every active org member and the candidate's own
 * "submission received" confirmation. Never throws: a notification failure
 * must not break or delay the submission itself. Idempotent via the outbox's
 * idempotency-key upsert, so duplicate submissions never double-notify.
 */
async function notifySubmissionReceived(args: {
  sessionId: string;
  submissionId: string;
  invitationId: string;
  organizationId: string;
}): Promise<void> {
  try {
    const db = createAdminSupabaseClient();
    const { data: inv } = await db
      .from("sim_invitations")
      .select("candidate_email, candidate_name")
      .eq("id", args.invitationId)
      .maybeSingle();
    if (!inv?.candidate_email) return;

    const { data: org } = await db
      .from("organizations")
      .select("name")
      .eq("id", args.organizationId)
      .maybeSingle();

    const { data: members } = await db
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", args.organizationId)
      .eq("status", "active");
    const userIds = [...new Set((members ?? []).map((m) => m.user_id).filter(Boolean))];
    let employerRecipients: { email: string; name: string | null }[] = [];
    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      employerRecipients = (profiles ?? [])
        .filter((p) => typeof p.email === "string" && p.email.length > 0)
        .map((p) => ({ email: p.email as string, name: (p.full_name as string | null) ?? null }));
    }

    const siteUrl = appUrl();
    const candidateName = inv.candidate_name || inv.candidate_email;
    const companyName = (org?.name as string | undefined) || "";

    for (const recipient of employerRecipients) {
      await enqueueEmail({
        eventType: "employer_session_submitted",
        templateKey: "employer_session_submitted",
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        payload: {
          fullName: candidateName,
          companyName,
          actionUrl: `${siteUrl}/app/employer`,
          siteUrl,
        },
        relatedEntityType: "sim_submission",
        relatedEntityId: args.submissionId,
        idempotencyKey: `submission-employer-notify:${args.submissionId}:${recipient.email.toLowerCase()}`,
        priority: 10,
      });
    }

    await enqueueEmail({
      eventType: "candidate_submission_received",
      templateKey: "candidate_submission_received",
      recipientEmail: inv.candidate_email,
      recipientName: inv.candidate_name,
      payload: { fullName: candidateName, siteUrl },
      relatedEntityType: "sim_submission",
      relatedEntityId: args.submissionId,
      idempotencyKey: `submission-candidate-notify:${args.submissionId}`,
      priority: 10,
    });
  } catch {
    // Notifications are best-effort; the submission already succeeded.
  }
}

export async function submitSession(
  sessionId: string,
  userId: string,
  externalAiDisclosed: boolean
): Promise<{ submissionId: string; alreadySubmitted: boolean }> {
  const db = createAdminSupabaseClient();
  const session = await getSessionForCandidate(sessionId, userId);

  const { data: existing } = await db
    .from("sim_submissions")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) return { submissionId: existing.id, alreadySubmitted: true };

  if (session.status !== "active") throw new Error("Session is not active.");

  const state = await getSessionState(sessionId);
  const messages = await listMessages(sessionId);
  const snapshot = {
    deliverable: state.deliverable,
    notes: state.notes,
    workspace: state.workspace,
    completedTaskIds: state.completed_task_ids,
    messageCount: messages.length,
    submittedRevision: state.revision,
  };

  const { data: sub, error } = await db
    .from("sim_submissions")
    .insert({
      session_id: sessionId,
      snapshot,
      external_ai_disclosed: externalAiDisclosed,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: raced } = await db
        .from("sim_submissions")
        .select("id")
        .eq("session_id", sessionId)
        .single();
      return { submissionId: raced!.id, alreadySubmitted: true };
    }
    throw new Error(`Could not submit: ${error.message}`);
  }

  await db
    .from("sim_sessions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      external_ai_disclosed: externalAiDisclosed,
    })
    .eq("id", sessionId);
  await db
    .from("sim_invitations")
    .update({ status: "completed" })
    .eq("id", session.invitation_id);

  await recordEvent(sessionId, {
    eventType: "submission_confirmed",
    actor: "system",
    clientEventId: `submit_${sessionId}`,
  });

  // Fresh submission only: notify the employer and confirm to the candidate.
  // Best-effort; never blocks the submission response.
  await notifySubmissionReceived({
    sessionId,
    submissionId: sub.id,
    invitationId: session.invitation_id,
    organizationId: session.organization_id,
  });

  return { submissionId: sub.id, alreadySubmitted: false };
}

export async function getTemplateById(templateId: string): Promise<TemplateRow> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from("sim_templates").select("*").eq("id", templateId).maybeSingle();
  if (!data) throw new Error("Template not found");
  return data as TemplateRow;
}

// ---------------------------------------------------------------------------
// File-snapshot submission (W4)
// ---------------------------------------------------------------------------

/**
 * Submit with a full file snapshot (desktop W4 path). The snapshot is
 * validated (every client-claimed hash recomputed server-side), the receipt
 * hash is computed by the server, and everything is stored transactionally
 * via `submit_session_atomic` - all files or none. Idempotent: resubmitting
 * returns the existing submission id and its stored receipt hash.
 *
 * The existing `submitSession()` path is untouched; web candidates never send
 * a fileSnapshot and never reach this function.
 */
export async function submitSessionWithSnapshot(
  sessionId: string,
  userId: string,
  externalAiDisclosed: boolean,
  fileSnapshot: unknown,
  answers?: Record<string, unknown>
): Promise<{ submissionId: string; alreadySubmitted: boolean; receiptHash: string }> {
  if (!isValidFileSnapshotShape(fileSnapshot)) {
    throw new Error("Malformed file snapshot");
  }
  const session = await getSessionForCandidate(sessionId, userId);
  const template = await getTemplateById(session.template_id);
  const scenarioId = scenarioIdForTemplateSlug(template.slug);
  if (!scenarioId) throw new Error("This session has no scenario file package.");
  const pkg = buildScenarioPackage(scenarioId);

  const snap = fileSnapshot as FileSnapshotInput;
  validateFileSnapshot(snap, pkg.scenarioId, pkg.scenarioVersion);
  const receiptHash = computeReceiptHash(sessionId, pkg.scenarioId, pkg.scenarioVersion, snap.manifest);

  const state = await getSessionState(sessionId);
  const messages = await listMessages(sessionId);
  // The client's final answers (handoff text, __aiDisclosure) merge into the
  // deliverable, mirroring the non-snapshot submit path.
  const deliverable =
    answers && typeof answers === "object" && !Array.isArray(answers)
      ? { ...(state.deliverable as Record<string, unknown>), ...answers }
      : state.deliverable;
  const snapshot = buildSubmissionSnapshot({
    deliverable,
    notes: state.notes,
    workspace: state.workspace,
    completedTaskIds: state.completed_task_ids,
    messageCount: messages.length,
    submittedRevision: state.revision,
    fileSnapshot: {
      scenarioId: pkg.scenarioId,
      scenarioVersion: pkg.scenarioVersion,
      files: snap.files,
      manifest: snap.manifest,
    },
    receiptHash,
  });

  const db = createAdminSupabaseClient();
  const { data, error } = await db.rpc("submit_session_atomic", {
    p_session_id: sessionId,
    p_snapshot: snapshot,
    p_disclosed: externalAiDisclosed,
  });
  if (error) throw new Error(`Could not submit file snapshot: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as {
    submission_id?: string;
    already_submitted?: boolean;
    receipt_hash?: string;
  } | null;
  if (!row?.submission_id) throw new Error("Atomic submit returned no submission id");
  const alreadySubmitted = Boolean(row.already_submitted);
  if (!alreadySubmitted) {
    // Fresh submission only: notify the employer and confirm to the candidate.
    // Best-effort; never blocks the submission response.
    await notifySubmissionReceived({
      sessionId,
      submissionId: row.submission_id,
      invitationId: session.invitation_id,
      organizationId: session.organization_id,
    });
  }
  return {
    submissionId: row.submission_id,
    alreadySubmitted,
    receiptHash: row.receipt_hash || receiptHash,
  };
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------
export async function issueCredential(
  sessionId: string
): Promise<{ id: string; credential_number: string }> {
  const db = createAdminSupabaseClient();
  const { data: existing } = await db
    .from("sim_credentials")
    .select("id, credential_number")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing) return existing;

  const { data: session } = await db
    .from("sim_sessions")
    .select("id, candidate_user_id, status")
    .eq("id", sessionId)
    .single();
  if (!session) throw new Error("Session not found");
  if (!["analyzed", "report_ready"].includes(session.status))
    throw new Error("Credential requires completed analysis");

  const number = `FYD-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const { data, error } = await db
    .from("sim_credentials")
    .insert({
      session_id: sessionId,
      candidate_user_id: session.candidate_user_id,
      credential_number: number,
    })
    .select("id, credential_number")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: raced } = await db
        .from("sim_credentials")
        .select("id, credential_number")
        .eq("session_id", sessionId)
        .single();
      return raced!;
    }
    throw new Error(`Could not issue credential: ${error.message}`);
  }
  return data;
}
