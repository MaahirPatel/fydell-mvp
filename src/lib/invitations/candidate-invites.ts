/**
 * Employer chunk — EMP-05: invite the right candidate.
 *
 * - Email is validated and normalized at creation.
 * - Duplicate prevention: one active invitation per (org, template, email).
 *   Creating another invite for the same candidate does not create a second
 *   row and must not create a second charge — the existing invitation is
 *   returned with `duplicate: true`.
 * - Creation never sends. Sending is a deliberate, explicit call
 *   (`sendInvitation`) that enqueues the email through the mailer; the
 *   invitation carries a delivery status so the employer sees what happened.
 * - The invite token is hashed before storage; the plaintext token is
 *   returned exactly once (for the copyable secure link).
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  EMAIL_RE,
  createInvitationMemoryStore,
  fail,
  type CandidateInvitation,
  type InvitationMailer,
  type InvitationResult,
  type InvitationStore,
  type PinnedConfig,
} from "./types";
import { logEvent, type AuditStore } from "../employer/audit";
import { pinAssessmentConfig, type VersionRegistry } from "./config-freeze";
import { RESENDABLE_STATES, STATE_MEANING } from "./states";

export { createInvitationMemoryStore };
export type { AuditStore };

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokenMatches(presented: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(presented), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface CreateInviteInput {
  orgId: string;
  templateId: string;
  roleKey: string;
  candidateEmail: string;
  candidateName?: string | null;
  createdBy: string;
  expiresInDays?: number;
  registry: VersionRegistry;
}

export interface CreateInviteValue {
  invitation: CandidateInvitation;
  token: string;
  /** True when an active invitation already covered this candidate. */
  duplicate: boolean;
}

const ACTIVE_STATES = new Set(["draft", "invited", "accepted", "setup", "in_progress"]);

/**
 * Create a candidate invitation. Does NOT send anything: the invitation
 * starts in `draft` with `deliveryStatus: "not_sent"`. Sending requires the
 * deliberate `sendInvitation` call (EMP-05 "deliberate Send action").
 */
export function createCandidateInvitation(
  store: InvitationStore,
  audit: AuditStore,
  input: CreateInviteInput
): InvitationResult<CreateInviteValue> {
  const email = input.candidateEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return fail("invalid_email", `candidate email "${input.candidateEmail}" is not a valid email address`);
  }
  if (!input.templateId) return fail("not_found", "assessment template is required");
  if (!input.roleKey) return fail("not_found", "role key is required");

  // Duplicate prevention: an active invitation for the same candidate +
  // assessment is reused, never duplicated (no duplicate invite charges).
  const existing = [...store.invitations.values()].find(
    (inv) =>
      inv.orgId === input.orgId &&
      inv.templateId === input.templateId &&
      inv.candidateEmail === email &&
      ACTIVE_STATES.has(inv.state)
  );
  if (existing) {
    return {
      ok: true,
      value: { invitation: existing, token: "", duplicate: true },
    };
  }

  const pinned = pinAssessmentConfig(input.registry, input.templateId);
  if (pinned.ok === false) {
    return fail("not_found", pinned.message);
  }

  const token = newToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const invitation: CandidateInvitation = {
    id: `inv-${tokenHash.slice(0, 16)}`,
    orgId: input.orgId,
    templateId: input.templateId,
    roleKey: input.roleKey,
    candidateEmail: email,
    candidateName: input.candidateName?.trim() || null,
    tokenHash,
    state: "draft",
    deliveryStatus: "not_sent",
    pinned: pinned.value,
    expiresAt: new Date(now.getTime() + (input.expiresInDays ?? 14) * 86400_000).toISOString(),
    sendCount: 0,
    lastSentAt: null,
    createdBy: input.createdBy,
    createdAt: now.toISOString(),
    revokedAt: null,
    acceptedAt: null,
    withdrawnAt: null,
    attemptId: null,
  };
  store.invitations.set(invitation.id, invitation);
  logEvent(audit, {
    orgId: input.orgId,
    action: "invitation_created",
    entityType: "invitation",
    entityId: invitation.id,
    actorUserId: input.createdBy,
    detail: {
      candidateEmail: email,
      templateId: input.templateId,
      scenarioVersionId: pinned.value.scenarioVersionId,
      rubricVersionId: pinned.value.rubricVersionId,
    },
  });
  return { ok: true, value: { invitation, token, duplicate: false } };
}

/**
 * Deliberate send: the only path that emails the candidate. The caller
 * passes back the plaintext token issued at creation (only the hash is
 * stored); this keeps the hash-only invariant while letting the route build
 * the copyable secure invite link. Moves the invitation draft -> invited and
 * records delivery status. The invite link is always available to copy even
 * when email is not configured.
 */
export function sendInvitation(
  store: InvitationStore,
  audit: AuditStore,
  mailer: InvitationMailer,
  input: {
    invitationId: string;
    actorUserId: string;
    token: string;
    inviteUrlForToken: (token: string) => string;
  }
): Promise<InvitationResult<{ invitation: CandidateInvitation; inviteUrl: string }>> {
  return (async () => {
  const inv = store.invitations.get(input.invitationId);
  if (!inv) return fail("not_found", "invitation not found");
  if (inv.state !== "draft") {
    return fail("bad_state", `invitation is ${inv.state} (${STATE_MEANING[inv.state]}); only drafts can be sent`);
  }
  if (!input.token || !tokenMatches(input.token, inv.tokenHash)) {
    return fail("not_permitted", "the invite token issued at creation is required to send");
  }
  if (new Date(inv.expiresAt).getTime() <= Date.now()) {
    inv.state = "expired";
    return fail("expired", "invitation expired before it was sent");
  }

  const inviteUrl = input.inviteUrlForToken(input.token);
  const queued = await mailer.queueInviteEmail({
    invitationId: inv.id,
    toEmail: inv.candidateEmail,
    candidateName: inv.candidateName,
    inviteUrl,
    kind: "initial",
  });

  inv.state = "invited";
  inv.deliveryStatus = queued.deliveryStatus;
  inv.sendCount += 1;
  inv.lastSentAt = new Date().toISOString();
  logEvent(audit, {
    orgId: inv.orgId,
    action: "invitation_sent",
    entityType: "invitation",
    entityId: inv.id,
    actorUserId: input.actorUserId,
    detail: { deliveryStatus: inv.deliveryStatus, sendCount: inv.sendCount },
  });
  return { ok: true, value: { invitation: inv, inviteUrl } };
  })();
}

/** Find an invitation by presented token (constant-time). */
export function findInvitationByToken(
  store: InvitationStore,
  token: string
): CandidateInvitation | null {
  for (const inv of store.invitations.values()) {
    if (tokenMatches(token, inv.tokenHash)) return inv;
  }
  return null;
}

export { RESENDABLE_STATES };
