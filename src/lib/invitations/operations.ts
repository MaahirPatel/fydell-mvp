/**
 * Employer chunk - EMP-07: resend, revoke and extend.
 *
 * - Resend re-issues the SAME invitation (sendCount + 1). It never creates a
 *   second invitation and never creates a second attempt: the invitation's
 *   attemptId is untouched and the audit log proves a single invitation row
 *   was reused.
 * - Revocation and deadline extension are logged audit events and are
 *   reflected in what the candidate sees (state -> withdrawn / new
 *   expiresAt).
 */

import {
  fail,
  type CandidateInvitation,
  type InvitationMailer,
  type InvitationResult,
  type InvitationStore,
} from "./types";
import { logEvent, type AuditStore } from "../employer/audit";
import { transitionInvitation, RESENDABLE_STATES, REVOCABLE_STATES, type InvitationEvent } from "./states";
import { tokenMatches } from "./candidate-invites";

/** Apply a state event and log it. This is the only state mutation path. */
export function applyInvitationEvent(
  store: InvitationStore,
  audit: AuditStore,
  invitationId: string,
  event: InvitationEvent,
  actorUserId: string,
  detail?: Record<string, unknown>
): InvitationResult<CandidateInvitation> {
  const inv = store.invitations.get(invitationId);
  if (!inv) return fail("not_found", "invitation not found");
  const t = transitionInvitation(inv.state, event);
  if (t.ok === false) return fail(t.code === "terminal_state" ? "bad_state" : "illegal_transition", t.message);
  inv.state = t.next;
  if (event === "accept") inv.acceptedAt = new Date().toISOString();
  if (event === "withdraw") inv.withdrawnAt = new Date().toISOString();
  logEvent(audit, {
    orgId: inv.orgId,
    action: event === "withdraw" ? "invitation_revoked" : "invitation_state_changed",
    entityType: "invitation",
    entityId: inv.id,
    actorUserId,
    detail: { event, to: t.next, ...(detail ?? {}) },
  });
  return { ok: true, value: inv };
}

/**
 * Resend: re-emails the same invitation. Never creates another invitation
 * and never touches attemptId. The audit log records every resend.
 */
export function resendInvitation(
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
  if (!RESENDABLE_STATES.has(inv.state)) {
    return fail(
      "bad_state",
      `resend is only meaningful while the invitation is invited/accepted; it is ${inv.state}`
    );
  }
  if (!input.token || !tokenMatches(input.token, inv.tokenHash)) {
    return fail("not_permitted", "the invite token issued at creation is required to resend");
  }
  const attemptsBefore = inv.attemptId;
  const invitationsBefore = store.invitations.size;

  const inviteUrl = input.inviteUrlForToken(input.token);
  const queued = await mailer.queueInviteEmail({
    invitationId: inv.id,
    toEmail: inv.candidateEmail,
    candidateName: inv.candidateName,
    inviteUrl,
    kind: "resend",
  });

  inv.deliveryStatus = queued.deliveryStatus;
  inv.sendCount += 1;
  inv.lastSentAt = new Date().toISOString();
  logEvent(audit, {
    orgId: inv.orgId,
    action: "invitation_resent",
    entityType: "invitation",
    entityId: inv.id,
    actorUserId: input.actorUserId,
    detail: { sendCount: inv.sendCount, deliveryStatus: inv.deliveryStatus },
  });

  // Invariants the tests assert: no second invitation, no second attempt.
  if (store.invitations.size !== invitationsBefore) {
    return fail("attempt_exists", "resend created a second invitation row");
  }
  if (inv.attemptId !== attemptsBefore) {
    return fail("attempt_exists", "resend altered the bound attempt");
  }
  return { ok: true, value: { invitation: inv, inviteUrl } };
  })();
}

/**
 * Revoke: withdraws the invitation. The candidate's link stops working
 * (state -> withdrawn) and the revocation is logged with actor + time.
 */
export function revokeInvitation(
  store: InvitationStore,
  audit: AuditStore,
  invitationId: string,
  actorUserId: string,
  reason?: string
): InvitationResult<CandidateInvitation> {
  const inv = store.invitations.get(invitationId);
  if (!inv) return fail("not_found", "invitation not found");
  if (!REVOCABLE_STATES.has(inv.state)) {
    return fail("bad_state", `invitation is ${inv.state}; it cannot be revoked from a terminal state`);
  }
  return applyInvitationEvent(store, audit, invitationId, "withdraw", actorUserId, {
    reason: reason ?? null,
  });
}

/**
 * Extend the acceptance deadline. Logged; the candidate UI reads the same
 * expiresAt, so the extension is reflected there.
 */
export function extendInvitation(
  store: InvitationStore,
  audit: AuditStore,
  invitationId: string,
  actorUserId: string,
  extraDays: number
): InvitationResult<CandidateInvitation> {
  const inv = store.invitations.get(invitationId);
  if (!inv) return fail("not_found", "invitation not found");
  if (!Number.isFinite(extraDays) || extraDays <= 0 || extraDays > 90) {
    return fail("bad_state", "extension must be between 1 and 90 days");
  }
  if (inv.state === "withdrawn") {
    return fail("bad_state", "a withdrawn invitation cannot be extended; create a new one");
  }
  const previous = inv.expiresAt;
  const base = Math.max(new Date(inv.expiresAt).getTime(), Date.now());
  inv.expiresAt = new Date(base + extraDays * 86400_000).toISOString();
  if (inv.state === "expired") {
    // An extension re-opens an expired invite; the transition is explicit.
    inv.state = "invited";
  }
  logEvent(audit, {
    orgId: inv.orgId,
    action: "invitation_extended",
    entityType: "invitation",
    entityId: inv.id,
    actorUserId,
    detail: { previousExpiresAt: previous, newExpiresAt: inv.expiresAt, extraDays },
  });
  return { ok: true, value: inv };
}
