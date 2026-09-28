/**
 * Employer chunk — REP-05: reviewer work support.
 *
 * - Private notes: reviewer-scoped, persisted, and EXCLUDED from anything
 *   candidate-facing (see candidateSafeReport below and permissions.ts).
 * - Decision history: delegated to lib/employer/decisions.ts (durable,
 *   append-only).
 * - Finding flags: a reviewer can flag a finding and request a correction;
 *   the flag is stored on the report version metadata, never silently
 *   rewritten.
 */

import type { DecisionBrief } from "./types";

export interface ReviewerNote {
  id: string;
  reportId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
}

export interface FindingFlag {
  id: string;
  reportId: string;
  findingId: string;
  flaggedBy: string;
  reason: string;
  correctionRequested: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ReviewStore {
  notes: ReviewerNote[];
  flags: FindingFlag[];
}

export function createReviewMemoryStore(): ReviewStore {
  return { notes: [], flags: [] };
}

let noteSeq = 0;
let flagSeq = 0;

export function addReviewerNote(
  store: ReviewStore,
  input: { reportId: string; authorUserId: string; body: string }
): ReviewerNote {
  noteSeq += 1;
  const note: ReviewerNote = {
    id: `note-${Date.now()}-${noteSeq}`,
    reportId: input.reportId,
    authorUserId: input.authorUserId,
    body: input.body.slice(0, 4000),
    createdAt: new Date().toISOString(),
  };
  store.notes.push(note);
  return note;
}

export function notesForReport(store: ReviewStore, reportId: string): ReviewerNote[] {
  return store.notes.filter((n) => n.reportId === reportId);
}

export function flagFinding(
  store: ReviewStore,
  input: {
    reportId: string;
    findingId: string;
    flaggedBy: string;
    reason: string;
    correctionRequested: boolean;
  }
): FindingFlag {
  if (!input.reason.trim()) throw new Error("a flag reason is required");
  flagSeq += 1;
  const flag: FindingFlag = {
    id: `flag-${Date.now()}-${flagSeq}`,
    reportId: input.reportId,
    findingId: input.findingId,
    flaggedBy: input.flaggedBy,
    reason: input.reason.slice(0, 2000),
    correctionRequested: input.correctionRequested,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  store.flags.push(flag);
  return flag;
}

export function flagsForReport(store: ReviewStore, reportId: string): FindingFlag[] {
  return store.flags.filter((f) => f.reportId === reportId);
}

/**
 * Candidate-safe view of a report: the decision brief WITHOUT private
 * notes, internal flags, or decision history. Candidate passport evidence
 * (PASS-09) is built from this shape, never from the full reviewer view.
 */
export interface CandidateSafeReport extends DecisionBrief {
  privateNotesOmitted: true;
  flagsOmitted: true;
}

export function candidateSafeReport(brief: DecisionBrief): CandidateSafeReport {
  return {
    ...brief,
    findings: brief.findings.map((f) => ({
      ...f,
      flagged: false,
      flagReason: null,
    })),
    privateNotesOmitted: true,
    flagsOmitted: true,
  };
}
