import "server-only";
import { assemble, type BriefStage, type TestsStage } from "../../authoring/generate";
import { SECTIONS, type ProtectedMaterials, type ScenarioPackage } from "../../authoring/package";
import { DEFAULT_INPUT, parseInput, validateConfig, type AuthoringConfig, type AuthoringInput } from "../../authoring/registry";
import {
  FIXTURE_EVAL_SET,
  FIXTURE_FEW_SHOT,
  FIXTURE_LABELS,
  FIXTURE_PREDICTIONS,
  HELDOUT_CASES,
  REFERENCE_HARNESS,
  REFERENCE_METRICS,
  STARTER_DATA,
  STARTER_HARNESS,
  STARTER_INIT,
  STARTER_METRICS,
  STARTER_PARSING,
  STARTER_README,
  STARTER_RUN_EVAL,
  TEST_EVALUATION,
  TEST_HELPERS,
  TEST_PUBLIC,
  WRONG_NO_NFKC_HARNESS,
  WRONG_SKIPS_MISSING_HARNESS,
  WRONG_WEIGHTED_MACRO_METRICS,
  WRONG_ZERO_FILLED_METRICS,
} from "./files";

const AUTHORED_AT = "2026-10-07T00:00:00.000Z";
const FIXTURE_PATHS = ["fixtures/labels.json", "fixtures/few_shot.json", "fixtures/eval_set.json", "fixtures/predictions.json"];
const HELDOUT_PATH = "tests/heldout/triage_cases.json";

/** The creator-form input this sample corresponds to; stored with the draft. */
export const EVAL_HARNESS_INPUT: AuthoringInput = {
  ...DEFAULT_INPUT,
  family: "applied_ai_engineer",
  specialization: "general",
  level: "mid",
  language: "python",
  framework: "none",
  database: "json-files",
  technologies: ["recorded-model-outputs", "json"],
  taskType: "ai_evaluation",
  capabilities: ["correctness", "reliability", "testing"],
  taskMinutes: 60,
  setupMinutes: 10,
  aiPolicy: "assistants_disclosed",
  startingMaterial: "uploaded",
  description:
    "A customer support team scores its ticket triage classifier from recorded predictions before letting it route tickets on its own. The harness reports numbers that are too good: few-shot prompt examples were copied into the eval set under new ids, abstentions and failed calls drop out of the denominator, macro F1 is computed as a pooled average, and the per-label breakdown divides by zero for labels with no examples. The candidate fixes the harness so the reported metrics are correct and the report states what it excluded and why. No model is called; everything runs over recorded JSON fixtures, and hidden tests use held-out cases.",
  outcomes: [
    "The report's accuracy, per-label metrics and macro F1 are correct for the recorded run and for held-out cases.",
    "The report states which examples it excluded and why, and how many predictions abstained or failed.",
    "A regression test fails on the original code and passes with the fix.",
  ],
  constraints: ["Standard library only.", "Keep the run_evaluation and render_report interfaces.", "Do not change the recorded fixtures."],
  outOfScope: ["Calling a model or re-running predictions.", "Changing the prompt or the label set.", "Confidence calibration and thresholds."],
  confirmedAssumptions: ["synthetic_data"],
};

function config(): AuthoringConfig {
  const { input, invalid } = parseInput(EVAL_HARNESS_INPUT);
  const v = validateConfig(input, invalid);
  if (!v.ok || !v.resolved) {
    const reasons = [...v.errors, ...v.conflicts].map((e) => e.message).concat(v.clarifications.map((c) => c.question), v.assumptions.map((a) => a.statement));
    throw new Error(`eval-harness-integrity config does not validate: ${reasons.join(" | ")}`);
  }
  return v.resolved;
}

