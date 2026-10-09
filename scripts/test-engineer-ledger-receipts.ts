/**
 * Evidence ledger, capability statements, version comparison, the claim
 * check on model prose and the work receipt contract. Pure: no network, no
 * database.
 *
 * Run: npx tsx --conditions react-server scripts/test-engineer-ledger-receipts.ts
 */
import assert from "node:assert/strict";
import { synthesize, citableIds, type SynthesisInput } from "../src/lib/builder-analysis/synthesize";
import { buildLedger, capabilityStatements, compareVersions, inputSnapshot, FACETS } from "../src/lib/builder-analysis/ledger";
import { sha256 } from "../src/lib/builder-analysis/hash";
import { __test } from "../src/lib/builder-analysis/narrative";
import type { ClaimRejection } from "../src/lib/builder-analysis/types";
import { receiptExport, receiptKey, snapshotScope, TIME_STATEMENT, type ReceiptView } from "../src/lib/receipts/contract";
import type { PassportEvidence, PassportProject } from "../src/lib/passport/view";
import { blockEnd, runPracticeDetectors } from "../src/lib/passport/github/practice-detectors";
import { idempotencyMatch } from "../src/lib/passport/github/detectors";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function evidence(repo: string, detector: string, n: number): PassportEvidence {
  return { id: `${repo}:${detector}:${n}`, repo, detector, category: "backend", finding: `${detector} in ${repo}`, basis: "repository_observation", path: "src/a.ts", startLine: 1, endLine: 3, excerpt: [], sourceUrl: "", limitations: [] };
}

function project(repo: string, detectors: string[], over: Partial<PassportProject> = {}): PassportProject {
  return {
    repoFullName: repo, htmlUrl: `https://github.com/${repo}`, commitSha: "a".repeat(40), primaryLanguage: "TypeScript", isFork: false, contributionStatement: "", status: "complete",
    coverage: { totalFiles: 10, analyzedFiles: 10, skippedFiles: 0, languages: ["TypeScript"], skipReasons: {}, treeTruncated: false },
    analyzedAt: "2026-09-01T00:00:00Z", notices: [], evidence: detectors.map((d, i) => evidence(repo, d, i)), ...over,
  };
}

const SCOPE = { deepProjects: 2, scannedRepos: 0, forksExcluded: 0, archivedIncluded: 0, listingTruncated: false, skipped: [], commitsSampled: 0 };
const NOW = new Date("2026-10-07T12:00:00Z");

const projects = [
  project("sample/api", ["retry_with_backoff", "outbound_timeout", "test_suite"], { contributionStatement: "I wrote the retry wrapper.", id: "snap-api-2", analysisVersion: "v1" }),
  project("sample/worker", ["outbound_timeout"], { id: "snap-worker", analysisVersion: "v1" }),
];
const input: SynthesisInput = { displayName: "Sample", githubLogin: null, projects, activity: [], scope: SCOPE, now: NOW };
const s = synthesize(input);
const ledger = buildLedger(s, { projects, activity: [] });

test("every finding becomes a ledger entry with source revision, snapshot and all facets", () => {
  assert.equal(ledger.length, 4);
  for (const e of ledger) {
    assert.equal(e.basis, "observation");
    assert.equal(e.source.revision, "a".repeat(40));
    assert.ok(e.source.snapshotId);
    assert.deepEqual(Object.keys(e.verification).sort(), [...FACETS].sort());
  }
});

test("tests executed, tests passed and production are never observed for imported code", () => {
  for (const e of ledger) {
    assert.equal(e.verification.tests_executed.state, "not_assessed");
    assert.equal(e.verification.tests_passed.state, "not_assessed");
    assert.equal(e.verification.production_observed.state, "not_assessed");
    assert.equal(e.verification.attribution_supported.state, "not_assessed");
  }
});

test("tests exist only where a test suite was found; a claim stays a claim", () => {
  const api = ledger.filter((e) => e.source.repo === "sample/api");
  const worker = ledger.filter((e) => e.source.repo === "sample/worker");
  assert.ok(api.every((e) => e.verification.tests_exist.state === "observed"));
  assert.ok(worker.every((e) => e.verification.tests_exist.state === "not_observed"));
  assert.ok(api.every((e) => e.verification.contribution_claimed.state === "claimed"));
  assert.ok(worker.every((e) => e.verification.contribution_claimed.state === "not_observed"));
});

test("a stale snapshot of the same repository is not counted twice", () => {
  const stale = project("sample/api", ["retry_with_backoff"], { id: "snap-api-1", status: "stale", commitSha: "b".repeat(40) });
  const withStale = buildLedger(synthesize({ ...input, projects: [stale, ...projects] }), { projects: [stale, ...projects], activity: [] });
  assert.equal(withStale.length, ledger.length);
  assert.ok(withStale.every((e) => e.source.snapshotId !== "snap-api-1"));
});

