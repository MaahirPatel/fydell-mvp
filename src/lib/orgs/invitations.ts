/**
 * Accounts chunk — secure organization invitations (AUTH-05).
 *
 * - Tokens are 256-bit random values; only a SHA-256 hash is stored, so a
 *   database read never yields a usable token.
 * - Tokens expire (default 72h, configurable) and are single-use: acceptance
 *   stamps `usedAt`, and used/revoked/expired tokens can never be accepted.
 * - Tokens are scoped to one organization + one role + one invited email.
 * - Acceptance is deliberate and explicit: `acceptInvitation` requires the
 *   *authenticated* user's id and email, and the email must match the
 *   invited address. There is no silent membership: no domain-based auto-join
 *   exists anywhere in this module, and merely presenting a token (e.g. by
 *   opening the invite link) never creates a membership — only the explicit
 *   accept call does.
 * - ID spoofing: the org id comes from the stored invitation row, never from
 *   the request; a caller cannot redirect an invite at another organization.
 *
 * The store interface mirrors the membership module so routes can back it
 * with Supabase; tests use the in-memory fake.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  addMember,
  activeMembership,
  type Membership,
  type MembershipStore,
  type OrgRole,
} from "./membership";

export interface Invitation {
  id: string;
  orgId: string;
  role: OrgRole;
  invitedEmail: string; // lowercased at creation
  tokenHash: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
  createdBy: string;
  createdAt: string;
  sendCount: number;
}

export interface InvitationStore {
  invitations: Map<string, Invitation>; // key: tokenHash
  byId: Map<string, Invitation>;
}

export function createInvitationMemoryStore(): InvitationStore {
  return { invitations: new Map(), byId: new Map() };
}

export type InvitationError =
  | "not_permitted"
  | "no_active_membership"
  | "org_not_found"
  | "invalid_email"
  | "invalid_role"
  | "token_not_found"
  | "token_expired"
  | "token_revoked"
  | "token_already_used"
  | "email_mismatch"
  | "already_member";

export type InvitationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: InvitationError; message: string };

function fail<T>(code: InvitationError, message: string): InvitationResult<T> {
  return { ok: false, code, message };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time comparison of a presented token against the stored hash. */
