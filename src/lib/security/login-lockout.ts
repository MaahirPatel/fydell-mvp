import "server-only";
import { createHmac } from "node:crypto";
import type { NextResponse } from "next/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { LOGIN_FAILURES, loginLockout, recordLoginFailure, tooManyRequests } from "./route-limits";

/**
 * Sign-in lockout shared across server instances.
 *
 * Failures are counted both in-process (route-limits.ts) and in
 * `auth_login_failures` (migration 074), keyed by an HMAC of each identity
 * so raw IPs and emails are never stored. Either counter reaching the limit
 * locks the identity. If the database is unreachable, the in-process counter
 * still applies, so an outage degrades to per-instance limits rather than
 * none, and sign-in keeps working.
 */

const LOCKED_MESSAGE = "Too many failed sign-in attempts. Try again later.";

function durableKeys(identities: string[]): string[] | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !isSupabaseConfigured()) return null;
  return identities.map((identity) =>
    createHmac("sha256", secret).update(`login-failure:${identity.trim().toLowerCase()}`).digest("hex"),
  );
}

export async function checkLoginLockout(identities: string[], now: number = Date.now()): Promise<NextResponse | null> {
  const local = loginLockout(identities, now);
  if (local) return local;

  const keys = durableKeys(identities);
  if (!keys) return null;
  try {
    const { data, error } = await createAdminSupabaseClient()
      .from("auth_login_failures")
      .select("reset_at")
      .in("key_hash", keys)
      .gte("failures", LOGIN_FAILURES.limit)
      .gt("reset_at", new Date(now).toISOString());
    if (error || !data || data.length === 0) return null;
    const latest = Math.max(...data.map((row) => Date.parse(String(row.reset_at))));
    if (!Number.isFinite(latest)) return null;
    return tooManyRequests(Math.max(1, Math.ceil((latest - now) / 1000)), LOCKED_MESSAGE);
  } catch {
    return null;
  }
}

export async function recordFailedLogin(identities: string[], now: number = Date.now()): Promise<void> {
  recordLoginFailure(identities, now);

  const keys = durableKeys(identities);
  if (!keys) return;
  try {
    await createAdminSupabaseClient().rpc("record_auth_login_failures", {
      p_keys: keys,
      p_window_seconds: Math.round(LOGIN_FAILURES.windowMs / 1000),
    });
  } catch {
    /* the in-process counter above still applies */
  }
}