test("capability statements name repo and revision, keep claims apart and never imply inability", () => {
  const st = capabilityStatements(s, ledger);
  const rel = st.find((x) => x.dimension === "reliability");
  assert.ok(rel);
  assert.match(rel.observed, /sample\/api at revision aaaaaaa/);
  assert.match(rel.claimed, /states a contribution to sample\/api/);
  assert.ok(rel.notAssessed.some((t) => /Tests were not run/.test(t)));
  for (const x of st.filter((d) => !d.entryIds.length)) {
    assert.equal(x.observed, "");
    assert.ok(x.notAssessed.some((t) => /not evidence of inability/.test(t)), x.label);
  }
  const all = st.flatMap((x) => [x.observed, x.claimed, ...x.notAssessed]).join(" ");
  assert.doesNotMatch(all, /excellent|strong engineer|senior|weak|poor|lacks/i);
});

test("same inputs hash the same regardless of key order; comparison sees only real changes", () => {
  const a = inputSnapshot({ githubLogin: null, projects, activity: [] });
  const b = inputSnapshot({ githubLogin: null, projects: [...projects].reverse(), activity: [] });
  assert.equal(sha256(a), sha256(b));
  const dims = s.dimensions.map((d) => ({ id: d.id, label: d.label, level: d.level }));
  const same = compareVersions({ inputHash: sha256(a), input: a, dimensions: dims, ledgerIds: ledger.map((e) => e.id) }, { inputHash: sha256(b), input: b, dimensions: dims, ledgerIds: ledger.map((e) => e.id) });
  assert.equal(same.sameInputs, true);
  assert.equal(same.levelChanges.length + same.entriesAdded.length + same.entriesRemoved.length + same.revisionsChanged.length, 0);

  const moved = [project("sample/api", ["retry_with_backoff", "outbound_timeout", "test_suite", "failure_path_test"], { commitSha: "c".repeat(40), id: "snap-api-3" }), projects[1], project("sample/new", ["ci_checks"])];
  const s2 = synthesize({ ...input, projects: moved });
  const l2 = buildLedger(s2, { projects: moved, activity: [] });
  const c = inputSnapshot({ githubLogin: null, projects: moved, activity: [] });
  const diff = compareVersions(
    { inputHash: sha256(a), input: a, dimensions: dims, ledgerIds: ledger.map((e) => e.id) },
    { inputHash: sha256(c), input: c, dimensions: s2.dimensions.map((d) => ({ id: d.id, label: d.label, level: d.level })), ledgerIds: l2.map((e) => e.id) },
  );
  assert.equal(diff.sameInputs, false);
  assert.deepEqual(diff.projectsAdded, ["sample/new"]);
  assert.deepEqual(diff.revisionsChanged, [{ repo: "sample/api", from: "a".repeat(40), to: "c".repeat(40) }]);
  assert.ok(diff.entriesAdded.includes("sample/new:ci_checks:0"));
});

test("model prose saying tests ran or passed is removed; saying they were not run is kept", () => {
  const ids = citableIds(s);
  const ref = [...ids][0];
  const ok = { text: "The analyzed api project contains automated tests and a timeout on its outbound call.", refs: [ref] };
  const cases: Array<[string, boolean]> = [
    ["A continuous integration workflow runs tests and static checks for the project.", false],
    ["All tests pass in the api project, which covers the retry wrapper as well.", false],
    ["The test suite was executed in CI and the build is green for both projects.", false],
    ["The project contains tests, but Fydell did not run them, so whether they pass is not assessed.", true],
  ];
  for (const [text, keep] of cases) {
    const rejected: ClaimRejection[] = [];
    const parsed = __test.parseNarrative(JSON.stringify({ summary: "Most evidence is in reliability across the analyzed projects.", paragraphs: [ok, ok, { text, refs: [ref] }] }), ids, undefined, rejected);
    const kept = parsed?.paragraphs.some((p) => p.text === text) ?? false;
    assert.equal(kept, keep, text);
    if (!keep) assert.ok(rejected.some((r) => r.reason === "execution_claim"), text);
  }
});

test("receipt key is stable per artifact and content, and changes when content does", () => {
  const h1 = sha256({ repo: "sample/api", findings: ["x"] });
  const h2 = sha256({ repo: "sample/api", findings: ["x", "y"] });
  assert.equal(receiptKey("repository_snapshot", "snap-1", h1), receiptKey("repository_snapshot", "snap-1", h1));
  assert.notEqual(receiptKey("repository_snapshot", "snap-1", h1), receiptKey("repository_snapshot", "snap-1", h2));
  assert.match(h1, /^[0-9a-f]{64}$/);
});

