/**
 * Employer chunk - REP-06: report permissions.
 *
 * Only authorized reviewers see employer reports:
 * - the viewer must be an active member of the report's organization, and
 * - the viewer's org role must be one that reviews candidates
 *   (owner / admin / reviewer).
 *
 * Candidates, billing-only members, members of other orgs, and
 * unauthenticated callers are denied. Scoped export/download checks reuse
 * the same predicate (see sharing.ts for link-scoped access).
 */

import type { DecisionBrief } from "./types";

export type OrgRole = "owner" | "admin" | "reviewer" | "billing" | "member";

const REVIEWER_ROLES: ReadonlySet<OrgRole> = new Set(["owner", "admin", "reviewer"]);

export interface ReportViewer {
  userId: string | null;
  orgId: string | null;
  orgRole: OrgRole | null;
  /** True when the viewer is the candidate the report describes. */
  isCandidate: boolean;
}

export interface ReportIdentity {
  orgId: string;
}

export type PermissionError =
  | "unauthenticated"
  | "wrong_organization"
  | "role_not_permitted";

export function canViewReport(
  viewer: ReportViewer,
  report: ReportIdentity
): { ok: true } | { ok: false; code: PermissionError; message: string } {
  if (!viewer.userId) {
    return { ok: false, code: "unauthenticated", message: "sign in is required" };
  }
  if (!viewer.orgId || viewer.orgId !== report.orgId) {
    return {
      ok: false,
      code: "wrong_organization",
      message: "this report belongs to a different organization",
    };
  }
  if (viewer.isCandidate) {
    // Candidates never see the employer report surface; they get the
    // candidate-safe passport evidence instead (see notes.ts).
    return {
      ok: false,
      code: "role_not_permitted",
      message: "candidates do not have access to employer reports",
    };
  }
  if (!viewer.orgRole || !REVIEWER_ROLES.has(viewer.orgRole)) {
    return {
      ok: false,
      code: "role_not_permitted",
      message: `org role ${viewer.orgRole ?? "none"} cannot view employer reports`,
    };
  }
  return { ok: true };
}

/** Export/download inherits the view permission; sensitivity labels travel with the artifact. */
export function canExportReport(
  viewer: ReportViewer,
  report: ReportIdentity
): { ok: true } | { ok: false; code: PermissionError; message: string } {
  return canViewReport(viewer, report);
}

export function sensitivityLabel(brief: DecisionBrief): string {
  return `CONFIDENTIAL. Employer hiring evidence · ${brief.roleTitle} · report v${brief.reportVersion} · ${brief.scenarioVersion}`;
}
