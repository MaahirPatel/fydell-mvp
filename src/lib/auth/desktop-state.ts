/**
 * Validation for the desktop auth `state` parameter.
 *
 * The desktop app generates an opaque random `state` (a UUID v4) and opens
 * `{platform}/login?desktop=1&state=<state>`. The web app echoes the state
 * back through the authorize redirect and the `fydell://auth/callback` deep
 * link; the desktop validates it with a constant-time compare before
 * exchanging the code. This module is intentionally free of `server-only` so
 * the login page (a client component) can use the same validator.
 */

const STATE_RE = /^[A-Za-z0-9_-]{1,256}$/;

/**
 * Returns true for a well-formed opaque state value: 1-256 chars of
 * URL-safe unreserved characters. Rejects empty, oversized, and
 * control/`<>"'`-containing values so the state can be echoed into a
 * redirect Location header without injection risk.
 */
export function isValidDesktopState(state: unknown): state is string {
  return typeof state === "string" && STATE_RE.test(state);
}

/**
 * PKCE (RFC 7636). Only the S256 method is accepted. A challenge is the
 * unpadded base64url SHA-256 of the verifier, so it is exactly 43 chars; a
 * verifier is 43-128 chars of the unreserved set.
 */
export const PKCE_METHOD = "S256";
const CHALLENGE_RE = /^[A-Za-z0-9_-]{43}$/;
const VERIFIER_RE = /^[A-Za-z0-9._~-]{43,128}$/;

export function isValidPkceChallenge(challenge: unknown): challenge is string {
  return typeof challenge === "string" && CHALLENGE_RE.test(challenge);
}

export function isValidPkceVerifier(verifier: unknown): verifier is string {
  return typeof verifier === "string" && VERIFIER_RE.test(verifier);
}

/** The authorize URL path, carrying the PKCE challenge when the desktop sent one. */
export function desktopAuthorizePath(state: string, codeChallenge: string | null): string {
  const params = new URLSearchParams({ state });
  if (codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", PKCE_METHOD);
  }
  return `/auth/desktop/authorize?${params.toString()}`;
}
