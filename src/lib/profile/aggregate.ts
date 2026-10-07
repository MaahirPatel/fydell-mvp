import type { TimelineItem } from "./types";

/**
 * Merge evidence from every source into one reverse-chronological timeline.
 * Pure function: no I/O, no Supabase. Provenance is carried through untouched
 * - aggregation must never weaken or relabel it.
 */
export function aggregateTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    const ta = Date.parse(a.occurredAt);
    const tb = Date.parse(b.occurredAt);
    const sa = Number.isNaN(ta) ? 0 : ta;
    const sb = Number.isNaN(tb) ? 0 : tb;
    if (sb !== sa) return sb - sa;
    // Stable tiebreak so the order is deterministic for identical timestamps.
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Remove owner-only fields before rendering a public/shared view. */
export function publicTimelineItem(item: TimelineItem): TimelineItem {
  if (item.kind !== "editor-import") return item;
  // Local file paths can leak project names and employer IP; the public view
  // keeps counts, languages, and time range but drops the file list.
  const { filesTouched, ...restMeta } = item.meta as { filesTouched?: unknown } & Record<string, unknown>;
  void filesTouched;
  return { ...item, meta: restMeta };
}
