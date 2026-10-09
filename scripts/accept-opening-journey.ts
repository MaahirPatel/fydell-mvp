/**
 * Opening journey acceptance, against a running dev server and the DEVELOPMENT
 * Supabase project, with the synthetic walk accounts:
 *
 *   opening -> requirements -> public application link -> application ->
 *   work sample assigned for one named requirement -> candidate completes it ->
 *   report released -> follow-up question -> stage and decision by two
 *   reviewers at once -> private note never reaches the applicant.
 *
 *   FYDELL_TEST_BASE_URL=http://localhost:3000 \
 *   npx tsx --conditions react-server --env-file=.env.local scripts/accept-opening-journey.ts
 *
 * Passwords and tokens are never printed. No email leaves the server.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type Session } from "@supabase/supabase-js";
import { buildExemplar } from "../src/lib/eng/exemplars/registry";
import { listWorkSampleOptions } from "../src/lib/hiring/work-samples";
import { listApplicationsForRole } from "../src/lib/hiring/applications";

const DEV_REF = "btbmvrvynnrhapjdkunz";
const BASE = (process.env.FYDELL_TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const OUT = join(process.cwd(), ".scratch", "acceptance", "employer");

type Json = Record<string, unknown>;
type Actor = { label: string; email: string; userId: string; token: string; cookie: string };

const checks: string[] = [];
function pass(label: string, detail = "") {
  const line = `${label}${detail ? ` (${detail})` : ""}`;
  checks.push(line);
  console.log(`  ok   ${line}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function obj(v: unknown, what: string): Json {
  assert.ok(v && typeof v === "object" && !Array.isArray(v), `${what} is not an object`);
  return v as Json;
}
function str(o: Json, key: string): string {
  assert.equal(typeof o[key], "string", `missing string field ${key}`);
  return o[key] as string;
}

function readWalkFile() {
  const fields = new Map<string, string>();
  for (const line of readFileSync(process.env.FYDELL_WALK_FILE ?? join(tmpdir(), "fydell-walk.txt"), "utf8").split(/\r?\n/)) {
    const m = /^(\w+)\s+(\S+)\s*$/.exec(line.trim());
    if (m) fields.set(m[1].toLowerCase(), m[2]);
  }
  const get = (k: string) => {
    const v = fields.get(k);
    if (!v) throw new Error(`The walk file needs a ${k} line.`);
    return v;
  };
  const out = { employer: get("employer"), engineer: get("engineer"), teammate: get("teammate"), password: get("password") };
  for (const e of [out.employer, out.engineer, out.teammate]) if (!e.endsWith("@example.com")) throw new Error("Only synthetic @example.com accounts may be used.");
  return out;
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
  if (error || !data.session || !data.user) throw new Error(`${label} could not sign in: ${error?.message ?? "no session"}`);
  return { label, email, userId: data.user.id, token: data.session.access_token, cookie: sessionCookie(data.session) };
}

/** Retries only when the shared dev server dropped the connection; a watchdog restarts it. */
async function send(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      const restarting = res.status >= 500 && url.includes("/api/") && (res.headers.get("content-type") ?? "").includes("text/html");
      if (!restarting || i >= 8) return res;
      console.log(`  ..   server error page from a restart, retrying ${init.method ?? "GET"} ${url.replace(BASE, "")} in 60 seconds`);
      await sleep(60_000);
    } catch (error) {
      const dropped = error instanceof Error && (error.message === "fetch failed" || error.name === "TimeoutError");
      if (!dropped || i >= 8) throw error;
      console.log(`  ..   server unavailable, retrying ${init.method ?? "GET"} ${url.replace(BASE, "")} in 60 seconds`);
      await sleep(60_000);
    }
  }
}

async function call(actor: Actor, method: string, path: string, body?: unknown): Promise<{ status: number; json: Json; text: string }> {
  const headers: Record<string, string> = { authorization: `Bearer ${actor.token}`, cookie: actor.cookie, origin: BASE };
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await send(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" }, 180_000);
  const text = await res.text();
  let json: Json = {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) json = parsed as Json;
  } catch {
    json = {};
  }
  return { status: res.status, json, text };
}

async function expect(actor: Actor, method: string, path: string, codes: number[], body?: unknown): Promise<Json> {
  const r = await call(actor, method, path, body);
  assert.ok(codes.includes(r.status), `${method} ${path} returned ${r.status}: ${r.text.slice(0, 300)}`);
  return r.json;
}

function pageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<\/(p|li|h\d|div|section|tr)>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

