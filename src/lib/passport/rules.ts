import type { RoleSuggestion } from "./github/types";
import type { Capability, CapabilitySummary } from "./view";

type RoleInput = { id: string; basis: string; category: string };
type CapabilityInput = RoleInput & { detector: string };

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

const STATEMENTS: Record<string, string> = {
  fastapi_validated_route: "Builds HTTP APIs that validate request input with typed models",
  schema_validated_handler: "Builds request handlers that validate input against a schema",
  idempotency_guard: "Guards against duplicate processing when work is retried",
  schema_migrations: "Evolves database schemas through versioned migrations",
  test_suite: "Writes automated tests for their code",
  ci_checks: "Automates tests or checks in continuous integration",
  react_component: "Builds React interface components",
  ml_training_step: "Writes model training code",
  llm_api_integration: "Integrates hosted language models into application code",
};

export function notShown(roles: RoleSuggestion[]): string[] {
  const gaps = new Set<string>(roles.flatMap((r) => r.gaps));
  gaps.add("Anything not present in the selected public repositories. Missing evidence is not evidence of inability.");
  return [...gaps].slice(0, 5);
}

export function ruleSummary(evidence: CapabilityInput[], roles: RoleSuggestion[], note?: string): CapabilitySummary {
  const byDetector = new Map<string, string[]>();
  for (const e of evidence) {
    if (e.basis !== "repository_observation" || !STATEMENTS[e.detector]) continue;
    byDetector.set(e.detector, [...(byDetector.get(e.detector) ?? []), e.id]);
  }
  const capabilities: Capability[] = [...byDetector.entries()].map(([detector, ids]) => ({
    statement: STATEMENTS[detector],
    evidenceIds: ids.slice(0, 4),
  }));
  return { source: "rules", capabilities, notShown: notShown(roles), note };
}
