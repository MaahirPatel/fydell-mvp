/**
 * HTML safety for email templates (pure, no server-only imports so tests can load it).
 *
 * Every employer-, candidate- or user-supplied value must pass through
 * escapeHtml before it enters an email body, and every link through safeHref.
 */

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/** An escaped http(s) or mailto URL, or "#" for anything else (javascript:, data:, malformed). */
export function safeHref(raw: unknown): string {
  const value = String(raw ?? "").trim();
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") return escapeHtml(url.toString());
  } catch {
    return "#";
  }
  return "#";
}

/** Domains reserved for documentation and testing (RFC 2606 / 6761). Real mail to them only bounces. */
const RESERVED = [/(^|\.)example\.(com|net|org)$/, /\.example$/, /\.test$/, /\.invalid$/, /\.localhost$/, /^localhost$/];

export function isReservedEmailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return RESERVED.some((re) => re.test(domain));
}

/** Resend's sink that accepts and reports delivery without reaching anyone. */
export const RESEND_TEST_INBOX = "delivered@resend.dev";

/** Addresses development may email as written: comma-separated FYDELL_DEV_EMAIL_ALLOWLIST. */
function devAllowlist(): string[] {
  return (process.env.FYDELL_DEV_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Where an email may actually go. In production, synthetic addresses are
 * refused. Outside production nothing reaches a real inbox by accident: only
 * Resend test addresses and the dev allowlist pass through, and everything
 * else is redirected to Resend's test inbox.
 */
export function routeRecipient(email: string, production: boolean): { to: string; redirected: boolean } | { refused: string } {
  const to = email.trim().toLowerCase();
  if (production) {
    if (isReservedEmailDomain(to)) return { refused: "This address uses a reserved test domain and cannot receive email." };
    return { to, redirected: false };
  }
  if (to.endsWith("@resend.dev") || devAllowlist().includes(to)) return { to, redirected: false };
  return { to: RESEND_TEST_INBOX, redirected: true };
}
