/**
 * Example data for the public homepage and demo. Every value here is
 * fictional: Candidate 01, the repository, the assessment run, and the report
 * do not correspond to a real person or customer. Surfaces rendering this data
 * must show a visible example-data label.
 */

export const DEMO_LABEL = "Example data";

export type CodeLine = {
  n: number;
  text: string;
  mark?: "cited" | "observed" | "added" | "removed";
};

export type EvidenceBasis =
  | "Repository observation"
  | "Candidate statement"
  | "Model interpretation"
  | "Observed simulation result";

export type DemoFinding = {
  id: string;
  finding: string;
  basis: EvidenceBasis;
  citation: string;
};

export const DEMO_CANDIDATE = {
  name: "Candidate 01",
  headline: "Backend developer · Python",
} as const;

export const DEMO_REPOSITORY = {
  fullName: "candidate-01/receipts-service",
  commit: "4f1c9a2",
  language: "Python",
  analyzedFiles: 46,
  totalFiles: 212,
  skipped: "3 generated migrations, 1 vendored client",
  attribution: "Unverified: submitted by URL. Candidate states they are the sole author.",
} as const;

export const DEMO_COVERAGE = [
  { kind: "Source files", count: 31 },
  { kind: "Tests", count: 9 },
  { kind: "Manifests", count: 3 },
  { kind: "Docs", count: 3 },
] as const;

export const DEMO_SOURCE_FILE = {
  path: "app/api/webhooks.py",
  lines: [
    { n: 38, text: '@router.post("/webhooks/payments", status_code=202)' },
    { n: 39, text: "async def payment_webhook(", mark: "cited" },
    { n: 40, text: "    event: PaymentEvent,", mark: "cited" },
    { n: 41, text: "    db: Session = Depends(get_db),", mark: "cited" },
    { n: 42, text: ") -> WebhookAck:" },
    { n: 43, text: "    # Providers redeliver the same event id on timeout." },
    { n: 44, text: "    if db.get(ProcessedEvent, event.id):", mark: "cited" },
    { n: 45, text: '        return WebhookAck(status="duplicate")', mark: "cited" },
    { n: 46, text: "    db.add(ProcessedEvent(id=event.id, received_at=utcnow()))", mark: "cited" },
    { n: 47, text: "    enqueue_receipt(db, order_id=event.order_id)" },
    { n: 48, text: "    db.commit()" },
    { n: 49, text: '    return WebhookAck(status="accepted")' },
  ] satisfies CodeLine[],
};

export const DEMO_PROJECT_FINDINGS: DemoFinding[] = [
  {
    id: "ev-01",
    finding: "Deduplicates provider webhook deliveries by event ID before enqueuing work.",
    basis: "Repository observation",
    citation: "app/api/webhooks.py L44–46",
  },
  {
    id: "ev-02",
    finding: "Validates the request body through a typed Pydantic model.",
    basis: "Repository observation",
    citation: "app/api/webhooks.py L39–41",
  },
  {
    id: "ev-03",
    finding: "Built the webhook and job pipeline alone over four months.",
    basis: "Candidate statement",
    citation: "Contribution statement",
  },
];

export const DEMO_PROJECT_LIMITS = [
  "No test in the repository exercises concurrent deliveries.",
  "Tests exist; Fydell does not run imported code, so their results are unknown.",
];

export const DEMO_ROLE_FAMILIES = [
  { family: "Backend", status: "Supported", detail: "2 repository observations" },
  { family: "Full-stack", status: "Needs evidence", detail: "No frontend code in selected projects" },
  { family: "ML engineering", status: "Not indicated", detail: "No training or evaluation code" },
] as const;

export const DEMO_TASK = {
  title: "Duplicate receipts on retry",
  stack: "Python · FastAPI",
  version: "retry-safe-jobs v0.3",
  brief:
    "A background worker retries jobs after a timeout. Some customers receive the same receipt twice. Make sending idempotent per order and add regression coverage.",
  filePath: "app/jobs/send_receipt.py",
  diff: [
    { n: 12, text: "def send_receipt(job: Job) -> None:" },
    { n: 13, text: "    order = orders.get(job.order_id)" },
    { n: 14, text: '    key = f"receipt:{order.id}"', mark: "added" },
    { n: 15, text: "    if not effects.claim(key, job.attempt_id):", mark: "added" },
    { n: 16, text: "        return job.mark_done()", mark: "added" },
    { n: 17, text: "    mailer.send(order.email, render_receipt(order))" },
    { n: 18, text: "    effects.complete(key)", mark: "added" },
    { n: 19, text: "    job.mark_done()" },
  ] satisfies CodeLine[],
  tests: [
    { name: "test_retry_after_timeout_sends_once", passed: true },
    { name: "test_distinct_orders_each_send", passed: true },
    { name: "test_concurrent_attempts_single_effect", passed: true },
    { name: "test_regression_duplicate_receipt", passed: true },
    { name: "test_mailer_error_allows_retry", passed: false },
  ],
  aiPatch: {
    summary: "Proposed patch (AI-generated): wrap mailer.send in try/except and log duplicates.",
    decision: "Rejected",
    reason:
      "Catching the exception hides the failure, and the job is still retried after a timeout, so the receipt can send twice.",
  },
} as const;

