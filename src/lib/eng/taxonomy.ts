/**
 * Engineering role taxonomy. Describing a role and having a validated work
 * sample for it are separate: any family and specialization below can be
 * used for a role, while `coverage` says honestly which task families have
 * a reviewed package today.
 */

export const ROLE_FAMILIES = ["software_engineer", "backend_api_engineer", "applied_ai_engineer"] as const;
export type RoleFamily = (typeof ROLE_FAMILIES)[number];

export const SPECIALIZATIONS = ["general", "frontend", "full_stack", "platform_infrastructure", "developer_tools", "ml_engineering"] as const;
export type Specialization = (typeof SPECIALIZATIONS)[number];

export const LEVELS = ["junior", "mid", "senior", "staff"] as const;
export type Level = (typeof LEVELS)[number];

export const FAMILY_LABEL: Record<RoleFamily, string> = {
  software_engineer: "Software Engineer",
  backend_api_engineer: "Backend/API Engineer",
  applied_ai_engineer: "Applied AI Engineer",
};

export const SPECIALIZATION_LABEL: Record<Specialization, string> = {
  general: "General",
  frontend: "Frontend Engineer",
  full_stack: "Full-stack Engineer",
  platform_infrastructure: "Platform/Infrastructure Engineer",
  developer_tools: "Developer Tools Engineer",
  ml_engineering: "ML Engineer",
};

/** Which specializations sit naturally under each family. Any combination is still allowed. */
export const FAMILY_SPECIALIZATIONS: Record<RoleFamily, Specialization[]> = {
  software_engineer: ["general", "frontend", "full_stack", "platform_infrastructure", "developer_tools"],
  backend_api_engineer: ["general", "full_stack", "platform_infrastructure"],
  applied_ai_engineer: ["general", "ml_engineering", "full_stack"],
};

export const LEVEL_LABEL: Record<Level, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
  staff: "Staff",
};

/**
 * Seniority changes what a task asks for, not how much code or how little
 * time. Shown to authors when they pick a level.
 */
export const LEVEL_SCOPE: Record<Level, { ambiguity: string; ownership: string; expectation: string }> = {
  junior: {
    ambiguity: "Clear brief with the expected behavior written down.",
    ownership: "Implements a bounded change with guidance available.",
    expectation: "Correct core behavior, sensible tests, asks when stuck. No proprietary tools assumed.",
  },
  mid: {
    ambiguity: "Some requirements need a clarifying question.",
    ownership: "Owns the change end to end within one component.",
    expectation: "Handles edge cases, explains the approach, covers failure paths with tests.",
  },
  senior: {
    ambiguity: "Incomplete requirements and a constraint that forces a tradeoff.",
    ownership: "Owns the outcome, including what happens in production.",
    expectation: "Names tradeoffs and operational consequences, analyzes failure, scopes what not to do.",
  },
  staff: {
    ambiguity: "The problem framing itself is part of the work.",
    ownership: "Owns direction across components and teams.",
    expectation: "Frames the problem, weighs alternatives against business context, writes a decision others can act on.",
  },
};

export type CoverageStatus = "ready" | "in_development" | "not_available";

export const COVERAGE_LABEL: Record<CoverageStatus, string> = {
  ready: "Reviewed template ready",
  in_development: "In development",
  not_available: "Not available yet",
};

export type TaskFamily = {
  id: string;
  label: string;
  family: RoleFamily;
  specialization: Specialization;
  /** Reviewed scenario keys that cover this task family. */
  scenarioKeys: string[];
  status: CoverageStatus;
};

