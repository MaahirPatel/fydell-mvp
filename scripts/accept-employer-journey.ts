/**
 * Employer journey acceptance, against a running dev server and the DEVELOPMENT
 * Supabase project. Two synthetic candidates take the same published work
 * sample: one submits a correct fix, the other a superficial one (a module-level
 * seen-set that survives a second receiver but not a restart). The script checks
 * the mechanics along the way and saves report excerpts and receipt ids under
 * .scratch/acceptance/employer/.
 *
 *   FYDELL_TEST_BASE_URL=http://localhost:3007 \
 *   npx tsx --conditions react-server --env-file=.env.local scripts/accept-employer-journey.ts
 *
 * The walk file (%TEMP%\fydell-walk.txt) has whitespace-separated `employer`,
 * `engineer`, `candidate2`, `teammate` and `password` lines. Passwords and tokens
 * are never printed. Outside production any email is routed to the Resend test inbox.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type Session } from "@supabase/supabase-js";
import { buildExemplar } from "../src/lib/eng/exemplars/registry";
import { listTeamQueue } from "../src/lib/eng/employer-view";
import { employerEvaluation } from "../src/lib/eng/authored/reports";
import { sealedSubmissionFiles } from "../src/lib/eng/authored/employer";
import { employerCollaboration } from "../src/lib/eng/authored/collaboration";
import { capabilityStatements } from "../src/lib/eng/authored/follow-ups";
import { resolveScenarioVersion } from "../src/lib/eng/scenario-versions";
import type { AttemptRow } from "../src/lib/eng/types";
import { routeRecipient } from "../src/lib/email-html";

const DEV_REF = "btbmvrvynnrhapjdkunz";
const PROD_REF = "qtrhwrcxthtqvkeerptp";
const BASE = (process.env.FYDELL_TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const EXEMPLAR = "webhook-dedupe";
const OUT = join(process.cwd(), ".scratch", "acceptance", "employer");

type Json = Record<string, unknown>;
type Actor = { label: string; email: string; userId: string; token: string; cookie: string };
type File = { path: string; content: string };

let passed = 0;
const checks: string[] = [];
function pass(label: string, detail = "") {
  passed++;
  const line = `${label}${detail ? ` (${detail})` : ""}`;
  checks.push(line);
  console.log(`  ok   ${line}`);
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const msgId = () => randomUUID().replace(/-/g, "").slice(0, 24);

function readWalkFile() {
  const path = process.env.FYDELL_WALK_FILE ?? join(tmpdir(), "fydell-walk.txt");
  const fields = new Map<string, string>();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^(\w+)\s+(\S+)\s*$/.exec(line.trim());
    if (m) fields.set(m[1].toLowerCase(), m[2]);
  }
  const get = (k: string) => {
    const v = fields.get(k);
    if (!v) throw new Error(`The walk file needs a ${k} line.`);
    return v;
  };
  const out = { employer: get("employer"), engineer: get("engineer"), candidate2: get("candidate2"), teammate: get("teammate"), password: get("password") };
  for (const email of [out.employer, out.engineer, out.candidate2, out.teammate]) if (!email.endsWith("@example.com")) throw new Error("Only synthetic @example.com accounts may be used.");
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

/** Retries only when the shared dev server dropped the connection (it restarts on file changes). */
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

