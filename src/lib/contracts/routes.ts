/**
 * Wave 1 route manifest.
 *
 * Agents consume this list. Do not add a public or employer destination
 * without updating the contract first.
 */

export const PUBLIC_ROUTES = [
  "/",
  "/product",
  "/simulations",
  "/trust",
  "/request-pilot",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/security",
] as const;

export const EMPLOYER_ROUTES = [
  "/app/employer",
  "/app/employer/roles",
  "/app/employer/candidates",
  "/app/employer/work",
  "/app/employer/evidence",
  "/app/employer/receipts",
  "/app/employer/outcomes",
  "/app/employer/settings",
] as const;

export const CANDIDATE_ROUTES = [
  "/invite/[token]",
  "/sim/[sessionId]",
  "/sim/[sessionId]/result",
  "/record/[token]",
] as const;

export const WAVE1_NAV = [
  { label: "Product", href: "/product" },
  { label: "Evaluations", href: "/simulations" },
  { label: "Trust", href: "/trust" },
] as const;

export const WAVE1_PRIMARY_CTA = {
  label: "Request a pilot",
  href: "/request-pilot",
} as const;

export const WAVE1_ROUTE_OWNERSHIP = {
  "/": { auth: "public", owner: "marketing", empty: "n/a", error: "static" },
  "/product": { auth: "public", owner: "marketing", empty: "n/a", error: "static" },
  "/simulations": { auth: "public", owner: "marketing", empty: "n/a", error: "static" },
  "/trust": { auth: "public", owner: "marketing", empty: "n/a", error: "static" },
  "/request-pilot": { auth: "public", owner: "marketing", empty: "form", error: "truthful result" },
  "/login": { auth: "public", owner: "auth", empty: "form", error: "non-enumerating" },
  "/signup": { auth: "public", owner: "auth", empty: "form", error: "field + legal consent" },
  "/privacy": { auth: "public", owner: "legal", empty: "n/a", error: "static" },
  "/terms": { auth: "public", owner: "legal", empty: "n/a", error: "static" },
  "/security": { auth: "public", owner: "legal", empty: "n/a", error: "static" },
  "/app/employer": { auth: "org_member", owner: "employer", empty: "honest workspace", error: "login redirect" },
  "/app/employer/roles": { auth: "org_member", owner: "employer", empty: "create role", error: "login redirect" },
  "/app/employer/candidates": { auth: "org_member", owner: "employer", empty: "no invitations", error: "login redirect" },
  "/app/employer/work": { auth: "org_member", owner: "employer", empty: "no work episodes", error: "login redirect" },
  "/app/employer/evidence": { auth: "org_member", owner: "employer", empty: "no evidence", error: "login redirect" },
  "/app/employer/receipts": { auth: "org_member", owner: "employer", empty: "no authorized receipts", error: "login redirect" },
  "/app/employer/outcomes": { auth: "org_member", owner: "employer", empty: "no outcomes", error: "login redirect" },
  "/app/employer/settings": { auth: "org_member", owner: "employer", empty: "workspace name", error: "login redirect" },
  "/invite/[token]": { auth: "candidate", owner: "candidate", empty: "invalid token", error: "expired/revoked/used" },
  "/sim/[sessionId]": { auth: "candidate_owner", owner: "candidate", empty: "forbidden", error: "unauthorized" },
  "/sim/[sessionId]/result": { auth: "candidate_owner", owner: "candidate", empty: "processing", error: "analysis_failed" },
  "/record/[token]": { auth: "public_token", owner: "candidate", empty: "revoked", error: "server-side revoke" },
} as const;
