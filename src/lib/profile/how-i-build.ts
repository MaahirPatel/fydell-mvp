import type { HowIBuild } from "./types";

export const HOW_I_BUILD_MAX = 1500;

export type HowIBuildInput = { text: string; includeInShares: boolean };

export function parseHowIBuild(raw: unknown): { ok: true; value: HowIBuildInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "Send the statement as an object." };
  const r = raw as Record<string, unknown>;
  if (r.text !== undefined && typeof r.text !== "string") return { ok: false, error: "The statement must be text." };
  const text = (typeof r.text === "string" ? r.text : "").trim().replace(/\n{3,}/g, "\n\n");
  if (text.length > HOW_I_BUILD_MAX) return { ok: false, error: `Keep it under ${HOW_I_BUILD_MAX.toLocaleString("en-US")} characters.` };
  // An empty statement can never be shared.
  return { ok: true, value: { text, includeInShares: text.length > 0 && r.includeInShares === true } };
}

/** What a share link may carry: the statement only when the engineer chose to include it. */
export function shareHowIBuild(value: HowIBuild | null): HowIBuild | null {
  return value && value.includeInShares && value.text.trim() ? value : null;
}
