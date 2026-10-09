import type { Finding, ReportBrief } from "./types";

function shorten(text: string): string {
  return text.length > 72 ? `${text.slice(0, 71).trimEnd()}…` : text;
}

/**
 * Readable names for what a candidate response points at, keyed by target id:
 * acceptance criteria by their text, rubric criteria by their label and
 * findings by their statement.
 */
export function responseTargetLabels(brief: ReportBrief | null | undefined, findings: Finding[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of findings) out[f.id] = shorten(f.statement);
  for (const c of brief?.criteria ?? []) out[c.id] = c.label;
  for (const c of brief?.authored?.criteria ?? []) out[c.id] = c.label;
  for (const a of brief?.authored?.acceptance ?? []) out[a.id] = `${a.id}: ${shorten(a.text)}`;
  return out;
}
