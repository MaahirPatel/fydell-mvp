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
