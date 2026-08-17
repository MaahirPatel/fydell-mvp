/**
 * The workspace went dark in production because a credential check that could
 * throw sat behind a check that only asked whether the variables were set.
 * These tests hold that seam: the status call must classify every case without
 * throwing, and the redirect table must not swallow a live route.
 *
 * Run: npx tsx scripts/test-workspace-availability.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { PRODUCTION_PROJECT_REF, STAGING_PROJECT_REF } from "../src/lib/supabase/project-guard";

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

/** A legacy-format key so the guard can read a project ref out of it. */
function serviceKeyFor(ref: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ ref, role: "service_role" })).toString("base64url");
  return `${header}.${payload}.signature`;
}

/**
 * The status helper reads process.env at call time and memoises a built
 * client, so each case runs in a fresh module instance with a swapped env.
 */
async function statusUnder(env: Record<string, string | undefined>) {
  const saved = { ...process.env };
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("NEXT_PUBLIC_SUPABASE") || key.startsWith("SUPABASE") ||
        key === "FYDELL_ALLOW_PRODUCTION_DB") {
      delete process.env[key];
    }
  }
  Object.assign(process.env, env);
  try {
    const mod = await import(`../src/lib/supabase?case=${Math.random()}`);
    return mod.supabaseAdminStatus() as { status: string; detail?: string };
  } finally {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, saved);
  }
}

async function main(): Promise<void> {
  const staging = {
    NEXT_PUBLIC_SUPABASE_URL: `https://${STAGING_PROJECT_REF}.supabase.co`,
    SUPABASE_SERVICE_ROLE_KEY: serviceKeyFor(STAGING_PROJECT_REF),
  };

  const cases: [string, Record<string, string | undefined>, string][] = [
    ["no credentials at all is missing_credentials", {}, "missing_credentials"],
    [
      "url without a service key is missing_credentials",
      { NEXT_PUBLIC_SUPABASE_URL: staging.NEXT_PUBLIC_SUPABASE_URL },
      "missing_credentials",
    ],
    [
      "production without the opt-in is project_refused, not ready",
      {
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
        SUPABASE_SERVICE_ROLE_KEY: serviceKeyFor(PRODUCTION_PROJECT_REF),
      },
      "project_refused",
    ],
    [
      "production with the opt-in is ready",
      {
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
        SUPABASE_SERVICE_ROLE_KEY: serviceKeyFor(PRODUCTION_PROJECT_REF),
        FYDELL_ALLOW_PRODUCTION_DB: "true",
      },
      "ready",
    ],
    ["staging credentials are ready", staging, "ready"],
    [
      "a key from another project is project_refused",
      {
        NEXT_PUBLIC_SUPABASE_URL: staging.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: serviceKeyFor(PRODUCTION_PROJECT_REF),
      },
      "project_refused",
    ],
  ];

  for (const [name, env, expected] of cases) {
    let actual: { status: string; detail?: string } | null = null;
    let threw: unknown = null;
    try {
      actual = await statusUnder(env);
    } catch (err) {
      threw = err;
    }
    check(name, () => {
      assertTrue(
        threw === null,
        `the status call must never throw; it threw ${String(threw)}`
      );
      assertTrue(
        actual?.status === expected,
        `expected status ${expected}, got ${actual?.status}`
      );
      if (expected !== "ready") {
        assertTrue(
          typeof actual?.detail === "string" && actual.detail.length > 0,
          "a failure must carry an operator-facing detail for the server log"
        );
      }
    });
  }

  const nextConfig = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

  check("the onboarding catch-all does not swallow /onboarding/employer", () => {
    assertTrue(
      !nextConfig.includes('source: "/onboarding/:path*"'),
      "/onboarding/:path* redirects /onboarding/employer away from the live " +
        "workspace-naming route; exclude employer from the catch-all"
    );
    assertTrue(
      nextConfig.includes("(?!employer$)"),
      "expected the onboarding redirect to exclude the employer segment"
    );
  });

  check("the workspace unavailable surface offers a way out", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/employer/WorkspaceUnavailable.tsx"),
      "utf8"
    );
    for (const required of ["Try again", "Sign in again", "reference"]) {
      assertTrue(
        source.toLowerCase().includes(required.toLowerCase()),
        `the unavailable state must offer "${required}"`
      );
    }
  });

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll workspace availability checks passed.");
}

void main();
