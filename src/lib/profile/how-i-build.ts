import type { HowIBuild } from "./types";

export const HOW_I_BUILD_MAX = 1500;

/**
 * `expectedUpdatedAt` is the `updatedAt` of the statement the editor started
 * from, or null when there was none. A save made from an older copy is refused.
 */
export type HowIBuildInput = { text: string; includeInShares: boolean; expectedUpdatedAt: string | null };

export function parseHowIBuild(
  raw: unknown,
): { ok: true; value: HowIBuildInput } | { ok: false; error: string; missingRevision?: true } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Send the statement as an object." };
  const r = raw as Record<string, unknown>;
  if (r.text !== undefined && typeof r.text !== "string") return { ok: false, error: "The statement must be text." };
  const given = r.expectedUpdatedAt;
  if (given !== null && !(typeof given === "string" && given.length > 0 && given.length <= 40)) {
    return { ok: false, error: "Reload the page before saving so a newer version is not overwritten.", missingRevision: true };
  }
  const expected = typeof given === "string" ? given : null;
  const text = (typeof r.text === "string" ? r.text : "").trim().replace(/\n{3,}/g, "\n\n");
  if (text.length > HOW_I_BUILD_MAX) return { ok: false, error: `Keep it under ${HOW_I_BUILD_MAX.toLocaleString("en-US")} characters.` };
  // An empty statement can never be shared.
  return { ok: true, value: { text, includeInShares: text.length > 0 && r.includeInShares === true, expectedUpdatedAt: expected } };
}

/** What a share link may carry: the statement only when the engineer chose to include it. */
export function shareHowIBuild(value: HowIBuild | null): HowIBuild | null {
  return value && value.includeInShares && value.text.trim() ? value : null;
}
