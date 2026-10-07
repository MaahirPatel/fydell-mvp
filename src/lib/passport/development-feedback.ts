import type { PassportProject } from "./view";

/**
 * Private development feedback for the engineer who owns a Builder Report.
 * Each item comes from a deterministic rule over the analyzed files: a
 * practice was observed without a companion practice that usually goes with
 * it. It is never added to PassportData, so share links, applications and
 * employer reviews cannot include it.
 */
export type FeedbackItem = {
  id: string;
  title: string;
  observation: string;
  /** Findings that triggered the rule; the gap itself has no line to cite. */
  evidenceIds: string[];
  implication: string;
  nextStep: string;
  limit: string;
  recheck: string;
};

type Rule = {
  id: string;
  title: string;
  when: string[];
  missing: string[];
  observation: (n: number) => string;
  implication: string;
  nextStep: string;
  recheck: string;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const RULES: Rule[] = [
  {
    id: "routes_without_tests",
    title: "Request handlers with no tests found",
    when: ["fastapi_validated_route", "schema_validated_handler"],
    missing: ["test_suite"],
    observation: (n) => `Fydell found ${plural(n, "validated request handler")} and no automated tests in the analyzed files.`,
    implication: "A reviewer cannot see how you check that these handlers behave as intended, so the behavior rests on your word.",
    nextStep: "Add tests for one handler's success path and one rejected input, and run them in the repository.",
    recheck: "Re-import the repository. This item clears when a test suite is found.",
  },
  {
    id: "tests_without_failure_paths",
    title: "Tests cover the happy path only",
    when: ["test_suite"],
    missing: ["failure_path_test"],
    observation: (n) => `Fydell found ${plural(n, "test file")} and no test that asserts an error, rejection or exception.`,
    implication: "Failure handling is where production incidents usually start, and it is the part reviewers most want to see exercised.",
    nextStep: "Add a test that expects an error: invalid input, a failed dependency, or a timeout.",
    recheck: "Re-import. This item clears when a failure-path test is found.",
  },
  {
    id: "tests_without_ci",
    title: "Tests are not run automatically",
    when: ["test_suite"],
    missing: ["ci_checks"],
    observation: () => "Fydell found tests but no CI workflow that runs them in the analyzed files.",
    implication: "Without CI, nobody can tell whether the tests pass on the current commit.",
    nextStep: "Add a CI workflow that installs dependencies and runs the test command on every push.",
    recheck: "Re-import. This item clears when a CI check is found.",
  },
  {
    id: "llm_without_output_validation",
    title: "Model output is used without validation",
    when: ["llm_api_integration"],
    missing: ["llm_output_validation"],
    observation: (n) => `Fydell found ${plural(n, "model API call")} and no schema or structural check on what the model returns.`,
    implication: "Model output can be malformed or off-format, so unchecked output can break code that consumes it.",
    nextStep: "Parse the response against a schema and handle the case where it does not match.",
    recheck: "Re-import. This item clears when output validation is found.",
  },
  {
    id: "llm_without_latency",
    title: "Model call latency is not measured",
    when: ["llm_api_integration"],
    missing: ["llm_latency_measurement"],
    observation: () => "Fydell found model API calls and no timing around them.",
    implication: "Model calls are usually the slowest step; without timing you cannot show the system meets a response-time goal.",
    nextStep: "Record the duration of each model call and log or report it.",
    recheck: "Re-import. This item clears when latency measurement is found.",
  },
  {
    id: "retry_without_timeout",
    title: "Retries without timeouts",
    when: ["retry_with_backoff"],
    missing: ["outbound_timeout"],
    observation: () => "Fydell found retry logic and no explicit timeout on outbound calls.",
    implication: "A call that hangs never fails, so the retry never triggers and the caller waits indefinitely.",
    nextStep: "Set an explicit timeout on each outbound call that the retry wraps.",
    recheck: "Re-import. This item clears when an outbound timeout is found.",
  },
  {
    id: "jobs_without_idempotency",
    title: "Background jobs without a duplicate guard",
    when: ["background_job"],
    missing: ["idempotency_guard"],
    observation: (n) => `Fydell found ${plural(n, "background job")} and no check that prevents processing the same item twice.`,
    implication: "Job queues usually deliver at least once, so a retried job can repeat side effects such as charges or emails.",
    nextStep: "Record processed ids and skip work that has already been done.",
    recheck: "Re-import. This item clears when an idempotency guard is found.",
  },
  {
    id: "training_without_split",
    title: "Training with no held-out data",
    when: ["ml_training_step"],
    missing: ["ml_data_split"],
    observation: () => "Fydell found a training step and no train/test or validation split.",
    implication: "Without held-out data, reported accuracy may reflect memorization rather than generalization.",
    nextStep: "Split the data before training and report metrics on the held-out portion.",
    recheck: "Re-import. This item clears when a data split is found.",
  },
  {
    id: "training_without_metric",
    title: "Training with no evaluation metric",
    when: ["ml_training_step"],
    missing: ["ml_evaluation_metric"],
    observation: () => "Fydell found a training step and no evaluation metric computed on the results.",
    implication: "A reviewer cannot tell how well the model works or compare it with a baseline.",
    nextStep: "Compute a metric suited to the task on held-out data and record it.",
    recheck: "Re-import. This item clears when an evaluation metric is found.",
  },
  {
    id: "training_without_seed",
    title: "Training results are not reproducible",
    when: ["ml_training_step"],
    missing: ["ml_reproducibility"],
    observation: () => "Fydell found a training step and no fixed random seed.",
    implication: "Results can change between runs, so a reported number cannot be reproduced.",
    nextStep: "Set the random seeds used by your data split and training library.",
    recheck: "Re-import. This item clears when a fixed seed is found.",
  },
  {
    id: "container_as_root",
    title: "Container runs as root",
    when: ["container_build"],
    missing: ["container_non_root"],
    observation: () => "Fydell found a container build and no switch to a non-root user.",
    implication: "A compromised process inside the container has root privileges.",
    nextStep: "Create an unprivileged user in the image and switch to it before the entry point.",
    recheck: "Re-import. This item clears when a non-root user is found.",
  },
  {
    id: "ui_without_error_boundary",
    title: "Interface without an error boundary",
    when: ["react_component"],
    missing: ["ui_error_boundary"],
    observation: (n) => `Fydell found ${plural(n, "React component")} and no error boundary.`,
    implication: "One failing component can blank the whole page instead of showing a recoverable error.",
    nextStep: "Wrap major sections in an error boundary with a useful fallback.",
    recheck: "Re-import. This item clears when an error boundary is found.",
  },
];

export const MAX_FEEDBACK_ITEMS = 5;

export function developmentFeedback(project: PassportProject): FeedbackItem[] {
  const byDetector = new Map<string, string[]>();
  for (const e of project.evidence) byDetector.set(e.detector, [...(byDetector.get(e.detector) ?? []), e.id]);
  const { analyzedFiles, totalFiles, skippedFiles } = project.coverage;
  const scope =
    skippedFiles > 0 || project.coverage.treeTruncated
      ? `Only ${analyzedFiles} of ${totalFiles} files were analyzed, so it may exist in a skipped file.`
      : `All ${analyzedFiles} analyzed files were checked; files outside this repository were not.`;
  const items: FeedbackItem[] = [];
  for (const rule of RULES) {
    const evidenceIds = rule.when.flatMap((d) => byDetector.get(d) ?? []);
    if (evidenceIds.length === 0) continue;
    if (rule.missing.some((d) => byDetector.has(d))) continue;
    items.push({
      id: rule.id,
      title: rule.title,
      observation: rule.observation(evidenceIds.length),
      evidenceIds,
      implication: rule.implication,
      nextStep: rule.nextStep,
      limit: `Absence means Fydell's rules did not detect it. ${scope}`,
      recheck: rule.recheck,
    });
    if (items.length >= MAX_FEEDBACK_ITEMS) break;
  }
  return items;
}
