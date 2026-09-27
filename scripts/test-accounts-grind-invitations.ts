/**
 * Accounts grind — secure invitations (AUTH-05).
 *
 * Expiring scoped tokens, deliberate acceptance, revoked/used tokens never
 * reusable, and no silent domain-based membership. In-process with fakes.
 */

import {
  acceptInvitation,
  createInvitation,
  createInvitationMemoryStore,
  previewInvitation,
  revokeInvitation,
} from "../src/lib/orgs/invitations";
import {
  activeMembership,
  addMember,
  createMemoryStore,
  createOrganization,
  removeMember,
  setMemberRole,
} from "../src/lib/orgs/membership";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
    failures += 1;
  }
}
function section(title: string) {
  console.log(`\n${title}`);
}

function setup() {
  const members = createMemoryStore();
  const invites = createInvitationMemoryStore();
  const org = createOrganization(members, "u-owner", { name: "Acme" });
  if (!org.ok) throw new Error("setup failed");
  return { members, invites, orgId: org.value.id };
}

/* Token hygiene ---------------------------------------------------------------- */

section("token hygiene: hashed, single-issue, expiring, scoped");

{
  const { members, invites, orgId } = setup();
  const r = createInvitation(members, invites, "u-owner", orgId, "New@Example.com", "reviewer");
  ok("owner can invite", r.ok);
  if (!r.ok) throw new Error("setup failed");
  const { invitation, token } = r.value;

  ok("email normalized to lowercase", invitation.invitedEmail === "new@example.com");
  ok("scoped to the org", invitation.orgId === orgId);
  ok("scoped to the role", invitation.role === "reviewer");
  ok("token looks random (256-bit base64url)", token.length >= 43);
  ok(
    "plaintext token is never stored",
    ![...invites.invitations.values()].some((inv) =>
      JSON.stringify(inv).includes(token.slice(0, 16))
    ),
    "a database read must never yield a usable token"
  );
  ok("expires in the future", new Date(invitation.expiresAt).getTime() > Date.now());

  // Reviewers cannot invite.
  const r2 = createInvitation(members, invites, "u-owner", orgId, "a@x.com", "reviewer");
  if (!r2.ok) throw new Error("setup failed");
  acceptInvitation(members, invites, "u-reviewer2", "a@x.com", r2.value.token);
  const forbidden = createInvitation(members, invites, "u-reviewer2", orgId, "b@x.com", "reviewer");
  ok("reviewer cannot create invitations", !forbidden.ok && forbidden.code === "not_permitted");
}

/* Deliberate acceptance ---------------------------------------------------------- */

section("deliberate acceptance: no silent membership");

{
  const { members, invites, orgId } = setup();
  const r = createInvitation(members, invites, "u-owner", orgId, "cand@example.com", "reviewer");
  if (!r.ok) throw new Error("setup failed");

  // Merely presenting the token (opening the invite link) creates nothing.
  const preview = previewInvitation(invites, members, r.value.token);
  ok("preview works without auth", preview.ok);
  ok(
    "preview creates no membership",
    activeMembership(members, "u-cand", orgId) === null
  );

  // Deliberate acceptance by the invited address.
  const accepted = acceptInvitation(members, invites, "u-cand", "cand@example.com", r.value.token);
  ok("invited user can accept", accepted.ok);
  if (accepted.ok) {
    ok("membership lands in the invited org", accepted.value.orgId === orgId);
    ok("membership carries the invited role", accepted.value.role === "reviewer");
    ok("membership is active", accepted.value.status === "active");
  }

  // The token is now spent.
  const reuse = acceptInvitation(members, invites, "u-cand", "cand@example.com", r.value.token);
  ok("used token cannot be reused", !reuse.ok && reuse.code === "token_already_used");
}

/* No domain-based membership ------------------------------------------------------- */

section("no silent domain-based membership");

