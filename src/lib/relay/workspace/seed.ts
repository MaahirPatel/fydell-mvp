import type { FileMap } from "@/lib/relay/execution-provider";
import { EVALUATOR_ONLY_PATHS } from "./types";

/** Strip evaluator-only files and sanitize spoilers before candidates see the FS. */
export function toCandidateFileMap(seed: FileMap): FileMap {
  const out: FileMap = {};
  for (const [path, content] of Object.entries(seed)) {
    if (EVALUATOR_ONLY_PATHS.has(path)) continue;
    if (path.startsWith(".fydell/")) continue;
    if (path === "canonical.json") continue;
    out[path] = sanitizeCandidateContent(path, content);
  }
  // Rename delay file label in tree presentation only — keep path for runtime.
  return out;
}

function sanitizeCandidateContent(path: string, content: string): string {
  if (path === "src/join.py") {
    return content
      .replace(/INTENTIONAL DEFECT[^\n]*/gi, "Exact-string join on shipment_id.")
      .replace(/# INTENTIONAL_DEFECT[^\n]*/g, "# join strategy: exact string equality on shipment_id")
      .replace(/candidate should find this[^\n]*/gi, "")
      .replace(/See\s*`reconcile\.py`\s*for the fix[^\n]*/gi, "See reconcile.py for alternate join strategies.")
      .replace(/docs\/data-integrity\.md[^\n]*/gi, "the ops data notes.");
  }
  if (path === "README.md") {
    return content
      .replace(/\*\*`naive_join`\*\*[^\n]*/g, "`naive_join` — exact-string shipment_id match")
      .replace(/intentional defect[^\n]*/gi, "join behavior worth verifying against the delay log")
      .replace(/docs\/data-integrity\.md[^\n]*/g, "docs/customer-brief.md");
  }
  return content;
}

/** Facts safe to show in Brief / constraints UI (never the answer key). */
export function candidateVisibleFacts(all: string[], preferred?: string[]): string[] {
  if (preferred?.length) return preferred;
  return all.filter((f) => {
    const lower = f.toLowerCase();
    if (lower.includes("should only surface")) return false;
    if (lower.includes("naive exact-match") || lower.includes("naive exact")) return false;
    if (lower.includes("silently drop")) return false;
    if (lower.includes("inconsistent shipment id")) return false;
    if (lower.includes("board meeting was moved")) return false; // curveball only
    return true;
  });
}
