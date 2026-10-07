import "server-only";

/**
 * Origin check for cookie-authenticated, state-changing API routes.
 *
 * Browsers always send Origin on cross-origin POST/PUT/PATCH/DELETE and a
 * page cannot spoof it. Requests without Origin (same-origin navigations,
 * non-browser clients using bearer tokens) pass; those still go through the
 * route's own authorization.
 */

function expectedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env.NEXT_PUBLIC_APP_URL) origins.push(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_BRANCH_URL) origins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  if (process.env.NODE_ENV !== "production") origins.push("http://localhost:3000", "http://127.0.0.1:3000");
  return origins.map((o) => o.replace(/\/$/, ""));
}

/** Returns null when the request may proceed, otherwise a reason. */
export function checkCsrf(req: Request): string | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const normalized = origin.replace(/\/$/, "");
  if (expectedOrigins().includes(normalized)) return null;
  // Same-origin requests on any host (preview domains, custom domains).
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (host && new URL(normalized).host === host) return null;
  } catch {
    return "Malformed origin.";
  }
  return "Cross-origin request blocked.";
}

export function csrfGuard(req: Request): Response | null {
  return checkCsrf(req) ? Response.json({ error: "Request blocked for security reasons." }, { status: 403 }) : null;
}
