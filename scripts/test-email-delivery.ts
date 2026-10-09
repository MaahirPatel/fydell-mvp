/**
 * Email templates and invite delivery (dev database).
 *
 *   npm run test:email-delivery          uses the key in .env.local, if any
 *   npm run test:email-delivery:no-key   ignores any key
 *
 * Pure checks: every template escapes user-provided values and refuses
 * non-http links; reserved test domains (example.com, .test) are never handed
 * to the provider outside production and are refused in production.
 *
 * Live check, through the real teammate-invite path:
 *  - without a key, the invite is created and reported as not_configured, and
 *    no outbox row claims it was sent
 *  - with a key, the synthetic @example.com recipient is rerouted to Resend's
 *    delivered@resend.dev test inbox and the outbox row moves to sent with a
 *    provider message id. No real person is ever emailed.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

if (process.argv.includes("--no-key")) delete process.env.RESEND_API_KEY;

let failed = 0;
async function check(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL ${name}\n       ${err instanceof Error ? err.message : String(err)}`);
  }
}

const HOSTILE = `<script>alert("x")</script><img src=x onerror='y'>&`;

function assertEscaped(html: string, label: string): void {
  assert.ok(!html.includes("<script>"), `${label}: raw <script> in output`);
  assert.ok(!html.includes("<img src=x"), `${label}: raw <img> in output`);
  assert.ok(html.includes("&lt;script&gt;"), `${label}: value missing or not escaped`);
}

async function pure() {
  const { escapeHtml, safeHref, routeRecipient, isReservedEmailDomain, RESEND_TEST_INBOX } = await import("../src/lib/email-html");
  const email = await import("../src/lib/email");
  const { engInvitationEmailHtml } = await import("../src/lib/eng/invitations");
  const { memberInviteEmailHtml } = await import("../src/lib/eng/members");
  const { invitationEmailCopy } = await import("../src/lib/simulations/invitation-copy");
  const { renderEmailTemplate } = await import("../src/lib/ops/email-outbox");

  console.log("escaping helpers");
  await check("escapeHtml escapes the five HTML metacharacters", () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(42), "42");
  });
  await check("safeHref keeps http, https and mailto and escapes them", () => {
    assert.equal(safeHref("https://a.test/x?y=1&z=2"), "https://a.test/x?y=1&amp;z=2");
    assert.equal(safeHref("http://localhost:3000/invite/abc"), "http://localhost:3000/invite/abc");
    assert.equal(safeHref("mailto:admin@fydell.com"), "mailto:admin@fydell.com");
  });
  await check("safeHref refuses script and data links", () => {
    assert.equal(safeHref("javascript:alert(1)"), "#");
    assert.equal(safeHref(" JavaScript:alert(1)"), "#");
    assert.equal(safeHref("data:text/html,<b>x</b>"), "#");
    assert.equal(safeHref("not a url"), "#");
  });

  console.log("recipient routing");
  await check("reserved domains are recognised", () => {
    for (const e of ["a@example.com", "a@sub.example.org", "a@x.test", "a@host.invalid", "a@localhost"]) assert.ok(isReservedEmailDomain(e), e);
    for (const e of ["a@fydell.com", "delivered@resend.dev", "a@examples.com"]) assert.ok(!isReservedEmailDomain(e), e);
  });
  await check("outside production, reserved domains go to the Resend test inbox", () => {
    assert.deepEqual(routeRecipient("Engineer+walk@Example.com", false), { to: RESEND_TEST_INBOX, redirected: true });
    assert.deepEqual(routeRecipient("delivered@resend.dev", false), { to: "delivered@resend.dev", redirected: false });
  });
  await check("outside production, real addresses go to the Resend test inbox unless allowlisted", () => {
    const saved = process.env.FYDELL_DEV_EMAIL_ALLOWLIST;
    delete process.env.FYDELL_DEV_EMAIL_ALLOWLIST;
    assert.deepEqual(routeRecipient("someone@gmail.com", false), { to: RESEND_TEST_INBOX, redirected: true });
    process.env.FYDELL_DEV_EMAIL_ALLOWLIST = "Owner@Fydell.com, other@fydell.com";
    assert.deepEqual(routeRecipient("owner@fydell.com", false), { to: "owner@fydell.com", redirected: false });
    assert.deepEqual(routeRecipient("someone@gmail.com", false), { to: RESEND_TEST_INBOX, redirected: true });
    if (saved === undefined) delete process.env.FYDELL_DEV_EMAIL_ALLOWLIST;
    else process.env.FYDELL_DEV_EMAIL_ALLOWLIST = saved;
  });
  await check("in production, real addresses pass through", () => {
    assert.deepEqual(routeRecipient("someone@gmail.com", true), { to: "someone@gmail.com", redirected: false });
  });
  await check("in production, reserved domains are refused", () => {
    const route = routeRecipient("a@example.com", true);
    assert.ok("refused" in route);
  });

  console.log("templates");
  await check("legacy simulation invite escapes name, employer and role", () => {
    const html = email.inviteEmailHtml({ name: HOSTILE, employerName: HOSTILE, role: HOSTILE, inviteUrl: "https://a.test/i" });
    assertEscaped(html, "inviteEmailHtml");
  });
  await check("engineering task invite escapes values and refuses a script link", () => {
    const html = engInvitationEmailHtml({
      candidateName: HOSTILE,
      organizationName: HOSTILE,
      roleTitle: HOSTILE,
      taskLine: HOSTILE,
      url: "javascript:alert(1)",
      expiresAt: new Date().toISOString(),
    });
    assertEscaped(html, "engInvitationEmailHtml");
    assert.ok(!html.includes("javascript:"), "script link survived");
  });
  await check("teammate invite escapes workspace, inviter and role", () => {
    const html = memberInviteEmailHtml({ organizationName: HOSTILE, inviterEmail: HOSTILE, roleLabel: HOSTILE, url: "https://a.test/t" });
    assertEscaped(html, "memberInviteEmailHtml");
  });
  await check("simulation invite copy escapes values", () => {
    const { html } = invitationEmailCopy({
      organizationName: HOSTILE,
      candidateName: HOSTILE,
      simulationTitle: HOSTILE,
      roleTitle: HOSTILE,
      durationMinutes: 45,
      requiresDesktop: true,
      inviteUrl: "https://a.test/i",
      expiresAt: new Date().toISOString(),
    });
    assertEscaped(html, "invitationEmailCopy");
  });
  await check("the shared shell and button escape their inputs", () => {
    const html = email.fydellEmailShell(email.emailButton("javascript:x", HOSTILE));
    assertEscaped(html, "emailButton");
    assert.ok(!html.includes("javascript:"), "script link survived");
  });
  await check("outbox templates escape the body and keep subjects plain text", () => {
    const payload = { fullName: HOSTILE, companyName: `Acme\r\nBcc: x@y.z`, roleTitle: HOSTILE, actionUrl: "javascript:x", siteUrl: "https://a.test" };
    for (const key of ["organization_member_invite", "candidate_work_trial_invite", "pilot_request_approved", "admin_new_pilot_request"]) {
      const out = renderEmailTemplate(key, payload);
      assertEscaped(out.html, key);
      assert.ok(!out.html.includes("javascript:"), `${key}: script link survived`);
      assert.ok(!/[\r\n]/.test(out.subject), `${key}: line break in subject`);
    }
  });
}

async function live() {
  const { createAdminSupabaseClient } = await import("../src/lib/supabase/admin");
  const { isResendConfigured } = await import("../src/lib/email");
  const members = await import("../src/lib/eng/members");
  const db = createAdminSupabaseClient();
  const configured = isResendConfigured();
  console.log(`\nteammate invite delivery (${configured ? "Resend key present, sending to delivered@resend.dev" : "no Resend key"})`);

  const { data: org } = await db.from("organizations").select("id, name").order("created_at").limit(1).single();
  if (!org) throw new Error("dev database has no organization to attach test rows to");

  const run = randomBytes(4).toString("hex");
  const created: string[] = [];
  async function account(label: string) {
    const address = `email-delivery-${label}-${run}@example.com`;
    const { data, error } = await db.auth.admin.createUser({ email: address, password: randomBytes(18).toString("base64url"), email_confirm: true });
    if (error || !data.user) throw new Error(`could not create ${label}: ${error?.message}`);
    created.push(data.user.id);
    return { id: data.user.id, email: address };
  }

  const owner = await account("owner");
  const invitee = await account("invitee");
  const actor = { userId: owner.id, email: owner.email, organizationId: org.id as string, organizationName: (org.name as string) || "Test workspace", role: "owner" as const };

  try {
    const result = await members.inviteMember(db, actor, invitee.email, "reviewer");
    const { data: row } = await db
      .from("organization_members")
      .select("id, status, role")
      .eq("organization_id", org.id)
      .eq("user_id", invitee.id)
      .single();

    await check("the invitation row is created whatever happens to the email", () => {
      assert.equal(result.status, "invited");
      assert.equal(row?.status, "invited");
      assert.equal(row?.role, "reviewer");
    });

    const { data: outbox } = await db
      .from("email_outbox")
      .select("status, recipient_email, provider_message_id, template_key, payload")
      .eq("related_entity_type", "organization_member")
      .eq("related_entity_id", row?.id ?? "")
      .order("created_at", { ascending: false });

    if (!configured) {
      await check("without a key the result says not_configured, never sent", () => {
        assert.equal(result.status === "invited" && result.emailDelivery, "not_configured");
      });
      await check("without a key no outbox row claims a send", () => {
        assert.equal((outbox ?? []).length, 0);
      });
    } else {
      await check("with a key the provider accepted the email", () => {
        assert.equal(result.status === "invited" && result.emailDelivery, "sent");
      });
      await check("the outbox row moved to sent with a provider message id", () => {
        const latest = outbox?.[0];
        assert.ok(latest, "no outbox row");
        assert.equal(latest.status, "sent");
        assert.ok(latest.provider_message_id, "no provider message id");
        assert.equal(latest.template_key, "direct:organization_member_invite");
        assert.equal(latest.recipient_email, invitee.email);
        assert.deepEqual(latest.payload, {}, "the body (with its link) must not be stored");
      });
    }

    await check("the invitee is told in the app as well", async () => {
      const { count } = await db.from("user_notifications").select("id", { count: "exact", head: true }).eq("user_id", invitee.id).eq("kind", "invitation_received");
      assert.equal(count, 1);
    });
  } finally {
    await db.from("organization_members").delete().eq("organization_id", org.id).in("user_id", created);
    await db.from("user_notifications").delete().in("user_id", created);
    await db.from("email_outbox").delete().eq("related_entity_type", "organization_member").like("recipient_email", `email-delivery-%-${run}@example.com`);
    for (const id of created) await db.auth.admin.deleteUser(id);
  }
}

async function main() {
  await pure();
  await live();
  console.log(failed === 0 ? "\nAll email delivery checks passed." : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
