import type { PassportData } from "@/lib/passport/view";

/**
 * Example data for public pages. Fictional project and engineer; every
 * finding matches its excerpt line for line and states what was not checked.
 * Rendered through the production PassportView, never presented as a user.
 */
const REPO = "example/webhook-relay";
const SHA = "4f2c9e1a7b3d5f60e8c2a9b14d7e3f5a6c0b9d21";

export const SAMPLE_PASSPORT: PassportData = {
  displayName: "Sample engineer",
  headline: "Backend work on event delivery. Example data, not a real person.",
  githubLogin: null,
  updatedAt: "2026-09-28T15:20:00.000Z",
  roleSuggestions: [],
  capabilities: { source: "rules", capabilities: [], notShown: [] },
  projects: [
    {
      id: "sample-snapshot-1",
      repoFullName: REPO,
      htmlUrl: "",
      commitSha: SHA,
      revisionRef: "main",
      primaryLanguage: "TypeScript",
      isFork: false,
      contributionStatement: "I wrote the delivery and retry code and its tests. The HTTP server scaffold came from a template.",
      status: "complete",
      coverage: {
        totalFiles: 46,
        analyzedFiles: 38,
        skippedFiles: 8,
        languages: ["TypeScript", "SQL"],
        skipReasons: { vendored: 5, lockfile: 1, binary: 2 },
        treeTruncated: false,
      },
      analyzedAt: "2026-09-28T15:18:00.000Z",
      notices: [],
      evidence: [
        {
          id: "sample-retry-cap",
          repo: REPO,
          detector: "retry",
          category: "reliability",
          finding: "Delivery stops after five attempts. The wait doubles from 500 ms between tries, and 4xx responses other than 429 are not retried.",
          basis: "repository_observation",
          path: "src/delivery/retry.ts",
          startLine: 12,
          endLine: 27,
          excerpt: [
            "const MAX_ATTEMPTS = 5;",
            "const BASE_DELAY_MS = 500;",
            "",
            "export function nextDelay(attempt: number): number {",
            "  return BASE_DELAY_MS * 2 ** (attempt - 1);",
            "}",
            "",
            "export async function deliverWithRetry(event: WebhookEvent, send: Sender) {",
            "  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {",
            "    const res = await send(event);",
            "    if (res.ok) return { delivered: true, attempts: attempt };",
            "    if (res.status < 500 && res.status !== 429) return { delivered: false, attempts: attempt };",
            "    await sleep(nextDelay(attempt));",
            "  }",
            "  return { delivered: false, attempts: MAX_ATTEMPTS };",
            "}",
          ],
          sourceUrl: "",
          limitations: [
            "Read from the code at this revision; it was not run.",
            "Whether callers re-queue events after the fifth failure was not assessed.",
          ],
        },
        {
          id: "sample-dedupe",
          repo: REPO,
          detector: "idempotency",
          category: "correctness",
          finding: "An insert keyed on event_id decides whether an event is processed, so a repeated delivery of the same event is skipped.",
          basis: "repository_observation",
          path: "src/delivery/dedupe.ts",
          startLine: 8,
          endLine: 14,
          excerpt: [
            "export async function recordDelivery(db: Db, eventId: string): Promise<boolean> {",
            "  const inserted = await db.query(",
            "    \"insert into deliveries (event_id) values ($1) on conflict (event_id) do nothing returning event_id\",",
            "    [eventId],",
            "  );",
            "  return inserted.rowCount === 1;",
            "}",
          ],
          sourceUrl: "",
          limitations: [
            "This only deduplicates if deliveries.event_id has a unique constraint. The migration was not among the analyzed files.",
          ],
        },
        {
          id: "sample-test-400",
          repo: REPO,
          detector: "tests",
          category: "testing",
          finding: "A test asserts that a 400 response is sent once and not retried.",
          basis: "repository_observation",
          path: "tests/delivery.test.ts",
          startLine: 31,
          endLine: 36,
          excerpt: [
            "it(\"does not retry a 400 response\", async () => {",
            "  const send = vi.fn().mockResolvedValue({ ok: false, status: 400 });",
            "  const result = await deliverWithRetry(event, send);",
            "  expect(send).toHaveBeenCalledTimes(1);",
            "  expect(result).toEqual({ delivered: false, attempts: 1 });",
            "});",
          ],
          sourceUrl: "",
          limitations: [
            "Tests were read, not run.",
            "No test for the 429 path was found in the analyzed files.",
          ],
        },
      ],
    },
  ],
  contributions: [
    {
      repoFullName: REPO,
      problem: "Webhook deliveries were lost when the receiving service was briefly unavailable.",
      checkedHow: "Delivery tests cover retries, permanent failures and duplicate events.",
      workedOn: "Delivery loop, retry policy, the deduplication insert and the delivery tests.",
      inherited: "HTTP server scaffold and logging setup from a starter template.",
      collaboration: "solo",
      collaborationNote: "",
      constraintsFaced: "The receiving service rate-limits with 429, so those responses had to be retried while other client errors fail fast.",
      results: "",
      improvements: "Add a test for the 429 path and move the attempt limit into configuration.",
      evidenceRefs: [],
      version: 1,
      updatedAt: "2026-09-28T15:25:00.000Z",
    },
  ],
  decisions: [],
};

/** The example role a reviewer reads these findings against. */
export const SAMPLE_ROLE = "Backend engineer, payments platform";

/**
 * How a reviewer could read each sample finding against the role. Written as
 * the reviewer's judgment, never as something the analysis concluded.
 */
export const SAMPLE_REQUIREMENT_FIT: Record<string, { requirement: string; reading: string; open: string }> = {
  "sample-retry-cap": {
    requirement: "Handles failures in calls to external services",
    reading: "Supporting evidence: bounded retries with backoff, and a clear split between retryable and permanent errors.",
    open: "Ask what happens to an event after the fifth failure.",
  },
  "sample-dedupe": {
    requirement: "Designs for duplicate and out-of-order events",
    reading: "Relevant but not yet sufficient: the approach is right, but it depends on a constraint that wasn't in the analyzed files.",
    open: "Ask to see the migration, or how event_id uniqueness is enforced.",
  },
  "sample-test-400": {
    requirement: "Writes tests for failure paths",
    reading: "Supporting evidence for the 400 path. The 429 path has no test in the analyzed files.",
    open: "Ask how the 429 retry was checked.",
  },
};
