import type { OrgRole } from "@/lib/eng/permissions";

export interface WorkspaceOrganization {
  id: string;
  name: string;
  role: OrgRole;
}

/**
 * Every place one account can work in: the personal workspace, which always
 * exists, and each organization the person is an active member of.
 */
export interface WorkspaceContexts {
  organizations: WorkspaceOrganization[];
  /** The organization `/app/employer` opens, resolved the same way its pages resolve it. */
  activeOrganizationId: string | null;
  /** Whether a share link is live, so "View my public profile" has something real behind it. */
  hasPublicProfile: boolean;
}

/** Which of the account's contexts the current page belongs to. */
export type WorkspaceContextKind = "personal" | "organization";

export const PERSONAL_HOME = "/app/candidate";
export const ORGANIZATION_HOME = "/app/employer";
export const CREATE_ORGANIZATION_HREF = "/onboarding/employer";
export const HELP_HREF = "/contact";
/** What a share-link recipient sees, rendered for the owner. Nothing is created by opening it. */
export const PUBLIC_PROFILE_PREVIEW_HREF = "/app/candidate/work-record/preview";
export const PUBLIC_PROFILE_SETUP_HREF = "/app/candidate/work-record#share";
