import { checkCsrf } from "../src/lib/security/csrf";
import {
  IMPORT_MAX_ATTEMPTS,
  decideFailure,
  importIdempotencyKey,
  isStale,
  needsWorker,
  parsePayload,
  toJobView,
  type ImportJobRow,
} from "../src/lib/passport/import-jobs";
import { diffFindings, versionsOf } from "../src/lib/passport/versions";
import { parseContribution, parseDecision, parseEvidenceRefs } from "../src/lib/passport/context-contract";
import { formatDate, formatDateTime, reportState } from "../src/lib/passport/record-states";
import { selectSharedProjects, type PassportEvidence, type PassportProject } from "../src/lib/passport/view";

let failures = 0;
function ok(name: string, condition: boolean): void {
  console.log(`  ${condition ? "ok  " : "FAIL"} ${name}`);
  if (!condition) failures += 1;
}

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

function finding(id: string, detector: string, path: string, startLine = 1, excerpt = ["x"]): PassportEvidence {
  return { id, repo: "o/r", detector, category: "c", finding: `${detector} in ${path}`, basis: "repository_observation", path, startLine, endLine: startLine + excerpt.length - 1, excerpt, sourceUrl: "", limitations: [] };
}

function project(id: string, sha: string, analyzedAt: string, evidence: PassportEvidence[], status: PassportProject["status"] = "complete"): PassportProject {
  return {
    id,
    repoFullName: "o/r",
    htmlUrl: "https://github.com/o/r",
    commitSha: sha,
    primaryLanguage: "TypeScript",
    isFork: false,
    contributionStatement: "",
    status,
    coverage: { totalFiles: 10, analyzedFiles: 8, skippedFiles: 2, languages: [], skipReasons: {}, treeTruncated: false },
    analyzedAt,
    notices: [],
    evidence,
  };
}

function row(overrides: Partial<ImportJobRow>): ImportJobRow {
  return {
    id: "job-1",
    state: "queued",
    payload: { repository: "o/r", commitSha: SHA_A, revisionRef: "main" },
    attempt_count: 0,
    max_attempts: IMPORT_MAX_ATTEMPTS,
    next_attempt_at: null,
    stage: "queued",
    progress: {},
    error_code: null,
    safe_error: null,
    retryable: null,
    result_ref: null,
    analysis_version: "github-extract-v1",
    created_at: "2026-10-06T10:00:00.000Z",
    started_at: null,
    finished_at: null,
    ...overrides,
  };
}