async function call(actor: Actor | null, method: string, path: string, body?: unknown, timeoutMs = 180_000): Promise<{ status: number; json: Json; text: string }> {
  const headers: Record<string, string> = {};
  if (actor) headers.authorization = `Bearer ${actor.token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await send(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }, timeoutMs);
  const text = await res.text();
  let json: Json = {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) json = parsed as Json;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, text };
}

async function expectStatus(actor: Actor | null, method: string, path: string, expected: number[], body?: unknown): Promise<Json> {
  const r = await call(actor, method, path, body);
  assert.ok(expected.includes(r.status), `${method} ${path} returned ${r.status}: ${JSON.stringify(r.json).slice(0, 400)}`);
  return r.json;
}

async function page(actor: Actor, path: string): Promise<{ status: number; html: string }> {
  const res = await send(`${BASE}${path}`, { headers: { cookie: actor.cookie }, redirect: "manual" }, 240_000);
  return { status: res.status, html: await res.text() };
}

/** Visible text of a server-rendered page, without scripts or the RSC payload. */
function pageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<\/(p|li|h\d|div|section|tr)>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function section(text: string, start: string, end: string[]): string {
  const i = text.indexOf(start);
  if (i < 0) return "";
  const rest = text.slice(i);
  const stops = end.map((e) => rest.indexOf(e, start.length)).filter((n) => n > 0);
  return rest.slice(0, stops.length ? Math.min(...stops) : 2000).trim();
}

async function poll<T>(what: string, fn: () => Promise<T | null>, timeoutMs: number, everyMs = 3000): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v !== null) return v;
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await sleep(everyMs);
  }
}

async function main() {
  if (!SUPABASE_URL.includes(DEV_REF) || SUPABASE_URL.includes(PROD_REF)) throw new Error("NEXT_PUBLIC_SUPABASE_URL must point at the development project.");
  if (!ANON || !SERVICE) throw new Error("Load .env.local (--env-file=.env.local).");
  mkdirSync(OUT, { recursive: true });
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  const walk = readWalkFile();
  const employer = await signIn("employer", walk.employer, walk.password);
  const teammate = await signIn("teammate", walk.teammate, walk.password);
  const engineer = await signIn("engineer", walk.engineer, walk.password);
  const candidate2 = await signIn("candidate2", walk.candidate2, walk.password);
  const { data: membership } = await admin.from("organization_members").select("organization_id").eq("user_id", employer.userId).eq("status", "active").order("joined_at").limit(1).single();
  const orgId = (membership as { organization_id: string }).organization_id;
  const { data: mateRow } = await admin.from("organization_members").select("role").eq("user_id", teammate.userId).eq("organization_id", orgId).eq("status", "active").maybeSingle();
  const exemplar = buildExemplar(EXEMPLAR);
  assert.ok(exemplar, "webhook-dedupe exemplar is available");
  const stamp = new Date().toISOString().slice(0, 16);
  const sentinel = `PRIVATE-SENTINEL-${randomUUID().slice(0, 8)}`;
  const runner = process.env.FYDELL_EXECUTION_PROVIDER ?? "default";

  /* ------------------------------------------------------------ 1 */
  step("1. Employer creates a role, customizes nothing, validates, previews, publishes, invites two candidates");
  const role = obj(
    (await expectStatus(employer, "POST", "/api/eng/roles", [201], {
      title: `Backend Engineer, Webhooks (acceptance ${stamp})`,
      stack: ["Python", "SQLite"],
      responsibilities: "Own webhook processing reliability.",
      evaluationFocus: ["correctness", "work_communication"],
      companyContext: "Synthetic payments company used for acceptance testing.",
    })).role,
    "role",
  );
  const roleId = strField(role, "id");
  const input = {
    level: "mid", other: {}, family: "backend_api_engineer", answers: {}, aiPolicy: "assistants_disclosed", database: "sqlite", language: "python",
    outcomes: [], taskType: "debugging", framework: "none", background: "", outOfScope: [], constraints: [], description: "", taskMinutes: 60,
    capabilities: ["correctness", "reliability", "testing"], setupMinutes: 10, technologies: [], specialization: "general",
    startingMaterial: "reviewed_template", levelExpectations: "Handles edge cases, explains the approach, covers failure paths with tests.",
    confirmedAssumptions: ["synthetic_data"],
    simulation: { mode: "as_is", track: "backend_api", jobTitle: "Backend Engineer", taskFamily: "backend.reliability", exemplarKey: EXEMPLAR, businessContext: "", secondaryCapability: "" },
  };
  const draftId = strField(await expectStatus(employer, "POST", "/api/eng/authoring/drafts", [201], { input, allowDuplicate: true }), "draftId");
  const testJob = obj((await expectStatus(employer, "POST", `/api/eng/authoring/drafts/${draftId}/test`, [202])).job, "job");
  const finished = await poll(
    "checks job",
    async () => {
      const j = obj((await expectStatus(employer, "GET", `/api/eng/authoring/jobs/${strField(testJob, "id")}`, [200])).job, "job");
      return j.status === "succeeded" || j.status === "failed" ? j : null;
    },
    300_000,
  );
  assert.equal(finished.status, "succeeded", `checks job ${String(finished.status)}`);
  const validation = obj((await expectStatus(employer, "GET", `/api/eng/authoring/drafts/${draftId}`, [200])).validation, "validation");
  assert.equal(validation.status, "passed");
  const checksRunner = String(obj(validation.runner, "runner").label);
  const preview = await expectStatus(employer, "GET", `/api/eng/authoring/drafts/${draftId}/preview`, [200]);
  const sha = strField(preview, "packageSha256");
  await expectStatus(employer, "POST", `/api/eng/authoring/drafts/${draftId}/review`, [201], { decision: "approved", notes: "Reviewed in the acceptance run.", packageSha256: sha });
  const versionId = strField(await expectStatus(employer, "POST", `/api/eng/authoring/drafts/${draftId}/publish`, [201], { packageSha256: sha }), "versionId");
  await expectStatus(employer, "PATCH", `/api/eng/roles/${roleId}`, [200], { status: "published" });
  const invites: Record<string, string> = {};
  for (const [who, name] of [[engineer, "Acceptance Engineer A"], [candidate2, "Acceptance Engineer B"]] as const) {
    const inv = await expectStatus(employer, "POST", `/api/eng/roles/${roleId}/invitations`, [201], { email: who.email, name, scenarioVersionId: versionId });
    const route = routeRecipient(who.email, false);
    assert.ok(inv.emailDelivery !== "sent" || ("to" in route && route.to.endsWith("@resend.dev")), "outside production an invitation reaches only a Resend test inbox");
    invites[who.label] = strField(inv, "invitationId");
  }
  pass("role, validated simulation template, preview, publish and two invitations", `checks ran on ${checksRunner}`);

  /* ------------------------------------------------------------ 2 */
  step("2. Both candidates accept, consent, pass preflight and start explicitly");
  async function begin(who: Actor) {
    const attemptId = strField(await expectStatus(who, "POST", "/api/eng/invitations/accept", [200], { invitationId: invites[who.label] }), "attemptId");
    const A = `/api/eng/attempts/${attemptId}/authored`;
    const early = await call(who, "PUT", `${A}/files`, { baseRevision: 1, files: [{ path: "app/receiver.py", content: "# edited before start\n" }] });
    assert.equal(early.status, 409, `no editing before an explicit start (${early.status})`);
    await expectStatus(who, "POST", A, [200], { action: "consent" });
    const env = obj((await expectStatus(who, "POST", `${A}/public-tests`, [200], { purpose: "environment_check" })).run, "run");
    await expectStatus(who, "POST", A, [200], env.status === "ran" ? { action: "environment_ready" } : { action: "environment_ready", continueWithoutCheck: true });
    const started = obj((await expectStatus(who, "POST", A, [200], { action: "start" })).view, "view");
    const workspace = obj(started.workspace, "workspace");
    const starter = (workspace.files as File[]).map((f) => ({ path: f.path, content: f.content }));
    const attempt = obj(started.attempt, "attempt");
    assert.ok(typeof attempt.due_at === "string" || typeof attempt.dueAt === "string" || started.deadline !== undefined, "the server sets the deadline at start");
    return { attemptId, A, starter, revision: Number(workspace.revision), minGap: Number(obj(started.publicRuns, "publicRuns").minGapSeconds ?? 0), envStatus: String(env.status) };
  }
  const a = await begin(engineer);
  const b = await begin(candidate2);
  pass("explicit start after consent and preflight; editing is refused before start", `environment checks ${a.envStatus}, ${b.envStatus}`);

  /* ------------------------------------------------------------ 3 */
  step("3. Candidate A: correct fix, clarification, review question, full handoff");
  const reference = new Map(exemplar.prot.reference.files.map((f) => [f.path, f.content]));
  const correct: File[] = [
    ...a.starter.map((f) => ({ path: f.path, content: reference.get(f.path) ?? f.content })),
    ...[...reference].filter(([p]) => !a.starter.some((f) => f.path === p)).map(([path, content]) => ({ path, content })),
  ];
  const savedA = await expectStatus(engineer, "PUT", `${a.A}/files`, [200], { baseRevision: a.revision, files: correct });
  const staleA = await call(engineer, "PUT", `${a.A}/files`, { baseRevision: a.revision, files: a.starter });
  assert.equal(staleA.status, 409, "an older save cannot overwrite newer content");
  const ws = await expectStatus(engineer, "GET", a.A, [200]);
  const wsFiles = (obj(obj(ws.view, "view").workspace, "workspace").files as File[]).map((f) => f.path).sort();
  assert.deepEqual(wsFiles, correct.map((f) => f.path).sort(), "the server kept the newer content");
  pass("stale save refused with 409; newer content kept", `revision ${String(savedA.revision)}`);

  const lead = exemplar.pkg.coworkers.find((c) => c.id === "lead") ?? exemplar.pkg.coworkers[0];
  const question = "Quick check before I change the receiver: should a duplicate delivery be acknowledged with a 2xx, or rejected so the provider stops retrying?";
  const qId = msgId();
  const [first, retry] = await Promise.all([
    call(engineer, "POST", `${a.A}/team`, { teammateId: lead.id, body: question, clientMsgId: qId }),
    (async () => {
      await sleep(400);
      return call(engineer, "POST", `${a.A}/team`, { teammateId: lead.id, body: question, clientMsgId: qId });
    })(),
  ]);
  assert.ok(first.status === 200 || retry.status === 200, `team message failed: ${first.status}/${retry.status}`);
  const again = await expectStatus(engineer, "POST", `${a.A}/team`, [200], { teammateId: lead.id, body: question, clientMsgId: qId });
  const { data: qRows } = await admin.from("eng_messages").select("client_msg_id").eq("attempt_id", a.attemptId).in("client_msg_id", [qId, `reply_${qId}`]);
  assert.equal((qRows ?? []).filter((r) => r.client_msg_id === qId).length, 1, "the retried message is stored once");
  assert.equal((qRows ?? []).filter((r) => r.client_msg_id === `reply_${qId}`).length, 1, "the retried message gets one reply");
  const thread = obj(again.collaboration, "collaboration").messages as Json[];
  const answer = thread.find((m) => m.sender === "teammate" && !m.eventKey);
  pass("chat retries (concurrent and sequential) store one message and one reply", `${lead.name} replied`);

  if (a.minGap > 0) await sleep((a.minGap + 1) * 1000);
  const runA = obj((await expectStatus(engineer, "POST", `${a.A}/public-tests`, [200], { files: correct })).run, "run");
  const savedSha = typeof runA.filesSha256 === "string" ? runA.filesSha256 : "";
  assert.ok(savedSha.length >= 32, "a test run identifies the snapshot it executed");
  pass("public test run identifies the executed snapshot", `${String(runA.status)}, files ${savedSha.slice(0, 12)}`);

  const opened = obj((await expectStatus(engineer, "POST", `${a.A}/review-opened`, [200])).collaboration, "collaboration");
  const reviewQ = (opened.messages as Json[]).find((m) => m.eventKey === "review_question");
  assert.ok(reviewQ, "opening review releases the planned review question");
  const reply = "Good question. With my change the credit, the receipt and the processed-event row commit in one transaction, so a crash before the receipt is queued rolls back the credit too, and the provider's retry processes the event exactly once. I added test_restart_after_partial_failure to cover that path.";
  await expectStatus(engineer, "POST", `${a.A}/team`, [200], { teammateId: lead.id, body: reply, clientMsgId: msgId() });
  pass("review question released on opening review and answered");

  const handoffA = {
    what_changed:
      "The receiver deduplicated in memory, so a retry on another worker or after a restart credited twice. I moved deduplication into SQLite keyed on the provider event id and made the credit, the receipt and the processed marker one transaction, because a partial failure must leave nothing behind for the retry.",
    how_checked: "Ran the public tests, added a restart test and a failure-while-queueing test, and checked a distinct event with the same payment details is still processed.",
    unresolved: "I am not sure how the provider behaves if our 2xx is lost after commit; I assumed it retries and the dedupe row absorbs it. Concurrent workers on separate databases were not in scope.",
  };
  const receiptA = obj((await expectStatus(engineer, "POST", `${a.A}/submit`, [201], { files: correct, handoff: handoffA, ai_use: "No assistant used." })).receipt, "receipt");
  const repeatA = obj((await expectStatus(engineer, "POST", `${a.A}/submit`, [200], { files: a.starter, ai_use: "" })).receipt, "receipt");
  assert.equal(repeatA.submissionId, receiptA.submissionId, "a submission retry returns the same receipt");
  pass("submitted; a retry, even with a different or empty body, returns the same receipt", strField(receiptA, "submissionId"));

  /* ------------------------------------------------------------ 4 */
  step("4. Candidate B: superficial fix, cutoff enforced by the server, minimal handoff");
  const wrong = exemplar.prot.incorrectSolutions.find((s) => /module-level/i.test(s.description)) ?? exemplar.prot.incorrectSolutions[3];
  const wrongFiles = new Map(wrong.files.map((f) => [f.path, f.content]));
  const superficial: File[] = b.starter.map((f) => ({ path: f.path, content: wrongFiles.get(f.path) ?? f.content }));
  await expectStatus(candidate2, "PUT", `${b.A}/files`, [200], { baseRevision: b.revision, files: superficial });

  const { data: dueRow } = await admin.from("eng_attempts").select("due_at").eq("id", b.attemptId).single();
  const originalDue = (dueRow as { due_at: string }).due_at;
  await admin.from("eng_attempts").update({ due_at: new Date(Date.now() - 11 * 60_000).toISOString() }).eq("id", b.attemptId);
  try {
    const lateSave = await call(candidate2, "PUT", `${b.A}/files`, { baseRevision: 999, files: superficial });
    const lateSubmit = await call(candidate2, "POST", `${b.A}/submit`, { files: superficial, handoff: { what_changed: "Late attempt." }, ai_use: "" });
    assert.equal(lateSave.status, 409, "saving after the grace period is refused by the server");
    assert.equal(lateSubmit.status, 409, "submitting after the grace period is refused by the server");
  } finally {
    await admin.from("eng_attempts").update({ due_at: originalDue }).eq("id", b.attemptId);
  }
  pass("server-enforced cutoff: save and submit refused past the grace period, deadline restored");

  if (b.minGap > 0) await sleep((b.minGap + 1) * 1000);
  const runB = obj((await expectStatus(candidate2, "POST", `${b.A}/public-tests`, [200], { files: superficial })).run, "run");
  pass("superficial fix runs the public tests", `${String(runB.status)}, files ${String(runB.filesSha256 ?? "").slice(0, 12)}`);
  const handoffB = { what_changed: "Moved the seen set to module level.", how_checked: "Public tests pass.", unresolved: "None." };
  const receiptB = obj((await expectStatus(candidate2, "POST", `${b.A}/submit`, [201], { files: superficial, handoff: handoffB, ai_use: "" })).receipt, "receipt");
  pass("submitted", strField(receiptB, "submissionId"));

  /* ------------------------------------------------------------ 5 */
  step("5. Assistance limits under concurrency, on the employer's own preview attempt");
  const previewAttemptId = strField(await expectStatus(employer, "POST", `/api/eng/roles/${roleId}/preview`, [201], { scenarioVersionId: versionId }), "attemptId");
  const P = `/api/eng/attempts/${previewAttemptId}/authored`;
  await expectStatus(employer, "POST", P, [200], { action: "consent" });
  const pEnv = obj((await expectStatus(employer, "POST", `${P}/public-tests`, [200], { purpose: "environment_check" })).run, "run");
  await expectStatus(employer, "POST", P, [200], pEnv.status === "ran" ? { action: "environment_ready" } : { action: "environment_ready", continueWithoutCheck: true });
  await expectStatus(employer, "POST", P, [200], { action: "start" });
  const askId = msgId();
  const [ask1, ask2] = await Promise.all([
    call(employer, "POST", `${P}/assistant`, { prompt: "What does the receiver do with a duplicate event?", clientMsgId: askId, contextPaths: [] }),
    call(employer, "POST", `${P}/assistant`, { prompt: "What does the receiver do with a duplicate event?", clientMsgId: askId, contextPaths: [] }),
  ]);
  const okAsk = [ask1, ask2].filter((r) => r.status === 200);
  assert.ok(okAsk.length >= 1, `assistant failed: ${ask1.status}/${ask2.status}`);
  const ids = new Set(okAsk.map((r) => obj(r.json.interaction, "interaction").id));
  assert.equal(ids.size, 1, "a retried assistant request is one interaction");
  const askStatuses = okAsk.map((r) => String(obj(r.json.interaction, "interaction").status));
  const askStatus = askStatuses.find((s) => s !== "running") ?? askStatuses[0];
  const before = obj((await expectStatus(employer, "GET", `${P}/collaboration`, [200])).collaboration, "collaboration");
  const usedBefore = Number(obj(before.assistant, "assistant").used);
  const cap = usedBefore + 2;
  const claims = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      admin.rpc("eng_claim_assistant_interaction", {
        p_attempt_id: previewAttemptId,
        p_client_msg_id: `limitprobe${i}${msgId()}`.slice(0, 40),
        p_prompt: `Limit probe ${i}`,
        p_context_paths: [],
        p_context_sha256: null,
        p_limit: cap,
        p_stale_seconds: 120,
      }),
    ),
  );
  const statuses = claims.map((c) => {
    const row = (Array.isArray(c.data) ? c.data[0] : c.data) as { status: string } | null;
    return row?.status ?? `error:${c.error?.message ?? "none"}`;
  });
  assert.equal(statuses.filter((s) => s === "running").length, 2, `exactly the remaining allowance is claimed: ${statuses.join(",")}`);
  assert.equal(statuses.filter((s) => s === "limit_reached").length, 3);
  const reloaded = obj((await expectStatus(employer, "GET", `${P}/collaboration`, [200])).collaboration, "collaboration");
  assert.equal(Number(obj(reloaded.assistant, "assistant").used), cap, "the count survives a reload because the server holds it");
  pass("assistant retry is one interaction; 5 concurrent claims against 2 remaining: 2 claimed, 3 limit_reached; count survives reload", `model answer status ${askStatus}`);

  /* ------------------------------------------------------------ 6 */
  step("6. Evaluation and analysis");
  async function waitRun(attemptId: string, who: Actor) {
    return poll(
      "evaluation",
      async () => {
        await call(who, "GET", `/api/eng/attempts/${attemptId}/authored`);
        const { data } = await admin.from("eng_evaluation_runs").select("id,status,last_error_code").eq("attempt_id", attemptId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const r = data as { id: string; status: string; last_error_code: string | null } | null;
        return r && ["human_review", "ready", "failed", "permanent_failure"].includes(r.status) ? r : null;
      },
      1_800_000,
      4000,
    );
  }
  const [evRunA, evRunB] = await Promise.all([waitRun(a.attemptId, engineer), waitRun(b.attemptId, candidate2)]);
  assert.ok(["human_review", "ready"].includes(evRunA.status), `A evaluation ended ${evRunA.status}`);
  assert.ok(["human_review", "ready"].includes(evRunB.status), `B evaluation ended ${evRunB.status}`);
  const evalA = await employerEvaluation(admin, a.attemptId, evRunA.id);
  const evalB = await employerEvaluation(admin, b.attemptId, evRunB.id);
  assert.ok(evalA && evalB, "both evaluations exist");
  const accA = Object.fromEntries(evalA.acceptance.map((x) => [x.id, x.state]));
  const accB = Object.fromEntries(evalB.acceptance.map((x) => [x.id, x.state]));
  assert.ok(Object.values(accA).every((s) => s === "confirmed"), `correct fix confirms every criterion: ${JSON.stringify(accA)}`);
  assert.equal(accB["AC-1"], "not_confirmed", `superficial fix does not confirm AC-1: ${JSON.stringify(accB)}`);
  const failedB = evalB.tests.filter((t) => t.outcome !== "passed").map((t) => t.name);
  pass("evaluations differ for evidence-based reasons", `A ${JSON.stringify(accA)}; B ${JSON.stringify(accB)}`);

  async function details(attemptId: string, handoff: Record<string, string>) {
    const { data: row } = await admin.from("eng_attempts").select("*").eq("id", attemptId).single();
    const attempt = row as AttemptRow;
    const resolved = await resolveScenarioVersion(admin, attempt.scenario_version_id);
    assert.equal(resolved.origin, "employer_authored");
    const pkg = resolved.origin === "employer_authored" ? resolved.pkg : exemplar!.pkg;
    const { data: sub } = await admin.from("eng_submissions").select("upload_id").eq("attempt_id", attemptId).single();
    const files = await sealedSubmissionFiles(admin, sub as { upload_id: string });
    const starter = new Map(pkg.starterFiles.map((f) => [f.path, f.content]));
    const changedPaths = (files ?? []).filter((f) => starter.get(f.path) !== f.content).map((f) => f.path);
    const changes = { changed: changedPaths.filter((p) => starter.has(p)).sort(), added: changedPaths.filter((p) => !starter.has(p)).sort() };
    const handoffList = pkg.submission.handoffPrompts.map((p) => ({ id: p.id, label: p.label, answer: handoff[p.id] ?? "" }));
    const collab = await employerCollaboration(admin, { attempt, pkg }, handoffList, files);
    return { changes, collab };
  }
  const detA = await details(a.attemptId, handoffA);
  const detB = await details(b.attemptId, handoffB);
  const capsA = capabilityStatements(evalA, detA.changes);
  const capsB = capabilityStatements(evalB, detB.changes);
  const behaviours = (c: typeof detA.collab) => Object.fromEntries(c.communication.map((x) => [x.behavior, x.state]));
  const behA = behaviours(detA.collab);
  const behB = behaviours(detB.collab);
  assert.equal(behA.clarification, "observed", "A asked a necessary clarification");
  assert.equal(behB.clarification, "not_assessed", "B asked nothing, and not asking is not penalized");
  for (const item of detA.collab.communication) for (const e of item.excerpts) assert.ok(e.ref, `${item.behavior} excerpt links to its source`);
  assert.ok(!Object.values(behB).includes("not_observed") || behB.feedback !== "not_observed" || detB.collab.messages.some((m) => m.eventKey === "review_question"), "feedback is only not_observed when the question was asked");
  pass("collaboration behaviours: A observed with linked sources; B not assessed where there was no fair opportunity", `A ${JSON.stringify(behA)}; B ${JSON.stringify(behB)}`);

  /* ------------------------------------------------------------ 7 */
  step("7. Employer review: queue actions, release, concurrent decisions, private notes");
  const queue = async (attemptId: string) => (await listTeamQueue(admin, orgId, 300)).find((q) => q.attemptId === attemptId)?.waitingOn ?? "cleared";
  assert.equal(await queue(a.attemptId), "review", "next action is Review submission");
  const htmlA = await page(employer, `/app/employer/engineering/attempts/${a.attemptId}`);
  const htmlB = await page(employer, `/app/employer/engineering/attempts/${b.attemptId}`);
  assert.equal(htmlA.status, 200);
  assert.equal(htmlB.status, 200);
  await expectStatus(employer, "POST", `/api/eng/org/attempts/${a.attemptId}/notes`, [201], { body: `Team note ${sentinel}` });
  assert.equal(await queue(a.attemptId), "continue_review", "after a reviewer starts, next action is Continue review");
  await expectStatus(employer, "POST", `/api/eng/org/attempts/${a.attemptId}/authored-release`, [200], { note: "Thanks for the clear handoff." });
  await expectStatus(employer, "POST", `/api/eng/org/attempts/${b.attemptId}/authored-release`, [200], { note: "Thanks for taking the task." });
  assert.equal(await queue(a.attemptId), "decision", "next action is Record decision");
  pass("queue: Review submission, Continue review after a team note, Record decision after release");

  const second = mateRow && ["owner", "admin", "hiring_manager"].includes(String((mateRow as { role: string }).role)) ? teammate : employer;
  const [d1, d2] = await Promise.all([
    call(employer, "POST", `/api/eng/org/attempts/${a.attemptId}/decision`, { decision: "advance", notes: `Advance. ${sentinel}`, expectedDecisionId: null }),
    call(second, "POST", `/api/eng/org/attempts/${a.attemptId}/decision`, { decision: "hold", notes: "Hold for now.", expectedDecisionId: null }),
  ]);
  const codes = [d1.status, d2.status].sort();
  assert.deepEqual(codes, [200, 409], `two reviewers deciding at once: exactly one wins (${codes.join(",")})`);
  const loser = d1.status === 409 ? d1 : d2;
  assert.ok(loser.json.current, "the conflict response carries the decision that won");
  const { count: decisionRows } = await admin.from("eng_decisions").select("id", { count: "exact", head: true }).eq("attempt_id", a.attemptId);
  assert.equal(decisionRows, 1, "no silent second decision");
  pass("concurrent decisions: one saved, one 409 with the current decision", `second reviewer ${second.label}`);

  const candidateSurfaces = [
    await call(engineer, "GET", a.A),
    await call(engineer, "GET", `${a.A}/report`),
    await call(engineer, "GET", `${a.A}/collaboration`),
    await call(engineer, "GET", "/api/eng/attempts"),
  ];
  for (const r of candidateSurfaces) assert.ok(!r.text.includes(sentinel), "private notes and decision notes never reach candidate APIs");
  const reportA = obj((await expectStatus(engineer, "GET", `${a.A}/report`, [200])).report, "report");
  const reportB = obj((await expectStatus(candidate2, "GET", `${b.A}/report`, [200])).report, "report");
  for (const t of exemplar.prot.protectedTestRefs) assert.ok(!JSON.stringify(reportB).includes(t.name), "candidate report names no hidden test");
  pass("sentinel absent from all four candidate-facing responses; hidden test names withheld");

  const htmlA2 = pageText((await page(employer, `/app/employer/engineering/attempts/${a.attemptId}`)).html);
  const htmlB2 = pageText((await page(employer, `/app/employer/engineering/attempts/${b.attemptId}`)).html);
  const ends = ["Automated evaluation", "Acceptance criteria", "Follow-up", "Limitations and context", "Team only"];
  const excerpt = (t: string) => ({
    header: section(t, "Evaluation", ["Outcome and scope"]).slice(0, 600),
    outcome: section(t, "Outcome and scope", ends.slice(0, 3)),
    collaboration: section(t, "Collaboration behaviours", ["Limitations and context", "Timeline"]).slice(0, 4000),
    limitations: section(t, "Limitations and context", ["Timeline"]),
  });
  const exA = excerpt(htmlA2);
  const exB = excerpt(htmlB2);
  assert.ok(exA.outcome.includes("Outcome and scope") && exB.outcome.includes("Outcome and scope"), "both reports render the outcome and scope");
  assert.ok(!/excellent engineer|culture fit|personality type/i.test(htmlA2 + htmlB2), "no personality or ranking claims");

  /* ------------------------------------------------------------ evidence */
  const file = join(OUT, `journey-${stamp.replace(/[:]/g, "")}.json`);
  const summary = {
    ranAt: new Date().toISOString(),
    baseUrl: BASE,
    executionProviderSetting: runner,
    checksRunner,
    roleId,
    draftId,
    versionId,
    previewAttemptId,
    candidates: {
      correct: {
        attemptId: a.attemptId,
        receiptId: receiptA.submissionId,
        receiptRepeatId: repeatA.submissionId,
        publicRun: { status: runA.status, filesSha256: runA.filesSha256 },
        evaluationRun: evRunA,
        acceptance: accA,
        capabilities: capsA,
        collaboration: detA.collab.communication.map((c) => ({ behavior: c.behavior, state: c.state, summary: c.summary, sources: c.excerpts.map((e) => e.ref) })),
        releasedReport: { version: reportA.version, criteria: reportA.criteria },
        reportExcerpt: exA,
      },
      superficial: {
        attemptId: b.attemptId,
        receiptId: receiptB.submissionId,
        fix: wrong.description,
        publicRun: { status: runB.status, filesSha256: runB.filesSha256 },
        evaluationRun: evRunB,
        acceptance: accB,
        failedTests: failedB,
        capabilities: capsB,
        collaboration: detB.collab.communication.map((c) => ({ behavior: c.behavior, state: c.state, summary: c.summary, sources: c.excerpts.map((e) => e.ref) })),
        releasedReport: { version: reportB.version, criteria: reportB.criteria },
        reportExcerpt: exB,
      },
    },
    leadAnswer: answer ? String(answer.body).slice(0, 400) : null,
    checks,
  };
  writeFileSync(file, JSON.stringify(summary, null, 2));
  const md = [
    `# Employer journey acceptance, ${summary.ranAt}`,
    "",
    `Server ${BASE}. Execution provider setting ${runner}; checks ran on ${checksRunner}.`,
    "",
    "## Why the two reports differ",
    "",
    `Correct fix (attempt ${a.attemptId}, receipt ${String(receiptA.submissionId)}): ${JSON.stringify(accA)}.`,
    `Superficial fix (attempt ${b.attemptId}, receipt ${String(receiptB.submissionId)}): ${JSON.stringify(accB)}. ${wrong.description}`,
    `Controlled tests the superficial fix did not pass: ${failedB.join(", ") || "none"}.`,
    "",
    "## Capability statements, correct fix",
    ...capsA.map((c) => `- ${c.text}`),
    "",
    "## Capability statements, superficial fix",
    ...capsB.map((c) => `- ${c.text}`),
    "",
    "## Collaboration behaviours",
    "",
    "| Behaviour | Correct fix | Superficial fix |",
    "| --- | --- | --- |",
    ...detA.collab.communication.map((c) => `| ${c.label} | ${c.state} | ${behB[c.behavior]} |`),
    "",
    "## Rendered employer report excerpt, correct fix",
    "",
    "```",
    exA.outcome,
    "```",
    "",
    "## Rendered employer report excerpt, superficial fix",
    "",
    "```",
    exB.outcome,
    "```",
    "",
    "## Checks",
    ...checks.map((c) => `- ${c}`),
    "",
  ].join("\n");
  writeFileSync(file.replace(/\.json$/, ".md"), md);
  console.log(`\n${passed} checks passed. Evidence: ${file}`);
}

main().catch((error: unknown) => {
  console.error(`\nFAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
