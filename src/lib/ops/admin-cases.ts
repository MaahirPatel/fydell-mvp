import "server-only";
import { randomBytes } from "node:crypto";
import { hashInviteToken, inviteUrl, INVITE_TTL_DAYS } from "@/lib/eng/invitations";
import { recordEngEvent } from "@/lib/eng/events";
import type { LedgerEntry, LedgerStore } from "@/lib/billing/ledger";
import { ledgerSummary, type LedgerSummary } from "@/lib/billing/ledger";
import { hasPermission, type AdminPermission } from "./admin-permissions";
import { writeAudit, type PlatformAdminContext } from "./platform-roles";
import type { OpsDb } from "./stuck-work";

/**
 * Controlled admin actions that do not fit the stuck-work retry/cancel model:
 * break-glass code access, support incidents, replacement attempts and
 * commercial corrections. Every function re-checks the capability, validates
 * against current state, and writes an audit_logs row. None of them edits a
 * submission, an evidence record or a released report.
 */

export type CaseResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function deny<T>(status: number, error: string): CaseResult<T> {
  return { ok: false, status, error };
}

function allowed(actor: PlatformAdminContext, permission: AdminPermission): boolean {
  return hasPermission(actor.roles, permission);
}

function cleanText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Break-glass access to a candidate's submitted code
// ---------------------------------------------------------------------------

export const CODE_ACCESS_MAX_MINUTES = 60;

export type CodeAccessGrant = {
  id: string;
  adminEmail: string;
  resourceId: string;
  justification: string;
  grantedAt: string;
  expiresAt: string;
};

type GrantRow = {
  id: string;
  admin_email: string;
  resource_id: string;
  justification: string;
  granted_at: string;
  expires_at: string;
  revoked_at: string | null;
};

function toGrant(row: GrantRow): CodeAccessGrant {
  return {
    id: row.id,
    adminEmail: row.admin_email,
    resourceId: row.resource_id,
    justification: row.justification,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
  };
}

