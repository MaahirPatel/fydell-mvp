import type { PlatformRole } from "@/lib/ops/platform-roles";

/**
 * Admin capabilities. Roles are granted in platform_user_roles; every admin page
 * and API names the capability it needs instead of an ad-hoc role list.
 *
 * No capability grants default access to private candidate code. Reading it
 * requires `private_code.break_glass`, a written justification and a
 * time-limited grant recorded in the audit log (see admin-access.ts).
 */
export type AdminPermission =
  | "ops.view"
  | "ops.act"
  | "accounts.view"
  | "accounts.support"
  | "accounts.suspend"
  | "accounts.membership"
  | "roles.manage"
  | "reports.review"
  | "commercial.view"
  | "commercial.edit"
  | "attempt.grant"
  | "incident.review"
  | "audit.view"
  | "data_requests.handle"
  | "notifications.view"
  | "invitations.manage"
  | "private_code.break_glass"
  | "settings.manage";

const MATRIX: Record<AdminPermission, readonly PlatformRole[]> = {
  "ops.view": ["super_admin", "admin", "operator", "support"],
  "ops.act": ["super_admin", "admin", "operator"],
  "accounts.view": ["super_admin", "admin", "operator", "support"],
  "accounts.support": ["super_admin", "admin", "support"],
  "accounts.suspend": ["super_admin", "admin"],
  // Adding someone to an organization grants access to its private data.
  "accounts.membership": ["super_admin"],
  "roles.manage": ["super_admin"],
  "reports.review": ["super_admin", "admin", "reviewer"],
  "commercial.view": ["super_admin", "admin", "support"],
  "commercial.edit": ["super_admin", "admin"],
  "attempt.grant": ["super_admin", "admin"],
  "incident.review": ["super_admin", "admin", "operator", "support"],
  "audit.view": ["super_admin", "admin"],
  "data_requests.handle": ["super_admin", "admin"],
  "notifications.view": ["super_admin", "admin", "operator", "support"],
  "invitations.manage": ["super_admin", "admin", "operator", "support"],
  "private_code.break_glass": ["super_admin", "admin", "reviewer"],
  "settings.manage": ["super_admin"],
};

export const ADMIN_PERMISSIONS = Object.keys(MATRIX) as AdminPermission[];

export function rolesFor(permission: AdminPermission): readonly PlatformRole[] {
  return MATRIX[permission];
}

export function hasPermission(roles: readonly PlatformRole[], permission: AdminPermission): boolean {
  const allowed = MATRIX[permission];
  return roles.some((role) => allowed.includes(role));
}

export function permissionsFor(roles: readonly PlatformRole[]): AdminPermission[] {
  return ADMIN_PERMISSIONS.filter((p) => hasPermission(roles, p));
}

/** Any platform role may enter the admin shell; each page then checks its own capability. */
export const ADMIN_SHELL_ROLES: readonly PlatformRole[] = ["super_admin", "admin", "operator", "reviewer", "support"];
