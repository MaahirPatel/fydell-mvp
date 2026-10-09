/**
 * Cross-access matrix, live against fydell-dev through a local server.
 *
 * Builds a disposable world (two organizations, a candidate with a submitted
 * engineering attempt, a passport with active, expired and revoked share
 * links, platform admins with different roles), signs every actor in through
 * the real login endpoint, and checks what each one can reach across pages,
 * APIs, exports, storage and realtime. Everything it creates is removed.
 *
 *   npx tsx --conditions react-server --env-file=.env.local scripts/test-access-matrix.ts
 *
 * Needs `npm run dev` on FYDELL_TEST_BASE_URL (default http://localhost:3000)
 * pointed at fydell-dev, plus FYDELL_DEV_SUPABASE_URL, FYDELL_DEV_SERVICE_ROLE_KEY
 * and FYDELL_DEV_DB_URL (cleanup of append-only rows).
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { unzipSync, zipSync } from "fflate";
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
  console.log("SKIP access matrix: FYDELL_DEV_SUPABASE_URL, FYDELL_DEV_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
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
type Reply = { status: number; text: string; json: Json; headers: Headers; location: string };

/** `untestable` marks a check the local dev server cannot answer; it is reported, never counted as a pass. */
type Outcome = boolean | "untestable";
type Row = { actor: string; surface: string; expected: string; actual: string; ok: Outcome };
const rows: Row[] = [];

function record(actor: string, surface: string, expected: string, actual: string, ok: Outcome) {
  rows.push({ actor, surface, expected, actual, ok });
  const label = ok === "untestable" ? "N/A " : ok ? "PASS" : "FAIL";
  console.log(`${label} [${actor}] ${surface}: expected ${expected}, got ${actual}`);
}

/** `next dev` overwrites every rendered page's Cache-Control with exactly this value. */
const NEXT_DEV_PAGE_CACHE = "no-cache, must-revalidate";

function pageNoStore(headers: Headers): Outcome {
  const value = headers.get("cache-control") ?? "";
  if (value === NEXT_DEV_PAGE_CACHE) return "untestable";
  return /no-store/i.test(value);
}