test("receipt scope never claims execution or authorship; export carries snapshot date and time statement", () => {
  const scope = snapshotScope({ sourceKind: "upload", revision: "upload-abc", hasTests: true, contributionStated: true });
  const state = (f: string) => scope.find((x) => x.facet === f)?.state;
  assert.equal(state("tests_exist"), "observed");
  assert.equal(state("tests_executed"), "not_assessed");
  assert.equal(state("tests_passed"), "not_assessed");
  assert.equal(state("contribution_claimed"), "claimed");
  assert.equal(state("attribution_supported"), "not_assessed");
  const view: ReceiptView = {
    id: "r1", ownerId: "o1", artifactType: "upload_snapshot", projectKey: "upload/x", sourceRevision: "upload-abc", snapshotId: "s1", evidenceVersionId: null, analysisId: null, importJobId: null,
    subjectVersion: null, analysisVersion: "v1", manifestRef: { findings: 2 }, contentHash: "f".repeat(64), verificationScope: scope, acceptedAt: "2026-10-01T10:00:00Z",
    processing: { state: "current", detail: "" }, integrity: { state: "matches", detail: "" }, linkedReport: null, corrections: [],
  };
  const out = receiptExport(view, "2026-10-09T09:00:00Z");
  assert.equal(out.snapshotDate, "2026-10-01T10:00:00Z");
  assert.equal(out.exportedAt, "2026-10-09T09:00:00Z");
  assert.equal(out.timeStatement, TIME_STATEMENT);
  assert.match(TIME_STATEMENT, /does not show when the work itself was done/);
  assert.ok(!("ownerId" in out.receipt), "owner id is not exported");
});

const retry = (path: string, text: string) => runPracticeDetectors(new Map([[path, text]])).filter((f) => f.detector === "retry_with_backoff");

test("retry with backoff is found anywhere in the loop body, not only in a fixed window", () => {
  const far = [
    "export async function run(url: string) {",
    "  for (let attempt = 0; attempt < 5; attempt++) {",
    "    try {",
    "      const res = await fetch(url);",
    "      await save(res);",
    "      await audit(res);",
    "      await notify(res);",
    "      return res;",
    "    } catch (err) {",
    "      console.error(err);",
    "      await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));",
    "    }",
    "  }",
    "}",
  ].join("\n");
  const hit = retry("src/run.ts", far);
  assert.equal(hit.length, 1);
  assert.equal(hit[0].startLine, 2);
  assert.equal(hit[0].endLine, 11);
  const py = "def run(url):\n    for attempt in range(5):\n        try:\n            return get(url)\n        except IOError:\n            log(attempt)\n            note(attempt)\n            note(attempt)\n            note(attempt)\n            time.sleep(2 ** attempt)\n    raise RuntimeError('gave up')\n";
  assert.equal(retry("app/run.py", py).length, 1);
});

test("a delay outside the loop, or a loop over entries, is not a retry", () => {
  const after = "for (let attempt = 0; attempt < 3; attempt++) {\n  tryOnce();\n}\nawait new Promise((r) => setTimeout(r, 1000));\n";
  assert.equal(retry("src/a.ts", after).length, 0);
  const pyAfter = "for attempt in range(3):\n    try_once()\ntime.sleep(1)\n";
  assert.equal(retry("a.py", pyAfter).length, 0);
  const entries = "for (const entry of entries) {\n  await new Promise((r) => setTimeout(r, 50));\n}\n";
  assert.equal(retry("src/b.ts", entries).length, 0);
  assert.equal(blockEnd(["for (;;) {", "  a();", "}", "b();"], 0), 2);
});

test("idempotency guards: camelCase calls, membership, seen sets and dedupe claims", () => {
  const yes: Array<[string, string[]]> = [
    ["camelCase call", ["if (await alreadyProcessed(job.id)) {", "  return 'skipped';", "}"]],
    ["python membership", ["if job_id in PROCESSED:", "    return None"]],
    ["seen set", ["if (seenIds.has(event.id)) continue;"]],
    ["duplicate check", ["if is_duplicate(msg):", "    raise DuplicateMessage(msg.id)"]],
    ["dict flag", ['if event.get("already_processed"):', "    return"]],
    ["dedupe table", ["await db.query('INSERT INTO processed_events (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [id]);"]],
    ["redis claim", ["ok = r.set(f'job:{job_id}', 1, nx=True, ex=3600)"]],
  ];
  for (const [name, ls] of yes) assert.ok(idempotencyMatch(ls), name);
  const no: Array<[string, string[]]> = [
    ["comment only", ["// TODO: dedupe events if processed twice", "return handle(event);"]],
    ["name only in the returned value", ["if (done) return processedCount;"]],
    ["no early exit", ["if (seenIds.has(id)) {", "  log(id);", "  count++;", "  more();", "}"]],
    ["swallowed error", ["try {", "  return (await fetch(url)).status;", "} catch (e) {", "  return 200;", "}"]],
  ];
  for (const [name, ls] of no) assert.equal(idempotencyMatch(ls), null, name);
});

console.log(`\n${passed} ledger and receipt tests passed`);