const BRIEF: BriefStage = {
  title: "Make the triage evaluation report honest numbers",
  summary:
    "The ticket triage evaluation reports a score that is higher than the classifier deserves. Fix how the harness selects examples, counts failed predictions and averages per-label results, make the report say what it left out, and add regression coverage.",
  context: [
    "Brightwell Desk's support team uses a classifier to triage incoming tickets into one of five queues. Every call includes a few-shot prompt of labelled example tickets. A batch runner outside this repository calls the classifier once for each ticket in the eval set and records each response; app/harness.py scores those recordings. The report goes into the weekly quality review, and the team plans to let the classifier route tickets without a person once macro F1 is above 0.80 for two weeks in a row.",
    "The recorded run from the last review is in fixtures/: labels.json, few_shot.json (the examples in the prompt), eval_set.json and predictions.json. python scripts/run_eval.py prints the report for it. Last week's report showed accuracy and macro F1 of 0.824, but a spot check by the support operations team found far more misrouted tickets than that suggests.",
    "app/parsing.py reads each recorded call as a label, an abstention or an error, and is believed to be correct. The problems are in how app/harness.py and app/metrics.py use those results.",
  ].join("\n\n"),
  task: [
    "Own the evaluation's correctness. Work out why the report overstates quality and fix app/harness.py and app/metrics.py so that examples that appear in the few-shot prompt are excluded from scoring (even when they were copied with a new id and small differences in case, spacing or character width), abstentions, failed calls and missing predictions count against the classifier, macro F1 is the unweighted mean of per-label F1, and labels without examples or predictions do not crash the report or distort the average.",
    "Make the report state what it excluded and why. Add regression tests under tests/ that fail on the current code and pass with your change. Two simulated teammates can answer questions: Noor about how the numbers are used and what the team decided, Sione about the recorded run and the data. If something is still unclear, make a reasonable assumption and state it in your handoff.",
  ].join("\n\n"),
  outcomes: [
    "Accuracy, per-label precision, recall and F1, and macro F1 are correct for the recorded run in fixtures/ and for other runs with the same format.",
    "The report lists every excluded example with its reason, and states how many predictions abstained or failed.",
    "A regression test in tests/ fails on the original code and passes with your change.",
    "A short handoff explains what was wrong, what you changed, how you checked it, and what remains open.",
  ],
  constraints: [
    "Python standard library only.",
    "Keep run_evaluation(eval_set, few_shot, predictions, labels) -> dict and render_report(report) -> str, and the existing report keys: counts (total, evaluated, correct), accuracy, macro_f1 and per_label.",
    "Do not change the recorded fixtures. The fix belongs in the harness, not in the data.",
    "No model calls. The harness scores recordings only.",
    "A metric that is mathematically undefined is reported as None (shown as n/a), never as a made-up 0.0 or 1.0, and never raises.",
  ],
  outOfScope: [
    "Calling the classifier or re-running predictions.",
    "Changing the prompt, the few-shot examples or the label set.",
    "Confidence calibration, thresholds and confusion matrices.",
  ],
  optionalExtensions: ["If you have time, note in your handoff what the corrected numbers mean for the plan to let the classifier route tickets on its own."],
  interfaceSpec: [
    "app/harness.py",
    "  run_evaluation(eval_set, few_shot, predictions, labels) -> dict",
    "    eval_set and few_shot: lists of {\"id\", \"text\", \"label\"}. predictions: list of {\"example_id\", \"status\", \"output\"}. labels: list of label names.",
    "    Returns {\"counts\": {\"total\", \"evaluated\", \"correct\", ...}, \"accuracy\", \"macro_f1\", \"per_label\": {label: {\"support\", \"predicted\", \"tp\", \"precision\", \"recall\", \"f1\"}}}.",
    "    Your change adds counts[\"excluded\"], counts[\"abstained\"], counts[\"errors\"], and \"excluded\": a list of {\"example_id\", \"reason\", \"few_shot_id\"} with reason \"in_few_shot_prompt\".",
    "  render_report(report) -> str: the text printed by scripts/run_eval.py. With your change it includes one line per exclusion reason in the form \"excluded <reason>: <count>\", plus \"abstained: <n>\" and \"errors: <n>\" lines, and prints n/a for undefined values.",
    "app/metrics.py",
    "  score(examples, outcomes, labels) -> dict: outcomes maps example id to ParsedPrediction.",
    "    support: examples with that gold label. predicted: examples predicted as that label. precision = tp / predicted, recall = tp / support.",
    "    F1 for a label with examples but no correct predictions is 0.0. Precision, recall and F1 that would divide by zero are None.",
    "    macro_f1: unweighted mean of F1 over labels that have at least one example. accuracy: correct / evaluated, None when nothing was evaluated.",
    "app/parsing.py",
    "  parse_prediction(record, labels) -> ParsedPrediction(kind, label, reason): kind is label, abstain or error.",
    "tests/helpers.py",
    "  example(id, text, label), predicted(id, label), abstained(id), failed(id, status=\"timeout\") build records; shipped_run() loads the recorded run in fixtures/.",
  ].join("\n"),
  acceptanceCriteria: [
    {
      id: "AC-1",
      capability: "correctness",
      text: "Eval examples whose text matches a few-shot prompt example after normalization (Unicode NFKC, case-insensitive, whitespace runs collapsed, trimmed) are excluded from scoring, whatever their id. Examples that are only similar are kept.",
    },
    {
      id: "AC-2",
      capability: "correctness",
      text: "Abstentions, recorded errors (failed calls, unparseable output, unknown labels) and eval examples with no recorded prediction are evaluated and count as incorrect. They stay in the accuracy denominator and in each label's recall.",
    },
    {
      id: "AC-3",
      capability: "correctness",
      text: "Accuracy is correct / evaluated, and macro F1 is the unweighted mean of per-label F1 over labels that have at least one evaluated example.",
    },
    {
      id: "AC-4",
      capability: "reliability",
      text: "A label with no predictions has precision None, and F1 0.0 if it has examples. A label with no examples has recall and F1 None and is left out of macro F1. Nothing raises a division by zero.",
    },
    {
      id: "AC-5",
      capability: "correctness",
      text: "The report lists every excluded example with its reason and the matching few-shot id, its counts satisfy total = evaluated + excluded, and the rendered text states the number excluded for each reason and the numbers abstained and failed.",
    },
  ],
  coworkers: [],
};

