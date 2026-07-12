/**
 * Verify pilot lifecycle tables exist after migration 010.
 * Usage: npx tsx scripts/verify-migration-state.ts
 */
import { createClient } from "@supabase/supabase-js";

const REQUIRED = [
  "employer_onboarding",
  "hiring_roles",
  "simulation_templates",
  "pilot_candidates",
  "candidate_invitations",
  "simulation_assignments",
  "pilot_simulation_sessions",
  "pilot_session_submissions",
  "evidence_reports_v2",
  "employer_decisions",
  "hiring_outcomes",
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("Missing Supabase URL or service role key");
    process.exit(1);
  }
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let failed = 0;
  for (const table of REQUIRED) {
    const { error } = await admin.from(table).select("id", { count: "exact", head: true });
    if (error) {
      console.error(`FAIL ${table}: ${error.message}`);
      failed += 1;
    } else {
      console.log(`OK   ${table}`);
    }
  }

  const counts = ["pilot_requests", "organizations", "profiles"] as const;
  for (const table of counts) {
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) console.warn(`WARN ${table}: ${error.message}`);
    else console.log(`COUNT ${table}=${count ?? 0}`);
  }

  if (failed) {
    console.error(`\n${failed} required tables missing. Apply supabase/migrations/010_pilot_lifecycle.sql`);
    process.exit(1);
  }
  console.log("\nMigration verification passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
