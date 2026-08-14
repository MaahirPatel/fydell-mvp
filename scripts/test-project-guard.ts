/**
 * The environment boundary is only worth having if it actually refuses.
 *
 * Run: npx tsx scripts/test-project-guard.ts
 */
import {
  assertProjectBinding,
  projectRefFromKey,
  projectRefFromUrl,
  PRODUCTION_PROJECT_REF,
  STAGING_PROJECT_REF,
  SupabaseProjectMismatchError,
} from "../src/lib/supabase/project-guard";

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

function expectRefusal(env: NodeJS.ProcessEnv, expectedFragment: string): void {
  let thrown: unknown = null;
  try {
    assertProjectBinding(env, {});
  } catch (err) {
    thrown = err;
  }
  assertTrue(thrown !== null, "expected the guard to refuse, but it allowed the binding");
  assertTrue(
    thrown instanceof SupabaseProjectMismatchError,
    `expected SupabaseProjectMismatchError, got ${String(thrown)}`
  );
  const message = (thrown as Error).message;
  assertTrue(
    message.includes(expectedFragment),
    `expected the refusal to mention "${expectedFragment}", got "${message}"`
  );
}

/** Test-only unsigned JWT with the shape Supabase legacy keys use. */
function fakeKey(ref: string, role: "anon" | "service_role"): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iss: "supabase", ref, role })).toString("base64url");
  return `${header}.${payload}.not-a-real-signature`;
}

const stagingUrl = `https://${STAGING_PROJECT_REF}.supabase.co`;
const productionUrl = `https://${PRODUCTION_PROJECT_REF}.supabase.co`;

check("parses the project ref out of a Supabase URL", () => {
  assertTrue(projectRefFromUrl(stagingUrl) === STAGING_PROJECT_REF, "staging ref should parse");
  assertTrue(projectRefFromUrl(undefined) === null, "undefined URL should yield null");
  assertTrue(projectRefFromUrl("not a url") === null, "garbage URL should yield null");
});

check("parses the project ref out of a legacy key", () => {
  assertTrue(
    projectRefFromKey(fakeKey(STAGING_PROJECT_REF, "anon")) === STAGING_PROJECT_REF,
    "anon key ref should parse"
  );
  assertTrue(projectRefFromKey("sb_secret_abc123") === null, "modern keys carry no ref");
  assertTrue(projectRefFromKey(undefined) === null, "missing key should yield null");
});

check("a matched staging binding is allowed", () => {
  const binding = assertProjectBinding(
    {
      NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: fakeKey(STAGING_PROJECT_REF, "anon"),
      SUPABASE_SERVICE_ROLE_KEY: fakeKey(STAGING_PROJECT_REF, "service_role"),
    } as NodeJS.ProcessEnv,
    { requireServiceKey: true }
  );
  assertTrue(binding.ref === STAGING_PROJECT_REF, "binding should resolve to staging");
  assertTrue(binding.serviceKeyBound, "service key should be recognised as bound");
  assertTrue(binding.anonKeyBound, "anon key should be recognised as bound");
});

check("a production service key against a staging URL is refused", () => {
  expectRefusal(
    {
      NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: fakeKey(STAGING_PROJECT_REF, "anon"),
      SUPABASE_SERVICE_ROLE_KEY: fakeKey(PRODUCTION_PROJECT_REF, "service_role"),
    } as NodeJS.ProcessEnv,
    "must be the same project"
  );
});

check("a staging key against a production URL is refused", () => {
  expectRefusal(
    {
      NEXT_PUBLIC_SUPABASE_URL: productionUrl,
      SUPABASE_SERVICE_ROLE_KEY: fakeKey(STAGING_PROJECT_REF, "service_role"),
    } as NodeJS.ProcessEnv,
    "production project"
  );
});

check("the production project is denied without the explicit opt-in", () => {
  expectRefusal(
    {
      NEXT_PUBLIC_SUPABASE_URL: productionUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: fakeKey(PRODUCTION_PROJECT_REF, "anon"),
      SUPABASE_SERVICE_ROLE_KEY: fakeKey(PRODUCTION_PROJECT_REF, "service_role"),
    } as NodeJS.ProcessEnv,
    PRODUCTION_PROJECT_REF
  );
});

check("the production project is allowed with the explicit opt-in", () => {
  const binding = assertProjectBinding(
    {
      NEXT_PUBLIC_SUPABASE_URL: productionUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: fakeKey(PRODUCTION_PROJECT_REF, "anon"),
      SUPABASE_SERVICE_ROLE_KEY: fakeKey(PRODUCTION_PROJECT_REF, "service_role"),
      FYDELL_ALLOW_PRODUCTION_DB: "true",
    } as NodeJS.ProcessEnv,
    { requireServiceKey: true }
  );
  assertTrue(binding.ref === PRODUCTION_PROJECT_REF, "opted-in production should be allowed");
});

check("a mismatched anon key is refused", () => {
  expectRefusal(
    {
      NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: fakeKey(PRODUCTION_PROJECT_REF, "anon"),
    } as NodeJS.ProcessEnv,
    "Anon key belongs to project"
  );
});

check("a service-role key in a NEXT_PUBLIC_ variable is refused", () => {
  expectRefusal(
    {
      NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: fakeKey(STAGING_PROJECT_REF, "service_role"),
    } as NodeJS.ProcessEnv,
    "sent to the browser"
  );
});

check("refusals never contain the key material", () => {
  const serviceKey = fakeKey(PRODUCTION_PROJECT_REF, "service_role");
  try {
    assertProjectBinding(
      {
        NEXT_PUBLIC_SUPABASE_URL: stagingUrl,
        SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      } as NodeJS.ProcessEnv,
      {}
    );
    throw new Error("expected a refusal");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    assertTrue(!message.includes(serviceKey), "the refusal must not echo the key");
    assertTrue(!message.includes(serviceKey.split(".")[1]), "the refusal must not echo the payload");
  }
});

check("a missing URL is refused", () => {
  expectRefusal({} as NodeJS.ProcessEnv, "Supabase URL is missing");
});

if (failures > 0) {
  console.error(`\n${failures} project guard check(s) failed.`);
  process.exit(1);
}
console.log("\nAll project guard checks passed. PROJECT_GUARD_OK");
