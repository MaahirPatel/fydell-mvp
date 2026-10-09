/**
 * Employer-authored work sample, end to end against a running dev server and
 * the DEVELOPMENT Supabase project, with two synthetic @example.com accounts:
 *
 *   1. employer creates a role and a draft from the validated webhook-dedupe template
 *   2. runs the checks, previews, approves, publishes, publishes the role, invites the engineer
 *   3. engineer accepts, consents, passes the environment check, starts, saves files, submits
 *   4. evaluation runs; the employer review page and the team queue show it
 *   5. employer releases the report and records a decision (queue: release, decision, hold, cleared)
 *   6. engineer reads the released report, adds it to the Passport, and it resolves as application evidence
 *
 *   FYDELL_WALK_FILE=%TEMP%\fydell-walk.txt \
 *   npx tsx --conditions react-server --env-file=.env.local scripts/test-authored-e2e.ts
 *
 * The walk file has whitespace-separated `employer <email>`, `engineer <email>`
 * and `password <password>` lines. Passwords and tokens are never printed.
 * FYDELL_WALK_ENGINEER_KEY picks another engineer line (e.g. `showcase`).
 * Invitation email is not sent: the dev server has no mail provider, and the
 * script fails if an invitation reports `sent`. Rows created here stay in the
 * development database, like the other live scripts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Session } from "@supabase/supabase-js";
import { buildExemplar } from "../src/lib/eng/exemplars/registry";
import { listTeamQueue } from "../src/lib/eng/employer-view";
import { prepareApplicationEvidence } from "../src/lib/profile-evidence/applications";
import { SAMPLE_PREFIX } from "../src/lib/profile-evidence/work-samples";

const DEV_REF = "btbmvrvynnrhapjdkunz";
const PROD_REF = "qtrhwrcxthtqvkeerptp";
const BASE = (process.env.FYDELL_TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const EXEMPLAR = "webhook-dedupe";

type Json = Record<string, unknown>;
type Actor = { label: string; email: string; userId: string; token: string; cookie: string };

let passed = 0;
function pass(label: string, detail = "") {
  passed++;
  console.log(`  ok   ${label}${detail ? ` (${detail})` : ""}`);
}
function step(title: string) {
  console.log(`\n${title}`);
}

function obj(v: unknown, what: string): Json {
  assert.ok(v && typeof v === "object" && !Array.isArray(v), `${what} is not an object`);
  return v as Json;
}
function strField(o: Json, key: string): string {
  const v = o[key];
  assert.equal(typeof v, "string", `missing string field ${key}`);
  return v as string;
}

function readWalkFile(): { employer: string; engineer: string; password: string } {
  const path = process.env.FYDELL_WALK_FILE ?? join(tmpdir(), "fydell-walk.txt");
  const fields = new Map<string, string>();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^(\w+)\s+(\S+)\s*$/.exec(line.trim());
    if (m) fields.set(m[1].toLowerCase(), m[2]);
  }
  const engineerKey = process.env.FYDELL_WALK_ENGINEER_KEY ?? "engineer";
  const employer = fields.get("employer");
  const engineer = fields.get(engineerKey);
  const password = fields.get("password");
  if (!employer || !engineer || !password) throw new Error(`The walk file at ${path} needs employer, ${engineerKey} and password lines.`);
  for (const email of [employer, engineer]) if (!/@(example\.com|resend\.dev)$/.test(email)) throw new Error("Only synthetic @example.com or @resend.dev accounts may be used.");
  return { employer, engineer, password };
}

/** Supabase SSR cookie (`sb-<ref>-auth-token`), chunked like @supabase/ssr, for server-rendered pages. */
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
  if (error || !data.session || !data.user) throw new Error(`${label} could not sign in: ${error?.message ?? "no session"}`);
  return { label, email, userId: data.user.id, token: data.session.access_token, cookie: sessionCookie(data.session) };
}

