/**
 * Live dev-database check that the employer sandbox (demo workspace) is
 * isolated: per-user seeding, owner-only reads, no client writes, no
 * cross-workspace access through the server store or HTTP routes, a reset
 * that touches only the caller's demo, and no rows in live hiring, email,
 * notification, billing or audit tables. Retired public demo URLs and APIs
 * are checked against the running dev server.
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/test-employer-demo-isolation.ts
 * Optional: FYDELL_TEST_BASE_URL (default http://localhost:3000).
 *
 * It creates two throwaway users (delivered+...@resend.dev, confirmed by the
 * admin API, so no email is sent) and deletes them at the end, which cascades
 * to their demo rows. Tokens and keys are never printed.
 */
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { DEMO_APPLICANTS, SAMPLE_APPLICANT_KEY, demoScenarioOrThrow, fixtureFiles } from "@/lib/employer-demo/fixtures";
import {
  DemoWorkspaceError,
  addDemoMessage,
  ensureDemoWorkspace,
  loadDemoWorkspace,
  recordDemoDecision,
  resetDemoWorkspace,
  saveDemoSample,
} from "@/lib/employer-demo/store";
import { parseDecisionInput, parseMessageInput, parseSampleInput } from "@/lib/employer-demo/validate";
import { runtimeFor } from "@/lib/sandbox-demo/runtime";
import type { RunRecord } from "@/lib/sandbox-demo/types";

const DEV_REF = "btbmvrvynnrhapjdkunz";
const PROD_REF = "qtrhwrcxthtqvkeerptp";
const BASE = (process.env.FYDELL_TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

type Actor = { id: string; email: string; client: SupabaseClient; cookie: string };

function sessionCookie(session: Session): string {
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
  const name = `sb-${DEV_REF}-auth-token`;
  if (value.length <= 3180) return `${name}=${value}`;
  const parts: string[] = [];
  for (let i = 0, n = 0; i < value.length; i += 3180, n++) parts.push(`${name}.${n}=${value.slice(i, i + 3180)}`);
  return parts.join("; ");
}

async function rejects(fn: () => Promise<unknown>, status: number): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch (err) {
    return err instanceof DemoWorkspaceError && err.status === status;
  }
}

function sampleRun(status: "pass" | "fail"): RunRecord {
  const scenario = demoScenarioOrThrow();
  const rt = runtimeFor(scenario);
  return {
    at: new Date().toISOString(),
    scope: "all",
    outcome: "completed",
    outcomeMessage: null,
    results: scenario.tests.flatMap((t) => {
      const meta = rt.testMeta(`${t.file}::${t.name}`);
      return meta ? [{ id: meta.id, status, message: null, durationMs: 1 }] : [];
    }),
    logs: [],
    durationMs: 5,
  };
}

/** Rows in live tables that point at the given users. Every count must stay zero. */
async function liveFootprint(admin: SupabaseClient, ids: string[], emails: string[]) {
  const probes: [string, string, string[]][] = [
    ["organizations", "created_by", ids],
    ["organizations", "owner_id", ids],
    ["organization_members", "user_id", ids],
    ["hiring_roles", "created_by", ids],
    ["role_applications", "applicant_user_id", ids],
    ["employer_decisions", "decided_by", ids],
    ["eng_decisions", "decided_by", ids],
    ["candidate_invitations", "invited_by", ids],
    ["user_notifications", "user_id", ids],
    ["audit_logs", "actor_user_id", ids],
    ["security_audit_events", "actor_id", ids],
    ["email_outbox", "recipient_email", emails],
  ];
  const out: Record<string, number> = {};
  for (const [table, column, values] of probes) {
    const { count, error } = await admin.from(table).select("*", { count: "exact", head: true }).in(column, values);
    out[`${table}.${column}`] = error ? -1 : (count ?? 0);
  }
  return out;
}

