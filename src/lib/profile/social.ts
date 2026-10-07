import type { SocialKind } from "./types";

export type SocialResult = { ok: true; url: string } | { ok: false; error: string };

const HOSTS: Record<SocialKind, string[]> = {
  linkedin: ["linkedin.com", "www.linkedin.com", "ca.linkedin.com", "uk.linkedin.com", "in.linkedin.com"],
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"],
  instagram: ["instagram.com", "www.instagram.com"],
};

const X_HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const IG_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const LINKEDIN_SLUG = /^[A-Za-z0-9\-_%]{3,100}$/;

const X_RESERVED = new Set(["home", "explore", "search", "settings", "i", "intent", "share", "messages", "notifications"]);
const IG_RESERVED = new Set(["p", "reel", "reels", "explore", "stories", "accounts", "direct"]);

function parseUrl(raw: string): URL | null {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function looksLikeUrl(raw: string): boolean {
  return /[./]/.test(raw.replace(/^@/, "")) && !/^[A-Za-z0-9._]+$/.test(raw.replace(/^@/, ""));
}

/**
 * Turn a handle or profile address into one canonical https URL, or explain
 * what is wrong. Empty input clears the field.
 */
export function normalizeSocial(kind: SocialKind, value: string): SocialResult {
  const raw = value.trim();
  if (!raw) return { ok: true, url: "" };

  if (kind === "linkedin") {
    const url = parseUrl(raw);
    if (!url || !HOSTS.linkedin.includes(url.hostname.toLowerCase())) {
      return { ok: false, error: "Paste your LinkedIn profile address, like linkedin.com/in/your-name." };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: "LinkedIn address must be a web link." };
    const [section, slug] = url.pathname.split("/").filter(Boolean);
    if ((section !== "in" && section !== "company") || !slug || !LINKEDIN_SLUG.test(slug)) {
      return { ok: false, error: "Use your public profile address, like linkedin.com/in/your-name." };
    }
    return { ok: true, url: `https://www.linkedin.com/${section}/${slug}` };
  }

  let handle: string;
  if (raw.startsWith("@") || !looksLikeUrl(raw)) {
    handle = raw.replace(/^@/, "");
  } else {
    const url = parseUrl(raw);
    if (!url || !HOSTS[kind].includes(url.hostname.toLowerCase())) {
      return { ok: false, error: kind === "x" ? "Enter your X handle or an x.com address." : "Enter your Instagram handle or an instagram.com address." };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: "That is not a web link." };
    handle = url.pathname.split("/").filter(Boolean)[0] ?? "";
  }

  if (kind === "x") {
    if (!X_HANDLE.test(handle) || X_RESERVED.has(handle.toLowerCase())) {
      return { ok: false, error: "X handles are up to 15 letters, numbers or underscores." };
    }
    return { ok: true, url: `https://x.com/${handle}` };
  }
  if (!IG_HANDLE.test(handle) || IG_RESERVED.has(handle.toLowerCase())) {
    return { ok: false, error: "Instagram handles are up to 30 letters, numbers, periods or underscores." };
  }
  return { ok: true, url: `https://www.instagram.com/${handle}` };
}

/** The short form shown on a profile: in/your-name, @handle. */
export function socialDisplay(kind: SocialKind, url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (kind === "linkedin") return parts.join("/");
    return `@${parts[0] ?? ""}`;
  } catch {
    return url;
  }
}
