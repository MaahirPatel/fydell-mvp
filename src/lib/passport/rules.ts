import type { RoleSuggestion } from "./github/types";
import type { Capability, CapabilitySummary } from "./view";

type RoleInput = { id: string; basis: string; category: string };
type CapabilityInput = RoleInput & { detector: string; entailment?: { status: "supported" | "narrowed" } | null };

export function suggestRoles(findings: RoleInput[]): RoleSuggestion[] {
  const ids = (category: string) =>
    findings.filter((f) => f.category === category && f.basis === "repository_observation").map((f) => f.id);
  const backend = ids("backend");
  const frontend = ids("frontend");
  const tests = ids("testing");
  const ml = ids("ml_engineering");
  const llm = ids("applied_ai");
  const out: RoleSuggestion[] = [];

  if (backend.length) {
    out.push({
      family: "backend",
      status: backend.length >= 2 ? "supported" : "partial",
      requirement: "Builds server-side behaviour such as validated APIs, data changes, or safe retries.",
      evidenceIds: [...backend, ...tests],
      gaps: [
        ...(tests.length ? [] : ["No automated tests found in the analyzed files."]),
        "Production operation and performance under load are not observable from source.",
      ],
    });
  }
  if (frontend.length) {
    out.push({
      family: "frontend",
      status: "partial",
      requirement: "Builds user interface components.",
      evidenceIds: frontend,
      gaps: ["Rendered behaviour, accessibility, and design quality are not assessed from source."],
    });
  }
  if (backend.length && frontend.length) {
    out.push({
      family: "full_stack",
      status: "partial",
      requirement: "Works across the API and the interface.",
      evidenceIds: [...backend, ...frontend],
      gaps: ["Whether both sides were built by the candidate is not verified."],
    });
  }
  if (ml.length) {
    out.push({
      family: "ml_engineering",
      status: "partial",
      requirement: "Trains or evaluates machine-learning models.",
      evidenceIds: ml,
      gaps: ["Training was not reproduced; data handling and evaluation rigour are not assessed."],
    });
  }
  if (llm.length) {
    out.push({
      family: "applied_ai",
      status: "partial",
      requirement: "Integrates hosted AI models into an application.",
      evidenceIds: llm,
      gaps: ["Evaluation, guardrails, and failure handling around model output are not assessed."],
    });
  }
  return out;
}

/**
 * Project-scoped observations. Each says what the analyzed snapshot contains,
 * never what its author can do: a repository observation becomes a claim
 * about a person only when contribution evidence links them to the lines.
 */
const STATEMENTS: Record<string, string> = {
  fastapi_validated_route: "The snapshot has API routes that validate request bodies with typed models",
  schema_validated_handler: "The snapshot has request handlers that validate input against a schema",
  idempotency_guard: "The snapshot checks for already-processed work before repeating it",
  schema_migrations: "The snapshot changes its database schema through versioned migrations",
  test_suite: "The snapshot includes automated tests, which were read and not run",
  ci_checks: "The snapshot configures tests or checks in continuous integration",
  react_component: "The snapshot contains React interface components",
  ml_training_step: "The snapshot contains a model training step",
  llm_api_integration: "The snapshot calls a hosted language model from application code",
  auth_boundary: "The snapshot checks caller identity at request boundaries",
  explicit_error_handling: "The snapshot handles named failures instead of discarding them",
  retry_with_backoff: "The snapshot retries failed operations with a delay between attempts",
  outbound_timeout: "The snapshot sets explicit timeouts on outbound calls",
  db_transaction: "The snapshot groups related database writes in transactions",
  parameterized_sql: "The snapshot passes SQL values as bound parameters",
  background_job: "The snapshot runs work in background jobs or queues",
  observability: "The snapshot instruments code with logging, metrics or tracing",
  failure_path_test: "The snapshot has tests that assert failure paths, which were read and not run",
  test_isolation: "The snapshot's tests replace external services with mocks or fakes",
  ml_data_split: "The snapshot separates training and evaluation data",
  ml_evaluation_metric: "The snapshot computes evaluation metrics for a model",
  ml_reproducibility: "The snapshot fixes random seeds for reproducible runs",
  llm_output_validation: "The snapshot validates model output before using it",
  container_build: "The snapshot defines a container image build",
};

export function notShown(roles: RoleSuggestion[]): string[] {
  const gaps = new Set<string>(roles.flatMap((r) => r.gaps));
  gaps.add("Anything not present in the selected public repositories. Missing evidence is not evidence of inability.");
  return [...gaps].slice(0, 5);
}

export function ruleSummary(evidence: CapabilityInput[], roles: RoleSuggestion[], note?: string): CapabilitySummary {
  const byDetector = new Map<string, string[]>();
  for (const e of evidence) {
    if (e.basis !== "repository_observation" || !STATEMENTS[e.detector] || e.entailment?.status === "narrowed") continue;
    byDetector.set(e.detector, [...(byDetector.get(e.detector) ?? []), e.id]);
  }
  const capabilities: Capability[] = [...byDetector.entries()].map(([detector, ids]) => ({
    statement: STATEMENTS[detector],
    evidenceIds: ids.slice(0, 4),
  }));
  return { scope: "project", source: "rules", capabilities, notShown: notShown(roles), note };
}
