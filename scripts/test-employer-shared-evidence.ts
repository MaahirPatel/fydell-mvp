/**
 * E9 live walk: an employer reads shared evidence against a role.
 *
 *   engineer with an analyzed project -> applies to a published role with it
 *   -> pinned share and review created -> employer applicant view lists the
 *   role's own requirement names beside the shared findings -> employer maps
 *   a finding to a requirement with a reason and records a private decision
 *   note -> neither the reason nor the note reaches any engineer-facing API
 *   or page -> the engineer cannot call the employer review endpoints ->
 *   withdrawing ends employer access to the shared evidence.
 *
 * Runs against a running dev server and the DEVELOPMENT Supabase project
 * with the synthetic walk accounts in %TEMP%\fydell-walk.txt. Credentials
 * and tokens are never printed.
 *
 *   npx tsx --conditions react-server --env-file=.env.local scripts/test-employer-shared-evidence.ts
 */
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type Session } from "@supabase/supabase-js";

const DEV_REF = "btbmvrvynnrhapjdkunz";
const BASE = (process.env.FYDELL_TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type Json = Record<string, unknown>;
type Actor = { label: string; userId: string; token: string; cookie: string };

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) passed += 1;
  else failed += 1;
  console.log(`  ${cond ? "ok  " : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
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
  const out = { employer: get("employer"), engineer: get("engineer"), password: get("password") };
  for (const e of [out.employer, out.engineer]) if (!e.endsWith("@example.com")) throw new Error("Only synthetic @example.com accounts may be used.");
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
  if (error || !data.session || !data.user) throw new Error(`${label} could not sign in`);
  return { label, userId: data.user.id, token: data.session.access_token, cookie: sessionCookie(data.session) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retries only when the shared dev server dropped the connection, cut a body
 * off, or answered with a restart page. Retried requests are reads or
 * idempotent writes keyed by role, share and requirement.
 */
async function send(url: string, init: RequestInit): Promise<{ res: Response; text: string }> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(240_000) });
      const text = await res.text();
      const restarting = res.status >= 500 && url.includes("/api/") && (res.headers.get("content-type") ?? "").includes("text/html");
      if (!restarting || i >= 4) return { res, text };
    } catch (error) {
      const dropped = error instanceof Error && (error.message === "fetch failed" || error.message === "terminated" || error.name === "TimeoutError");
      if (!dropped || i >= 4) throw error;
    }
    console.log(`  ..   dev server unavailable, retrying ${init.method ?? "GET"} ${url.replace(BASE, "")}`);
    await sleep(20_000);
  }
}

async function call(actor: Actor, method: string, path: string, body?: unknown): Promise<{ status: number; json: Json; text: string }> {
  const headers: Record<string, string> = { cookie: actor.cookie, origin: BASE };
  if (path.startsWith("/api/")) headers.authorization = `Bearer ${actor.token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const { res, text } = await send(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  let json: Json = {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) json = parsed as Json;
  } catch {
    json = {};
  }
  return { status: res.status, json, text };
}

function decodeHtml(html: string): string {
  return html
    .replace(/&#x27;|&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function main() {
  if (!SUPABASE_URL.includes(DEV_REF)) throw new Error("NEXT_PUBLIC_SUPABASE_URL must point at the development project.");
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  const walk = readWalkFile();
  const employer = await signIn("employer", walk.employer, walk.password);
  const engineer = await signIn("engineer", walk.engineer, walk.password);
  const stamp = randomUUID().slice(0, 8);
  const mapSentinel = `MAP-REASON-${stamp}`;
  const noteSentinel = `PRIVATE-NOTE-${stamp}`;

  const { data: leftovers } = await admin
    .from("role_applications")
    .select("id,hiring_roles!inner(title)")
    .eq("applicant_user_id", engineer.userId)
    .eq("status", "submitted")
    .like("hiring_roles.title", "Backend engineer, shared evidence walk %");
  for (const l of (leftovers ?? []) as Array<{ id: string }>) await call(engineer, "POST", `/api/applications/${l.id}/withdraw`, {});

  console.log("\n1. Engineer has an analyzed project with findings");
  const { data: passport } = await admin.from("passports").select("id").eq("owner_id", engineer.userId).maybeSingle();
  const passportId = (passport as { id: string } | null)?.id ?? "";
  const { data: projectRows } = await admin
    .from("passport_projects")
    .select("id,repo_full_name,analyzed_at,passport_evidence(id)")
    .eq("passport_id", passportId)
    .order("analyzed_at", { ascending: false });
  type ProjectRow = { id: string; repo_full_name: string; analyzed_at: string; passport_evidence: Array<{ id: string }> };
  const project = ((projectRows ?? []) as ProjectRow[]).find((p) => p.passport_evidence.length >= 2);
  check("the engineer has a project snapshot with at least two findings", !!project, project ? `${project.repo_full_name}, ${project.passport_evidence.length} findings` : "none");
  if (!project) throw new Error("Import a project for the walk engineer first.");

  console.log("\n2. Employer publishes a role with named requirements");
  const required = [`Keeps background work idempotent across retries (${stamp})`, `Writes tests for failure paths (${stamp})`];
  const created = await call(employer, "POST", "/api/hiring/roles", {
    title: `Backend engineer, shared evidence walk ${stamp}`,
    description: "Synthetic role used to walk shared evidence against named requirements.",
    required: required.join("\n"),
    preferred: "Postgres experience",
    hiringSteps: "Application review\nOne technical conversation",
    remotePolicy: "remote",
    contactEmail: "hiring@example.com",
  });
  const roleId = String((created.json.role as Json | undefined)?.id ?? "");
  check("role created", created.status === 200 && !!roleId, String(created.status));
  const published = await call(employer, "POST", `/api/hiring/roles/${roleId}`, { action: "publish", confirmGenuine: true });
  const slug = String((published.json.role as Json | undefined)?.slug ?? "");
  check("role published with a public application link", published.status === 200 && !!slug, String(published.status));
  const { data: roleRow } = await admin.from("hiring_roles").select("evaluation_criteria,requirements").eq("id", roleId).single();
  const stored = roleRow as { evaluation_criteria: string[]; requirements: Array<{ text: string; kind: string; confirmed: boolean }> };
  check("the role stores exactly the requirement names the employer typed", JSON.stringify(stored.evaluation_criteria) === JSON.stringify(required), JSON.stringify(stored.evaluation_criteria));

  console.log("\n3. Engineer applies with the project");
  const applied = await call(engineer, "POST", `/api/jobs/${slug}/apply`, {
    contactName: "Walk Engineer",
    repos: [project.repo_full_name],
    links: [],
    note: "Applying with one analyzed project.",
    confirmShare: true,
  });
  const appId = String(applied.json.id ?? "");
  check("application submitted with the project", applied.status === 200 && !!appId, `${applied.status} ${applied.status === 200 ? "" : applied.text.slice(0, 200)}`);
  const { data: appRow } = await admin.from("role_applications").select("share_id,review_id,organization_id").eq("id", appId).single();
  const app = appRow as { share_id: string | null; review_id: string | null; organization_id: string };
  const shareId = app.share_id ?? "";
  const reviewId = app.review_id ?? "";
  const { data: shareRow } = await admin.from("passport_shares").select("passport_id,version_policy,project_repos,revoked_at").eq("id", shareId).maybeSingle();
  const share = shareRow as { passport_id: string; version_policy: string; project_repos: string[] | null; revoked_at: string | null } | null;
  check(
    "a pinned share of exactly that project and an employer review were created",
    !!share && share.passport_id === passportId && share.version_policy === "pinned" && JSON.stringify(share.project_repos) === JSON.stringify([project.repo_full_name]) && !!reviewId,
    JSON.stringify(share),
  );
  const { count: pinnedCount } = await admin.from("application_evidence").select("evidence_version_id", { count: "exact", head: true }).eq("application_id", appId);
  check("the project version is pinned to the application", (pinnedCount ?? 0) === 1, String(pinnedCount));

  console.log("\n4. Employer applicant view: requirement names beside the shared findings");
  const pagePath = `/app/employer/openings/${roleId}/applications/${appId}`;
  const page = await call(employer, "GET", pagePath);
  const html = decodeHtml(page.text);
  check("the applicant page opens for the employer", page.status === 200, String(page.status));
  check("both requirement names appear exactly as the role states them", required.every((r) => html.includes(r)));
  const { data: evidenceRows } = await admin.from("passport_evidence").select("id,path,start_line").eq("project_id", project.id).limit(50);
  const evidence = (evidenceRows ?? []) as Array<{ id: string; path: string; start_line: number }>;
  check("the shared findings are listed with their cited path and line", evidence.some((e) => html.includes(`${e.path}:${e.start_line}`)));
  check("the view says nothing is mapped yet, not a negative judgment", html.includes("Nothing mapped yet, which is not a negative judgment"));

  console.log("\n5. Employer maps a finding to a requirement and records a private decision");
  const mapBase = `/api/employer/review/${roleId}/${shareId}/mappings`;
  const finding = evidence[0];
  const mapped = await call(employer, "POST", mapBase, { requirementIndex: 0, evidenceId: finding.id, status: "unresolved", assessment: "insufficient", reviewerNote: `Relevant, not enough yet. ${mapSentinel}` });
  const mapping = (mapped.json.mapping ?? {}) as Json;
  check("the mapping saves against requirement 1", mapped.status === 200, `${mapped.status} ${mapped.text.slice(0, 160)}`);
  check("the stored mapping carries the role's own requirement name", mapping.requirementText === required[0], String(mapping.requirementText));
  check("the stored mapping cites the shared finding and its snapshot", mapping.evidenceId === finding.id && mapping.evidenceProjectId === project.id);
  const second = await call(employer, "POST", mapBase, { requirementIndex: 1, status: "unresolved", assessment: "not_observed", reviewerNote: `No failure-path test shared. ${mapSentinel}` });
  check("requirement 2 maps to its own name", second.status === 200 && (second.json.mapping as Json | undefined)?.requirementText === required[1]);
  const outOfRange = await call(employer, "POST", mapBase, { requirementIndex: 2, status: "unresolved", assessment: "not_observed", reviewerNote: "Out of range." });
  check("an index outside the role's requirements is refused", outOfRange.status === 400, String(outOfRange.status));
  const { data: foreign } = await admin.from("passport_evidence").select("id,project_id,passport_projects!inner(passport_id)").neq("passport_projects.passport_id", passportId).limit(1).maybeSingle();
  const foreignId = (foreign as { id: string } | null)?.id;
  if (foreignId) {
    const outside = await call(employer, "POST", mapBase, { requirementIndex: 0, evidenceId: foreignId, status: "accepted", assessment: "supports" });
    check("a finding from someone else's work cannot be mapped", outside.status === 400, String(outside.status));
  }
  const { data: rev } = await admin.from("employer_passport_reviews").select("updated_at").eq("id", reviewId).single();
  const decided = await call(employer, "PATCH", `/api/employer/passport-reviews/${reviewId}`, { decision: "hold", note: `Hold for a conversation. ${noteSentinel}`, expectedVersion: (rev as { updated_at: string }).updated_at });
  check("a decision with a private note is recorded", decided.status === 200, `${decided.status} ${decided.text.slice(0, 160)}`);
  const after = decodeHtml((await call(employer, "GET", pagePath)).text);
  check("the team sees its mapping reason and private note on the applicant page", after.includes(mapSentinel) && after.includes(noteSentinel));
  check("the mapped requirement now shows its assessment", after.includes("Relevant but not enough"));
  const brief = decodeHtml((await call(employer, "GET", `/app/employer/passports/${reviewId}/brief?role=${roleId}`)).text);
  check("the decision brief lists the requirement names", required.every((r) => brief.includes(r)));

  console.log("\n6. Nothing private reaches the engineer");
  const surfaces = [
    `/api/applications/${appId}/questions`,
    "/api/candidate/questions",
    "/api/notifications",
    "/api/passport/shares",
    "/api/passport/export",
    "/api/passport/receipts",
    "/api/passport/corrections",
    `/api/passport/capability-reports?projectId=${project.id}`,
    `/api/passport/evidence?projectKey=${encodeURIComponent(project.repo_full_name)}`,
    `/app/candidate/applications/${appId}`,
    "/app/candidate/applications",
    "/app/candidate/work-record",
    "/app/candidate/profile",
  ];
  const leaks: string[] = [];
  const statuses: string[] = [];
  for (const path of surfaces) {
    const r = await call(engineer, "GET", path);
    statuses.push(`${path.split("?")[0]} ${r.status}`);
    if (r.status !== 200) leaks.push(`${path} answered ${r.status}`);
    if (r.text.includes(mapSentinel) || r.text.includes(noteSentinel)) leaks.push(`${path} contains a private sentinel`);
    if (/"(reviewer_?[Nn]ote|private_?[Nn]ote|privateNote|reviewerNote|assessment)"\s*:/.test(r.text)) leaks.push(`${path} has a reviewer field`);
  }
  check(`no mapping reason, private note or reviewer field in ${surfaces.length} engineer-facing responses`, leaks.length === 0, leaks.join("; "));
  console.log(`       ${statuses.join(", ")}`);

  const denied = [
    await call(engineer, "GET", `/api/employer/review/${roleId}/${shareId}`),
    await call(engineer, "POST", mapBase, { requirementIndex: 0, status: "accepted", assessment: "supports", reviewerNote: "self" }),
    await call(engineer, "PATCH", `/api/employer/passport-reviews/${reviewId}`, { decision: "advance", note: "self" }),
  ];
  check(
    "the engineer cannot read or write the employer review",
    denied.every((r) => r.status >= 400 && r.status < 500 && !r.text.includes(mapSentinel) && !r.text.includes(noteSentinel)),
    denied.map((r) => r.status).join(", "),
  );
  const employerPageAsEngineer = await call(engineer, "GET", pagePath);
  check("the employer applicant page does not render for the engineer", employerPageAsEngineer.status !== 200 || !employerPageAsEngineer.text.includes(noteSentinel), String(employerPageAsEngineer.status));
  const { data: mapRows } = await admin.from("requirement_evidence_mappings").select("reviewer_note").eq("share_id", shareId);
  check("both mapping reasons are stored server-side", ((mapRows ?? []) as Array<{ reviewer_note: string }>).filter((m) => m.reviewer_note.includes(mapSentinel)).length === 2);

  console.log("\n7. Withdrawing ends employer access");
  const withdrawn = await call(engineer, "POST", `/api/applications/${appId}/withdraw`, {});
  check("the engineer withdraws", withdrawn.status === 200, String(withdrawn.status));
  const blocked = await call(employer, "POST", mapBase, { requirementIndex: 0, status: "unresolved", assessment: "insufficient", reviewerNote: "after withdraw" });
  check("after withdrawal the employer can no longer map evidence", blocked.status === 404, String(blocked.status));
  const gone = decodeHtml((await call(employer, "GET", pagePath)).text);
  check("after withdrawal the shared findings are gone from the applicant page", !evidence.some((e) => gone.includes(`${e.path}:${e.start_line}`)) && gone.includes("withdrew"));

  console.log(`\nRole ${roleId}, application ${appId}, share ${shareId}, review ${reviewId}`);
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error: unknown) => {
  console.error(`\nFAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
