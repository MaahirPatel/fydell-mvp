/**
 * Email status ordering, account data export and the sign-in confirmation gate,
 * live against fydell-dev.
 *
 *   npx tsx --conditions react-server --env-file=.env.local scripts/test-account-safety.ts
 *
 * The Resend webhook runs in-process with a generated signing secret. Export and
 * sign-in go through a local server on FYDELL_TEST_BASE_URL (default
 * http://localhost:3000). Against `next dev` sign-in confirms the account for
 * you; against `next start` (production mode) it must refuse until the person
 * confirms. Set FYDELL_EXPECT_CONFIRMATION=true for the latter.
 *
 * No email is sent: the resend endpoint is only exercised with input it rejects
 * before calling the mailer.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "btbmvrvynnrhapjdkunz";
const base = (process.env.FYDELL_TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const expectConfirmation = process.env.FYDELL_EXPECT_CONFIRMATION === "true";
const devUrl = process.env.FYDELL_DEV_SUPABASE_URL;
const devServiceKey = process.env.FYDELL_DEV_SERVICE_ROLE_KEY;

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

if (!devUrl || !devServiceKey) {
  console.log("SKIP account safety: FYDELL_DEV_SUPABASE_URL and FYDELL_DEV_SERVICE_ROLE_KEY are required.");
  process.exit(0);
}
if (hostOf(devUrl) !== `${PROJECT_REF}.supabase.co` || hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL) !== `${PROJECT_REF}.supabase.co`) {
  throw new Error(`Refusing: both Supabase URLs must target ${PROJECT_REF}.`);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error("Refusing: FYDELL_TEST_BASE_URL must be a local server.");

process.env.NEXT_PUBLIC_SUPABASE_URL = devUrl;
process.env.SUPABASE_SERVICE_ROLE_KEY = devServiceKey;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;
delete process.env.RESEND_API_KEY;

const admin = createClient(devUrl, devServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

let failed = 0;
let passed = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
}

const RESTART_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "UND_ERR_SOCKET", "UND_ERR_HEADERS_TIMEOUT"]);
function serverRestarting(err: unknown): boolean {
  if (err instanceof Error && err.name === "TimeoutError") return true;
  const cause = err instanceof Error ? (err.cause as { code?: string } | undefined) : undefined;
  return RESTART_CODES.has(cause?.code ?? "");
}

/** The shared dev server is restarted by a watchdog when it stops responding: wait 60 seconds and retry. */
async function send(url: string, init: RequestInit): Promise<Response> {
  for (let tries = 0; ; tries += 1) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(180000) });
    } catch (err) {
      if (!serverRestarting(err) || tries >= 10) throw err;
      await new Promise((r) => setTimeout(r, 60000));
    }
  }
}

function fakeIp(): string {
  return `10.${(randomBytes(1)[0] % 250) + 1}.${randomBytes(1)[0]}.${randomBytes(1)[0]}`;
}

function cookieHeader(setCookies: string[]): string {
  const jar = new Map<string, string>();
  for (const line of setCookies) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const value = pair.slice(eq + 1).trim();
    if (!value || /max-age=0/i.test(line)) jar.delete(pair.slice(0, eq).trim());
    else jar.set(pair.slice(0, eq).trim(), value);
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

type Login = { status: number; body: Record<string, unknown>; cookie: string };
async function login(email: string, password: string, next?: string): Promise<Login> {
  const res = await send(`${base}/api/platform/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": fakeIp() },
    body: JSON.stringify({ email, password, next }),
    redirect: "manual",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body, cookie: cookieHeader(res.headers.getSetCookie()) };
}

const created: string[] = [];
const outboxIds: string[] = [];
const suppressed: string[] = [];

async function makeUser(label: string, confirmed: boolean): Promise<{ id: string; email: string; password: string }> {
  const email = `safety-${label}-${randomUUID().slice(0, 8)}@example.com`;
  const password = `Pw-${randomBytes(12).toString("hex")}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: confirmed, user_metadata: { full_name: `Safety ${label}` } });
  if (error || !data.user) throw new Error(`could not create a disposable user: ${error?.message}`);
  created.push(data.user.id);
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: data.user.id, email, full_name: `marker-${label}-${data.user.id.slice(0, 8)}` }, { onConflict: "id" });
  if (profileError) throw new Error(`could not write the profile: ${profileError.message}`);
  return { id: data.user.id, email, password };
}

