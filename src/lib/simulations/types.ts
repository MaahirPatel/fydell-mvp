/**
 * Content model for Applied Technical Role simulations.
 *
 * A simulation template's authored content is one versioned document
 * (SimulationContent) stored on sim_template_versions.content. Publishing
 * creates a new immutable version; sessions pin the version that was active
 * when the invitation was created, so editing a template never mutates
 * historical evidence.
 */

export type RoleKey =
  | "data_analyst"
  | "bi_analyst"
  | "solutions_engineer"
  | "implementation_consultant"
  | "technical_support_engineer"
  | "business_systems_analyst";

export type PathwayKey = "data_analytics" | "solutions_delivery" | "technical_operations";

export interface RoleDefinition {
  key: RoleKey;
  pathway: PathwayKey;
  title: string;
  shortDescription: string;
  whatTheyDo: string;
  whyHardToEvaluate: string;
  skillsEvaluated: string[];
  /** Featured simulation, shown first everywhere. */
  simulationSlug: string;
  /** All published simulations for this role, featured first. */
  simulationSlugs: string[];
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export type ResourceKind = "csv" | "markdown" | "json" | "text" | "log" | "image";

export interface SimulationResource {
  id: string;
  title: string;
  /** Filename shown to the candidate, e.g. orders.csv */
  filename: string;
  kind: ResourceKind;
  description: string;
  /** Inline content for csv/markdown/json/text/log. Images use `url`. */
  content?: string;
  url?: string;
  downloadable: boolean;
}

// ---------------------------------------------------------------------------
// Task steps
// ---------------------------------------------------------------------------

export interface TaskStep {
  id: string;
  title: string;
  /** Short candidate-facing guidance for the step. */
  summary: string;
  /**
   * How the step is considered complete:
   *  - "confirm": candidate explicitly marks it done
   *  - "auto:<eventType>": completes when a qualifying event occurs
   *  - "deliverable:<fieldKey>": completes when the deliverable field is non-empty
   */
  completion: string;
}

// ---------------------------------------------------------------------------
// Stakeholders + deterministic response map
// ---------------------------------------------------------------------------

export interface StakeholderResponseRule {
  id: string;
  /** Higher priority rules are evaluated first. */
  priority: number;
  /** Rule matches if ANY of these keywords appear (case-insensitive). */
  anyKeywords: string[];
  /** If present, ALL of these must also appear. */
  allKeywords?: string[];
  reply: string;
  /** Rule fires at most once per session when true. */
  onceOnly?: boolean;
  /** Only active after the curveball has been presented. */
  requiresCurveball?: boolean;
}

export interface SimulationStakeholder {
  id: string;
  name: string;
  role: string;
  /** One-line context shown in the drawer header. */
  blurb: string;
  /** What this stakeholder knows and may reveal (drives authored replies). */
  knowledge: string[];
  /** What this stakeholder must never reveal (hidden answers). */
  withholds: string[];
  responseRules: StakeholderResponseRule[];
  /** Used when no rule matches. Should ask a useful clarifying question back. */
  fallbackReply: string;
  /** Optional style hints for an AI reply drafter (server-side only). */
  aiPersona?: string;
}

// ---------------------------------------------------------------------------
// Curveball
// ---------------------------------------------------------------------------

export interface SimulationCurveball {
  id: string;
  /** Which stakeholder announces it. */
  stakeholderId: string;
  announcement: string;
  /** What the candidate is asked to do about it. */
  requiredAdaptation: string;
  /**
   * Presented when EITHER threshold is crossed (whichever comes first),
   * and only after `minEvents` meaningful events exist:
   *  - elapsedRatio: fraction of total session time elapsed (0..1)
   *  - minEvents: minimum recorded candidate events before eligible
   */
  triggerElapsedRatio: number;
  minEvents: number;
}

// ---------------------------------------------------------------------------
// Deliverable
// ---------------------------------------------------------------------------

export type DeliverableFieldKind = "short_text" | "long_text" | "number" | "select";

export interface DeliverableField {
  key: string;
  label: string;
  kind: DeliverableFieldKind;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  /** Rough word-count guidance for long answers, shown as helper text. */
  maxWords?: number;
}

// ---------------------------------------------------------------------------
// Deterministic checks (Layer 1 evaluation)
// ---------------------------------------------------------------------------

export type DeterministicCheckKind =
  | "number_close" // numeric field within tolerance of expected
  | "contains_any" // text field contains at least one expected phrase
  | "contains_all" // text field contains all expected phrases
  | "field_nonempty" // field has content
  | "select_equals" // select field matches expected option
  | "event_exists" // a qualifying session event was recorded
  | "min_length"; // text field has at least N words

export interface DeterministicCheck {
  id: string;
  competencyKey: string;
  indicator: string;
  kind: DeterministicCheckKind;
  /** Deliverable field key, or event type for event_exists. */
  target: string;
  /** number_close: [expected, tolerance]; contains_*: phrases; select_equals: [option]; min_length: [words] */
  expected: (string | number)[];
  rubricWeight: number;
  relevance: number;
  /** Quality when the check passes / fails. Partial credit possible later. */
  passQuality: number;
  failQuality: number;
}

// ---------------------------------------------------------------------------
// Rubric (Layer 2, anchored AI evaluation)
// ---------------------------------------------------------------------------

export interface RubricIndicator {
  id: string;
  competencyKey: string;
  indicator: string;
  /** Anchors describing 0.0 / 0.5 / 1.0 quality for the evaluator. */
  anchorLow: string;
  anchorMid: string;
  anchorHigh: string;
  rubricWeight: number;
  relevance: number;
}

export interface CompetencyDefinition {
  key: string;
  label: string;
  description: string;
  weight: number;
  targetEvidenceWeight: number;
  critical?: boolean;
}

// ---------------------------------------------------------------------------
// Answer key (internal; never exposed to candidates or the AI assistant)
// ---------------------------------------------------------------------------

export interface AnswerKey {
  summary: string;
  rootCause?: string;
  correctValues?: Record<string, number>;
  keyFindings: string[];
  /** At least one valid alternative approach that also earns credit. */
  validAlternatives: string[];
}

// ---------------------------------------------------------------------------
// Workspace configuration
// ---------------------------------------------------------------------------

export type WorkspaceTool =
  | "table_viewer" // CSV table with sort/filter/search
  | "document_viewer" // markdown/text rendering
  | "log_viewer" // structured logs
  | "notes" // autosaving candidate notes
  | "calc" // lightweight calculation worksheet
  | "metric_builder" // BI metric definition builder
  | "compat_matrix" // solutions compatibility matrix
  | "field_mapping" // implementation field mapping table
  | "ticket_queue" // support ticket queue
  | "hypothesis_tracker" // support hypothesis tracker
  | "rule_evaluator" // systems rule evaluator
  | "process_compare" // systems process comparison
  | "deliverable_form"; // final structured deliverable

export interface SimulationContent {
  schemaVersion: 1;
  slug: string;
  roleKey: RoleKey;
  title: string;
  scenarioSummary: string;
  /** Candidate-facing mission, under ~180 words. */
  mission: string;
  companyName: string;
  durationMinutes: number;
  difficulty: "standard" | "advanced";
  toolsAvailable: string[];
  workspaceTools: WorkspaceTool[];
  tasks: TaskStep[];
  resources: SimulationResource[];
  stakeholders: SimulationStakeholder[];
  curveball: SimulationCurveball;
  deliverableFields: DeliverableField[];
  competencies: CompetencyDefinition[];
  deterministicChecks: DeterministicCheck[];
  rubricIndicators: RubricIndicator[];
  answerKey: AnswerKey;
  /** Instructions for the in-product AI assistant (never reveals answer key). */
  aiAssistantInstructions: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateSimulationContent(content: SimulationContent): string[] {
  const errors: string[] = [];
  if (!content.slug) errors.push("Missing slug");
  if (!content.title) errors.push("Missing title");
  if (!content.mission) errors.push("Missing mission");
  const missionWords = content.mission.split(/\s+/).length;
  if (missionWords > 200) errors.push(`Mission too long (${missionWords} words, max ~180)`);
  if (content.tasks.length < 4 || content.tasks.length > 5)
    errors.push(`Expected 4-5 task steps, got ${content.tasks.length}`);
  if (content.resources.length < 6 || content.resources.length > 10)
    errors.push(`Expected 6-10 resources, got ${content.resources.length}`);
  if (content.stakeholders.length < 2)
    errors.push(`Expected at least 2 stakeholders, got ${content.stakeholders.length}`);
  if (!content.curveball) errors.push("Missing curveball");
  if (content.deliverableFields.length === 0) errors.push("Missing deliverable fields");
  if (!content.answerKey || content.answerKey.validAlternatives.length === 0)
    errors.push("Answer key must include at least one valid alternative solution");

  const weightSum = content.competencies.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(weightSum - 1) > 0.001)
    errors.push(`Competency weights must total 1.00 (got ${weightSum.toFixed(3)})`);

