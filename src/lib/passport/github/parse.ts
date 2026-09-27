import type { ParsedInput } from "./types";

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Accepts "owner/repo", a github.com repository URL, a github.com profile URL,
 * or a bare username. Anything else, including other hosts, is rejected.
 */
export function parseGithubInput(raw: string): ParsedInput | null {
  const input = raw.trim();
  if (!input || input.length > 300) return null;

  let segments: string[];
  if (/^https?:\/\//i.test(input)) {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      return null;
    }
    const host = url.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") return null;
    if (url.username || url.password || (url.port && url.port !== "443")) return null;
    segments = url.pathname.split("/").filter(Boolean);
  } else {
    segments = input.split("/").filter(Boolean);
    const host = segments[0]?.toLowerCase();
    if (host === "github.com" || host === "www.github.com") segments = segments.slice(1);
    else if (host?.includes(".")) return null;
  }

  if (segments.length === 1) {
    const user = segments[0];
    return OWNER.test(user) ? { kind: "profile", user } : null;
  }
  if (segments.length >= 2) {
    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/i, "");
    if (!OWNER.test(owner) || !REPO.test(repo) || repo === "." || repo === "..") return null;
    return { kind: "repository", ref: { owner, repo } };
  }
  return null;
}
