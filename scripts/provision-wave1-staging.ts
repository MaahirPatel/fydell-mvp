/**
 * Provision fydell-dev only. Refuses the production project.
 *
 * Applies local migrations 015–022, then seeds DA-01.
 *
 *   npx tsx scripts/provision-wave1-staging.ts
 *
 * Requires the Supabase CLI to be logged in (`npx supabase login`) and
 * linked to fydell-dev, or SUPABASE_DB_URL for that project only.
 */
import { spawnSync } from "child_process";
import { resolve } from "path";

const STAGING_REF = "btbmvrvynnrhapjdkunz";
const PRODUCTION_REF = "qtrhwrcxthtqvkeerptp";
const MIGRATIONS = [
  "015_fde_evidence_math.sql",
  "016_attempt_kind.sql",
  "017_workspace_engine.sql",
  "018_shadow_lock.sql",
  "019_applied_roles_simulations.sql",
  "020_micro_sims_feedback.sql",
  "021_october_pilot_cohort.sql",
  "022_close_answer_key_reads.sql",
];

function run(cmd: string, args: string[]) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with ${result.status}`);
  }
}

function main() {
  const ref = process.env.WAVE1_STAGING_REF || STAGING_REF;
  if (ref === PRODUCTION_REF) {
    throw new Error("Refusing to provision production");
  }
  console.log(`Provisioning Wave 1 staging on ${ref}`);
  console.log("Migrations to apply (additive, fydell-dev only):");
  for (const file of MIGRATIONS) console.log(`  - ${file}`);

  if (!process.env.WAVE1_APPLY_MIGRATIONS) {
    console.log(`
Dry run. To apply:

  npx supabase link --project-ref ${ref}
  npx supabase db push --linked

Then:

  npx tsx scripts/seed-da01.ts

Set WAVE1_APPLY_MIGRATIONS=1 only after confirming this is fydell-dev.
`);
    return;
  }

  run("npx", ["supabase", "link", "--project-ref", ref]);
  run("npx", ["supabase", "db", "push", "--linked"]);
  run("npx", ["tsx", resolve("scripts/seed-da01.ts")]);
}

main();
