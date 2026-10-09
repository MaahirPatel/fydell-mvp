import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseAuthClient } from "@/lib/supabase";

export interface DesktopSession {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
}

/**
 * A new Supabase session for the desktop app, separate from the browser's.
 *
 * Supabase rotates refresh tokens and, when a token older than the current
 * one's parent is presented, revokes the whole session. If the desktop held
 * the browser's refresh token, whichever side refreshed second after the
 * other had refreshed twice would sign both out. A server-side magic-link
 * verification gives the desktop its own session; no email is sent.
 *
 * Returns null when Supabase cannot issue the session or it belongs to a
 * different user than the one signed in.
 */
export async function mintDesktopSession(userId: string, email: string): Promise<DesktopSession | null> {
  try {
    const admin = createAdminSupabaseClient();
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) return null;
    const { data, error } = await getSupabaseAuthClient().auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
    const session = data?.session;
    if (error || !session?.access_token || !session.refresh_token || data.user?.id !== userId) return null;
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    };
  } catch {
    return null;
  }
}
