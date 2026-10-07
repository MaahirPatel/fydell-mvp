/**
 * The desktop engineering client's HTTP sequence (desktop/src-tauri/src/eng.rs),
 * replayed against a running local server with bearer-token auth only:
 * list -> accept -> view -> consent -> starter (hash header) -> setup code ->
 * start -> team message -> draft -> upload (signed URL) -> finalize ->
 * submit (update posted first) -> acknowledge -> submit -> receipt -> report.
 * Also checks that no token and another account's token are refused.
 *
 * Needs `npm run dev` on FYDELL_TEST_BASE_URL (default http://localhost:3000)
 * pointed at fydell-dev. Creates disposable accounts and removes them.
 *
 *   npx tsx --conditions react-server --env-file=.env.local scripts/test-desktop-eng-http.ts
 */
import assert from "node:assert/strict";
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
  console.log("SKIP desktop eng HTTP: FYDELL_DEV_SUPABASE_URL, FYDELL_DEV_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
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

let passed = 0;
function pass(label: string) {
  passed++;
  console.log(`PASS ${label}`);
}

type Json = Record<string, unknown>;

async function call(method: string, route: string, token: string | null, body?: unknown, timeoutMs = 120000): Promise<{ status: number; json: Json; headers: Headers; bytes: Uint8Array }> {
  const headers: Record<string, string> = { "user-agent": "fydell-desktop/test" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${base}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "manual",
  });
  const bytes = new Uint8Array(await res.arrayBuffer());
  let json: Json = {};
  if ((res.headers.get("content-type") ?? "").includes("application/json")) {
    try {
      const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (parsed && typeof parsed === "object") json = parsed as Json;
    } catch {
      json = {};
    }
  }
  return { status: res.status, json, headers: res.headers, bytes };
}

async function tokenFor(email: string, password: string): Promise<string> {
  const client = createClient(devUrl!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`sign-in failed for a disposable account: ${error?.message}`);
  return data.session.access_token;
}

function submissionArchive(starter: Uint8Array): Uint8Array {
  const files = unzipSync(starter);
  const reference = readFileSync(path.join(process.cwd(), "scenarios", "backend-webhook-retry", "fixtures", "reference", "webhooks", "dispatcher.py"));
  const key = Object.keys(files).find((k) => k.endsWith("webhooks/dispatcher.py"));
  assert.ok(key, "starter contains webhooks/dispatcher.py");
  files[key] = new Uint8Array(reference);
  return zipSync(files);
}

