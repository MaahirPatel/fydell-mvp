/** Canonical public app URL for auth redirects (password reset, email links). */
export function appUrl(): string {
  // A development server must never mint links that point at the live site.
  if (process.env.NODE_ENV === "development") {
    return (process.env.DEV_APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
  }
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const raw = (fromEnv || "https://www.fydell.com").replace(/\/$/, "");
  return raw;
}
