/**
 * Email-matched invitations need a confirmed inbox (dev database).
 *
 * Creates throwaway auto-confirmed accounts and invitations, then proves:
 *  - an unverified account cannot accept its own invitation (simulation,
 *    workspace membership, proof link), even though signup auto-confirmed it
 *  - a verified account with a different email cannot accept
 *  - the emailed code verifies the account, and then acceptance works
 *  - codes cannot be reused, guessed past the attempt cap, or used expired
 *  - resend is rate limited, and production never issues an undeliverable code
 *  - the code never appears in a function result
 *
 *   npm run test:invite-verification
 *
 * Email is never sent: the Resend key is removed from this process first.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

delete process.env.RESEND_API_KEY;
const env = process.env as Record<string, string | undefined>;

const TEMPLATE_ID = "7860bd62-6d11-45af-86a8-fcb37494b947";

let failed = 0;
async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL ${name}\n       ${err instanceof Error ? err.message : String(err)}`);
  }
}

const loggedCodes: string[] = [];
const originalInfo = console.info;
console.info = (...args: unknown[]) => {
  const line = args.map(String).join(" ");
  const match = /\[email-verification\].*Code for \S+: (\d{6})/.exec(line);
  if (match) loggedCodes.push(match[1]);
  else originalInfo(...args);
};

async function main() {
  const { createAdminSupabaseClient } = await import("../src/lib/supabase/admin");
  const verification = await import("../src/lib/security/email-verification");
  const sims = await import("../src/lib/simulations/db");
  const members = await import("../src/lib/eng/members");
  const proof = await import("../src/lib/sim-engine/proof/db");
  const db = createAdminSupabaseClient();

  const run = randomBytes(4).toString("hex");
  const created: string[] = [];
  async function account(label: string) {
    const email = `invite-verify-${label}-${run}@example.com`;
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: randomBytes(18).toString("base64url"),
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`could not create ${label}: ${error?.message}`);
    created.push(data.user.id);
    return { id: data.user.id, email };
  }

  async function codeFor(user: { id: string; email: string }) {
    const before = loggedCodes.length;
    const result = await verification.sendInboxCode(user);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(loggedCodes.length, before + 1, "dev code was not written to the server log");
    const code = loggedCodes[loggedCodes.length - 1];
    assert.ok(!JSON.stringify(result).includes(code), "code leaked into the function result");
    return code;
  }

  const { data: org } = await db.from("organizations").select("id").order("created_at").limit(1).single();
  if (!org) throw new Error("dev database has no organization to attach test rows to");

  const invited = await account("invited");
  const other = await account("other");
  const fresh = await account("fresh");
  let invitationId = "";
  let memberRowId = "";
  let proofInviteId = "";

  try {
    const { data: confirmed } = await db.auth.admin.getUserById(invited.id);
    const { invitation, token } = await sims.createInvitation({
      organizationId: org.id as string,
      templateId: TEMPLATE_ID,
      candidateEmail: invited.email,
      candidateName: "Verification test",
      invitedBy: other.id,
      expiresInDays: 1,
    });
    invitationId = invitation.id;

    console.log("unverified accounts");
    await check("auto-confirmed signup is not treated as a verified inbox", async () => {
      assert.ok(confirmed.user?.email_confirmed_at, "expected Supabase auto-confirm");
      assert.equal(await verification.isInboxVerified(invited), false);
    });
    await check("unverified invited account cannot accept by token", async () => {
      await assert.rejects(sims.acceptInvitation(token, invited.id, invited.email), verification.InboxVerificationRequiredError);
    });
    await check("unverified invited account cannot accept by id", async () => {
      await assert.rejects(sims.acceptInvitationById(invitation.id, invited.id, invited.email), verification.InboxVerificationRequiredError);
    });
    await check("no session was created by the refused accepts", async () => {
      const { count } = await db.from("sim_sessions").select("id", { count: "exact", head: true }).eq("invitation_id", invitation.id);
      assert.equal(count, 0);
    });

    console.log("wrong email");
    await check("a verified account with another email cannot accept", async () => {
      const code = await codeFor(other);
      assert.deepEqual(await verification.confirmInboxCode(other, code), { ok: true });
      await assert.rejects(sims.acceptInvitation(token, other.id, other.email), /was sent to/);
    });

    console.log("code flow");
    let invitedCode = "";
    await check("send writes the code to the dev log only", async () => {
      invitedCode = await codeFor(invited);
    });
    await check("a wrong code is refused and counts an attempt", async () => {
      const wrong = invitedCode === "000000" ? "000001" : "000000";
      const result = await verification.confirmInboxCode(invited, wrong);
      assert.deepEqual(result, { ok: false, reason: "wrong_code", attemptsLeft: verification.MAX_CODE_ATTEMPTS - 1 });
    });
    await check("the right code verifies the inbox", async () => {
      assert.deepEqual(await verification.confirmInboxCode(invited, invitedCode), { ok: true });
      assert.equal(await verification.isInboxVerified(invited), true);
    });
    await check("the same code cannot be used twice", async () => {
      assert.deepEqual(await verification.confirmInboxCode(invited, invitedCode), { ok: false, reason: "no_code" });
    });
    await check("verified invited account accepts", async () => {
      const { session } = await sims.acceptInvitation(token, invited.id, invited.email);
      assert.equal(session.candidate_user_id, invited.id);
    });
    await check("the used invitation token cannot be taken by another account", async () => {
      await assert.rejects(sims.acceptInvitation(token, other.id, other.email), /another account|was sent to/);
    });
    await check("sending again after verification reports already verified", async () => {
      assert.deepEqual(await verification.sendInboxCode(invited), { ok: true, delivery: "already_verified" });
    });

    console.log("limits");
    let freshCode = "";
    await check("resend inside the cooldown is refused", async () => {
      freshCode = await codeFor(fresh);
      const again = await verification.sendInboxCode(fresh);
      assert.equal(again.ok, false);
      assert.equal(again.ok === false && again.reason, "cooldown");
    });
    await check("an expired code is refused", async () => {
      const later = new Date(Date.now() + verification.CODE_TTL_MS + 1000);
      assert.deepEqual(await verification.confirmInboxCode(fresh, freshCode, later), { ok: false, reason: "expired" });
    });
    await check("the right code is refused after too many wrong ones", async () => {
      const wrong = freshCode === "999999" ? "999998" : "999999";
      for (let i = 0; i < verification.MAX_CODE_ATTEMPTS; i += 1) await verification.confirmInboxCode(fresh, wrong);
      assert.deepEqual(await verification.confirmInboxCode(fresh, freshCode), { ok: false, reason: "too_many_attempts" });
      assert.equal(await verification.isInboxVerified(fresh), false);
    });
    await check("production without email refuses to issue a code and logs nothing", async () => {
      const before = loggedCodes.length;
      const previous = env.NODE_ENV;
      await db.from("email_verification_codes").delete().eq("user_id", fresh.id);
      env.NODE_ENV = "production";
      try {
        assert.deepEqual(await verification.sendInboxCode(fresh), { ok: false, reason: "email_unavailable" });
      } finally {
        env.NODE_ENV = previous;
      }
      assert.equal(loggedCodes.length, before);
    });

    console.log("workspace membership and proof links");
    await check("unverified account cannot accept a workspace invitation", async () => {
      const { data: row, error } = await db
        .from("organization_members")
        .insert({ organization_id: org.id, user_id: fresh.id, role: "viewer", status: "invited", invited_at: new Date().toISOString() })
        .select("id")
        .single();
      if (error || !row) throw new Error(`could not seed membership: ${error?.message}`);
      memberRowId = row.id as string;
      await assert.rejects(members.acceptMembership(db, fresh, memberRowId), verification.InboxVerificationRequiredError);
      const { data: after } = await db.from("organization_members").select("status").eq("id", memberRowId).single();
      assert.equal(after?.status, "invited");
    });
    await check("proof links: signed out, wrong email, unverified are refused", async () => {
      const invite = await proof.createInvitation({ organizationId: org.id as string, email: fresh.email, createdBy: other.id });
      proofInviteId = invite.id as string;
      const token = invite.token as string;
      assert.deepEqual(await proof.proofInviteAccess(token, null), { state: "sign_in" });
      assert.deepEqual(await proof.proofInviteAccess(token, invited), { state: "wrong_email", inviteEmail: fresh.email });
      assert.deepEqual(await proof.proofInviteAccess(token, fresh), { state: "unverified", email: fresh.email });
      await assert.rejects(proof.startRunFromToken(token, fresh), proof.ProofInviteAccessError);
      const { count } = await db.from("proof_runs").select("id", { count: "exact", head: true }).eq("invitation_id", proofInviteId);
      assert.equal(count, 0);
    });
  } finally {
    if (invitationId) {
      const { data: sessions } = await db.from("sim_sessions").select("id").eq("invitation_id", invitationId);
      const ids = (sessions ?? []).map((s) => s.id as string);
      if (ids.length) {
        await db.from("sim_session_state").delete().in("session_id", ids);
        await db.from("sim_sessions").delete().in("id", ids);
      }
      await db.from("sim_invitations").delete().eq("id", invitationId);
    }
    if (memberRowId) await db.from("organization_members").delete().eq("id", memberRowId);
    if (proofInviteId) await db.from("proof_invitations").delete().eq("id", proofInviteId);
    for (const id of created) await db.auth.admin.deleteUser(id);
  }

  console.info = originalInfo;
  console.log(failed === 0 ? "\nAll invite verification checks passed." : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.info = originalInfo;
  console.error(err);
  process.exit(1);
});
