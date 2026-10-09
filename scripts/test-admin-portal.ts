/**
 * Admin portal actions, live against fydell-dev through a local server.
 *
 * Synthetic platform admins (admin, operator, support) are created as normal
 * Supabase users with platform_user_roles rows and sign in through the real
 * login endpoint. They then run every controlled action over HTTP: diagnostics,
 * incident review with compare-and-set, a replacement attempt after a confirmed
 * platform fault, justified code access, an idempotent commercial correction
 * and an ops action, and the database is checked after each one. Everything
 * created is removed at the end.
 *
 *   npx tsx --conditions react-server --env-file=.env.local scripts/test-admin-portal.ts
 *
 * Needs `npm run dev` on FYDELL_TEST_BASE_URL (default http://localhost:3000).
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const PROJECT_REF = "btbmvrvynnrhapjdkunz";
const base = (process.env.FYDELL_TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const devUrl = process.env.FYDELL_DEV_SUPABASE_URL;
const devServiceKey = process.env.FYDELL_DEV_SERVICE_ROLE_KEY;
const devDbUrl = process.env.FYDELL_DEV_DB_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

if (!devUrl || !devServiceKey || !anonKey) {
  console.log("SKIP admin portal: FYDELL_DEV_SUPABASE_URL, FYDELL_DEV_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
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

type Json = Record<string, unknown>;
type Session = { email: string; userId: string; cookie: string; token: string; redirectTo: string };
type Reply = { status: number; text: string; json: Json; location: string };

let passed = 0;
const failures: string[] = [];
function check(label: string, ok: boolean, detail = "") {
  if (ok) passed += 1;
  else failures.push(`${label}${detail ? ` (${detail})` : ""}`);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
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

async function http(method: string, route: string, who: Session | null, opts: { body?: unknown; bearer?: boolean } = {}): Promise<Reply> {
  const headers: Record<string, string> = { "x-forwarded-for": fakeIp(), origin: base };
  if (who && opts.bearer) headers.authorization = `Bearer ${who.token}`;
  else if (who) headers.cookie = who.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const res = await send(`${base}${route}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    redirect: "manual",
    signal: AbortSignal.timeout(180000),
  });
  const text = await res.text();
  let json: Json = {};
  if ((res.headers.get("content-type") ?? "").includes("application/json")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (parsed && typeof parsed === "object") json = parsed as Json;
    } catch {
      json = {};
    }
  }
  return { status: res.status, text, json, location: res.headers.get("location") ?? "" };
}

function cookieHeader(setCookies: string[]): string {
  const jar = new Map<string, string>();
  for (const line of setCookies) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (!value || /max-age=0/i.test(line)) jar.delete(name);
    else jar.set(name, value);
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function login(email: string, password: string, userId: string): Promise<Session> {
  const res = await send(`${base}/api/platform/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": fakeIp() },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
    signal: AbortSignal.timeout(120000),
  });
  const body = (await res.json().catch(() => ({}))) as Json;
  if (res.status !== 200) throw new Error(`login failed for a disposable account (${res.status})`);
  const cookie = cookieHeader(res.headers.getSetCookie());
  const client = createClient(devUrl!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`token sign-in failed for a disposable account: ${error?.message}`);
  return { email, userId, cookie, token: data.session.access_token, redirectTo: String(body.redirectTo ?? "") };
}

function result(reply: Reply): Json {
  const r = reply.json.result;
  return r && typeof r === "object" ? (r as Json) : {};
}

function pageOk(reply: Reply): boolean {
  return reply.status === 200 && !/Application error|Something went wrong|Internal Server Error/i.test(reply.text);
}

async function waitForServer() {
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/login`, { signal: AbortSignal.timeout(60000) });
      if (res.status === 200) return;
    } catch {
      // Still compiling or restarting.
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`No server answering on ${base}.`);
}

async function main() {
  await waitForServer();
  const { engAdmin } = await import("../src/lib/eng/context");
  const roles = await import("../src/lib/eng/roles");
  const invitations = await import("../src/lib/eng/invitations");
  type EngMember = import("../src/lib/eng/context").EngMember;

  const db = engAdmin();
  const tag = randomBytes(4).toString("hex");
  const marker = `PORTAL-${tag}`;
  const password = `${randomBytes(18).toString("base64url")}Aa1!`;
  const names = ["admin", "operator", "support", "emp", "cand"] as const;
  type Who = (typeof names)[number];
  const emails = Object.fromEntries(names.map((n) => [n, `portal-${tag}-${n}@example.com`])) as Record<Who, string>;
  const ids = {} as Record<Who, string>;

  try {
    for (const n of names) {
      const { data, error } = await db.auth.admin.createUser({ email: emails[n], password, email_confirm: true });
      if (error || !data.user) throw new Error(`could not create disposable user: ${error?.message}`);
      ids[n] = data.user.id;
    }
    await db.from("email_inbox_verifications").insert({ user_id: ids.cand, email: emails.cand, method: "dev_backfill" });
    for (const who of ["admin", "operator", "support"] as const) {
      const { error } = await db.from("platform_user_roles").insert({ user_id: ids[who], role: who, is_active: true });
      if (error) throw new Error(`could not grant a synthetic platform role: ${error.message}`);
    }
    const { data: org, error: orgError } = await db
      .from("organizations")
      .insert({ name: `Portal ${tag}`, owner_id: ids.emp, owner_email: emails.emp, created_by: ids.emp })
      .select("id, name")
      .single();
    if (orgError || !org) throw new Error(`could not create org: ${orgError?.message}`);
    await db.from("organization_members").insert({ organization_id: org.id, user_id: ids.emp, role: "owner", status: "active", joined_at: new Date().toISOString() });
    const member: EngMember = { userId: ids.emp, email: emails.emp, organizationId: org.id as string, organizationName: org.name as string, role: "owner" };
    const draft = await roles.createRole(db, member, {
      title: "Backend engineer (portal)",
      level: "mid",
      stack: ["Python"],
      responsibilities: "Own webhook delivery.",
      evaluationFocus: ["correctness", "engineering_judgment"],
      companyContext: "Disposable admin-portal workspace.",
    });
    const role = await roles.setRoleStatus(db, draft, "published");
    const { invitation } = await invitations.createInvitation(db, member, role, { email: emails.cand, name: "Portal Candidate" });

    const s = {} as Record<Who, Session>;
    for (const n of names) s[n] = await login(emails[n], password, ids[n]);
    const accepted = await http("POST", "/api/eng/invitations/accept", s.cand, { body: { invitationId: invitation.id }, bearer: true });
    if (accepted.status !== 200) throw new Error(`accept failed: ${accepted.status}`);
    const attemptId = String(accepted.json.attemptId);
    // Fixture: the attempt's time ran out without a submission (the state a runtime outage leaves behind).
    await db.from("eng_attempts").update({ status: "expired" }).eq("id", attemptId);
    console.log(`fixtures ready (attempt ${attemptId.slice(0, 8)})`);

    // ---------------------------------------------------------------- landing and views
    check("admin from platform_user_roles lands on /admin/overview", s.admin.redirectTo === "/admin/overview", s.admin.redirectTo);
    check("support from platform_user_roles lands on /admin/overview", s.support.redirectTo === "/admin/overview", s.support.redirectTo);
    for (const page of ["/admin/overview", "/admin/cases", "/admin/activity", "/admin/operations", "/admin/users", "/admin/organizations", "/admin/audit", "/admin/engineering", "/admin/repair", "/admin/email", "/admin/invitations", "/admin/data-requests", "/admin/pilot-requests"]) {
      const r = await http("GET", page, s.admin);
      check(`admin views ${page}`, pageOk(r), String(r.status));
    }
    const forbiddenFor = async (who: Who, page: string) => {
      const r = await http("GET", page, s[who]);
      check(`${who} is kept out of ${page}`, r.location.includes("/admin/forbidden"), `${r.status} ${r.location}`);
    };
    await forbiddenFor("support", "/admin/audit");
    await forbiddenFor("support", "/admin/settings");
    await forbiddenFor("operator", "/admin/audit");
    const nonAdmin = await http("GET", "/admin/cases", s.emp);
    check("a signed-in non-admin gets the forbidden page, not a login loop", nonAdmin.location.includes("/admin/forbidden"), nonAdmin.location);

    // ---------------------------------------------------------------- diagnostics
    const diag = await http("POST", "/api/admin/cases", s.support, { body: { action: "diagnose", subjectType: "eng_attempt", subjectId: attemptId } });
    check("support runs diagnostics on an attempt", diag.status === 200 && result(diag).status === "expired", `${diag.status} ${String(result(diag).status)}`);
    check("diagnostics carry states only, no candidate content", !diag.text.includes(emails.cand) && !diag.text.includes("Portal Candidate"));

    // ---------------------------------------------------------------- incident review
    const opened = await http("POST", "/api/admin/cases", s.support, {
      body: { action: "incident.open", subjectType: "eng_attempt", subjectId: attemptId, kind: "runtime_failure", summary: `${marker} runtime refused uploads for 40 minutes` },
    });
    const incidentId = String(result(opened).id ?? "");
    check("support opens an incident", opened.status === 200 && incidentId.length === 36, String(opened.status));

    const early = await http("POST", "/api/admin/cases", s.admin, {
      body: { action: "attempt.replace", attemptId, incidentId, reason: "Runtime outage ended the attempt early." },
    });
    check("a replacement is refused before the fault is confirmed", early.status === 409, String(early.status));

    const stale = await http("POST", "/api/admin/cases", s.support, {
      body: { action: "incident.review", incidentId, expectedStatus: "investigating", status: "confirmed_platform_fault", notes: "Status the reviewer never saw." },
    });
    check("a review based on a stale status is refused", stale.status === 409, String(stale.status));

    const [first, second] = await Promise.all([
      http("POST", "/api/admin/cases", s.support, {
        body: { action: "incident.review", incidentId, expectedStatus: "open", status: "confirmed_platform_fault", notes: "Runtime logs show 502s on upload for this attempt." },
      }),
      http("POST", "/api/admin/cases", s.operator, {
        body: { action: "incident.review", incidentId, expectedStatus: "open", status: "not_platform_fault", notes: "Second reviewer racing the first one." },
      }),
    ]);
    const winners = [first, second].filter((r) => r.status === 200).length;
    const losers = [first, second].filter((r) => r.status === 409).length;
    check("two concurrent reviews: exactly one decides, the other gets 409", winners === 1 && losers === 1, `${first.status}/${second.status}`);
    const { data: incidentRow } = await db.from("support_incidents").select("status").eq("id", incidentId).single();
    if (incidentRow?.status !== "confirmed_platform_fault") {
      // The operator won the race; walk the incident to the confirmed state through the allowed transitions.
      await http("POST", "/api/admin/cases", s.admin, {
        body: { action: "incident.review", incidentId, expectedStatus: "not_platform_fault", status: "investigating", notes: "Reopened after reading the runtime logs." },
      });
      await http("POST", "/api/admin/cases", s.admin, {
        body: { action: "incident.review", incidentId, expectedStatus: "investigating", status: "confirmed_platform_fault", notes: "Runtime logs show 502s on upload for this attempt." },
      });
    }
    const { data: confirmed } = await db.from("support_incidents").select("status").eq("id", incidentId).single();
    check("incident ends confirmed as a platform fault", confirmed?.status === "confirmed_platform_fault", String(confirmed?.status));
    const casesPage = await http("GET", "/admin/cases", s.support);
    check("the incident is listed on /admin/cases", pageOk(casesPage) && casesPage.text.includes(marker));

    // ---------------------------------------------------------------- replacement attempt
    const { data: beforeAttempt } = await db.from("eng_attempts").select("*").eq("id", attemptId).single();
    const { count: eventsBefore } = await db.from("eng_attempt_events").select("id", { count: "exact", head: true }).eq("attempt_id", attemptId);
    const byOperator = await http("POST", "/api/admin/cases", s.operator, {
      body: { action: "attempt.replace", attemptId, incidentId, reason: "Runtime outage ended the attempt early." },
    });
    check("an operator cannot grant a replacement attempt", byOperator.status === 403, String(byOperator.status));
    const granted = await http("POST", "/api/admin/cases", s.admin, {
      body: { action: "attempt.replace", attemptId, incidentId, reason: "Runtime outage ended the attempt early." },
    });
    const replacementId = String(result(granted).invitationId ?? "");
    check("an admin grants a replacement after a confirmed fault", granted.status === 200 && replacementId.length === 36, String(granted.status));
    const again = await http("POST", "/api/admin/cases", s.admin, {
      body: { action: "attempt.replace", attemptId, incidentId, reason: "Runtime outage ended the attempt early." },
    });
    check("a second replacement for the same attempt is refused", again.status === 409, String(again.status));
    const { data: afterAttempt } = await db.from("eng_attempts").select("*").eq("id", attemptId).single();
    check("the original attempt row is untouched", JSON.stringify(beforeAttempt) === JSON.stringify(afterAttempt));
    const { data: originalInv } = await db.from("eng_invitations").select("status, replaced_by").eq("id", invitation.id).single();
    check("the original invitation is closed and linked to its replacement", originalInv?.status === "expired" && originalInv?.replaced_by === replacementId, JSON.stringify(originalInv));
    const { count: eventsAfter } = await db.from("eng_attempt_events").select("id", { count: "exact", head: true }).eq("attempt_id", attemptId);
    check("the grant is appended to the attempt history", (eventsAfter ?? 0) === (eventsBefore ?? 0) + 1, `${eventsBefore} -> ${eventsAfter}`);
    const { count: grantAudit } = await db.from("audit_logs").select("id", { count: "exact", head: true }).eq("action", "admin.attempt.replacement_granted").eq("entity_id", attemptId);
    check("the grant is in audit_logs", (grantAudit ?? 0) === 1, String(grantAudit));
    const { data: newInv } = await db.from("eng_invitations").select("email_delivery, status").eq("id", replacementId).single();
    check("no email is sent for the replacement", newInv?.email_delivery === "not_configured" && newInv?.status === "invited", JSON.stringify(newInv));
    const reaccept = await http("POST", "/api/eng/invitations/accept", s.cand, { body: { invitationId: replacementId }, bearer: true });
    const newAttemptId = String(reaccept.json.attemptId ?? "");
    check("the candidate starts the replacement attempt", reaccept.status === 200 && newAttemptId !== attemptId && newAttemptId.length === 36, String(reaccept.status));

    // ---------------------------------------------------------------- justified code access
    const grant = await http("POST", "/api/admin/cases", s.admin, {
      body: { action: "code_access.grant", attemptId, justification: "Candidate disputes the runtime failure; checking the upload record.", minutes: 5 },
    });
    const grantId = String(result(grant).id ?? "");
    check("an admin opens time-limited code access with a reason", grant.status === 200 && grantId.length === 36, String(grant.status));
    const revoke = await http("POST", "/api/admin/cases", s.admin, { body: { action: "code_access.revoke", grantId } });
    check("the admin closes code access", revoke.status === 200 && result(revoke).revoked === true, String(revoke.status));
    const closed = await http("GET", `/api/eng/review/${attemptId}/file?path=${encodeURIComponent("webhooks/dispatcher.py")}`, s.admin);
    check("code reads stop once access is closed", closed.status === 403 && closed.json.code === "code_access_required", String(closed.status));

    // ---------------------------------------------------------------- commercial correction
    const key = `portal_${tag}_credit`;
    const bySupport = await http("POST", "/api/admin/cases", s.support, {
      body: { action: "commercial.correct", organizationId: org.id, entryType: "credit", quantity: 3, reason: "Pilot credit for the outage.", idempotencyKey: key },
    });
    check("support cannot correct a commercial record", bySupport.status === 403, String(bySupport.status));
    const credit = await http("POST", "/api/admin/cases", s.admin, {
      body: { action: "commercial.correct", organizationId: org.id, entryType: "credit", quantity: 3, reason: "Pilot credit for the outage.", idempotencyKey: key },
    });
    const replay = await http("POST", "/api/admin/cases", s.admin, {
      body: { action: "commercial.correct", organizationId: org.id, entryType: "credit", quantity: 3, reason: "Pilot credit for the outage.", idempotencyKey: key },
    });
    check("an admin appends a credit", credit.status === 200 && result(credit).duplicate === false, String(credit.status));
    check("replaying the same correction does not credit twice", replay.status === 200 && result(replay).duplicate === true, String(replay.status));
    const { data: ledger } = await db.from("billing_ledger_entries").select("id, quantity").eq("organization_id", org.id);
    check("exactly one ledger entry exists", (ledger ?? []).length === 1, String(ledger?.length));
    const entryId = String(ledger?.[0]?.id ?? "");
    const edit = await db.from("billing_ledger_entries").update({ quantity: 300 }).eq("id", entryId).select("id");
    check("the ledger refuses edits, even from the service role", Boolean(edit.error), edit.error ? "refused" : "EDITED");
    const del = await db.from("billing_ledger_entries").delete().eq("id", entryId).select("id");
    check("the ledger refuses deletes, even from the service role", Boolean(del.error), del.error ? "refused" : "DELETED");
    const auditEdit = await db.from("audit_logs").update({ action: "tampered" }).eq("action", "admin.commercial.corrected").eq("organization_id", org.id).select("id");
    check("audit_logs refuses edits, even from the service role", Boolean(auditEdit.error), auditEdit.error ? "refused" : "EDITED");
    const { count: creditAudit } = await db.from("audit_logs").select("id", { count: "exact", head: true }).eq("action", "admin.commercial.corrected").eq("organization_id", org.id);
    check("the correction is audited once with before and after", (creditAudit ?? 0) === 1, String(creditAudit));

    // ---------------------------------------------------------------- ops action
    const opsKey = `portal_${tag}_enqueue`;
    const ops = await http("POST", "/api/admin/ops/actions", s.operator, {
      body: { action: "eng_attempt.enqueue_evaluation", targetId: attemptId, reason: "Check the expired attempt is not evaluated.", idempotencyKey: opsKey },
    });
    const opsAgain = await http("POST", "/api/admin/ops/actions", s.operator, {
      body: { action: "eng_attempt.enqueue_evaluation", targetId: attemptId, reason: "Check the expired attempt is not evaluated.", idempotencyKey: opsKey },
    });
    const opsResult = (ops.json.result ?? {}) as Json;
    const opsAgainResult = (opsAgain.json.result ?? {}) as Json;
    check("an ineligible ops action is rejected, not forced", ops.status === 409 && opsResult.outcome === "rejected", `${ops.status} ${String(opsResult.outcome)}`);
    check("the same ops request replays the recorded outcome", opsAgainResult.duplicate === true && opsAgainResult.id === opsResult.id, String(opsAgainResult.duplicate));
    const supportOps = await http("POST", "/api/admin/ops/actions", s.support, {
      body: { action: "eng_attempt.enqueue_evaluation", targetId: attemptId, reason: "Support trying an ops action.", idempotencyKey: `portal_${tag}_support` },
    });
    check("support cannot run ops actions", supportOps.status === 403, String(supportOps.status));
  } finally {
    await cleanup(tag);
  }

  console.log(`\nADMIN_PORTAL ${passed}/${passed + failures.length} passed (MFA enforcement on this server: ${process.env.ADMIN_MFA_REQUIRED === "true" ? "on" : "off"})`);
  if (failures.length) {
    for (const f of failures) console.log(`  FAILED: ${f}`);
    process.exitCode = 1;
  }
}

/** Same approach as the access matrix: append-only rows go first with triggers suppressed. */
function cleanupSql(tag: string): string {
  if (!/^[0-9a-f]{8}$/.test(tag)) throw new Error("cleanup tag must be 8 hex characters");
  const users = `select id from auth.users where email like 'portal-${tag}-%@example.com'`;
  const orgs = `select id from public.organizations where name = 'Portal ${tag}'`;
  const children = [
    "passport_work_samples",
    "eng_authored_evaluations",
    "eng_authored_workspaces",
    "eng_public_test_runs",
    "eng_assistant_interactions",
    "eng_report_responses",
    "eng_finding_flags",
    "eng_decisions",
    "eng_review_notes",
    "eng_reports",
    "eng_evaluation_runs",
    "eng_submissions",
    "eng_uploads",
    "eng_drafts",
    "eng_messages",
    "eng_attempt_events",
  ];
  return [
    "begin;",
    "set local session_replication_role = replica;",
    `create temp table portal_attempts on commit drop as select id from public.eng_attempts where organization_id in (${orgs});`,
    ...children.map((t) => `delete from public.${t} where attempt_id in (select id from portal_attempts);`),
    "delete from public.admin_access_grants where resource_id in (select id from portal_attempts);",
    "delete from public.eng_attempt_replacements where original_attempt_id in (select id from portal_attempts);",
    "delete from public.support_incidents where subject_id in (select id from portal_attempts);",
    "delete from public.ops_actions where target_id in (select id from portal_attempts);",
    `delete from public.eng_attempts where organization_id in (${orgs});`,
    `delete from public.eng_invitations where organization_id in (${orgs});`,
    `delete from public.eng_roles where organization_id in (${orgs});`,
    `delete from public.billing_ledger_entries where organization_id in (${orgs});`,
    `delete from public.audit_logs where actor_user_id in (${users}) or organization_id in (${orgs}) or entity_id in (select id::text from portal_attempts);`,
    `delete from public.platform_user_roles where user_id in (${users});`,
    "set local session_replication_role = origin;",
    `delete from public.passports where owner_id in (${users});`,
    `delete from public.organizations where id in (${orgs});`,
    `delete from auth.users where email like 'portal-${tag}-%@example.com';`,
    "commit;",
  ].join("\n");
}

async function cleanup(tag: string) {
  if (!devDbUrl || !devDbUrl.includes(PROJECT_REF)) {
    console.log(`CLEANUP NEEDS SQL: FYDELL_DEV_DB_URL is not a ${PROJECT_REF} connection string. Run this on fydell-dev to remove run ${tag}:\n${cleanupSql(tag)}`);
    return;
  }
  const sql = postgres(devDbUrl, { max: 1, prepare: false });
  try {
    await sql.unsafe(cleanupSql(tag)).simple();
  } finally {
    await sql.end();
  }
  console.log("Removed the disposable organization, accounts and rows this run created.");
}

main().catch((error) => {
  const cause = error instanceof Error ? (error.cause as { code?: string } | undefined)?.code : undefined;
  console.error(error instanceof Error ? `${error.stack ?? error.message}${cause ? ` (cause ${cause})` : ""}` : "admin portal test failed");
  process.exitCode = 1;
});
