/**
 * Differential acceptance test for the engineer analysis pipeline.
 *
 *   tsx --conditions react-server --env-file=.env.local scripts/acceptance-engineer-differential.ts
 *
 * Runs six deliberately different inputs through the real pipeline: upload
 * analysis (static detectors, citation checks), synthesis, evidence ledger,
 * capability statements and the narrative step. When a model provider is
 * configured the narrative step calls it for real; every other step is
 * deterministic. Writes one JSON per case plus a summary under
 * .scratch/acceptance/engineer/ and asserts the findings differ for the
 * reasons the inputs differ, not just in wording.
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { analyzeUpload } from "@/lib/passport/upload";
import { buildReport } from "@/lib/builder-analysis/run";
import { getProviderConfig } from "@/lib/ai/provider";
import type { PassportProject } from "@/lib/passport/view";
import { ANALYSIS_VERSION, type ExtractionResult } from "@/lib/passport/github/types";
import type { BuilderAnalysisReport } from "@/lib/builder-analysis/types";

const OUT = join(process.cwd(), ".scratch", "acceptance", "engineer");
mkdirSync(OUT, { recursive: true });
const OWNER = "00000000-0000-4000-8000-00000000d1ff";

type Files = Record<string, string>;
const zip = (files: Files) => zipSync(Object.fromEntries(Object.entries(files).map(([p, t]) => [p, strToU8(t)])));

const README = "# job-runner\n\nRuns queued jobs with persisted progress.\n\n## Setup\n\nnpm install\n\n## Usage\n\nnpm test\n";

/** Persisted progress, bounded retries with backoff, timeouts, a dedupe guard, and tests that exercise the restart and failure paths. */
const correct: Files = {
  "README.md": README,
  "tsconfig.json": '{\n  "compilerOptions": {\n    "strict": true\n  }\n}\n',
  ".github/workflows/ci.yml": "name: ci\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm test\n",
  "src/worker.ts": [
    "import { saveProgress, loadProgress, alreadyProcessed } from './progress';",
    "",
    "export async function runJob(job: { id: string; url: string }) {",
    "  if (await alreadyProcessed(job.id)) {",
    "    return 'skipped';",
    "  }",
    "  const start = (await loadProgress(job.id)) ?? 0;",
    "  for (let attempt = start; attempt < 5; attempt++) {",
    "    try {",
    "      const res = await fetch(job.url, { signal: AbortSignal.timeout(5000) });",
    "      await saveProgress(job.id, attempt + 1);",
    "      return res.status;",
    "    } catch (err) {",
    "      console.error('attempt failed', attempt, err);",
    "      await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));",
    "    }",
    "  }",
    "  throw new Error('job failed after retries');",
    "}",
    "",
  ].join("\n"),
  "src/progress.ts": "const store = new Map<string, number>();\nexport async function saveProgress(id: string, n: number) { store.set(id, n); }\nexport async function loadProgress(id: string) { return store.get(id); }\nexport async function alreadyProcessed(id: string) { return store.get(id) === -1; }\n",
  "tests/worker.test.ts": [
    "import { runJob } from '../src/worker';",
    "",
    "test('resumes from persisted progress after a restart', async () => {",
    "  expect(await runJob({ id: 'a', url: 'http://localhost/ok' })).toBeDefined();",
    "});",
    "",
    "test('fails after retries are exhausted', async () => {",
    "  await expect(runJob({ id: 'b', url: 'http://invalid' })).rejects.toThrow('job failed');",
    "});",
    "",
  ].join("\n"),
};

/** Retries with backoff exist, but nothing persists progress, nothing dedupes, and there are no tests. */
const partial: Files = {
  "README.md": "# job-runner\n",
  "src/worker.ts": [
    "export async function runJob(job: { id: string; url: string }) {",
    "  for (let attempt = 0; attempt < 5; attempt++) {",
    "    try {",
    "      return (await fetch(job.url)).status;",
    "    } catch {",
    "      await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));",
    "    }",
    "  }",
    "  return null;",
    "}",
    "",
  ].join("\n"),
};