async function emailStatusUnit() {
  console.log("\nEmail status ordering (unit)");
  const { canAdvance, providerStatusFor } = await import("../src/lib/ops/email-status");
  check("sent advances pending", canAdvance("pending", "sent"));
  check("delivered advances sent and delayed", canAdvance("sent", "delivered") && canAdvance("delayed", "delivered"));
  check("late sent does not undo delivered", !canAdvance("delivered", "sent"));
  check("late delayed does not undo delivered", !canAdvance("delivered", "delayed"));
  check("delivered does not undo bounced", !canAdvance("bounced", "delivered"));
  check("bounce follows delivered", canAdvance("delivered", "bounced"));
  check("failed and bounced do not replace each other", !canAdvance("bounced", "failed") && !canAdvance("failed", "bounced"));
  check("a status does not replace itself", !canAdvance("delivered", "delivered"));
  check("unknown events change nothing", providerStatusFor("email.opened") === null);
}

async function resendWebhookOrdering() {
  console.log("\nResend webhook ordering (in-process, fydell-dev)");
  const { signSvix } = await import("../src/lib/security/webhook-signature");
  const secret = `whsec_${randomBytes(24).toString("base64")}`;
  process.env.RESEND_WEBHOOK_SECRET = secret;
  const { POST } = await import("../src/app/api/webhooks/resend/route");

  const messageId = `test_${randomUUID()}`;
  const recipient = `safety-bounce-${randomUUID().slice(0, 8)}@example.com`;
  const { data: row, error } = await admin
    .from("email_outbox")
    .insert({
      event_type: "test.ordering",
      template_key: "test.ordering",
      recipient_email: recipient,
      idempotency_key: `test-ordering-${messageId}`,
      status: "sent",
      provider_message_id: messageId,
    })
    .select("id")
    .single();
  if (error || !row) throw new Error(`could not create an outbox row: ${error?.message}`);
  outboxIds.push(row.id);

  const deliver = async (type: string, offsetSeconds: number) => {
    const body = JSON.stringify({
      id: `evt_${randomUUID()}`,
      type,
      created_at: new Date(Date.now() + offsetSeconds * 1000).toISOString(),
      data: { email_id: messageId, to: [recipient], bounce: { message: "test bounce" } },
    });
    const svixId = `msg_${randomUUID()}`;
    const ts = String(Math.floor(Date.now() / 1000));
    const res = await POST(
      new Request("http://localhost/api/webhooks/resend", {
        method: "POST",
        headers: { "svix-id": svixId, "svix-timestamp": ts, "svix-signature": `v1,${signSvix(secret, svixId, ts, body)}`, "content-type": "application/json" },
        body,
      }),
    );
    const { data } = await admin.from("email_outbox").select("status").eq("id", row.id).single();
    return { http: res.status, status: String(data?.status) };
  };

  let r = await deliver("email.delivered", 2);
  check("delivered moves sent forward", r.http === 200 && r.status === "delivered", `${r.http} ${r.status}`);
  r = await deliver("email.sent", 0);
  check("a late sent leaves it delivered", r.http === 200 && r.status === "delivered", `${r.http} ${r.status}`);
  r = await deliver("email.delivery_delayed", 1);
  check("a late delayed leaves it delivered", r.http === 200 && r.status === "delivered", `${r.http} ${r.status}`);
  r = await deliver("email.bounced", 5);
  suppressed.push(recipient);
  check("a bounce after delivery is recorded", r.http === 200 && r.status === "bounced", `${r.http} ${r.status}`);
  r = await deliver("email.delivered", 3);
  check("a late delivered does not undo the bounce", r.http === 200 && r.status === "bounced", `${r.http} ${r.status}`);
  const { count } = await admin.from("email_events").select("id", { count: "exact", head: true }).eq("provider_message_id", messageId);
  check("every event is still logged", count === 5, `${count} events`);
}