const TESTS: TestsStage = {
  publicTests: {
    file: { path: "tests/test_public.py", content: TEST_PUBLIC },
    tests: [
      { name: "PublicTests.test_few_shot_examples_do_not_leak_into_the_eval_set", criterionIds: ["AC-1", "AC-5"] },
      { name: "PublicTests.test_abstentions_and_errors_stay_in_the_denominator", criterionIds: ["AC-2"] },
      { name: "PublicTests.test_perfect_predictions_score_one", criterionIds: ["AC-3"] },
    ],
  },
  evaluationTests: {
    file: { path: "tests/test_evaluation.py", content: TEST_EVALUATION },
    tests: [
      { name: "EvaluationTests.test_leaked_examples_are_excluded_by_normalized_text", criterionIds: ["AC-1"] },
      { name: "EvaluationTests.test_similar_tickets_that_are_not_in_the_prompt_are_kept", criterionIds: ["AC-1"] },
      { name: "EvaluationTests.test_report_lists_each_exclusion_with_its_reason", criterionIds: ["AC-5"] },
      { name: "EvaluationTests.test_abstentions_and_recorded_errors_count_as_incorrect", criterionIds: ["AC-2"] },
      { name: "EvaluationTests.test_missing_prediction_counts_as_error", criterionIds: ["AC-2"] },
      { name: "EvaluationTests.test_macro_f1_is_the_unweighted_mean_over_labels_with_examples", criterionIds: ["AC-3"] },
      { name: "EvaluationTests.test_label_never_predicted_has_undefined_precision_and_zero_f1", criterionIds: ["AC-4"] },
      { name: "EvaluationTests.test_label_without_examples_is_undefined_and_left_out_of_macro", criterionIds: ["AC-4", "AC-3"] },
      { name: "EvaluationTests.test_clean_run_accuracy_and_per_label_values", criterionIds: ["AC-3"] },
      { name: "EvaluationTests.test_rendered_report_states_exclusions_and_failed_predictions", criterionIds: ["AC-5"] },
    ],
  },
  incorrectSolutions: [
    {
      description:
        "Excludes leaked examples by casefolded text with whitespace collapsed, but without Unicode normalization, so a copy that differs only in character width (full-width digits) stays in the eval set. Passes the public tests.",
      files: [
        { path: "app/harness.py", content: WRONG_NO_NFKC_HARNESS },
        { path: "app/metrics.py", content: REFERENCE_METRICS },
      ],
    },
    {
      description: "Fixes the denominators and undefined values, but computes macro F1 as the support-weighted mean of per-label F1, so the majority label dominates.",
      files: [
        { path: "app/harness.py", content: REFERENCE_HARNESS },
        { path: "app/metrics.py", content: WRONG_WEIGHTED_MACRO_METRICS },
      ],
    },
    {
      description: "Avoids the division by zero by reporting 0.0 for every undefined metric and averages macro F1 over every label, so a label with no examples drags the score down.",
      files: [
        { path: "app/harness.py", content: REFERENCE_HARNESS },
        { path: "app/metrics.py", content: WRONG_ZERO_FILLED_METRICS },
      ],
    },
    {
      description: "Counts abstentions and recorded errors as incorrect, but scores only examples that have a recorded prediction, so a ticket the batch runner never recorded silently leaves the denominator.",
      files: [
        { path: "app/harness.py", content: WRONG_SKIPS_MISSING_HARNESS },
        { path: "app/metrics.py", content: REFERENCE_METRICS },
      ],
    },
  ],
};