/** A "fix" that hides the failure: errors are swallowed, and the only test asserts nothing about failure. */
const superficial: Files = {
  "README.md": "# job-runner\n",
  "src/worker.ts": [
    "export async function runJob(job: { id: string; url: string }) {",
    "  try {",
    "    return (await fetch(job.url)).status;",
    "  } catch (e) {",
    "    // fixed: no more crashes",
    "    return 200;",
    "  }",
    "}",
    "",
  ].join("\n"),
  "tests/worker.test.ts": "import { runJob } from '../src/worker';\n\ntest('runs', async () => {\n  await runJob({ id: 'a', url: 'x' });\n});\n",
};

/** Same capability built differently: Python, tenacity, a dedupe check and pytest failure tests. */
const alternative: Files = {
  "README.md": "# job-runner (python)\n\n## Setup\n\npip install -r requirements.txt\n\n## Usage\n\npytest\n",
  "requirements.txt": "httpx==0.27.0\ntenacity==8.2.3\n",
  "runner/worker.py": [
    "import logging",
    "import httpx",
    "from tenacity import retry, stop_after_attempt, wait_exponential",
    "",
    "logger = logging.getLogger(__name__)",
    "PROCESSED: set[str] = set()",
    "",
    "",
    "@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=0.1))",
    "def fetch(url: str) -> int:",
    "    return httpx.get(url, timeout=5).status_code",
    "",
    "",
    "def run_job(job_id: str, url: str) -> int | None:",
    "    if job_id in PROCESSED:",
    "        return None",
    "    try:",
    "        status = fetch(url)",
    "    except httpx.HTTPError as exc:",
    "        logger.error('job %s failed: %s', job_id, exc)",
    "        raise",
    "    PROCESSED.add(job_id)",
    "    return status",
    "",
  ].join("\n"),
  "tests/test_worker.py": [
    "import httpx",
    "import pytest",
    "from runner.worker import run_job",
    "",
    "",
    "def test_skips_processed_job(monkeypatch):",
    "    monkeypatch.setattr('runner.worker.fetch', lambda url: 200)",
    "    assert run_job('a', 'http://x') == 200",
    "    assert run_job('a', 'http://x') is None",
    "",
    "",
    "def test_raises_after_retries(monkeypatch):",
    "    def boom(url):",
    "        raise httpx.ConnectError('down')",
    "    monkeypatch.setattr('runner.worker.fetch', boom)",
    "    with pytest.raises(httpx.HTTPError):",
    "        run_job('b', 'http://x')",
    "",
  ].join("\n"),
};

/** Retry with backoff where the wait is far below the loop header, a seen-set guard and a dedupe table claim. */
const deepRetryAndDedupe: Files = {
  "README.md": "# relay\n",
  "src/relay.ts": [
    "const seenIds = new Set<string>();",
    "",
    "export async function relay(events: Array<{ id: string; url: string }>) {",
    "  for (const event of events) {",
    "    if (seenIds.has(event.id)) continue;",
    "    seenIds.add(event.id);",
    "    await deliver(event.url);",
    "  }",
    "}",
    "",
    "async function deliver(url: string) {",
    "  for (let attempt = 0; attempt < 6; attempt++) {",
    "    try {",
    "      const res = await fetch(url);",
    "      if (res.status >= 500) throw new Error(`upstream ${res.status}`);",
    "      await record(url, res.status);",
    "      await audit(url);",
    "      await metrics(url);",
    "      return res.status;",
    "    } catch (err) {",
    "      console.error('delivery failed', attempt, err);",
    "      const wait = 200 * Math.pow(2, attempt);",
    "      await new Promise((r) => setTimeout(r, wait));",
    "    }",
    "  }",
    "  throw new Error('delivery failed after retries');",
    "}",
    "",
  ].join("\n"),
  "src/store.ts": [
    "import { pool } from './db';",
    "",
    "export async function record(url: string, status: number) {",
    "  await pool.query('INSERT INTO deliveries (url, status) VALUES ($1, $2) ON CONFLICT (url) DO NOTHING', [url, status]);",
    "}",
    "",
  ].join("\n"),
};