  const compKeys = new Set(content.competencies.map((c) => c.key));
  for (const check of content.deterministicChecks) {
    if (!compKeys.has(check.competencyKey))
      errors.push(`Check ${check.id} references unknown competency ${check.competencyKey}`);
  }
  for (const ind of content.rubricIndicators) {
    if (!compKeys.has(ind.competencyKey))
      errors.push(`Indicator ${ind.id} references unknown competency ${ind.competencyKey}`);
  }

  const fieldKeys = new Set(content.deliverableFields.map((f) => f.key));
  for (const check of content.deterministicChecks) {
    if (check.kind !== "event_exists" && !fieldKeys.has(check.target))
      errors.push(`Check ${check.id} targets unknown deliverable field ${check.target}`);
  }

  const stakeholderIds = new Set(content.stakeholders.map((s) => s.id));
  if (!stakeholderIds.has(content.curveball.stakeholderId))
    errors.push("Curveball references unknown stakeholder");

  for (const s of content.stakeholders) {
    if (!s.fallbackReply) errors.push(`Stakeholder ${s.id} missing fallback reply`);
  }

  const resourceIds = new Set<string>();
  for (const r of content.resources) {
    if (resourceIds.has(r.id)) errors.push(`Duplicate resource id ${r.id}`);
    resourceIds.add(r.id);
    if (!r.content && !r.url) errors.push(`Resource ${r.id} has no content`);
  }

  return errors;
}