async function main() {
  const { engAdmin } = await import("../src/lib/eng/context");
  const roles = await import("../src/lib/eng/roles");
  const invitations = await import("../src/lib/eng/invitations");
  const { CURRENT_SCENARIO, expectedSetupCodes } = await import("../src/lib/eng/scenarios");
  type EngMember = import("../src/lib/eng/context").EngMember;

  const db = engAdmin();
  const tag = randomBytes(4).toString("hex");
  const password = `${randomBytes(18).toString("base64url")}Aa1!`;
  const emails = {
    employer: `desktop-http-${tag}-e@example.com`,
    candidate: `desktop-http-${tag}-c@example.com`,
    intruder: `desktop-http-${tag}-x@example.com`,
  };
  const userIds: string[] = [];
  const orgIds: string[] = [];
  const storagePaths: string[] = [];

  try {
    const ids = { employer: "", candidate: "", intruder: "" };
    for (const key of Object.keys(emails) as (keyof typeof emails)[]) {
      const { data, error } = await db.auth.admin.createUser({ email: emails[key], password, email_confirm: true });
      if (error || !data.user) throw new Error(`could not create disposable user: ${error?.message}`);
      ids[key] = data.user.id;
      userIds.push(data.user.id);
    }
    const { data: org, error: orgError } = await db
      .from("organizations")
      .insert({ name: `Desktop HTTP test ${tag}`, owner_id: ids.employer, owner_email: emails.employer, created_by: ids.employer })
      .select("id, name")
      .single();
    if (orgError || !org) throw new Error(`could not create disposable organization: ${orgError?.message}`);
    orgIds.push(org.id);
    const { error: memberError } = await db
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: ids.employer, role: "owner", status: "active", joined_at: new Date().toISOString() });
    if (memberError) throw new Error(`could not add member: ${memberError.message}`);
    const member: EngMember = { userId: ids.employer, email: emails.employer, organizationId: org.id, organizationName: org.name, role: "owner" };
    const draft = await roles.createRole(db, member, {
      title: "Backend engineer (desktop test)",
      stack: ["Python"],
      responsibilities: "Own webhook delivery.",
      evaluationFocus: ["correctness", "engineering_judgment"],
      companyContext: "Disposable test workspace.",
    });
    const role = await roles.setRoleStatus(db, draft, "published");
    const { invitation } = await invitations.createInvitation(db, member, role, { email: emails.candidate, name: "Desktop Candidate" });
    pass("disposable workspace, published role and invitation");

    const token = await tokenFor(emails.candidate, password);
    const intruderToken = await tokenFor(emails.intruder, password);

    const anon = await call("GET", "/api/eng/attempts", null);
    assert.equal(anon.status, 401, "no token is refused");
    const list = await call("GET", "/api/eng/attempts", token);
    assert.equal(list.status, 200, JSON.stringify(list.json));
    const pending = (list.json.invitations as Json[]).map((i) => i.id);
    assert.ok(pending.includes(invitation.id), "the invitation is listed for the candidate");
    const intruderList = await call("GET", "/api/eng/attempts", intruderToken);
    assert.equal((intruderList.json.invitations as Json[]).length, 0, "another account sees no invitations");
    pass("task list: bearer token required; the candidate sees their invitation, another account sees none");

    const accepted = await call("POST", "/api/eng/invitations/accept", token, { invitationId: invitation.id });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
    const attemptId = String(accepted.json.attemptId);
    const again = await call("POST", "/api/eng/invitations/accept", token, { invitationId: invitation.id });
    assert.equal(String(again.json.attemptId), attemptId, "re-accepting returns the same attempt");
    const stolen = await call("GET", `/api/eng/attempts/${attemptId}`, intruderToken);
    assert.equal(stolen.status, 404, "another account cannot open the attempt");
    pass("accept is idempotent; another account gets 404 on the attempt");

    const viewRes = await call("GET", `/api/eng/attempts/${attemptId}`, token);
    assert.equal(viewRes.status, 200);
    const view = viewRes.json.view as Json;
    const starterRoot = String((view.scenario as Json).starterRoot);
    assert.ok(starterRoot.length > 0);
    const consent = await call("POST", `/api/eng/attempts/${attemptId}/consent`, token, {});
    assert.equal(consent.status, 200, JSON.stringify(consent.json));
    pass("view loads with the starter root; consent recorded");

    const starter = await call("GET", `/api/eng/attempts/${attemptId}/starter`, token);
    assert.equal(starter.status, 200);
    const expected = starter.headers.get("x-content-sha256");
    assert.ok(expected, "starter carries X-Content-SHA256");
    assert.equal(createHash("sha256").update(starter.bytes).digest("hex"), expected.toLowerCase());
    pass("starter download matches its X-Content-SHA256 header");

    const code = [...expectedSetupCodes(CURRENT_SCENARIO).keys()][0];
    const badSetup = await call("POST", `/api/eng/attempts/${attemptId}/preflight`, token, { code: "HWR-00000000" });
    assert.ok(badSetup.status >= 400, "a wrong setup code is refused");
    const setup = await call("POST", `/api/eng/attempts/${attemptId}/preflight`, token, { code });
    assert.equal(setup.status, 200, JSON.stringify(setup.json));
    const start = await call("POST", `/api/eng/attempts/${attemptId}/start`, token, {});
    assert.equal(start.status, 200, JSON.stringify(start.json));
    const { data: startedRow } = await db.from("eng_attempts").select("status").eq("id", attemptId).single();
    assert.equal(startedRow?.status, "in_progress");
    pass("setup code checked; task started");

    const clientMsgId = `d${randomUUID().replace(/-/g, "")}`;
    const sent = await call("POST", `/api/eng/attempts/${attemptId}/messages`, token, { body: "Should a 410 response be retried?", clientMsgId }, 120000);
    assert.equal(sent.status, 200, JSON.stringify(sent.json));
    assert.ok(Array.isArray(sent.json.messages), JSON.stringify(sent.json));
    const { data: stored } = await db.from("eng_messages").select("sender, client_msg_id").eq("attempt_id", attemptId);
    assert.equal(stored?.filter((m) => m.client_msg_id === clientMsgId).length, 1, "the candidate message is stored once");
    assert.equal(stored?.filter((m) => m.client_msg_id === `reply_${clientMsgId}`).length, 1, "one teammate reply is stored");
    pass("team message sent; the reply is composed on the server");

    const draftSave = await call("PUT", `/api/eng/attempts/${attemptId}/drafts`, token, { field: "what_changed", body: "Started on the retry policy.", baseRevision: 0 });
    assert.equal(draftSave.status, 200, JSON.stringify(draftSave.json));
    const staleDraft = await call("PUT", `/api/eng/attempts/${attemptId}/drafts`, token, { field: "what_changed", body: "Stale edit", baseRevision: 0 });
    assert.equal(staleDraft.status, 409, "a stale revision conflicts");
    pass("draft saves; a stale revision returns 409 with the current text");

    const archive = submissionArchive(starter.bytes);
    const init = await call("POST", `/api/eng/attempts/${attemptId}/uploads`, token, { fileName: `${starterRoot}.zip`, byteSize: archive.length });
    assert.equal(init.status, 200, JSON.stringify(init.json));
    const uploadId = String(init.json.uploadId);
    const signedUrl = String(init.json.signedUrl);
    assert.equal(hostOf(signedUrl), `${PROJECT_REF}.supabase.co`, "the signed upload URL is this deployment's storage");
    const { data: uploadRow } = await db.from("eng_uploads").select("storage_path").eq("id", uploadId).single();
    if (uploadRow?.storage_path) storagePaths.push(uploadRow.storage_path as string);
    const put = await fetch(signedUrl, {
      method: "PUT",
      headers: { apikey: anonKey!, "x-upsert": "false", "content-type": "application/zip" },
      body: Buffer.from(archive),
      signal: AbortSignal.timeout(120000),
    });
    assert.ok(put.ok, `signed upload PUT returned ${put.status}`);
    const fin = await call("POST", `/api/eng/attempts/${attemptId}/uploads/${uploadId}/finalize`, token, {});
    assert.equal(fin.status, 200, JSON.stringify(fin.json));
    const upload = fin.json.upload as Json;
    assert.equal(upload.status, "accepted", JSON.stringify(upload));
    assert.equal(String(upload.sha256).toLowerCase(), createHash("sha256").update(archive).digest("hex"), "server hash equals the local hash");
    pass("upload: initiate, PUT to signed storage URL, finalize accepted with a matching hash");

    const answers = {
      uploadId,
      what_changed: "Retries now stop on 4xx and back off on 5xx.",
      testing: "Ran the public tests.",
      risks: "Clock skew in backoff.",
      next_steps: "Add jitter.",
      ai_use: "None.",
    };
    let submit = await call("POST", `/api/eng/attempts/${attemptId}/submit`, token, answers);
    if (submit.status !== 200) {
      assert.match(String(submit.json.error ?? ""), /update|posted/i, `first submit: ${JSON.stringify(submit.json)}`);
      const ack = await call("POST", `/api/eng/attempts/${attemptId}/acknowledge-update`, token, {});
      assert.equal(ack.status, 200, JSON.stringify(ack.json));
      assert.ok(ack.json.acknowledgedAt, "acknowledgement time returned");
      submit = await call("POST", `/api/eng/attempts/${attemptId}/submit`, token, answers);
    }
    assert.equal(submit.status, 200, JSON.stringify(submit.json));
    const receipt = submit.json.receipt as Json;
    assert.ok(receipt.submissionId, "receipt has a submission id");
    const repeat = await call("POST", `/api/eng/attempts/${attemptId}/submit`, token, answers);
    assert.equal((repeat.json.receipt as Json).submissionId, receipt.submissionId, "re-submitting returns the same receipt");
    pass("submit: requirement update posted and acknowledged first, receipt returned, retry idempotent");

    const report = await call("GET", `/api/eng/attempts/${attemptId}/report`, token);
    assert.equal(report.status, 200, JSON.stringify(report.json));
    assert.equal(report.json.report, null, "no report before the hiring team releases one");
    const intruderReport = await call("GET", `/api/eng/attempts/${attemptId}/report`, intruderToken);
    assert.equal(intruderReport.status, 404);
    pass("report is null until released and hidden from other accounts");

    console.log(`DESKTOP_ENG_HTTP_OK ${passed} checks`);
  } finally {
    await cleanup(db, orgIds, userIds, storagePaths);
  }
}

