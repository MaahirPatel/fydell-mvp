import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidDesktopState, isValidPkceChallenge, PKCE_METHOD } from "@/lib/auth/desktop-state";
import { mintDesktopAuthCode } from "@/lib/auth/desktop-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Optional PKCE challenge. Returns null for the legacy flow (no PKCE params),
 * unless DESKTOP_AUTH_REQUIRE_PKCE=1, in which case a missing challenge is
 * invalid. Only S256 is accepted; an absent method means "plain" per
 * RFC 7636 and is refused.
 */
function readPkceChallenge(params: URLSearchParams): string | null | "invalid" {
  const challenge = params.get("code_challenge");
  const method = params.get("code_challenge_method");
  if (challenge === null && method === null) {
    return process.env.DESKTOP_AUTH_REQUIRE_PKCE === "1" ? "invalid" : null;
  }
  if (method !== PKCE_METHOD || !isValidPkceChallenge(challenge)) return "invalid";
  return challenge;
}

/**
 * W1 - desktop sign-in callback.
 *
 * The desktop app opens the system browser at
 * `{platform}/login?desktop=1&state=<opaque>`; after sign-in the login form
 * sends the candidate here. This route mints a single-use, 5-minute
 * authorization code bound to (user, state) and 302-redirects to the
 * desktop's deep link:
 *
 *   fydell://auth/callback?code=<code>&state=<state>
 *
 * The desktop trades the code at POST /api/auth/desktop/exchange for the
 * Supabase session. When the desktop opens the flow with
 * `code_challenge=<S256>&code_challenge_method=S256`, the code is bound to
 * that challenge and the exchange must send the matching `code_verifier`.
 * The deep-link target is built as a raw 302 (not
 * NextResponse.redirect) so no framework URL validation can reject the
 * custom scheme.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "";
  const challenge = readPkceChallenge(url.searchParams);

  if (!isValidDesktopState(state) || challenge === "invalid") {
    return NextResponse.redirect(new URL("/auth/link-invalid", url.origin));
  }

  const user = await requireUser();
  if (!user) {
    // Not signed in yet: route through the login page, preserving the
    // desktop flow (the login form honors ?desktop=1&state= after sign-in).
    const login = new URL("/login", url.origin);
    login.searchParams.set("desktop", "1");
    login.searchParams.set("state", state);
    if (challenge) {
      login.searchParams.set("code_challenge", challenge);
      login.searchParams.set("code_challenge_method", PKCE_METHOD);
    }
    return NextResponse.redirect(login);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token || !session?.refresh_token) {
    // Authenticated but no usable session to hand over; fail closed.
    return NextResponse.json({ error: "session_unavailable" }, { status: 401 });
  }

  const code = mintDesktopAuthCode(
    {
      userId: user.id,
      email: user.email,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      state,
    },
    undefined,
    challenge,
  );

  const target =
    `fydell://auth/callback?code=${encodeURIComponent(code)}` +
    `&state=${encodeURIComponent(state)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: target },
  });
}