/** The caller's own unexpired, unrevoked grant for one attempt, if any. */
export async function activeCodeAccess(db: OpsDb, actor: PlatformAdminContext, attemptId: string): Promise<CodeAccessGrant | null> {
  if (!allowed(actor, "private_code.break_glass") || !isUuid(attemptId)) return null;
  const { data, error } = await db
    .from("admin_access_grants")
    .select("id, admin_email, resource_id, justification, granted_at, expires_at, revoked_at")
    .eq("scope", "eng_attempt_code")
    .eq("resource_id", attemptId)
    .eq("admin_email", actor.email.toLowerCase())
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not read access grants: ${error.message}`);
  return data ? toGrant(data as GrantRow) : null;
}

export async function grantCodeAccess(
  db: OpsDb,
  actor: PlatformAdminContext,
  input: { attemptId: unknown; justification: unknown; minutes: unknown },
): Promise<CaseResult<CodeAccessGrant>> {
  if (!allowed(actor, "private_code.break_glass")) return deny(403, "Your role cannot open a candidate's code.");
  if (!isUuid(input.attemptId)) return deny(400, "Choose an attempt by id.");
  const justification = cleanText(input.justification, 20, 1000);
  if (!justification) return deny(400, "Explain why you need the code in at least 20 characters. The reason is kept in the audit log.");
  const minutes = input.minutes === undefined ? 30 : Number(input.minutes);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > CODE_ACCESS_MAX_MINUTES) {
    return deny(400, `Access lasts between 5 and ${CODE_ACCESS_MAX_MINUTES} minutes.`);
  }
  const { data: attempt } = await db.from("eng_attempts").select("id, organization_id, status").eq("id", input.attemptId).maybeSingle();
  if (!attempt) return deny(404, "Attempt not found.");

  const existing = await activeCodeAccess(db, actor, input.attemptId);
  if (existing) return { ok: true, value: existing };

  const grantedAt = new Date();
  const expiresAt = new Date(grantedAt.getTime() + minutes * 60000);
  const { data, error } = await db
    .from("admin_access_grants")
    .insert({
      admin_user_id: actor.userId,
      admin_email: actor.email.toLowerCase(),
      scope: "eng_attempt_code",
      resource_id: input.attemptId,
      justification,
      granted_at: grantedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id, admin_email, resource_id, justification, granted_at, expires_at, revoked_at")
    .single();
  if (error || !data) throw new Error(`Could not record the access grant: ${error?.message ?? "no row"}`);
  await writeAudit({
    actorEmail: actor.email,
    actorUserId: actor.userId,
    action: "admin.code_access.granted",
    entityType: "eng_attempt",
    entityId: input.attemptId,
    organizationId: (attempt.organization_id as string) ?? null,
    after: { grantId: data.id, expiresAt: expiresAt.toISOString() },
    metadata: { justification, minutes, source: actor.source },
  });
  return { ok: true, value: toGrant(data as GrantRow) };
}

export async function revokeCodeAccess(db: OpsDb, actor: PlatformAdminContext, grantId: unknown): Promise<CaseResult<{ revoked: boolean }>> {
  if (!allowed(actor, "private_code.break_glass")) return deny(403, "Your role cannot manage code access.");
  if (!isUuid(grantId)) return deny(400, "Choose a grant by id.");
  const { data, error } = await db
    .from("admin_access_grants")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", grantId)
    .eq("admin_email", actor.email.toLowerCase())
    .is("revoked_at", null)
    .select("id, resource_id")
    .maybeSingle();
  if (error) throw new Error(`Could not revoke: ${error.message}`);
  if (data) {
    await writeAudit({
      actorEmail: actor.email,
      actorUserId: actor.userId,
      action: "admin.code_access.revoked",
      entityType: "eng_attempt",
      entityId: data.resource_id as string,
      metadata: { grantId },
    });
  }
  return { ok: true, value: { revoked: Boolean(data) } };
}

/** Every read under a grant is recorded, so the audit shows what was opened, not just that access existed. */
export async function recordCodeRead(actor: PlatformAdminContext, grant: CodeAccessGrant, path: string): Promise<void> {
  await writeAudit({
    actorEmail: actor.email,
    actorUserId: actor.userId,
    action: "admin.code_access.read",
    entityType: "eng_attempt",
    entityId: grant.resourceId,
    metadata: { grantId: grant.id, path: path.slice(0, 300) },
  });
}

// ---------------------------------------------------------------------------
// Support incidents
// ---------------------------------------------------------------------------

export const INCIDENT_SUBJECTS = ["eng_attempt", "eng_evaluation_run", "passport_import_job", "organization", "account"] as const;
export type IncidentSubject = (typeof INCIDENT_SUBJECTS)[number];
export const INCIDENT_KINDS = [
  "runtime_failure",
  "evaluation_failure",
  "upload_failure",
  "import_failure",
  "delivery_failure",
  "account_access",
  "billing",
  "other",
] as const;
export type IncidentKind = (typeof INCIDENT_KINDS)[number];
export const INCIDENT_STATUSES = ["open", "investigating", "confirmed_platform_fault", "not_platform_fault", "resolved"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

const INCIDENT_NEXT: Record<IncidentStatus, readonly IncidentStatus[]> = {
  open: ["investigating", "confirmed_platform_fault", "not_platform_fault"],
  investigating: ["confirmed_platform_fault", "not_platform_fault"],
  confirmed_platform_fault: ["resolved"],
  not_platform_fault: ["resolved", "investigating"],
  resolved: [],
};

export type IncidentRow = {
  id: string;
  subject_type: IncidentSubject;
  subject_id: string;
  organization_id: string | null;
  kind: IncidentKind;
  summary: string;
  status: IncidentStatus;
  opened_by_email: string;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

const INCIDENT_COLUMNS =
  "id, subject_type, subject_id, organization_id, kind, summary, status, opened_by_email, reviewed_by_email, reviewed_at, review_notes, created_at, updated_at";

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

async function subjectOrganization(db: OpsDb, subject: IncidentSubject, id: string): Promise<{ exists: boolean; organizationId: string | null }> {
  switch (subject) {
    case "eng_attempt": {
      const { data } = await db.from("eng_attempts").select("organization_id").eq("id", id).maybeSingle();
      return { exists: Boolean(data), organizationId: (data?.organization_id as string | undefined) ?? null };
    }
    case "eng_evaluation_run": {
      const { data } = await db.from("eng_evaluation_runs").select("attempt_id").eq("id", id).maybeSingle();
      if (!data) return { exists: false, organizationId: null };
      const { data: attempt } = await db.from("eng_attempts").select("organization_id").eq("id", data.attempt_id as string).maybeSingle();
      return { exists: true, organizationId: (attempt?.organization_id as string | undefined) ?? null };
    }
    case "passport_import_job": {
      const { data } = await db.from("durable_jobs").select("id").eq("id", id).eq("job_type", "passport_import").maybeSingle();
      return { exists: Boolean(data), organizationId: null };
    }
    case "organization": {
      const { data } = await db.from("organizations").select("id").eq("id", id).maybeSingle();
      return { exists: Boolean(data), organizationId: data ? id : null };
    }
    case "account": {
      const { data } = await db.auth.admin.getUserById(id);
      return { exists: Boolean(data?.user), organizationId: null };
    }
  }
}

export async function openIncident(
  db: OpsDb,
  actor: PlatformAdminContext,
  input: { subjectType: unknown; subjectId: unknown; kind: unknown; summary: unknown },
): Promise<CaseResult<IncidentRow>> {
  if (!allowed(actor, "incident.review")) return deny(403, "Your role cannot open incidents.");
  if (!isOneOf(INCIDENT_SUBJECTS, input.subjectType)) return deny(400, "Choose what the incident is about.");
  if (!isUuid(input.subjectId)) return deny(400, "Give the subject's id.");
  if (!isOneOf(INCIDENT_KINDS, input.kind)) return deny(400, "Choose the kind of incident.");
  const summary = cleanText(input.summary, 10, 1000);
  if (!summary) return deny(400, "Describe the incident in 10 to 1000 characters.");
  const subject = await subjectOrganization(db, input.subjectType, input.subjectId);
  if (!subject.exists) return deny(404, "That subject does not exist.");
  const { data, error } = await db
    .from("support_incidents")
    .insert({
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      organization_id: subject.organizationId,
      kind: input.kind,
      summary,
      opened_by: actor.userId,
      opened_by_email: actor.email,
    })
    .select(INCIDENT_COLUMNS)
    .single();
  if (error || !data) throw new Error(`Could not open the incident: ${error?.message ?? "no row"}`);
  await writeAudit({
    actorEmail: actor.email,
    actorUserId: actor.userId,
    action: "admin.incident.opened",
    entityType: "support_incident",
    entityId: data.id as string,
    organizationId: subject.organizationId,
    after: { status: "open", kind: input.kind, subjectType: input.subjectType, subjectId: input.subjectId },
  });
  return { ok: true, value: data as IncidentRow };
}

/** Moves an incident one step. Compare-and-set on the status the reviewer saw, so two reviewers cannot both decide. */
export async function reviewIncident(
  db: OpsDb,
  actor: PlatformAdminContext,
  input: { incidentId: unknown; expectedStatus: unknown; status: unknown; notes: unknown },
): Promise<CaseResult<IncidentRow>> {
  if (!allowed(actor, "incident.review")) return deny(403, "Your role cannot review incidents.");
  if (!isUuid(input.incidentId)) return deny(400, "Choose an incident by id.");
  if (!isOneOf(INCIDENT_STATUSES, input.expectedStatus) || !isOneOf(INCIDENT_STATUSES, input.status)) {
    return deny(400, "Give the current and the new status.");
  }
  const notes = cleanText(input.notes, 10, 2000);
  if (!notes) return deny(400, "Record what you found in 10 to 2000 characters.");
  if (!INCIDENT_NEXT[input.expectedStatus].includes(input.status)) {
    return deny(409, `An incident cannot move from ${input.expectedStatus.replace(/_/g, " ")} to ${input.status.replace(/_/g, " ")}.`);
  }
  const reviewedAt = new Date().toISOString();
  const { data, error } = await db
    .from("support_incidents")
    .update({ status: input.status, review_notes: notes, reviewed_by: actor.userId, reviewed_by_email: actor.email, reviewed_at: reviewedAt })
    .eq("id", input.incidentId)
    .eq("status", input.expectedStatus)
    .select(INCIDENT_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`Could not update the incident: ${error.message}`);
  if (!data) return deny(409, "The incident changed since you loaded it. Reload and review again.");
  await writeAudit({
    actorEmail: actor.email,
    actorUserId: actor.userId,
    action: "admin.incident.reviewed",
    entityType: "support_incident",
    entityId: input.incidentId,
    organizationId: (data.organization_id as string | null) ?? null,
    before: { status: input.expectedStatus },
    after: { status: input.status },
    metadata: { notes },
  });
  return { ok: true, value: data as IncidentRow };
}

// ---------------------------------------------------------------------------
// Replacement attempts
// ---------------------------------------------------------------------------

const REPLACEABLE_ATTEMPT_STATUSES = ["expired", "withdrawn"] as const;

export type ReplacementGrant = { invitationId: string; url: string; expiresAt: string; duplicate: boolean };

/**
 * Grants a fresh attempt after a confirmed platform fault ended the original
 * one. The original attempt and everything it produced stay exactly as they
 * are; the original invitation is only linked to its replacement. One
 * replacement per attempt, enforced by a unique key. No email is sent: the
 * admin passes the link on through the support conversation.
 */
export async function grantReplacementAttempt(
  db: OpsDb,
  actor: PlatformAdminContext,
  input: { attemptId: unknown; incidentId: unknown; reason: unknown },
): Promise<CaseResult<ReplacementGrant>> {
  if (!allowed(actor, "attempt.grant")) return deny(403, "Your role cannot grant replacement attempts.");
  if (!isUuid(input.attemptId) || !isUuid(input.incidentId)) return deny(400, "Give the attempt and the incident ids.");
  const reason = cleanText(input.reason, 10, 1000);
  if (!reason) return deny(400, "Give a reason of 10 to 1000 characters.");

  const { data: prior } = await db
    .from("eng_attempt_replacements")
    .select("replacement_invitation_id")
    .eq("original_attempt_id", input.attemptId)
    .maybeSingle();
  if (prior) {
    const { data: inv } = await db.from("eng_invitations").select("id, expires_at").eq("id", prior.replacement_invitation_id as string).maybeSingle();
    return deny(409, `A replacement was already granted for this attempt (invitation ${String(inv?.id ?? prior.replacement_invitation_id).slice(0, 8)}). Its link cannot be shown again; resend it from the employer workspace if it was lost.`);
  }

  const { data: incident } = await db.from("support_incidents").select("id, status, subject_type, subject_id").eq("id", input.incidentId).maybeSingle();
  if (!incident) return deny(404, "Incident not found.");
  if (incident.subject_type !== "eng_attempt" || incident.subject_id !== input.attemptId) {
    return deny(409, "The incident must be about this attempt.");
  }
  if (incident.status !== "confirmed_platform_fault") {
    return deny(409, "Review the incident and confirm a platform fault before granting a replacement.");
  }

  const { data: attempt } = await db.from("eng_attempts").select("id, status, invitation_id, organization_id").eq("id", input.attemptId).maybeSingle();
  if (!attempt) return deny(404, "Attempt not found.");
  if (!(REPLACEABLE_ATTEMPT_STATUSES as readonly string[]).includes(attempt.status as string)) {
    return deny(
      409,
      attempt.status === "submitted"
        ? "This attempt was submitted. Retry its evaluation instead; a submitted attempt is never replaced."
        : "The attempt is still open. Extend its time from the employer workspace, or wait until it ends.",
    );
  }

  const { data: original } = await db.from("eng_invitations").select("*").eq("id", attempt.invitation_id as string).maybeSingle();
  if (!original) return deny(404, "The original invitation is missing.");
  const originalStatus = original.status as string;

  if (originalStatus === "invited" || originalStatus === "accepted") {
    const { error: closeError } = await db
      .from("eng_invitations")
      .update({ status: "expired" })
      .eq("id", original.id as string)
      .eq("status", originalStatus);
    if (closeError) throw new Error(`Could not close the original invitation: ${closeError.message}`);
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400000).toISOString();
  const { data: created, error: createError } = await db
    .from("eng_invitations")
    .insert({
      organization_id: original.organization_id,
      role_id: original.role_id,
      scenario_version_id: original.scenario_version_id,
      candidate_email: original.candidate_email,
      candidate_name: original.candidate_name,
      candidate_handle: original.candidate_handle ?? null,
      token_hash: hashInviteToken(token),
      status: "invited",
      email_delivery: "not_configured",
      role_snapshot: original.role_snapshot,
      allowed_minutes: original.allowed_minutes,
      expires_at: expiresAt,
      invited_by: null,
      is_preview: false,
      hiring_role_id: original.hiring_role_id ?? null,
      application_id: original.application_id ?? null,
      deadline_timezone: original.deadline_timezone ?? null,
      evidence_gap: original.evidence_gap ?? null,
    })
    .select("id")
    .single();
  if (createError || !created) {
    throw new Error(`Could not create the replacement invitation: ${createError?.message ?? "no row"}`);
  }

  const { error: linkError } = await db.from("eng_attempt_replacements").insert({
    original_attempt_id: input.attemptId,
    replacement_invitation_id: created.id,
    incident_id: input.incidentId,
    reason,
    granted_by: actor.userId,
    granted_by_email: actor.email,
  });
  if (linkError) {
    // Lost a race with another admin: withdraw the invitation this request made.
    await db.from("eng_invitations").update({ status: "withdrawn", withdrawn_at: new Date().toISOString() }).eq("id", created.id as string);
    if (linkError.code === "23505") return deny(409, "Another admin granted a replacement for this attempt a moment ago.");
    throw new Error(`Could not record the replacement: ${linkError.message}`);
  }
  await db.from("eng_invitations").update({ replaced_by: created.id }).eq("id", original.id as string);

  await recordEngEvent(db, input.attemptId, {
    type: "replacement_granted",
    actor: "reviewer",
    actorEmail: actor.email,
    payload: { replacementInvitationId: created.id as string, incidentId: input.incidentId },
    clientEventId: `replacement_${input.attemptId}`,
  });
  await writeAudit({
    actorEmail: actor.email,
    actorUserId: actor.userId,
    action: "admin.attempt.replacement_granted",
    entityType: "eng_attempt",
    entityId: input.attemptId,
    organizationId: (attempt.organization_id as string) ?? null,
    before: { attemptStatus: attempt.status, invitationStatus: originalStatus },
    after: { replacementInvitationId: created.id, invitationStatus: originalStatus === "invited" || originalStatus === "accepted" ? "expired" : originalStatus },
    metadata: { incidentId: input.incidentId, reason },
  });
  return { ok: true, value: { invitationId: created.id as string, url: inviteUrl(token), expiresAt, duplicate: false } };
}

// ---------------------------------------------------------------------------
// Commercial records: append-only ledger corrections
// ---------------------------------------------------------------------------

type LedgerRow = {
  id: string;
  organization_id: string;
  entry_type: LedgerEntry["entryType"];
  quantity: number | string;
  amount_cents: number;
  currency: string;
  idempotency_key: string;
  reason: string;
  actor: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

function fromLedgerRow(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    entryType: row.entry_type,
    quantity: Number(row.quantity),
    amountCents: row.amount_cents,
    currency: row.currency,
    idempotencyKey: row.idempotency_key,
    reason: row.reason,
    actor: row.actor,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    createdAt: row.created_at,
  };
}

/** billing_ledger_entries behind the LedgerStore interface. Entries are never updated or deleted. */
export function createSupabaseLedgerStore(db: OpsDb): LedgerStore {
  return {
    async append(entry) {
      const { data, error } = await db
        .from("billing_ledger_entries")
        .insert({
          organization_id: entry.organizationId,
          entry_type: entry.entryType,
          quantity: entry.quantity,
          amount_cents: entry.amountCents,
          currency: entry.currency,
          idempotency_key: entry.idempotencyKey,
          reason: entry.reason,
          actor: entry.actor,
          period_start: entry.periodStart,
          period_end: entry.periodEnd,
        })
        .select("*")
        .single();
      if (error?.code === "23505") {
        const { data: existing, error: readError } = await db
          .from("billing_ledger_entries")
          .select("*")
          .eq("idempotency_key", entry.idempotencyKey)
          .single();
        if (readError || !existing) throw new Error("Could not read the existing ledger entry.");
        return fromLedgerRow(existing as LedgerRow);
      }
      if (error || !data) throw new Error(`Could not append to the ledger: ${error?.message ?? "no row"}`);
      return fromLedgerRow(data as LedgerRow);
    },
    async hasIdempotencyKey(key) {
      const { data } = await db.from("billing_ledger_entries").select("id").eq("idempotency_key", key).maybeSingle();
      return Boolean(data);
    },
    async list(organizationId) {
      const { data, error } = await db
        .from("billing_ledger_entries")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(`Could not read the ledger: ${error.message}`);
      return ((data ?? []) as LedgerRow[]).map(fromLedgerRow);
    },
  };
}

export type CommercialCorrection = { entry: LedgerEntry; summary: LedgerSummary; duplicate: boolean };

/**
 * Corrects an organization's commercial record by appending a credit or a
 * signed adjustment. Earlier entries are never edited; the summary is always
 * recomputed from the full history.
 */
export async function correctCommercialRecord(
  db: OpsDb,
  actor: PlatformAdminContext,
  input: { organizationId: unknown; entryType: unknown; quantity: unknown; reason: unknown; idempotencyKey: unknown },
): Promise<CaseResult<CommercialCorrection>> {
  if (!allowed(actor, "commercial.edit")) return deny(403, "Your role cannot change commercial records.");
  if (!isUuid(input.organizationId)) return deny(400, "Choose an organization by id.");
  if (input.entryType !== "credit" && input.entryType !== "adjustment") return deny(400, "A correction is a credit or an adjustment.");
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity === 0 || Math.abs(quantity) > 1000) return deny(400, "Quantity must be a non-zero whole number up to 1000.");
  if (input.entryType === "credit" && quantity < 0) return deny(400, "A credit is positive. Use an adjustment to reduce.");
  const reason = cleanText(input.reason, 10, 500);
  if (!reason) return deny(400, "Give a reason of 10 to 500 characters.");
  if (typeof input.idempotencyKey !== "string" || !/^[A-Za-z0-9:_-]{8,120}$/.test(input.idempotencyKey)) {
    return deny(400, "Missing or malformed idempotency key.");
  }
  const { data: org } = await db.from("organizations").select("id").eq("id", input.organizationId).maybeSingle();
  if (!org) return deny(404, "Organization not found.");

  const store = createSupabaseLedgerStore(db);
  const key = `admin_correction:${input.idempotencyKey}`;
  const duplicate = await store.hasIdempotencyKey(key);
  const before = await ledgerSummary(store, input.organizationId);
  const entry = await store.append({
    organizationId: input.organizationId,
    entryType: input.entryType,
    quantity,
    amountCents: 0,
    currency: "usd",
    idempotencyKey: key,
    reason,
    actor: actor.email,
    periodStart: null,
    periodEnd: null,
  });
  if (entry.organizationId !== input.organizationId) return deny(409, "This idempotency key was already used for another organization.");
  const summary = await ledgerSummary(store, input.organizationId);
  if (!duplicate) {
    await writeAudit({
      actorEmail: actor.email,
      actorUserId: actor.userId,
      action: "admin.commercial.corrected",
      entityType: "billing_ledger_entries",
      entityId: entry.id,
      organizationId: input.organizationId,
      before: { remaining: before.remaining, credited: before.credited, adjusted: before.adjusted },
      after: { remaining: summary.remaining, credited: summary.credited, adjusted: summary.adjusted },
      metadata: { entryType: input.entryType, quantity, reason },
    });
  }
  return { ok: true, value: { entry, summary, duplicate } };
}

// ---------------------------------------------------------------------------
// Safe diagnostics
// ---------------------------------------------------------------------------

export type Diagnostics = Record<string, string | number | boolean | null>;

/**
 * Operational facts about one piece of work: states, counts, timestamps and
 * error codes. Never file contents, messages, answers or report text.
 */
export async function diagnose(db: OpsDb, actor: PlatformAdminContext, subjectType: unknown, subjectId: unknown): Promise<CaseResult<Diagnostics>> {
  if (!allowed(actor, "ops.view")) return deny(403, "Your role cannot run diagnostics.");
  if (!isUuid(subjectId)) return deny(400, "Give an id.");
  if (subjectType === "eng_attempt") {
    const { data: a } = await db
      .from("eng_attempts")
      .select("id, status, organization_id, allowed_minutes, extension_minutes, started_at, due_at, submitted_at, created_at")
      .eq("id", subjectId)
      .maybeSingle();
    if (!a) return deny(404, "Attempt not found.");
    const [{ count: uploads }, { data: runs }, { count: reports }, { data: replacement }, { count: incidents }] = await Promise.all([
      db.from("eng_uploads").select("id", { count: "exact", head: true }).eq("attempt_id", subjectId),
      db
        .from("eng_evaluation_runs")
        .select("status, attempt_count, last_error_code, lease_expires_at")
        .eq("attempt_id", subjectId)
        .order("created_at", { ascending: false })
        .limit(1),
      db.from("eng_reports").select("id", { count: "exact", head: true }).eq("attempt_id", subjectId),
      db.from("eng_attempt_replacements").select("replacement_invitation_id").eq("original_attempt_id", subjectId).maybeSingle(),
      db.from("support_incidents").select("id", { count: "exact", head: true }).eq("subject_type", "eng_attempt").eq("subject_id", subjectId),
    ]);
    const run = runs?.[0];
    return {
      ok: true,
      value: {
        status: a.status as string,
        organizationId: a.organization_id as string,
        allowedMinutes: a.allowed_minutes as number,
        extensionMinutes: a.extension_minutes as number,
        startedAt: (a.started_at as string | null) ?? null,
        dueAt: (a.due_at as string | null) ?? null,
        submittedAt: (a.submitted_at as string | null) ?? null,
        uploads: uploads ?? 0,
        latestRunStatus: (run?.status as string | undefined) ?? null,
        latestRunTries: (run?.attempt_count as number | undefined) ?? null,
        latestRunError: (run?.last_error_code as string | undefined) ?? null,
        latestRunLeaseExpiresAt: (run?.lease_expires_at as string | undefined) ?? null,
        reportVersions: reports ?? 0,
        incidents: incidents ?? 0,
        replacementInvitationId: (replacement?.replacement_invitation_id as string | undefined) ?? null,
      },
    };
  }
  if (subjectType === "passport_import_job") {
    const { data: j } = await db
      .from("durable_jobs")
      .select("state, stage, attempt_count, max_attempts, error_code, retryable, created_at, heartbeat_at, next_attempt_at, finished_at, cancel_requested_at")
      .eq("id", subjectId)
      .eq("job_type", "passport_import")
      .maybeSingle();
    if (!j) return deny(404, "Import not found.");
    return {
      ok: true,
      value: {
        state: j.state as string,
        stage: (j.stage as string | null) ?? null,
        attempts: j.attempt_count as number,
        maxAttempts: j.max_attempts as number,
        errorCode: (j.error_code as string | null) ?? null,
        retryable: (j.retryable as boolean | null) ?? null,
        createdAt: j.created_at as string,
        heartbeatAt: (j.heartbeat_at as string | null) ?? null,
        nextAttemptAt: (j.next_attempt_at as string | null) ?? null,
        finishedAt: (j.finished_at as string | null) ?? null,
        cancelRequested: Boolean(j.cancel_requested_at),
      },
    };
  }
  return deny(400, "Diagnostics cover engineering attempts and import jobs.");
}
