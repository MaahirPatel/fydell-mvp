import { FileChartColumn, FolderGit2, House, IdCard, Send, SquareTerminal, type LucideIcon } from "lucide-react";
import type { CandidateSection } from "./section";

export type CandidateNavItem = {
  key: Exclude<CandidateSection, "settings">;
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * The places an engineer works in. Builder Reports open from their project, so
 * Projects is where reports are listed. Settings and Help sit apart, at the
 * foot of the sidebar.
 */
export const CANDIDATE_NAV: readonly CandidateNavItem[] = [
  { key: "assessments", label: "Overview and tasks", href: "/app/candidate", icon: House },
  { key: "work", label: "Projects", href: "/app/candidate/work-record", icon: FolderGit2 },
  { key: "reports", label: "Reports", href: "/app/candidate/reports", icon: FileChartColumn },
  { key: "profile", label: "Profile & Passport", href: "/app/candidate/profile", icon: IdCard },
  { key: "applications", label: "Applications", href: "/app/candidate/applications", icon: Send },
  { key: "practice", label: "Practice simulation", href: "/app/candidate/practice", icon: SquareTerminal },
];

export const SECTION_LABEL: Record<CandidateSection, string> = {
  assessments: "Overview and tasks",
  work: "Projects",
  reports: "Reports",
  profile: "Profile & Passport",
  applications: "Applications",
  practice: "Practice simulation",
  settings: "Settings",
};

export const SECTION_HREF: Record<CandidateSection, string> = {
  assessments: "/app/candidate",
  work: "/app/candidate/work-record",
  reports: "/app/candidate/reports",
  profile: "/app/candidate/profile",
  applications: "/app/candidate/applications",
  practice: "/app/candidate/practice",
  settings: "/app/candidate/settings",
};

/** Where "Share profile" goes: the Sharing panel on the projects page, which creates and revokes links. */
export const SHARE_HREF = "/app/candidate/work-record#share";
