export type WorkspaceNavLabel =
  | "Overview"
  | "Roles"
  | "Applicants"
  | "Reviews"
  | "Work samples"
  | "Team"
  | "Task attempts"
  | "Task library"
  | "Work"
  | "Evidence"
  | "Work Receipts"
  | "Outcomes"
  | "Settings";

export type WorkspaceNavItem = {
  href: string;
  label: WorkspaceNavLabel;
  exact?: boolean;
};

/**
 * Two kinds of group, in the order they appear in the rail: unlabelled top
 * destinations, and a labelled section that starts collapsed because it holds
 * lower-traffic records.
 */
export type WorkspaceNavGroup =
  | { kind: "primary"; items: WorkspaceNavItem[] }
  | { kind: "collapsible"; label: "More"; items: WorkspaceNavItem[] };

/**
 * The organization workspace is organized around the hiring decision. Every
 * active member can open each of these pages; what a member may change on
 * them is decided by the server per request. The records that hiring produces
 * sit under More, which opens on its own whenever the current page lives
 * inside it.
 */
export const WORKSPACE_NAV_GROUPS: WorkspaceNavGroup[] = [
  {
    kind: "primary",
    items: [
      { href: "/app/employer", label: "Overview", exact: true },
      { href: "/app/employer/openings", label: "Roles" },
      { href: "/app/employer/candidates", label: "Applicants" },
      { href: "/app/employer/passports", label: "Reviews" },
      { href: "/app/employer/work-samples", label: "Work samples" },
      { href: "/app/employer/team", label: "Team" },
    ],
  },
  {
    kind: "collapsible",
    label: "More",
    items: [
      { href: "/app/employer/engineering", label: "Task attempts" },
      { href: "/app/employer/roles", label: "Task library" },
      { href: "/app/employer/work", label: "Work" },
      { href: "/app/employer/evidence", label: "Evidence" },
      { href: "/app/employer/receipts", label: "Work Receipts" },
      { href: "/app/employer/outcomes", label: "Outcomes" },
    ],
  },
];

export const WORKSPACE_SETTINGS_ITEM: WorkspaceNavItem = {
  href: "/app/employer/settings",
  label: "Settings",
};

export const WORKSPACE_NAV_ITEMS = [
  ...WORKSPACE_NAV_GROUPS.flatMap((group) => group.items),
  WORKSPACE_SETTINGS_ITEM,
];

export function isNavItemActive(item: WorkspaceNavItem, pathname: string): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function workspaceSection(pathname: string): WorkspaceNavItem {
  return WORKSPACE_NAV_ITEMS.find((item) => isNavItemActive(item, pathname)) ?? WORKSPACE_NAV_ITEMS[0];
}

/** True when the current page is one of the group's destinations. */
export function groupContainsPath(group: WorkspaceNavGroup, pathname: string): boolean {
  return group.items.some((item) => isNavItemActive(item, pathname));
}
