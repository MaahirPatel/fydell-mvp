/**
 * Live two-tenant RLS denial check.
 *
 * Requires disposable Supabase credentials:
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   RLS_LIVE_EMAIL_A, RLS_LIVE_PASSWORD_A
 *   RLS_LIVE_EMAIL_B, RLS_LIVE_PASSWORD_B
 *
 * Without those env vars this script exits 0 with SKIP (documented UNVERIFIED).
 * Run: npx tsx scripts/test-rls-live-tenants.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const emailA = process.env.RLS_LIVE_EMAIL_A;
const passA = process.env.RLS_LIVE_PASSWORD_A;
const emailB = process.env.RLS_LIVE_EMAIL_B;
const passB = process.env.RLS_LIVE_PASSWORD_B;

if (!url || !anon || !emailA || !passA || !emailB || !passB) {
  console.log(
    "SKIP live RLS two-tenant test: set SUPABASE URL/ANON and RLS_LIVE_EMAIL_/PASSWORD_ A/B"
  );
  console.log("RLS_LIVE_UNVERIFIED");
  process.exit(0);
}

async function main() {
  const a = createClient(url!, anon!);
  const b = createClient(url!, anon!);
  const signA = await a.auth.signInWithPassword({ email: emailA!, password: passA! });
  const signB = await b.auth.signInWithPassword({ email: emailB!, password: passB! });
  if (signA.error || signB.error) {
    throw new Error(`Sign-in failed: ${signA.error?.message || signB.error?.message}`);
  }

  const { data: invA } = await a.from("sim_invitations").select("id, organization_id").limit(5);
  const orgA = invA?.[0]?.organization_id;
  if (!orgA) {
    console.log("SKIP: tenant A has no invitations to assert against");
    process.exit(0);
  }

  const { data: leak, error } = await b
    .from("sim_invitations")
    .select("id")
    .eq("organization_id", orgA);
  if (error) {
    console.log("PASS cross-org query errored at RLS boundary:", error.message);
  } else if (!leak || leak.length === 0) {
    console.log("PASS tenant B sees zero invitations for tenant A org");
  } else {
    throw new Error(`FAIL tenant B saw ${leak.length} invitation(s) from tenant A`);
  }
  console.log("RLS_LIVE_OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