console.log("Import job contract");
{
  ok("idempotency key is case-insensitive in the repository", importIdempotencyKey("u", "Owner/Repo", SHA_A, "v1") === importIdempotencyKey("u", "owner/repo", SHA_A, "v1"));
  ok("idempotency key differs per commit", importIdempotencyKey("u", "o/r", SHA_A, "v1") !== importIdempotencyKey("u", "o/r", SHA_B, "v1"));
  ok("idempotency key differs per owner", importIdempotencyKey("u1", "o/r", SHA_A, "v1") !== importIdempotencyKey("u2", "o/r", SHA_A, "v1"));
  ok("payload without a full commit is rejected", parsePayload({ repository: "o/r", commitSha: "abc" }) === null);

  const transient = decideFailure("github_unavailable", 1, IMPORT_MAX_ATTEMPTS);
  ok("transient failure is retried", transient.kind === "retry");
  ok("retry delay grows", transient.kind === "retry" && (() => {
    const later = decideFailure("github_unavailable", 3, IMPORT_MAX_ATTEMPTS);
    return later.kind === "retry" && later.delaySeconds > transient.delaySeconds;
  })());
  ok("rate limit honours retry-after", (() => {
    const d = decideFailure("rate_limited", 1, IMPORT_MAX_ATTEMPTS, 600);
    return d.kind === "retry" && d.delaySeconds === 600;
  })());
  ok("retry delay is capped", (() => {
    const d = decideFailure("rate_limited", 1, IMPORT_MAX_ATTEMPTS, 99999);
    return d.kind === "retry" && d.delaySeconds <= 15 * 60;
  })());
  const exhausted = decideFailure("worker_interrupted", IMPORT_MAX_ATTEMPTS, IMPORT_MAX_ATTEMPTS);
  ok("last attempt becomes terminal but manually retryable", exhausted.kind === "terminal" && exhausted.code === "attempts_exhausted" && exhausted.retryable);
  const permanent = decideFailure("private_repository", 1, IMPORT_MAX_ATTEMPTS);
  ok("repository problems are not retried", permanent.kind === "terminal" && !permanent.retryable);

  ok("stored failed state is shown as retry scheduled", toJobView(row({ state: "failed", next_attempt_at: "2026-10-06T10:01:00.000Z" }))?.state === "retry_scheduled");
  ok("cancelled dead letter is shown as cancelled", toJobView(row({ state: "dead_letter", error_code: "cancelled" }))?.state === "cancelled");
  ok("other dead letters are shown as failed", toJobView(row({ state: "dead_letter", error_code: "attempts_exhausted" }))?.state === "failed");
  ok("succeeded jobs report the done stage", toJobView(row({ state: "succeeded", stage: "saving", result_ref: { projectId: "p1", findings: 3 } }))?.stage === "done");
  ok("next attempt time only shown while waiting to retry", toJobView(row({ state: "queued", next_attempt_at: "2026-10-06T10:01:00.000Z" }))?.nextAttemptAt === null);
  ok("unknown stage falls back to queued", toJobView(row({ stage: "exploding" }))?.stage === "queued");
  ok("malformed payload yields no view", toJobView(row({ payload: "nope" })) === null);

  const now = Date.parse("2026-10-06T10:05:00.000Z");
  ok("missing heartbeat is stale", isStale(null, now));
  ok("fresh heartbeat is not stale", !isStale("2026-10-06T10:04:30.000Z", now));
  ok("heartbeat older than the lease is stale", isStale("2026-10-06T10:03:00.000Z", now));
}

console.log("Versions and diff");
{
  const older = project("p1", SHA_A, "2026-10-01T00:00:00.000Z", [finding("a1", "auth", "src/auth.ts", 10), finding("a2", "queue", "src/jobs.ts", 5), finding("a3", "tests", "test/x.test.ts", 1)]);
  const newer = project("p2", SHA_B, "2026-10-05T00:00:00.000Z", [finding("b1", "auth", "src/auth.ts", 10), finding("b2", "queue", "src/jobs.ts", 9), finding("b4", "cache", "src/cache.ts", 3)]);
  const versions = versionsOf([older, newer], "O/R");
  ok("versions are newest first", versions[0].id === "p2" && versions[1].id === "p1");
  const diff = diffFindings(older.evidence, newer.evidence);
  ok("unchanged findings match across commits despite new ids", diff.unchanged === 1);
  ok("moved lines are reported as changed", diff.changed.length === 1 && diff.changed[0].after.id === "b2");
  ok("new findings are reported", diff.added.map((e) => e.id).join() === "b4");
  ok("removed findings are reported", diff.removed.map((e) => e.id).join() === "a3");
  ok("identical versions have no differences", (() => {
    const d = diffFindings(older.evidence, older.evidence);
    return d.added.length === 0 && d.removed.length === 0 && d.changed.length === 0 && d.unchanged === 3;
  })());

  const pinned = selectSharedProjects([{ ...older, status: "stale" }, newer], { versionPolicy: "pinned", pinnedProjectIds: ["p1"] });
  ok("pinned share resolves the exact earlier snapshot", pinned.length === 1 && pinned[0].id === "p1" && pinned[0].status === "complete");
  const following = selectSharedProjects([older, newer], { versionPolicy: "follow" });
  ok("following share resolves only the latest snapshot", following.length === 1 && following[0].id === "p2");
  ok("stale snapshot reports the earlier-version state", reportState({ status: "stale" }) === "stale");
}

console.log("Display formatting");
{
  ok("dates render identically regardless of host zone", formatDate("2026-10-06T23:30:00.000Z") === "Oct 6, 2026");
  ok("date-times are labeled UTC", formatDateTime("2026-10-06T23:30:00.000Z").endsWith("UTC"));
}

