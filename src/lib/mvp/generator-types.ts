// Structured schema for the Simulation Generator (Deliverable B).
// This is a deterministic template engine with optional LLM enrichment — not
// an ML model. Output is validated, then saved to the `simulations` table as a
// DRAFT (scenario_json / resources_json / rubric_json), reusing Deliverable A's
// schema rather than duplicating it.

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type SimulationStyle =
  | "case_analysis"
  | "inbox_triage"
  | "spreadsheet_analysis"
  | "customer_conversation"
  | "incident_response"
  | "product_decision"
  | "operations_prioritization"
  | "written_recommendation";

export type ResourceType =
  | "memo"
  | "spreadsheet"
  | "presentation"
  | "market_data"
  | "email"
  | "chat"
  | "document";

export type CurveballType =
  | "new_information"
  | "manager_message"
  | "constraint_change"
  | "data_conflict";

export type TeamSenderRole = "Manager" | "Associate" | "Reviewer";

export interface DraftScenario {
  background: string;
  candidate_role: string;
  business_problem: string;
  success_definition: string;
  constraints: string[];
  ambiguity_points: string[];
}

export interface DraftCandidateBrief {
  opening_message: string;
  instructions: string[];
  deliverables: string[];
  time_limit_minutes: number;
}

export interface DraftResource {
  id: string;
  title: string;
  type: ResourceType;
  summary: string;
  content: string;
  relevance: string;
}

export interface DraftPhase {
  id: string;
  title: string;
  duration_minutes: number;
  objective: string;
  expected_actions: string[];
}

export interface DraftCurveball {
  trigger_minute: number;
  type: CurveballType;
  message: string;
  expected_response: string;
}

export interface DraftTeamMessage {
  sender_role: TeamSenderRole;
  minute: number;
  message: string;
  purpose: string;
}

export interface DraftRubricDimension {
  dimension: string;
  description: string;
  weight: number;
  levels: {
    weak: string;
    adequate: string;
    strong: string;
    exceptional: string;
  };
  evidence_sources: string[];
}

export interface DraftEvidenceCapture {
  event_type: string;
  description: string;
  why_it_matters: string;
}

export interface DraftReportTemplate {
  summary_sections: string[];
  skill_breakdown: string[];
  interview_followups: string[];
}

export interface SimulationDraft {
  title: string;
  role: string;
  industry: string;
  seniority: string;
  difficulty: Difficulty;
  duration_minutes: number;
  simulation_type: SimulationStyle;
  description: string;
  scenario: DraftScenario;
  candidate_brief: DraftCandidateBrief;
  resources: DraftResource[];
  phases: DraftPhase[];
  objectives: string[];
  curveballs: DraftCurveball[];
  team_messages: DraftTeamMessage[];
  rubric: DraftRubricDimension[];
  evidence_capture: DraftEvidenceCapture[];
  report_template: DraftReportTemplate;
}

// Input collected from the generator form (the 4 sections in the brief).
export interface GeneratorInput {
  // Section 1 — Role basics
  role_title: string;
  industry: string;
  seniority: string;
  department?: string;
  duration_minutes: number;
  difficulty: Difficulty;
  // Section 2 — Role context
  job_description?: string;
  great_performance?: string;
  failure_modes?: string;
  real_tasks?: string;
  tools_documents?: string;
  // Section 3 — Skills & evaluation
  required_skills?: string[];
  nice_to_have?: string[];
  evaluation_criteria?: string[];
  must_have_behaviors?: string[];
  disqualifying_behaviors?: string[];
  // Section 4 — Simulation style
  simulation_type: SimulationStyle;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  warnings: string[];
}
