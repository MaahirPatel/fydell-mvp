/**
 * Employer chunk — report types (REP-01..REP-07).
 *
 * A report is assembled from real analysis artifacts only. There is no
 * universal hireability number anywhere in this namespace by design (REP-03):
 * results are presented in separated categories — coding results,
 * interpretation, communication observations, infrastructure status — each
 * with its own band and evidence.
 */

export type ResultCategory = "coding" | "interpretation" | "communication" | "infrastructure";

export const CATEGORY_LABEL: Record<ResultCategory, string> = {
  coding: "Coding results",
  interpretation: "Interpretation",
  communication: "Communication observations",
  infrastructure: "Infrastructure status",
};

export type Band = "strong" | "adequate" | "developing" | "insufficient" | "not_observed";

export const BAND_LABEL: Record<Band, string> = {
  strong: "Strong",
  adequate: "Adequate",
  developing: "Developing",
  insufficient: "Insufficient evidence",
  not_observed: "Not observed",
};

export interface CompetencyResult {
  competency: string;
  category: ResultCategory;
  band: Band;
  score: number | null; // 0-100 within the competency; never aggregated globally
  summary: string;
}

export type SourceKind = "diff" | "test" | "message" | "submission" | "log";

export interface FindingSource {
  kind: SourceKind;
  ref: string; // stable reference (file path, test id, message id, ...)
  label: string;
}

export interface Finding {
  id: string;
  category: ResultCategory;
  title: string;
  detail: string;
  severity: "strength" | "gap" | "observation" | "limitation";
  sources: FindingSource[];
  flagged: boolean;
  flagReason: string | null;
}

export interface DecisionBrief {
  reportId: string;
  reportVersion: number;
  candidateName: string | null;
  candidateEmail: string;
  roleTitle: string;
  roleKey: string;
  scenarioTitle: string;
  scenarioVersion: string;
  rubricVersion: string;
  invitationId: string;
  sessionId: string;
  brief: string; // short narrative: role/task, strengths, gaps, limitations, follow-ups
  categories: { category: ResultCategory; band: Band; summary: string; findingIds: string[] }[];
  findings: Finding[];
  limitations: string[]; // evidence limitations, stated plainly
  interviewFollowUps: string[];
  generatedAt: string;
}
