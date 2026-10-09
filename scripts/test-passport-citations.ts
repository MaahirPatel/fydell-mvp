/**
 * A3: claims cite existing source lines at a pinned revision, and tests that
 * did not run never support a runtime claim.
 *
 * Runs the real GitHub import pipeline (extractRepository) against a fixture
 * GitHub transport that serves two different revisions, the real upload
 * pipeline (analyzeUpload) on an in-memory archive, and the capability
 * review built from both. No network, no database.
 *
 * Run: npx tsx scripts/test-passport-citations.ts
 */
import { createHash } from "node:crypto";
import { strToU8, zipSync, type Zippable } from "fflate";
import { checkModelItem } from "@/lib/passport/capability/enrich";
import { READ_ONLY_CHECKS, TEST_DETECTORS } from "@/lib/passport/capability/catalog";
import { profileCapabilityGroups } from "@/lib/passport/capability/profile";
import { buildCapabilityReview, type ReviewInput } from "@/lib/passport/capability/synthesize";
import type { CapabilityReview, EnrichmentRecord, TaskDemonstration } from "@/lib/passport/capability/types";
import { GithubClient, type Fetcher } from "@/lib/passport/github/client";
import { extractRepository } from "@/lib/passport/github/extract";
import { redactSecrets } from "@/lib/passport/github/redact";
import { ANALYSIS_VERSION, type ExtractionResult, type RepoFinding } from "@/lib/passport/github/types";
import { citationIsValid } from "@/lib/passport/github/validate";
import { analyzeUpload } from "@/lib/passport/upload";
import type { PassportProject } from "@/lib/passport/view";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) passed += 1;
  else failed += 1;
  console.log(`  ${cond ? "ok  " : "FAIL"} ${name}${!cond && detail ? ` (${detail})` : ""}`);
}

const gitBlobSha = (text: string) => {
  const data = Buffer.from(text, "utf8");
  return createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
};
const linesOf = (text: string) => text.split(/\r?\n/);

// ---- fixture revisions --------------------------------------------------------

const PINNED = "a3c1ea9".padEnd(40, "1");
const HEAD = "a3c1ea9".padEnd(40, "2");
const OWNER = "fixture-org";
const REPO = "job-runner";
const LOGIN = "fixture-dev";

/** Synthetic key-shaped block: redaction must replace it without moving any later line. */
const FAKE_PEM = ["-----BEGIN RSA PRIVATE KEY-----", "MIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeKLs1Pt8Qu", "KUpRKfFLfRYC9AIKjbJTWit+CqvjWYzvQwECAwEAAQJAIJLixBy2qpFoS4DSmoEm", "-----END RSA PRIVATE KEY-----"].join("\n");

const worker = [
  "import { saveProgress, loadProgress, alreadyProcessed } from './progress';",
  "",
  `const FIXTURE_KEY = \`${FAKE_PEM}\`;`,
  "export const keyLength = FIXTURE_KEY.length;",
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
].join("\n");

const settings = [
  'db_password = "fixture-not-a-real-password"',
  "",
  "import time",
  "",
  "def fetch_with_retry(client, url):",
  "    for attempt in range(5):",
  "        try:",
  "            return client.get(url, timeout=3)",
  "        except ConnectionError as err:",
  "            print('retrying', attempt, err)",
  "            time.sleep(2 ** attempt)",
  "    raise RuntimeError('gave up')",
  "",
].join("\r\n");

const tests = [
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
].join("\n");

const skippedTests = [
  "import { runJob } from '../src/worker';",
  "",
  "test.skip('rejects a job whose endpoint never answers', async () => {",
  "  await expect(runJob({ id: 'slow', url: 'http://10.255.255.1' })).rejects.toThrow('job failed');",
  "});",
  "",
].join("\n");

