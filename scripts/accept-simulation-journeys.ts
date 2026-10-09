/**
 * Acceptance journeys 8, 9 and 10 for simulations, live against the shared
 * dev server (http://localhost:3000) and the DEVELOPMENT Supabase project.
 *
 *   8. Full chain: invitation, disclosure, environment check, teammate chat
 *      (including a repeated question), assistant, files, public tests,
 *      handoff, submission with a client submission id, frozen manifest,
 *      analysis on the isolated sandbox, employer report and release.
 *   9. Crash recovery: a child process submits and dies right after each
 *      persistence step; retries and reloads produce exactly one submission,
 *      one accepted upload, one analysis run, one evaluation and one report.
 *      An analysis worker is also killed mid-run and the lease reclaimed.
 *  10. Failures: a model outage leaves the draft and the assistant allowance
 *      intact; a test-infrastructure failure keeps the submission, shows a
 *      platform delay rather than a result, records no evaluation or report,
 *      and a retry then produces the report.
 *
 * Steps that execute candidate code (environment check, public tests,
 * analysis) run in this process on the isolated Vercel Sandbox, never on the
 * app server. Everything else goes through the dev server's HTTP routes.
 *
 *   $env:VERCEL_OIDC_TOKEN / $env:FYDELL_EXECUTION_SNAPSHOT_ID set in the shell
 *   npx tsx --conditions react-server scripts/accept-simulation-journeys.ts [8] [9] [10]
 *
 * Credentials come from %TEMP%\fydell-walk.txt and are never printed.
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Session } from "@supabase/supabase-js";
import { claimRunById, journeyHandoff, KILL_POINTS, loadEnvLocal, type KillPoint } from "./accept-simulation-shared";

loadEnvLocal();

const DEV_REF = "btbmvrvynnrhapjdkunz";
const PROD_REF = "qtrhwrcxthtqvkeerptp";
const BASE = "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const TEMPLATE_TITLE = "Prevent duplicate webhook processing";

type Json = Record<string, unknown>;
type Actor = { label: string; email: string; userId: string; token: string; cookie: string };
type Lib = Awaited<ReturnType<typeof loadLib>>;

const results: Array<{ journey: string; check: string; evidence: string; detail: string }> = [];
function pass(journey: string, check: string, evidence: string, detail = "") {
  results.push({ journey, check, evidence, detail });
  console.log(`  ok   ${check}${detail ? ` (${detail})` : ""} [${evidence}]`);
}
function step(title: string) {
  console.log(`\n${title}`);
}
function obj(v: unknown, what: string): Json {
  assert.ok(v && typeof v === "object" && !Array.isArray(v), `${what} is not an object`);
  return v as Json;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadLib() {
  const [context, attempts, runtime, collaboration, queue, runner, manifest, evalRun, leakage, pkgMod, state, core] = await Promise.all([
    import("../src/lib/eng/context"),
    import("../src/lib/eng/attempts"),
    import("../src/lib/eng/authored/runtime"),
    import("../src/lib/eng/authored/collaboration"),
    import("../src/lib/eng/evaluation/queue"),
    import("../src/lib/eng/authoring/runner"),
    import("../src/lib/eng/authored/manifest"),
    import("../src/lib/eng/authored/evaluation-run"),
    import("../src/lib/eng/authoring/leakage"),
    import("../src/lib/eng/authoring/package"),
    import("../src/lib/eng/state"),
    import("../src/lib/eng/authored/collaboration-core"),
  ]);
  const { routeRecipient } = await import("../src/lib/email-html");
  return { ...context, ...attempts, ...runtime, ...collaboration, ...queue, ...runner, ...manifest, ...evalRun, ...leakage, ...pkgMod, ...state, ...core, routeRecipient };
}

function readWalkFile(): { employer: string; engineer: string; password: string } {
  const path = process.env.FYDELL_WALK_FILE ?? join(tmpdir(), "fydell-walk.txt");
  const fields = new Map<string, string>();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^(\w+)\s+(\S+)\s*$/.exec(line.trim());
    if (m) fields.set(m[1].toLowerCase(), m[2]);
  }
  const employer = fields.get("employer");
  const engineer = fields.get("engineer");
  const password = fields.get("password");
  if (!employer || !engineer || !password) throw new Error("The walk file needs employer, engineer and password lines.");
  for (const email of [employer, engineer]) if (!email.endsWith("@example.com")) throw new Error("Only synthetic @example.com accounts may be used.");
  return { employer, engineer, password };
}

function sessionCookie(session: Session): string {
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
  const name = `sb-${DEV_REF}-auth-token`;
  if (value.length <= 3180) return `${name}=${value}`;
  const parts: string[] = [];
  for (let i = 0, n = 0; i < value.length; i += 3180, n++) parts.push(`${name}.${n}=${value.slice(i, i + 3180)}`);
  return parts.join("; ");
}

async function signIn(label: string, email: string, password: string): Promise<Actor> {
  const client = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new Error(`${label} could not sign in`);
  return { label, email, userId: data.user.id, token: data.session.access_token, cookie: sessionCookie(data.session) };
}

/**
 * The shared dev server is restarted by a watchdog when it runs out of
 * memory. A dropped connection waits for it to come back and retries; every
 * request this script repeats is idempotent or creates a fresh synthetic row.
 */
