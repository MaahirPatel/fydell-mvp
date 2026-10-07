import type { RubricDimension, ScenarioDefinition } from "../types";
import { BACKEND_WEBHOOK_RETRY_V1 } from "./definition";

/**
 * v2 keeps the task, starter behavior and hidden checks of v1. It changes the
 * rubric to criterion-level states tied to the defined checks, records the
 * teammate introductions shown to candidates, and corrects the known-issues
 * wording now that teammate replies are generated within the scenario facts.
 */
const RUBRIC_V2: RubricDimension[] = [
  {
    key: "correctness",
    label: "Correctness",
    question: "Does the dispatcher behave as the incident and the update require, in the defined cases?",
    evidenceSources: ["tests", "code"],
    anchors: [
      { level: "demonstrated_additional", observable: "Every criterion below is demonstrated and the submission adds its own regression tests for the risky paths." },
      { level: "demonstrated", observable: "Every correctness criterion below is demonstrated in its defined cases." },
      { level: "partially_demonstrated", observable: "Some criteria are demonstrated; at least one has failing defined cases." },
      { level: "concern_observed", observable: "Most defined cases fail, or the code raises during the checks." },
      { level: "not_assessed", observable: "The checks could not run for platform reasons." },
    ],
    limitations: "Checks exercise the public interface in memory. Concurrency, persistence, real network behavior and performance are not assessed.",
    criteria: [
      {
        id: "retry_schedule",
        label: "Backoff schedule and attempt limit",
        requirement: "Retries start at 60 seconds, double, cap at 3600 seconds, and stop as dead-lettered after 8 attempts, counting mixed temporary failures.",
        probeIds: ["P2", "H1", "H6"],
        anchors: [
          { state: "demonstrated_additional", observable: "All three defined cases pass and the submission's own tests cover the cap and the 8th attempt." },
          { state: "demonstrated", observable: "All three defined cases pass." },
          { state: "partially_demonstrated", observable: "The first retry is right but the cap or the attempt limit fails." },
          { state: "concern_observed", observable: "No defined case passes, or retries are immediate." },
          { state: "not_assessed", observable: "The checks did not run." },
        ],
        notCovered: "Clock drift, persisted schedules and retries across process restarts.",
        improvement: "Walk one delivery through every attempt on paper: the delay after each failure, where the 3600-second cap starts to apply, and what happens on the 8th failed attempt. Then make the code match that table.",
        recheck: "Write a test that fails a delivery eight times with a mix of 503s and connection errors, and assert each scheduled delay and the final dead_lettered status.",
      },
      {
        id: "failure_classification",
        label: "Temporary and permanent failures",
        requirement: "408, 429, 502, 503 and 504 are retried; 410, 3xx and other 4xx end as failed without a retry; 2xx is delivered.",
        probeIds: ["P1", "P3", "H2", "H3"],
        anchors: [
          { state: "demonstrated_additional", observable: "All four defined cases pass and the classification is a single explicit policy covered by the submission's tests." },
          { state: "demonstrated", observable: "All four defined cases pass." },
          { state: "partially_demonstrated", observable: "Some status groups are classified correctly; others are retried or dropped wrongly." },
          { state: "concern_observed", observable: "Permanent failures are retried, or temporary failures are dropped, across the defined cases." },
          { state: "not_assessed", observable: "The checks did not run." },
        ],
        notCovered: "Status codes outside the defined list.",
        improvement: "Put the temporary-versus-permanent decision in one function and check it against the full list in the brief, including the 3xx and 4xx codes that are easy to miss.",
        recheck: "Table-test that function with every status code named in INCIDENT.md and the lead's answer.",
      },
      {
        id: "duplicate_safety",
        label: "Duplicate-safe retries",
        requirement: "Every attempt sends the delivery id as Idempotency-Key, and delivered or not-yet-due deliveries are not sent again.",
        probeIds: ["P4", "H5"],
        anchors: [
          { state: "demonstrated_additional", observable: "Both defined cases pass and the submission tests that the key is unchanged across retries." },
          { state: "demonstrated", observable: "Both defined cases pass." },
          { state: "partially_demonstrated", observable: "One of the two defined cases fails." },
          { state: "concern_observed", observable: "Both defined cases fail." },
          { state: "not_assessed", observable: "The checks did not run." },
        ],
        notCovered: "Concurrent dispatchers sending the same delivery; merchant-side deduplication.",
        improvement: "Derive the Idempotency-Key from the delivery itself rather than from the attempt, and make sure a delivery that is already delivered, or not yet due, is skipped by the dispatch loop.",
        recheck: "Capture the headers of three attempts for one delivery and assert the key is identical; run dispatch twice and assert a delivered item is sent once.",
      },
      {
        id: "transport_errors",
        label: "Transport errors",
        requirement: "A connection failure is recorded and retried with the same backoff, and a later success is delivered.",
        probeIds: ["H4"],
        anchors: [
          { state: "demonstrated_additional", observable: "The defined case passes and the submission tests a transport error on the final attempt." },
          { state: "demonstrated", observable: "The defined case passes." },
          { state: "concern_observed", observable: "The defined case fails." },
          { state: "not_assessed", observable: "The check did not run." },
        ],
        notCovered: "Timeouts in a real HTTP client.",
        improvement: "Treat an exception from the transport as a temporary failure: record the error, count the attempt and schedule the next retry with the same backoff.",
        recheck: "Make the fake transport raise once and then succeed, and assert the delivery ends delivered on the second attempt with the error recorded.",
      },
    ],
  },
  {
    key: "engineering_judgment",
    label: "Engineering judgment",
    question: "Are the design choices sound and proportionate for an incident fix?",
    evidenceSources: ["code", "handoff"],
    anchors: [
      { level: "demonstrated_additional", observable: "Both criteria demonstrated, with a stated tradeoff the reviewer can point to." },
      { level: "demonstrated", observable: "Both criteria below are demonstrated." },
      { level: "partially_demonstrated", observable: "One criterion is demonstrated." },
      { level: "concern_observed", observable: "Interface broken, dependencies added against the brief, or behavior hard-coded to the visible tests." },
      { level: "not_assessed", observable: "Too little changed code to judge." },
    ],
    limitations: "Style preferences are not evidence. Reviewers cite a specific line and explain the consequence.",
    criteria: [
      {
        id: "policy_structure",
        label: "Retry policy is explicit and changeable",
        requirement: "Classification and scheduling live in one place a teammate could change safely, and the public interface in the README is kept.",
        probeIds: [],
        anchors: [
          { state: "demonstrated", observable: "The reviewer can cite the lines where the policy lives, and the README interface is unchanged." },
          { state: "partially_demonstrated", observable: "Works, but the policy is spread across call sites." },
          { state: "concern_observed", observable: "The interface was broken or a dependency was added against the brief." },
          { state: "not_assessed", observable: "Too little changed code to judge." },
        ],
        notCovered: "Long-term maintainability beyond this change.",
        improvement: "Gather the retry rules (classification, delays, attempt limit) into one module with named constants, so the next policy change touches one place.",
        recheck: "Ask: if the lead changed the attempt limit to 10, how many lines would change?",
      },
      {
        id: "added_tests",
        label: "Tests added for risky paths",
        requirement: "The submission adds tests for at least one risky path (cap, dead-letter, idempotency or Retry-After).",
        probeIds: [],
        anchors: [
          { state: "demonstrated", observable: "Added tests exercise at least one risky path and pass." },
          { state: "partially_demonstrated", observable: "Tests were added but only cover the happy path." },
          { state: "not_assessed", observable: "No tests were added. Not adding tests is reported here, not counted as a concern on its own." },
        ],
        notCovered: "Test quality beyond the files submitted.",
        improvement: "Add at least one test for the path most likely to regress: the cap, the dead-letter on the 8th attempt, the unchanged key, or Retry-After.",
        recheck: "Break the behavior on purpose and confirm your test fails.",
      },
    ],
  },
  {
    key: "requirement_response",
    label: "Response to the requirement update",
    question: "Did the candidate correctly apply the Retry-After update they received?",
    evidenceSources: ["tests", "update", "handoff"],
    anchors: [
      { level: "demonstrated_additional", observable: "All update cases pass and the handoff explains how the update interacts with backoff." },
      { level: "demonstrated", observable: "All defined update cases pass." },
      { level: "partially_demonstrated", observable: "Some update cases pass (for example the cap or header case is missed)." },
      { level: "concern_observed", observable: "The update was not applied." },
      { level: "not_assessed", observable: "The attempt ended early for reasons outside the candidate's control." },
    ],
    limitations: "An acknowledgement click shows the candidate saw the update, not that they understood it.",
    criteria: [
      {
        id: "retry_after",
        label: "Retry-After honored as requested",
        requirement: "Wait the longer of Retry-After and normal backoff, never beyond 3600 seconds, case-insensitive header, ignore non-numeric values.",
        probeIds: ["U1", "U2", "U3", "U4", "U5"],
        anchors: [
          { state: "demonstrated_additional", observable: "All five defined cases pass and the submission tests the header case or the cap itself." },
          { state: "demonstrated", observable: "All five defined cases pass." },
          { state: "partially_demonstrated", observable: "Some defined cases pass." },
          { state: "concern_observed", observable: "No defined case passes." },
          { state: "not_assessed", observable: "The checks did not run." },
        ],
        notCovered: "HTTP-date Retry-After values, which the partner request did not include.",
        improvement: "Re-read the partner request line by line: the longer of the two waits, the 3600-second ceiling, header names in any case, and ignoring values that are not whole numbers. Each is a separate branch.",
        recheck: "Add one test per sentence of the partner request, including a lower-case header name and a non-numeric value.",
      },
    ],
  },
  {
    key: "work_communication",
    label: "Work communication",
    question: "Is the handoff accurate, and were clarifying questions relevant?",
    evidenceSources: ["handoff", "messages", "tests"],
    anchors: [
      { level: "demonstrated_additional", observable: "Both criteria demonstrated, and the handoff names a specific next step a teammate could act on." },
      { level: "demonstrated", observable: "Both criteria below are demonstrated." },
      { level: "partially_demonstrated", observable: "The handoff is accurate but vague, or leaves out a known gap." },
      { level: "concern_observed", observable: "The handoff claims behavior that the checks show is missing." },
      { level: "not_assessed", observable: "The handoff is empty." },
    ],
    limitations: "Not asking questions is not a negative signal. Tone, fluency and accent are never assessed.",
    criteria: [
      {
        id: "handoff_accuracy",
        label: "Handoff matches the results",
        requirement: "What the handoff says works agrees with the defined checks.",
        probeIds: [],
        anchors: [
          { state: "demonstrated", observable: "Every behavior the handoff claims is supported by a passing check or cited code." },
          { state: "partially_demonstrated", observable: "Mostly accurate, with one unsupported claim." },
          { state: "concern_observed", observable: "The handoff claims behavior that a failing check shows is missing." },
          { state: "not_assessed", observable: "The handoff is empty." },
        ],
        notCovered: "Spoken communication and collaboration over time.",
        improvement: "Before writing the handoff, run the tests and describe only what they show. Name anything you believe works but did not test as untested.",
        recheck: "For each claim in your handoff, point to the test or line that supports it.",
      },
      {
        id: "named_risks",
        label: "Risks named specifically",
        requirement: "Remaining risks or unfinished work are named concretely enough for a teammate to pick up.",
        probeIds: [],
        anchors: [
          { state: "demonstrated", observable: "At least one specific risk or next step is named." },
          { state: "partially_demonstrated", observable: "Risks are mentioned only in general terms." },
          { state: "not_assessed", observable: "The risks field is empty." },
        ],
        notCovered: "How the candidate would communicate in a live incident.",
        improvement: "Name the specific risk and the next step, for example which case is untested or which assumption you made, so a teammate could pick it up tomorrow.",
        recheck: "Could someone who never saw your code act on the risks section alone?",
      },
    ],
  },
];

export const BACKEND_WEBHOOK_RETRY_V2: ScenarioDefinition = {
  ...BACKEND_WEBHOOK_RETRY_V1,
  version: 2,
  rubricVersion: "backend-webhook-retry/rubric-v2",
  rubric: RUBRIC_V2,
  reviewRecord: { ...BACKEND_WEBHOOK_RETRY_V1.reviewRecord, validatedAt: "2026-10-07" },
  knownIssues: [
    "macOS and Linux setup paths are expected to work but have not been timed on clean machines.",
    "Teammate replies are generated by a language model limited to the scenario's written facts. When the model is unavailable or over its limit, the teammate sends the written answer for that fact instead. Questions outside the facts get a reply asking the candidate to state their assumption.",
    "The hiring team reviews the evidence and writes the report themselves. Automated grading of the qualitative criteria is not enabled.",
    "Criterion states describe this submission against the defined cases. They are not scores and are not comparable across different tasks.",
  ],
};