const PINNED_FILES: Record<string, string> = {
  "README.md": "# job-runner\n\nRuns queued jobs with persisted progress.\n",
  ".github/workflows/ci.yml": "name: ci\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm test\n",
  "package.json": '{"name":"job-runner","scripts":{"test":"jest"},"devDependencies":{"jest":"^29.0.0"}}\n',
  "src/worker.ts": worker,
  "src/progress.ts": "const store = new Map<string, number>();\nexport async function saveProgress(id: string, n: number) { store.set(id, n); }\nexport async function loadProgress(id: string) { return store.get(id); }\nexport async function alreadyProcessed(id: string) { return store.get(id) === -1; }\n",
  "app/settings.py": settings,
  "tests/worker.test.ts": tests,
  "tests/slow.test.ts": skippedTests,
};

/** The branch head moved on: three lines were added at the top of each source file, so every line number differs. */
const HEAD_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(PINNED_FILES).map(([p, t]) => [p, /\.(ts|py)$/.test(p) ? `// header 1\n// header 2\n// header 3\n${t}` : t]),
);

const REVISIONS: Record<string, Record<string, string>> = { [PINNED]: PINNED_FILES, [HEAD]: HEAD_FILES };
const requestedRevisions = new Set<string>();

const fixtureGithub: Fetcher = async (url) => {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  if (u.hostname === "api.github.com" && parts[0] === "repos" && `${parts[1]}/${parts[2]}` === `${OWNER}/${REPO}`) {
    if (parts.length === 3) {
      return json({ id: 4242, full_name: `${OWNER}/${REPO}`, html_url: `https://github.com/${OWNER}/${REPO}`, default_branch: "main", private: false, fork: false, archived: false, language: "TypeScript", size: 12 });
    }
    if (parts[3] === "commits" && parts.length === 5) return new Response(HEAD, { status: 200 });
    if (parts[3] === "commits") {
      const path = u.searchParams.get("path") ?? "";
      const at = u.searchParams.get("sha") ?? "";
      return json(REVISIONS[at]?.[path] !== undefined ? [{ sha: "c0ffee".padEnd(40, "0"), commit: { message: `edit ${path}`, author: { date: "2026-09-30T10:00:00Z" } }, parents: [{}] }] : []);
    }
    if (parts[3] === "git" && parts[4] === "trees") {
      const files = REVISIONS[parts[5]];
      if (!files) return json({ message: "Not Found" }, 404);
      requestedRevisions.add(parts[5]);
      return json({ tree: Object.entries(files).map(([path, text]) => ({ path, type: "blob", mode: "100644", size: Buffer.byteLength(text), sha: gitBlobSha(text) })), truncated: false });
    }
  }
  if (u.hostname === "raw.githubusercontent.com") {
    const text = REVISIONS[parts[2]]?.[parts.slice(3).join("/")];
    if (text !== undefined) requestedRevisions.add(parts[2]);
    return text === undefined ? new Response("", { status: 404 }) : new Response(text, { status: 200 });
  }
  return json({ message: "unexpected" }, 500);
};

// ---- shared assertions --------------------------------------------------------

/**
 * Every finding's path and line range exist in the original file at the
 * pinned revision, the manifest entry identifies that exact content, and the
 * excerpt is those lines after redaction (which never moves a line).
 */
function citationChecks(label: string, result: ExtractionResult, original: Record<string, string>, revision: string) {
  const manifest = new Map((result.manifest ?? []).map((m) => [m.path, m]));
  const bad: string[] = [];
  for (const f of result.findings) {
    const text = original[f.path];
    const entry = manifest.get(f.path);
    const ls = text === undefined ? [] : linesOf(text);
    const problems = [
      text === undefined && "path not in snapshot",
      (!entry || !entry.included) && "path not an included manifest entry",
      entry && text !== undefined && entry.blobSha !== gitBlobSha(text) && "manifest blob hash differs from the content at the revision",
      !(Number.isInteger(f.startLine) && Number.isInteger(f.endLine) && f.startLine >= 1 && f.endLine >= f.startLine && f.endLine <= ls.length) && `range L${f.startLine}-${f.endLine} outside ${ls.length} lines`,
      JSON.stringify(f.excerpt) !== JSON.stringify(ls.slice(f.startLine - 1, f.endLine).map(redactSecrets)) && "excerpt differs from the cited lines",
    ].filter((p): p is string => typeof p === "string");
    if (problems.length) bad.push(`${f.detector} ${f.path} L${f.startLine}-${f.endLine}: ${problems.join(", ")}`);
  }
  check(`${label}: every finding's path and line range exist at ${revision.slice(0, 7)} and the excerpt is those lines`, bad.length === 0, bad.slice(0, 3).join("; "));
  check(`${label}: the result is pinned to ${revision.slice(0, 7)}`, result.commitSha === revision);
}