{
  const { members, invites, orgId } = setup();
  const r = createInvitation(members, invites, "u-owner", orgId, "alice@example.com", "reviewer");
  if (!r.ok) throw new Error("setup failed");

  // Same domain, different person: rejected.
  const wrongPerson = acceptInvitation(members, invites, "u-bob", "bob@example.com", r.value.token);
  ok("same-domain stranger is rejected", !wrongPerson.ok && wrongPerson.code === "email_mismatch");
  ok("no membership for the stranger", activeMembership(members, "u-bob", orgId) === null);

  // Case-insensitive match of the exact address still works.
  const rightPerson = acceptInvitation(members, invites, "u-alice", "ALICE@EXAMPLE.COM", r.value.token);
  ok("exact address (any case) is accepted", rightPerson.ok);
}

/* Revocation and expiry ------------------------------------------------------------ */

section("revoked and expired tokens stay dead");

{
  const { members, invites, orgId } = setup();

  const r1 = createInvitation(members, invites, "u-owner", orgId, "gone@example.com", "reviewer");
  if (!r1.ok) throw new Error("setup failed");
  ok("owner can revoke", revokeInvitation(members, invites, "u-owner", r1.value.invitation.id).ok);
  const afterRevoke = acceptInvitation(members, invites, "u-gone", "gone@example.com", r1.value.token);
  ok("revoked token cannot be accepted", !afterRevoke.ok && afterRevoke.code === "token_revoked");

  // Revoking twice is not an error that resurrects anything.
  const r2 = createInvitation(members, invites, "u-owner", orgId, "late@example.com", "reviewer", {
    ttlHours: 0,
  });
  if (!r2.ok) throw new Error("setup failed");
  const expired = acceptInvitation(members, invites, "u-late", "late@example.com", r2.value.token);
  ok("expired token cannot be accepted", !expired.ok && expired.code === "token_expired");

  // Garbage tokens fail closed.
  const garbage = acceptInvitation(members, invites, "u-x", "x@example.com", "not-a-real-token");
  ok("unknown token is rejected", !garbage.ok && garbage.code === "token_not_found");
}

/* ID spoofing ------------------------------------------------------------------------ */

section("invitations cannot be repointed at another org");

{
  const { members, invites, orgId } = setup();
  const other = createOrganization(members, "u-other", { name: "Other Org" });
  if (!other.ok) throw new Error("setup failed");

  const r = createInvitation(members, invites, "u-owner", orgId, "target@example.com", "admin");
  if (!r.ok) throw new Error("setup failed");

  // acceptInvitation takes no org id parameter: the org comes from the
  // stored row. The membership must land in the invited org, never elsewhere.
  const accepted = acceptInvitation(members, invites, "u-target", "target@example.com", r.value.token);
  ok("acceptance succeeds", accepted.ok);
  if (accepted.ok) {
    ok("membership is in the invited org only", accepted.value.orgId === orgId);
    ok(
      "no membership leaks into the other org",
      activeMembership(members, "u-target", other.value.id) === null
    );
  }
}

/* Inviter loses authority -------------------------------------------------------------- */

section("acceptance fails closed when the inviter loses authority");

{
  const { members, invites, orgId } = setup();
  // Owner invites, then ownership transfers and the original owner is removed
  // by the new owner before the invitee accepts.
  const r = createInvitation(members, invites, "u-owner", orgId, "slow@example.com", "reviewer");
  if (!r.ok) throw new Error("setup failed");
  // Simulate: u-owner2 becomes owner, then removes u-owner before the
  // invitee accepts.
  addMember(members, "u-owner", orgId, "u-owner2", "admin");
  setMemberRole(members, "u-owner", orgId, "u-owner2", "owner");
  removeMember(members, "u-owner2", orgId, "u-owner");

  const late = acceptInvitation(members, invites, "u-slow", "slow@example.com", r.value.token);
  ok("acceptance fails closed after inviter removal", !late.ok && late.code === "not_permitted");
  ok("no membership was created", activeMembership(members, "u-slow", orgId) === null);
}

/* Summary -------------------------------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All invitation checks passed.");
