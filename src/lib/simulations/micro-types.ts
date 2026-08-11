/**
 * Five-minute micro simulation content model (Fractal demo format).
 *
 * Micro sims reuse the sim_* infrastructure: they are stored on
 * sim_template_versions.content (format: "micro"), sessions/invitations/
 * messages/state work unchanged. Stakeholders use the same deterministic
 * response engine as long-form sims (SimulationStakeholder).
 */
import type { RoleKey, SimulationStakeholder } from "./types";

export type MicroQuestionKind = "single_select" | "multi_select" | "number" | "text";

export interface MicroConcept {
  id: string;
  label: string;
  /** Keyword stems for the deterministic matcher (case-insensitive). */
  keywords: string[];
  /**
   * Optional keyword stems that earn half credit (0.5) when none of the full
   * keywords matched. Defaults to none, so existing content is unaffected.
   */
  partialKeywords?: string[];
  /** Relative weight of this concept inside the reasoning score. Default 1. */
  weight?: number;
}

/**
 * Optional per-sim additions to the generic communication detectors. All
 * phrases are ADDED to the built-in defaults, never replacing them, so
 * existing content files need no edits.
 */
export interface MicroCommunicationChecks {
  decisionPhrases?: string[];
  evidencePhrases?: string[];
  limitationPhrases?: string[];
  nextStepPhrases?: string[];
}

/**
 * Optional per-sim coverage weights. Missing keys fall back to the defaults
 * (objective 0.35, evidence 0.25, explanation 0.20, resources 0.10,
 * stakeholder 0.10).
 */
export interface MicroCoverageWeights {
  objective?: number;
  evidence?: number;
  explanation?: number;
  resources?: number;
  stakeholder?: number;
}

export interface MicroQuestion {
  id: string;
  kind: MicroQuestionKind;
  prompt: string;
  helpText?: string;
  options?: string[];
  maxChars?: number;
  /** Points available for this question. */
  points: number;
  /** single_select: [option]; multi_select: exact set; number: [value, tolerance]. */
  answer?: (string | number)[];
  /** For text questions: anchored concept checklist (points split evenly). */
  concepts?: MicroConcept[];
  /** Which result-page competency this question feeds. */
  competencyKey: string;
  /** Shown on the result page as the expected evidence. */
  expectedEvidence: string;
}

export interface MicroCompetency {
  key: string;
  label: string;
}

export interface MicroCurveball {
  id: string;
  stakeholderId: string;
  announcement: string;
  requiredAdaptation: string;
}

export interface MicroSimContent {
  format: "micro";
  schemaVersion: 1;
  slug: string;
  roleKey: RoleKey;
  title: string;
  /** One-line card description. */
  tagline: string;
  /** Candidate-facing mission (2-3 sentences). */
  mission: string;
  companyName: string;
  durationMinutes: number;
  resources: {
    id: string;
    title: string;
    kind: "table" | "markdown";
    content: string; // markdown (tables as markdown tables)
  }[];
  /**
   * Single stakeholder, same engine as long-form sims. Rules whose id starts
   * with "rel_" count as relevant clarification questions for scoring.
   */
  stakeholders: SimulationStakeholder[];
  questions: MicroQuestion[];
  competencies: MicroCompetency[];
  /** Points awarded when at least one relevant stakeholder rule fired. */
  stakeholderPoints: number;
  stakeholderCompetencyKey: string;
  /** Result-page copy hooks keyed by question id → shown when correct. */
  strengthTemplates: Record<string, string>;
  /** Shown when the question was wrong/missing. */
  improvementTemplates: Record<string, string>;
  /** Optional additive phrases for the communication detectors. */
  communicationChecks?: MicroCommunicationChecks;
  /** Optional per-sim coverage weight overrides. */
  coverageWeights?: MicroCoverageWeights;
  /** Optional mid-session change (October pilot and similar). */
  curveball?: MicroCurveball;
}

export function isMicroContent(content: unknown): content is MicroSimContent {
  return Boolean(content && typeof content === "object" && (content as { format?: string }).format === "micro");
}

export function validateMicroSim(sim: MicroSimContent): string[] {
  const errors: string[] = [];
  if (!sim.slug) errors.push("Missing slug");
  if (!sim.mission) errors.push("Missing mission");
  if (sim.durationMinutes < 5 || sim.durationMinutes > 25)
    errors.push("Micro sims must be 5-25 minutes");
  if (sim.resources.length < 2 || sim.resources.length > 6)
    errors.push(`Expected 2-6 resources, got ${sim.resources.length}`);
  if (sim.stakeholders.length !== 1) errors.push("Micro sims have exactly one stakeholder");
  if (sim.questions.length < 3 || sim.questions.length > 5)
    errors.push(`Expected 3-5 questions, got ${sim.questions.length}`);
  if (sim.curveball) {
    if (!sim.curveball.announcement) errors.push("curveball.announcement required");
    if (sim.curveball.stakeholderId !== sim.stakeholders[0]?.id)
      errors.push("curveball.stakeholderId must match the sim stakeholder");
  }

  const totalPoints =
    sim.questions.reduce((s, q) => s + q.points, 0) + sim.stakeholderPoints;
  if (totalPoints !== 100) errors.push(`Points must total 100, got ${totalPoints}`);

  const compKeys = new Set(sim.competencies.map((c) => c.key));
  for (const q of sim.questions) {
    if (!compKeys.has(q.competencyKey))
      errors.push(`Question ${q.id} references unknown competency ${q.competencyKey}`);
    if (q.kind === "text" && (!q.concepts || q.concepts.length === 0))
      errors.push(`Text question ${q.id} needs a concept checklist`);
    if (q.kind !== "text" && (!q.answer || q.answer.length === 0))
      errors.push(`Question ${q.id} needs an answer key`);
    if ((q.kind === "single_select" || q.kind === "multi_select") && (!q.options || q.options.length < 2))
      errors.push(`Question ${q.id} needs options`);
    if (!sim.strengthTemplates[q.id]) errors.push(`Question ${q.id} missing strength template`);
    if (!sim.improvementTemplates[q.id]) errors.push(`Question ${q.id} missing improvement template`);
  }
  if (!compKeys.has(sim.stakeholderCompetencyKey))
    errors.push("stakeholderCompetencyKey not in competencies");
  const hasRelevantRule = sim.stakeholders[0]?.responseRules.some((r) => r.id.startsWith("rel_"));
  if (!hasRelevantRule) errors.push("Stakeholder needs at least one rel_ (relevant) rule");
  return errors;
}

export const BAND_THRESHOLDS = [
  { min: 85, band: "strong", label: "Strong evidence" },
  { min: 70, band: "established", label: "Established evidence" },
  { min: 50, band: "developing", label: "Developing evidence" },
  { min: 0, band: "limited", label: "Limited evidence" },
] as const;

export function bandForScore(total: number): { band: string; label: string } {
  for (const t of BAND_THRESHOLDS) {
    if (total >= t.min) return { band: t.band, label: t.label };
  }
  return { band: "limited", label: "Limited evidence" };
}

export const PROTOTYPE_DISCLAIMER =
  "This is a prototype evidence score designed for product feedback. It has not yet been validated as a predictor of job performance.";