/** Near misses: a counter loop that waits only after the loop, and dedupe words that appear only in comments and return values. */
const nearMiss: Files = {
  "README.md": "# batch\n",
  "src/batch.ts": [
    "// We should dedupe events if they were already processed, but do not yet.",
    "export async function runBatch(items: string[]) {",
    "  let processedCount = 0;",
    "  for (let attempt = 0; attempt < 3; attempt++) {",
    "    processedCount += items.length;",
    "  }",
    "  await new Promise((r) => setTimeout(r, 1000));",
    "  if (items.length === 0) return processedCount;",
    "  for (const entry of items) {",
    "    await new Promise((r) => setTimeout(r, 10));",
    "  }",
    "  return processedCount;",
    "}",
    "",
  ].join("\n"),
};

/** A real project directory with nothing any rule can cite. */
const missing: Files = {
  "README.md": "# notes\n\nPersonal notes.\n",
  "notes/ideas.md": "- try a job runner\n- read about retries\n",
  "src/main.ts": "export const greeting = 'hello';\n",
};

type CaseResult = {
  case: string;
  why: string;
  status: "analyzed" | "rejected";
  error?: string;
  findings?: Array<{ id: string; detector: string; path: string; lines: string }>;
  report?: BuilderAnalysisReport;
};

function asProject(result: ExtractionResult, name: string): PassportProject {
  const repo = result.repository;
  assert.ok(repo && result.commitSha);
  return {
    id: `00000000-0000-4000-8000-${Buffer.from(name).toString("hex").padEnd(12, "0").slice(0, 12)}`,
    repoFullName: repo.fullName,
    sourceKind: "upload",
    htmlUrl: "",
    commitSha: result.commitSha,
    revisionRef: "upload",
    analysisVersion: result.analysisVersion,
    primaryLanguage: repo.primaryLanguage,
    isFork: false,
    contributionStatement: name === "correct" ? "I wrote the retry loop, the progress store and both tests." : "",
    status: result.status === "partial" ? "partial" : "complete",
    coverage: { totalFiles: result.coverage.totalFiles, analyzedFiles: result.coverage.analyzedFiles, skippedFiles: result.coverage.skipped.length, languages: result.coverage.languages, skipReasons: {}, treeTruncated: false },
    analyzedAt: "2026-10-09T12:00:00.000Z",
    notices: result.notices,
    evidence: result.findings.map((f) => ({ id: f.id, repo: repo.fullName, detector: f.detector, category: f.category, finding: f.finding, basis: f.basis, path: f.path, startLine: f.startLine, endLine: f.endLine, excerpt: f.excerpt, sourceUrl: f.sourceUrl, limitations: f.limitations })),
  };
}

async function runCase(name: string, why: string, archive: Uint8Array): Promise<CaseResult> {
  const analysis = analyzeUpload(archive, { ownerId: OWNER, name: `job-runner-${name}` });
  if (analysis.ok === false) {
    const out: CaseResult = { case: name, why, status: "rejected", error: `${analysis.error.code}: ${analysis.error.message}` };
    writeFileSync(join(OUT, `${name}.json`), JSON.stringify(out, null, 2));
    return out;
  }
  const project = asProject(analysis.result, name);
  const report = await buildReport({
    runId: `diff-${name}`,
    supersedes: null,
    displayName: "Synthetic engineer",
    githubLogin: null,
    projects: [project],
    activity: [],
    scope: { scannedRepos: 0, forksExcluded: 0, archivedIncluded: 0, listingTruncated: false, skipped: [], commitsSampled: 0 },
    now: new Date("2026-10-09T12:00:00.000Z"),
  });
  const out: CaseResult = {
    case: name,
    why,
    status: "analyzed",
    findings: project.evidence.map((e) => ({ id: e.id, detector: e.detector, path: e.path, lines: `${e.startLine}-${e.endLine}` })),
    report,
  };
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(out, null, 2));
  return out;
}

const detectorsOf = (r: CaseResult) => new Set((r.findings ?? []).map((f) => f.detector));
const level = (r: CaseResult, id: string) => r.report?.dimensions.find((d) => d.id === id)?.level ?? "absent";
const facet = (r: CaseResult, detector: string, f: "tests_exist" | "tests_executed" | "contribution_claimed") =>
  r.report?.ledger?.find((e) => r.findings?.find((x) => x.id === e.id)?.detector === detector)?.verification[f].state;

