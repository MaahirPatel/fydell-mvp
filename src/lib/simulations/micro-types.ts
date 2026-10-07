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

/**
 * Engineering scenarios run on a real code workspace (`scenarios/<slug>`):
 * the desktop materializes the versioned file package, and correctness
 * evidence comes from the scenario's trusted tests run in an isolated runner
 * (src/lib/engineering). The questions collect the reviewer handoff.
 */
export interface MicroEngineeringConfig {
  /** Must equal the content slug (the scenario directory name). */
  scenarioId: string;
  /** Must equal the pinned version in scenarios/<slug>/.fydell/scenario.json. */
  scenarioVersion: string;
  /** Minutes after start when the requirement update becomes eligible. */
  updateAfterMinutes?: number;
  /** Candidate-facing statement of permitted tools and assistance (SCEN-07). */
  toolsPolicy: string;
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
  /** Present on engineering scenarios backed by a code workspace. */
  engineering?: MicroEngineeringConfig;
  /**
   * Assistance policy for coworker chat. Versioned with the scenario.
   * Controls hint limits, solution disclosure, and blocked topics.
   */
  assistancePolicy?: {
    version: string;
    maxHints: number;
    allowSolution: boolean;
    hintBlockedTopics: string[];
  };
}

export function isMicroContent(content: unknown): content is MicroSimContent {
  return Boolean(content && typeof content === "object" && (content as { format?: string }).format === "micro");
}

export function validateMicroSim(sim: MicroSimContent): string[] {
  const errors: string[] = [];
  if (!sim.slug) errors.push("Missing slug");
  if (!sim.mission) errors.push("Missing mission");
  if (sim.engineering) {
    if (sim.durationMinutes < 30 || sim.durationMinutes > 90)
      errors.push("Engineering scenarios must be 30-90 minutes");
    if (sim.engineering.scenarioId !== sim.slug)
      errors.push("engineering.scenarioId must equal the slug (scenario directory)");
    if (!sim.engineering.toolsPolicy) errors.push("engineering.toolsPolicy required");
    const at = sim.engineering.updateAfterMinutes;
    if (sim.curveball && (!at || at <= 0 || at >= sim.durationMinutes - 10))
      errors.push("engineering.updateAfterMinutes must leave at least 10 minutes to respond");
  } else if (sim.durationMinutes < 5 || sim.durationMinutes > 25)
    errors.push("Micro sims must be 5-25 minutes");
  if (sim.resources.length < 2 || sim.resources.length > 6)
    errors.push(`Expected 2-6 resources, got ${sim.resources.length}`);
  if (sim.engineering) {
    if (sim.stakeholders.length < 1 || sim.stakeholders.length > 4)
      errors.push("Engineering scenarios have 1-4 teammates");
  } else if (sim.stakeholders.length !== 1) {
    errors.push("Micro sims have exactly one stakeholder");
  }
  if (sim.questions.length < 3 || sim.questions.length > 5)
    errors.push(`Expected 3-5 questions, got ${sim.questions.length}`);
  if (sim.curveball) {
    if (!sim.curveball.announcement) errors.push("curveball.announcement required");
    if (!sim.stakeholders.some((s) => s.id === sim.curveball?.stakeholderId))
      errors.push("curveball.stakeholderId must match a sim stakeholder");
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

  const seenProactiveIds = new Set<string>();
  for (const p of sim.stakeholders[0]?.proactiveMessages || []) {
    if (seenProactiveIds.has(p.id)) errors.push(`Duplicate proactive id ${p.id}`);
    seenProactiveIds.add(p.id);
    if (!p.body || !p.body.trim()) errors.push(`Proactive ${p.id} has empty body`);
    if (!p.trigger || typeof p.trigger.kind !== "string")
      errors.push(`Proactive ${p.id} has invalid trigger`);
  }
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