function projectFrom(result: ExtractionResult, sourceKind: "github" | "upload"): PassportProject {
  return {
    id: "00000000-0000-4000-8000-00000000a3a3",
    repoFullName: result.repository?.fullName ?? "",
    sourceKind,
    htmlUrl: result.repository?.htmlUrl ?? "",
    commitSha: result.commitSha ?? "",
    revisionRef: result.revisionRef ?? null,
    analysisVersion: result.analysisVersion,
    primaryLanguage: result.repository?.primaryLanguage ?? null,
    isFork: false,
    contributionStatement: "",
    status: "complete",
    coverage: { totalFiles: result.coverage.totalFiles, analyzedFiles: result.coverage.analyzedFiles, skippedFiles: result.coverage.skipped.length, languages: result.coverage.languages, skipReasons: {}, treeTruncated: false },
    analyzedAt: "2026-10-09T12:00:00.000Z",
    notices: result.notices,
    evidence: result.findings.map((x) => ({ id: x.id, repo: result.repository?.fullName ?? "", detector: x.detector, category: x.category, finding: x.finding, basis: x.basis, path: x.path, startLine: x.startLine, endLine: x.endLine, excerpt: x.excerpt, sourceUrl: x.sourceUrl, limitations: x.limitations, entailment: x.entailment ?? null })),
    contributionSignals: result.contributionSignals ?? null,
    checks: result.checks ?? null,
  };
}

// ---- 1. GitHub import pinned to a revision -----------------------------------

async function githubPinned(): Promise<ExtractionResult> {
  console.log("\nGitHub import pinned to a commit");
  const client = new GithubClient(fixtureGithub, { maxAttempts: 1 });
  const result = await extractRepository({ owner: OWNER, repo: REPO }, client, { commitSha: PINNED, contributorLogin: LOGIN });
  const detectors = new Set(result.findings.map((f) => f.detector));
  check("the import produced findings across source, tests and config", result.findings.length >= 6 && ["retry_with_backoff", "outbound_timeout", "test_suite", "ci_checks"].every((d) => detectors.has(d)), [...detectors].join(", "));
  check("only the pinned revision's tree and files were read, never the branch head", requestedRevisions.has(PINNED) && !requestedRevisions.has(HEAD), [...requestedRevisions].join(", "));
  citationChecks("github", result, PINNED_FILES, PINNED);

  const urlBad = result.findings.filter((f) => f.sourceUrl !== `https://github.com/${OWNER}/${REPO}/blob/${PINNED}/${f.path.split("/").map(encodeURIComponent).join("/")}#L${f.startLine}-L${f.endLine}`);
  check("every source link opens the cited lines at the pinned commit, not a branch", urlBad.length === 0, urlBad.map((f) => f.sourceUrl).slice(0, 2).join(" "));
  const idFor = (f: RepoFinding) => `ev_${createHash("sha256").update(`${ANALYSIS_VERSION}|${PINNED}|${f.detector}|${f.path}|${f.startLine}-${f.endLine}`).digest("hex").slice(0, 16)}`;
  check("every finding id is derived from the pinned commit and the cited range", result.findings.every((f) => f.id === idFor(f)));

  const files = new Map(Object.entries(PINNED_FILES).map(([p, t]) => [p, redactSecrets(t)]));
  check("every published finding passes the analyzer's own citation check", result.findings.every((f) => citationIsValid(f, files)));

  const inWorker = result.findings.filter((f) => f.path === "src/worker.ts");
  const workerLines = linesOf(worker);
  check(
    "findings below a redacted key block keep the line numbers of the real file",
    inWorker.length > 0 && inWorker.every((f) => f.startLine > 8 && workerLines[f.startLine - 1] === f.excerpt[0]),
    inWorker.map((f) => `${f.detector} L${f.startLine}`).join(", "),
  );
  check("the key block itself never appears in an excerpt", !result.findings.some((f) => f.excerpt.join("\n").includes("MIIBOgIBAAJBAKj")));
  const inSettings = result.findings.filter((f) => f.path === "app/settings.py");
  check(
    "findings in a CRLF file below a redacted secret cite the real lines",
    inSettings.length > 0 && inSettings.every((f) => linesOf(settings)[f.startLine - 1] === f.excerpt[0]),
    inSettings.map((f) => `${f.detector} L${f.startLine}`).join(", "),
  );

  const head = await extractRepository({ owner: OWNER, repo: REPO }, new GithubClient(fixtureGithub, { maxAttempts: 1 }));
  citationChecks("github head", head, HEAD_FILES, HEAD);
  const pinnedIds = new Set(result.findings.map((f) => f.id));
  check("the same code at another commit gets different finding ids, so a report never mixes revisions", head.findings.every((f) => !pinnedIds.has(f.id)));
  const moved = head.findings.find((f) => f.path === "src/worker.ts" && f.detector === "retry_with_backoff");
  const original = result.findings.find((f) => f.path === "src/worker.ts" && f.detector === "retry_with_backoff");
  check("a head finding replayed against the pinned files fails the citation check", !!moved && !!original && moved.startLine !== original.startLine && !citationIsValid(moved, files));

  console.log("\nCitation check rejects anything that does not resolve");
  const base = result.findings[0];
  check("a changed excerpt is rejected", !citationIsValid({ ...base, excerpt: [...base.excerpt.slice(0, -1), `${base.excerpt.at(-1) ?? ""} `] }, files));
  check("a range past the end of the file is rejected", !citationIsValid({ ...base, endLine: 9999 }, files));
  check("line 0 is rejected", !citationIsValid({ ...base, startLine: 0 }, files));
  check("a reversed range is rejected", !citationIsValid({ ...base, startLine: base.endLine + 1 }, files));
  check("a path that was not analyzed is rejected", !citationIsValid({ ...base, path: "src/not-fetched.ts" }, files));
  check("a non-integer line is rejected", !citationIsValid({ ...base, startLine: 1.5 }, files));
  return result;
}

