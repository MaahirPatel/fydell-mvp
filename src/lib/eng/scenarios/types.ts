export type RubricDimensionKey =
  | "correctness"
  | "engineering_judgment"
  | "requirement_response"
  | "work_communication";

/** Rubric v1 scale. Kept so reports released under v1 still render. */
export type LegacyRubricLevel = "strong" | "adequate" | "weak" | "insufficient_evidence";

/**
 * Rubric v2 scale. Describes the work against a defined criterion, never the
 * person. "not_assessed" is not a low result and is never averaged into one.
 */
export type AssessmentState =
  | "concern_observed"
  | "partially_demonstrated"
  | "demonstrated"
  | "demonstrated_additional"
  | "not_assessed";

export type RubricLevel = LegacyRubricLevel | AssessmentState;

export interface RubricAnchor {
  level: RubricLevel;
  observable: string;
}

/** A task-specific criterion with its own anchors and, where possible, the defined checks that test it. */
export interface RubricCriterion {
  id: string;
  label: string;
  /** What "demonstrated" means for this task, in one sentence. */
  requirement: string;
  /** Probe ids from the evaluator. Empty for criteria a reviewer judges from code, messages or the handoff. */
  probeIds: string[];
  anchors: { state: AssessmentState; observable: string }[];
  /** Behavior this criterion does not cover, so the report can say so. */
  notCovered: string;
  /** Candidate-facing next step when the criterion is not demonstrated. Must not reveal hidden inputs. */
  improvement?: string;
  /** How the candidate could check the behavior themselves. */
  recheck?: string;
}

export interface RubricDimension {
  key: RubricDimensionKey;
  label: string;
  question: string;
  evidenceSources: ("tests" | "code" | "messages" | "handoff" | "update")[];
  anchors: RubricAnchor[];
  limitations: string;
  criteria?: RubricCriterion[];
}

export interface Teammate {
  id: string;
  name: string;
  title: string;
  /** Shown to the candidate: what to ask this person about. */
  askAbout?: string;
}

/** Server-only voice for a teammate. Never stored in published scenario content. */
export interface TeammatePersona {
  relationship: "manager" | "peer" | "stakeholder";
  voice: string;
  owns: string;
  /** Topics this person defers to someone else on, by teammate id. */
  defersTo?: { teammateId: string; topics: string }[];
}

export interface ScenarioMessage {
  teammateId: string;
  body: string;
}

export interface ClarificationRule {
  /** When the keyword policy matches this rule, generated replies must include it (for example the identity disclosure). */
  mandatory?: boolean;
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
  /** Keyed by teammate id. Drives generated replies; facts still come only from clarificationRules. */
  personas: Record<string, TeammatePersona>;
  /** Posted by the lead the moment the timer starts. */
  kickoff: ScenarioMessage;
  /** Company and team context the teammates share. Never includes hidden checks. */
  teamContext: string;
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
