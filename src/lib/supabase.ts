import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service role key. This bypasses RLS,
// so it must NEVER be imported into client components. All DB access flows
// through Route Handlers / server components.
//
// Env-var reconciliation: the original Fydell code used SUPABASE_URL /
// SUPABASE_SERVICE_KEY. The MVP backend follows Supabase's standard naming
// (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY). We accept BOTH so old and new code interoperate.

let cached: SupabaseClient | null = null;

export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function supabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function supabaseServiceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
}

/** True when the service-role admin client can be constructed. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceKey());
}

/** True when the public anon client (used for Supabase Auth) can be built. */
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = supabaseUrl();
  const serviceKey = supabaseServiceKey();

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY (or the legacy SUPABASE_URL / SUPABASE_SERVICE_KEY) in .env.local."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}

/**
 * Anon-key client used purely for Supabase Auth (signUp / signInWithPassword)
 * on the server. We do not persist its session; on success we mint our own
 * httpOnly cookie (see lib/mvp/session.ts), matching the existing cookie
 * convention used elsewhere in the app.
 */
export function getSupabaseAuthClient(): SupabaseClient {
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  if (!url || !anon) {
    throw new Error(
      "Missing Supabase auth credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
