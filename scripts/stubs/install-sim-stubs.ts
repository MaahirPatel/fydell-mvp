/**
 * Test-only: redirects server modules that need Supabase to in-memory stubs.
 *
 * Uses the synchronous `registerHooks` API because tsx compiles these scripts
 * to CommonJS, and CommonJS `require` never consults the async hooks that
 * `module.register` installs.
 */
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const STUBS: ReadonlyArray<{ specifier: string; tail: string; file: string }> = [
  { specifier: "@/lib/simulations/db", tail: "/src/lib/simulations/db.ts", file: "sim-db-stub.ts" },
  { specifier: "@/lib/simulations/auth", tail: "/src/lib/simulations/auth.ts", file: "sim-auth-stub.ts" },
  { specifier: "@/lib/supabase/admin", tail: "/src/lib/supabase/admin.ts", file: "sim-supabase-admin-stub.ts" },
];

export function installSimStubs(): void {
  const stubUrl = (file: string) => pathToFileURL(path.join(process.cwd(), "scripts", "stubs", file)).href;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      const direct = STUBS.find((s) => s.specifier === specifier);
      if (direct) return nextResolve(stubUrl(direct.file), context);
      const resolved = nextResolve(specifier, context);
      const match = STUBS.find((s) => resolved.url.endsWith(s.tail));
      return match ? nextResolve(stubUrl(match.file), context) : resolved;
    },
  });
}
