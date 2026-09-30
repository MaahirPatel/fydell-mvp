/**
 * Migration 039 invariants against a real Postgres engine (PGlite).
 *
 * Applies the real 019, 038 and 039 migrations and exercises the validation
 * lifecycle, append-only reviews, intake freeze, idempotency and org
 * isolation under RLS. Stubs only what those migrations reference from
 * earlier ones (auth schema, organizations, membership helper).
 *
 * PGlite is installed without touching package.json:
 *   npm install --no-save @electric-sql/pglite && node scripts/test-migration-039.mjs
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));
const db = new PGlite();
let failures = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "  ok  " : "  FAIL"} ${name}${detail && !cond ? " — " + detail : ""}`);
  if (!cond) failures++;
};
async function rejects(name, sql, pattern) {
  try {
    await db.exec(sql);
    ok(name, false, "statement succeeded");
  } catch (e) {
    ok(name, pattern.test(e.message), e.message);
  }
}
async function succeeds(name, sql) {
  try {
    await db.exec(sql);
    ok(name, true);
  } catch (e) {
    ok(name, false, e.message);
  }
}

process.on("unhandledRejection", (e) => {
  console.error("UNHANDLED:", e.message, e.where ?? "");
  process.exit(1);
});
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  create role authenticated;
  create table public.organizations (id uuid primary key default gen_random_uuid(), name text);
  create table public.organization_members (organization_id uuid, user_id uuid, role text, status text);
  create function public.is_organization_member(org_id uuid) returns boolean language sql stable security definer as $$
    select exists (select 1 from public.organization_members m where m.organization_id = org_id and m.user_id = auth.uid() and m.status = 'active') $$;
`);
await db.exec(readFileSync(repo + "019_applied_roles_simulations.sql", "utf8"));
await db.exec(readFileSync(repo + "038_sim_templates_engineering_roles.sql", "utf8"));
await db.exec(readFileSync(repo + "039_role_intake_and_scenario_reviews.sql", "utf8"));
console.log("applied 019, 038, 039");
await db.exec(readFileSync(repo + "039_role_intake_and_scenario_reviews.sql", "utf8"));
ok("039 is re-runnable", true);

const AUTHOR = "00000000-0000-0000-0000-00000000000a";
const REVIEWER = "00000000-0000-0000-0000-00000000000b";
await db.exec(`
  insert into auth.users values ('${AUTHOR}'), ('${REVIEWER}');
  insert into public.sim_templates (id, slug, role_key, title, status) values
    ('10000000-0000-0000-0000-000000000001', 'webhook-retry-incident', 'backend_engineer', 'Webhook', 'published');
  insert into public.sim_template_versions (id, template_id, version, content, created_by, published_at) values
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, '{"a":1}', '${AUTHOR}', now());
`);
const V = "'20000000-0000-0000-0000-000000000001'";
const setStatus = (s) => `update public.sim_template_versions set validation_status = '${s}' where id = ${V}`;
const review = (stage, outcome, kind, actorId = "null", qual = "null") =>
  `insert into public.sim_scenario_reviews (template_version_id, stage, outcome, actor_kind, actor, actor_user_id, actor_qualification, evidence)
   values (${V}, '${stage}', '${outcome}', '${kind}', 'x', ${actorId}, ${qual}, '["e"]')`;

const { rows: [v] } = await db.query(`select validation_status from public.sim_template_versions where id = ${V}`);
ok("existing versions start at draft (no backfill)", v.validation_status === "draft");

await rejects("published content stays immutable", `update public.sim_template_versions set content = '{"a":2}' where id = ${V}`, /immutable/);
await rejects("draft cannot jump to published", setStatus("published"), /cannot move from draft to published/);
await succeeds("draft → automated_validation", setStatus("automated_validation"));
await rejects("expert_review needs a passing automated record", setStatus("expert_review"), /passing automated/);
await rejects("automation cannot record an approval", review("expert_review", "approved", "automation", "null", "'x'"), /human_decisions/);
await rejects("stage and outcome must agree", review("automated_validation", "approved", "human"), /check constraint/);
await succeeds("record automated pass", review("automated_validation", "passed", "automation"));
await succeeds("automated_validation → expert_review (validation_status moves on a published version)", setStatus("expert_review"));
await rejects("approval without a qualification is refused", review("expert_review", "approved", "human", `'${REVIEWER}'`), /expert_qualified/);
await succeeds("record author's own approval", review("expert_review", "approved", "human", `'${AUTHOR}'`, "'staff eng'"));
await rejects("author cannot approve their own version", setStatus("approved"), /author cannot approve/);
await succeeds("record independent approval", review("expert_review", "approved", "human", `'${REVIEWER}'`, "'staff eng'"));
await succeeds("expert_review → approved", setStatus("approved"));
await rejects("approval alone does not publish", setStatus("published"), /publication record/);
await succeeds("record publication", review("publication", "published", "human", `'${REVIEWER}'`));
await succeeds("approved → published", setStatus("published"));
await rejects("published cannot go back to draft", setStatus("draft"), /cannot move/);
await rejects("review records are append-only (update)", `update public.sim_scenario_reviews set actor = 'y'`, /append-only/);
await rejects("review records are append-only (delete)", `delete from public.sim_scenario_reviews`, /append-only/);
await rejects("published versions cannot be deleted", `delete from public.sim_template_versions where id = ${V}`, /immutable/);

// Unpublished draft versions can now actually be deleted (019's guard returned NULL on DELETE).
await db.exec(`insert into public.sim_template_versions (id, template_id, version, content) values
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 2, '{}')`);
await db.exec(`delete from public.sim_template_versions where id = '20000000-0000-0000-0000-000000000002'`);
const { rows: gone } = await db.query(`select 1 from public.sim_template_versions where id = '20000000-0000-0000-0000-000000000002'`);
ok("unpublished draft versions are deletable", gone.length === 0);

// Intake freeze + idempotency + RLS.
const ORG_A = "30000000-0000-0000-0000-00000000000a";
const ORG_B = "30000000-0000-0000-0000-00000000000b";
await db.exec(`
  insert into public.organizations (id, name) values ('${ORG_A}', 'A'), ('${ORG_B}', 'B');
  insert into public.organization_members values ('${ORG_A}', '${AUTHOR}', 'owner', 'active'), ('${ORG_B}', '${REVIEWER}', 'owner', 'active');
  insert into public.employer_role_intakes (id, organization_id, client_request_id, title, role_family, intake)
    values ('40000000-0000-0000-0000-000000000001', '${ORG_A}', 'req-12345678', 'Backend', 'backend', '{"title":"Backend"}');
  insert into public.role_requests (organization_id, role_family, title, reason) values ('${ORG_B}', 'mobile', 'iOS', 'family_unavailable');
`);
await rejects(
  "idempotency key is unique per organization",
  `insert into public.employer_role_intakes (organization_id, client_request_id, title, role_family, intake) values ('${ORG_A}', 'req-12345678', 'Dup', 'backend', '{}')`,
  /duplicate key/
);
await succeeds(
  "same key in another organization is independent",
  `insert into public.employer_role_intakes (organization_id, client_request_id, title, role_family, intake) values ('${ORG_B}', 'req-12345678', 'B', 'backend', '{}')`
);
await succeeds("editable before freeze", `update public.employer_role_intakes set title = 'Backend II' where id = '40000000-0000-0000-0000-000000000001'`);
await succeeds("freeze on first invitation", `update public.employer_role_intakes set frozen_at = now() where id = '40000000-0000-0000-0000-000000000001'`);
await rejects("frozen intake cannot change", `update public.employer_role_intakes set intake = '{"title":"changed"}' where id = '40000000-0000-0000-0000-000000000001'`, /frozen/);
await rejects("frozen intake cannot be deleted", `delete from public.employer_role_intakes where id = '40000000-0000-0000-0000-000000000001'`, /cannot be deleted/);
await rejects("unknown request reason refused", `insert into public.role_requests (organization_id, role_family, title, reason) values ('${ORG_A}', 'x', 'y', 'because')`, /check constraint/);

await db.exec(`
  grant usage on schema public to authenticated; grant usage on schema auth to authenticated;
  grant select on public.employer_role_intakes, public.role_requests, public.sim_scenario_reviews to authenticated;
  grant execute on function auth.uid() to authenticated;
`);
async function asUser(uid, sql) {
  await db.exec(`set role authenticated; select set_config('request.uid', '${uid}', false);`);
  try {
    return (await db.query(sql)).rows;
  } finally {
    await db.exec("reset role;");
  }
}
const aIntakes = await asUser(AUTHOR, "select organization_id from public.employer_role_intakes");
ok("org A member sees only org A intakes", aIntakes.length === 1 && aIntakes[0].organization_id === ORG_A, JSON.stringify(aIntakes));
const aRequests = await asUser(AUTHOR, "select 1 from public.role_requests");
ok("org A member cannot see org B role requests", aRequests.length === 0);
const bRequests = await asUser(REVIEWER, "select 1 from public.role_requests");
ok("org B member sees org B role requests", bRequests.length === 1);
const reviews = await asUser(AUTHOR, "select 1 from public.sim_scenario_reviews");
ok("clients cannot read scenario review records", reviews.length === 0);
try {
  await asUser(AUTHOR, `insert into public.role_requests (organization_id, role_family, title, reason) values ('${ORG_A}', 'x', 'y', 'custom_family')`);
  ok("clients cannot write role requests directly", false);
} catch (e) {
  ok("clients cannot write role requests directly", /permission denied|row-level security/.test(e.message), e.message);
}

console.log(failures === 0 ? "\nMigration 039 checks passed." : `\n${failures} migration check(s) failed.`);
process.exit(failures ? 1 : 0);