async function call(actor: Actor | null, method: string, path: string, body?: unknown, timeoutMs = 280_000): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = {};
  if (actor) headers.authorization = `Bearer ${actor.token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
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
  assert.ok(expected.includes(r.status), `${method} ${path} returned ${r.status}: ${JSON.stringify(r.json).slice(0, 400)}`);
  return r.json;
}

async function page(actor: Actor, path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie: actor.cookie }, redirect: "manual", signal: AbortSignal.timeout(180_000) });
  return { status: res.status, html: await res.text() };
}

async function poll<T>(what: string, fn: () => Promise<T | null>, timeoutMs: number, everyMs = 3000): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v !== null) return v;
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, everyMs));
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!SUPABASE_URL.includes(DEV_REF) || SUPABASE_URL.includes(PROD_REF)) throw new Error("NEXT_PUBLIC_SUPABASE_URL must point at the development project.");
  if (!ANON || !SERVICE) throw new Error("Load .env.local (--env-file=.env.local).");
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  const walk = readWalkFile();
  const employer = await signIn("employer", walk.employer, walk.password);
  const engineer = await signIn("engineer", walk.engineer, walk.password);
  const { data: membership } = await admin.from("organization_members").select("organization_id").eq("user_id", employer.userId).eq("status", "active").order("joined_at").limit(1).single();
  const orgId = (membership as { organization_id: string }).organization_id;
  const queueState = async (attemptId: string) => (await listTeamQueue(admin, orgId, 200)).find((q) => q.attemptId === attemptId)?.waitingOn ?? "cleared";
  const exemplar = buildExemplar(EXEMPLAR);
  assert.ok(exemplar, "webhook-dedupe exemplar is available");
  const stamp = new Date().toISOString().slice(0, 16);

  /* ---------------------------------------------------------------- 1 */
  step("1. Employer creates a role and a simulation from a validated template");
  const role = obj(
    (await expectStatus(employer, "POST", "/api/eng/roles", [201], {
      title: `Backend Engineer, Webhooks (e2e ${stamp})`,
      stack: ["Python", "SQLite"],
      responsibilities: "Own webhook processing reliability.",
      evaluationFocus: ["correctness", "work_communication"],
      companyContext: "Synthetic payments company used for end-to-end testing.",
    })).role,
    "role",
  );
  const roleId = strField(role, "id");
  pass("role created", roleId);

  const input = {
    level: "mid", other: {}, family: "backend_api_engineer", answers: {}, aiPolicy: "assistants_disclosed", database: "sqlite", language: "python",
    outcomes: [], taskType: "debugging", framework: "none", background: "", outOfScope: [], constraints: [], description: "", taskMinutes: 60,
    capabilities: ["correctness", "reliability", "testing"], setupMinutes: 10, technologies: [], specialization: "general",
    startingMaterial: "reviewed_template", levelExpectations: "Handles edge cases, explains the approach, covers failure paths with tests.",
    confirmedAssumptions: ["synthetic_data"],
    simulation: { mode: "as_is", track: "backend_api", jobTitle: "Backend Engineer", taskFamily: "backend.reliability", exemplarKey: EXEMPLAR, businessContext: "", secondaryCapability: "" },
  };
  const created = await expectStatus(employer, "POST", "/api/eng/authoring/drafts", [201], { input, allowDuplicate: true });
  const draftId = strField(created, "draftId");
  assert.equal(created.jobId, null, "a template copy needs no generation job");
  pass("draft created from the validated template", draftId);

  /* ---------------------------------------------------------------- 2 */
  step("2. Validate, preview, approve, publish, invite");
  const testJob = obj((await expectStatus(employer, "POST", `/api/eng/authoring/drafts/${draftId}/test`, [202])).job, "job");
  const finished = await poll(
    "checks job",
    async () => {
      const j = obj((await expectStatus(employer, "GET", `/api/eng/authoring/jobs/${strField(testJob, "id")}`, [200])).job, "job");
      return j.status === "succeeded" || j.status === "failed" ? j : null;
    },
    240_000,
  );
  assert.equal(finished.status, "succeeded", `checks job ${String(finished.status)}: ${String(finished.error)}`);
  const draft = await expectStatus(employer, "GET", `/api/eng/authoring/drafts/${draftId}`, [200]);
  const validation = obj(draft.validation, "validation");
  assert.equal(validation.status, "passed", "every check passed");
  assert.equal(validation.current, true);
  pass("checks ran and passed on the current version", String(obj(validation.runner, "runner").label));

  const preview = await expectStatus(employer, "GET", `/api/eng/authoring/drafts/${draftId}/preview`, [200]);
  const sha = strField(preview, "packageSha256");
  const candidatePkg = JSON.stringify(preview.package);
  for (const t of exemplar.prot.protectedTests) assert.ok(!candidatePkg.includes(t.content.slice(0, 120)), "preview leaks no protected test code");
  pass("candidate preview opened", sha.slice(0, 12));

  const notApproved = await call(employer, "POST", `/api/eng/authoring/drafts/${draftId}/publish`, { packageSha256: sha });
  assert.equal(notApproved.status, 409, "publishing before approval is refused");
  await expectStatus(employer, "POST", `/api/eng/authoring/drafts/${draftId}/review`, [201], { decision: "approved", notes: "Reviewed in the e2e test.", packageSha256: sha });
  const published = await expectStatus(employer, "POST", `/api/eng/authoring/drafts/${draftId}/publish`, [201], { packageSha256: sha });
  const versionId = strField(published, "versionId");
  pass("approved and published", `version ${versionId}`);

  const inviteBeforePublish = await call(employer, "POST", `/api/eng/roles/${roleId}/invitations`, { email: engineer.email, name: "E2E Engineer", scenarioVersionId: versionId });
  assert.ok(inviteBeforePublish.status >= 400, "inviting to a draft role is refused");
  await expectStatus(employer, "PATCH", `/api/eng/roles/${roleId}`, [200], { status: "published" });
  const invite = await expectStatus(employer, "POST", `/api/eng/roles/${roleId}/invitations`, [201], { email: engineer.email, name: "E2E Engineer", scenarioVersionId: versionId });
  const invitationId = strField(invite, "invitationId");
  if (!engineer.email.endsWith("@resend.dev")) assert.notEqual(invite.emailDelivery, "sent", "no email leaves the development server except to Resend test addresses");
  pass("role published and engineer invited", `${invitationId}, email ${String(invite.emailDelivery)}`);

  /* ---------------------------------------------------------------- 3 */
  step("3. Engineer accepts, starts, edits and submits");
  const tasks = await expectStatus(engineer, "GET", "/api/eng/attempts", [200]);
  assert.ok((tasks.invitations as Json[]).some((i) => i.id === invitationId), "the invitation is in the engineer's task list");
  const outsider = await call(employer, "POST", "/api/eng/invitations/accept", { invitationId });
  assert.ok(outsider.status >= 400, "another account cannot accept the invitation");
  const attemptId = strField(await expectStatus(engineer, "POST", "/api/eng/invitations/accept", [200], { invitationId }), "attemptId");
  pass("invitation accepted", attemptId);

  const A = `/api/eng/attempts/${attemptId}/authored`;
  await expectStatus(engineer, "POST", A, [200], { action: "consent" });
  const envRun = obj((await expectStatus(engineer, "POST", `${A}/public-tests`, [200], { purpose: "environment_check" })).run, "run");
  const envReady = await expectStatus(engineer, "POST", A, [200], envRun.status === "ran" ? { action: "environment_ready" } : { action: "environment_ready", continueWithoutCheck: true });
  assert.equal(obj(obj(envReady.view, "view").attempt, "attempt").status, "preflight_passed");
  const started = obj((await expectStatus(engineer, "POST", A, [200], { action: "start" })).view, "view");
  assert.equal(obj(started.attempt, "attempt").status, "in_progress");
  const workspace = obj(started.workspace, "workspace");
  const starter = (workspace.files as Array<{ path: string; content: string }>).map((f) => ({ path: f.path, content: f.content }));
  pass("consent, environment check and start", `environment check ${String(envRun.status)}, ${starter.length} starter files`);

  const reference = new Map(exemplar.prot.reference.files.map((f) => [f.path, f.content]));
  const edited = [...starter.map((f) => ({ path: f.path, content: reference.get(f.path) ?? f.content })), ...[...reference].filter(([p]) => !starter.some((f) => f.path === p)).map(([path, content]) => ({ path, content }))];
  const saved = await expectStatus(engineer, "PUT", `${A}/files`, [200], { baseRevision: workspace.revision, files: edited });
  const stale = await call(engineer, "PUT", `${A}/files`, { baseRevision: workspace.revision, files: starter });
  assert.equal(stale.status, 409, "a stale save is a conflict, not an overwrite");
  pass("files saved; stale save refused", `revision ${String(saved.revision)}`);

  const gap = Number(obj(started.publicRuns, "publicRuns").minGapSeconds ?? 0);
  if (gap > 0) await sleep((gap + 1) * 1000);
  const publicRun = obj((await expectStatus(engineer, "POST", `${A}/public-tests`, [200], { files: edited })).run, "run");
  pass("public tests ran on the edited files", String(publicRun.status));

  const handoff = Object.fromEntries(exemplar.pkg.submission.handoffPrompts.map((p) => [p.id, `E2E answer for ${p.label}: deduplicate on the provider event id inside the same transaction as the side effect.`]));
  const receipt = obj((await expectStatus(engineer, "POST", `${A}/submit`, [201], { files: edited, handoff, ai_use: "No assistant used." })).receipt, "receipt");
  const again = obj((await expectStatus(engineer, "POST", `${A}/submit`, [200], { files: starter, handoff, ai_use: "" })).receipt, "receipt");
  assert.equal(again.submissionId, receipt.submissionId, "a repeat submit returns the original receipt");
  pass("submitted once; repeat returns the same receipt", strField(receipt, "submissionId"));

  /* ---------------------------------------------------------------- 4 */
  step("4. Evaluation runs and the employer sees results");
  const run = await poll(
    "evaluation",
    async () => {
      await call(engineer, "GET", A);
      const { data, error } = await admin.from("eng_evaluation_runs").select("id,status,last_error_code").eq("attempt_id", attemptId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error(`Could not read the evaluation run: ${error.message}`);
      const r = data as { id: string; status: string; last_error_code: string | null } | null;
      return r && ["human_review", "ready", "failed", "permanent_failure"].includes(r.status) ? r : null;
    },
    300_000,
    4000,
  );
  assert.ok(run.status === "human_review" || run.status === "ready", `evaluation ended ${run.status} ${run.last_error_code ?? ""}`);
  const { data: evaluation } = await admin.from("eng_authored_evaluations").select("criteria,acceptance,suite").eq("attempt_id", attemptId).order("created_at", { ascending: false }).limit(1).single();
  const criteria = (evaluation as { criteria: Array<{ id: string; state: string; judgedBy: string }> }).criteria;
  const testJudged = criteria.filter((c) => c.judgedBy === "tests");
  assert.ok(testJudged.length > 0 && testJudged.every((c) => c.state === "demonstrated"), `reference-quality work is demonstrated: ${JSON.stringify(criteria.map((c) => [c.id, c.state]))}`);
  assert.ok(criteria.filter((c) => c.judgedBy === "reviewer").every((c) => c.state === "not_assessed"), "reviewer-judged criteria are not scored by tests");
  pass("evaluation finished", `${run.status}; ${testJudged.length} test-judged criteria demonstrated`);

  const candidateBefore = await expectStatus(engineer, "GET", `${A}/report`, [200]);
  assert.equal(candidateBefore.report, null, "the candidate sees no report before release");
  const review = await page(employer, `/app/employer/engineering/attempts/${attemptId}`);
  assert.equal(review.status, 200, `employer review page returned ${review.status}`);
  assert.ok(review.html.includes(testJudged[0].id) || /demonstrated/i.test(review.html), "the review page renders the evaluation");
  const engineerOnEmployerPage = await page(engineer, `/app/employer/engineering/attempts/${attemptId}`);
  assert.ok(engineerOnEmployerPage.status !== 200 || !engineerOnEmployerPage.html.includes(testJudged[0].id), "the engineer cannot open the employer review page");
  assert.equal(await queueState(attemptId), "review");
  pass("employer review page renders results; queue shows waiting on release");

  /* ---------------------------------------------------------------- 5 */
  step("5. Employer releases the report and records a decision");
  const engineerRelease = await call(engineer, "POST", `/api/eng/org/attempts/${attemptId}/authored-release`, { note: "x" });
  assert.ok(engineerRelease.status === 401 || engineerRelease.status === 403 || engineerRelease.status === 404, "the engineer cannot release");
  const released = await expectStatus(employer, "POST", `/api/eng/org/attempts/${attemptId}/authored-release`, [200], { note: "Thanks for the clear handoff." });
  pass("report released", `version ${String(released.version)}`);
  assert.equal(await queueState(attemptId), "decision");
  pass("queue shows waiting on decision");
  await expectStatus(employer, "POST", `/api/eng/org/attempts/${attemptId}/decision`, [200], { decision: "hold", notes: "Holding while we schedule the follow-up." });
  assert.equal(await queueState(attemptId), "hold");
  pass("hold recorded; queue shows on hold");
  await expectStatus(employer, "POST", `/api/eng/org/attempts/${attemptId}/decision`, [200], { decision: "advance", notes: "Advance to the onsite." });
  assert.equal(await queueState(attemptId), "cleared");
  pass("advance recorded; attempt leaves the queue");

  /* ---------------------------------------------------------------- 6 */
  step("6. Engineer sees the report, adds it to the Passport and to an application");
  const report = obj((await expectStatus(engineer, "GET", `${A}/report`, [200])).report, "report");
  assert.equal(report.reviewerNote, "Thanks for the clear handoff.");
  const reportText = JSON.stringify(report);
  for (const t of exemplar.prot.protectedTestRefs) assert.ok(!reportText.includes(t.name), "the candidate report names no protected test");
  pass("released report visible to the engineer without protected test names", `${(report.criteria as Json[]).length} criteria`);

  const outsiderAdd = await call(employer, "POST", "/api/passport/work-samples", { attemptId });
  assert.ok(outsiderAdd.status >= 400, "another account cannot add this report");
  const addedRes = await expectStatus(engineer, "POST", "/api/passport/work-samples", [200], { attemptId });
  const entry = obj(addedRes.workSample, "workSample");
  const summary = obj(entry.summary, "summary");
  assert.equal(summary.attemptId, attemptId);
  assert.ok((summary.checks as string[]).length > 0, "the Passport entry lists what the tests confirmed");
  const addedAgain = obj((await expectStatus(engineer, "POST", "/api/passport/work-samples", [200], { attemptId })).workSample, "workSample");
  assert.equal(addedAgain.id, entry.id, "adding twice is idempotent");
  pass("added to the Passport", strField(entry, "id"));

  const prepared = await prepareApplicationEvidence(engineer.userId, [`${SAMPLE_PREFIX}${strField(entry, "id")}`]);
  assert.ok(prepared.ok, prepared.ok ? "" : `application evidence: ${prepared.error}`);
  pass("resolves as pinned application evidence", prepared.ok ? `evidence version ${prepared.items[0].versionId}` : "");

  console.log(`\n${passed} checks passed. role ${roleId}, draft ${draftId}, version ${versionId}, attempt ${attemptId}`);
}

main().catch((error: unknown) => {
  console.error(`\nFAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