const CODE = {
  starterFiles: [
    { path: "README.md", content: STARTER_README },
    { path: "app/__init__.py", content: STARTER_INIT },
    { path: "app/data.py", content: STARTER_DATA },
    { path: "app/parsing.py", content: STARTER_PARSING },
    { path: "app/metrics.py", content: STARTER_METRICS },
    { path: "app/harness.py", content: STARTER_HARNESS },
    { path: "scripts/run_eval.py", content: STARTER_RUN_EVAL },
    { path: "fixtures/labels.json", content: FIXTURE_LABELS },
    { path: "fixtures/few_shot.json", content: FIXTURE_FEW_SHOT },
    { path: "fixtures/eval_set.json", content: FIXTURE_EVAL_SET },
    { path: "fixtures/predictions.json", content: FIXTURE_PREDICTIONS },
    { path: "tests/helpers.py", content: TEST_HELPERS },
  ],
  referenceFiles: [
    { path: "app/harness.py", content: REFERENCE_HARNESS },
    { path: "app/metrics.py", content: REFERENCE_METRICS },
  ],
  approaches: [
    "In run_evaluation, build a map from normalized few-shot text (unicodedata NFKC, casefold, whitespace collapsed) to few-shot id, and move every eval example whose normalized text is in it to an excluded list with reason in_few_shot_prompt. Give every remaining example an outcome, using a ParsedPrediction error for examples with no record. In score, count support for every evaluated example before looking at the outcome, compute precision, recall and F1 with None where the denominator is zero (F1 0.0 when there are examples but no true positives), and average F1 only over labels with support. render_report prints exclusion, abstention and error lines and n/a for None.",
    "Equivalent: keep score unchanged in shape but pass it the full evaluated list and an outcome for every example, and compute macro F1 with statistics.fmean over the per-label F1 values of labels with support.",
    "Starter defects: few-shot leakage is checked by id only, so the three tickets copied into the prompt under new ids are scored (AC-1); score skips every outcome that is not a label, so abstentions and failures leave the denominator (AC-2); macro_f1 is pooled micro F1 (AC-3); precision and recall divide by zero for a label with no predictions or no examples (AC-4); the report has no exclusion information (AC-5). On the shipped run the corrected numbers are 19 evaluated, accuracy 0.579 and macro F1 0.661, against 0.824 and 0.824 before.",
  ],
};

