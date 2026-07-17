/**
 * Checkpoint H — RLS structural smoke test.
 *
 * This is NOT a live database test. It does not connect to Postgres/Supabase
 * and cannot prove a policy actually blocks a cross-tenant read at runtime —
 * that requires a real project + two authenticated sessions (see
 * "Known limitations" below and docs/part2-final-report.md).
 *
 * What it DOES prove, structurally, straight from the migration source:
 *   1. Every table this script cares about has `enable row level security`
 *      in the same migration file that creates it (or a later one).
 *   2. At least one named `create policy ... on <table>` exists for it.
 *   3. The tables introduced by 013_action_inbox.sql and
 *      015_fde_evidence_math.sql specifically are covered — those are the
 *      two surfaces this checkpoint calls out (Action Inbox, evidence atoms).
 *
 * Run: npx tsx scripts/test-rls-smoke.ts
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
    console.error(err instanceof Error ? err.message : err);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function loadAllMigrations(): { file: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => ({
      file,
      sql: readFileSync(resolve(MIGRATIONS_DIR, file), "utf8"),
    }));
}

function combinedSql(migrations: { file: string; sql: string }[]): string {
  return migrations.map((m) => m.sql).join("\n");
}

/** True if `enable row level security` appears for this exact table anywhere in the corpus. */
function hasRlsEnabled(sql: string, table: string): boolean {
  const re = new RegExp(
    `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
    "i"
  );
  return re.test(sql);
}

/** True if at least one named policy targets this exact table anywhere in the corpus. */
function hasNamedPolicy(sql: string, table: string): { found: boolean; names: string[] } {
  const re = new RegExp(`create\\s+policy\\s+(\\w+)\\s+on\\s+public\\.${table}\\b`, "gi");
  const names: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(sql)) !== null) {
    names.push(match[1]);
  }
  return { found: names.length > 0, names };
}

/** True if `create table ... public.<table>` appears anywhere in the corpus. */
function tableIsDefined(sql: string, table: string): boolean {
  const re = new RegExp(`create\\s+table\\s+(if\\s+not\\s+exists\\s+)?public\\.${table}\\b`, "i");
  return re.test(sql);
}

const migrations = loadAllMigrations();
const sql = combinedSql(migrations);

check("migrations directory is non-empty", () => {
  assertTrue(migrations.length > 0, "expected at least one migration file under supabase/migrations/");
});

check("013_action_inbox.sql exists", () => {
  assertTrue(
    migrations.some((m) => m.file === "013_action_inbox.sql"),
    "013_action_inbox.sql is missing"
  );
});

check("015_fde_evidence_math.sql exists", () => {
  assertTrue(
    migrations.some((m) => m.file === "015_fde_evidence_math.sql"),
    "015_fde_evidence_math.sql is missing"
  );
});

// ---------------------------------------------------------------------------
// Action Inbox — every logged-in user's own feed. Must be readable/writable
// only by its owner (user_id = auth.uid()); admin/service-role writes bypass
// RLS by design (see supabase/migrations/013_action_inbox.sql).
// ---------------------------------------------------------------------------
check("action_inbox: table defined", () => {
  assertTrue(tableIsDefined(sql, "action_inbox"), "public.action_inbox is not defined");
});

check("action_inbox: RLS enabled", () => {
  assertTrue(
    hasRlsEnabled(sql, "action_inbox"),
    "public.action_inbox must have `enable row level security`"
  );
});

check("action_inbox: has a named policy scoped to the owner", () => {
  const { found, names } = hasNamedPolicy(sql, "action_inbox");
  assertTrue(found, "public.action_inbox has no named policy");
  assertTrue(
    names.includes("action_inbox_own"),
    `expected policy "action_inbox_own", found: ${names.join(", ") || "(none)"}`
  );
});

// ---------------------------------------------------------------------------
// Evidence atoms — the smallest unit of behavioral evidence for a Relay
// session. Must only be readable by the session's own FDE or an active
// member of the mission's organization (see session_visible() in
// supabase/migrations/015_fde_evidence_math.sql). No client insert/update/
// delete policy is defined anywhere — all writes go through the server's
// admin (service role) client.
// ---------------------------------------------------------------------------
check("evidence_atoms: table defined", () => {
  assertTrue(tableIsDefined(sql, "evidence_atoms"), "public.evidence_atoms is not defined");
});

check("evidence_atoms: RLS enabled", () => {
  assertTrue(
    hasRlsEnabled(sql, "evidence_atoms"),
    "public.evidence_atoms must have `enable row level security`"
  );
});

check("evidence_atoms: has a named read policy gated by session_visible()", () => {
  const { found, names } = hasNamedPolicy(sql, "evidence_atoms");
  assertTrue(found, "public.evidence_atoms has no named policy");
  assertTrue(
    names.includes("evidence_atoms_read"),
    `expected policy "evidence_atoms_read", found: ${names.join(", ") || "(none)"}`
  );
  assertTrue(
    /create\s+policy\s+evidence_atoms_read[^;]*session_visible/is.test(sql),
    "evidence_atoms_read policy must gate on session_visible(), not a raw column comparison"
  );
});

check("evidence_atoms: no insert/update/delete policy for authenticated clients", () => {
  const forbidden = /create\s+policy\s+\w+\s+on\s+public\.evidence_atoms[^;]*for\s+(insert|update|delete)/is;
  assertTrue(
    !forbidden.test(sql),
    "evidence_atoms should only be written by the server's service-role client, never a client-facing policy"
  );
});

// ---------------------------------------------------------------------------
// Wider sweep — every other table introduced by 015_fde_evidence_math.sql.
// Session-scoped evidence surfaces should all share the same shape: RLS on,
// at least one named policy, no client write policy.
// ---------------------------------------------------------------------------
const EVIDENCE_SIBLING_TABLES = [
  "evaluation_runs",
  "evaluation_case_results",
  "receipt_versions",
  "receipt_access_events",
  "candidate_context_notes",
  "evidence_disputes",
  "technical_incidents",
  "product_feedback",
];

for (const table of EVIDENCE_SIBLING_TABLES) {
  check(`${table}: RLS enabled + named policy`, () => {
    assertTrue(hasRlsEnabled(sql, table), `public.${table} must have \`enable row level security\``);
    const { found } = hasNamedPolicy(sql, table);
    assertTrue(found, `public.${table} has no named policy`);
  });
}

// ---------------------------------------------------------------------------

if (failures > 0) {
  console.error(`\n${failures} RLS smoke check(s) failed.`);
  process.exit(1);
}
console.log("\nAll RLS smoke checks passed. RLS_SMOKE_OK");
console.log(
  "\nNOTE: this is a structural check of migration source only. It does not\n" +
    "prove RLS holds at runtime against a live database with two real tenants.\n" +
    "See docs/part2-final-report.md — known limitations."
);
