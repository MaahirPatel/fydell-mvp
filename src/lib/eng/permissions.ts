export type OrgRole = "owner" | "admin" | "hiring_manager" | "reviewer" | "viewer";

export type EngAction =
  | "view_roles"
  | "manage_roles"
  | "invite_candidates"
  | "manage_invitations"
  | "view_attempts"
  | "view_reports"
  | "write_reports"
  | "retry_evaluation"
  | "record_decision"
  | "write_notes"
  | "flag_finding"
  | "manage_members";

/**
 * Server routes enforce this matrix on every request; pages only use it to
 * hide controls. Viewers can follow progress but cannot read evidence. The
 * people who read evidence also write the report: there is no separate
 * Fydell reviewer in the paid workflow.
 */
export const ENG_PERMISSIONS: Record<EngAction, readonly OrgRole[]> = {
  view_roles: ["owner", "admin", "hiring_manager", "reviewer", "viewer"],
  manage_roles: ["owner", "admin", "hiring_manager"],
  invite_candidates: ["owner", "admin", "hiring_manager"],
  manage_invitations: ["owner", "admin", "hiring_manager"],
  view_attempts: ["owner", "admin", "hiring_manager", "reviewer", "viewer"],
  view_reports: ["owner", "admin", "hiring_manager", "reviewer"],
  write_reports: ["owner", "admin", "hiring_manager", "reviewer"],
  retry_evaluation: ["owner", "admin", "hiring_manager", "reviewer"],
  record_decision: ["owner", "admin", "hiring_manager", "reviewer"],
  write_notes: ["owner", "admin", "hiring_manager", "reviewer"],
  flag_finding: ["owner", "admin", "hiring_manager", "reviewer"],
  manage_members: ["owner", "admin"],
};

export function roleCan(role: OrgRole, action: EngAction): boolean {
  return ENG_PERMISSIONS[action].includes(role);
}

export const ORG_ROLES: readonly OrgRole[] = ["owner", "admin", "hiring_manager", "reviewer", "viewer"];

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && (ORG_ROLES as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  hiring_manager: "Hiring manager",
  reviewer: "Reviewer",
  viewer: "Viewer",
};