/** A streamed page that calls redirect() answers 200 and redirects in the body. */
function redirectsToLogin(reply: Reply): boolean {
  if (reply.status >= 300 && reply.status < 400) return reply.location.includes("/login");
  return /NEXT_REDIRECT[^"]*\/login|http-equiv="refresh"[^>]*\/login/.test(reply.text);
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
  const headers: Record<string, string> = { "x-forwarded-for": fakeIp() };
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
  return { status: res.status, text, json, headers: res.headers, location: res.headers.get("location") ?? "" };
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

function userClient(token: string | null): SupabaseClient {
  return createClient(devUrl!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}

function noStore(headers: Headers): boolean {
  return /no-store/i.test(headers.get("cache-control") ?? "");
}

function submissionArchive(starter: Uint8Array): Uint8Array {
  const files = unzipSync(starter);
  const reference = readFileSync(path.join(process.cwd(), "scenarios", "backend-webhook-retry", "fixtures", "reference", "webhooks", "dispatcher.py"));
  const key = Object.keys(files).find((k) => k.endsWith("webhooks/dispatcher.py"));
  if (!key) throw new Error("starter is missing webhooks/dispatcher.py");
  files[key] = new Uint8Array(reference);
  return zipSync(files);
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
  const { CURRENT_SCENARIO, expectedSetupCodes } = await import("../src/lib/eng/scenarios");
  type EngMember = import("../src/lib/eng/context").EngMember;

  const db = engAdmin();
  const tag = randomBytes(4).toString("hex");
  const marker = `MATRIX-MARKER-${tag}`;
  const password = `${randomBytes(18).toString("base64url")}Aa1!`;
  const names = ["cand", "other", "empA", "revA", "empB", "admin", "support", "reviewer"] as const;
  type Who = (typeof names)[number];
  const emails = Object.fromEntries(names.map((n) => [n, `matrix-${tag}-${n}@example.com`])) as Record<Who, string>;
  const ids = {} as Record<Who, string>;
  const userIds: string[] = [];
  const orgIds: string[] = [];
  const storagePaths: string[] = [];

  try {
    // ---------------------------------------------------------------- fixtures
    for (const n of names) {
      const { data, error } = await db.auth.admin.createUser({ email: emails[n], password, email_confirm: true });
      if (error || !data.user) throw new Error(`could not create disposable user: ${error?.message}`);
      ids[n] = data.user.id;
      userIds.push(data.user.id);
    }
    await db.from("email_inbox_verifications").insert({ user_id: ids.cand, email: emails.cand, method: "dev_backfill" });
    for (const [who, role] of [["admin", "admin"], ["support", "support"], ["reviewer", "reviewer"]] as const) {
      const { error } = await db.from("platform_user_roles").insert({ user_id: ids[who], role, is_active: true });
      if (error) throw new Error(`could not grant a synthetic platform role: ${error.message}`);
    }

    const mkOrg = async (owner: Who, label: string) => {
      const { data, error } = await db
        .from("organizations")
        .insert({ name: `Matrix ${label} ${tag}`, owner_id: ids[owner], owner_email: emails[owner], created_by: ids[owner] })
        .select("id, name")
        .single();
      if (error || !data) throw new Error(`could not create org: ${error?.message}`);
      orgIds.push(data.id as string);
      await db
        .from("organization_members")
        .insert({ organization_id: data.id, user_id: ids[owner], role: "owner", status: "active", joined_at: new Date().toISOString() });
      return data as { id: string; name: string };
    };
    const orgA = await mkOrg("empA", "A");
    await mkOrg("empB", "B");
    await db
      .from("organization_members")
      .insert({ organization_id: orgA.id, user_id: ids.revA, role: "reviewer", status: "active", joined_at: new Date().toISOString() });

    const member: EngMember = { userId: ids.empA, email: emails.empA, organizationId: orgA.id, organizationName: orgA.name, role: "owner" };
    const draft = await roles.createRole(db, member, {
      title: "Backend engineer (matrix)",
      stack: ["Python"],
      responsibilities: "Own webhook delivery.",
      evaluationFocus: ["correctness", "engineering_judgment"],
      companyContext: "Disposable access-matrix workspace.",
    });
    const role = await roles.setRoleStatus(db, draft, "published");
    const { invitation } = await invitations.createInvitation(db, member, role, { email: emails.cand, name: "Matrix Candidate" });

    const s = {} as Record<Who, Session>;
    for (const n of names) s[n] = await login(emails[n], password, ids[n]);

    // Candidate completes a real attempt over HTTP so file, report and storage surfaces have data.
    const accepted = await http("POST", "/api/eng/invitations/accept", s.cand, { body: { invitationId: invitation.id }, bearer: true });
    if (accepted.status !== 200) throw new Error(`accept failed: ${accepted.status} ${accepted.text.slice(0, 200)}`);
    const attemptId = String(accepted.json.attemptId);
    await http("POST", `/api/eng/attempts/${attemptId}/consent`, s.cand, { body: {}, bearer: true });
    const starter = await fetch(`${base}/api/eng/attempts/${attemptId}/starter`, { headers: { authorization: `Bearer ${s.cand.token}` } });
    const starterBytes = new Uint8Array(await starter.arrayBuffer());
    const code = [...expectedSetupCodes(CURRENT_SCENARIO).keys()][0];
    await http("POST", `/api/eng/attempts/${attemptId}/preflight`, s.cand, { body: { code }, bearer: true });
    await http("POST", `/api/eng/attempts/${attemptId}/start`, s.cand, { body: {}, bearer: true });
    const view = await http("GET", `/api/eng/attempts/${attemptId}`, s.cand, { bearer: true });
    const starterRoot = String(((view.json.view as Json).scenario as Json).starterRoot);
    const archive = submissionArchive(starterBytes);
    const init = await http("POST", `/api/eng/attempts/${attemptId}/uploads`, s.cand, {
      body: { fileName: `${starterRoot}.zip`, byteSize: archive.length },
      bearer: true,
    });
    const uploadId = String(init.json.uploadId);
    const { data: uploadRow } = await db.from("eng_uploads").select("storage_path").eq("id", uploadId).single();
    const storagePath = String(uploadRow?.storage_path ?? "");
    if (storagePath) storagePaths.push(storagePath);
    const put = await fetch(String(init.json.signedUrl), {
      method: "PUT",
      headers: { apikey: anonKey!, "x-upsert": "false", "content-type": "application/zip" },
      body: Buffer.from(archive),
    });
    if (!put.ok) throw new Error(`signed upload failed: ${put.status}`);
    await http("POST", `/api/eng/attempts/${attemptId}/uploads/${uploadId}/finalize`, s.cand, { body: {}, bearer: true });
    const answers = { uploadId, what_changed: `${marker} retries stop on 4xx.`, testing: "Public tests.", risks: "Clock skew.", next_steps: "Jitter.", ai_use: "None." };
    let submit = await http("POST", `/api/eng/attempts/${attemptId}/submit`, s.cand, { body: answers, bearer: true });
    if (submit.status !== 200) {
      await http("POST", `/api/eng/attempts/${attemptId}/acknowledge-update`, s.cand, { body: {}, bearer: true });
      submit = await http("POST", `/api/eng/attempts/${attemptId}/submit`, s.cand, { body: answers, bearer: true });
    }
    if (submit.status !== 200) throw new Error(`submit failed: ${submit.status} ${submit.text.slice(0, 200)}`);
    const filePath = encodeURIComponent("webhooks/dispatcher.py");
    const fileQuery = `path=${filePath}`;

    // Passport with three share links and a private notification for the candidate.
    const { data: passport, error: passportError } = await db
      .from("passports")
      .insert({ owner_id: ids.cand, display_name: "Matrix Candidate", headline: marker })
      .select("id")
      .single();
    if (passportError || !passport) throw new Error(`could not create passport: ${passportError?.message}`);
    const shareTokens = { active: randomBytes(24).toString("base64url"), expired: randomBytes(24).toString("base64url"), revoked: randomBytes(24).toString("base64url") };
    const hashed = (t: string) => createHash("sha256").update(t).digest("hex");
    await db.from("passport_shares").insert([
      { passport_id: passport.id, token_hash: hashed(shareTokens.active), label: "active", allowed_fields: ["projects", "evidence", "roles", "capabilities"] },
      { passport_id: passport.id, token_hash: hashed(shareTokens.expired), label: "expired", expires_at: new Date(Date.now() - 60000).toISOString() },
      { passport_id: passport.id, token_hash: hashed(shareTokens.revoked), label: "revoked", revoked_at: new Date().toISOString() },
    ]);
    await db.from("user_notifications").insert({ user_id: ids.cand, kind: "invitation_received", title: marker, body: "private", href: "/app/candidate" });
    console.log(`fixtures ready (attempt ${attemptId.slice(0, 8)})`);

    // ------------------------------------------------------------ controls
    {
      const r = await http("GET", `/api/eng/org/attempts/${attemptId}/file?${fileQuery}`, s.empA);
      record("owner of org A (control)", "GET org attempt file", "200", String(r.status), r.status === 200);
      const rv = await http("GET", `/api/eng/org/attempts/${attemptId}/file?${fileQuery}`, s.revA);
      record("org A reviewer before removal (control)", "GET org attempt file", "200", String(rv.status), rv.status === 200);
      const c = await http("GET", `/api/eng/attempts/${attemptId}/file?${fileQuery}`, s.cand);
      record("candidate (control)", "GET own attempt file", "200", String(c.status), c.status === 200);
      const n = await http("GET", "/api/notifications", s.cand);
      record("candidate (control)", "GET notifications", "own marker visible", n.text.includes(marker) ? "visible" : "absent", n.text.includes(marker));
      const p = await http("GET", `/p/${shareTokens.active}`, null);
      record("anonymous (control)", "GET /p/<active share>", "200", String(p.status), p.status === 200);
      record("platform admin", "POST /api/platform/login destination", "/admin/overview", s.admin.redirectTo, s.admin.redirectTo === "/admin/overview");
    }

    // ------------------------------------------------------------ anonymous
    {
      const a = await http("GET", `/api/eng/attempts/${attemptId}`, null);
      record("anonymous", "GET candidate attempt API", "401", String(a.status), a.status === 401);
      record("anonymous", "Cache-Control on attempt API", "no-store", a.headers.get("cache-control") ?? "none", noStore(a.headers));
      const f = await http("GET", `/api/eng/org/attempts/${attemptId}/file?${fileQuery}`, null);
      record("anonymous", "GET org attempt file", "401", String(f.status), f.status === 401);
      const e = await http("GET", "/api/passport/export", null);
      record("anonymous", "GET passport export", "401", String(e.status), e.status === 401);
      const admin = await http("GET", "/admin/cases", null);
      const ok = admin.status >= 300 && admin.status < 400 && admin.location.includes("/login?next=%2Fadmin%2Fcases");
      record("anonymous", "GET /admin/cases page", "redirect to login with next", `${admin.status} ${admin.location}`, ok);
      const page = await http("GET", `/app/employer/engineering/attempts/${attemptId}`, null);
      record("anonymous", "GET employer attempt page", "redirect, no marker", `${page.status}`, page.status >= 300 && page.status < 400 && !page.text.includes(marker));
      const cases = await http("POST", "/api/admin/cases", null, { body: { action: "diagnose", subjectType: "eng_attempt", subjectId: attemptId } });
      record("anonymous", "POST admin diagnose API", "401", String(cases.status), cases.status === 401);
    }

    // ------------------------------------------------------------ another engineer
    {
      const a = await http("GET", `/api/eng/attempts/${attemptId}`, s.other);
      record("another engineer", "GET candidate attempt API", "404", String(a.status), a.status === 404);
      const f = await http("GET", `/api/eng/attempts/${attemptId}/file?${fileQuery}`, s.other);
      record("another engineer", "GET candidate attempt file", "404", String(f.status), f.status === 404);
      const r = await http("GET", `/api/eng/attempts/${attemptId}/report`, s.other);
      record("another engineer", "GET candidate report", "404", String(r.status), r.status === 404);
      const o = await http("GET", `/api/eng/org/attempts/${attemptId}/file?${fileQuery}`, s.other);
      record("another engineer", "GET org attempt file", "403", String(o.status), o.status === 403);
      const n = await http("GET", "/api/notifications", s.other);
      record("another engineer", "GET notifications", "no candidate marker", n.text.includes(marker) ? "LEAK" : "clean", n.status === 200 && !n.text.includes(marker));
      const e = await http("GET", "/api/passport/export", s.other);
      record("another engineer", "GET passport export", "own (404, none) and no marker", `${e.status}`, !e.text.includes(marker));
      const page = await http("GET", `/app/candidate`, s.other);
      record("another engineer", "GET /app/candidate page", "no candidate marker", page.text.includes(marker) ? "LEAK" : `${page.status} clean`, !page.text.includes(marker));
    }

    // ------------------------------------------------------------ another organization
    {
      const f = await http("GET", `/api/eng/org/attempts/${attemptId}/file?${fileQuery}`, s.empB);
      record("owner of org B", "GET org A attempt file", "404", String(f.status), f.status === 404);
      const n = await http("POST", `/api/eng/org/attempts/${attemptId}/notes`, s.empB, { body: { body: "cross-org note" } });
      record("owner of org B", "POST note on org A attempt", "404", String(n.status), n.status === 404);
      const page = await http("GET", `/app/employer/engineering/attempts/${attemptId}`, s.empB);
      record("owner of org B", "GET org A attempt page", "no marker", page.text.includes(marker) ? "LEAK" : `${page.status} clean`, !page.text.includes(marker));
      const rev = await http("GET", `/api/eng/review/${attemptId}/file?${fileQuery}`, s.empB);
      record("owner of org B", "GET Fydell review file", "403", String(rev.status), rev.status === 403);
    }

    // ------------------------------------------------------------ removed reviewer
    {
      await db.from("organization_members").update({ status: "removed" }).eq("organization_id", orgA.id).eq("user_id", ids.revA);
      const f = await http("GET", `/api/eng/org/attempts/${attemptId}/file?${fileQuery}`, s.revA);
      record("removed reviewer", "GET org attempt file (same session)", "403", String(f.status), f.status === 403);
      const n = await http("POST", `/api/eng/org/attempts/${attemptId}/notes`, s.revA, { body: { body: "after removal" } });
      record("removed reviewer", "POST note", "403", String(n.status), n.status === 403);
      const page = await http("GET", `/app/employer/engineering/attempts/${attemptId}`, s.revA);
      record("removed reviewer", "GET attempt page", "no marker", page.text.includes(marker) ? "LEAK" : `${page.status} clean`, !page.text.includes(marker));
    }

    // ------------------------------------------------------------ expired and revoked shares
    {
      const ex = await http("GET", `/p/${shareTokens.expired}`, null);
      record("expired share", "GET /p/<token>", "no passport data", ex.text.includes(marker) ? "LEAK" : `${ex.status} ${/expired/i.test(ex.text) ? "says expired" : "clean"}`, !ex.text.includes(marker));
      record("expired share", "Cache-Control", "no-store", ex.headers.get("cache-control") ?? "none", pageNoStore(ex.headers));
      const rv = await http("GET", `/p/${shareTokens.revoked}`, null);
      record("revoked share", "GET /p/<token>", "no passport data", rv.text.includes(marker) ? "LEAK" : `${rv.status} ${/revoked/i.test(rv.text) ? "says revoked" : "clean"}`, !rv.text.includes(marker));
      const rvEmp = await http("GET", `/p/${shareTokens.revoked}`, s.empA);
      record("revoked share", "GET /p/<token> signed in as employer", "no passport data", rvEmp.text.includes(marker) ? "LEAK" : "clean", !rvEmp.text.includes(marker));
    }

    // ------------------------------------------------------------ admins without the privilege
    {
      const sup = s.support;
      const f = await http("GET", `/api/eng/review/${attemptId}/file?${fileQuery}`, sup);
      record("support admin", "GET candidate code (review file)", "403", String(f.status), f.status === 403);
      const g = await http("POST", "/api/admin/cases", sup, { body: { action: "code_access.grant", attemptId, justification: "Support wants to look at the code for a ticket.", minutes: 10 } });
      record("support admin", "open code access", "403", String(g.status), g.status === 403);
      const c = await http("POST", "/api/admin/cases", sup, {
        body: { action: "commercial.correct", organizationId: orgA.id, entryType: "credit", quantity: 5, reason: "Support tries to add credit.", idempotencyKey: `matrix_${tag}_sup` },
      });
      record("support admin", "correct commercial record", "403", String(c.status), c.status === 403);
      const role = await http("POST", `/api/admin/users/${ids.other}`, sup, { body: { action: "grant-role", role: "admin" } });
      record("support admin", "grant platform role", "403", String(role.status), role.status === 403);
      const conn = await http("POST", "/api/admin/repair", sup, {
        body: { action: "connect_user_to_org", userId: ids.support, organizationId: orgA.id, role: "owner", reason: "Support adding itself to an org." },
      });
      record("support admin", "repair: connect self to org", "403", String(conn.status), conn.status === 403);
      const membership = await db.from("organization_members").select("id").eq("organization_id", orgA.id).eq("user_id", ids.support).maybeSingle();
      record("support admin", "org A membership after attempt", "none", membership.data ? "MEMBER" : "none", !membership.data);
      const susp = await http("POST", `/api/admin/users/${ids.admin}`, sup, { body: { action: "suspend" } });
      record("support admin", "suspend a user", "403", String(susp.status), susp.status === 403);
      const audit = await http("GET", "/admin/audit", sup);
      record("support admin", "GET /admin/audit page", "redirect to /admin/forbidden", `${audit.status} ${audit.location}`, audit.location.includes("/admin/forbidden"));
      const casesPage = await http("GET", "/admin/cases", sup);
      record("support admin (control)", "GET /admin/cases page", "200", String(casesPage.status), casesPage.status === 200);
      const pdf = await http("GET", `/api/admin/candidates/${randomUUID()}/pdf`, sup);
      record("support admin", "GET candidate PDF export", "403", String(pdf.status), pdf.status === 403);

      const rev = s.reviewer;
      const ops = await http("GET", "/admin/operations", rev);
      record("reviewer admin", "GET /admin/operations page", "redirect to /admin/forbidden", `${ops.status} ${ops.location}`, ops.location.includes("/admin/forbidden"));
      const noGrant = await http("GET", `/api/eng/review/${attemptId}/file?${fileQuery}`, rev);
      record("reviewer admin", "GET candidate code without a grant", "403 code_access_required", `${noGrant.status} ${String(noGrant.json.code ?? "")}`, noGrant.status === 403 && noGrant.json.code === "code_access_required");
      const short = await http("POST", "/api/admin/cases", rev, { body: { action: "code_access.grant", attemptId, justification: "too short", minutes: 10 } });
      record("reviewer admin", "open code access without a real reason", "400", String(short.status), short.status === 400);
      const grant = await http("POST", "/api/admin/cases", rev, {
        body: { action: "code_access.grant", attemptId, justification: "Employer flagged finding F2 as wrong; checking the retry code.", minutes: 10 },
      });
      record("reviewer admin", "open code access with a reason", "200", String(grant.status), grant.status === 200);
      const withGrant = await http("GET", `/api/eng/review/${attemptId}/file?${fileQuery}`, rev);
      record("reviewer admin", "GET candidate code with a grant", "200", String(withGrant.status), withGrant.status === 200);
      const { data: reads } = await db.from("audit_logs").select("id").eq("action", "admin.code_access.read").eq("entity_id", attemptId);
      record("reviewer admin", "file read recorded in audit_logs", ">= 1 row", String(reads?.length ?? 0), (reads?.length ?? 0) >= 1);
      const otherAdmin = await http("GET", `/api/eng/review/${attemptId}/file?${fileQuery}`, s.admin);
      record("full admin", "GET candidate code on someone else's grant", "403", String(otherAdmin.status), otherAdmin.status === 403);
    }

    // ------------------------------------------------------------ exports and cache
    {
      const e = await http("GET", "/api/passport/export", s.cand);
      record("candidate (control)", "GET passport export", "200", String(e.status), e.status === 200);
      record("candidate", "Cache-Control on export", "no-store", e.headers.get("cache-control") ?? "none", noStore(e.headers));
      const page = await http("GET", "/app/candidate", s.cand);
      record("candidate", "Cache-Control on /app/candidate", "no-store", page.headers.get("cache-control") ?? "none", pageNoStore(page.headers));
      const adm = await http("GET", "/admin/cases", s.admin);
      const admCache = pageNoStore(adm.headers);
      record("full admin", "Cache-Control on /admin/cases", "no-store", `${adm.status} ${adm.headers.get("cache-control") ?? "none"}`, adm.status !== 200 ? false : admCache);    }

    // ------------------------------------------------------------ storage
    {
      const anonStore = userClient(null).storage.from("eng-submissions");
      const anonDl = await anonStore.download(storagePath);
      record("anonymous", "storage download of submission", "denied", anonDl.error ? "denied" : "LEAK", Boolean(anonDl.error));
      const anonList = await anonStore.list(storagePath.split("/").slice(0, -1).join("/"));
      record("anonymous", "storage list of submission folder", "empty or denied", anonList.error ? "denied" : `${anonList.data?.length ?? 0} items`, Boolean(anonList.error) || (anonList.data?.length ?? 0) === 0);
      const otherStore = userClient(s.other.token).storage.from("eng-submissions");
      const otherDl = await otherStore.download(storagePath);
      record("another engineer", "storage download of submission", "denied", otherDl.error ? "denied" : "LEAK", Boolean(otherDl.error));
      const otherSign = await otherStore.createSignedUrl(storagePath, 60);
      record("another engineer", "storage signed URL for submission", "denied", otherSign.error ? "denied" : "LEAK", Boolean(otherSign.error));
      const empBDl = await userClient(s.empB.token).storage.from("eng-submissions").download(storagePath);
      record("owner of org B", "storage download of submission", "denied", empBDl.error ? "denied" : "LEAK", Boolean(empBDl.error));
      const candDl = await userClient(s.cand.token).storage.from("eng-submissions").download(storagePath);
      record("candidate", "direct storage download of own submission", "denied (served only through the API)", candDl.error ? "denied" : "allowed", Boolean(candDl.error));
    }

    // ------------------------------------------------------------ realtime
    {
      if (devDbUrl && devDbUrl.includes(PROJECT_REF)) {
        const sql = postgres(devDbUrl, { max: 1, prepare: false });
        try {
          const pub = await sql`select schemaname, tablename from pg_publication_tables where pubname = 'supabase_realtime'`;
          record("any signed-in user", "tables in supabase_realtime publication", "none", pub.length ? pub.map((p) => `${p.schemaname}.${p.tablename}`).join(",") : "none", pub.length === 0);
        } finally {
          await sql.end();
        }
      }
      for (const [label, token] of [["anonymous", null], ["another engineer", s.other.token]] as const) {
        const client = userClient(token);
        if (token) client.realtime.setAuth(token);
        const events: unknown[] = [];
        const status = await new Promise<string>((resolve) => {
          const timer = setTimeout(() => resolve("timeout"), 15000);
          client
            .channel(`matrix-${tag}-${label.replace(/\s/g, "")}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "eng_attempts", filter: `id=eq.${attemptId}` }, (payload) => events.push(payload))
            .on("postgres_changes", { event: "*", schema: "public", table: "user_notifications" }, (payload) => events.push(payload))
            .subscribe((st) => {
              if (st === "SUBSCRIBED" || st === "CHANNEL_ERROR" || st === "TIMED_OUT" || st === "CLOSED") {
                clearTimeout(timer);
                resolve(st);
              }
            });
        });
        await db.from("user_notifications").insert({ user_id: ids.cand, kind: "invitation_received", title: `${marker}-rt`, body: "private", href: "/app/candidate" });
        await new Promise((r) => setTimeout(r, 4000));
        record(label, "realtime postgres_changes on attempts and notifications", "0 events", `${events.length} events (${status})`, events.length === 0);
        await client.removeAllChannels();
      }
    }

    // ------------------------------------------------------------ suspension and logout
    {
      const susp = await http("POST", `/api/admin/users/${ids.other}`, s.admin, { body: { action: "suspend" } });
      record("full admin", "suspend an engineer", "200", String(susp.status), susp.status === 200);
      const live = await http("GET", "/api/notifications", s.other);
      record("suspended engineer", "existing session after suspension", "401", String(live.status), live.status === 401);
      const relogin = await fetch(`${base}/api/platform/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": fakeIp() },
        body: JSON.stringify({ email: emails.other, password }),
      });
      record("suspended engineer", "sign in again", "401", String(relogin.status), relogin.status === 401);
      const react = await http("POST", `/api/admin/users/${ids.other}`, s.admin, { body: { action: "reactivate" } });
      record("full admin", "reactivate the engineer", "200", String(react.status), react.status === 200);
      const back = await login(emails.other, password, ids.other);
      const ok = await http("GET", "/api/notifications", back);
      record("reactivated engineer", "new session works", "200", String(ok.status), ok.status === 200);
      const selfSuspend = await http("POST", `/api/admin/users/${ids.admin}`, s.admin, { body: { action: "suspend" } });
      record("full admin", "suspend own account", "409", String(selfSuspend.status), selfSuspend.status === 409);

      const before = await http("GET", "/api/notifications", s.cand);
      await http("POST", "/api/platform/logout", s.cand, { body: {} });
      const after = await http("GET", "/api/notifications", s.cand);
      record("candidate after logout", "replay the pre-logout cookie", "401", `${before.status} then ${after.status}`, before.status === 200 && after.status === 401);
      const afterPage = await http("GET", "/app/candidate/applications", s.cand);
      const leaked = afterPage.text.includes(marker) || afterPage.text.includes(emails.cand);
      record(
        "candidate after logout",
        "replay cookie on /app/candidate/applications",
        "redirect to login, no email or marker",
        `${afterPage.status} ${redirectsToLogin(afterPage) ? "redirects to login" : "no redirect"}${leaked ? " LEAK" : ""}`,
        redirectsToLogin(afterPage) && !leaked,
      );
    }
  } finally {
    await cleanup(db, storagePaths, tag);
  }

  const failed = rows.filter((r) => r.ok === false);
  const untestable = rows.filter((r) => r.ok === "untestable");
  console.log("\n| Actor | Surface | Expected | Actual | Result |\n|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.actor} | ${r.surface} | ${r.expected} | ${r.actual} | ${r.ok === "untestable" ? "n/a in next dev" : r.ok ? "pass" : "FAIL"} |`);
  console.log(`\nACCESS_MATRIX ${rows.length - failed.length - untestable.length}/${rows.length} passed, ${failed.length} failed, ${untestable.length} not testable on next dev`);
  if (failed.length) process.exitCode = 1;
}

/**
 * Append-only tables refuse deletes through their guard triggers, so those rows
 * go first with triggers suppressed. Replica mode also suppresses foreign-key
 * cascades, so everything else is removed afterwards in normal mode.
 */
function cleanupSql(tag: string): string {
  if (!/^[0-9a-f]{8}$/.test(tag)) throw new Error("cleanup tag must be 8 hex characters");
  const users = `select id from auth.users where email like 'matrix-${tag}-%@example.com'`;
  const orgs = `select id from public.organizations where name in ('Matrix A ${tag}', 'Matrix B ${tag}')`;
  const attempts = `select id from public.eng_attempts where organization_id in (${orgs})`;
  const attemptChildren = [
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
    `create temp table matrix_attempts on commit drop as ${attempts};`,
    "delete from public.report_feedback where report_id in (select id from public.eng_reports where attempt_id in (select id from matrix_attempts));",
    ...attemptChildren.map((t) => `delete from public.${t} where attempt_id in (select id from matrix_attempts);`),
    "delete from public.admin_access_grants where resource_id in (select id from matrix_attempts);",
    "delete from public.eng_attempt_replacements where original_attempt_id in (select id from matrix_attempts);",
    "delete from public.support_incidents where subject_id in (select id from matrix_attempts);",
    `delete from public.eng_attempts where organization_id in (${orgs});`,
    `delete from public.eng_invitations where organization_id in (${orgs});`,
    `delete from public.eng_roles where organization_id in (${orgs});`,
    `delete from public.billing_ledger_entries where organization_id in (${orgs});`,
    `delete from public.audit_logs where actor_user_id in (${users}) or entity_id in (select id::text from auth.users where email like 'matrix-${tag}-%@example.com') or entity_id in (select id::text from matrix_attempts);`,
    `delete from public.platform_user_roles where user_id in (${users});`,
    "set local session_replication_role = origin;",
    `delete from public.passports where owner_id in (${users});`,
    `delete from public.organizations where id in (${orgs});`,
    `delete from auth.users where email like 'matrix-${tag}-%@example.com';`,
    "commit;",
  ].join("\n");
}

async function cleanup(db: SupabaseClient, storagePaths: string[], tag: string) {
  if (storagePaths.length) await db.storage.from("eng-submissions").remove(storagePaths);
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
  console.log("Removed the disposable organizations, accounts, rows and files this run created.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : "access matrix failed");
  process.exitCode = 1;
});
