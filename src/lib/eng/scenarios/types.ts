export type RubricDimensionKey =
  | "correctness"
  | "engineering_judgment"
  | "requirement_response"
  | "work_communication";

export interface RubricAnchor {
  level: "strong" | "adequate" | "weak" | "insufficient_evidence";
  observable: string;
}

export interface RubricDimension {
  key: RubricDimensionKey;
  label: string;
  question: string;
  evidenceSources: ("tests" | "code" | "messages" | "handoff" | "update")[];
  anchors: RubricAnchor[];
  limitations: string;
}

export interface Teammate {
  id: string;
  name: string;
  title: string;
}

export interface ClarificationRule {
  id: string;
  teammateId: string;
  /** Each group is a set of alternative tokens; a group matches when any token is present. */
  signals: string[][];
  minGroups: number;
  /** Rules gated on world state. */
  availability: "always" | "before_update" | "after_update";
  answer: string;
}

export interface RequirementUpdate {
  id: string;
  teammateId: string;
  releaseAfterMinutes: number;
  title: string;
  body: string;
}

export interface ScenarioDefinition {
  key: string;
  version: number;
  title: string;
  roleFamily: "backend_engineer";
  suiteVersion: string;
  rubricVersion: string;
  summary: string;
  candidateBrief: string[];
  /** What the task asks for before the requirement update. Mirrors INCIDENT.md. */
  initialRequirements: string[];
  resources: { path: string; description: string }[];
  testCommands: { windows: string; unix: string };
  setupCommands: { windows: string; unix: string };
  stack: string[];
  targetMinutes: number;
  defaultAllowedMinutes: number;
  submissionGraceMinutes: number;
  prerequisites: string[];
  supportedEnvironments: { label: string; status: "validated" | "expected" | "unsupported"; note: string }[];
  aiPolicy: string[];
  packaging: string[];
  accommodations: string[];
  starterRoot: string;
  setupCodePrefix: string;
  supportedRuntimes: string[];
  teammates: Teammate[];
  fallbackRuleId: string;
  clarificationRules: ClarificationRule[];
  requirementUpdate: RequirementUpdate;
  handoffPrompts: { field: "what_changed" | "testing" | "risks"; label: string; help: string }[];
  rubric: RubricDimension[];
  knownIssues: string[];
  reviewRecord: {
    validatedAt: string;
    validatedBy: string;
    command: string;
    fixtures: string[];
    humanReviewRequired: true;
  };
}
