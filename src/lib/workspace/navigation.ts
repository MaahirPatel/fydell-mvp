export type WorkspaceNavLabel =
  | "Home"
  | "Engineering tasks"
  | "Roles"
  | "Candidates"
  | "Shared passports"
  | "Work"
  | "Evidence"
  | "Work Receipts"
  | "Outcomes"
  | "Team"
  | "Settings";

export type WorkspaceNavItem = {
  href: string;
  label: WorkspaceNavLabel;
  exact?: boolean;
};

export type WorkspaceNavGroup = {
  label: "Hiring" | "Proof" | null;
  items: WorkspaceNavItem[];
};

/**
 * The employer workspace is organized around the hiring decision, not around
 * the implementation mechanisms that happen to produce evidence.
 */
export const WORKSPACE_NAV_GROUPS: WorkspaceNavGroup[] = [
  {
    label: null,
    items: [{ href: "/app/employer", label: "Home", exact: true }],
  },
  {
    label: "Hiring",
    items: [
      { href: "/app/employer/engineering", label: "Engineering tasks" },
      { href: "/app/employer/roles", label: "Roles" },
      { href: "/app/employer/candidates", label: "Candidates" },
      { href: "/app/employer/passports", label: "Shared passports" },
      { href: "/app/employer/work", label: "Work" },
    ],
  },
  {
    label: "Proof",
    items: [
      { href: "/app/employer/evidence", label: "Evidence" },
      { href: "/app/employer/receipts", label: "Work Receipts" },
    ],
  },
  {
    label: null,
    items: [
      { href: "/app/employer/outcomes", label: "Outcomes" },
      { href: "/app/employer/team", label: "Team" },
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

export function workspaceSection(pathname: string): WorkspaceNavItem {
  return (
    WORKSPACE_NAV_ITEMS.find((item) =>
      item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? WORKSPACE_NAV_ITEMS[0]
  );
}
