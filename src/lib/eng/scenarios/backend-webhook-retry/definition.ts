import type { ScenarioDefinition } from "../types";

export const BACKEND_WEBHOOK_RETRY_V1: ScenarioDefinition = {
  key: "backend-webhook-retry",
  version: 1,
  title: "Webhook retry incident",
  roleFamily: "backend_engineer",
  suiteVersion: "backend-webhook-retry/suite-v1",
  rubricVersion: "backend-webhook-retry/rubric-v1",
  summary:
    "A payments webhook dispatcher caused a retry storm. Fix how it retries, gives up and identifies deliveries. One requirement update from the team arrives partway through.",
  candidateBrief: [
    "You are joining Harbor Pay's Payments Platform team for one incident fix. The starter project is a small Python service with an incident write-up, a log excerpt and public tests.",
    "Work in your own editor. Fydell records only what you send here: team messages, the setup result, your ZIP and your handoff.",
    "About 20 minutes after you start, the team posts one requirement update. It appears under Updates and in the team thread.",
  ],
  initialRequirements: [
    "Retry temporary failures with exponential backoff: the first retry waits 60 seconds, each later retry waits twice as long, never more than 3600 seconds.",
    "Do not retry permanent failures. They end as failed, with the status code recorded.",
    "A delivery that has not succeeded after 8 attempts in total ends as dead_lettered and is never sent again.",
    "Every attempt of the same delivery sends the same Idempotency-Key: the delivery id.",
    "Which responses count as temporary is a judgment call. Ask the team, or state your assumption in the handoff.",
  ],
  resources: [
    { path: "INCIDENT.md", description: "What happened and what the team needs. Start here." },
    { path: "logs/dispatcher-2026-09-14.log", description: "Log excerpt from the incident." },
    { path: "README.md", description: "Setup, tests and the public interface other services depend on." },
    { path: "tests/test_dispatcher.py", description: "Public tests. Several fail on the starter code; that is the incident." },
  ],
  testCommands: { windows: "python -m unittest -v", unix: "python3 -m unittest -v" },
  setupCommands: { windows: "python preflight.py", unix: "python3 preflight.py" },
  stack: ["Python 3.11 to 3.13", "Standard library only", "unittest"],
  targetMinutes: 50,
  defaultAllowedMinutes: 90,
  submissionGraceMinutes: 15,
  prerequisites: [
    "A desktop or laptop with Python 3.11, 3.12 or 3.13 installed.",
    "Any code editor.",
    "Ability to create a ZIP file (built into Windows, macOS and most Linux desktops).",
  ],
  supportedEnvironments: [
    {
      label: "Windows 11 with Python 3.12",
      status: "validated",
      note: "Setup check and public tests confirmed.",
    },
    {
      label: "macOS or Linux with Python 3.11 to 3.13",
      status: "expected",
      note: "Uses the same commands with python3. Not yet confirmed on a clean machine.",
    },
    {
      label: "Python 3.10 or older, tablets and phones",
      status: "unsupported",
      note: "The setup check stops before the timer can start.",
    },
  ],
  aiPolicy: [
    "You may use any editor, documentation, search engine and AI assistant, the same way you would at work.",
    "You will not be marked down for using permitted tools. You are responsible for what you submit.",
    "At the end we ask you to describe any AI assistance in your own words. Fydell cannot observe your AI tools, so that answer is recorded as your statement, not as an observation.",
    "Do not ask another person to do the task for you.",
  ],
  packaging: [
    "Upload one .zip file of the whole project folder, up to 5 MB.",
    "Include source, tests, fydell.json and any files you added.",
    "Leave out virtual environments (.venv, venv), __pycache__, .git, node_modules and build output.",
    "Do not include real credentials. A file named .env is refused; .env.example is fine.",
    "Nested archives, symbolic links and files outside the project folder are refused.",
  ],
  accommodations: [
    "Setup time does not count: the timer starts only when you press Start after the setup check.",
    "The window is 90 minutes for about 50 minutes of work, so you can take short breaks.",
    "If you need an extension or an accommodation, contact the employer or Fydell support before or during the attempt. Extensions are logged and shown to you here.",
    "Uploads are accepted for 15 minutes after the deadline and marked late. Being late is shown to the reviewer as a fact, not as a judgment of skill.",
  ],
  starterRoot: "harbor-webhooks",
  setupCodePrefix: "HWR",
  supportedRuntimes: ["3.11", "3.12", "3.13"],
  teammates: [
    { id: "priya", name: "Alex Morgan", title: "Engineering lead", askAbout: "Your lead for this fix. Scope, retry policy, edge cases, tests and logistics." },
    { id: "marcus", name: "Jordan Hayes", title: "Partner support", askAbout: "What merchants and partners need. Not deep in the code." },
  ],
  teamContext:
    "Harbor Pay sends payment webhooks to merchants. Last week the dispatcher retried failed deliveries in a tight loop and flooded several merchants (the retry storm in INCIDENT.md). The new engineer has been asked to fix how the dispatcher retries, gives up and identifies deliveries. The project is a small standard-library Python service with in-memory fakes; there is no database or real network.",
  personas: {
    priya: {
      relationship: "manager",
      voice:
        "Engineering lead and the new engineer's manager for this fix. Direct, calm, short messages. Decides scope and policy quickly and says so plainly. Trusts the engineer to make reasonable calls and expects assumptions written in the handoff. Does not write the code for them.",
      owns: "retry policy, which failures are temporary or permanent, backoff, attempt limits, idempotency, scope, tests and logistics",
      defersTo: [{ teammateId: "marcus", topics: "what partners have asked for, including Retry-After details after the partner request" }],
    },
    marcus: {
      relationship: "stakeholder",
      voice:
        "Partner support. Friendly, practical, relays what partners need in plain language. Not deeply technical about the codebase and says so; points code questions back to Alex.",
      owns: "partner requests, especially the Retry-After request once it has been posted",
      defersTo: [{ teammateId: "priya", topics: "code structure, retry policy beyond the partner request, scope and tests" }],
    },
  },
  kickoff: {
    teammateId: "priya",
    body:
      "Welcome aboard, and thanks for picking this up. The short version: the dispatcher hammered merchants during last week's incident. I need retries with proper backoff, a clean stop for permanent failures and after the attempt limit, and the same Idempotency-Key on every retry. INCIDENT.md has the details. Ask me here if a call isn't clear, and note any assumptions in your handoff.",
  },
  fallbackRuleId: "fallback",
  clarificationRules: [
    {
      id: "identity",
      teammateId: "priya",
      mandatory: true,
      signals: [["real", "bot", "ai", "human", "person", "automated", "scripted", "simulated"], ["you", "alex", "jordan", "priya", "marcus", "are", "is"]],
      minGroups: 2,
      availability: "always",
      answer:
        "I'm a simulated teammate for this assessment, not a real person. Every candidate gets the same facts from me, so ask whatever you'd ask a real lead.",
    },
    {
      id: "retry_after_policy",
      teammateId: "marcus",
      signals: [["retryafter", "retry_after"], ["429", "503", "header", "honor", "respect", "use", "handle", "how", "should"]],
      minGroups: 1,
      availability: "after_update",
      answer:
        "Honor Retry-After on 429 and 503 only. Treat it as whole seconds. Wait whichever is longer, the Retry-After value or your normal backoff, and never more than 3600 seconds. If the value isn't a number, ignore it and use the normal backoff. Those retries still count toward the 8 attempts.",
    },
    {
      id: "retry_after_early",
      teammateId: "priya",
      signals: [["retryafter", "retry_after"]],
      minGroups: 1,
      availability: "before_update",
      answer: "Nothing decided on Retry-After yet. Stick to the incident brief for now; I'll post here if that changes.",
    },
    {
      id: "retry_after_dates",
      teammateId: "marcus",
      signals: [["date", "http-date", "gmt", "timestamp", "rfc"], ["retryafter", "retry_after", "header", "format"]],
      minGroups: 2,
      availability: "after_update",
      answer:
        "Only whole seconds. If a partner sends a date instead, treat it as unparseable and fall back to the normal backoff.",
    },
    {
      id: "redirects",
      teammateId: "priya",
      signals: [["redirect", "redirects", "3xx", "301", "302", "307", "308", "follow"]],
      minGroups: 1,
      availability: "always",
      answer:
        "We don't follow redirects. A 3xx is a permanent failure for us: merchants have to register the final URL.",
    },
    {
      id: "temporary_vs_permanent",
      teammateId: "priya",
      signals: [
        ["4xx", "5xx", "400", "401", "403", "404", "408", "409", "410", "422", "429", "500", "502", "503", "504", "status", "statuses", "codes", "code", "error", "errors", "timeout", "timeouts", "connection"],
        ["retry", "retryable", "retried", "retrying", "temporary", "transient", "permanent", "give", "which", "treat", "count", "counts"],
      ],
      minGroups: 2,
      availability: "always",
      answer:
        "Treat any 5xx, 408 and 429 as temporary, and connection failures too (no HTTP response at all). Everything else, including other 4xx, is permanent: the merchant has to fix something on their side. We don't follow redirects, so 3xx is permanent too.",
    },
    {
      id: "jitter",
      teammateId: "priya",
      signals: [["jitter", "random", "randomize", "randomise", "randomness"]],
      minGroups: 1,
      availability: "always",
      answer: "No jitter for now. Keep it deterministic so we can reason about it after the incident.",
    },
    {
      id: "attempt_count",
      teammateId: "priya",
      signals: [["attempt", "attempts", "tries", "limit", "max", "maximum", "eight", "8"], ["total", "include", "including", "first", "count", "counts", "dead", "deadletter", "dead_lettered", "after", "exhausted"]],
      minGroups: 2,
      availability: "always",
      answer:
        "8 attempts in total, counting the first send. Connection failures count as attempts too. If the 8th attempt fails with a temporary error, mark it dead_lettered and never send it again.",
    },
    {
      id: "backoff",
      teammateId: "priya",
      signals: [["backoff", "delay", "delays", "wait", "interval", "exponential", "doubling", "double", "cap", "capped", "3600", "60"]],
      minGroups: 1,
      availability: "always",
      answer:
        "First retry 60 seconds after the failed attempt, then double each time: 60, 120, 240 and so on, never more than 3600 seconds.",
    },
    {
      id: "idempotency",
      teammateId: "priya",
      signals: [["idempotency", "idempotent", "dedupe", "deduplicate", "duplicate", "duplicates", "uuid"], ["key", "keys", "header", "same", "retries", "id"]],
      minGroups: 1,
      availability: "always",
      answer:
        "Send the delivery id as the Idempotency-Key header, unchanged across every retry of that delivery. Merchants dedupe on it.",
    },
    {
      id: "scope",
      teammateId: "priya",
      signals: [["database", "persist", "persistence", "postgres", "redis", "http", "requests", "httpx", "scheduler", "network", "dependency", "dependencies", "library", "pip", "install"]],
      minGroups: 1,
      availability: "always",
      answer:
        "Out of scope. Everything runs in memory with the fakes in the project. Please don't add dependencies; the project is standard library only.",
    },
    {
      id: "tests",
      teammateId: "priya",
      signals: [["test", "tests", "unittest", "pytest", "hidden", "graded", "grading", "checks", "evaluate", "evaluated", "scoring", "score"]],
      minGroups: 1,
      availability: "always",
      answer:
        "Add whatever tests help you. After you submit, Fydell runs its own checks through the public interface in the README, so keep those names stable. I can't share what those checks contain.",
    },
    {
      id: "time_support",
      teammateId: "priya",
      signals: [["time", "deadline", "extension", "extra", "late", "break", "accommodation", "support", "stuck", "setup", "install"]],
      minGroups: 1,
      availability: "always",
      answer:
        "Your deadline is shown at the top of the page. If something outside your control slows you down, use the Support link there. Setup problems are not held against you.",
    },
    {
      id: "fallback",
      teammateId: "priya",
      signals: [],
      minGroups: 0,
      availability: "always",
      answer:
        "That isn't covered by what I know for this task, so I can't give you more than the brief. Make a reasonable call and write down your assumption in the handoff.",
    },
  ],
  requirementUpdate: {
    id: "retry-after",
    teammateId: "marcus",
    releaseAfterMinutes: 20,
    title: "Partner request: honor Retry-After",
    body:
      "Our largest partner rate-limits us. When they return 429 or 503 they include a Retry-After header in whole seconds, and they asked us to respect it. Please wait whichever is longer, their Retry-After or your normal backoff, and still never more than 3600 seconds. Header names arrive in whatever case the partner's server uses. If the value isn't a number, ignore it. These retries still count toward the 8 attempts.",
  },
  handoffPrompts: [
    { field: "what_changed", label: "What changed?", help: "The behavior you changed and where. A few sentences." },
    { field: "testing", label: "What did you test?", help: "Tests you ran or added, and what they showed." },
    { field: "risks", label: "What remains unresolved?", help: "Risks, anything unfinished, and what you would do next." },
  ],
  rubric: [
    {
      key: "correctness",
      label: "Correctness",
      question: "Does the dispatcher behave as the incident and the update require?",
      evidenceSources: ["tests", "code"],
      anchors: [
        { level: "strong", observable: "All incident probes pass, including cap, dead-letter and transport errors, with no candidate errors." },
        { level: "adequate", observable: "Core behavior passes (backoff, permanent failures, idempotency). One edge case fails, and the reviewer can point to it." },
        { level: "weak", observable: "Two or more core behaviors fail, or the code raises during probes." },
        { level: "insufficient_evidence", observable: "Evaluation could not run for platform reasons, or the archive could not be evaluated." },
      ],
      limitations: "Probes exercise the public interface only. They do not measure performance or production readiness.",
    },
    {
      key: "engineering_judgment",
      label: "Engineering judgment",
      question: "Are the design choices sound and proportionate for an incident fix?",
      evidenceSources: ["code", "handoff"],
      anchors: [
        { level: "strong", observable: "Retry classification and scheduling are explicit and easy to change. The public interface is kept. Tests added for risky paths." },
        { level: "adequate", observable: "Works, but the policy is scattered or hard to change. Few or no added tests." },
        { level: "weak", observable: "Interface broken, dependencies added against the brief, or behavior hard-coded to the visible tests." },
        { level: "insufficient_evidence", observable: "Too little changed code to judge." },
      ],
      limitations: "Style preferences are not evidence. Reviewers cite a specific line and explain the consequence.",
    },
    {
      key: "requirement_response",
      label: "Response to the requirement update",
      question: "Did the candidate correctly apply the Retry-After update they received?",
      evidenceSources: ["tests", "update", "handoff"],
      anchors: [
        { level: "strong", observable: "All update probes pass, and the handoff mentions the update." },
        { level: "adequate", observable: "Partly applied (for example the cap or header case is missed) and the gap is acknowledged or visible." },
        { level: "weak", observable: "Update not applied and not mentioned." },
        { level: "insufficient_evidence", observable: "The attempt ended early for reasons outside the candidate's control. (Submitting before the scheduled time posts the update first, so every submission is made with it in hand.)" },
      ],
      limitations: "An acknowledgement click shows the candidate saw the update, not that they understood it.",
    },
    {
      key: "work_communication",
      label: "Work communication",
      question: "Is the handoff accurate, and were clarifying questions relevant?",
      evidenceSources: ["handoff", "messages", "tests"],
      anchors: [
        { level: "strong", observable: "Handoff claims match the test results, and risks are named specifically. Any questions asked were relevant." },
        { level: "adequate", observable: "Handoff is accurate but vague, or leaves out a known gap." },
        { level: "weak", observable: "Handoff claims behavior that the tests show is missing." },
        { level: "insufficient_evidence", observable: "Handoff is empty." },
      ],
      limitations: "Not asking questions is not a negative signal. Tone, fluency and accent are never assessed.",
    },
  ],
  knownIssues: [
    "macOS and Linux setup paths are expected to work but have not been timed on clean machines.",
    "The simulated teammates answer from a fixed rule set. Questions outside it get a standard reply asking the candidate to state their assumption.",
    "The hiring team reviews the evidence and writes the report themselves. Automated grading of the qualitative sections is not enabled.",
  ],
  reviewRecord: {
    validatedAt: "2026-09-27",
    validatedBy: "Fydell assessment maintainers",
    command: "node scripts/validate-eng-scenario.mjs",
    fixtures: [
      "starter",
      "reference",
      "alternative",
      "defective-retries-4xx",
      "defective-key-per-attempt",
      "defective-no-cap",
      "defective-dead-letter-off-by-one",
      "defective-transport-error-final",
      "partial-ignores-update",
      "defective-retry-after-replaces-backoff",
      "adversarial-exit-on-import",
      "adversarial-forged-result",
    ],
    humanReviewRequired: true,
  },
};