async function accountExport() {
  console.log(`\nAccount export (${base})`);
  const anon = await send(`${base}/api/account/export`, { headers: { "x-forwarded-for": fakeIp() }, redirect: "manual" });
  check("anonymous gets 401", anon.status === 401, String(anon.status));

  const owner = await makeUser("owner", true);
  const other = await makeUser("other", true);
  const session = await login(owner.email, owner.password);
  if (session.status !== 200) throw new Error(`disposable login failed (${session.status})`);

  const res = await send(`${base}/api/account/export`, { headers: { cookie: session.cookie, "x-forwarded-for": fakeIp() }, redirect: "manual" });
  const text = await res.text();
  check("owner gets 200", res.status === 200, String(res.status));
  check("no-store", /no-store/i.test(res.headers.get("cache-control") ?? ""), res.headers.get("cache-control") ?? "none");
  check("downloads as a file", /attachment; filename="fydell-account-\d{4}-\d{2}-\d{2}\.json"/.test(res.headers.get("content-disposition") ?? ""));
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const account = parsed.account as { id?: string; email?: string } | undefined;
  check("export is the caller's account", account?.id === owner.id && account?.email === owner.email);
  check("contains the caller's own profile", text.includes(`marker-owner-${owner.id.slice(0, 8)}`));
  check("contains nothing about another account", !text.includes(other.id) && !text.includes(other.email) && !text.includes("marker-other-"));
  check("no secrets or share tokens", !/token_hash|share_token|password|encrypted/i.test(text));

  const { count: audits } = await admin
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("actor_user_id", owner.id)
    .eq("action", "account.data_exported");
  check("the export is audited", audits === 1, `${audits} rows`);

  // The durable limit counts audit rows, so it holds across server instances.
  const busy = await makeUser("busy", true);
  const since = new Date().toISOString();
  const { error: seedError } = await admin.from("audit_logs").insert(
    Array.from({ length: 5 }, () => ({ actor_user_id: busy.id, action: "account.data_exported", entity_type: "account", entity_id: busy.id, metadata: { seeded: true }, created_at: since })),
  );
  if (seedError) throw new Error(`could not seed audit rows: ${seedError.message}`);
  const busySession = await login(busy.email, busy.password);
  const limited = await send(`${base}/api/account/export`, { headers: { cookie: busySession.cookie, "x-forwarded-for": fakeIp() }, redirect: "manual" });
  check("a sixth export within the hour is refused", limited.status === 429, String(limited.status));
}

async function confirmationGate() {
  console.log(`\nSign-in confirmation gate (${base}, expecting ${expectConfirmation ? "confirmation required" : "auto-confirm"})`);
  const pending = await makeUser("pending", false);
  const res = await login(pending.email, pending.password, "/app/candidate");
  const { data } = await admin.auth.admin.getUserById(pending.id);
  const confirmedNow = Boolean(data.user?.email_confirmed_at);
  if (expectConfirmation) {
    check("unconfirmed sign-in is refused with 403", res.status === 403 && res.body.code === "email_not_confirmed", String(res.status));
    const to = String(res.body.redirectTo ?? "");
    check("points to the check-email page with the address and next", to.startsWith("/auth/check-email?") && to.includes(encodeURIComponent(pending.email)) && to.includes(encodeURIComponent("/app/candidate")), to);
    check("no session cookie is set", !/sb-[^=]+-auth-token/.test(res.cookie));
    check("the account is still unconfirmed", !confirmedNow);
  } else {
    check("outside production sign-in confirms and succeeds", res.status === 200 && confirmedNow, String(res.status));
  }

  const page = await send(`${base}/auth/check-email?email=${encodeURIComponent(pending.email)}`, { redirect: "manual" });
  const html = await page.text();
  check("check-email page renders", page.status === 200 && /Confirm your email/.test(html), String(page.status));
  const bad = await send(`${base}/api/auth/resend-confirmation`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": fakeIp() },
    body: JSON.stringify({ email: "not-an-address" }),
  });
  check("resend rejects a malformed address without sending", bad.status === 400, String(bad.status));
}

async function cleanup() {
  for (const id of outboxIds) await admin.from("email_outbox").delete().eq("id", id);
  for (const email of suppressed) await admin.from("email_suppressions").delete().eq("email", email);
  console.log("\nCleanup SQL for append-only rows (run on fydell-dev):");
  const ids = created.map((id) => `'${id}'`).join(", ");
  console.log(`set session_replication_role = replica;`);
  if (outboxIds.length) console.log(`delete from public.email_events where email_outbox_id in (${outboxIds.map((i) => `'${i}'`).join(", ")}) or provider_message_id like 'test_%';`);
  if (ids) console.log(`delete from public.audit_logs where actor_user_id in (${ids}) or entity_id in (${ids});`);
  console.log(`set session_replication_role = origin;`);
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => undefined);
}

async function main() {
  try {
    await emailStatusUnit();
    await resendWebhookOrdering();
    await accountExport();
    await confirmationGate();
  } finally {
    await cleanup();
  }
  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