export type DemoReportItem = {
  id: string;
  text: string;
  basis: EvidenceBasis;
  source: string;
  excerpt: string[];
};

export const DEMO_REPORT = {
  role: "Backend Engineer, Python",
  assessment: "retry-safe-jobs v0.3",
  review: "Checked by a reviewer",
  strengths: [
    {
      id: "s1",
      text: "Made the send path idempotent per order by claiming the effect before the side effect.",
      basis: "Observed simulation result",
      source: "app/jobs/send_receipt.py L14–18",
      excerpt: [
        '    key = f"receipt:{order.id}"',
        "    if not effects.claim(key, job.attempt_id):",
        "        return job.mark_done()",
      ],
    },
    {
      id: "s2",
      text: "Rejected the AI-proposed patch and explained why it would still double-send.",
      basis: "Observed simulation result",
      source: "Patch review response",
      excerpt: [
        "Catching the exception hides the failure, and the job is still",
        "retried after a timeout, so the receipt can send twice.",
      ],
    },
  ] satisfies DemoReportItem[],
  concerns: [
    {
      id: "c1",
      text: "The claim is not released when the mailer raises, so a failed send blocks later retries.",
      basis: "Observed simulation result",
      source: "test_mailer_error_allows_retry · failed",
      excerpt: [
        "FAILED tests/test_jobs.py::test_mailer_error_allows_retry",
        "AssertionError: expected 1 send after retry, observed 0",
      ],
    },
  ] satisfies DemoReportItem[],
  notAssessed: [
    "Behaviour across multiple worker processes (outside this task's scope).",
    "Frontend and infrastructure work.",
  ],
} as const;

export type HeroEvidence = {
  id: string;
  kind: "project" | "simulation";
  finding: string;
  source: string;
  path: string;
  basis: EvidenceBasis;
  note: string;
  lines: CodeLine[];
};

export const HERO_EVIDENCE: HeroEvidence[] = [
  {
    id: "h1",
    kind: "project",
    finding: "Deduplicates webhook deliveries by event ID",
    source: "receipts-service",
    path: "app/api/webhooks.py @ 4f1c9a2",
    basis: "Repository observation",
    note: "Authorship unverified. Contribution statement provided.",
    lines: [
      { n: 43, text: "# Providers redeliver on timeout." },
      { n: 44, text: "if db.get(ProcessedEvent, event.id):", mark: "cited" },
      { n: 45, text: '    return Ack(status="duplicate")', mark: "cited" },
      { n: 46, text: "db.add(ProcessedEvent(id=event.id))", mark: "cited" },
      { n: 47, text: "enqueue_receipt(db, event.order_id)" },
    ],
  },
  {
    id: "h2",
    kind: "project",
    finding: "Validates request bodies with typed models",
    source: "receipts-service",
    path: "app/api/webhooks.py @ 4f1c9a2",
    basis: "Repository observation",
    note: "A typed model is present. Validation depth is not assessed.",
    lines: [
      { n: 38, text: '@router.post("/webhooks/payments")' },
      { n: 39, text: "async def payment_webhook(", mark: "cited" },
      { n: 40, text: "    event: PaymentEvent,", mark: "cited" },
      { n: 41, text: "    db: Session = Depends(get_db),", mark: "cited" },
      { n: 42, text: ") -> Ack:" },
    ],
  },
  {
    id: "h3",
    kind: "simulation",
    finding: "Made receipt sending safe to retry",
    source: "Simulation · retry-safe-jobs v0.3",
    path: "app/jobs/send_receipt.py · submitted",
    basis: "Observed simulation result",
    note: "4 of 5 tests passed. One failure recorded in the report.",
    lines: [
      { n: 13, text: "order = orders.get(job.order_id)" },
      { n: 14, text: 'key = f"receipt:{order.id}"', mark: "observed" },
      { n: 15, text: "if not effects.claim(key, job.attempt):", mark: "observed" },
      { n: 16, text: "    return job.mark_done()", mark: "observed" },
      { n: 17, text: "mailer.send(order.email, receipt)" },
    ],
  },
];

export type EvidenceRecord = {
  id: string;
  kind: "project" | "simulation";
  title: string;
  source: string;
  file: string;
  citation: string;
  language: string;
  revision: string;
  lines: CodeLine[];
  shows: string;
  limits: string;
  status?: { label: string; tone: "attention" };
};

