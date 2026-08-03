/**
 * SimulationDefinitionV2 - versioned measurement contract for the vertical slice.
 *
 * Answer keys, rubric anchors, opportunity weights, and scoring config live on
 * the full definition only. Candidate-safe projections must strip them via
 * toV2CandidateView.
 */
import type { RoleKey, SimulationStakeholder } from "../types";
import type { MicroConcept, MicroSimContent } from "../micro-types";

export type ModuleKindV2 =
  | "briefing"
  | "resource_table"
  | "resource_doc"
  | "data_workbench"
  | "requirements_board"
  | "ticket_queue"
  | "cutover_plan"
  | "rules_panel"
  | "structured_decision"
  | "written_deliverable"
  | "stakeholder"
  | "curveball";

export interface BriefingModule {
  id: string;
  kind: "briefing";
  title: string;
  body: string;
}

export interface ResourceTableModule {
  id: string;
  kind: "resource_table";
  resourceId: string;
  title: string;
  content: string;
}

export interface ResourceDocModule {
  id: string;
  kind: "resource_doc";
  resourceId: string;
  title: string;
  content: string;
}

export interface DataWorkbenchModule {
  id: string;
  kind: "data_workbench";
  title: string;
  instructions?: string;
  /** Resource ids of table modules available in the workbench. */
  tableResourceIds: string[];
}

/** Solutions Engineer: compare customer requirements vs product capabilities. */
export interface RequirementsBoardModule {
  id: string;
  kind: "requirements_board";
  title: string;
  instructions?: string;
  requirementsResourceId: string;
  capabilitiesResourceId: string;
}

/** Technical Support: triage ticket-like rows. */
export interface TicketQueueModule {
  id: string;
  kind: "ticket_queue";
  title: string;
  instructions?: string;
  ticketResourceId: string;
}

export interface CutoverStepV2 {
  id: string;
  label: string;
  detail?: string;
}

/** Implementation Consultant: ordered cutover / dependency checklist. */
export interface CutoverPlanModule {
  id: string;
  kind: "cutover_plan";
  title: string;
  instructions?: string;
  steps: CutoverStepV2[];
  sourceResourceIds: string[];
}

/** Business Systems Analyst: workflow rules with expandable detail. */
export interface RulesPanelModule {
  id: string;
  kind: "rules_panel";
  title: string;
  instructions?: string;
  rulesResourceId: string;
  contextResourceIds?: string[];
}

export type StructuredDecisionKind = "single_select" | "multi_select" | "number";

export interface StructuredDecisionModule {
  id: string;
  kind: "structured_decision";
  prompt: string;
  helpText?: string;
  decisionKind: StructuredDecisionKind;
  options?: string[];
  competencyKey: string;
  expectedEvidence?: string;
  /** Relative weight seed (from micro points). Scoring uses ScoringConfigV2. */
  points?: number;
  /** Answer key - full definition only. */
  answer?: (string | number)[];
}

export interface WrittenDeliverableModule {
  id: string;
  kind: "written_deliverable";
  prompt: string;
  helpText?: string;
  maxChars?: number;
  competencyKey: string;
  expectedEvidence?: string;
  points?: number;
  /** Concept checklist / answer key - full definition only. */
  concepts?: MicroConcept[];
}

export interface StakeholderModule {
  id: string;
  kind: "stakeholder";
  stakeholderId: string;
  title?: string;
  competencyKey?: string;
  points?: number;
}

export interface CurveballModule {
  id: string;
  kind: "curveball";
  announcement: string;
  requiredAdaptation: string;
  stakeholderId?: string;
}

export type SimulationModuleV2 =
  | BriefingModule
  | ResourceTableModule
  | ResourceDocModule
  | DataWorkbenchModule
  | RequirementsBoardModule
  | TicketQueueModule
  | CutoverPlanModule
  | RulesPanelModule
  | StructuredDecisionModule
  | WrittenDeliverableModule
  | StakeholderModule
  | CurveballModule;

export interface EvidenceOpportunity {
  id: string;
  competencyKey: string;
  weight: number;
  label: string;
  /** Semantic signal keys that must be observed for the opportunity to count as covered. */
  requiredSignals: string[];
}

export interface RubricIndicator {
  id: string;
  competencyKey: string;
  weight: number;
  anchors: {
    strong: string;
    partial: string;
    weak: string;
  };
}

export interface ScoringConfigV2 {
  opportunities: EvidenceOpportunity[];
  indicators: RubricIndicator[];
  /** Competency key → relative weight; should sum ≈ 1. */
  competencyWeights: Record<string, number>;
}

export interface CompetencyV2 {
  key: string;
  label: string;
}

export interface SimulationDefinitionV2 {
  format: "v2";
  schemaVersion: 2;
  id: string;
  slug: string;
  roleKey: RoleKey;
  title: string;
  tagline: string;
  mission: string;
  companyName: string;
  durationMinutes: number;
  version: number;
  modules: SimulationModuleV2[];
  competencies: CompetencyV2[];
  stakeholders: SimulationStakeholder[];
  scoring: ScoringConfigV2;
  /**
   * Original micro content retained for scoring fallback during migration.
   * Never exposed in candidate views.
   */
  legacyMicro?: MicroSimContent;
}

export function isV2Content(content: unknown): content is SimulationDefinitionV2 {
  return Boolean(
    content &&
      typeof content === "object" &&
      (content as { format?: string }).format === "v2" &&
      (content as { schemaVersion?: number }).schemaVersion === 2
  );
}