// ---- 2. Redaction never moves a line ------------------------------------------

function redaction() {
  console.log("\nRedaction keeps line numbers");
  const samples: Array<[string, string]> = [
    ["key block", `a\n${FAKE_PEM}\nb\nc`],
    ["key block with CRLF", `a\r\n${FAKE_PEM.replace(/\n/g, "\r\n")}\r\nb`],
    ["quoted secret followed by a quote on a later line", 'api_key = "abc\nprint("x")\nz = 1'],
    ["token shapes and assignments", `t = "ghp_${"x1".repeat(15)}"\npassword: hunter2hunter2\nok = 1`],
  ];
  for (const [name, text] of samples) {
    const out = redactSecrets(text);
    check(`${name}: same line count after redaction`, linesOf(out).length === linesOf(text).length, `${linesOf(text).length} -> ${linesOf(out).length}`);
    check(`${name}: the last line is unchanged`, linesOf(out).at(-1) === linesOf(text).at(-1));
  }
  check("the key block is still redacted", !redactSecrets(FAKE_PEM).includes("MIIB") && redactSecrets(FAKE_PEM).startsWith("[REDACTED PRIVATE KEY]"));
}

// ---- 3. Uploads pinned to a content hash --------------------------------------

function uploadPinned(): ExtractionResult | null {
  console.log("\nUpload pinned to a content hash");
  const tree: Zippable = {};
  for (const [p, t] of Object.entries(PINNED_FILES)) tree[`job-runner/${p}`] = strToU8(t);
  const a = analyzeUpload(zipSync(tree), { ownerId: "00000000-0000-4000-8000-0000000000a3", name: "job-runner" });
  check("the archive is analyzed", a.ok);
  if (!a.ok) return null;
  const expected = createHash("sha1");
  for (const p of Object.keys(PINNED_FILES).sort((x, y) => x.localeCompare(y))) expected.update(`${p}\0${gitBlobSha(PINNED_FILES[p])}\n`);
  check("the revision is the content hash of exactly these files", a.result.commitSha === expected.digest("hex"));
  check("the upload produced findings", a.result.findings.length >= 5, String(a.result.findings.length));
  citationChecks("upload", a.result, PINNED_FILES, a.result.commitSha ?? "");

  const changedTree: Zippable = { ...tree, "job-runner/src/worker.ts": strToU8(`// moved\n${worker}`) };
  const b = analyzeUpload(zipSync(changedTree), { ownerId: "00000000-0000-4000-8000-0000000000a3", name: "job-runner" });
  const ids = new Set(a.result.findings.map((f) => f.id));
  check("changing one cited file gives a new content hash and new finding ids", b.ok && b.result.commitSha !== a.result.commitSha && b.result.findings.every((f) => !ids.has(f.id)));
  return a.result;
}

