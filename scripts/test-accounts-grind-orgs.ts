/**
 * Accounts grind — organization workspaces and membership.
 *
 * AUTH-03 (workspace creation never trusts browser org IDs), AUTH-04 (member
 * permissions: owner/admin/reviewer/billing), AUTH-06 (removal immediately
 * revokes API/file/report access, including previously opened sessions),
 * plus the org-isolation half of E2E-09.
 *
 * In-process against the in-memory store: no Supabase, no network.
 */

import {
  activeMembership,
  addMember,
  canAccessBilling,
  canAccessHiringWork,
  canManageMembership,
  createMemoryStore,
  createOrganization,
  issueSession,
  isSessionValid,
  listMembers,
  orgsForUser,
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

/* AUTH-03 ------------------------------------------------------------------ */

section("AUTH-03: employer workspace creation");

{
  const store = createMemoryStore();
  const r = createOrganization(store, "user-creator", { name: "Acme Health" });
  ok("creates an organization", r.ok);
  if (r.ok) {
    ok("server generates the org id", typeof r.value.id === "string" && r.value.id.length > 0);
    ok("creator becomes owner", activeMembership(store, "user-creator", r.value.id)?.role === "owner");
    ok("membership is active immediately", activeMembership(store, "user-creator", r.value.id)?.status === "active");
  }

  // ID spoofing: even if a hostile client smuggles an `id` into the payload,
  // createOrganization has no such input — it is ignored, never honored.
  const spoofed = createOrganization(store, "user-attacker", {
    name: "Evil Org",
    id: "org-acme",
  } as unknown as { name: string });
  ok("client-supplied org id is ignored", spoofed.ok && spoofed.value.id !== "org-acme");

  const nameless = createOrganization(store, "user-x", { name: "   " });
  ok("empty name is rejected", !nameless.ok && nameless.code === "name_required");

  const anon = createOrganization(store, "", { name: "Ghost" });
  ok("unauthenticated creation is rejected", !anon.ok && anon.code === "not_authenticated");
}

/* AUTH-04 ------------------------------------------------------------------ */

section("AUTH-04: member permissions");

{
  const store = createMemoryStore();
  const org = createOrganization(store, "u-owner", { name: "Northline" });
  if (!org.ok) throw new Error("setup failed");
  const orgId = org.value.id;

  // A stranger with no membership cannot act on the org at all.
  const strangerAdd = addMember(store, "u-stranger", orgId, "u-victim", "admin");
  ok("stranger cannot add members", !strangerAdd.ok && strangerAdd.code === "no_active_membership");

  const strangerRemove = removeMember(store, "u-stranger", orgId, "u-owner");
  ok("stranger cannot remove members", !strangerRemove.ok);

  // Owner adds an admin, a reviewer and a billing member.
  ok("owner adds admin", addMember(store, "u-owner", orgId, "u-admin", "admin").ok);
  ok("owner adds reviewer", addMember(store, "u-owner", orgId, "u-reviewer", "reviewer").ok);
  ok("owner adds billing member", addMember(store, "u-owner", orgId, "u-billing", "billing").ok);

  // Admin can manage membership too.
  ok("admin adds reviewer", addMember(store, "u-admin", orgId, "u-reviewer2", "reviewer").ok);

  // Reviewer and billing cannot manage membership.
  const rAdd = addMember(store, "u-reviewer", orgId, "u-x", "reviewer");
  ok("reviewer cannot add members", !rAdd.ok && rAdd.code === "not_permitted");
  const bAdd = addMember(store, "u-billing", orgId, "u-y", "reviewer");
  ok("billing member cannot add members", !bAdd.ok && bAdd.code === "not_permitted");
  const rRemove = removeMember(store, "u-reviewer", orgId, "u-reviewer2");
  ok("reviewer cannot remove members", !rRemove.ok && rRemove.code === "not_permitted");

  // Role capability table.
  ok("owner manages membership", canManageMembership("owner"));
  ok("admin manages membership", canManageMembership("admin"));
  ok("reviewer does not manage membership", !canManageMembership("reviewer"));
  ok("billing does not manage membership", !canManageMembership("billing"));
  ok("owner/admin/reviewer access hiring work", canAccessHiringWork("owner") && canAccessHiringWork("admin") && canAccessHiringWork("reviewer"));
  ok("billing does not access hiring work", !canAccessHiringWork("billing"));
  ok("only billing accesses billing", canAccessBilling("billing") && !canAccessBilling("owner") && !canAccessBilling("admin") && !canAccessBilling("reviewer"));

  // Last-owner protection.
  const demoteLast = setMemberRole(store, "u-owner", orgId, "u-owner", "reviewer");
  ok("cannot demote the last owner", !demoteLast.ok && demoteLast.code === "cannot_change_last_owner");
  const removeLast = removeMember(store, "u-owner", orgId, "u-owner");
  ok("cannot remove the last owner", !removeLast.ok && removeLast.code === "cannot_remove_last_owner");

  // Promote the admin to owner, then the original owner can step down.
  ok("admin promoted to owner", setMemberRole(store, "u-owner", orgId, "u-admin", "owner").ok);
  ok("original owner can now be demoted", setMemberRole(store, "u-admin", orgId, "u-owner", "reviewer").ok);

  // Reviewers see only their own org's member list through the gate, and
  // orgsForUser never leaks other orgs.
  const other = createOrganization(store, "u-other-owner", { name: "Meridian" });
  if (!other.ok) throw new Error("setup failed");
  const mine = orgsForUser(store, "u-reviewer");
  ok("orgsForUser returns only member orgs", mine.length === 1 && mine[0].id === orgId);
  ok("member list is org-scoped", listMembers(store, other.value.id).every((m) => m.orgId === other.value.id));
}

/* AUTH-06 ------------------------------------------------------------------ */

section("AUTH-06: removal immediately revokes access");

{
  const store = createMemoryStore();
  const org = createOrganization(store, "u-owner", { name: "Acme" });
  if (!org.ok) throw new Error("setup failed");
  const orgId = org.value.id;
  addMember(store, "u-owner", orgId, "u-member", "reviewer");

  const s1 = issueSession(store, "u-member", orgId);
  const s2 = issueSession(store, "u-member", orgId);
  ok("sessions issue for active members", s1.ok && s2.ok);
  if (s1.ok) ok("session valid before removal", isSessionValid(store, s1.value.sessionId));

  const removed = removeMember(store, "u-owner", orgId, "u-member");
  ok("member removed", removed.ok);

  if (s1.ok && s2.ok) {
    ok("previously opened session 1 revoked", !isSessionValid(store, s1.value.sessionId));
    ok("previously opened session 2 revoked", !isSessionValid(store, s2.value.sessionId));
  }
  ok("membership no longer active", activeMembership(store, "u-member", orgId) === null);
  ok("no new session can be issued", !issueSession(store, "u-member", orgId).ok);

  // The owner's own session is untouched.
  const ownerSession = issueSession(store, "u-owner", orgId);
  ok("owner session unaffected", ownerSession.ok && isSessionValid(store, ownerSession.value.sessionId));
}

/* E2E-09 (org isolation half) ------------------------------------------------- */

section("E2E-09: cross-organization isolation");

{
  const store = createMemoryStore();
  const a = createOrganization(store, "emp-a", { name: "Org A" });
  const b = createOrganization(store, "emp-b", { name: "Org B" });
  if (!a.ok || !b.ok) throw new Error("setup failed");

  // emp-a tries to operate inside org B by naming its id.
  ok(
    "employer A cannot add members to org B",
    !addMember(store, "emp-a", b.value.id, "emp-a-friend", "admin").ok
  );
  ok(
    "employer A cannot remove org B members",
    !removeMember(store, "emp-a", b.value.id, "emp-b").ok
  );
  ok(
    "employer A cannot change roles in org B",
    !setMemberRole(store, "emp-a", b.value.id, "emp-b", "reviewer").ok
  );
  ok("employer A has no membership in org B", activeMembership(store, "emp-a", b.value.id) === null);
  ok(
    "employer A sees only org A",
    orgsForUser(store, "emp-a").length === 1 && orgsForUser(store, "emp-a")[0].id === a.value.id
  );
}

/* Summary -------------------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All organization/membership checks passed.");
