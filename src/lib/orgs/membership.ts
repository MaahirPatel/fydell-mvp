/**
 * Accounts chunk — organization workspaces and membership (AUTH-03/04/06).
 *
 * Server-side only. The browser never supplies an organization id that is
 * trusted: `createOrganization` generates the id itself, and every other
 * operation takes the caller's authenticated user id plus a target org id
 * and then verifies an *active membership* from the store before doing
 * anything. There is deliberately no function that creates a membership
 * from a bare org id + user id without an authorization check.
 *
 * Roles (AUTH-04): owner, admin, reviewer, billing.
 * - owner/admin: manage membership (invite, change roles, remove).
 * - owner only: delete the workspace, transfer ownership.
 * - reviewer: access permitted hiring work only (no membership management,
 *   no billing).
 * - billing: explicit billing access only; owner/admin do NOT inherit it.
 *
 * AUTH-06: removal is immediate. `removeMember` flips the membership to
 * "removed", stamps `revokedAt`, and revokes every session the member holds
 * for that org. Access checks must consult `isSessionValid` / the membership
 * status; both are false/denied from the moment of removal.
 *
 * The store is an interface so routes can back it with Supabase while tests
 * use the in-memory fake. IDs are generated server-side with crypto UUIDs.
 */

import { randomUUID } from "node:crypto";

export type OrgRole = "owner" | "admin" | "reviewer" | "billing";
export type MembershipStatus = "invited" | "active" | "suspended" | "removed";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: "pending" | "active" | "suspended" | "archived";
  createdBy: string;
  createdAt: string;
}

export interface Membership {
  orgId: string;
  userId: string;
  role: OrgRole;
  status: MembershipStatus;
  invitedBy?: string;
  invitedAt?: string;
  joinedAt?: string;
  revokedAt?: string;
}

export interface OrgSession {
  sessionId: string;
  orgId: string;
  userId: string;
  issuedAt: string;
  revokedAt?: string;
}

export interface AuditEvent {
  at: string;
  actorUserId: string;
  orgId: string;
  action: string;
  detail?: string;
}

export interface MembershipStore {
  organizations: Map<string, Organization>;
  memberships: Map<string, Membership>; // key: `${orgId}:${userId}`
  sessions: Map<string, OrgSession>;
  audit: AuditEvent[];
}

export function createMemoryStore(): MembershipStore {
  return { organizations: new Map(), memberships: new Map(), sessions: new Map(), audit: [] };
}

