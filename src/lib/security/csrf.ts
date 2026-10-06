import "server-only";

/**
 * CSRF protection for cookie-authenticated API routes (SEC-07).
 *
 * The app uses httpOnly cookies for auth, so cross-site request forgery
 * is a real risk on state-changing endpoints. This guard checks the
 * Origin header against the expected app origin.
 *
 * Browsers always send Origin on cross-origin POST/PUT/DELETE/PATCH.
 * An attacker cannot spoof it from a victim's browser. Same-origin
 * requests may omit it (same-origin GETs, some older clients) — those
 * are allowed through; the check only rejects mismatched origins.
 */

function expectedOrigins(): string[] {
  const origins: string[] = [];
  // Production and preview URLs.
  if (process.env.NEXT_PUBLIC_APP_URL) origins.push(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  // Local development.
  origins.push("http://localhost:3000", "http://127.0.0.1:3000");
  return origins.map((o) => o.replace(/\/$/, ""));
}

/**
 * Returns null if the request passes CSRF checks, or an error message.
 * Call at the top of POST/PUT/PATCH/DELETE route handlers.
 */
export function checkCsrf(req: Request): string | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const origin = req.headers.get("origin");
  // No Origin header: same-origin form submission or non-browser client.
  // Allow through — cookie auth still applies, and sensitive routes
  // have their own authorization checks.
  if (!origin) return null;

  const normalized = origin.replace(/\/$/, "");
  if (expectedOrigins().includes(normalized)) return null;

  return `Cross-origin request blocked (origin: ${origin}).`;
}

/**
 * NextResponse-friendly wrapper. Returns a 403 response if CSRF check fails,
 * otherwise null.
 */
export async function csrfGuard(req: Request): Promise<Response | null> {
  const { NextResponse } = await import("next/server");
  const problem = checkCsrf(req);
  if (problem) {
    return NextResponse.json({ error: "Request blocked for security reasons." }, { status: 403 });
  }
  return null;
}
