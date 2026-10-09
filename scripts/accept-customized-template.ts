/**
 * Customized simulation template acceptance, against a running dev server and
 * the DEVELOPMENT Supabase project. The employer adapts the webhook template to
 * its own business context, the model generates the scenario, the checks run,
 * and the script records whether the adapted version is publishable and why.
 * A generated scenario that fails its checks must be blocked from publishing.
 *
 *   npx tsx --conditions react-server --env-file=.env.local scripts/accept-customized-template.ts
 *
 * Reads the employer and password lines of the walk file (%TEMP%\fydell-walk.txt).
 * Passwords and tokens are never printed. No email leaves the server.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type Session } from "@supabase/supabase-js";

const DEV_REF = "btbmvrvynnrhapjdkunz";
const PROD_REF = "qtrhwrcxthtqvkeerptp";
const BASE = (process.env.FYDELL_TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const EXEMPLAR = "webhook-dedupe";
const OUT = join(process.cwd(), ".scratch", "acceptance", "employer");
const CONTEXT = "A veterinary clinic network that receives appointment-booking webhooks from a scheduling provider. Duplicate deliveries create double bookings for the same pet and time slot.";

type Json = Record<string, unknown>;
type Actor = { token: string; cookie: string };

const checks: string[] = [];
function pass(label: string, detail = "") {
  const line = `${label}${detail ? ` (${detail})` : ""}`;
  checks.push(line);
  console.log(`  ok   ${line}`);
}
function obj(v: unknown, what: string): Json {
  assert.ok(v && typeof v === "object" && !Array.isArray(v), `${what} is not an object`);
  return v as Json;
}
/** Publish blockers other than the reviewer approval every new draft still needs. */
function contentBlockers(gate: unknown): string[] {
  return (Array.isArray(gate) ? gate : []).filter((g): g is string => typeof g === "string" && !g.startsWith("A reviewer must"));
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function walkFields(): { employer: string; password: string } {
  const fields = new Map<string, string>();
  for (const line of readFileSync(process.env.FYDELL_WALK_FILE ?? join(tmpdir(), "fydell-walk.txt"), "utf8").split(/\r?\n/)) {
    const m = /^(\w+)\s+(\S+)\s*$/.exec(line.trim());
    if (m) fields.set(m[1].toLowerCase(), m[2]);
  }
  const employer = fields.get("employer");
  const password = fields.get("password");
  if (!employer || !password) throw new Error("The walk file needs employer and password lines.");
  if (!employer.endsWith("@example.com")) throw new Error("Only synthetic @example.com accounts may be used.");
  return { employer, password };
}

function sessionCookie(session: Session): string {
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
  const name = `sb-${DEV_REF}-auth-token`;
  if (value.length <= 3180) return `${name}=${value}`;
  const parts: string[] = [];
  for (let i = 0, n = 0; i < value.length; i += 3180, n++) parts.push(`${name}.${n}=${value.slice(i, i + 3180)}`);
  return parts.join("; ");
}

async function send(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      const restarting = res.status >= 500 && (res.headers.get("content-type") ?? "").includes("text/html");
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

async function expectStatus(actor: Actor, method: string, path: string, expected: number[], body?: unknown): Promise<Json> {
  const headers: Record<string, string> = { authorization: `Bearer ${actor.token}`, cookie: actor.cookie, origin: BASE };
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await send(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }, 300_000);
  const text = await res.text();
  let json: Json = {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) json = parsed as Json;
  } catch {
    json = {};
  }
  assert.ok(expected.includes(res.status), `${method} ${path} returned ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return json;
}

async function waitForJob(actor: Actor, jobId: string, what: string): Promise<Json> {
  const end = Date.now() + 20 * 60_000;
  for (;;) {
    const job = obj((await expectStatus(actor, "GET", `/api/eng/authoring/jobs/${jobId}`, [200])).job, "job");
    if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") return job;
    if (Date.now() > end) throw new Error(`Timed out waiting for the ${what} job (last status ${String(job.status)})`);
    await sleep(5000);
  }
}

async function main() {
  if (!SUPABASE_URL.includes(DEV_REF) || SUPABASE_URL.includes(PROD_REF)) throw new Error("NEXT_PUBLIC_SUPABASE_URL must point at the development project.");
  mkdirSync(OUT, { recursive: true });
  const walk = walkFields();
  const client = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: walk.employer, password: walk.password });
  if (error || !data.session) throw new Error(`employer could not sign in: ${error?.message ?? "no session"}`);
  const employer: Actor = { token: data.session.access_token, cookie: sessionCookie(data.session) };

  console.log("\nAdapt the webhook simulation template to the employer's context");
  const input = {
    level: "mid", other: {}, family: "backend_api_engineer", answers: {}, aiPolicy: "assistants_disclosed", database: "sqlite", language: "python",
    outcomes: [], taskType: "debugging", framework: "none", background: "", outOfScope: [], constraints: [], description: "", taskMinutes: 60,
    capabilities: ["correctness", "reliability", "testing"], setupMinutes: 10, technologies: [], specialization: "general",
    startingMaterial: "generated", levelExpectations: "Handles edge cases, explains the approach, covers failure paths with tests.",
    confirmedAssumptions: ["synthetic_data"],
    simulation: { mode: "adapt", track: "backend_api", jobTitle: "Backend Engineer", taskFamily: "backend.reliability", exemplarKey: EXEMPLAR, businessContext: CONTEXT, secondaryCapability: "" },
  };
  const created = await expectStatus(employer, "POST", "/api/eng/authoring/drafts", [201], { input, allowDuplicate: true });
  const draftId = String(created.draftId);
  assert.equal(typeof created.jobId, "string", "an adapted template queues a generation job");
  pass("adapted draft created and generation queued", draftId);

  const generation = await waitForJob(employer, String(created.jobId), "generation");
  const afterGeneration = await expectStatus(employer, "GET", `/api/eng/authoring/drafts/${draftId}`, [200]);
  const evidence: Json = { ranAt: new Date().toISOString(), baseUrl: BASE, draftId, businessContext: CONTEXT, generationJob: { status: generation.status, error: generation.error ?? null } };
  if (generation.status !== "succeeded") {
    const gate = contentBlockers(afterGeneration.publishGate);
    assert.ok(gate.length > 0, "a failed generation leaves the draft unpublishable for a reason other than approval");
    pass("generation did not succeed; the draft is blocked from publishing", String(generation.error ?? generation.status));
    evidence.publishGate = gate;
  } else {
    const pkg = obj(afterGeneration.package, "package");
    const pkgText = JSON.stringify(pkg).toLowerCase();
    const tied = ["clinic", "veterinar", "appointment", "booking", "pet"].filter((w) => pkgText.includes(w));
    assert.ok(tied.length >= 2, "the generated scenario reflects the employer's business context");
    pass("generated scenario reflects the employer's context", tied.join(", "));

    let validation = afterGeneration.validation as Json | null;
    if (!validation || validation.current !== true) {
      const test = obj((await expectStatus(employer, "POST", `/api/eng/authoring/drafts/${draftId}/test`, [202])).job, "job");
      const tested = await waitForJob(employer, String(test.id), "checks");
      evidence.checksJob = { status: tested.status, error: tested.error ?? null };
      validation = (await expectStatus(employer, "GET", `/api/eng/authoring/drafts/${draftId}`, [200])).validation as Json | null;
    }
    const v = obj(validation, "validation");
    const runner = obj(v.runner, "runner");
    const results = (Array.isArray(v.checks) ? v.checks : []) as Json[];
    evidence.validation = { status: v.status, runner: runner.label, checks: results.map((c) => ({ id: c.id, status: c.status, detail: c.detail })) };
    const final = await expectStatus(employer, "GET", `/api/eng/authoring/drafts/${draftId}`, [200]);
    evidence.publishGate = final.publishGate;
    if (v.status === "passed") {
      pass("adapted scenario passed every check", `${results.length} checks on ${String(runner.label)}`);
      const preview = await expectStatus(employer, "GET", `/api/eng/authoring/drafts/${draftId}/preview`, [200]);
      assert.equal(typeof preview.packageSha256, "string", "the adapted scenario can be previewed");
      pass("adapted scenario previewed", String(preview.packageSha256).slice(0, 12));
    } else {
      const failed = results.filter((c) => c.status !== "passed");
      const gate = contentBlockers(final.publishGate);
      assert.ok(gate.length > 0, "an adapted scenario that fails its checks is blocked from publishing by those checks");
      pass("adapted scenario failed checks and is blocked from publishing", failed.map((c) => `${String(c.id)}: ${String(c.detail ?? "")}`.slice(0, 160)).join("; "));
    }
  }
  evidence.checks = checks;
  const file = join(OUT, `customized-${new Date().toISOString().slice(0, 16).replace(/[:]/g, "")}.json`);
  writeFileSync(file, JSON.stringify(evidence, null, 2));
  console.log(`\n${checks.length} checks passed. Evidence: ${file}`);
}

main().catch((error: unknown) => {
  console.error(`\nFAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
