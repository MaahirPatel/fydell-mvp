/**
 * Test-only module loader hooks for the sim chat API tests.
 *
 * Redirects server modules that need Supabase to in-memory stubs at RESOLVE
 * time, but delegates the stub file URL back through the remaining hooks so
 * tsx itself resolves (and tracks/transforms) the stub TypeScript:
 *
 *   @/lib/simulations/db -> scripts/stubs/sim-db-stub.ts
 *   @/lib/simulations/auth -> scripts/stubs/sim-auth-stub.ts
 *   @/lib/supabase/admin -> scripts/stubs/sim-supabase-admin-stub.ts
 */
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const stubUrl = (f) => pathToFileURL(path.join(dir, f)).href;

const REDIRECTS = {
  "@/lib/simulations/db": "sim-db-stub.ts",
  "@/lib/simulations/auth": "sim-auth-stub.ts",
  "@/lib/supabase/admin": "sim-supabase-admin-stub.ts",
};

const TAILS = {
  "/src/lib/simulations/db.ts": "sim-db-stub.ts",
  "/src/lib/simulations/auth.ts": "sim-auth-stub.ts",
  "/src/lib/supabase/admin.ts": "sim-supabase-admin-stub.ts",
};

export async function resolve(specifier, context, next) {
  const direct = REDIRECTS[specifier];
  if (direct) return next(stubUrl(direct), context);
  const res = await next(specifier, context);
  if (typeof res.url === "string") {
    for (const [tail, file] of Object.entries(TAILS)) {
      if (res.url.endsWith(tail)) return next(stubUrl(file), context);
    }
  }
  return res;
}
