/**
 * Structural guard for the two Wave 1 database security findings.
 *
 * This reads migration source only. It cannot prove a policy holds at runtime —
 * that is the live role matrix in docs/wave1-db-security-verification.md. What
 * it does prove is that the repository cannot silently drift back:
 * organizations keeps RLS enabled and forced with no client write policy, and
 * the candidate view keeps security_invoker.
 *
 * Run: npx tsx scripts/test-db-security-contract.ts
 */
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(__dirname, "..", "supabase", "migrations");

let failures = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(`     ${err instanceof Error ? err.message : err}`);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

/**
 * Rollback recipes live in `--` comments, so a naive scan would read them as
 * live grants. Every "must not" assertion runs against executable SQL only.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const sql = stripComments(
  files.map((f) => readFileSync(resolve(MIGRATIONS_DIR, f), "utf8")).join("\n")
);

const SECURITY_MIGRATION = "023_org_rls_and_view_invoker.sql";

check(`${SECURITY_MIGRATION} exists`, () => {
  assertTrue(files.includes(SECURITY_MIGRATION), `${SECURITY_MIGRATION} is missing`);
});

// ---------------------------------------------------------------------------
// Finding 1 — organizations
// ---------------------------------------------------------------------------

check("organizations: RLS enabled", () => {
  assertTrue(
    /alter\s+table\s+public\.organizations\s+enable\s+row\s+level\s+security/i.test(sql),
    "public.organizations must enable row level security"
  );
});

check("organizations: RLS forced", () => {
  assertTrue(
    /alter\s+table\s+public\.organizations\s+force\s+row\s+level\s+security/i.test(sql),
    "public.organizations must force row level security"
  );
});

check("organizations: default anon/authenticated grants revoked", () => {
  for (const role of ["anon", "authenticated"]) {
    assertTrue(
      new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.organizations\\s+from\\s+${role}`, "i").test(sql),
      `public.organizations must revoke all from ${role}`
    );
  }
});

check("organizations: members get SELECT only", () => {
  assertTrue(
    /grant\s+select\s+on\s+table\s+public\.organizations\s+to\s+authenticated/i.test(sql),
    "authenticated needs SELECT on organizations for member reads"
  );
  const broadGrant =
    /grant\s+(all|insert|update|delete)[^;]*\son\s+table\s+public\.organizations\s+to\s+[^;]*\b(anon|authenticated)\b/i;
  assertTrue(
    !broadGrant.test(sql),
    "organizations must not grant insert/update/delete/all to anon or authenticated"
  );
});

check("organizations: has a member SELECT policy", () => {
  assertTrue(
    /create\s+policy\s+organizations_select_member\s+on\s+public\.organizations[\s\S]{0,400}?is_organization_member/i.test(
      sql
    ),
    "organizations_select_member must gate on is_organization_member()"
  );
});

check("organizations: no client write policy anywhere", () => {
  const writePolicy =
    /create\s+policy\s+\w+\s+on\s+public\.organizations[^;]*for\s+(insert|update|delete|all)\b/i;
  assertTrue(
    !writePolicy.test(sql),
    "organizations must have no insert/update/delete/all policy; writes are service-role only"
  );
});

// ---------------------------------------------------------------------------
// Finding 2 — scenario_events_candidate
// ---------------------------------------------------------------------------

const view023 = stripComments(readFileSync(resolve(MIGRATIONS_DIR, SECURITY_MIGRATION), "utf8"));

check("scenario_events_candidate: recreated with security_invoker", () => {
  assertTrue(
    /create\s+view\s+public\.scenario_events_candidate\s+with\s*\(\s*security_invoker\s*=\s*true\s*\)/i.test(
      view023
    ),
    "the candidate view must be created with (security_invoker = true)"
  );
});

check("scenario_events_candidate: never granted to anon", () => {
  assertTrue(
    /revoke\s+all\s+on\s+public\.scenario_events_candidate\s+from\s+anon/i.test(view023),
    "the candidate view must revoke all from anon"
  );
  assertTrue(
    !/grant\s+[^;]*on\s+public\.scenario_events_candidate\s+to\s+[^;]*\banon\b/i.test(sql),
    "the candidate view must not be granted to anon"
  );
});

/**
 * `alter default privileges in schema public grant all on tables to anon,
 * authenticated` also covers views, so a revoke written before CREATE VIEW is
 * undone by the CREATE. This ordering bug shipped once; it must not return.
 */
