import type { MicroSimContent } from "../micro-types";

/**
 * Backend Engineer: webhook retry incident (INC-2291).
 *
 * The code, provided tests and incident material live in
 * scenarios/webhook-retry-incident (candidate package, v1.0.0). Correctness
 * and adaptation evidence come from the trusted and hidden tests run in the
 * isolated runner (src/lib/engineering); the questions below collect the
 * reviewer handoff. Teammate replies are authored facts from the internal
 * rubric (.fydell/rubric.json), never generated requirements.
 */
export const ENGINEERING_WEBHOOK_RETRY: MicroSimContent = {
  format: "micro",
  schemaVersion: 1,
  slug: "webhook-retry-incident",
  roleKey: "backend_engineer",
  title: "Webhook retry incident",
  tagline: "A release made webhook retries hammer one merchant and double-deliver to another. Fix it as a reviewable hotfix.",
  mission:
    "You are the on-call backend engineer for Kestrel Ledger's outbound webhook service. Since release 2.14, a merchant's disabled endpoint was hit about 2,000 times in an hour and another merchant received the same invoice.paid event twice. Find the cause in the webhooks/ package, fix it without breaking existing delivery behaviour, run the tests, and write a handoff an on-call reviewer can act on. Maya, the platform lead, is available in the team thread.",
  companyName: "Kestrel Ledger (fictional)",
  durationMinutes: 60,
  engineering: {
    scenarioId: "webhook-retry-incident",
    scenarioVersion: "1.0.0",
    updateAfterMinutes: 25,
    toolsPolicy:
      "Use the Fydell workspace editor and Run tests. You may read Python and pytest documentation and use any AI assistant or external editor you like. Fydell only observes what happens in the workspace: your saves, test runs, messages and final files. It cannot see external tools, and nothing you do outside the workspace is scored as observed behaviour. If you used AI assistance, say so in your submission; it is not penalised.",
  },
  resources: [
    {
      id: "incident",
      title: "INC-2291 incident brief",
      kind: "markdown",
      content:
        "**Reports (both started after release 2.14):**\n\n1. Harbor & Pine disabled an old endpoint; it answers `410 Gone`. We sent it about 2,000 requests in an hour and their edge provider throttled us.\n2. Tidewater Outfitters received `invoice.paid` twice for one invoice and shipped an order twice.\n\n**Known:** the event bus is at-least-once and republishes when the publisher's acknowledgement times out.\n\n**Your job:** fix both in `webhooks/`, keep it reviewable as a hotfix, run the tests, and write the handoff. Full brief: `INCIDENT.md`; evidence: `logs/delivery-worker.log`, `CHANGELOG.md`.",
    },
    {
      id: "runbook",
      title: "Delivery promise and retry rules",
      kind: "markdown",
      content:
        "From `docs/runbook-webhooks.md`:\n\n- Each event is delivered **once per subscribed endpoint**. A republish of an event already accepted for an endpoint is a duplicate, whatever state the first delivery is in.\n- The same event fans out to every subscribed endpoint; those are separate deliveries.\n\n| Outcome | Action |\n| --- | --- |\n| 2xx | Delivered |\n| No response, 5xx, 408, 429 | Retry with backoff |\n| Any other 4xx | Failed, do not retry |\n\nAt most 8 attempts; backoff 30s × 2^(n-1), capped at 1 hour.",
    },
    {
      id: "workspace",
      title: "How the workspace and tests work",
      kind: "markdown",
      content:
        "- **Run tests** runs the provided tests, plus any test files you add under `tests/`, on Fydell's isolated test runner against exactly the files you have saved. You do not need Python installed.\n- The provided tests are restored to their original contents for every run, so change behaviour in `webhooks/`, not in the provided tests. `conftest.py` and pytest configuration files are not used.\n- Results show which saved version they ran against. If you edit afterwards they are marked as from an earlier version.\n- After you submit, Fydell runs the provided tests and additional tests your reviewer can see but you cannot. A human engineer reviews the report before your employer relies on it.\n- Editing works while briefly offline; running tests, new teammate replies and submitting need a connection.",
    },
  ],
  stakeholders: [
    {
      id: "maya",
      name: "Maya Chen",
      role: "Platform lead (simulated teammate)",
      blurb: "Owns the webhook service and the delivery promise. Replies are scripted for this simulation.",
      knowledge: [
        "404 stays permanent for this hotfix, as the runbook says; deploy-time 404s are tracked in RFC-12 and belong in the handoff as a risk.",
        "Deduplication is per event and endpoint: one event fans out to each subscribed endpoint.",
        "A republish is always a duplicate, even if the first delivery failed; merchants replay from the dashboard, which is out of scope.",
        "Keep the change a hotfix; a small store change is fine if explained.",
      ],
      withholds: [
        "The contents of the additional reviewer tests.",
        "A complete implementation of the fix.",
      ],
      responseRules: [
        {
          id: "rel_404",
          onceOnly: true,
          priority: 5,
          anyKeywords: ["404", "not found", "deploy", "dlv_8860", "rfc-12", "rfc 12"],
          reply:
            "Good catch on dlv_8860. Keep 404 permanent for this hotfix, as the runbook says; merchants can replay from the dashboard. Deploy-time 404s are a known gap tracked in RFC-12. Please call it out as a risk in your handoff rather than changing the rule here.",
        },
        {
          id: "rel_dedupe_scope",
          onceOnly: true,
          priority: 4,
          anyKeywords: ["per endpoint", "fan out", "fan-out", "fanout", "each endpoint", "per event", "event id", "dedup", "deduplicat", "idempot"],
          reply:
            "Per event and endpoint. One event goes to every endpoint subscribed to its type, and each of those is its own delivery. What must not happen is a second delivery of the same event to the same endpoint.",
        },
        {
          id: "rel_failed_republish",
          onceOnly: true,
          priority: 4,
          anyKeywords: ["already failed", "failed delivery", "after it failed", "replay", "resend", "redeliver", "republish"],
          reply:
            "A republish is always a duplicate, even if the first delivery failed. Merchants replay old events from the dashboard, which is a separate tool and out of scope for this fix.",
        },
        {
          id: "rel_scope",
          onceOnly: true,
          priority: 3,
          anyKeywords: ["refactor", "rewrite", "schema", "store", "database", "postgres", "scope", "hotfix", "how big"],
          reply:
            "Keep it a hotfix we can review in one sitting. A small change to the store is fine if you explain why; no broad refactor.",
        },
        {
          id: "rel_retry_after_details",
          onceOnly: true,
          priority: 6,
          requiresCurveball: true,
          anyKeywords: ["retry-after", "retry after", "header", "http-date", "http date", "seconds", "cap", "negative"],
          reply:
            "Whole seconds only. The gateway never sends HTTP dates. If the value is missing, negative, or not a whole number, use our normal backoff. Cap it at MAX_DELAY_SECONDS, and the 8-attempt cap still applies.",
        },
        {
          id: "run_tests_help",
          priority: 2,
          anyKeywords: ["run the tests", "run tests", "pytest", "python", "install", "how do i test"],
          reply:
            "Use Run tests in the workspace. It runs on Fydell's runner against your saved files, so you do not need anything installed. Add your own test file under tests/ if you want to cover a new case.",
        },
      ],
      proactiveMessages: [
        {
          id: "welcome",
          trigger: { kind: "session_start" },
          body:
            "Hi, Maya here (simulated teammate). You own INC-2291 this morning. INCIDENT.md has the reports and the worker log has the evidence. Ask me if the runbook does not answer something.",
        },
        {
          id: "time_check",
          trigger: { kind: "elapsed_minutes", minutes: 48 },
          body:
            "Time check: about 12 minutes left. Whatever state the fix is in, make sure the handoff says what you tested and what is still risky.",
        },
      ],
      // Maya answers each distinct question once. Repeats are handled by the
      // conversation coordinator (no generic fallback question).
      fallbackReply:
        "I've covered what I know about the delivery promise and incident scope. Check INCIDENT.md and the runbook for details I haven't mentioned.",
    },
    {
      id: "priya",
      name: "Priya Sharma",
      role: "Support engineer (simulated teammate)",
      blurb: "Handles merchant reports and knows the user impact. Replies are scripted for this simulation.",
      knowledge: [
        "Merchants reported duplicate webhook deliveries starting at 09:14 UTC.",
        "Three merchants affected: two saw duplicate order notifications, one saw duplicate inventory updates.",
        "No data loss reported; duplicates are the only symptom.",
        "Merchants can replay from the dashboard themselves; support does not manually replay.",
      ],
      withholds: [
        "The contents of the additional reviewer tests.",
        "A complete implementation of the fix.",
        "Internal incident severity classification.",
      ],
      responseRules: [
        {
          id: "priya_impact",
          priority: 5,
          onceOnly: true,
          anyKeywords: ["impact", "affected", "merchants", "users", "who", "how many"],
          reply:
            "Three merchants reported duplicates starting 09:14 UTC. Two saw duplicate order notifications, one saw duplicate inventory updates. No data loss — duplicates are the only symptom.",
        },
        {
          id: "priya_timeline",
          priority: 4,
          onceOnly: true,
          anyKeywords: ["when", "started", "timeline", "first report"],
          reply:
            "First report came in at 09:14 UTC. All three reports arrived within 20 minutes of each other.",
        },
        {
          id: "priya_replay",
          priority: 4,
          onceOnly: true,
          anyKeywords: ["replay", "dashboard", "manual"],
          reply:
            "Merchants can replay from the dashboard themselves. We don't do manual replays from support — point them to the dashboard if they ask.",
        },
      ],
      fallbackReply:
        "I handle the merchant-facing side — who reported what, and when. For the technical fix itself, Maya's your person.",
      proactiveMessages: [],
    },
  ],
  curveball: {
    id: "retry_after_rollout",
    stakeholderId: "maya",
    announcement:
      "Update from the partner gateway team: they are turning on rate limiting today. Throttled requests get a 429 or 503 with a Retry-After header in whole seconds.",
    requiredAdaptation:
      "Please include this in the hotfix: when an attempt gets a 429 or 503 with a Retry-After header in whole seconds, schedule the next attempt that many seconds later, capped at MAX_DELAY_SECONDS (one hour). If the header is missing or not a whole number of seconds, use the normal backoff. The attempt cap still applies. Mention it in your handoff.",
  },
  questions: [
    {
      id: "whatChanged",
      kind: "text",
      prompt: "What changed, and why?",
      helpText: "The code changes you made and the reasoning a reviewer needs. Max 1,500 characters.",
      maxChars: 1500,
      points: 25,
      concepts: [
        {
          id: "retry_rule",
          label: "Explains the retry classification rule",
          keywords: ["4xx", "permanent", "408", "429", "non-retryable", "not retry", "client error", "is_retryable"],
        },
        {
          id: "dedupe_key",
          label: "Explains deduplication per event and endpoint",
          keywords: ["endpoint", "dedup", "duplicate", "idempot", "republish", "already enqueued", "existing delivery"],
        },
        {
          id: "retry_after",
          label: "Covers the Retry-After update",
          keywords: ["retry-after", "retry after", "rate limit"],
        },
      ],
      competencyKey: "engineering_judgment",
      expectedEvidence:
        "Names both regressions from 2.14 and the rule-level fix for each (transient-only retries; one delivery per event and endpoint), plus the Retry-After handling after the update.",
    },
    {
      id: "testing",
      kind: "text",
      prompt: "How did you test it?",
      helpText: "Which tests you ran and their results, and any tests you added. Max 1,000 characters.",
      maxChars: 1000,
      points: 20,
      concepts: [
        {
          id: "ran_suite",
          label: "Ran the provided tests",
          keywords: ["ran", "run tests", "pytest", "test suite", "provided tests", "all pass", "passing"],
        },
        {
          id: "added_tests",
          label: "Added or described tests for new behaviour",
          keywords: ["added", "new test", "wrote a test", "test_", "my tests", "covered"],
        },
      ],
      competencyKey: "work_communication",
      expectedEvidence:
        "States which runs were done and their results, consistent with the recorded test runs, and names tests added for the new behaviour.",
    },
    {
      id: "remainingRisks",
      kind: "text",
      prompt: "What risks remain?",
      helpText: "Edge cases you did not cover, assumptions, and anything a reviewer should watch. Max 1,000 characters.",
      maxChars: 1000,
      points: 20,
      concepts: [
        {
          id: "deploy_404",
          label: "Names the deploy-time 404 trade-off",
          keywords: ["404", "deploy", "rfc-12", "rfc 12"],
        },
        {
          id: "already_sent",
          label: "Names impact that already happened",
          keywords: ["already sent", "already delivered", "past duplicates", "kestrel-event-id", "merchants who", "backfill"],
        },
        {
          id: "store_scale",
          label: "Notes how dedupe behaves at production scale",
          keywords: ["scan", "index", "postgres", "unique", "race", "concurren"],
        },
      ],
      competencyKey: "work_communication",
      expectedEvidence:
        "Concrete risks: deploy-time 404s now fail permanently (RFC-12), duplicates already delivered before the fix, and dedupe needing a unique constraint in the Postgres store.",
    },
    {
      id: "nextSteps",
      kind: "text",
      prompt: "What should happen next?",
      helpText: "Follow-ups, monitoring or cleanup the team should do. Max 800 characters.",
      maxChars: 800,
      points: 15,
      concepts: [
        {
          id: "followups",
          label: "Names concrete follow-ups",
          keywords: ["unique", "constraint", "index", "monitor", "alert", "notify", "merchant", "rfc-12", "postmortem", "post-mortem"],
        },
      ],
      competencyKey: "work_communication",
      expectedEvidence:
        "Concrete follow-ups such as a unique (event, endpoint) constraint in Postgres, alerting on permanent-failure spikes, and notifying affected merchants.",
    },
  ],
  competencies: [
    { key: "engineering_judgment", label: "Engineering judgment" },
    { key: "work_communication", label: "Handoff communication" },
    { key: "clarification", label: "Clarifying ambiguity" },
  ],
  stakeholderPoints: 20,
  stakeholderCompetencyKey: "clarification",
  strengthTemplates: {
    whatChanged: "The handoff explains the rule-level fixes, not just the symptoms from the incident.",
    testing: "The testing notes describe what was run and what was added.",
    remainingRisks: "Remaining risks are concrete enough for a reviewer to act on.",
    nextSteps: "Next steps are specific follow-ups rather than general intentions.",
  },
  improvementTemplates: {
    whatChanged:
      "A stronger handoff names both regressions and the rule each fix restores: retry only transient failures, and one delivery per event and endpoint, plus the Retry-After handling.",
    testing: "Say which test runs you did and their results, and name any tests you added for new behaviour.",
    remainingRisks:
      "Useful risks here include deploy-time 404s now failing permanently (RFC-12), duplicates already delivered before the fix, and dedupe needing a unique constraint in Postgres.",
    nextSteps: "Name concrete follow-ups, for example a unique (event, endpoint) constraint, alerting, and notifying affected merchants.",
  },
};