async function cleanup(db: SupabaseClient, orgIds: string[], userIds: string[], storagePaths: string[]) {
  if (storagePaths.length) await db.storage.from("eng-submissions").remove(storagePaths);
  if (orgIds.length) {
    if (!devDbUrl || !devDbUrl.includes(PROJECT_REF)) {
      console.log(`CLEANUP PARTIAL: FYDELL_DEV_DB_URL must name ${PROJECT_REF}; append-only rows for orgs ${orgIds.join(", ")} remain.`);
      return;
    }
    const sql = postgres(devDbUrl, { max: 1, prepare: false });
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe("set local session_replication_role = replica");
        const attemptIds = (await tx`select id from public.eng_attempts where organization_id = any(${orgIds}::uuid[])`).map((r) => r.id as string);
        for (const table of ["eng_report_responses", "eng_finding_flags", "eng_decisions", "eng_review_notes", "eng_reports", "eng_evaluation_runs", "eng_submissions", "eng_uploads", "eng_drafts", "eng_messages", "eng_attempt_events"]) {
          await tx.unsafe(`delete from public.${table} where attempt_id = any($1::uuid[])`, [attemptIds]);
        }
        await tx`delete from public.eng_attempts where organization_id = any(${orgIds}::uuid[])`;
        await tx`delete from public.eng_invitations where organization_id = any(${orgIds}::uuid[])`;
        await tx`delete from public.eng_roles where organization_id = any(${orgIds}::uuid[])`;
      });
    } finally {
      await sql.end();
    }
  }
  for (const id of orgIds) await db.from("organizations").delete().eq("id", id);
  for (const id of userIds) await db.auth.admin.deleteUser(id);
  console.log("Removed the disposable workspace, accounts, rows and files this run created.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : "desktop eng HTTP test failed");
  process.exitCode = 1;
});
