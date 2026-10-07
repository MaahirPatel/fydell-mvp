/**
 * Employer chunk - candidate assessment invitations.
 *
 * This namespace covers assessment invitations to *candidates* (EMP-05/06/07),
 * distinct from `src/lib/orgs/invitations.ts` (accounts chunk: invitations to
 * join an organization as a member). Assessment invitations pin a frozen
 * scenario/rubric configuration (see config-freeze.ts) and move through the
 * employer operational state machine (see states.ts).
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Canonical operational states (EMP-06). Meanings live in states.ts. */
export type InvitationState =
  | "draft"
  | "invited"
  | "accepted"
  | "setup"
  | "in_progress"
  | "submitted"
  | "evaluating"
  | "review_required"
  | "ready"
  | "expired"
  | "withdrawn";

export type DeliveryStatus =
  | "not_sent" // draft: created but never sent
  | "queued" // deliberate send happened; email job queued
  | "sent" // mail provider accepted
  | "delivered" // provider delivery confirmation
  | "failed" // delivery failed; copyable link remains available
  | "link_only"; // email not configured; invite link is the delivery channel

/** Frozen assessment configuration pinned to an invitation (EMP-03). */
export interface PinnedConfig {
  templateId: string;
  scenarioVersionId: string;
  rubricVersionId: string;
  pinnedAt: string;
}

export interface CandidateInvitation {
  id: string;
  orgId: string;
  templateId: string;
  roleKey: string;
  candidateEmail: string;
  candidateName: string | null;
  tokenHash: string;
  state: InvitationState;
  deliveryStatus: DeliveryStatus;
  pinned: PinnedConfig;
  expiresAt: string;
  sendCount: number;
  lastSentAt: string | null;
  createdBy: string;
  createdAt: string;
  revokedAt: string | null;
  acceptedAt: string | null;
  withdrawnAt: string | null;
  /** Id of the attempt bound to this invitation (at most one ever). */
  attemptId: string | null;
}

export interface InvitationStore {
  invitations: Map<string, CandidateInvitation>;
}

export function createInvitationMemoryStore(): InvitationStore {
  return { invitations: new Map() };
}

export type InvitationErrorCode =
  | "invalid_email"
  | "duplicate"
  | "not_found"
  | "not_permitted"
  | "bad_state"
  | "illegal_transition"
  | "already_sent"
  | "expired"
  | "revoked"
  | "no_attempt"
  | "attempt_exists";

export type InvitationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: InvitationErrorCode; message: string };

export function fail<T>(code: InvitationErrorCode, message: string): InvitationResult<T> {
  return { ok: false, code, message };
}

/** Email-delivery abstraction. Tests inject a fake; routes inject the outbox. */
export interface QueuedInviteEmail {
  queued: boolean;
  deliveryStatus: DeliveryStatus;
  error?: string;
}

export interface InvitationMailer {
  queueInviteEmail(input: {
    invitationId: string;
    toEmail: string;
    candidateName: string | null;
    inviteUrl: string;
    kind: "initial" | "resend";
  }): QueuedInviteEmail | Promise<QueuedInviteEmail>;
}
