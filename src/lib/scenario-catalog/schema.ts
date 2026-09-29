/**
 * Scenario catalog schemas.
 *
 * One typed shape for every role family's blueprint and validation record, so
 * the employer catalog, the role-intake matcher and the authoring docs read
 * the same source. A blueprint is a design, not an assessment: whether an
 * employer can buy it is decided only by its validation record (see
 * lifecycle.ts), never by the fact that an entry exists.
 */
import { z } from "zod";

export const ROLE_FAMILY_KEYS = [
  "backend",
  "fullstack",
  "forward_deployed",
  "frontend",
  "applied_ai",
  "data_engineering",
  "ml_engineering",
  "mlops",
  "platform_sre",
  "mobile",
  "qa_automation",
  "application_security",
  "systems_embedded",
  "game_graphics",
] as const;

export const roleFamilyKeySchema = z.enum(ROLE_FAMILY_KEYS);
export type RoleFamilyKey = z.infer<typeof roleFamilyKeySchema>;

/** draft → automated_validation → expert_review → approved → published → retired */
export const VALIDATION_STATUSES = [
  "draft",
  "automated_validation",
  "expert_review",
  "approved",
  "published",
  "retired",
] as const;
export const validationStatusSchema = z.enum(VALIDATION_STATUSES);
export type ValidationStatus = z.infer<typeof validationStatusSchema>;

const text = z.string().trim().min(1);
const list = z.array(text).min(1);

export const personaSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  kind: z.enum(["product_stakeholder", "engineering_teammate", "operations_stakeholder"]),
  role: text,
  knows: list,
  doesNotKnow: list,
  escalation: text,
});

export const clarificationFactSchema = z.object({
  question: text,
  answer: text,
});

export const rubricDimensionSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: text,
  kind: z.enum(["hard_skill", "collaboration"]),
  demonstrated: text,
  partial: text,
  notDemonstrated: text,
});

export const runtimeSchema = z.object({
  /** What executes candidate code. `none` means the task has no code execution. */
  execution: z.enum(["remote_container", "remote_container_gpu", "emulator", "device_farm", "none"]),
  languages: list,
  network: z.enum(["denied", "allowlisted_fixture_endpoints"]),
  requiresGpu: z.boolean(),
  requiresPhysicalDevice: z.boolean(),
  notes: text,
});

export const blueprintSchema = z.object({
  businessSituation: text,
  candidateRole: text,
  starterAssets: list,
  intendedProblem: text,
  inScope: list,
  outOfScope: list,
  personas: z.array(personaSchema).min(2).max(3),
  clarificationFacts: z.array(clarificationFactSchema).min(2),
  requirementUpdate: z.object({
    summary: text,
    trigger: text,
    evaluationRelevance: text,
  }),
  expectedArtifacts: list,
  dimensions: z.array(rubricDimensionSchema).min(3),
  validApproaches: z.array(text).min(2),
  defectiveFixtures: z.array(text).min(2),
  runtime: runtimeSchema,
});

export const reviewRecordSchema = z.object({
  stage: z.enum(["automated_validation", "expert_review", "publication", "retirement"]),
  outcome: z.enum(["passed", "failed", "approved", "changes_requested", "published", "retired"]),
  /** `automation` for checks; a named person for expert review and publication. */
  actorKind: z.enum(["automation", "human"]),
  actor: text,
  /** For humans: the qualification that makes this review count. */
  actorQualification: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scenarioVersion: text,
  evidence: list,
});
export type ReviewRecord = z.infer<typeof reviewRecordSchema>;

export const catalogEntrySchema = z.object({
  family: roleFamilyKeySchema,
  label: text,
  /** Sequence for implementation: 1 first. */
  priority: z.number().int().min(1).max(5),
  /** For combined labels (e.g. Platform/DevOps/SRE): what the initial task actually covers. */
  scopeDisclosure: text,
  initialScenario: z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    title: text,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    /** The sim_templates slug when the scenario is runnable in the product. */
    templateSlug: z.string().nullable(),
    effortMinutes: z.number().int().min(15).max(240),
    responsibilityTags: list,
    stackTags: list,
    capabilitiesAssessed: list,
    capabilitiesNotAssessed: list,
    blueprint: blueprintSchema,
  }),
  validation: z.object({
    status: validationStatusSchema,
    /** Whether a runnable package (starter, harness, fixtures) exists in the repo. */
    runnable: z.boolean(),
    reviews: z.array(reviewRecordSchema),
    /** Concrete things that must happen before the next status. Empty only when published. */
    blockers: z.array(text),
  }),
});
export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
