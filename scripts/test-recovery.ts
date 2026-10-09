/**
 * Recovery after interrupted work, live against fydell-dev (btbmvrvynnrhapjdkunz).
 *
 * 1. Lost submission acknowledgment: the submission row is recorded but the
 *    request dies before the attempt is closed and evaluation is queued. A page
 *    reload (over HTTP) completes it; retries and concurrent retries return the
 *    same receipt and queue nothing twice.
 * 2. Authoring worker killed: a job still "running" under an expired lease is
 *    counted as an attempt and fails as worker_lost at its limit; a job whose
 *    lease is still held is left alone.
 * 3. Email outbox worker killed: a row stuck in "processing" past the stale-lock
 *    window is reclaimed; one that already used its last attempt fails visibly.
 *
 * Everything created is removed at the end.
 *
 *   npx tsx --conditions react-server --env-file=.env.local scripts/test-recovery.ts
 *
 * Needs the dev server on FYDELL_TEST_BASE_URL (default http://localhost:3000).
 */
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
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
  console.log("SKIP recovery: FYDELL_DEV_SUPABASE_URL, FYDELL_DEV_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
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
type Reply = { status: number; text: string; json: Json };

let passed = 0;
const failures: string[] = [];
function check(label: string, ok: boolean, detail = "") {
  if (ok) passed += 1;
  else failures.push(`${label}${detail ? ` (${detail})` : ""}`);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? `: ${detail}` : ""}`);
}

const RESTART_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "UND_ERR_SOCKET", "UND_ERR_HEADERS_TIMEOUT"]);

function retryable(err: unknown): boolean {
  if (err instanceof Error && err.name === "TimeoutError") return true;
  const cause = err instanceof Error ? (err.cause as { code?: string } | undefined) : undefined;
  return RESTART_CODES.has(cause?.code ?? "");
}

/** The shared dev server is restarted by a watchdog when it hangs; wait for it and retry. */
async function send(url: string, init: RequestInit): Promise<Response> {
  for (let tries = 0; ; tries += 1) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(180000) });
    } catch (err) {
      if (!retryable(err) || tries >= 10) throw err;
      await new Promise((r) => setTimeout(r, 60000));
    }
  }
}

function fakeIp(): string {
  return `10.${(randomBytes(1)[0] % 250) + 1}.${randomBytes(1)[0]}.${randomBytes(1)[0]}`;
}

async function http(method: string, route: string, token: string, body?: unknown): Promise<Reply> {
  const headers: Record<string, string> = { "x-forwarded-for": fakeIp(), origin: base, authorization: `Bearer ${token}` };
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await send(`${base}${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
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
  return { status: res.status, text, json };
}

async function waitForServer() {
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/login`, { signal: AbortSignal.timeout(60000) });
      if (res.status === 200) return;
    } catch {
      // Restarting or compiling.
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`No server answering on ${base}.`);
}

function submissionArchive(starter: Uint8Array): Uint8Array {
  const files = unzipSync(starter);
  const reference = readFileSync(path.join(process.cwd(), "scenarios", "backend-webhook-retry", "fixtures", "reference", "webhooks", "dispatcher.py"));
  const key = Object.keys(files).find((k) => k.endsWith("webhooks/dispatcher.py"));
  if (!key) throw new Error("starter is missing webhooks/dispatcher.py");
  files[key] = new Uint8Array(reference);
  return zipSync(files);
}

function receiptOf(reply: Reply): Json {
  const r = reply.json.receipt;
  return r && typeof r === "object" ? (r as Json) : {};
}

async function main() {
  await waitForServer();
  const { engAdmin } = await import("../src/lib/eng/context");
  const roles = await import("../src/lib/eng/roles");
  const invitations = await import("../src/lib/eng/invitations");
  const { validateHandoff } = await import("../src/lib/eng/submissions");
  const { processJob } = await import("../src/lib/eng/authoring/jobs");
  const { processEmailOutbox } = await import("../src/lib/ops/process-outbox");
  const { CURRENT_SCENARIO, expectedSetupCodes } = await import("../src/lib/eng/scenarios");
  type EngMember = import("../src/lib/eng/context").EngMember;

  const db = engAdmin();
  const tag = randomBytes(4).toString("hex");
  const password = `${randomBytes(18).toString("base64url")}Aa1!`;
  const emails = { emp: `recovery-${tag}-emp@example.com`, cand: `recovery-${tag}-cand@example.com` };
  const storagePaths: string[] = [];

  try {
    const ids: Record<"emp" | "cand", string> = { emp: "", cand: "" };
    for (const who of ["emp", "cand"] as const) {
      const { data, error } = await db.auth.admin.createUser({ email: emails[who], password, email_confirm: true });
      if (error || !data.user) throw new Error(`could not create disposable user: ${error?.message}`);
      ids[who] = data.user.id;
    }
    await db.from("email_inbox_verifications").insert({ user_id: ids.cand, email: emails.cand, method: "dev_backfill" });
    const { data: org, error: orgError } = await db
      .from("organizations")
      .insert({ name: `Recovery ${tag}`, owner_id: ids.emp, owner_email: emails.emp, created_by: ids.emp })
      .select("id, name")
      .single();
    if (orgError || !org) throw new Error(`could not create org: ${orgError?.message}`);
    await db.from("organization_members").insert({ organization_id: org.id, user_id: ids.emp, role: "owner", status: "active", joined_at: new Date().toISOString() });
    const member: EngMember = { userId: ids.emp, email: emails.emp, organizationId: org.id as string, organizationName: org.name as string, role: "owner" };

    // ---------------------------------------------------------------- 1. lost submission acknowledgment
    const draftRole = await roles.createRole(db, member, {
      title: "Backend engineer (recovery)",
      stack: ["Python"],
      responsibilities: "Own webhook delivery.",
      evaluationFocus: ["correctness", "engineering_judgment"],
      companyContext: "Disposable recovery workspace.",
    });
    const role = await roles.setRoleStatus(db, draftRole, "published");
    const { invitation } = await invitations.createInvitation(db, member, role, { email: emails.cand, name: "Recovery Candidate" });
    const client = createClient(devUrl!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signIn, error: signInError } = await client.auth.signInWithPassword({ email: emails.cand, password });
    if (signInError || !signIn.session) throw new Error(`sign-in failed for a disposable account: ${signInError?.message}`);
    const token = signIn.session.access_token;

    const accepted = await http("POST", "/api/eng/invitations/accept", token, { invitationId: invitation.id });
    if (accepted.status !== 200) throw new Error(`accept failed: ${accepted.status}`);
    const attemptId = String(accepted.json.attemptId);
    await http("POST", `/api/eng/attempts/${attemptId}/consent`, token, {});
    const starter = await send(`${base}/api/eng/attempts/${attemptId}/starter`, { headers: { authorization: `Bearer ${token}` } });
    const starterBytes = new Uint8Array(await starter.arrayBuffer());
    const code = [...expectedSetupCodes(CURRENT_SCENARIO).keys()][0];
    await http("POST", `/api/eng/attempts/${attemptId}/preflight`, token, { code });
    await http("POST", `/api/eng/attempts/${attemptId}/start`, token, {});
    const view = await http("GET", `/api/eng/attempts/${attemptId}`, token);
    const starterRoot = String(((view.json.view as Json).scenario as Json).starterRoot);
    const archive = submissionArchive(starterBytes);
    const init = await http("POST", `/api/eng/attempts/${attemptId}/uploads`, token, { fileName: `${starterRoot}.zip`, byteSize: archive.length });
    const uploadId = String(init.json.uploadId);
    const { data: uploadRow } = await db.from("eng_uploads").select("storage_path").eq("id", uploadId).single();
    if (uploadRow?.storage_path) storagePaths.push(String(uploadRow.storage_path));
    const put = await fetch(String(init.json.signedUrl), {
      method: "PUT",
      headers: { apikey: anonKey!, "x-upsert": "false", "content-type": "application/zip" },
      body: Buffer.from(archive),
    });
    if (!put.ok) throw new Error(`signed upload failed: ${put.status}`);
    await http("POST", `/api/eng/attempts/${attemptId}/uploads/${uploadId}/finalize`, token, {});
    const { data: upload } = await db.from("eng_uploads").select("status, sha256, byte_size").eq("id", uploadId).single();
    if (upload?.status !== "accepted") throw new Error(`upload was not accepted: ${String(upload?.status)}`);

    const answers = { uploadId, what_changed: "Retries stop on 4xx.", testing: "Public tests.", risks: "Clock skew.", next_steps: "Jitter.", ai_use: "None." };
    const handoff = validateHandoff(answers);
    if (handoff.ok === false) throw new Error(`handoff rejected: ${handoff.error}`);
    // The submit request records the submission and then dies.
    const { data: recorded, error: recordError } = await db
      .from("eng_submissions")
      .insert({
        attempt_id: attemptId,
        upload_id: uploadId,
        archive_sha256: upload.sha256,
        archive_bytes: upload.byte_size,
        handoff: handoff.handoff,
        ai_disclosure: handoff.aiDisclosure,
        late: false,
      })
      .select("id")
      .single();
    if (recordError || !recorded) throw new Error(`could not record the fixture submission: ${recordError?.message}`);
    const submissionId = String(recorded.id);
    const { data: stuck } = await db.from("eng_attempts").select("status").eq("id", attemptId).single();
    check("fixture: submission recorded, attempt still in progress", stuck?.status === "in_progress", String(stuck?.status));

    const reload = await http("GET", `/api/eng/attempts/${attemptId}`, token);
    const reloadView = (reload.json.view ?? {}) as Json;
    const reloadReceipt = (reloadView.receipt ?? null) as Json | null;
    check("reloading the attempt shows the receipt", reload.status === 200 && reloadReceipt !== null && reloadReceipt.submissionId === submissionId, `${reload.status} ${JSON.stringify(reloadReceipt)?.slice(0, 80)}`);
    const { data: settled } = await db.from("eng_attempts").select("status, submitted_at").eq("id", attemptId).single();
    check("the reload closes the attempt as submitted", settled?.status === "submitted" && Boolean(settled?.submitted_at), String(settled?.status));
    const countRuns = async () => (await db.from("eng_evaluation_runs").select("id", { count: "exact", head: true }).eq("submission_id", submissionId)).count ?? 0;
    const countAccepted = async () =>
      (await db.from("eng_attempt_events").select("id", { count: "exact", head: true }).eq("attempt_id", attemptId).eq("event_type", "submission_accepted")).count ?? 0;
    const runsAfterReload = await countRuns();
    check("evaluation is queued for the recovered submission", runsAfterReload >= 1, String(runsAfterReload));
    check("acceptance is logged once", (await countAccepted()) === 1, String(await countAccepted()));

    const retry = await http("POST", `/api/eng/attempts/${attemptId}/submit`, token, answers);
    check("the client's retry gets the original receipt", retry.status === 200 && receiptOf(retry).submissionId === submissionId && receiptOf(retry).alreadySubmitted === true, `${retry.status} ${retry.text.slice(0, 120)}`);
    const [r1, r2] = await Promise.all([
      http("POST", `/api/eng/attempts/${attemptId}/submit`, token, answers),
      http("POST", `/api/eng/attempts/${attemptId}/submit`, token, answers),
    ]);
    check("two concurrent retries return the same receipt", r1.status === 200 && r2.status === 200 && receiptOf(r1).submissionId === submissionId && receiptOf(r2).submissionId === submissionId, `${r1.status}/${r2.status}`);
    const { count: submissions } = await db.from("eng_submissions").select("id", { count: "exact", head: true }).eq("attempt_id", attemptId);
    check("still exactly one submission", submissions === 1, String(submissions));
    check("retries queue no second evaluation", (await countRuns()) === runsAfterReload, `${runsAfterReload} -> ${await countRuns()}`);
    check("retries log no second acceptance", (await countAccepted()) === 1, String(await countAccepted()));

    // ---------------------------------------------------------------- 2. authoring worker killed
    const mkDraft = async (label: string) => {
      const { data, error } = await db
        .from("eng_scenario_drafts")
        .insert({ organization_id: org.id, path: "template", title: `Recovery ${label} ${tag}`, family: "backend_api_engineer", created_by: ids.emp })
        .select("id")
        .single();
      if (error || !data) throw new Error(`could not create draft: ${error?.message}`);
      return String(data.id);
    };
    const past = new Date(Date.now() - 60_000).toISOString();
    const mkJob = async (draftId: string, patch: Json) => {
      const { data, error } = await db
        .from("eng_authoring_jobs")
        .insert({
          draft_id: draftId,
          organization_id: org.id,
          kind: "test",
          draft_revision: 1,
          status: "running",
          stages: [{ id: "environment", label: "Preparing environment", status: "running" }, { id: "run", label: "Run", status: "pending" }, { id: "record", label: "Record", status: "pending" }],
          requested_by: ids.emp,
          max_attempts: 3,
          ...patch,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`could not create job: ${error?.message}`);
      return String(data.id);
    };
    const job = async (id: string) => (await db.from("eng_authoring_jobs").select("*").eq("id", id).single()).data as Json;

    const lastLife = await mkJob(await mkDraft("last"), { lease_owner: randomUUID(), lease_expires_at: past, attempt_count: 2, started_at: past });
    await Promise.all([processJob(db, lastLife), processJob(db, lastLife)]);
    const failed = await job(lastLife);
    check("a job whose worker died on its last attempt fails as worker_lost", failed.status === "failed" && failed.error_code === "worker_lost" && failed.attempt_count === 3, `${String(failed.status)} ${String(failed.error_code)} ${String(failed.attempt_count)}`);
    const failedStage = (failed.stages as Array<{ id: string; status: string }>).find((s) => s.id === "environment");
    check("the interrupted stage is marked failed and the lease released", failedStage?.status === "failed" && failed.lease_owner === null, `${failedStage?.status} ${String(failed.lease_owner)}`);

    const resumed = await mkJob(await mkDraft("resume"), { lease_owner: randomUUID(), lease_expires_at: past, attempt_count: 0, started_at: past });
    await processJob(db, resumed);
    const afterResume = await job(resumed);
    // The draft has no package, so the resumed run ends with a non-retryable authoring error after the lost run was counted.
    check("a job whose worker died is reclaimed and the lost run is counted", afterResume.status === "failed" && afterResume.error_code === "authoring_error" && afterResume.attempt_count === 2, `${String(afterResume.status)} ${String(afterResume.error_code)} ${String(afterResume.attempt_count)}`);

    const heldOwner = randomUUID();
    const held = await mkJob(await mkDraft("held"), { lease_owner: heldOwner, lease_expires_at: new Date(Date.now() + 120_000).toISOString(), attempt_count: 0, started_at: past });
    await processJob(db, held);
    const afterHeld = await job(held);
    check("a job under a live lease is left to its worker", afterHeld.status === "running" && afterHeld.lease_owner === heldOwner && afterHeld.attempt_count === 0, `${String(afterHeld.status)} ${String(afterHeld.attempt_count)}`);

    // ---------------------------------------------------------------- 3. email outbox worker killed
    const staleAt = new Date(Date.now() - 20 * 60_000).toISOString();
    const mkMail = async (n: number, attempts: number) => {
      const { data, error } = await db
        .from("email_outbox")
        .insert({
          event_type: "recovery_test",
          template_key: "pilot_request_received",
          recipient_email: `recovery-${tag}-mail${n}@example.com`,
          status: "processing",
          priority: -1_000_000,
          attempt_count: attempts,
          locked_at: staleAt,
          locked_by: "worker-that-died",
          scheduled_for: staleAt,
          idempotency_key: `recovery-${tag}-${n}`,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`could not create outbox row: ${error?.message}`);
      return String(data.id);
    };
    const mail = async (id: string) => (await db.from("email_outbox").select("status, attempt_count, locked_by, last_error").eq("id", id).single()).data as Json;

    const reclaimable = await mkMail(1, 1);
    await processEmailOutbox(1);
    const reclaimed = await mail(reclaimable);
    // With no provider key configured in this test, the reclaimed send is recorded as a failure to retry later; nothing is sent.
    check("an email stuck in processing is reclaimed by the next run", reclaimed.attempt_count === 2 && reclaimed.locked_by === null && reclaimed.status === "failed" && reclaimed.last_error === "RESEND_API_KEY is not configured", JSON.stringify(reclaimed));

    const exhausted = await mkMail(2, 5);
    await processEmailOutbox(1);
    const gaveUp = await mail(exhausted);
    check("an email stuck on its last attempt fails visibly instead of resending", gaveUp.status === "failed" && gaveUp.attempt_count === 5 && String(gaveUp.last_error).includes("stopped responding"), JSON.stringify(gaveUp));
  } finally {
    if (storagePaths.length) await db.storage.from("eng-submissions").remove(storagePaths);
    await cleanup(tag);
  }

  console.log(`\nRECOVERY ${passed}/${passed + failures.length} passed`);
  if (failures.length) {
    for (const f of failures) console.log(`  FAILED: ${f}`);
    process.exitCode = 1;
  }
}

function cleanupSql(tag: string): string {
  if (!/^[0-9a-f]{8}$/.test(tag)) throw new Error("cleanup tag must be 8 hex characters");
  const users = `select id from auth.users where email like 'recovery-${tag}-%@example.com'`;
  const orgs = `select id from public.organizations where name = 'Recovery ${tag}'`;
  const children = [
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
    `create temp table recovery_attempts on commit drop as select id from public.eng_attempts where organization_id in (${orgs});`,
    ...children.map((t) => `delete from public.${t} where attempt_id in (select id from recovery_attempts);`),
    `delete from public.eng_attempts where organization_id in (${orgs});`,
    `delete from public.eng_invitations where organization_id in (${orgs});`,
    `delete from public.eng_roles where organization_id in (${orgs});`,
    `delete from public.eng_authoring_jobs where organization_id in (${orgs});`,
    `delete from public.eng_scenario_validations where organization_id in (${orgs});`,
    `delete from public.eng_scenario_draft_protected where organization_id in (${orgs});`,
    `delete from public.eng_scenario_drafts where organization_id in (${orgs});`,
    `delete from public.email_outbox where recipient_email like 'recovery-${tag}-%@example.com';`,
    `delete from public.audit_logs where actor_user_id in (${users}) or organization_id in (${orgs});`,
    "set local session_replication_role = origin;",
    `delete from public.organizations where id in (${orgs});`,
    `delete from auth.users where email like 'recovery-${tag}-%@example.com';`,
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
  console.error(error instanceof Error ? `${error.stack ?? error.message}${cause ? ` (cause ${cause})` : ""}` : "recovery test failed");
  process.exitCode = 1;
});
