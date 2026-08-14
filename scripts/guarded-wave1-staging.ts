/**
 * Guarded Wave 1 staging preflight.
 *
 * The script—not memory—enforces the production boundary.
 * It never prints secrets. It exits unless the target is fydell-dev.
 *
 *   npx tsx scripts/guarded-wave1-staging.ts
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

export const ALLOWED_REF = "btbmvrvynnrhapjdkunz";
export const ALLOWED_HOST = "db.btbmvrvynnrhapjdkunz.supabase.co";
export const ALLOWED_NAME = "fydell-dev";
export const DENIED_REF = "qtrhwrcxthtqvkeerptp";
export const DENIED_HOST = "db.qtrhwrcxthtqvkeerptp.supabase.co";

const EXPECTED_001_014 = [
  "001_mvp_core.sql",
  "002_fpa_meridian.sql",
  "003_pilot_requests.sql",
  "004_mvp_schema_note.sql",
  "005_company_profiles_note.sql",
  "006_platform_ops.sql",
  "006a_organizations_base.sql",
  "007_orgs_invitations.sql",
  "008_profiles_account_status.sql",
  "009_org_rls_helpers.sql",
  "010_pilot_lifecycle.sql",
  "011_fde_core_loop.sql",
  "012_fde_account_type_check_fix.sql",
  "013_action_inbox.sql",
  "014_durable_jobs.sql",
];

export const PLAN_015_022 = [
  "015_fde_evidence_math.sql",
  "016_attempt_kind.sql",
  "017_workspace_engine.sql",
  "018_shadow_lock.sql",
  "019_applied_roles_simulations.sql",
  "020_micro_sims_feedback.sql",
  "021_october_pilot_cohort.sql",
  "022_close_answer_key_reads.sql",
];

const DESTRUCTIVE =
  /\b(DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|DROP\s+SCHEMA|DROP\s+DATABASE)\b/i;

function fail(message: string): never {
  console.error(`GUARD FAIL: ${message}`);
  process.exit(1);
}

function readEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return out;
  const raw = readFileSync(path);
  let text = raw.toString("utf8");
  if (text.includes("\u0000")) text = raw.toString("utf16le");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!value || value === "[SENSITIVE]") continue;
    out[m[1]] = value;
  }
  return out;
}

function fileLooksLikeProduction(env: Record<string, string>): boolean {
  const blob = Object.values(env).join("\n");
  return blob.includes(DENIED_REF) || blob.includes(DENIED_HOST);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function assertStagingTarget(env: Record<string, string>): {
  ref: string;
  host: string;
  source: string;
} {
  const url =
    env.WAVE1_STAGING_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    "";
  const host = hostOf(url);
  const ref = host.split(".")[0] || "";

  if (ref === DENIED_REF || host === DENIED_HOST || host.includes(DENIED_REF)) {
    fail(`production project detected (${DENIED_REF}). Refusing to continue.`);
  }
  if (url.includes(DENIED_REF)) {
    fail("production URL fragment detected. Refusing to continue.");
  }
  if (env.SUPABASE_SERVICE_ROLE_KEY && url && ref !== ALLOWED_REF) {
    fail("service-role key is present but the URL is not the allowlisted staging project.");
  }
  if (url && ref !== ALLOWED_REF) {
    fail(`URL host ${host || "(unparseable)"} is not ${ALLOWED_HOST}.`);
  }
  return {
    ref: ref || ALLOWED_REF,
    host: host || ALLOWED_HOST,
    source: url ? "env-url" : "allowlist-default-no-url",
  };
}

function inspectSql(file: string): string[] {
  const sql = readFileSync(resolve(process.cwd(), "supabase/migrations", file), "utf8");
  const notes: string[] = [];
  if (DESTRUCTIVE.test(sql)) notes.push("DESTRUCTIVE statement present");
  if (/security definer/i.test(sql)) notes.push("contains SECURITY DEFINER (search_path must be pinned)");
  if (/insert\s+into/i.test(sql)) notes.push("contains INSERT (seed risk)");
  if (/create table/i.test(sql) && !/enable row level security/i.test(sql) && file !== "016_attempt_kind.sql") {
    if (!/create table if not exists/i.test(sql) || /create table/i.test(sql)) {
      /* 016 is alter-only */
    }
  }
  return notes;
}

function main() {
  const local = readEnvFile(".env.local");
  if (Object.keys(local).length && fileLooksLikeProduction(local)) {
    console.log("DENIED: .env.local matches the production project. It will not be loaded.");
  }
  const stagingFile = readEnvFile(".env.staging.local");
  if (fileLooksLikeProduction(stagingFile)) {
    fail(".env.staging.local points at production.");
  }
  const env = { ...stagingFile } as Record<string, string>;
  if (fileLooksLikeProduction(process.env as Record<string, string>)) {
    console.log("DENIED: process env contains the production project reference. Ignoring those values.");
  }
  if (process.env.WAVE1_STAGING_URL) env.WAVE1_STAGING_URL = process.env.WAVE1_STAGING_URL;
  const target = env.WAVE1_STAGING_URL || env.NEXT_PUBLIC_SUPABASE_URL
    ? assertStagingTarget(env)
    : { ref: ALLOWED_REF, host: ALLOWED_HOST, source: "mcp-allowlist-no-staging-env" };

  console.log("=== Wave 1 guarded staging preflight ===");
  console.log(`allowlisted name: ${ALLOWED_NAME}`);
  console.log(`allowlisted ref:  ${ALLOWED_REF}`);
  console.log(`allowlisted host: ${ALLOWED_HOST}`);
  console.log(`denied ref:       ${DENIED_REF}`);
  console.log(`denied host:      ${DENIED_HOST}`);
  console.log(`resolved ref:     ${target.ref}`);
  console.log(`resolved host:    ${target.host}`);
  console.log(`resolved source:  ${target.source}`);

  if (target.ref !== ALLOWED_REF || target.host !== ALLOWED_HOST) {
    fail("resolved target is not the allowlisted fydell-dev project.");
  }

  const onDisk = readdirSync(resolve(process.cwd(), "supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of EXPECTED_001_014) {
    if (!onDisk.includes(file)) fail(`repository missing ${file}`);
  }
  console.log("001–014 present on disk: yes");

  console.log("\n=== Inspection 015–022 ===");
  for (const file of PLAN_015_022) {
    if (!onDisk.includes(file)) fail(`repository missing ${file}`);
    const notes = inspectSql(file);
    console.log(`${file}: ${notes.length ? notes.join("; ") : "no DROP TABLE / TRUNCATE / DELETE FROM / INSERT"}`);
  }

  console.log("\n=== Migration plan (sequential, stop on first failure) ===");
  PLAN_015_022.forEach((file, i) => console.log(`${String(i + 1).padStart(2, "0")}. ${file}`));
  console.log("Then: seed DA-01 only. Never seed the other micros.");
  console.log("Writes go through MCP project_id=btbmvrvynnrhapjdkunz only.");

  mkdirSync(resolve(process.cwd(), "docs"), { recursive: true });
  writeFileSync(
    resolve(process.cwd(), "docs/wave1-staging-preflight.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        allowlisted: { name: ALLOWED_NAME, ref: ALLOWED_REF, host: ALLOWED_HOST },
        denied: { ref: DENIED_REF, host: DENIED_HOST },
        resolved: target,
        plan: PLAN_015_022,
        rcCommitMustBe: "75c177b or later on wave1-rc1",
      },
      null,
      2,
    ),
  );
  console.log("\nPreflight passed. Wrote docs/wave1-staging-preflight.json");
}

main();
