export type CandidateSection = "profile" | "work" | "applications" | "practice" | "assessments" | "settings";

/** Which candidate nav item a path belongs to, for pages rendered outside their route (errors, not found). */
export function candidateSectionFor(pathname: string | null | undefined): CandidateSection {
  const path = pathname ?? "";
  if (path.startsWith("/app/candidate/profile")) return "profile";
  if (path.startsWith("/app/candidate/work-record") || path.startsWith("/app/candidate/projects") || path.startsWith("/app/candidate/passport")) return "work";
  if (path.startsWith("/app/candidate/applications")) return "applications";
  if (path.startsWith("/app/candidate/practice")) return "practice";
  if (path.startsWith("/app/candidate/settings")) return "settings";
  return "assessments";
}