const COWORKERS: ScenarioPackage["coworkers"] = [
  {
    id: "lead",
    name: "Noor Haddad",
    title: "Engineering lead, Support automation",
    responsibilities: "Owns the triage classifier integration, the evaluation harness and the decision process for automatic routing.",
    topics: ["how the numbers are used", "metric definitions", "exclusions", "routing decision", "scope"],
    tone: "Thoughtful and exact about definitions. Explains the reason behind each decision.",
    boundaries: "Explains how the team defines the metrics and what the report is used for, but will not write the fix or say which lines are wrong.",
  },
  {
    id: "support",
    name: "Sione Tupou",
    title: "Support operations analyst",
    responsibilities: "Builds the eval set and the few-shot examples, runs the batch recordings and spot-checks routed tickets.",
    topics: ["recorded run", "eval set", "few-shot examples", "batch runner failures", "spot check"],
    tone: "Practical and specific. Refers to ticket ids and what happened during the recording.",
    boundaries: "Knows the data and how the run was recorded. Does not know the harness code and will not suggest a fix.",
  },
];

const COWORKER_FACTS: ProtectedMaterials["coworkerFacts"] = {
  lead: [
    {
      id: "lead-f1",
      text: "An abstention means the ticket goes to a person, and so does a failed call. For the routing decision both count as the classifier not getting the ticket right. Leaving them out of the denominator makes the classifier look better the more often it gives up.",
      topics: ["abstain", "abstention", "error", "failed", "timeout", "denominator", "accuracy"],
    },
    {
      id: "lead-f2",
      text: "Macro F1 is the gate because outage and account_access tickets are rare but matter most. We mean the plain average of each label's F1, every label weighted the same, not pooled counts and not weighted by support.",
      topics: ["macro", "micro", "weighted", "average", "f1", "gate", "threshold"],
    },
    {
      id: "lead-f3",
      text: "A label with no examples in a run tells us nothing, so it should not pull macro F1 up or down. If a metric cannot be computed, show n/a. A 0.0 or 1.0 we made up is worse than no number.",
      topics: ["absent label", "no examples", "zero", "undefined", "n/a", "none", "division"],
    },
    {
      id: "lead-f4",
      text: "Any ticket that is in the prompt has to be out of the scoring, whatever id it has. Match on the text after normalizing it; we know copies were pasted from different tools.",
      topics: ["leak", "few-shot", "prompt", "duplicate", "contamination", "exclude", "normalize"],
    },
    {
      id: "lead-f5",
      text: "The report has to say what it left out and why. Reviewers have to be able to see that 3 tickets were excluded without reading the code.",
      topics: ["report", "excluded", "transparency", "review", "render"],
    },
    {
      id: "lead-f6",
      text: "Keep run_evaluation and render_report as they are called today, and keep the fixtures unchanged. Confidence thresholds are a separate piece of work.",
      topics: ["interface", "fixtures", "scope", "confidence", "threshold"],
    },
  ],
  support: [
    {
      id: "support-f1",
      text: "When I rebuilt the few-shot prompt in August I copied three eval tickets into it, tkt-2207, tkt-2215 and tkt-2219, and gave them fs- ids. Some were pasted from the help desk export, which changes spacing and capitalization and sometimes uses full-width digits.",
      topics: ["few-shot", "leak", "copied", "prompt", "eval set", "ids", "export"],
    },
    {
      id: "support-f2",
      text: "In the last recorded run, one call timed out, one came back as plain text instead of JSON, one used data_quality, a label we retired in July, and one ticket has no record at all because the batch runner crashed on it. The classifier also abstained on one ticket.",
      topics: ["recorded run", "timeout", "error", "missing", "abstain", "batch runner", "retired label"],
    },
    {
      id: "support-f3",
      text: "The eval set is rebuilt every month from real ticket volumes, so a quiet month can have no outage tickets at all; this month has only three. My spot check found about 4 in 10 tickets routed to the wrong queue, which is nowhere near what the report says.",
      topics: ["outage", "absent label", "no examples", "spot check", "misrouted", "observed"],
    },
    {
      id: "support-f4",
      text: "I don't know the harness code. Noor decides how the metrics are defined.",
      topics: ["code", "fix", "implementation"],
    },
  ],
};

