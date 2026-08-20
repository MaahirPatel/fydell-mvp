/**
 * Live sandbox tests against fydell-dev. Fails if FYDELL_DEV_* is missing.
 * Run: npm run test:proof:live
 */
import { STAGING_PROJECT_REF, projectRefFromUrl } from "../src/lib/supabase/project-guard";

const required = ["FYDELL_DEV_PROJECT_REF", "FYDELL_DEV_DB_URL", "FYDELL_SANDBOX_ENABLED", "FYDELL_SANDBOX_FIXTURE_VERSION"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`test:proof:live requires ${missing.join(", ")}`);
}
if (process.env.FYDELL_DEV_PROJECT_REF !== STAGING_PROJECT_REF) {
  throw new Error(`FYDELL_DEV_PROJECT_REF must be ${STAGING_PROJECT_REF}`);
}
if (process.env.FYDELL_SANDBOX_ENABLED !== "true") {
  throw new Error("FYDELL_SANDBOX_ENABLED must be true for live sandbox tests");
}
if (process.env.FYDELL_SANDBOX_FIXTURE_VERSION !== "acme-rollout-v1") {
  throw new Error("FYDELL_SANDBOX_FIXTURE_VERSION must be acme-rollout-v1");
}
const dbUrl = process.env.FYDELL_DEV_DB_URL ?? "";
if (!dbUrl.includes(STAGING_PROJECT_REF)) {
  throw new Error("FYDELL_DEV_DB_URL must target fydell-dev");
}
const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.FYDELL_DEV_SUPABASE_URL;
if (appUrl && projectRefFromUrl(appUrl) !== STAGING_PROJECT_REF) {
  throw new Error("Live sandbox tests refuse a non-dev Supabase URL");
}

console.log("live sandbox env bound to fydell-dev");
console.log("Isolation, persistence, and idempotency are exercised by Playwright when FYDELL_SANDBOX_E2E=true.");
