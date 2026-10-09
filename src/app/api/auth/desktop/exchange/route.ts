import { NextResponse } from "next/server";
import { redeemDesktopAuthCode } from "@/lib/auth/desktop-codes";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * W1 - exchange a single-use desktop authorization code for the Supabase
 * session.
 *
 *   POST /api/auth/desktop/exchange   { "code": "<one-time>", "code_verifier"?: "<pkce>" }
 *   → 200 { access_token, refresh_token, expires_at, user: { id, email } }
 *
 * `expires_at` is Unix seconds, matching the desktop's `exchange_code`
 * contract. An optional `state` may be supplied and is checked against the
 * state the code was bound to at mint time. When the code was minted with a
 * PKCE challenge, `code_verifier` is required and must hash (S256) to it;
 * a verifier sent for a code minted without a challenge is refused.
 *
 * Failure responses are deliberately uniform (`invalid_code`, 401) across
 * unknown, reused, expired, state- and verifier-mismatched codes so the endpoint does
 * not reveal which codes exist. The endpoint is rate-limited per IP; the
 * limiter is in-process per instance (see src/lib/security/rate-limit.ts).
 */
export async function POST(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`desktop-exchange:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const code =
    body && typeof body === "object" && "code" in body && typeof body.code === "string"
      ? body.code
      : "";
  const state =
    body && typeof body === "object" && "state" in body && typeof body.state === "string"
      ? (body.state as string)
      : undefined;
  const codeVerifier =
    body && typeof body === "object" && "code_verifier" in body && typeof body.code_verifier === "string"
      ? (body.code_verifier as string)
      : undefined;

  if (!code || code.length > 4096) {
    return NextResponse.json({ error: "code_required" }, { status: 400 });
  }

  const result = redeemDesktopAuthCode(code, state, undefined, codeVerifier);
  if (!result.ok) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  const rec = result.record;
  return NextResponse.json({
    access_token: rec.accessToken,
    refresh_token: rec.refreshToken,
    expires_at: rec.expiresAt,
    user: { id: rec.userId, email: rec.email },
  });
}