check("scenario_events_candidate: revokes come after the CREATE", () => {
  const created = view023.search(/create\s+view\s+public\.scenario_events_candidate/i);
  assertTrue(created >= 0, "023 must create the candidate view");
  for (const role of ["anon", "authenticated"]) {
    const revoked = view023.search(
      new RegExp(`revoke\\s+all\\s+on\\s+public\\.scenario_events_candidate\\s+from\\s+${role}`, "i")
    );
    assertTrue(revoked > created, `the ${role} revoke must follow CREATE VIEW, not precede it`);
  }
});

check("scenario_events_candidate: read-only for authenticated", () => {
  const grants = [...sql.matchAll(/grant\s+([^;]*?)\s+on\s+public\.scenario_events_candidate\s+to\s+([^;]+);/gi)];
  assertTrue(grants.length > 0, "expected at least one grant on the candidate view");
  for (const [, privileges, grantees] of grants) {
    if (/service_role/i.test(grantees)) continue;
    assertTrue(
      /^select$/i.test(privileges.trim()),
      `authenticated may only hold SELECT on the candidate view, found "${privileges.trim()}"`
    );
  }
});

// ---------------------------------------------------------------------------
// Finding 3 — answer keys and authored content
// ---------------------------------------------------------------------------

for (const table of ["scenario_events", "oral_defense_questions", "evaluation_case_results"]) {
  check(`${table}: anon revoked`, () => {
    assertTrue(
      new RegExp(`revoke\\s+all\\s+on\\s+public\\.${table}\\s+from\\s+anon`, "i").test(view023),
      `023 must revoke all on ${table} from anon`
    );
  });
}

check("sim_template_versions: no client grants", () => {
  for (const role of ["anon", "authenticated"]) {
    assertTrue(
      new RegExp(`revoke\\s+all\\s+on\\s+public\\.sim_template_versions\\s+from\\s+${role}`, "i").test(
        view023
      ),
      `023 must revoke all on sim_template_versions from ${role}`
    );
  }
  assertTrue(
    !/grant\s+[^;]*on\s+public\.sim_template_versions\s+to\s+[^;]*\b(anon|authenticated)\b/i.test(view023),
    "sim_template_versions must not be re-granted to anon or authenticated"
  );
});

check("simulation_templates: configuration column is not granted", () => {
  assertTrue(
    /revoke\s+all\s+on\s+public\.simulation_templates\s+from\s+anon/i.test(view023),
    "023 must revoke all on simulation_templates from anon"
  );
  const columnGrant = view023.match(
    /grant\s+select\s*\(([\s\S]*?)\)\s*on\s+public\.simulation_templates\s+to\s+authenticated/i
  );
  assertTrue(Boolean(columnGrant), "simulation_templates needs an explicit column grant list");
  assertTrue(
    !/\bconfiguration\b/i.test(columnGrant![1]),
    "simulation_templates.configuration must not be granted to authenticated"
  );
});

// ---------------------------------------------------------------------------
// No exposed table may keep a policy while RLS is off (the 0007 lint class)
// ---------------------------------------------------------------------------

check("every table with a policy also enables RLS", () => {
  const policied = new Set(
    [...sql.matchAll(/create\s+policy\s+\w+\s+on\s+public\.(\w+)/gi)].map((m) => m[1].toLowerCase())
  );
  const rlsOn = new Set(
    [...sql.matchAll(/alter\s+table\s+public\.(\w+)\s+enable\s+row\s+level\s+security/gi)].map((m) =>
      m[1].toLowerCase()
    )
  );
  const missing = [...policied].filter((t) => !rlsOn.has(t));
  assertTrue(
    missing.length === 0,
    `these tables have policies but never enable RLS: ${missing.join(", ")}`
  );
});

if (failures > 0) {
  console.error(`\n${failures} database security check(s) failed.`);
  process.exit(1);
}
console.log("\nAll database security contract checks passed. DB_SECURITY_OK");
