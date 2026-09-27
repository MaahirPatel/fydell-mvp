/**
 * Employer chunk — REP-04: versioned report updates.
 *
 * Identifiers (candidate / role / scenario / rubric versions) are checked at
 * publish time. Fixes never mutate a published report: they create a new
 * version, and every prior version stays immutable and retrievable, so an
 * employer can always see what a decision was based on.
 */

import type { DecisionBrief } from "./types";

export interface ReportVersionRecord {
  version: number;
  brief: DecisionBrief;
  publishedAt: string;
  publishedBy: string;
  changeNote: string;
}

export interface ReportStore {
  /** reportId -> ordered versions, oldest first */
  reports: Map<string, ReportVersionRecord[]>;
}

export function createReportMemoryStore(): ReportStore {
  return { reports: new Map() };
}

export type ReportError =
  | "identifier_mismatch"
  | "report_not_found"
  | "already_published"
  | "invalid_input";

export type ReportResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ReportError; message: string };

/**
 * Publish the first version of a report. Identifiers must be internally
 * consistent (candidate, role, scenario, rubric, invitation, session all
 * present and matching the expected session).
 */
export function publishReport(
  store: ReportStore,
  brief: DecisionBrief,
  publishedBy: string,
  expected: { sessionId: string; invitationId: string }
): ReportResult<ReportVersionRecord> {
  if (!brief.candidateEmail || !brief.roleKey || !brief.scenarioVersion || !brief.rubricVersion) {
    return { ok: false, code: "invalid_input", message: "report identifiers are incomplete" };
  }
  if (brief.sessionId !== expected.sessionId || brief.invitationId !== expected.invitationId) {
    return {
      ok: false,
      code: "identifier_mismatch",
      message: "report identifiers do not match the session it claims to describe",
    };
  }
  if (store.reports.has(brief.reportId)) {
    return { ok: false, code: "already_published", message: "report already published; use updateReport" };
  }
  const record: ReportVersionRecord = {
    version: 1,
    brief: { ...brief, reportVersion: 1 },
    publishedAt: new Date().toISOString(),
    publishedBy,
    changeNote: "Initial report.",
  };
  store.reports.set(brief.reportId, [record]);
  return { ok: true, value: record };
}

/**
 * Publish a corrected version. The updater supplies the new brief content;
 * identifiers must match the previous version exactly (a correction cannot
 * silently repoint a report at a different candidate or attempt).
 */
export function updateReport(
  store: ReportStore,
  reportId: string,
  corrected: Omit<DecisionBrief, "reportVersion">,
  publishedBy: string,
  changeNote: string
): ReportResult<ReportVersionRecord> {
  const versions = store.reports.get(reportId);
  if (!versions || versions.length === 0) {
    return { ok: false, code: "report_not_found", message: "no such report" };
  }
  const prev = versions[versions.length - 1].brief;
  const identityKeys = [
    "candidateEmail",
    "roleKey",
    "scenarioTitle",
    "scenarioVersion",
    "rubricVersion",
    "invitationId",
    "sessionId",
  ] as const;
  for (const key of identityKeys) {
    if (corrected[key] !== prev[key]) {
      return {
        ok: false,
        code: "identifier_mismatch",
        message: `correction changes report identity (${key}); publish a new report instead`,
      };
    }
  }
  if (!changeNote.trim()) {
    return { ok: false, code: "invalid_input", message: "a change note is required for report updates" };
  }
  const record: ReportVersionRecord = {
    version: prev.reportVersion + 1,
    brief: { ...corrected, reportVersion: prev.reportVersion + 1 },
    publishedAt: new Date().toISOString(),
    publishedBy,
    changeNote: changeNote.trim(),
  };
  versions.push(record);
  return { ok: true, value: record };
}

export function getReportVersion(
  store: ReportStore,
  reportId: string,
  version?: number
): ReportVersionRecord | null {
  const versions = store.reports.get(reportId);
  if (!versions || versions.length === 0) return null;
  if (version === undefined) return versions[versions.length - 1];
  return versions.find((v) => v.version === version) ?? null;
}

export function listReportVersions(store: ReportStore, reportId: string): ReportVersionRecord[] {
  return [...(store.reports.get(reportId) ?? [])];
}
