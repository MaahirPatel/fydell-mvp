import type { SupportedRole } from "./types";

/**
 * Per-detector wording. `title` names the specific behaviour, scoped to the
 * cited symbol when one was found. `observation` is project-scoped and never
 * describes a person. `followUp` is one focused question an employer can ask.
 */
type Phrase = {
  title: (where: string) => string;
  observation: (where: string) => string;
  followUp: string;
};

const inFn = (sym: string | null) => (sym ? ` in ${sym}()` : "");

export const TEST_DETECTORS = new Set(["test_suite", "failure_path_test", "test_isolation", "parametrized_test"]);
/** Findings that show checks are configured, not that they ran: at most partial support. */
export const READ_ONLY_CHECKS = new Set([...TEST_DETECTORS, "ci_checks"]);

const PHRASES: Record<string, Phrase> = {
  retry_with_backoff: {
    title: (w) => `Retries a failing operation${w} with a growing delay between attempts`,
    observation: (w) => `retries a failing operation${w} with a delay between attempts`,
    followUp: "What happens to the work after the final attempt fails, and how would anyone find out?",
  },
  outbound_timeout: {
    title: (w) => `Bounds an outbound call${w} with an explicit timeout`,
    observation: (w) => `sets an explicit timeout on an outbound call${w}`,
    followUp: "How was the timeout value chosen, and what does the caller do when it fires?",
  },
  idempotency_guard: {
    title: (w) => `Skips work that was already processed${w}`,
    observation: (w) => `checks for already-processed work${w} before repeating it`,
    followUp: "What happens if two deliveries of the same item arrive at the same moment?",
  },
  explicit_error_handling: {
    title: (w) => `Reports or re-raises a named failure${w} instead of discarding it`,
    observation: (w) => `catches a failure${w} and reports or re-raises it`,
    followUp: "Which failures does this handler leave to the caller, and why?",
  },
  fastapi_validated_route: {
    title: (w) => `Validates request bodies${w} with a typed model before use`,
    observation: (w) => `validates a request body${w} with a typed model`,
    followUp: "Which invalid inputs would still get through this validation?",
  },
  schema_validated_handler: {
    title: (w) => `Validates request input${w} against a schema before use`,
    observation: (w) => `validates request input${w} against a schema`,
    followUp: "Which invalid inputs would still get through this validation?",
  },
  auth_boundary: {
    title: (w) => `Checks caller identity${w} before handling a request`,
    observation: (w) => `checks caller identity${w} before handling a request`,
    followUp: "How is access to this data authorized, beyond knowing who the caller is?",
  },
  db_transaction: {
    title: (w) => `Groups related database writes${w} in one transaction`,
    observation: (w) => `groups related database writes${w} in a transaction`,
    followUp: "What happens to these writes when two requests change the same rows at once?",
  },
  parameterized_sql: {
    title: (w) => `Binds SQL values as parameters${w}`,
    observation: (w) => `passes SQL values as bound parameters${w}`,
    followUp: "Are any queries in the project still built by string formatting?",
  },
  schema_migrations: {
    title: () => "Changes the database schema through a versioned migration",
    observation: () => "changes the database schema through a versioned migration",
    followUp: "How would this migration be rolled back on a live table?",
  },
  background_job: {
    title: (w) => `Moves work${w} into a background job`,
    observation: (w) => `runs work${w} in a background job or queue`,
    followUp: "What happens to a job if the worker stops halfway through?",
  },
  concurrent_execution: {
    title: (w) => `Runs independent operations concurrently${w}`,
    observation: (w) => `runs independent operations concurrently${w}`,
    followUp: "What bounds the concurrency, and what happens when one operation fails?",
  },
  observability: {
    title: (w) => `Instruments code${w} with structured logging or tracing`,
    observation: (w) => `instruments code${w} with logging, metrics or tracing`,
    followUp: "Which signal would show this failing in production first?",
  },
  result_caching: {
    title: (w) => `Caches results${w} to avoid repeated work`,
    observation: (w) => `caches results${w}`,
    followUp: "When does a cached value become wrong, and what invalidates it?",
  },
  test_suite: {
    title: (w) => `Tests ${w}`,
    observation: (w) => `includes the test ${w}`,
    followUp: "Which behaviour of this code do the tests not cover?",
  },
  failure_path_test: {
    title: (w) => `Tests a failure path: ${w}`,
    observation: (w) => `includes a test of a failure path, ${w}`,
    followUp: "Which failure would this test miss?",
  },
  test_isolation: {
    title: (w) => `Replaces an external service with a fake in ${w}`,
    observation: (w) => `replaces an external service with a fake in ${w}`,
    followUp: "How closely does the fake match the real service's failure behaviour?",
  },
  parametrized_test: {
    title: (w) => `Runs ${w} over several input cases`,
    observation: (w) => `runs ${w} over several input cases`,
    followUp: "Which boundary cases are missing from the parameter list?",
  },
  ci_checks: {
    title: () => "Runs tests or checks in continuous integration",
    observation: () => "configures tests or checks in continuous integration",
    followUp: "What happens when this CI check fails on the main branch?",
  },
  llm_api_integration: {
    title: (w) => `Calls a hosted language model${w}`,
    observation: (w) => `calls a hosted language model${w}`,
    followUp: "How is the quality of this model's output evaluated for this use?",
  },
  llm_output_validation: {
    title: (w) => `Validates model output${w} before using it`,
    observation: (w) => `parses and validates model output${w}`,
    followUp: "What does the code do when the model's output fails validation?",
  },
  llm_latency_measurement: {
    title: (w) => `Measures latency around model calls${w}`,
    observation: (w) => `measures latency around model calls${w}`,
    followUp: "What latency was measured, under what load?",
  },
};

