import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSandboxCredentials } from "./credentials";

let cached: SupabaseClient | null = null;

/** Service-role client bound to fydell-dev. Server-only; never reaches the browser. */
export function sandboxAdmin(): SupabaseClient {
  if (cached) return cached;
  const { url, serviceKey } = resolveSandboxCredentials();
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
