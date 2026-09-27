/**
 * Operator-run catalog seed for the disposable development sandbox only.
 * Never invoked by visitor traffic.
 *
 * ALLOW_DEV_SEED=true npx tsx scripts/seed-sandbox-applied-ai.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  APPLIED_AI_ROLE_ID,
  APPLIED_AI_ROLE_SLUG,
  APPLIED_AI_VERSION_ID,
  APPLIED_AI_VERSION_KEY,
} from "../src/lib/sim-engine/proof/sandbox/fixture";

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed production");
  }
  if (process.env.ALLOW_DEV_SEED !== "true") {
    throw new Error("Set ALLOW_DEV_SEED=true to run the Applied AI sandbox catalog seed");
  }
  const url = process.env.FYDELL_SANDBOX_SUPABASE_URL;
  const key = process.env.FYDELL_SANDBOX_SUPABASE_SERVICE_ROLE_KEY;
  const expectedRef = process.env.FYDELL_DEV_PROJECT_REF;
  if (!url || !key || !expectedRef) {
    throw new Error("Dedicated FYDELL_SANDBOX_* credentials and FYDELL_DEV_PROJECT_REF are required");
  }
  if (!url.includes(`//${expectedRef}.supabase.co`)) {
    throw new Error("Refusing to seed: sandbox URL does not match FYDELL_DEV_PROJECT_REF");
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: roleError } = await admin.from("proof_roles").upsert(
    {
      id: APPLIED_AI_ROLE_ID,
      slug: APPLIED_AI_ROLE_SLUG,
      title: "Applied AI Engineer",
      description: "Diagnoses, evaluates, hardens, and defends production AI workflows.",
    },
    { onConflict: "id" },
  );
  if (roleError) throw roleError;

  const { error: versionError } = await admin.from("proof_simulation_versions").upsert(
    {
      id: APPLIED_AI_VERSION_ID,
      role_id: APPLIED_AI_ROLE_ID,
      version_key: APPLIED_AI_VERSION_KEY,
      title: "Harden an enterprise AI workflow",
      scenario: {
        fixtureVersion: "aai-workflow-hardening-fixture-v2",
        runtime: "deterministic-synthetic",
        persistence: "isolated-development-proof-graph",
      },
      rubric_version: "aai-proof-v1",
      prompt_version: "aai-structured-analysis-v1",
      engine_version: "proof-sandbox-v2",
      seed: "aai-workflow-hardening-v1",
      status: "published",
    },
    { onConflict: "id" },
  );
  if (versionError) throw versionError;
  console.log("Applied AI sandbox catalog provisioned in the disposable development project.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