export function phrase(detector: string, finding: string, symbol: string | null): { title: string; observation: string; followUp: string } {
  const p = PHRASES[detector];
  if (!p) {
    const plain = finding.replace(/\.$/, "");
    return {
      title: `${plain}${inFn(symbol)}`,
      observation: `${plain.charAt(0).toLowerCase()}${plain.slice(1)}${inFn(symbol)}`,
      followUp: "What would you change about this part, and why?",
    };
  }
  const where = TEST_DETECTORS.has(detector) ? (symbol ? `"${symbol}"` : "the cited test") : inFn(symbol);
  return { title: p.title(where), observation: p.observation(where), followUp: p.followUp };
}

export type Requirement = { id: string; label: string; detectors: string[]; whatWouldCount: string };

/**
 * Role-aware dimensions, only for roles the simulation catalog supports
 * (RoleKey) and only where a detector can look. Dimensions with no detector
 * are listed as not assessed rather than dropped.
 */
export const ROLE_REQUIREMENTS: Record<SupportedRole, { label: string; requirements: Requirement[] }> = {
  backend_engineer: {
    label: "Backend engineer",
    requirements: [
      { id: "be.contracts", label: "API contracts and input validation", detectors: ["fastapi_validated_route", "schema_validated_handler", "interface_contract"], whatWouldCount: "A handler that validates input before use, in files the engineer changed." },
      { id: "be.authorization", label: "Authorization at request boundaries", detectors: ["auth_boundary"], whatWouldCount: "An identity or permission check before data is returned or changed." },
      { id: "be.data", label: "Data access and schema changes", detectors: ["parameterized_sql", "schema_migrations"], whatWouldCount: "Bound query parameters or a versioned migration the engineer wrote." },
      { id: "be.transactions", label: "Transactions", detectors: ["db_transaction"], whatWouldCount: "Related writes grouped so a partial failure cannot leave them half done." },
      { id: "be.failure", label: "Retries, timeouts and failure handling", detectors: ["retry_with_backoff", "outbound_timeout", "explicit_error_handling"], whatWouldCount: "Bounded retries with backoff, explicit timeouts, and failures reported instead of discarded." },
      { id: "be.idempotency", label: "Idempotency", detectors: ["idempotency_guard"], whatWouldCount: "A guard or atomic claim that makes a repeated request do nothing." },
      { id: "be.concurrency", label: "Concurrency and background work", detectors: ["concurrent_execution", "background_job"], whatWouldCount: "Concurrent or queued work with its failure behaviour handled." },
      { id: "be.tests", label: "Tests", detectors: ["test_suite", "failure_path_test", "test_isolation", "parametrized_test", "ci_checks"], whatWouldCount: "Tests that assert behaviour, including failure paths; an executed run counts more than a read." },
      { id: "be.observability", label: "Observability", detectors: ["observability"], whatWouldCount: "Structured logs, metrics or traces around the behaviour that matters." },
    ],
  },
  applied_ai_engineer: {
    label: "Applied AI engineer",
    requirements: [
      { id: "ai.evaluation", label: "Evaluation datasets and baselines", detectors: [], whatWouldCount: "A versioned evaluation set with a baseline and recorded results." },
      { id: "ai.retrieval", label: "Retrieval and tool behaviour", detectors: [], whatWouldCount: "Retrieval or tool calls with their failure cases tested." },
      { id: "ai.validation", label: "Output validation", detectors: ["llm_output_validation"], whatWouldCount: "Model output parsed and validated before use, with a failure path." },
      { id: "ai.failure", label: "Failure handling around model calls", detectors: ["llm_api_integration", "explicit_error_handling", "retry_with_backoff", "outbound_timeout"], whatWouldCount: "Timeouts, retries and errors handled around the model call." },
      { id: "ai.cost", label: "Measured cost and latency", detectors: ["llm_latency_measurement"], whatWouldCount: "Latency or cost measured under stated conditions." },
      { id: "ai.boundaries", label: "Data boundaries", detectors: [], whatWouldCount: "What data reaches the model, and what is excluded, stated in code or design." },
    ],
  },
};

export function requirementsFor(detector: string): string[] {
  const ids: string[] = [];
  for (const role of Object.values(ROLE_REQUIREMENTS)) for (const r of role.requirements) if (r.detectors.includes(detector)) ids.push(r.id);
  return ids;
}
