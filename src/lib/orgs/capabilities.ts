/**
 * What each workspace role may do (AUTH-04). Roles are the values allowed by
 * organization_members.role (migration 007). Routes check a capability, not a
 * role name, so the matrix is the single place that grants access.
 *
 * - owner / admin: everything, including billing and membership.
 * - hiring_manager: runs hiring work (invite, resend, revoke candidates;
 *   record decisions) but not billing or membership.
 * - reviewer: reads hiring work and records review decisions; cannot invite
 *   or revoke candidates.
 * - viewer: read-only.
 */

export const ORG_ROLES = ["owner", "admin", "hiring_manager", "reviewer", "viewer"] as const;
export type OrgRoleName = (typeof ORG_ROLES)[number];

export type OrgCapability =
  | "manage_candidates"
  | "record_decisions"
  | "view_hiring_work"
  | "manage_billing"
  | "manage_members";

const MATRIX: Record<OrgCapability, readonly OrgRoleName[]> = {
  manage_candidates: ["owner", "admin", "hiring_manager"],
  record_decisions: ["owner", "admin", "hiring_manager", "reviewer"],
  view_hiring_work: ["owner", "admin", "hiring_manager", "reviewer", "viewer"],
  manage_billing: ["owner", "admin"],
  manage_members: ["owner", "admin"],
};

/** Unknown or missing roles get nothing. */
export function orgCan(role: string | null | undefined, capability: OrgCapability): boolean {
  return Boolean(role) && (MATRIX[capability] as readonly string[]).includes(role as string);
}

const DENIED: Record<OrgCapability, string> = {
  manage_candidates: "Your role cannot invite, resend or revoke candidates. Ask a workspace owner, admin or hiring manager.",
  record_decisions: "Your role cannot record hiring decisions. Ask a workspace owner, admin, hiring manager or reviewer.",
  view_hiring_work: "Your role cannot view hiring work in this workspace.",
  manage_billing: "Only a workspace owner or admin can manage billing.",
  manage_members: "Only a workspace owner or admin can manage members.",
};

export function capabilityDeniedMessage(capability: OrgCapability): string {
  return DENIED[capability];
}
