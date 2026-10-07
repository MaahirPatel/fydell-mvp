/**
 * Candidate corrections (PASS-08).
 *
 * A candidate can flag a finding as inaccurate. Flagging never mutates the
 * original finding: the finding row stays byte-identical so the employer's
 * audit history is preserved, and the correction is stored as a separate
 * record linked to it. Resolving a correction adds a resolution note; it
 * does not rewrite history either.
 */

import type { PassportData, PassportEvidence } from "./view";

export type CorrectionStatus = "open" | "resolved";

export type CorrectionKind = "context" | "inaccurate" | "correction";

export type Correction = {
  id: string;
  findingId: string;
  projectId: string | null;
  reason: string;
  status: CorrectionStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string;
  kind: CorrectionKind;
  proposedInterpretation: string;
  withdrawnAt: string | null;
};

const EMPTY_MESSAGE: Record<CorrectionKind, string> = {
  context: "Add the context you want reviewers to see.",
  inaccurate: "Describe what is inaccurate about the finding.",
  correction: "Explain why the finding should change.",
};

export function validateCorrectionReason(reason: unknown, kind: CorrectionKind = "inaccurate"): { ok: boolean; reason: string; error: string } {
  if (typeof reason !== "string" || !reason.trim()) return { ok: false, reason: "", error: EMPTY_MESSAGE[kind] };
  if (reason.trim().length > 1000) return { ok: false, reason: "", error: "Keep the correction under 1000 characters." };
  return { ok: true, reason: reason.trim(), error: "" };
}

export type FlaggedFinding = { finding: PassportEvidence; corrections: Correction[] };

/** Pairs each finding with its open/resolved corrections for owner views and exports. */
export function flaggedFindings(passport: PassportData, corrections: Correction[]): FlaggedFinding[] {
  const byFinding = new Map<string, Correction[]>();
  for (const c of corrections) {
    const list = byFinding.get(c.findingId) ?? [];
    list.push(c);
    byFinding.set(c.findingId, list);
  }
  const out: FlaggedFinding[] = [];
  for (const project of passport.projects) {
    for (const finding of project.evidence) {
      const list = byFinding.get(finding.id);
      if (list?.length) out.push({ finding, corrections: list });
    }
  }
  return out;
}

/** Finding ids with at least one open (unresolved) correction. */
export function disputedFindingIds(corrections: Correction[]): Set<string> {
  return new Set(corrections.filter((c) => c.status === "open" && c.kind !== "context" && !c.withdrawnAt).map((c) => c.findingId));
}