// ---- 4. Tests that did not run never support a runtime claim -----------------

function runtimeChecks(label: string, review: CapabilityReview) {
  const tests = review.capabilities.filter((c) => TEST_DETECTORS.has(c.detector));
  check(`${label}: test findings are present to check`, tests.length > 0);
  check(`${label}: no capability claims an executed test`, review.capabilities.every((c) => !c.basis.includes("executed_test")));
  check(
    `${label}: every test citation is marked not executed`,
    tests.every((c) => c.evidence.every((e) => e.kind !== "test_file" || e.executed === false) && c.evidence.some((e) => e.kind === "test_file")),
  );
  check(`${label}: every test capability says it was not run`, tests.every((c) => /not run/i.test(c.result) && c.limits.some((l) => /Read, not run/.test(l))));
  check(`${label}: no test capability says a test passes`, tests.every((c) => !/\bpass(es|ed)?\b/i.test(`${c.title} ${c.result} ${c.specificWork}`) || /not that it passes|whether (they|it) pass/i.test(`${c.result}`)));
  check(`${label}: every observation is recorded as not executed`, review.layers.projectObservations.every((o) => o.executed === false && o.basis === "inspected_code"));
  const supported = review.requirementSets.flatMap((s) => s.requirements).filter((r) => r.coverage === "supports");
  const leaning = supported.filter((r) => {
    const caps = review.capabilities.filter((c) => r.capabilityIds.includes(c.id) && c.scope === "person" && c.status === "supported");
    return !review.layers.taskDemonstrations.some((t) => t.executed && t.requirementIds.includes(r.id)) && caps.every((c) => READ_ONLY_CHECKS.has(c.detector));
  });
  check(`${label}: no requirement is supported by read-only tests or CI alone`, leaning.length === 0, leaning.map((r) => r.id).join(", "));
  check(`${label}: the method states nothing was executed`, /No code, tests or builds were executed/.test(review.method.notRun));
}