async function fetchWithRestart(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(280_000) });
    } catch (error) {
      if (attempt >= 4) throw error;
      console.log(`  ..   dev server dropped the connection; waiting for it (${attempt})`);
      const until = Date.now() + 300_000;
      while (Date.now() < until) {
        await sleep(5000);
        const up = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(30_000) }).then((r) => r.ok, () => false);
        if (up) break;
      }
    }
  }
}

async function call(actor: Actor | null, method: string, path: string, body?: unknown, via: "bearer" | "cookie" = "bearer"): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = {};
  if (actor && via === "bearer") headers.authorization = `Bearer ${actor.token}`;
  if (actor && via === "cookie") headers.cookie = actor.cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetchWithRestart(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json: Json = {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) json = parsed as Json;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function expectStatus(actor: Actor | null, method: string, path: string, expected: number[], body?: unknown): Promise<Json> {
  const r = await call(actor, method, path, body);
  assert.ok(expected.includes(r.status), `${method} ${path} returned ${r.status}: ${JSON.stringify(r.json).slice(0, 300)}`);
  return r.json;
}

async function page(actor: Actor, path: string): Promise<{ status: number; html: string }> {
  const res = await fetchWithRestart(`${BASE}${path}`, { headers: { cookie: actor.cookie }, redirect: "manual" });
  return { status: res.status, html: await res.text() };
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

type Ctx = {
  lib: Lib;
  db: ReturnType<Lib["engAdmin"]>;
  employer: Actor;
  engineer: Actor;
  orgId: string;
  versionId: string;
  pkg: NonNullable<ReturnType<Lib["asPackage"]>>;
  prot: ReturnType<Lib["asProtected"]>;
  fingerprints: ReturnType<Lib["privateFingerprints"]>;
  stamp: string;
};

async function setup(lib: Lib): Promise<Ctx> {
  if (!SUPABASE_URL.includes(DEV_REF) || SUPABASE_URL.includes(PROD_REF)) throw new Error("NEXT_PUBLIC_SUPABASE_URL must point at the development project.");
  const selection = lib.selectRunner();
  assert.ok(selection.ok && selection.runner.info.isolated, "the isolated sandbox runner is configured in this process (fresh VERCEL_OIDC_TOKEN and FYDELL_EXECUTION_SNAPSHOT_ID)");
  const db = lib.engAdmin();
  const walk = readWalkFile();
  const employer = await signIn("employer", walk.employer, walk.password);
  const engineer = await signIn("engineer", walk.engineer, walk.password);
  const { data: membership } = await db.from("organization_members").select("organization_id").eq("user_id", employer.userId).eq("status", "active").order("joined_at").limit(1).single();
  const orgId = (membership as { organization_id: string }).organization_id;
  const { data: versions } = await db
    .from("eng_scenario_versions")
    .select("id, content, published_at")
    .eq("organization_id", orgId)
    .eq("origin", "employer_authored")
    .eq("status", "published")
    .eq("title", TEMPLATE_TITLE)
    .order("published_at", { ascending: false })
    .limit(1);
  const row = ((versions ?? []) as Array<{ id: string; content: unknown }>)[0];
  assert.ok(row, "a published webhook-dedupe simulation exists in the employer's organisation");
  const pkg = lib.asPackage(row.content);
  assert.ok(pkg, "the published package reads");
  const { data: protRow } = await db.from("eng_scenario_version_protected").select("content").eq("version_id", row.id).single();
  const prot = lib.asProtected((protRow as { content: unknown }).content);
  return { lib, db, employer, engineer, orgId, versionId: row.id, pkg, prot, fingerprints: lib.privateFingerprints(pkg, prot), stamp: new Date().toISOString().slice(0, 16) };
}

/** A fresh role, invitation and accepted attempt, consented and started. */
async function startedAttempt(ctx: Ctx, label: string): Promise<{ attemptId: string; A: string; view: Json }> {
  const { employer, engineer } = ctx;
  const role = obj(
    (await expectStatus(employer, "POST", "/api/eng/roles", [201], {
      title: `Backend Engineer, journey ${label} (${ctx.stamp})`,
      stack: ["Python", "SQLite"],
      responsibilities: "Own webhook processing reliability.",
      evaluationFocus: ["correctness", "work_communication"],
      companyContext: "Synthetic payments company used for acceptance testing.",
    })).role,
    "role",
  );
  const roleId = String(role.id);
  await expectStatus(employer, "PATCH", `/api/eng/roles/${roleId}`, [200], { status: "published" });
  const invite = await expectStatus(employer, "POST", `/api/eng/roles/${roleId}/invitations`, [201], { email: engineer.email, name: "Journey Engineer", scenarioVersionId: ctx.versionId });
  const route = ctx.lib.routeRecipient(engineer.email, false);
  assert.ok(invite.emailDelivery !== "sent" || ("to" in route && route.to.endsWith("@resend.dev")), "development invitation email only reaches Resend's test inbox");
  const attemptId = String((await expectStatus(engineer, "POST", "/api/eng/invitations/accept", [200], { invitationId: invite.invitationId })).attemptId);
  const A = `/api/eng/attempts/${attemptId}/authored`;
  await expectStatus(engineer, "POST", A, [200], { action: "consent" });
  const check = await ctx.lib.runPublicTests(ctx.db, await loadCandidate(ctx, attemptId), "environment_check", null, engineer.userId);
  assert.equal(check.status, "ran", `environment check ${check.status}: ${check.detail ?? ""}`);
  assert.equal(check.isolated, true, "the environment check ran on the isolated sandbox");
  await expectStatus(engineer, "POST", A, [200], { action: "environment_ready" });
  const view = obj((await expectStatus(engineer, "POST", A, [200], { action: "start" })).view, "view");
  assert.equal(obj(view.attempt, "attempt").status, "in_progress");
  return { attemptId, A, view };
}

async function loadCandidate(ctx: Ctx, attemptId: string) {
  const attempt = await ctx.lib.getAttemptForCandidate(ctx.db, attemptId, ctx.engineer.userId);
  return ctx.lib.loadAuthored(ctx.db, attempt);
}

function referenceFiles(ctx: Ctx, starter: Array<{ path: string; content: string }>) {
  const reference = new Map(ctx.prot.reference.files.map((f) => [f.path, f.content]));
  return [
    ...starter.map((f) => ({ path: f.path, content: reference.get(f.path) ?? f.content })),
    ...[...reference].filter(([p]) => !starter.some((f) => f.path === p)).map(([path, content]) => ({ path, content })),
  ];
}

async function saveReference(ctx: Ctx, A: string, view: Json) {
  const ws = obj(view.workspace, "workspace");
  const starter = (ws.files as Array<{ path: string; content: string }>).map((f) => ({ path: f.path, content: f.content }));
  const edited = referenceFiles(ctx, starter);
  const saved = await expectStatus(ctx.engineer, "PUT", `${A}/files`, [200], { baseRevision: ws.revision, files: edited });
  return { edited, revision: Number(saved.revision) };
}

function assertNoLeaks(ctx: Ctx, context: string, value: unknown) {
  const leaks = ctx.lib.findLeaks(context, JSON.stringify(value), ctx.fingerprints);
  assert.deepEqual(leaks, [], `${context} contains private material`);
}

/** Processes one run in this process on the configured runner. */
async function processById(ctx: Ctx, runId: string): Promise<string> {
  const run = await claimRunById(ctx.db, runId, `journey-${randomUUID()}`);
  assert.ok(run, `run ${runId} could be claimed`);
  return ctx.lib.processRun(ctx.db, run);
}

async function runFor(ctx: Ctx, attemptId: string) {
  const { data } = await ctx.db.from("eng_evaluation_runs").select("*").eq("attempt_id", attemptId);
  return (data ?? []) as Array<Json & { id: string; status: string; executor: string | null; manifest_sha256: string | null; attempt_count: number; last_error_code: string | null }>;
}

async function counts(ctx: Ctx, attemptId: string) {
  const db = ctx.db;
  const [subs, uploads, runs, evals, reports, accepted] = await Promise.all([
    db.from("eng_submissions").select("id, client_submission_id, manifest_sha256").eq("attempt_id", attemptId),
    db.from("eng_uploads").select("id, status, storage_path").eq("attempt_id", attemptId),
    db.from("eng_evaluation_runs").select("id, status").eq("attempt_id", attemptId),
    db.from("eng_authored_evaluations").select("run_id").eq("attempt_id", attemptId),
    db.from("eng_reports").select("id, status").eq("attempt_id", attemptId),
    db.from("eng_attempt_events").select("id").eq("attempt_id", attemptId).eq("event_type", "submission_accepted"),
  ]);
  for (const r of [subs, uploads, runs, evals, reports, accepted]) assert.ok(!r.error, `count query failed: ${r.error?.message ?? ""}`);
  const { data: objects } = await db.storage.from("eng-submissions").list(`attempts/${attemptId}`);
  return {
    submissions: (subs.data ?? []) as Array<{ id: string; client_submission_id: string | null; manifest_sha256: string | null }>,
    uploads: (uploads.data ?? []) as Array<{ id: string; status: string; storage_path: string }>,
    runs: (runs.data ?? []) as Array<{ id: string; status: string }>,
    evaluations: (evals.data ?? []).length,
    reports: (reports.data ?? []) as Array<{ id: string; status: string }>,
    acceptedEvents: (accepted.data ?? []).length,
    storedArchives: (objects ?? []).filter((o) => o.name.endsWith(".zip")).length,
  };
}

/* ------------------------------------------------------------------ */
/* Journey 8                                                           */
/* ------------------------------------------------------------------ */

async function journey8(ctx: Ctx) {
  const J = "8";
  const { lib, db, engineer, employer, pkg } = ctx;
  step("Journey 8. Full simulation chain");
  const { attemptId, A, view } = await startedAttempt(ctx, "8");
  pass(J, "invited, accepted, consented, environment checked on the sandbox, started", "live DB + real sandbox", attemptId);

  const lifecycle = obj(view.lifecycle, "lifecycle");
  assert.equal(lifecycle.state, "active");
  const task = obj(view.task, "task");
  assert.ok(String(task.aiPolicy).length > 10 && Array.isArray(task.outOfScope), "the brief carries the AI policy and the scope");
  assertNoLeaks(ctx, "candidate view at start", view);
  pass(J, "server lifecycle is active; brief has scope and AI policy; no private material in the view", "live DB");

  /* Chat */
  const coworker = pkg.coworkers[0];
  assert.ok(coworker, "the simulation has a teammate");
  const facts = ctx.prot.coworkerFacts[coworker.id] ?? [];
  const topic = facts.find((f) => f.topics?.length)?.topics?.[0] ?? "retries";
  const ask = async (body: string) => {
    const res = obj((await expectStatus(engineer, "POST", `${A}/team`, [200], { teammateId: coworker.id, body, clientMsgId: `j8_${randomUUID().slice(0, 12)}` })).collaboration, "collaboration");
    const messages = res.messages as Json[];
    return messages[messages.length - 1];
  };
  const first = await ask(`Quick question about ${topic}: what should I know before I change anything?`);
  const second = await ask(`Sorry, to confirm about ${topic} again: what should I know before I change anything?`);
  assertNoLeaks(ctx, "teammate replies", [first, second]);
  const repeated = /^As I said earlier,/.test(String(second.body));
  pass(J, "teammate chat answered without private material", first.answeredFrom === "model" ? "real model" : "scenario notes", `first reply from ${String(first.answeredFrom)}`);
  pass(J, repeated ? "a repeated question got a one sentence answer" : "repeated question answered (the first reply cited no fact, so it was answered fresh)", "live DB", String(second.body).slice(0, 90));

  /* Assistant */
  const ws = obj(view.workspace, "workspace");
  const firstFile = (ws.files as Array<{ path: string; content: string }>).find((f) => !f.path.startsWith("tests/"));
  assert.ok(firstFile, "a non-test file exists");
  const assist = await call(engineer, "POST", `${A}/assistant`, {
    prompt: "In one sentence, what does this file do?",
    clientMsgId: `j8a_${randomUUID().slice(0, 12)}`,
    contextPaths: [firstFile.path],
    files: [{ path: firstFile.path, content: firstFile.content }],
  });
  if (assist.status === 403) pass(J, "assistant refused by the simulation's AI policy", "live DB");
  else {
    assert.equal(assist.status, 200, `assistant returned ${assist.status}`);
    const interaction = obj(assist.json.interaction, "interaction");
    assertNoLeaks(ctx, "assistant answer", interaction);
    const answered = interaction.status === "answered";
    pass(J, answered ? "assistant answered within its allowance" : "assistant reported the model unavailable without using the allowance", answered ? "real model" : "live DB, provider down", `${String(interaction.status)}, ${String(assist.json.used)} of ${String(assist.json.limit)} used`);
  }

  /* Files and public tests */
  const { edited, revision } = await saveReference(ctx, A, view);
  const stale = await call(engineer, "PUT", `${A}/files`, { baseRevision: Number(ws.revision), files: edited });
  assert.equal(stale.status, 409, "a stale save is refused");
  pass(J, "files saved with revision check; stale save refused", "live DB", `revision ${revision}`);
  const authored = await loadCandidate(ctx, attemptId);
  const pub = await lib.runPublicTests(db, authored, "workspace", edited, engineer.userId);
  assert.equal(pub.status, "ran");
  assert.equal(pub.isolated, true);
  assert.ok(pub.tests.length > 0 && pub.tests.every((t) => t.outcome === "passed"), "the public tests pass on the edited files");
  pass(J, "public tests ran on the sandbox and passed", "real sandbox", `${pub.tests.length} tests on ${pub.runnerLabel}`);

  /* Submit */
  const clientId = `web_${randomUUID().replace(/-/g, "")}`;
  const handoffBody = journeyHandoff(pkg);
  const handoff = lib.validateAuthoredHandoff(pkg, handoffBody);
  assert.ok(handoff.ok);
  const receipt = await lib.submitAuthored(db, await loadCandidate(ctx, attemptId), { files: edited, handoff: handoff.handoff, aiDisclosure: handoff.aiDisclosure, clientSubmissionId: clientId }, engineer.userId);
  const runs = await runFor(ctx, attemptId);
  assert.equal(runs.length, 1, "one analysis run is queued");
  const outcome = await processById(ctx, runs[0].id);
  assert.equal(receipt.clientSubmissionId, clientId);
  assert.ok(receipt.manifestSha256 && receipt.proves.length > 0 && receipt.doesNotProve.length > 0);
  pass(J, "submitted with the client submission id; receipt states what it proves and does not", "live DB", receipt.submissionId);

  const again = obj((await expectStatus(engineer, "POST", `${A}/submit`, [200], { files: [], handoff: handoffBody.handoff, ai_use: "", client_submission_id: clientId })).receipt, "receipt");
  assert.equal(again.submissionId, receipt.submissionId);
  assert.equal(again.manifestSha256, receipt.manifestSha256);
  pass(J, "a repeat submit over HTTP returns the same receipt and manifest", "live DB");

  /* Manifest */
  const { data: subRow } = await db.from("eng_submissions").select("*").eq("id", receipt.submissionId).single();
  const sub = subRow as { manifest: unknown; manifest_sha256: string; upload_id: string };
  const manifest = lib.asManifest(sub.manifest);
  assert.ok(manifest);
  assert.equal(lib.manifestSha256(manifest), sub.manifest_sha256, "the stored manifest hashes to its recorded hash");
  const { data: uploadRow } = await db.from("eng_uploads").select("storage_path, sha256, status").eq("id", sub.upload_id).single();
  const stored = await lib.readSubmittedFiles(db, uploadRow as { storage_path: string; sha256: string });
  assert.ok(lib.filesMatchManifest(stored, manifest), "the stored archive matches the manifest file by file");
  assert.equal(manifest.scenario.versionId, ctx.versionId);
  const [run] = await runFor(ctx, attemptId);
  assert.equal(run.manifest_sha256, sub.manifest_sha256, "the analysis run references the exact manifest");
  pass(J, "manifest frozen: archive matches file hashes; run pinned to the manifest and version", "live DB", `${manifest.files.length} files, ${sub.manifest_sha256.slice(0, 12)}`);

  assert.equal(outcome, "human_review", `analysis ended ${outcome} ${run.last_error_code ?? ""}`);
  const { data: evaluation } = await db.from("eng_authored_evaluations").select("runner, criteria").eq("attempt_id", attemptId).single();
  const ev = evaluation as { runner: { isolated: boolean; label: string }; criteria: Array<{ judgedBy: string; state: string }> };
  assert.equal(ev.runner.isolated, true);
  assert.ok(ev.criteria.filter((c) => c.judgedBy === "tests").every((c) => c.state === "demonstrated"));
  pass(J, "analysis ran the protected tests on the sandbox; reference-quality work demonstrated", "real sandbox", ev.runner.label);

  /* Web refresh and desktop resume read the same server state */
  const web = await call(engineer, "GET", A, undefined, "cookie");
  const desktop = await call(engineer, "GET", A, undefined, "bearer");
  assert.equal(web.status, 200);
  assert.equal(desktop.status, 200);
  const pick = (j: Json) => {
    const v = obj(j.view, "view");
    return JSON.stringify({ lifecycle: v.lifecycle, receipt: v.receipt, evaluation: v.evaluation, attempt: v.attempt, ws: obj(v.workspace, "workspace").filesSha256 });
  };
  assert.equal(pick(web.json), pick(desktop.json), "cookie (web) and bearer (desktop) reads agree");
  const candidateLifecycle = obj(obj(desktop.json.view, "view").lifecycle, "lifecycle");
  assert.equal(candidateLifecycle.state, "submitted", "before release the candidate sees submitted, not a result");
  const { workspace: _ws, ...viewWithoutFiles } = obj(desktop.json.view, "view");
  void _ws;
  assertNoLeaks(ctx, "submitted candidate view", viewWithoutFiles);
  pass(J, "web refresh and desktop resume return identical state; candidate sees no result before release", "live DB", String(candidateLifecycle.label));

  /* Employer */
  const review = await page(employer, `/app/employer/engineering/attempts/${attemptId}`);
  assert.equal(review.status, 200);
  const released = await expectStatus(employer, "POST", `/api/eng/org/attempts/${attemptId}/authored-release`, [200], { note: "Clear handoff, thank you." });
  const report = obj((await expectStatus(engineer, "GET", `${A}/report`, [200])).report, "report");
  assertNoLeaks(ctx, "released candidate report", report);
  for (const t of ctx.prot.protectedTestRefs) assert.ok(!JSON.stringify(report).includes(t.name), "no protected test names");
  const after = obj(obj((await expectStatus(engineer, "GET", A, [200])).view, "view").lifecycle, "lifecycle");
  assert.equal(after.state, "report_ready");
  pass(J, "employer review page, release, candidate report without protected material", "live DB", `report version ${String(released.version)}`);
  return attemptId;
}

/* ------------------------------------------------------------------ */
/* Journey 9                                                           */
/* ------------------------------------------------------------------ */

function runChild(args: string[]): { code: number | null; out: string } {
  const r = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/accept-simulation-child.ts", ...args], { env: process.env, encoding: "utf8", timeout: 240_000 });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}

async function journey9(ctx: Ctx) {
  const J = "9";
  const { lib, db, engineer } = ctx;
  step("Journey 9. Kill between persistence steps, then retry");
  const settledRuns: string[] = [];
  for (const point of KILL_POINTS) {
    const { attemptId, A, view } = await startedAttempt(ctx, `9-${point}`);
    await saveReference(ctx, A, view);
    const clientId = `web_${randomUUID().replace(/-/g, "")}`;
    const crashed = runChild(["submit", attemptId, engineer.userId, point, clientId]);
    assert.equal(crashed.code, 137, `child should die at ${point}: ${crashed.out.slice(0, 300)}`);

    const recovery = await recover(ctx, point, attemptId, clientId);
    const c = await counts(ctx, attemptId);
    assert.equal(c.submissions.length, 1, `${point}: one submission`);
    assert.equal(c.submissions[0].client_submission_id, clientId, `${point}: the client id survives the retry`);
    assert.equal(c.uploads.filter((u) => u.status === "accepted").length, 1, `${point}: one accepted upload`);
    assert.equal(c.uploads.filter((u) => u.status === "initiated").length, 0, `${point}: no orphaned upload left initiated`);
    assert.equal(c.storedArchives, 1, `${point}: one stored archive`);
    assert.equal(c.runs.length, 1, `${point}: one analysis run`);
    assert.equal(c.acceptedEvents, 1, `${point}: one submission_accepted event`);
    const { data: att } = await db.from("eng_attempts").select("status").eq("id", attemptId).single();
    assert.equal((att as { status: string }).status, "submitted");
    settledRuns.push(c.runs[0].id);
    pass(J, `killed ${point.replace(/_/g, " ")}, recovered by ${recovery}`, "live DB + child process kill", `uploads ${c.uploads.length} (failed ${c.uploads.filter((u) => u.status === "failed").length})`);
  }

  /* Worker killed mid-run, lease reclaimed */
  const runId = settledRuns[settledRuns.length - 1];
  const { data: runRow } = await db.from("eng_evaluation_runs").select("attempt_id").eq("id", runId).single();
  const attemptId = (runRow as { attempt_id: string }).attempt_id;
  const workerId = `journey-worker-${randomUUID()}`;
  const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/accept-simulation-child.ts", "worker", runId, workerId], { env: process.env });
  let out = "";
  child.stdout.on("data", (d: Buffer) => (out += d.toString()));
  child.stderr.on("data", (d: Buffer) => (out += d.toString()));
  const deadline = Date.now() + 120_000;
  while (!out.includes("claimed") && Date.now() < deadline) await sleep(250);
  assert.ok(out.includes("claimed"), `worker claimed the run: ${out.slice(0, 300)}`);
  await sleep(3000);
  child.kill("SIGKILL");
  await new Promise((r) => child.once("exit", r));
  const { data: orphaned } = await db.from("eng_evaluation_runs").select("status, lease_owner, attempt_count").eq("id", runId).single();
  const o = orphaned as { status: string; lease_owner: string; attempt_count: number };
  assert.equal(o.status, "running", "the killed worker left the run leased");
  assert.equal(o.lease_owner, workerId);
  await db.from("eng_evaluation_runs").update({ lease_expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", runId).eq("lease_owner", workerId);
  const status = await processById(ctx, runId);
  assert.equal(status, "human_review");
  const c = await counts(ctx, attemptId);
  assert.equal(c.evaluations, 1, "exactly one evaluation");
  assert.equal(c.reports.filter((r) => r.status === "draft").length, 1, "exactly one draft report");
  const { data: fin } = await db.from("eng_evaluation_runs").select("attempt_count, executor").eq("id", runId).single();
  pass(J, "analysis worker killed mid-run; lease expired and reclaimed; one evaluation and one report", "real sandbox + process kill (lease expiry simulated)", `attempt ${(fin as { attempt_count: number }).attempt_count}`);

  for (const id of settledRuns.slice(0, -1)) {
    // Other workers share the development queue and may finish a run first; that is fine as long as it ran once.
    const claimed = await claimRunById(ctx.db, id, `journey-${randomUUID()}`);
    const s = claimed ? await ctx.lib.processRun(ctx.db, claimed) : ((await ctx.db.from("eng_evaluation_runs").select("status").eq("id", id).single()).data as { status: string }).status;
    assert.equal(s, "human_review", `run ${id} ended ${s}`);
  }
  for (const id of settledRuns) {
    const { data } = await db.from("eng_evaluation_runs").select("attempt_id").eq("id", id).single();
    const cc = await counts(ctx, (data as { attempt_id: string }).attempt_id);
    assert.equal(cc.evaluations, 1);
    assert.equal(cc.reports.length, 1);
  }
  pass(J, `all ${settledRuns.length} recovered submissions analysed once each on the sandbox`, "real sandbox");
  void lib;
}

/** Retries the way a client would after the crash at this point. */
async function recover(ctx: Ctx, point: KillPoint, attemptId: string, clientId: string): Promise<string> {
  const { lib, db } = ctx;
  if (point === "after_storage_upload" || point === "after_upload_row") {
    const again = runChild(["submit", attemptId, ctx.engineer.userId, "none", clientId]);
    assert.equal(again.code, 0, again.out.slice(0, 300));
    assert.match(again.out, /submitted \S+ new/);
    return "resubmitting with the same client id";
  }
  // The submission exists: a reload (web refresh or desktop resume) completes it.
  const view = await lib.buildAuthoredCandidateView(db, await loadCandidate(ctx, attemptId));
  assert.ok(view.receipt && view.receipt.clientSubmissionId === clientId, "the reloaded view shows the original receipt");
  assert.notEqual(view.lifecycle.state, "active");
  if (point === "after_run_queued") {
    const again = runChild(["submit", attemptId, ctx.engineer.userId, "none", clientId]);
    assert.match(again.out, /submitted \S+ existing/);
    return "a reload, then a resubmit that returned the original receipt";
  }
  return "a reload";
}

/* ------------------------------------------------------------------ */
/* Journey 10                                                          */
/* ------------------------------------------------------------------ */

async function journey10(ctx: Ctx) {
  const J = "10";
  const { lib, db, engineer, employer, pkg } = ctx;
  step("Journey 10. Model outage and test-infrastructure failure");
  const { attemptId, A, view } = await startedAttempt(ctx, "10");
  const { edited, revision } = await saveReference(ctx, A, view);

  /* Model outage, simulated by pointing the model provider at a closed local port */
  const saved = { MODEL_PROVIDER: process.env.MODEL_PROVIDER, OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL, OLLAMA_TIMEOUT_MS: process.env.OLLAMA_TIMEOUT_MS };
  process.env.MODEL_PROVIDER = "ollama";
  process.env.OLLAMA_BASE_URL = "http://127.0.0.1:9";
  process.env.OLLAMA_TIMEOUT_MS = "3000";
  try {
    const authored = await loadCandidate(ctx, attemptId);
    const coworker = pkg.coworkers[0];
    await lib.sendTeamMessage(db, authored, engineer.userId, { teammateId: coworker.id, body: "Is the provider event id stable across retries?", clientMsgId: `j10_${randomUUID().slice(0, 12)}` });
    const collab = await lib.buildCollaborationView(db, authored, { release: false });
    const reply = collab.messages[collab.messages.length - 1];
    assert.equal(reply.sender, "teammate");
    assert.equal(reply.answeredFrom, "scenario_notes", "the reply is labelled as coming from scenario notes");
    assertNoLeaks(ctx, "outage teammate reply", reply);
    pass(J, "model outage: the message is kept and answered from scenario notes, labelled as such", "live DB, simulated outage");

    if (lib.assistantEnabled(pkg.aiPolicy.id)) {
      const before = collab.assistant.used;
      const r = await lib.askAssistant(db, authored, engineer.userId, { prompt: "What does this do?", clientMsgId: `j10a_${randomUUID().slice(0, 12)}`, contextPaths: [], files: [] });
      assert.equal(r.interaction.status, "provider_unavailable");
      assert.equal(r.used, before, "a failed request does not use the allowance");
      pass(J, "model outage: assistant reports unavailable and the allowance is unchanged", "live DB, simulated outage", `${r.used} of ${r.limit} used`);
    }
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
  const ws = await lib.getWorkspace(db, attemptId);
  assert.equal(ws?.revision, revision, "the saved draft is untouched by the outage");
  pass(J, "the saved workspace is unchanged after the outage", "live DB", `revision ${revision}`);

  /* Test infrastructure failure, simulated with a snapshot id that does not exist */
  const handoff = lib.validateAuthoredHandoff(pkg, journeyHandoff(pkg));
  assert.ok(handoff.ok);
  const receipt = await lib.submitAuthored(db, await loadCandidate(ctx, attemptId), { files: edited, handoff: handoff.handoff, aiDisclosure: handoff.aiDisclosure, clientSubmissionId: `web_${randomUUID().replace(/-/g, "")}` }, engineer.userId);
  const [run] = await runFor(ctx, attemptId);
  const realSnapshot = process.env.FYDELL_EXECUTION_SNAPSHOT_ID;
  process.env.FYDELL_EXECUTION_SNAPSHOT_ID = "snap_journey10doesnotexist";
  let failed: string;
  try {
    failed = await processById(ctx, run.id);
  } finally {
    process.env.FYDELL_EXECUTION_SNAPSHOT_ID = realSnapshot;
  }
  assert.ok(failed === "retryable_failure" || failed === "blocked", `infrastructure failure ended ${failed}`);
  const c1 = await counts(ctx, attemptId);
  assert.equal(c1.evaluations, 0, "no evaluation is recorded");
  assert.equal(c1.reports.length, 0, "no report is fabricated");
  assert.equal(c1.submissions.length, 1, "the submission is kept");
  const { data: failedRun } = await db.from("eng_evaluation_runs").select("last_error_code").eq("id", run.id).single();
  const candidate = obj((await expectStatus(engineer, "GET", A, [200])).view, "view");
  const lc = obj(candidate.lifecycle, "lifecycle");
  assert.equal(lc.state, "analysis_failed");
  assert.match(String(lc.detail), /not a result about your work/);
  assert.equal(obj(candidate.receipt, "receipt").submissionId, receipt.submissionId);
  const employerPage = await page(employer, `/app/employer/engineering/attempts/${attemptId}`);
  assert.equal(employerPage.status, 200);
  pass(J, "test infrastructure failure: submission kept, no evaluation or report, candidate told it is a platform delay", "real sandbox API (bad snapshot) + live DB", `${failed}, ${String((failedRun as { last_error_code: string }).last_error_code)}`);

  await lib.requeueRun(db, run.id, employer.email, "Acceptance journey 10: the evaluation environment is back.");
  const recovered = await processById(ctx, run.id);
  assert.equal(recovered, "human_review");
  const c2 = await counts(ctx, attemptId);
  assert.equal(c2.evaluations, 1);
  assert.equal(c2.reports.length, 1);
  assert.equal(c2.runs.length, 1, "the retry reused the same run");
  const back = obj(obj((await expectStatus(engineer, "GET", A, [200])).view, "view").lifecycle, "lifecycle");
  assert.equal(back.state, "submitted");
  pass(J, "after requeue the same submission is analysed once on the sandbox and a draft report exists", "real sandbox + live DB");
}

async function main() {
  const which = new Set(process.argv.slice(2).filter((a) => /^(8|9|10)$/.test(a)));
  const all = which.size === 0;
  const lib = await loadLib();
  const ctx = await setup(lib);
  console.log(`version ${ctx.versionId}, runner ${lib.selectRunner().ok ? "isolated sandbox" : "none"}`);
  if (process.argv.includes("drain")) {
    const { data: mine } = await ctx.db.from("eng_attempts").select("id").eq("candidate_user_id", ctx.engineer.userId).eq("scenario_version_id", ctx.versionId).eq("status", "submitted");
    const ids = ((mine ?? []) as Array<{ id: string }>).map((a) => a.id);
    const { data: queued } = await ctx.db.from("eng_evaluation_runs").select("id").in("attempt_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).eq("status", "queued");
    for (const r of (queued ?? []) as Array<{ id: string }>) console.log(`drained ${r.id} ${await processById(ctx, r.id)}`);
    return;
  }
  if (process.argv.includes("screens")) {
    const { attemptId } = await startedAttempt(ctx, "screens");
    console.log(`screens attempt ${attemptId}`);
    return;
  }
  if (all || which.has("8")) await journey8(ctx);
  if (all || which.has("9")) await journey9(ctx);
  if (all || which.has("10")) await journey10(ctx);
  console.log(`\n${results.length} checks passed`);
  console.log(JSON.stringify(results));
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(`\nFAIL ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error) {
      console.error((error.stack ?? "").split("\n").slice(1, 6).join("\n"));
      if (error.cause) console.error(`cause: ${error.cause instanceof Error ? error.cause.message : String(error.cause)}`);
    }
    console.error(JSON.stringify(results));
    process.exit(1);
  },
);