export const TASK_FAMILIES: TaskFamily[] = [
  // Backend/API Engineering
  { id: "backend.idempotency", label: "Duplicate requests and idempotency", family: "backend_api_engineer", specialization: "general", scenarioKeys: ["backend-webhook-retry"], status: "ready" },
  { id: "backend.retries", label: "Retry and failure handling", family: "backend_api_engineer", specialization: "general", scenarioKeys: ["backend-webhook-retry"], status: "ready" },
  { id: "backend.contract", label: "API contract changes", family: "backend_api_engineer", specialization: "general", scenarioKeys: [], status: "not_available" },
  { id: "backend.authz", label: "Authorization boundaries", family: "backend_api_engineer", specialization: "general", scenarioKeys: [], status: "not_available" },
  { id: "backend.transactions", label: "Database transaction behavior", family: "backend_api_engineer", specialization: "general", scenarioKeys: [], status: "not_available" },
  { id: "backend.queues", label: "Queue processing and recovery", family: "backend_api_engineer", specialization: "general", scenarioKeys: [], status: "not_available" },

  // Software Engineering
  { id: "software.regression", label: "Diagnosing a regression in an existing codebase", family: "software_engineer", specialization: "general", scenarioKeys: [], status: "in_development" },
  { id: "software.feature", label: "Implementing a bounded feature", family: "software_engineer", specialization: "general", scenarioKeys: [], status: "in_development" },
  { id: "software.refactor", label: "Refactoring with behavior preservation", family: "software_engineer", specialization: "general", scenarioKeys: [], status: "not_available" },
  { id: "software.edge_cases", label: "Handling edge cases and adding meaningful tests", family: "software_engineer", specialization: "general", scenarioKeys: [], status: "not_available" },
  { id: "software.tradeoff", label: "Explaining a maintainability tradeoff", family: "software_engineer", specialization: "general", scenarioKeys: [], status: "not_available" },

  // Frontend Engineering
  { id: "frontend.interaction", label: "Implementing an interaction from a clear brief", family: "software_engineer", specialization: "frontend", scenarioKeys: [], status: "not_available" },
  { id: "frontend.states", label: "Loading, empty, error and permission states", family: "software_engineer", specialization: "frontend", scenarioKeys: [], status: "not_available" },
  { id: "frontend.state_sync", label: "Fixing state synchronization", family: "software_engineer", specialization: "frontend", scenarioKeys: [], status: "not_available" },
  { id: "frontend.a11y", label: "Keyboard accessibility and responsive behavior", family: "software_engineer", specialization: "frontend", scenarioKeys: [], status: "not_available" },
  { id: "frontend.rendering", label: "Diagnosing a rendering or performance issue", family: "software_engineer", specialization: "frontend", scenarioKeys: [], status: "not_available" },

  // Full-stack Engineering
  { id: "fullstack.feature", label: "A small feature across UI, API and persistence", family: "software_engineer", specialization: "full_stack", scenarioKeys: [], status: "not_available" },
  { id: "fullstack.validation", label: "Validating inputs and authorization", family: "software_engineer", specialization: "full_stack", scenarioKeys: [], status: "not_available" },
  { id: "fullstack.partial_failure", label: "Handling partial failures", family: "software_engineer", specialization: "full_stack", scenarioKeys: [], status: "not_available" },
  { id: "fullstack.integration_tests", label: "Adding appropriate integration coverage", family: "software_engineer", specialization: "full_stack", scenarioKeys: [], status: "not_available" },

  // Applied AI Engineering
  { id: "ai.retrieval", label: "Diagnosing retrieval failures", family: "applied_ai_engineer", specialization: "general", scenarioKeys: [], status: "in_development" },
  { id: "ai.eval_baseline", label: "Improving a documented evaluation baseline", family: "applied_ai_engineer", specialization: "general", scenarioKeys: [], status: "in_development" },
  { id: "ai.structured_output", label: "Structured model output and provider failures", family: "applied_ai_engineer", specialization: "general", scenarioKeys: [], status: "not_available" },
  { id: "ai.leakage", label: "Identifying data leakage", family: "applied_ai_engineer", specialization: "general", scenarioKeys: [], status: "not_available" },
  { id: "ai.tradeoffs", label: "Quality, latency and cost tradeoffs", family: "applied_ai_engineer", specialization: "general", scenarioKeys: [], status: "not_available" },

  // Platform/Infrastructure Engineering
  { id: "platform.ci", label: "Repairing a contained CI workflow", family: "software_engineer", specialization: "platform_infrastructure", scenarioKeys: [], status: "not_available" },
  { id: "platform.config", label: "Improving configuration validation", family: "software_engineer", specialization: "platform_infrastructure", scenarioKeys: [], status: "not_available" },
  { id: "platform.diagnosis", label: "Diagnosing a service from logs and metrics", family: "software_engineer", specialization: "platform_infrastructure", scenarioKeys: [], status: "not_available" },
  { id: "platform.safeguard", label: "A recovery or deployment safeguard in a sandbox", family: "software_engineer", specialization: "platform_infrastructure", scenarioKeys: [], status: "not_available" },

  // ML Engineering
  { id: "ml.defect", label: "Correcting a data-processing or evaluation defect", family: "applied_ai_engineer", specialization: "ml_engineering", scenarioKeys: [], status: "not_available" },
  { id: "ml.baseline", label: "Reproducing a small baseline", family: "applied_ai_engineer", specialization: "ml_engineering", scenarioKeys: [], status: "not_available" },
  { id: "ml.splits", label: "Checking split integrity and leakage", family: "applied_ai_engineer", specialization: "ml_engineering", scenarioKeys: [], status: "not_available" },
  { id: "ml.limitations", label: "Explaining limitations of a result", family: "applied_ai_engineer", specialization: "ml_engineering", scenarioKeys: [], status: "not_available" },
];

export function taskFamiliesFor(family: RoleFamily, specialization: Specialization): TaskFamily[] {
  return TASK_FAMILIES.filter((t) => t.family === family && (specialization === "general" ? t.specialization === "general" : t.specialization === specialization));
}

/** Best coverage across the task families for a family and specialization. */
export function coverageFor(family: RoleFamily, specialization: Specialization): CoverageStatus {
  const tasks = taskFamiliesFor(family, specialization);
  if (tasks.some((t) => t.status === "ready")) return "ready";
  if (tasks.some((t) => t.status === "in_development")) return "in_development";
  return "not_available";
}

export function isRoleFamily(v: unknown): v is RoleFamily {
  return typeof v === "string" && (ROLE_FAMILIES as readonly string[]).includes(v);
}
export function isSpecialization(v: unknown): v is Specialization {
  return typeof v === "string" && (SPECIALIZATIONS as readonly string[]).includes(v);
}
export function isLevel(v: unknown): v is Level {
  return typeof v === "string" && (LEVELS as readonly string[]).includes(v);
}

/** Evidence an employer may accept for a role. */
export const EVIDENCE_KINDS = ["public_repository", "uploaded_project", "described_project", "work_sample", "written_answer", "permitted_artifact"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];
export const EVIDENCE_LABEL: Record<EvidenceKind, string> = {
  public_repository: "Public repositories",
  uploaded_project: "Uploaded projects",
  described_project: "Described projects",
  work_sample: "Fydell work samples",
  written_answer: "Written answers to a question",
  permitted_artifact: "A permitted artifact (design doc, PR, write-up)",
};

export const WORK_SAMPLE_POLICY_LABEL = {
  not_needed: "Not needed. Review existing evidence only.",
  when_evidence_gap: "Only when a required capability has no evidence",
  required: "Required for every applicant who reaches review",
} as const;
export type WorkSamplePolicy = keyof typeof WORK_SAMPLE_POLICY_LABEL;