export const EVIDENCE_RECORDS: EvidenceRecord[] = [
  {
    id: "ev-webhooks",
    kind: "project",
    title: "Handles duplicate webhook deliveries",
    source: "receipts-service",
    file: "app/api/webhooks.py",
    citation: "webhooks.py · L44–46",
    language: "Python",
    revision: "commit 4f1c9a2",
    lines: [
      { n: 42, text: "payload = await request.json()" },
      { n: 43, text: 'event_id = payload.get("id")' },
      { n: 44, text: "if self._is_duplicate(event_id):", mark: "cited" },
      { n: 45, text: '    logger.info("Duplicate delivery ignored")', mark: "cited" },
      { n: 46, text: '    return {"status": "ignored"}, 200', mark: "cited" },
      { n: 47, text: "" },
      { n: 48, text: "return self._process_webhook(payload)" },
    ],
    shows: "Checks for a previously processed event ID before handling the payload, so provider retries do not repeat work.",
    limits: "Repository observation. Authorship has not been verified; the candidate states they wrote this service.",
  },
  {
    id: "ev-validation",
    kind: "project",
    title: "Validates incoming request data",
    source: "receipts-service",
    file: "app/api/webhooks.py",
    citation: "webhooks.py · L39–41",
    language: "Python",
    revision: "commit 4f1c9a2",
    lines: [
      { n: 38, text: '@router.post("/webhooks/payments")' },
      { n: 39, text: "async def payment_webhook(", mark: "cited" },
      { n: 40, text: "    event: PaymentEvent,", mark: "cited" },
      { n: 41, text: "    db: Session = Depends(get_db),", mark: "cited" },
      { n: 42, text: ") -> Ack:" },
    ],
    shows: "Request bodies are parsed through a typed model before the handler runs.",
    limits: "A typed model is present. How thoroughly it validates edge cases is not assessed.",
  },
  {
    id: "ev-regression",
    kind: "simulation",
    title: "Added a regression test for retries",
    source: "retry-safe-jobs v0.3",
    file: "tests/test_jobs.py",
    citation: "test_jobs.py · L12–28",
    language: "Python",
    revision: "submitted snapshot 9c2e1f0",
    lines: [
      { n: 12, text: "def test_retry_after_timeout_sends_once(worker, mailer):", mark: "observed" },
      { n: 13, text: '    job = enqueue_receipt(order_id="o-17")', mark: "observed" },
      { n: 14, text: "    worker.run(job, timeout_after_send=True)", mark: "observed" },
      { n: 15, text: "    worker.retry(job)", mark: "observed" },
      { n: 16, text: "    assert mailer.sent_to('o-17') == 1", mark: "observed" },
    ],
    shows: "The candidate reproduced the timeout-then-retry case and asserted a single send. The test passed in the recorded run.",
    limits: "Observed in the simulation. Covers one worker process; multi-worker behaviour is outside this task.",
  },
  {
    id: "ev-recovery",
    kind: "simulation",
    title: "Failure recovery needs review",
    source: "retry-safe-jobs v0.3",
    file: "tests/test_jobs.py",
    citation: "test_jobs.py · L53–78",
    language: "Python",
    revision: "submitted snapshot 9c2e1f0",
    lines: [
      { n: 53, text: "def test_mailer_error_allows_retry(worker, mailer):", mark: "removed" },
      { n: 54, text: '    mailer.fail_next("SMTP timeout")' },
      { n: 55, text: '    job = enqueue_receipt(order_id="o-21")' },
      { n: 56, text: "    worker.run(job)" },
      { n: 57, text: "    worker.retry(job)" },
      { n: 58, text: "    assert mailer.sent_to('o-21') == 1  # observed 0", mark: "removed" },
    ],
    shows: "When sending fails, the claim on the receipt is not released, so the retry never sends.",
    limits: "One test failed in the recorded run. It describes a gap in this submission, not overall ability.",
    status: { label: "1 test failed", tone: "attention" },
  },
];

export const DEMO_PASSPORT_PROJECTS = [
  {
    name: "receipts-service",
    detail: "Python · 46 files analyzed · 2 findings",
    attribution: "Attribution unverified",
  },
  {
    name: "ledger-cli",
    detail: "Go · tests recognized; practice rules do not cover Go yet",
    attribution: "Attribution unverified",
  },
] as const;

export const DEMO_SHARING = [
  { field: "Projects and contribution statements", shared: true },
  { field: "Source-linked evidence", shared: true },
  { field: "Simulation results", shared: true },
  { field: "Email address", shared: false },
] as const;

export const DEMO_PIPELINE = [
  { candidate: "Candidate 01", role: "Backend Engineer, Python", state: "Report ready", tone: "positive" },
  { candidate: "Candidate 02", role: "Backend Engineer, Python", state: "Review required", tone: "attention" },
  { candidate: "Candidate 03", role: "Backend Engineer, Python", state: "Submitted", tone: "neutral" },
  { candidate: "Candidate 04", role: "Backend Engineer, Python", state: "Processing failed · retrying", tone: "system" },
  { candidate: "Candidate 05", role: "Backend Engineer, Python", state: "Invited", tone: "neutral" },
] as const;
