/**
 * The preferred public host. The apex domain 308-redirects here, so every
 * canonical URL, the sitemap and robots.txt must use this origin.
 */
export const SITE_URL = "https://www.fydell.com";

/**
 * Public, indexable pages. Each one must render for anonymous visitors, export
 * a title and description, and declare a canonical equal to its path.
 * Redirecting routes (/product, /how-it-works, /security, /simulations, ...) and auth
 * forms (which carry noindex) do not belong here.
 */
export const INDEXABLE_PATHS = [
  "/",
  "/products",
  "/products/builder-profiles",
  "/products/engineering-passport",
  "/products/builder-reports",
  "/products/hiring-workspace",
  "/products/simulations",
  "/products/desktop",
  "/changelog",
  "/employers",
  "/developers",
  "/pricing",
  "/trust",
  "/download",
  "/demo",
  "/passport/new",
  "/get-started",
  "/contact",
  "/privacy",
  "/terms",
] as const;

/**
 * Authenticated application areas, tokenized share links, internal tools and
 * API routes. Crawlers are asked not to fetch them (some, like /work/[token],
 * start a run when requested) and any response is marked noindex.
 */
export const PRIVATE_PATH_PREFIXES = [
  "/app",
  "/admin",
  "/account",
  "/api",
  "/auth",
  "/onboarding",
  "/dashboard",
  "/sim",
  "/assess",
  "/invite",
  "/work",
  "/p",
  "/record",
  "/receipts",
  "/results",
  "/sandbox",
  "/pilot",
  "/lab",
  "/prototypes",
] as const;

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