console.log("CSRF origin check");
{
  const post = (origin: string | null, host = "app.fydell.com") =>
    new Request("https://app.fydell.com/api/x", { method: "POST", headers: { ...(origin ? { origin } : {}), host } });
  ok("GET is never blocked", checkCsrf(new Request("https://app.fydell.com/api/x", { headers: { origin: "https://evil.example" } })) === null);
  ok("same-host origin passes", checkCsrf(post("https://app.fydell.com")) === null);
  ok("no origin passes to route authorization", checkCsrf(post(null)) === null);
  ok("foreign origin is blocked", checkCsrf(post("https://evil.example")) !== null);
  ok("malformed origin is blocked", checkCsrf(post("not a url")) !== null);
}

console.log("Status reads never act; they report when a worker is needed");
{
  const now = Date.parse("2026-10-06T12:00:00Z");
  const ago = (s: number) => new Date(now - s * 1000).toISOString();
  ok("running with a fresh heartbeat needs no worker", needsWorker({ state: "running", createdAt: ago(60) }, { heartbeat_at: ago(5), next_attempt_at: null }, now) === false);
  ok("running with a stale heartbeat needs a worker", needsWorker({ state: "running", createdAt: ago(600) }, { heartbeat_at: ago(300), next_attempt_at: null }, now) === true);
  ok("just-queued job is given time for its own worker", needsWorker({ state: "queued", createdAt: ago(3) }, { heartbeat_at: null, next_attempt_at: ago(3) }, now) === false);
  ok("queued job left unclaimed needs a worker", needsWorker({ state: "queued", createdAt: ago(120) }, { heartbeat_at: null, next_attempt_at: ago(120) }, now) === true);
  ok("retry scheduled in the future needs no worker yet", needsWorker({ state: "retry_scheduled", createdAt: ago(120) }, { heartbeat_at: null, next_attempt_at: new Date(now + 30_000).toISOString() }, now) === false);
  ok("finished jobs never need a worker", needsWorker({ state: "succeeded", createdAt: ago(900) }, { heartbeat_at: ago(900), next_attempt_at: null }, now) === false);
}

console.log("Contribution context and decisions");
{
  const PID = "11111111-2222-3333-4444-555555555555";
  const c = parseContribution({ workedOn: "  Built the queue  ", collaboration: "team", evidenceRefs: [{ projectId: PID, findingId: "ev_0123456789abcdef", path: "src/q.ts", startLine: 4, endLine: 2 }] });
  ok("contribution is trimmed and keeps its link", !("error" in c) && c.workedOn === "Built the queue" && c.collaboration === "team" && c.evidenceRefs.length === 1);
  ok("an inverted line range collapses to the start line", !("error" in c) && c.evidenceRefs[0].endLine === 4);
  ok("unknown collaboration falls back to not stated", (() => { const x = parseContribution({ collaboration: "lead" }); return !("error" in x) && x.collaboration === "unspecified"; })());
  ok("over-long text is rejected, not truncated", "error" in parseContribution({ results: "x".repeat(2001) }));
  ok("path traversal in a link is rejected", "error" in parseContribution({ evidenceRefs: [{ projectId: PID, path: "../etc/passwd" }] }));
  ok("a link to a non-uuid project is rejected", "error" in parseContribution({ evidenceRefs: [{ projectId: "x", path: "a.ts" }] }));
  ok("more than 12 links are rejected", "error" in parseContribution({ evidenceRefs: Array.from({ length: 13 }, () => ({ projectId: PID, path: "a.ts" })) }));
  ok("a malformed finding id is dropped, not trusted", (() => { const x = parseEvidenceRefs([{ projectId: PID, findingId: "nope", path: "a.ts" }]); return Array.isArray(x) && x[0].findingId === null; })());
  ok("decision needs a title", "error" in parseDecision({ problem: "p", choice: "c" }));
  ok("decision needs a problem and a choice", "error" in parseDecision({ title: "t", problem: "p" }));
  ok("a complete decision parses", !("error" in parseDecision({ title: "Queue webhooks", problem: "p", choice: "c", tradeoffs: "t" })));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll work record checks passed");