const RUBRIC_NOTES: ProtectedMaterials["rubricNotes"] = {
  "CR-1":
    "Strong submissions exclude leaked examples by normalized text including Unicode normalization, keep every non-leaked example in the denominator (abstentions, errors and missing predictions included), and compute macro F1 as the unweighted mean over labels with support. Id-only or casefold-only matching, support-weighted macro and skipping unrecorded tickets are the common wrong turns; the evaluation tests catch each one.",
  "CR-2":
    "Look for undefined metrics reported as None and rendered as n/a, with labels without examples left out of macro F1. Zero-filling undefined values or catching ZeroDivisionError and substituting 0.0 hides the problem and distorts the average.",
  "CR-3":
    "A useful regression test builds a small run by hand where the correct value can be worked out on paper (a leaked copy with different spacing, an abstention, an absent label) and asserts on the numbers and on the exclusion list. A test that only checks the report renders, or only reruns the shipped fixtures, does not pin down the definitions.",
};

function fixedSections(): ScenarioPackage["provenance"]["sections"] {
  const out = {} as ScenarioPackage["provenance"]["sections"];
  for (const s of SECTIONS) out[s] = { revision: 1, editedBy: "author", updatedAt: AUTHORED_AT };
  return out;
}

/** The hand-authored evaluation harness work sample. Deterministic: no clock or randomness. */
export function buildEvalHarnessPackage(): { pkg: ScenarioPackage; prot: ProtectedMaterials } {
  const built = assemble(config(), BRIEF, CODE, TESTS, null, "template");
  const pkg: ScenarioPackage = {
    ...built.pkg,
    setupInstructions: [
      "Install Python 3.12 or newer. No packages are needed.",
      "Download the starter project and open it in your editor.",
      "From the project root, print the report for the recorded run: python scripts/run_eval.py",
      `Run the public tests: ${built.pkg.environment.testCommand} (use python instead of python3 on Windows). Two public tests fail on the starter project because they reproduce the problems.`,
    ],
    fixturePaths: FIXTURE_PATHS,
    coworkers: COWORKERS,
    submission: {
      requirements: [
        "Submit the project with your changes under app/ and the tests you added.",
        "Include a regression test in tests/ that fails on the original code and passes with your change.",
        "Keep the public tests in tests/test_public.py passing, and do not change the files in fixtures/.",
        "Answer the three handoff questions.",
      ],
      handoffPrompts: [
        { id: "what_changed", label: "What did you change?", help: "What was wrong with the numbers, the files you changed, and how the report differs now." },
        { id: "how_checked", label: "How did you check it?", help: "Tests you added or ran, and any values you worked out by hand." },
        { id: "unresolved", label: "What remains unresolved?", help: "Risks, assumptions and anything you would do next." },
      ],
    },
    accommodations: ["Extra time can be granted per invitation. Ask the hiring team before you start.", "Screen readers and keyboard-only use are supported in the browser workspace."],
    reviewQuestion: {
      coworkerId: "lead",
      text: "Before you hand this off: next month the eval set has no billing tickets and the classifier still predicts billing twice. What does your report show for billing, and how does that affect macro F1?",
    },
    interruptionPolicy:
      "Requirements will not change during the task. Noor may ask one question about your change near the end; nothing else will interrupt you. The timer keeps running if you step away or lose your connection; your saved files stay in the workspace, so reopen the invitation link to continue.",
    feedbackPolicy:
      "When the hiring team releases your report, you can see which acceptance criteria the tests confirmed and how each criterion was judged. Hidden test code and held-out cases are not shared. A reviewer reads your regression tests and your handoff.",
    provenance: { path: "template", model: null, generatedAt: AUTHORED_AT, sections: fixedSections() },
  };
  const prot: ProtectedMaterials = {
    ...built.prot,
    protectedTests: [...built.prot.protectedTests, { path: HELDOUT_PATH, content: HELDOUT_CASES }],
    coworkerFacts: COWORKER_FACTS,
    rubricNotes: RUBRIC_NOTES,
  };
  return { pkg, prot };
}