function tokenMatches(presented: string, storedHash: string): boolean {
  const presentedHash = hashToken(presented);
  const a = Buffer.from(presentedHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create an invitation. Only an active owner/admin of the org may invite.
 * Returns the plaintext token exactly once — it is never stored and never
 * returned again (e.g. by a "resend" or "view" path).
 */
export function createInvitation(
  memberStore: MembershipStore,
  inviteStore: InvitationStore,
  createdByUserId: string,
  orgId: string,
  invitedEmail: string,
  role: OrgRole,
  opts?: { ttlHours?: number }
): InvitationResult<{ invitation: Invitation; token: string }> {
  const org = memberStore.organizations.get(orgId);
  if (!org) return fail("org_not_found", "organization not found");
  const caller = activeMembership(memberStore, createdByUserId, orgId);
  if (!caller) return fail("no_active_membership", "caller has no active membership");
  if (caller.role !== "owner" && caller.role !== "admin") {
    return fail("not_permitted", `role ${caller.role} cannot invite members`);
  }
  const email = invitedEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return fail("invalid_email", "invited email is invalid");
  if (!["owner", "admin", "reviewer", "billing"].includes(role)) {
    return fail("invalid_role", `unknown role ${role}`);
  }

  const token = newToken();
  const tokenHash = hashToken(token);
  const ttlHours = opts?.ttlHours ?? 72;
  const id = tokenHash.slice(0, 16);
  const invitation: Invitation = {
    id,
    orgId,
    role,
    invitedEmail: email,
    tokenHash,
    status: "pending",
    expiresAt: new Date(Date.now() + ttlHours * 3600_000).toISOString(),
    createdBy: createdByUserId,
    createdAt: new Date().toISOString(),
    sendCount: 0,
  };
  inviteStore.invitations.set(tokenHash, invitation);
  inviteStore.byId.set(id, invitation);
  return { ok: true, value: { invitation, token } };
}

/**
 * Deliberate acceptance. The caller passes the *authenticated* user's id and
 * email (from the server session). Acceptance requires the email to match
 * the invited address exactly — a different address, even on the same
 * domain, is rejected. There is deliberately no domain-based auto-accept.
 *
 * The organization id and role come from the stored invitation row, never
 * from the request, so a token cannot be repointed at another org.
 */
export function acceptInvitation(
  memberStore: MembershipStore,
  inviteStore: InvitationStore,
  authenticatedUserId: string,
  authenticatedEmail: string,
  token: string
): InvitationResult<Membership> {
  if (!authenticatedUserId) return fail("email_mismatch", "authentication is required");
  const email = authenticatedEmail.trim().toLowerCase();

  const candidate = [...inviteStore.invitations.values()].find((inv) =>
    tokenMatches(token, inv.tokenHash)
  );
  if (!candidate) return fail("token_not_found", "invitation token not recognized");

  if (candidate.status === "revoked" || candidate.revokedAt) {
    return fail("token_revoked", "this invitation was revoked");
  }
  if (candidate.status === "accepted" || candidate.usedAt) {
    return fail("token_already_used", "this invitation was already used");
  }
  if (candidate.status === "expired" || new Date(candidate.expiresAt).getTime() <= Date.now()) {
    candidate.status = "expired";
    return fail("token_expired", "this invitation has expired");
  }
  if (candidate.invitedEmail !== email) {
    // Deliberate: no silent domain-based membership. Same domain is not
    // the same invited person.
    return fail("email_mismatch", "this invitation was sent to a different email address");
  }

  const existing = activeMembership(memberStore, authenticatedUserId, candidate.orgId);
  if (existing) return fail("already_member", "user is already an active member");

  // The org id and role are taken from the invitation row — the request
  // supplies no org id to spoof.
  const added = addMember(
    memberStore,
    candidate.createdBy,
    candidate.orgId,
    authenticatedUserId,
    candidate.role
  );
  if (added.ok === false) {
    // addMember enforces owner/admin on the inviter; the inviter may have
    // been removed since sending. Fail closed.
    return fail("not_permitted", `inviter can no longer add members: ${added.code}`);
  }
  candidate.status = "accepted";
  candidate.usedAt = new Date().toISOString();
  return { ok: true, value: added.value };
}

/** Revoke an invitation (owner/admin). Revoked tokens can never be accepted. */
export function revokeInvitation(
  memberStore: MembershipStore,
  inviteStore: InvitationStore,
  actingUserId: string,
  invitationId: string
): InvitationResult<Invitation> {
  const inv = inviteStore.byId.get(invitationId);
  if (!inv) return fail("token_not_found", "invitation not found");
  const caller = activeMembership(memberStore, actingUserId, inv.orgId);
  if (!caller) return fail("no_active_membership", "caller has no active membership");
  if (caller.role !== "owner" && caller.role !== "admin") {
    return fail("not_permitted", `role ${caller.role} cannot revoke invitations`);
  }
  if (inv.status === "accepted" || inv.usedAt) {
    return fail("token_already_used", "invitation was already used");
  }
  inv.status = "revoked";
  inv.revokedAt = new Date().toISOString();
  return { ok: true, value: inv };
}

/** Read-only preview of an invitation for the "review before accepting" UI. Never returns the token. */
export function previewInvitation(
  inviteStore: InvitationStore,
  memberStore: MembershipStore,
  token: string
): InvitationResult<{ orgName: string; role: OrgRole; invitedEmail: string; expiresAt: string }> {
  const inv = [...inviteStore.invitations.values()].find((i) => tokenMatches(token, i.tokenHash));
  if (!inv) return fail("token_not_found", "invitation token not recognized");
  if (inv.status !== "pending" || new Date(inv.expiresAt).getTime() <= Date.now()) {
    return fail("token_expired", "this invitation is no longer valid");
  }
  const org = memberStore.organizations.get(inv.orgId);
  return {
    ok: true,
    value: {
      orgName: org?.name ?? "Unknown organization",
      role: inv.role,
      invitedEmail: inv.invitedEmail,
      expiresAt: inv.expiresAt,
    },
  };
}
