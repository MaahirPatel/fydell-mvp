/**
 * The single authority for validating a `?next=` destination.
 *
 * This replaced three divergent implementations: `isSafeAppNext` in
 * lib/marketing/ctas.ts, `safeReturnPath` in components/platform/AuthForm.tsx,
 * and a materially weaker `safeNext` in app/auth/callback/route.ts that accepted
 * any string beginning with a single slash.
 *
 * Only same-origin internal application destinations are accepted. Everything
 * else falls back to a known-good default.
 */

/** Prefixes a signed-in or signing-in user may legitimately be returned to. */
const ALLOWED_PREFIXES = [
  "/app/",
  "/invite/",
  "/sim/",
  "/simulations",
  "/onboarding/",
  "/record/",
  "/results/",
  "/account/",
] as const;

/** Exact paths that are allowed but have no trailing segment. */
const ALLOWED_EXACT = ["/app", "/simulations"] as const;

export const DEFAULT_APP_DESTINATION = "/app/employer";

/**
 * Decode repeatedly so that a payload such as `%252f%252fevil.com` is inspected
 * in its fully decoded form rather than only at the surface.
 */
function fullyDecode(value: string): string | null {
  let current = value;
  for (let i = 0; i < 3; i += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      // Malformed percent-encoding is never a destination we produced.
      return null;
    }
    if (decoded === current) return current;
    current = decoded;
  }
  return current;
}

function isRejected(path: string): boolean {
  // Must be a root-relative path.
  if (!path.startsWith("/")) return true;
  // Protocol-relative: //evil.com, and the backslash variants browsers normalise.
  if (path.startsWith("//") || path.startsWith("/\\") || path.startsWith("/%")) return true;
  // Backslashes are normalised to forward slashes by several browsers.
  if (path.includes("\\")) return true;
  // A scheme anywhere means this is not a plain path.
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return true;
  // Control characters, including the tab/newline tricks used to split URLs.
  if (/[\u0000-\u001f\u007f]/.test(path)) return true;
  return false;
}

/**
 * Returns the path when it is a safe internal destination, otherwise null.
 * Accepts `URLSearchParams.get()` output directly.
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const decoded = fullyDecode(raw);
  if (!decoded) return null;

  // Both the raw and the fully decoded form must pass, so that a value which
  // only becomes dangerous after the browser decodes it is still rejected.
  if (isRejected(raw) || isRejected(decoded)) return null;

  const pathOnly = decoded.split(/[?#]/)[0];

  const allowed =
    ALLOWED_EXACT.some((p) => pathOnly === p) ||
    ALLOWED_PREFIXES.some((p) => pathOnly.startsWith(p));

  return allowed ? decoded : null;
}

/** Same check, resolved to a usable destination. */
export function safeNextOr(
  raw: string | null | undefined,
  fallback: string = DEFAULT_APP_DESTINATION,
): string {
  return safeNext(raw) ?? fallback;
}

/** True when the destination belongs to an invited candidate rather than an employer. */
export function isCandidateDestination(next: string | null | undefined): boolean {
  const safe = safeNext(next);
  if (!safe) return false;
  return (
    safe.startsWith("/invite/") ||
    safe.startsWith("/sim/") ||
    safe.startsWith("/record/") ||
    safe.startsWith("/results/") ||
    safe.startsWith("/app/candidate")
  );
}

/** True when the destination belongs to the employer application. */
export function isEmployerDestination(next: string | null | undefined): boolean {
  const safe = safeNext(next);
  if (!safe) return false;
  return safe.startsWith("/app/employer") || safe.startsWith("/app/simulations");
}

/**
 * Appends a validated `next` to an auth route so the intended destination
 * survives every hop through login, signup and password reset.
 */
export function withNext(href: string, next: string | null | undefined): string {
  const safe = safeNext(next);
  if (!safe) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}next=${encodeURIComponent(safe)}`;
}