function runtimeClaims(github: ExtractionResult, upload: ExtractionResult | null) {
  console.log("\nTests that did not run never support a runtime claim");
  const testFindings = github.findings.filter((f) => TEST_DETECTORS.has(f.detector));
  check("every test finding records that it was not executed", testFindings.length > 0 && testFindings.every((f) => f.entailment?.executed === false && f.entailment.checks.some((c) => c.check === "not_executed")));
  check("no finding of any kind records execution", github.findings.every((f) => f.entailment?.executed === false));
  const skipped = github.findings.find((f) => TEST_DETECTORS.has(f.detector) && f.entailment?.checks.some((c) => c.check === "skipped_test"));
  check("a finding inside a skipped test is narrowed, never supported", !!skipped && skipped.entailment?.status === "narrowed", github.findings.filter((f) => f.path.startsWith("tests/")).map((f) => `${f.detector} L${f.startLine} ${f.entailment?.status}`).join(", "));

  const project = projectFrom(github, "github");
  const linked = project.contributionSignals?.paths.filter((p) => p.commitsByLogin > 0).length ?? 0;
  check("the fixture links the engineer to the cited files by commits", linked > 0);
  const input: ReviewInput = { project, contribution: null };
  const review = buildCapabilityReview(input);
  runtimeChecks("github", review);
  const skippedCap = skipped ? review.capabilities.find((c) => c.findingIds.includes(skipped.id)) : undefined;
  check("the skipped test's capability is narrowed and project-only in the review", skippedCap?.status === "narrowed" && skippedCap.scope === "project_only");
  const testsReq = review.requirementSets.find((s) => s.role === "backend_engineer")?.requirements.find((r) => r.id === "be.tests");
  check("Tests requirement with linked but unrun tests is at most partially supported", testsReq?.coverage === "partially_supports", testsReq?.coverage);

  const task = (executed: boolean): TaskDemonstration => ({ id: `t-${executed}`, title: "Fixture task", outcome: "Public tests: 6 of 6 recorded", executed, at: "2026-10-09T12:00:00.000Z", href: null, requirementIds: ["be.tests"] });
  const notRunTask = buildCapabilityReview({ ...input, taskDemonstrations: [task(false)] });
  check("a task demonstration that was not executed does not raise coverage", notRunTask.requirementSets[0].requirements.find((r) => r.id === "be.tests")?.coverage === "partially_supports");
  runtimeChecks("github with an unrun task", notRunTask);
  const ranTask = buildCapabilityReview({ ...input, taskDemonstrations: [task(true)] });
  check("only an executed task demonstration can make the Tests requirement supported", ranTask.requirementSets[0].requirements.find((r) => r.id === "be.tests")?.coverage === "supports");

  const groups = profileCapabilityGroups([review]);
  check("the profile does not upgrade read-only tests to supported", groups.find((g) => g.requirementId === "be.tests")?.coverage !== "supports");

  if (upload) runtimeChecks("upload", buildCapabilityReview({ project: projectFrom(upload, "upload"), contribution: null }));

  console.log("\nModel rewording cannot add a runtime claim");
  const testEv = testFindings.find((f) => f.entailment?.status === "supported" && f.excerpt.join("\n").includes("runJob"));
  check("a supported test finding that names runJob is available for the rewording checks", !!testEv);
  const srcEv = github.findings.find((f) => f.detector === "retry_with_backoff");
  const sourceOf = (f: RepoFinding | undefined) => (f ? `${f.path}\n${f.entailment?.symbol ?? ""}\n${f.excerpt.join("\n")}` : "");
  const attempt = (title: string, what: string, isTest: boolean, source: string) => {
    const rejected: EnrichmentRecord["rejected"] = [];
    const out = checkModelItem({ id: "cap_x", title, what, follow_up: "Which case is missing?", entailed: "yes" }, source, isTest, rejected);
    return { out, rejected };
  };
  const ts = sourceOf(testEv);
  for (const [title, what] of [
    ["Resume test passes after a restart", "checks resume after a restart"],
    ["Confirms runJob resumes from persisted progress", "checks that runJob resumes"],
    ["Ensures runJob resumes after a restart", "checks that runJob resumes"],
    ["Resume test succeeds after a restart", "checks resume after a restart"],
    ["Resume test is green", "checks resume after a restart"],
  ] as const) {
    const r = attempt(title, what, true, ts);
    check(`test finding: model title "${title}" is rejected`, r.out.title === undefined && r.rejected.some((x) => x.field === "title"), JSON.stringify(r.rejected));
  }
  const ok = attempt("Asserts runJob rejects for an invalid URL", "asserts runJob rejects for an invalid URL", true, ts);
  check("test finding: a title that says what the test asserts is kept", ok.out.title !== undefined && ok.rejected.length === 0, JSON.stringify(ok.rejected));
  const ss = sourceOf(srcEv);
  const ran = attempt("Retries the fetch and was executed in CI", "retries the fetch and was run in CI", false, ss);
  check("source finding: model text saying the code was run is rejected", ran.out.title === undefined && ran.out.what === undefined);
  const atRuntime = attempt("Retries the fetch at runtime five times", "retries the fetch", false, ss);
  check("source finding: model text claiming runtime observation is rejected", atRuntime.out.title === undefined);
}

async function main() {
  const github = await githubPinned();
  redaction();
  const upload = uploadPinned();
  runtimeClaims(github, upload);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();