function membershipKey(orgId: string, userId: string): string {
  return `${orgId}:${userId}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function audit(store: MembershipStore, actorUserId: string, orgId: string, action: string, detail?: string) {
  store.audit.push({ at: nowIso(), actorUserId, orgId, action, detail });
}

export type MembershipError =
  | "name_required"
  | "not_authenticated"
  | "org_not_found"
  | "no_active_membership"
  | "not_permitted"
  | "member_not_found"
  | "cannot_remove_last_owner"
  | "cannot_change_last_owner"
  | "invalid_role";

export type Result<T> = { ok: true; value: T } | { ok: false; code: MembershipError; message: string };

function fail<T>(code: MembershipError, message: string): Result<T> {
  return { ok: false, code, message };
}

/* Role capabilities -------------------------------------------------------- */

export const MEMBERSHIP_MANAGERS: readonly OrgRole[] = ["owner", "admin"];
export const HIRING_WORK_ROLES: readonly OrgRole[] = ["owner", "admin", "reviewer"];
export const BILLING_ROLES: readonly OrgRole[] = ["billing"];

export function canManageMembership(role: OrgRole): boolean {
  return MEMBERSHIP_MANAGERS.includes(role);
}
export function canAccessHiringWork(role: OrgRole): boolean {
  return HIRING_WORK_ROLES.includes(role);
}
export function canAccessBilling(role: OrgRole): boolean {
  return BILLING_ROLES.includes(role);
}

/* Reads -------------------------------------------------------------------- */

/** Server-side membership lookup. Returns null for anything but active. */
export function activeMembership(
  store: MembershipStore,
  userId: string,
  orgId: string
): Membership | null {
  const m = store.memberships.get(membershipKey(orgId, userId));
  if (!m || m.status !== "active") return null;
  return m;
}

/** Any membership row regardless of status (for admin views / audits). */
export function membershipRow(
  store: MembershipStore,
  userId: string,
  orgId: string
): Membership | null {
  return store.memberships.get(membershipKey(orgId, userId)) ?? null;
}

export function listMembers(store: MembershipStore, orgId: string): Membership[] {
  return [...store.memberships.values()].filter((m) => m.orgId === orgId);
}

export function orgsForUser(store: MembershipStore, userId: string): Organization[] {
  const orgIds = new Set(
    [...store.memberships.values()]
      .filter((m) => m.userId === userId && m.status === "active")
      .map((m) => m.orgId)
  );
  return [...orgIds]
    .map((id) => store.organizations.get(id))
    .filter((o): o is Organization => !!o);
}

/* Writes ------------------------------------------------------------------- */

/**
 * AUTH-03: create an employer workspace. The caller supplies only a name
 * (and optional slug); the organization id is generated server-side. Any
 * `id` the client may have sent is not part of the input type and is
 * ignored — there is no code path that lets the browser pick or claim an
 * organization id.
 */
export function createOrganization(
  store: MembershipStore,
  creatorUserId: string,
  input: { name: string; slug?: string }
): Result<Organization> {
  if (!creatorUserId) return fail("not_authenticated", "a signed-in user is required");
  const name = (input.name || "").trim();
  if (!name) return fail("name_required", "organization name is required");

  const id = randomUUID();
  const slugBase = (input.slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  let slug = slugBase || `org-${id.slice(0, 8)}`;
  let n = 1;
  const taken = new Set([...store.organizations.values()].map((o) => o.slug));
  while (taken.has(slug)) slug = `${slugBase}-${++n}`;

  const org: Organization = {
    id,
    name,
    slug,
    status: "active",
    createdBy: creatorUserId,
    createdAt: nowIso(),
  };
  store.organizations.set(id, org);
  store.memberships.set(membershipKey(id, creatorUserId), {
    orgId: id,
    userId: creatorUserId,
    role: "owner",
    status: "active",
    joinedAt: nowIso(),
  });
  audit(store, creatorUserId, id, "organization.created", `name=${name}`);
  return { ok: true, value: org };
}

function requireManager(
  store: MembershipStore,
  actingUserId: string,
  orgId: string
): Result<Membership> {
  const org = store.organizations.get(orgId);
  if (!org) return fail("org_not_found", "organization not found");
  const m = activeMembership(store, actingUserId, orgId);
  if (!m) return fail("no_active_membership", "caller has no active membership in this organization");
  if (!canManageMembership(m.role)) {
    return fail("not_permitted", `role ${m.role} cannot manage membership`);
  }
  return { ok: true, value: m };
}

function assertValidRole(role: string): role is OrgRole {
  return (["owner", "admin", "reviewer", "billing"] as const).includes(role as OrgRole);
}

/**
 * Add a member (owner/admin only). Used after a secure invitation is
 * accepted — see src/lib/orgs/invitations.ts. Direct adds are still gated
 * on the caller's active owner/admin membership.
 */
export function addMember(
  store: MembershipStore,
  actingUserId: string,
  orgId: string,
  targetUserId: string,
  role: OrgRole
): Result<Membership> {
  const gate = requireManager(store, actingUserId, orgId);
  if (!gate.ok) return gate;
  if (!assertValidRole(role)) return fail("invalid_role", `unknown role ${role}`);
  if (!targetUserId) return fail("member_not_found", "target user is required");

  const key = membershipKey(orgId, targetUserId);
  const existing = store.memberships.get(key);
  if (existing && existing.status === "active") {
    return fail("not_permitted", "user is already an active member");
  }
  const m: Membership = {
    orgId,
    userId: targetUserId,
    role,
    status: "active",
    invitedBy: actingUserId,
    invitedAt: nowIso(),
    joinedAt: nowIso(),
  };
  store.memberships.set(key, m);
  audit(store, actingUserId, orgId, "member.added", `user=${targetUserId} role=${role}`);
  return { ok: true, value: m };
}

export function setMemberRole(
  store: MembershipStore,
  actingUserId: string,
  orgId: string,
  targetUserId: string,
  role: OrgRole
): Result<Membership> {
  const gate = requireManager(store, actingUserId, orgId);
  if (!gate.ok) return gate;
  if (!assertValidRole(role)) return fail("invalid_role", `unknown role ${role}`);
  const key = membershipKey(orgId, targetUserId);
  const m = store.memberships.get(key);
  if (!m || m.status !== "active") return fail("member_not_found", "active member not found");

  if (m.role === "owner" && role !== "owner") {
    const owners = listMembers(store, orgId).filter(
      (x) => x.role === "owner" && x.status === "active" && x.userId !== targetUserId
    );
    if (owners.length === 0) {
      return fail("cannot_change_last_owner", "cannot demote the last owner");
    }
  }
  m.role = role;
  audit(store, actingUserId, orgId, "member.role_changed", `user=${targetUserId} role=${role}`);
  return { ok: true, value: m };
}

/**
 * AUTH-06: removal takes effect immediately. The membership row is flipped
 * to "removed" (never deleted, for the audit trail), `revokedAt` is stamped,
 * and every session the member holds for this org is revoked at the same
 * instant — including sessions opened before the removal.
 */
export function removeMember(
  store: MembershipStore,
  actingUserId: string,
  orgId: string,
  targetUserId: string
): Result<{ revokedSessions: number }> {
  const gate = requireManager(store, actingUserId, orgId);
  if (!gate.ok) return gate;
  const key = membershipKey(orgId, targetUserId);
  const m = store.memberships.get(key);
  if (!m || m.status !== "active") return fail("member_not_found", "active member not found");

  if (m.role === "owner") {
    const owners = listMembers(store, orgId).filter(
      (x) => x.role === "owner" && x.status === "active" && x.userId !== targetUserId
    );
    if (owners.length === 0) {
      return fail("cannot_remove_last_owner", "cannot remove the last owner");
    }
  }

  const at = nowIso();
  m.status = "removed";
  m.revokedAt = at;

  let revokedSessions = 0;
  for (const s of store.sessions.values()) {
    if (s.orgId === orgId && s.userId === targetUserId && !s.revokedAt) {
      s.revokedAt = at;
      revokedSessions += 1;
    }
  }
  audit(
    store,
    actingUserId,
    orgId,
    "member.removed",
    `user=${targetUserId} sessions_revoked=${revokedSessions}`
  );
  return { ok: true, value: { revokedSessions } };
}

/* Sessions (AUTH-06: previously opened sessions lose access) ------------------ */

export function issueSession(
  store: MembershipStore,
  userId: string,
  orgId: string
): Result<OrgSession> {
  const m = activeMembership(store, userId, orgId);
  if (!m) return fail("no_active_membership", "no active membership to issue a session for");
  const s: OrgSession = {
    sessionId: randomUUID(),
    orgId,
    userId,
    issuedAt: nowIso(),
  };
  store.sessions.set(s.sessionId, s);
  return { ok: true, value: s };
}

/** False after removal — this is the check API/file/report routes consult. */
export function isSessionValid(store: MembershipStore, sessionId: string): boolean {
  const s = store.sessions.get(sessionId);
  if (!s || s.revokedAt) return false;
  // Belt and suspenders: a session for a membership that is no longer active
  // is invalid even if the session row itself was missed.
  return activeMembership(store, s.userId, s.orgId) !== null;
}