async function main() {
  if (!SUPABASE_URL.includes(DEV_REF)) throw new Error("NEXT_PUBLIC_SUPABASE_URL must point at the development project.");
  mkdirSync(OUT, { recursive: true });
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  const walk = readWalkFile();
  const employer = await signIn("employer", walk.employer, walk.password);
  const teammate = await signIn("teammate", walk.teammate, walk.password);
  const engineer = await signIn("engineer", walk.engineer, walk.password);
  const { data: m } = await admin.from("organization_members").select("organization_id").eq("user_id", employer.userId).eq("status", "active").order("joined_at").limit(1).single();
  const orgId = (m as { organization_id: string }).organization_id;
  const { data: mate } = await admin.from("organization_members").select("role").eq("user_id", teammate.userId).eq("organization_id", orgId).eq("status", "active").maybeSingle();
  const exemplar = buildExemplar("webhook-dedupe");
  assert.ok(exemplar);
  const stamp = new Date().toISOString().slice(0, 16);
  const sentinel = `PRIVATE-SENTINEL-${randomUUID().slice(0, 8)}`;

  console.log("\n1. Opening, requirements and the public application link");
  const role = obj(
    (await expect(employer, "POST", "/api/hiring/roles", [200], {
      title: `Backend engineer, webhooks (opening acceptance ${stamp})`,
      description: "You will own webhook delivery: retries, idempotency and the runbook for it. Synthetic opening used for acceptance testing.",
      required: "Keeps webhook processing idempotent across retries and restarts\nWrites tests for failure paths",
      preferred: "SQLite or Postgres experience",
      hiringSteps: "Application review\nOne work sample\nOne technical conversation",
      remotePolicy: "remote",
      contactEmail: "hiring@example.com",
    })).role,
    "role",
  );
  const roleId = str(role, "id");
  const published = obj((await expect(employer, "POST", `/api/hiring/roles/${roleId}`, [200], { action: "publish", confirmGenuine: true })).role, "role");
  const slug = str(published, "slug");
  const pub = await send(`${BASE}/jobs/${slug}`, {}, 180_000);
  assert.equal(pub.status, 200, "the public application page resolves");
  const { data: hr } = await admin.from("hiring_roles").select("requirements").eq("id", roleId).single();
  const reqs = ((hr as { requirements: Array<{ id: string; text: string; confirmed: boolean }> }).requirements ?? []).filter((r) => r.confirmed);
  assert.ok(reqs.length >= 2, "two confirmed requirements");
  pass("opening created with confirmed requirements and published", `/jobs/${slug}`);

  console.log("\n2. Applicant applies; the employer sees a meaningful next action");
  const applied = await expect(engineer, "POST", `/api/jobs/${slug}/apply`, [200], { contactName: "Acceptance Engineer A", repos: [], links: [], note: "I have run webhook consumers in production and fixed duplicate-credit incidents.", confirmShare: true });
  const appId = str(applied, "id");
  const dup = await call(engineer, "POST", `/api/jobs/${slug}/apply`, { contactName: "Acceptance Engineer A", note: "again", confirmShare: true });
  assert.equal(dup.status, 409, "a second active application is refused");
  const listed = (await listApplicationsForRole(orgId, roleId)).find((a) => a.id === appId);
  assert.ok(listed, "the application is listed under its opening");
  assert.equal(listed.nextAction, "Review submission");
  pass("application linked to opening, organization and candidate", `${appId}, next action ${listed.nextAction}`);

  console.log("\n3. Assign one work sample for one named requirement");
  const options = await listWorkSampleOptions(orgId);
  const option = options.find((o) => /webhook/i.test(JSON.stringify(o))) ?? options[0];
  assert.ok(option, "the workspace has a published work sample");
  const due = new Date(Date.now() + 3 * 86_400_000);
  const deadlineLocal = `${due.toISOString().slice(0, 10)}T17:00`;
  const inviteBody = {
    roleId,
    scenarioVersionId: option.scenarioVersionId,
    requirementId: reqs[0].id,
    uncertainCapability: "Whether deduplication survives worker restarts, not only a second receiver.",
    whyItMatters: "Duplicate credits during provider retries are the main incident class for this team.",
    observableWork: "A fix to the receiver plus a restart test, run against controlled tests.",
    deadlineLocal,
    timeZone: "America/New_York",
  };
  const invited = await expect(employer, "POST", `/api/employer/applications/${appId}/work-sample`, [201], inviteBody);
  const invitationId = str(invited, "invitationId");
  const repeat = await expect(employer, "POST", `/api/employer/applications/${appId}/work-sample`, [200], inviteBody);
  assert.equal(repeat.invitationId, invitationId, "assigning twice returns the first invitation");
  const { data: inv } = await admin.from("eng_invitations").select("application_id, hiring_role_id, organization_id, evidence_gap").eq("id", invitationId).single();
  const link = inv as { application_id: string; hiring_role_id: string; organization_id: string; evidence_gap: { requirementId: string } };
  assert.equal(link.application_id, appId);
  assert.equal(link.hiring_role_id, roleId);
  assert.equal(link.organization_id, orgId);
  assert.equal(link.evidence_gap.requirementId, reqs[0].id);
  pass("work sample assigned for one requirement; invitation linked to application, opening and organization; repeat is idempotent", invitationId);

  console.log("\n4. Candidate completes the work; the employer tracks progress");
  const attemptId = str(await expect(engineer, "POST", "/api/eng/invitations/accept", [200], { invitationId }), "attemptId");
  const A = `/api/eng/attempts/${attemptId}/authored`;
  await expect(engineer, "POST", A, [200], { action: "consent" });
  const env = obj((await expect(engineer, "POST", `${A}/public-tests`, [200], { purpose: "environment_check" })).run, "run");
  await expect(engineer, "POST", A, [200], env.status === "ran" ? { action: "environment_ready" } : { action: "environment_ready", continueWithoutCheck: true });
  const started = obj((await expect(engineer, "POST", A, [200], { action: "start" })).view, "view");
  const ws = obj(started.workspace, "workspace");
  const starter = ws.files as Array<{ path: string; content: string }>;
  const reference = new Map(exemplar.prot.reference.files.map((f) => [f.path, f.content]));
  const files = [...starter.map((f) => ({ path: f.path, content: reference.get(f.path) ?? f.content })), ...[...reference].filter(([p]) => !starter.some((f) => f.path === p)).map(([path, content]) => ({ path, content }))];
  await expect(engineer, "PUT", `${A}/files`, [200], { baseRevision: ws.revision, files });
  const handoff = { what_changed: "Deduplicate on the provider event id in SQLite, in the same transaction as the credit and receipt.", how_checked: "Public tests and a restart test.", unresolved: "Behaviour when our 2xx is lost after commit is assumed, not tested." };
  const receipt = obj((await expect(engineer, "POST", `${A}/submit`, [201], { files, handoff, ai_use: "No assistant used." })).receipt, "receipt");
  const end = Date.now() + 420_000;
  let runStatus = "";
  while (Date.now() < end) {
    await call(engineer, "GET", A);
    const { data } = await admin.from("eng_evaluation_runs").select("status").eq("attempt_id", attemptId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    runStatus = (data as { status: string } | null)?.status ?? "";
    if (["human_review", "ready", "failed", "permanent_failure"].includes(runStatus)) break;
    await sleep(4000);
  }
  assert.ok(["human_review", "ready"].includes(runStatus), `evaluation ended ${runStatus}`);
  const appPage = await send(`${BASE}/app/employer/openings/${roleId}/applications/${appId}`, { headers: { cookie: employer.cookie }, redirect: "manual" }, 240_000);
  const appHtml = await appPage.text();
  assert.equal(appPage.status, 200, "the application page opens");
  const appText = pageText(appHtml);
  assert.ok(appHtml.includes(attemptId) || /work sample/i.test(appText), "the application page shows the assigned work sample");
  pass("candidate completed the assigned work; application page tracks it", `receipt ${String(receipt.submissionId)}, run ${runStatus}`);
  await expect(employer, "POST", `/api/eng/org/attempts/${attemptId}/authored-release`, [200], { note: "Thanks, the restart case is covered." });
  pass("report released to the candidate");

  console.log("\n5. Follow-up question, stage and decision by two reviewers, private note");
  const qBody = { question: "Your handoff says the lost-2xx case is assumed. How would you test it?", clientRequestId: randomUUID() };
  const q1 = obj((await expect(employer, "POST", `/api/employer/applications/${appId}/questions`, [201], qBody)).question, "question");
  const q2 = obj((await expect(employer, "POST", `/api/employer/applications/${appId}/questions`, [200], qBody)).question, "question");
  assert.equal(q1.id, q2.id, "a repeated question request returns the first question");
  const theirs = await expect(engineer, "GET", `/api/applications/${appId}/questions`, [200]);
  assert.ok((theirs.questions as Json[]).some((q) => q.id === q1.id), "the applicant sees the question");
  await expect(engineer, "POST", `/api/applications/${appId}/questions`, [200], { questionId: q1.id, response: "I would stub the HTTP layer to drop the response after commit and assert the retry is acknowledged without a second credit." });
  pass("follow-up question asked once, seen and answered by the applicant");

  const second = mate && ["owner", "admin", "hiring_manager", "reviewer"].includes(String((mate as { role: string }).role)) ? teammate : employer;
  const { data: stageRow } = await admin.from("role_applications").select("stage").eq("id", appId).single();
  const stageNow = (stageRow as { stage: string }).stage;
  const [s1, s2] = await Promise.all([
    call(employer, "POST", `/api/hiring/applications/${appId}`, { stage: stageNow === "in_review" ? "awaiting_candidate" : "in_review", expectedStage: stageNow }),
    call(second, "POST", `/api/hiring/applications/${appId}`, { stage: "closed", expectedStage: stageNow }),
  ]);
  assert.deepEqual([s1.status, s2.status].sort(), [200, 409], `stage changes at once: exactly one wins (${s1.status}, ${s2.status})`);
  pass("two reviewers moving the stage at once: one saved, one 409", `second reviewer ${second.label}`);

  const { data: appRow } = await admin.from("role_applications").select("review_id").eq("id", appId).single();
  const reviewId = (appRow as { review_id: string | null }).review_id;
  const decisionPath = reviewId ? `/api/employer/passport-reviews/${reviewId}` : `/api/employer/applications/${appId}/decision`;
  const readDecision = async (): Promise<{ decision: string; version: string }> => {
    const { data } = reviewId
      ? await admin.from("employer_passport_reviews").select("decision,updated_at").eq("id", reviewId).maybeSingle()
      : await admin.from("application_decisions").select("decision,updated_at").eq("application_id", appId).maybeSingle();
    const row = data as { decision: string; updated_at: string } | null;
    return row ? { decision: row.decision, version: row.updated_at } : { decision: "none", version: "new" };
  };
  const before = await readDecision();
  const [d1, d2] = await Promise.all([
    call(employer, "PATCH", decisionPath, { decision: "advance", note: `Advance. ${sentinel}`, expectedVersion: before.version }),
    call(second, "PATCH", decisionPath, { decision: "decline", note: "Decline.", expectedVersion: before.version }),
  ]);
  assert.deepEqual([d1.status, d2.status].sort(), [200, 409], `decisions at once: exactly one wins (${d1.status}, ${d2.status})`);
  const loser = d1.status === 409 ? d1 : d2;
  assert.ok(loser.json.current, "the conflict response carries the saved decision");
  const winner = d1.status === 200 ? "advance" : "decline";
  assert.equal((await readDecision()).decision, winner, "the stored decision is the winner's, not a silent overwrite");
  pass("two reviewers deciding at once: one saved, one 409 with the saved state", `${reviewId ? "Passport review" : "application decision"}, stored ${winner}`);

  if (winner !== "advance") {
    await expect(employer, "PATCH", decisionPath, [200], { decision: "advance", note: `Advance. ${sentinel}`, expectedVersion: (await readDecision()).version });
  }
  const decided = (await listApplicationsForRole(orgId, roleId)).find((a) => a.id === appId);
  assert.equal(decided?.decision, "advance", "the opening's applicant list shows the recorded decision");
  assert.notEqual(decided?.nextAction, "Record decision", "a decided application no longer asks for a decision");
  pass("decision recorded on the application and reflected in the applicant list", decided?.nextAction ?? "");
  const candidateSurfaces = [
    await call(engineer, "GET", `/api/applications/${appId}/questions`),
    await call(engineer, "GET", `${A}/report`),
    await call(engineer, "GET", A),
    await call(engineer, "GET", "/api/eng/attempts"),
    await call(engineer, "GET", `/app/candidate/applications/${appId}`),
    await call(engineer, "GET", "/app/candidate/applications"),
  ];
  for (const r of candidateSurfaces) assert.ok(!r.text.includes(sentinel), "the private note never reaches the applicant");
  const employerView = await send(`${BASE}/app/employer/openings/${roleId}/applications/${appId}`, { headers: { cookie: employer.cookie }, redirect: "manual" }, 240_000);
  assert.ok((await employerView.text()).includes(sentinel), "the hiring team sees its own private note");
  pass("private note visible to the team, absent from six applicant-facing responses");

  const file = join(OUT, `opening-${stamp.replace(/[:]/g, "")}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      { ranAt: new Date().toISOString(), baseUrl: BASE, openingId: roleId, slug, applicationId: appId, invitationId, attemptId, receiptId: receipt.submissionId, reviewId, requirement: reqs[0], workSample: option, checks, applicationPageExcerpt: appText.slice(0, 3000) },
      null,
      2,
    ),
  );
  console.log(`\n${checks.length} checks passed. Evidence: ${file}`);
}

main().catch((error: unknown) => {
  console.error(`\nFAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
