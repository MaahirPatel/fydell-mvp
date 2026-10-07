import "server-only";

/**
 * Input validation and output escaping (SEC-07).
 *
 * - validateText: length bounds + control-character stripping for free text.
 * - escapeHtml: for interpolating user content into HTML.
 * - renderSafeMarkdown: a small allowlisted Markdown renderer that NEVER
 *   passes raw HTML through (hostile Markdown per E2E-08 is escaped, not run).
 * - isSafeRedirectUrl: relative-path or allowlisted-host only.
 * - cookie helpers: Secure / HttpOnly / SameSite=Lax by default.
 */

export interface TextValidation {
  ok: boolean;
  value: string;
  error?: string;
}

export function validateText(
  input: unknown,
  opts: { maxLength?: number; minLength?: number; field?: string } = {}
): TextValidation {
  const field = opts.field ?? "value";
  if (typeof input !== "string") return { ok: false, value: "", error: `${field} must be a string.` };
  // Strip C0/C1 control characters except tab/newline/carriage return.
  const value = input.replace(/[^\t\n\r\x20-\uFFFF]/g, "").slice(0, opts.maxLength ?? 10_000);
  if (value.length < (opts.minLength ?? 0)) {
    return { ok: false, value, error: `${field} is too short.` };
  }
  return { ok: true, value };
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const INLINE_CODE_RE = /`([^`\n]+)`/g;

/**
 * Renders a small Markdown subset (headings, bold, italic, inline code,
 * fenced code blocks, unordered lists, links) to HTML. Everything else - 
 * including raw HTML, <script>, and javascript: URLs - is escaped.
 */
export function renderSafeMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inCode = false;
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  const renderInline = (text: string): string => {
    // Escape first, then re-introduce allowlisted formatting.
    let html = escapeHtml(text);
    html = html.replace(INLINE_CODE_RE, (_m, code) => `<code>${code}</code>`);
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
      const target = String(href);
      if (!/^(https?:\/\/|mailto:)/i.test(target)) return label;
      return `<a href="${escapeHtml(target)}" rel="noopener noreferrer nofollow">${label}</a>`;
    });
    return html;
  };

  for (const line of lines) {
    if (/^```/.test(line)) {
      closeList();
      out.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(`${escapeHtml(line)}\n`);
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }
    const listItem = /^[-*]\s+(.*)$/.exec(line);
    if (listItem) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${renderInline(listItem[1])}</li>`);
      continue;
    }
    if (/^\s*$/.test(line)) {
      closeList();
      continue;
    }
    closeList();
    out.push(`<p>${renderInline(line)}</p>`);
  }
  closeList();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

/**
 * Open-redirect guard (SEC-07). Allowed: same-origin relative paths that do
 * not start with "//", and absolute URLs on the allowlisted hosts.
 */
export function isSafeRedirectUrl(url: string, allowedHosts: string[] = []): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > 2048) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  maxAge?: number;
}

/** Serializes a Set-Cookie value with secure defaults (SEC-07). */
export function serializeSecureCookie(name: string, value: string, opts: CookieOptions = {}): string {
  if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error("Invalid cookie name.");
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  if (opts.maxAge != null) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  if (opts.httpOnly ?? true) parts.push("HttpOnly");
  if (opts.secure ?? process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