async function http(path: string, init: RequestInit & { cookie?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.body) headers.set("content-type", "application/json");
  // The dev server drops connections while it compiles a route for the first time.
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
    } catch (err) {
      if (attempt >= 4) throw err;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

function staticScan() {
  const roots = [
    "src/lib/employer-demo",
    "src/app/api/employer/demo",
    "src/app/app/employer/demo",
    "src/app/app/demo",
    "src/components/employer/demo",
  ].map((p) => resolve(p));
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) files.push(full);
    }
  };
  roots.forEach(walk);
  const forbiddenImports = /from\s+["'][^"']*(email|resend|notification|billing|stripe|analytics|posthog|outbox|invit)[^"']*["']/i;
  const tableUse = /\.from\(\s*["']([a-z_]+)["']\s*\)/g;
  const importHits: string[] = [];
  const tableHits: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (forbiddenImports.test(text)) importHits.push(file);
    for (const m of text.matchAll(tableUse)) if (!m[1].startsWith("demo_workspace")) tableHits.push(`${file}: ${m[1]}`);
  }
  check(`demo code (${files.length} files) imports no email, notification, billing, analytics or invitation module`, importHits.length === 0, importHits.join(", "));
  check("demo code reads and writes only demo_workspace* tables", tableHits.length === 0, tableHits.join(", "));
}

async function main() {
  if (!SUPABASE_URL.includes(DEV_REF) || SUPABASE_URL.includes(PROD_REF)) throw new Error("Refusing to run: not the development project.");
  const admin = createAdminSupabaseClient();
  const scenario = demoScenarioOrThrow();
  const tag = randomUUID().slice(0, 8);
  const password = `T-${randomUUID()}`;
  const created: string[] = [];

  const mkActor = async (label: string): Promise<Actor> => {
    const email = `delivered+demo-${label}-${tag}@resend.dev`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { account_type: "employer" } });
    if (error || !data.user) throw new Error(`Could not create test user ${label}.`);
    created.push(data.user.id);
    const client = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error || !signed.data.session) throw new Error(`Test user ${label} could not sign in.`);
    return { id: data.user.id, email, client, cookie: sessionCookie(signed.data.session) };
  };

  try {
    const a = await mkActor("a");
    const b = await mkActor("b");
    const before = await liveFootprint(admin, [a.id, b.id], [a.email, b.email]);

    console.log("\nPer-user seeding");
    const wsA = await ensureDemoWorkspace(a.id);
    const wsB = await ensureDemoWorkspace(b.id);
    check("each user gets their own workspace", wsA !== wsB);
    check("seeding is idempotent", (await ensureDemoWorkspace(a.id)) === wsA);
    const snapA = await loadDemoWorkspace(a.id);
    check("workspace seeded with every fictional applicant", snapA.applicants.length === DEMO_APPLICANTS.length, `${snapA.applicants.length}`);
    const seededThread = DEMO_APPLICANTS.reduce((n, x) => n + x.thread.length, 0);
    check("follow-up thread seeded per workspace", snapA.messages.length === seededThread);
    check("seeded thread names real requirements", snapA.messages.every((m) => m.requirementId === null || scenario.criteria.some((c) => c.id === m.requirementId)));
    check("requirements have real names, not placeholders", scenario.criteria.every((c) => c.text.length > 12 && !/^criterion\s*\d+$/i.test(c.text)));

    console.log("\nRow-level security with user sessions");
    for (const table of ["demo_workspaces", "demo_workspace_applicants", "demo_workspace_decisions", "demo_workspace_messages"]) {
      const scoped = table === "demo_workspaces" ? a.client.from(table).select("id").eq("id", wsB) : a.client.from(table).select("id").eq("workspace_id", wsB);
      const { data, error } = await scoped;
      check(`user A cannot read user B's ${table}`, !error && (data ?? []).length === 0, error?.message ?? "");
    }
    const own = await a.client.from("demo_workspace_applicants").select("applicant_key").eq("workspace_id", wsA);
    check("user A can read their own applicants", (own.data ?? []).length === DEMO_APPLICANTS.length);
    const ins = await a.client.from("demo_workspace_decisions").insert({ workspace_id: wsA, applicant_key: "amara-osei", decision: "advance", decided_by: a.id });
    check("signed-in client cannot insert decisions directly", Boolean(ins.error));
    const upd = await a.client.from("demo_workspace_applicants").update({ display_name: "tampered" }).eq("workspace_id", wsA).select("id");
    check("signed-in client cannot update applicants", Boolean(upd.error) || (upd.data ?? []).length === 0);
    const del = await b.client.from("demo_workspaces").delete().eq("id", wsA).select("id");
    check("user B cannot delete user A's workspace", Boolean(del.error) || (del.data ?? []).length === 0);
    const anon = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
    const anonRead = await anon.from("demo_workspace_applicants").select("id").limit(1);
    check("anonymous client reads nothing", Boolean(anonRead.error) || (anonRead.data ?? []).length === 0);
    const anonIns = await anon.from("demo_workspace_messages").insert({ workspace_id: wsA, applicant_key: "amara-osei", author: "reviewer", body: "x" });
    check("anonymous client cannot write", Boolean(anonIns.error));

    console.log("\nServer store scoping");
    const decisionB = await recordDemoDecision(b.id, { applicantKey: "jonas-weber", decision: "hold", privateNote: "B keeps this" });
    await recordDemoDecision(a.id, { applicantKey: "amara-osei", decision: "advance", privateNote: "A note" });
    await addDemoMessage(a.id, { applicantKey: "lena-park", requirementId: scenario.criteria[0].id, body: "How did you reproduce it?" });
    check("decision on an unknown applicant is refused", await rejects(() => recordDemoDecision(a.id, { applicantKey: "nobody-here", decision: "hold", privateNote: null }), 404));
    await saveDemoSample(b.id, { files: fixtureFiles("reference"), handoff: { changed: "b", checked: "b", unresolved: "" }, run: sampleRun("pass") });
    check(
      "user A cannot reach user B's sample submission",
      await rejects(() => recordDemoDecision(a.id, { applicantKey: SAMPLE_APPLICANT_KEY, decision: "advance", privateNote: null }), 404),
    );
    const snapB = await loadDemoWorkspace(b.id);
    check("user B sees only their own decisions", snapB.decisions.length === 1 && snapB.decisions[0].id === decisionB.id);
    check("user B does not see user A's thread message", snapB.messages.length === seededThread);

    console.log("\nReset");
    const resetBefore = await loadDemoWorkspace(a.id);
    await resetDemoWorkspace(a.id);
    const afterA = await loadDemoWorkspace(a.id);
    const afterB = await loadDemoWorkspace(b.id);
    check("reset removes the caller's decisions", resetBefore.decisions.length === 1 && afterA.decisions.length === 0);
    check("reset restores the seeded thread only", afterA.messages.length === seededThread);
    check("reset restores the fictional applicants", afterA.applicants.length === DEMO_APPLICANTS.length && afterA.applicants.every((x) => x.stage === "new"));
    check("reset records when it happened", afterA.resetAt !== null);
    check("reset leaves user B's decision and sample alone", afterB.decisions.length === 1 && afterB.applicants.some((x) => x.key === SAMPLE_APPLICANT_KEY));

    console.log("\nInput validation");
    check("decision value must be one of three", !parseDecisionInput({ applicantKey: "amara-osei", decision: "hire" }).ok);
    check("applicant key must be well formed", !parseDecisionInput({ applicantKey: "../x", decision: "hold" }).ok);
    check("message requirement must belong to the scenario", !parseMessageInput({ applicantKey: "amara-osei", body: "hi", requirementId: "R99" }, scenario).ok);
    const rt = runtimeFor(scenario);
    const sample = { files: fixtureFiles("reference"), handoff: { changed: "", checked: "", unresolved: "" }, run: sampleRun("pass") };
    check("a complete sample submission is accepted", parseSampleInput(sample, scenario).ok);
    check("sample cannot write a protected or unknown file", !parseSampleInput({ ...sample, files: { ...sample.files, "tests/protected.test.js": "x" } }, scenario).ok);
    check("sample run must cover every test", !parseSampleInput({ ...sample, run: { ...sample.run, scope: "public" } }, scenario).ok);
    check("editable paths exist", rt.editablePaths.length > 0);

    console.log("\nHTTP boundary on the dev server");
    const noAuth = await http("/api/employer/demo/decision", { method: "POST", body: JSON.stringify({ applicantKey: "amara-osei", decision: "hold" }) });
    check("demo write without a session is refused", noAuth.status === 401, `${noAuth.status}`);
    const withAuth = await http("/api/employer/demo/decision", { method: "POST", cookie: a.cookie, body: JSON.stringify({ applicantKey: "amara-osei", decision: "hold", privateNote: "via http" }) });
    const withAuthBody = (await withAuth.json().catch(() => ({}))) as { notified?: boolean; demo?: boolean };
    check("signed-in demo decision is saved and reports no notification", withAuth.status === 200 && withAuthBody.notified === false && withAuthBody.demo === true, `${withAuth.status}`);
    const crossHttp = await http("/api/employer/demo/decision", { method: "POST", cookie: a.cookie, body: JSON.stringify({ applicantKey: SAMPLE_APPLICANT_KEY, decision: "hold" }) });
    check("signed-in user cannot decide on another user's sample over HTTP", crossHttp.status === 404, `${crossHttp.status}`);
    const msgHttp = await http("/api/employer/demo/messages", { method: "POST", cookie: a.cookie, body: JSON.stringify({ applicantKey: "jonas-weber", body: "Why skip the duplicate check?" }) });
    const msgBody = (await msgHttp.json().catch(() => ({}))) as { emailed?: boolean };
    check("follow-up question is saved without email", msgHttp.status === 200 && msgBody.emailed === false, `${msgHttp.status}`);
    const team = await http("/api/sandbox-demo/team", { method: "POST", body: JSON.stringify({}) });
    check("simulated teammates need a session", team.status === 401, `${team.status}`);
    for (const path of ["/api/sandbox", "/api/demo/reset"]) {
      const res = await http(path, { method: "POST", body: JSON.stringify({ namespace: "demo_employer" }) });
      check(`retired ${path} answers 410`, res.status === 410, `${res.status}`);
    }
    const resetNoAuth = await http("/api/employer/demo/reset", { method: "POST" });
    check("demo reset without a session is refused", resetNoAuth.status === 401, `${resetNoAuth.status}`);

    const routes: [string, string][] = [
      ["/sandbox", "/app/employer/demo"],
      ["/sandbox/roles", "/app/employer/demo"],
      ["/sandbox/event-inbox", "/app/employer/demo"],
      ["/sandbox/event-inbox/workspace", "/app/demo/task"],
      ["/sandbox/event-inbox/example/review", "/app/employer/demo/applicants/amara-osei"],
      ["/sandbox/event-inbox/report", "/app/employer/demo/applicants/your-sample"],
      ["/sandbox/evidence/run-123", "/app/employer/demo/applicants/amara-osei"],
      ["/sandbox/work", "/app/demo/task"],
    ];
    for (const [from, to] of routes) {
      const res = await http(from);
      const location = res.headers.get("location") ?? "";
      const target = new URL(location, BASE);
      check(`${from} redirects to the employer sandbox entry`, res.status >= 300 && res.status < 400 && target.pathname === "/demo" && target.searchParams.get("next") === to, `${res.status} ${target.pathname}${target.search}`);
    }
    const entry = await http("/demo?next=%2Fapp%2Fdemo%2Ftask");
    const entryTarget = new URL(entry.headers.get("location") ?? "/", BASE);
    check(
      "signed-out /demo goes to employer sign-up and keeps the destination",
      entryTarget.pathname === "/signup" && entryTarget.searchParams.get("as") === "employer" && entryTarget.searchParams.get("next") === "/app/demo/task",
      `${entry.status} ${entryTarget.pathname}`,
    );
    const entryAuth = await http("/demo?next=%2Fapp%2Femployer%2Fdemo%2Fsimulation", { cookie: a.cookie });
    check("signed-in /demo lands on the requested demo page", new URL(entryAuth.headers.get("location") ?? "/", BASE).pathname === "/app/employer/demo/simulation");
    const evil = await http("/demo?next=https%3A%2F%2Fevil.example", { cookie: a.cookie });
    check("/demo ignores destinations outside the demo", new URL(evil.headers.get("location") ?? "/", BASE).pathname === "/app/employer/demo");

    console.log("\nLive records untouched");
    const after = await liveFootprint(admin, [a.id, b.id], [a.email, b.email]);
    for (const key of Object.keys(after)) check(`${key} unchanged (${after[key]})`, after[key] === before[key] && after[key] === 0);

    console.log("\nStatic boundary");
    staticScan();
  } finally {
    for (const id of created) await admin.auth.admin.deleteUser(id);
    if (created.length) {
      const { count } = await admin.from("demo_workspaces").select("id", { count: "exact", head: true }).in("user_id", created);
      check("test users and their demo rows are removed", (count ?? 0) === 0);
    }
  }

  console.log(failures === 0 ? "\nAll employer sandbox isolation checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err: unknown) => {
  const cause = err instanceof Error && err.cause instanceof Error ? `: ${err.cause.message}` : "";
  console.error(err instanceof Error ? `${err.message}${cause}` : "Unexpected failure.");
  process.exit(1);
});
