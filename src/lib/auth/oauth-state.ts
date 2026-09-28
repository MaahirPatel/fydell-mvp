/**
 * Accounts chunk — GitHub account-linking OAuth state protection (AUTH-02).
 *
 * Linking a GitHub account must bind to the *authenticated intended user*.
 * The OAuth `state` parameter is a signed, expiring, single-purpose token:
 *
 * - payload: { uid, redirect, iat, nonce } — bound to the signed-in user id
 * - signature: HMAC-SHA256 over the payload with a server secret
 * - lifetime: 10 minutes
 * - redirect: must be a relative path on an allowlist of post-link
 *   destinations (open redirects are rejected)
 *
 * Validation re-checks the signature, the expiry, and — critically — that
 * the `uid` inside the state matches the *currently authenticated* user.
 * A state minted for user A presented in user B's session is rejected, and
 * state alone never links anything: the link step requires the authenticated
 * session independently.
 *
 * Email-based account takeover prevention: the link is keyed by the
 * authenticated user id, never by an email claim from the OAuth provider.
 * A provider profile whose email differs from (or merely resembles) the
 * Fydell account email does not move the link to a different account.
 *
 * The live GitHub OAuth round-trip itself (redirect to github.com, code
 * exchange) requires real credentials and a browser and is NOT covered
 * here — see NEEDS-LIVE in the progress notes.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60_000;

export interface OAuthStatePayload {
  /** Authenticated Fydell user id this state was minted for. */
  uid: string;
  /** Post-link destination; must pass the allowlist. */
  redirect: string;
  iat: number;
  nonce: string;
}

export type OAuthStateError =
  | "malformed"
  | "bad_signature"
  | "expired"
  | "user_mismatch"
  | "bad_redirect";

export type OAuthStateResult =
  | { ok: true; redirect: string }
  | { ok: false; code: OAuthStateError; message: string };

function fail(code: OAuthStateError, message: string): OAuthStateResult {
  return { ok: false, code, message };
}

function b64urlEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function b64urlDecode(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

function sign(secret: string, payloadB64: string): string {
  return createHmac("sha256", secret).update(payloadB64, "utf8").digest("base64url");
}

/**
 * Allowlist for post-link redirects. Relative paths only; anything else —
 * absolute URLs, protocol-relative, javascript:, or paths outside the list —
 * is rejected to prevent open-redirect abuse.
 */
const ALLOWED_REDIRECTS = new Set([
  "/settings/integrations",
  "/passport",
  "/profile",
  "/dashboard",
]);

export function isAllowedRedirect(redirect: string): boolean {
  if (!redirect.startsWith("/")) return false;
  if (redirect.startsWith("//")) return false;
  if (/[\\]/.test(redirect)) return false;
  const path = redirect.split("?")[0].split("#")[0];
  return ALLOWED_REDIRECTS.has(path);
}

/** Mint a state value for the currently authenticated user. */
export function createOAuthState(
  secret: string,
  authenticatedUserId: string,
  redirect: string,
  nowMs: number = Date.now()
): { ok: true; state: string } | { ok: false; code: "bad_redirect" | "not_authenticated" } {
  if (!authenticatedUserId) return { ok: false, code: "not_authenticated" };
  if (!isAllowedRedirect(redirect)) return { ok: false, code: "bad_redirect" };
  const payload: OAuthStatePayload = {
    uid: authenticatedUserId,
    redirect,
    iat: nowMs,
    nonce: randomBytes(16).toString("hex"),
  };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  return { ok: true, state: `${payloadB64}.${sign(secret, payloadB64)}` };
}

/**
 * Validate a returned state against the *currently authenticated* user.
 * Every failure mode is explicit; there is no fallback that links anyway.
 */
export function validateOAuthState(
  secret: string,
  authenticatedUserId: string,
  state: string,
  nowMs: number = Date.now()
): OAuthStateResult {
  if (!authenticatedUserId) return fail("user_mismatch", "no authenticated user for this link");
  const parts = state.split(".");
  if (parts.length !== 2) return fail("malformed", "state is malformed");
  const [payloadB64, sig] = parts;

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64)) as OAuthStatePayload;
  } catch {
    return fail("malformed", "state payload is not valid JSON");
  }
  if (!payload || typeof payload.uid !== "string" || typeof payload.iat !== "number") {
    return fail("malformed", "state payload is missing required fields");
  }

  const expected = sign(secret, payloadB64);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return fail("bad_signature", "state signature is invalid");
  }
  if (nowMs - payload.iat > STATE_TTL_MS || payload.iat > nowMs + 60_000) {
    return fail("expired", "state has expired");
  }
  // Bound to the intended user: a state minted for someone else — or replayed
  // into a different session — cannot link this account.
  if (payload.uid !== authenticatedUserId) {
    return fail("user_mismatch", "state was issued for a different user");
  }
  if (!isAllowedRedirect(payload.redirect)) {
    return fail("bad_redirect", "redirect destination is not allowed");
  }
  return { ok: true, redirect: payload.redirect };
}

/**
 * Decide whether a provider profile may be linked to the authenticated
 * account. The link is keyed by user id, never by email: a provider email
 * that matches a *different* Fydell account does not redirect the link.
 * Returns the account the link applies to (always the authenticated user)
 * or a refusal.
 */
export function authorizeAccountLink(
  authenticatedUserId: string,
  providerAccountId: string,
  alreadyLinkedToUserId: string | null
): { ok: true; linkToUserId: string } | { ok: false; code: "not_authenticated" | "already_linked_elsewhere" } {
  if (!authenticatedUserId) return { ok: false, code: "not_authenticated" };
  if (alreadyLinkedToUserId && alreadyLinkedToUserId !== authenticatedUserId) {
    return { ok: false, code: "already_linked_elsewhere" };
  }
  void providerAccountId;
  return { ok: true, linkToUserId: authenticatedUserId };
}
