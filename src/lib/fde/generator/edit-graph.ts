/**
 * edit-graph.ts — dependency-aware edit propagation for employer studio edits.
 *
 * Graph:
 *   rootCause → artifacts, evidence
 *   duration → episodes
 *   aiPolicy → ai rules
 */
export const EDIT_GRAPH_VERSION = "edit-graph-v1";

export type EditSection =
  | "rootCause"
  | "artifacts"
  | "evidence"
  | "duration"
  | "episodes"
  | "aiPolicy"
  | "aiRules"
  | "curveballs"
  | "coverage"
  | "validation";

export type EditChange = {
  section: EditSection;
  field?: string;
  previousValue?: unknown;
  nextValue?: unknown;
};

const DEPENDENCY_GRAPH: Record<EditSection, EditSection[]> = {
  rootCause: ["artifacts", "evidence", "validation"],
  artifacts: ["evidence", "validation"],
  evidence: ["validation", "coverage"],
  duration: ["episodes", "curveballs", "coverage", "validation"],
  episodes: ["curveballs", "coverage", "validation"],
  aiPolicy: ["aiRules", "validation"],
  aiRules: ["validation"],
  curveballs: ["validation"],
  coverage: ["validation"],
  validation: [],
};

const SECTION_LABELS: Record<EditSection, string> = {
  rootCause: "Hidden root cause",
  artifacts: "Artifacts and files",
  evidence: "Evidence rules",
  duration: "Duration budget",
  episodes: "Episode plan",
  aiPolicy: "AI usage policy",
  aiRules: "AI enforcement rules",
  curveballs: "Curveballs",
  coverage: "Competency coverage",
  validation: "Validation gates",
};

export function affectedSections(change: EditChange): EditSection[] {
  const direct = DEPENDENCY_GRAPH[change.section] ?? [];
  const affected = new Set<EditSection>([change.section, ...direct]);
  return [...affected];
}

export function describeEditImpact(change: EditChange): string {
  const sections = affectedSections(change);
  const labels = sections.map((s) => SECTION_LABELS[s]);
  const fieldSuffix = change.field ? ` (${change.field})` : "";
  return `Editing ${SECTION_LABELS[change.section]}${fieldSuffix} will require regenerating or re-validating: ${labels.join(", ")}.`;
}