async function main() {
  const provider = getProviderConfig();
  console.log(`narrative provider: ${provider ? `${provider.provider}:${provider.model}` : "none (template)"}`);

  const results: CaseResult[] = [];
  results.push(await runCase("correct", "Persisted progress, bounded retries with backoff, timeouts, a dedupe guard, CI, and tests of the restart and failure paths.", zip(correct)));
  results.push(await runCase("partial", "Retries with backoff only; no persistence, dedupe, timeouts or tests.", zip(partial)));
  results.push(await runCase("superficial", "Errors swallowed and a constant returned; a test that asserts nothing.", zip(superficial)));
  results.push(await runCase("alternative", "Same capability in Python: tenacity retries, timeout, dedupe, logged re-raise, pytest failure test with fakes.", zip(alternative)));
  results.push(await runCase("missing", "Notes and a trivial file; nothing a rule can cite.", zip(missing)));
  const broken = zip(correct).slice(0, 200);
  results.push(await runCase("execution-failure", "A truncated archive: the import cannot be read.", broken));
  results.push(await runCase("deep-retry-and-dedupe", "Backoff 11 lines into the retry loop, a seen-set guard and an ON CONFLICT DO NOTHING claim.", zip(deepRetryAndDedupe)));
  results.push(await runCase("near-miss", "A counter loop that waits only after the loop, a loop over entries, dedupe words only in comments and return values.", zip(nearMiss)));

  const [c, p, s, a, m, f, d, n] = results;
  const checks: Array<[string, () => void]> = [
    ["correct cites retries, dedupe, timeout, logged error handling, tests, a failure-path test and CI", () => {
      for (const x of ["retry_with_backoff", "idempotency_guard", "outbound_timeout", "explicit_error_handling", "test_suite", "failure_path_test", "ci_checks"]) assert.ok(detectorsOf(c).has(x), `correct missing ${x}`);
      const retry = c.findings?.find((x) => x.detector === "retry_with_backoff");
      assert.equal(retry?.lines, "8-15", "the citation spans the loop header to the wait");
    }],
    ["partial keeps exactly the retry finding: no timeout, dedupe or tests", () => {
      assert.deepEqual([...detectorsOf(p)].sort(), ["retry_with_backoff"]);
    }],
    ["superficial gains no findings from the new rules: only the test file is cited", () => {
      assert.deepEqual([...detectorsOf(s)].sort(), ["test_suite"]);
    }],
    ["alternative valid solution is recognized in another language and library, including its dedupe check", () => {
      for (const x of ["retry_with_backoff", "idempotency_guard", "outbound_timeout", "explicit_error_handling", "failure_path_test", "test_isolation"]) assert.ok(detectorsOf(a).has(x), `alternative missing ${x}`);
      assert.equal(level(a, "reliability"), "developing");
    }],
    ["deep retry, seen-set guard and dedupe claim are all cited", () => {
      for (const x of ["retry_with_backoff", "idempotency_guard"]) assert.ok(detectorsOf(d).has(x), `deep case missing ${x}`);
      const guards = d.findings?.filter((x) => x.detector === "idempotency_guard").map((x) => x.path).sort();
      assert.deepEqual(guards, ["src/relay.ts", "src/store.ts"]);
    }],
    ["near misses produce neither a retry nor a dedupe finding", () => {
      for (const x of ["retry_with_backoff", "idempotency_guard"]) assert.ok(!detectorsOf(n).has(x), `near-miss should not have ${x}`);
    }],
    ["every finding is bound to the new analysis version", () => {
      for (const r of [c, p, s, a, d]) for (const e of r.report?.ledger ?? []) assert.equal(e.source.analysisVersion, ANALYSIS_VERSION);
    }],
    ["partial and correct differ in testing evidence, not just wording", () => {
      assert.equal(level(p, "quality"), "insufficient_evidence");
      assert.equal(level(c, "quality"), "developing");
    }],
    ["missing evidence produces no findings and says not observed, never a deficiency", () => {
      assert.equal(m.findings?.length, 0);
      const statements = m.report?.capabilityStatements ?? [];
      assert.ok(statements.every((st) => st.notAssessed.some((n) => /not evidence of inability/.test(n))));
    }],
    ["execution failure produces no report at all", () => {
      assert.equal(f.status, "rejected");
      assert.equal(f.report, undefined);
    }],
    ["reliability level differs for supported reasons", () => {
      assert.notEqual(level(c, "reliability"), level(s, "reliability"));
      assert.equal(level(s, "reliability"), "insufficient_evidence");
    }],
    ["tests exist is observed where tests were found, never tests executed", () => {
      assert.equal(facet(c, "outbound_timeout", "tests_exist"), "observed");
      assert.equal(facet(s, "test_suite", "tests_exist"), "observed");
      assert.equal(facet(p, "retry_with_backoff", "tests_exist"), "not_observed");
      for (const r of [c, p, s, a]) for (const e of r.report?.ledger ?? []) {
        assert.equal(e.verification.tests_executed.state, "not_assessed");
        assert.equal(e.verification.tests_passed.state, "not_assessed");
        assert.equal(e.verification.production_observed.state, "not_assessed");
        assert.equal(e.verification.attribution_supported.state, "not_assessed");
      }
    }],
    ["the engineer's claim is recorded as a claim, only where one was made", () => {
      assert.equal(facet(c, "outbound_timeout", "contribution_claimed"), "claimed");
      assert.equal(facet(p, "retry_with_backoff", "contribution_claimed"), "not_observed");
    }],
    ["each analyzed case has its own input hash and every ledger entry cites a file and revision", () => {
      const hashes = [c, p, s, a, m].map((r) => r.report?.run?.inputHash);
      assert.equal(new Set(hashes).size, 5);
      for (const r of [c, p, s, a]) for (const e of r.report?.ledger ?? []) {
        assert.equal(e.evidence.kind, "code");
        assert.ok(e.source.revision && e.id.startsWith("ev_"));
      }
    }],
    ["model prose (if any) cites only ledger-backed ids", () => {
      for (const r of [c, p, s, a, m]) {
        const n = r.report?.narrative;
        if (!n) continue;
        const allowed = new Set([...(r.report?.ledger ?? []).map((e) => e.id), ...(r.report?.dimensions ?? []).map((d) => `dimension:${d.id}`), ...(r.report?.strengths ?? []).map((x) => x.id), ...(r.report?.patterns ?? []).map((x) => x.id), ...(r.report?.growth ?? []).map((x) => x.id)]);
        for (const para of n.paragraphs) for (const ref of para.refs) assert.ok(allowed.has(ref) || ref.startsWith("act:"), `${r.case}: unknown ref ${ref}`);
      }
    }],
  ];

  let failed = 0;
  for (const [name, fn] of checks) {
    try {
      fn();
      console.log(`ok  ${name}`);
    } catch (e) {
      failed += 1;
      console.log(`FAIL ${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const summary = results.map((r) => ({
    case: r.case,
    why: r.why,
    status: r.status,
    error: r.error,
    detectors: [...detectorsOf(r)].sort(),
    levels: Object.fromEntries((r.report?.dimensions ?? []).map((d) => [d.id, d.level])),
    capabilityStatements: (r.report?.capabilityStatements ?? []).filter((x) => x.observed).map((x) => `${x.label}: ${x.observed} ${x.claimed} ${x.notAssessed.slice(0, 2).join(" ")}`.trim()),
    narrative: r.report ? { source: r.report.narrative.source, model: r.report.narrative.model ?? null, summary: r.report.narrative.summary, claimCheck: r.report.narrative.claimCheck ?? null } : null,
    inputHash: r.report?.run?.inputHash ?? null,
  }));
  writeFileSync(
    join(OUT, "differential-summary.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), analysisVersion: ANALYSIS_VERSION, narrativeProvider: provider ? `${provider.provider}:${provider.model}` : "template", passed: checks.length - failed, total: checks.length, cases: summary },
      null,
      2,
    ),
  );
  console.log(`\n${checks.length - failed}/${checks.length} differential checks passed. Output: ${OUT}`);
  if (failed) process.exit(1);
}

void main();
