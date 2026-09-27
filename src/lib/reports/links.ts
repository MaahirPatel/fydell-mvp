/**
 * Employer chunk — REP-02: evidence one click away.
 *
 * Each finding carries structured sources (see reports/types.ts). This
 * module turns those into stable deep links: report id + finding id +
 * source kind produce an anchor the evidence UI can jump to, and every link
 * resolves back to the exact source reference it was built from.
 */

import type { Finding, FindingSource } from "./types";

export interface FindingLink {
  findingId: string;
  anchor: string; // e.g. /reports/<id>#finding-<findingId>
  sources: { kind: FindingSource["kind"]; ref: string; label: string; anchor: string }[];
}

export function findingLink(reportId: string, finding: Finding): FindingLink {
  return {
    findingId: finding.id,
    anchor: `/reports/${reportId}#finding-${finding.id}`,
    sources: finding.sources.map((s) => ({
      kind: s.kind,
      ref: s.ref,
      label: s.label,
      anchor: `/reports/${reportId}#finding-${finding.id}-source-${s.kind}-${encodeURIComponent(s.ref)}`,
    })),
  };
}

/** Resolve a link anchor back to (finding, source) — proves links are lossless. */
export function resolveAnchor(
  findings: Finding[],
  anchor: string
): { finding: Finding; source: FindingSource | null } | null {
  const m = anchor.match(/#finding-([A-Za-z0-9_-]+)(?:-source-([a-z]+)-(.+))?$/);
  if (!m) return null;
  const finding = findings.find((f) => f.id === m[1]);
  if (!finding) return null;
  if (!m[2]) return { finding, source: null };
  const source = finding.sources.find(
    (s) => s.kind === m[2] && encodeURIComponent(s.ref) === m[3]
  );
  return source ? { finding, source } : null;
}
