/**
 * Builder Analysis: commit and repository measurements, evidence levels,
 * growth items, narrative validation and the GitHub scan (reuse and rate
 * limits) against a fake GitHub. No network, no database.
 *
 * Run: npx tsx --conditions react-server scripts/test-builder-analysis.ts
 */
import assert from "node:assert/strict";
import { GithubClient, type AuthoredCommit, type PublicRepo } from "../src/lib/passport/github/client";
import { isDescriptiveSubject, isConventionalSubject, selectRepositories, summarizeCommits, summarizeReadme, summarizeTree } from "../src/lib/builder-analysis/activity";
import { citableIds, hasSourceChanges, levelFor, sourceChanges, synthesize, type SynthesisInput } from "../src/lib/builder-analysis/synthesize";
import { templateNarrative, __test } from "../src/lib/builder-analysis/narrative";
import { collectActivity } from "../src/lib/builder-analysis/run";
import type { RepoActivity } from "../src/lib/builder-analysis/types";
import type { PassportEvidence, PassportProject } from "../src/lib/passport/view";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function commit(subject: string, authoredAt: string, parents = 1): AuthoredCommit {
  return { sha: Math.random().toString(16).slice(2).padEnd(40, "0"), subject, authoredAt, parents };
}

function evidence(repo: string, detector: string, n: number): PassportEvidence {
  return { id: `${repo}:${detector}:${n}`, repo, detector, category: "backend", finding: `${detector} in ${repo}`, basis: "repository_observation", path: "src/a.ts", startLine: 1, endLine: 3, excerpt: [], sourceUrl: `https://github.com/${repo}/blob/x/src/a.ts#L1`, limitations: [] };
}

function project(repo: string, detectors: string[]): PassportProject {
  return {
    repoFullName: repo, htmlUrl: `https://github.com/${repo}`, commitSha: "a".repeat(40), primaryLanguage: "TypeScript", isFork: false, contributionStatement: "", status: "complete",
    coverage: { totalFiles: 40, analyzedFiles: 40, skippedFiles: 0, languages: ["TypeScript"], skipReasons: {}, treeTruncated: false },
    analyzedAt: "2026-09-01T00:00:00Z", notices: [], evidence: detectors.map((d, i) => evidence(repo, d, i)),
  };
}

function activity(repo: string, over: Partial<RepoActivity> = {}): RepoActivity {
  return {
    repo, url: `https://github.com/${repo}`, language: "TypeScript", description: null, fork: false, archived: false, pushedAt: "2026-09-20T00:00:00Z", sizeKb: 100, stars: 0, defaultBranch: "main",
    commits: null, releases: null, structure: null, readme: null, reused: false, errors: [], ...over,
  };
}

const NOW = new Date("2026-10-07T12:00:00Z");
const SCOPE = { deepProjects: 0, scannedRepos: 0, forksExcluded: 0, archivedIncluded: 0, listingTruncated: false, skipped: [], commitsSampled: 0 };

async function main() {
  await test("descriptive and conventional commit subjects", () => {
    assert.equal(isDescriptiveSubject("Retry webhook delivery on 5xx responses"), true);
    assert.equal(isDescriptiveSubject("fix"), false);
    assert.equal(isDescriptiveSubject("feat: update"), false);
    assert.equal(isDescriptiveSubject("feat(api): validate pagination cursor input"), true);
    assert.equal(isConventionalSubject("fix(db): close pool on shutdown"), true);
    assert.equal(isConventionalSubject("Fixed stuff"), false);
  });

  await test("merge commits are excluded and weeks counted", () => {
    const s = summarizeCommits([
      commit("Add retry to webhook sender", "2026-09-01T10:00:00Z"),
      commit("Merge pull request #4 from x/y", "2026-09-02T10:00:00Z", 2),
      commit("wip", "2026-09-15T10:00:00Z"),
    ], false);
    assert.equal(s.byYou, 2);
    assert.equal(s.activeWeeks, 2);
    assert.equal(s.messages?.descriptivePct, 50);
    assert.equal(s.months["2026-09"], 2);
  });

  await test("tree summary ignores vendored folders and finds CI and tests", () => {
    const t = summarizeTree([
      { path: "src", type: "tree" }, { path: "tests", type: "tree" }, { path: "node_modules", type: "tree" },
      { path: "src/a.ts", type: "blob" }, { path: "src/b.ts", type: "blob" }, { path: "tests/a.test.ts", type: "blob" },
      { path: "node_modules/x/index.js", type: "blob" }, { path: ".github/workflows/ci.yml", type: "blob" }, { path: "tsconfig.json", type: "blob" },
    ] as Parameters<typeof summarizeTree>[0], false);
    assert.equal(t.sourceFiles, 3);
    assert.equal(t.testFiles, 1);
    assert.equal(t.hasCi, true);
    assert.equal(t.hasTypeConfig, true);
    assert.equal(t.topLevelDirs, 2);
  });

  await test("README sections and setup detection", () => {
    const r = summarizeReadme("# Tool\n\n## Installation\n\n```\nnpm install\n```\n\n## Usage\nrun it\n\n## Architecture\nlayers");
    assert.deepEqual(r.sections, ["setup", "usage", "architecture"]);
    assert.equal(r.hasSetup, true);
  });

  await test("forks excluded, archived last, capped", () => {
    const repos: PublicRepo[] = [
      { name: "a", fullName: "u/a", language: null, fork: true, archived: false, pushedAt: "2026-09-01" },
      { name: "b", fullName: "u/b", language: null, fork: false, archived: true, pushedAt: "2026-09-30" },
      { name: "c", fullName: "u/c", language: null, fork: false, archived: false, pushedAt: "2026-08-01" },
    ];
    const s = selectRepositories(repos, 1);
    assert.deepEqual(s.selected.map((r) => r.fullName), ["u/c"]);
    assert.equal(s.forksExcluded, 1);
    assert.deepEqual(s.overCap.map((r) => r.fullName), ["u/b"]);
  });

  await test("strong evidence needs four practices across two projects", () => {
    assert.equal(levelFor(6, 1), "developing");
    assert.equal(levelFor(4, 2), "strong");
    assert.equal(levelFor(1, 1), "limited");
    assert.equal(levelFor(0, 0), "insufficient_evidence");
  });

  const input: SynthesisInput = {
    displayName: "Sample Engineer",
    githubLogin: "sample",
    projects: [
      project("sample/api", ["retry_with_backoff", "outbound_timeout", "idempotency_guard", "test_suite", "failure_path_test"]),
      project("sample/worker", ["retry_with_backoff", "outbound_timeout", "observability"]),
    ],
    activity: [
      activity("sample/api", { readme: { chars: 120, sections: [], hasSetup: false, hasUsage: false } }),
      activity("sample/cli", { readme: { chars: 0, sections: [], hasSetup: false, hasUsage: false } }),
      activity("sample/site", { readme: { chars: 2000, sections: ["setup", "usage", "architecture"], hasSetup: true, hasUsage: true } }),
    ],
    scope: { ...SCOPE, deepProjects: 2, scannedRepos: 3 },
    now: NOW,
  };
  const s = synthesize(input);

  await test("synthesis: reliability is strong, patterns repeat, style is an inference", () => {
    assert.equal(s.dimensions.find((d) => d.id === "reliability")?.level, "strong");
    assert.ok(s.patterns.some((p) => p.id === "pattern:retries" && p.repos.length === 2));
    assert.equal(s.workingStyle.id, "reliability_minded");
    assert.equal(s.workingStyle.basis, "inference");
    assert.ok(!s.dimensions.some((d) => d.id === "applied_ai"), "optional area hidden without evidence");
  });

  await test("synthesis: thin READMEs become a growth item with refs", () => {
    const g = s.growth.find((x) => x.id === "growth:readme");
    assert.ok(g, JSON.stringify(s.growth.map((x) => x.id)));
    assert.equal(g?.basis, "observation");
    assert.equal(g?.repos.length, 2);
  });

  await test("synthesis: insufficient evidence says so instead of guessing", () => {
    const empty = synthesize({ ...input, projects: [], activity: [activity("sample/x")] });
    assert.ok(empty.dimensions.every((d) => d.level === "insufficient_evidence"));
    assert.equal(empty.workingStyle.id, "early_record");
    assert.match(templateNarrative(empty).summary, /Not enough/);
  });

  await test("synthesis: one project cannot earn a working style", () => {
    const single = synthesize({ ...input, githubLogin: null, activity: [], projects: [project("other/lib", ["test_suite", "failure_path_test", "ci_checks"])], scope: { ...SCOPE, deepProjects: 1 } });
    assert.notEqual(single.workingStyle.id, "test_minded");
    assert.equal(single.workingStyle.id, "early_record");
    assert.equal(single.strengths.length, 0, "a strength needs evidence from more than one project");
  });

  await test("template narrative cites only real ids", () => {
    const ids = citableIds(s);
    const n = templateNarrative(s);
    assert.ok(n.paragraphs.length >= 2);
    for (const p of n.paragraphs) for (const r of p.refs) assert.ok(ids.has(r), r);
  });

  await test("model narrative: invented refs and judgmental words are dropped", () => {
    const ids = citableIds(s);
    const good = { text: "Retries with timeouts appear in both of your service projects, which is consistent work.", refs: ["pattern:retries"] };
    const parsed = __test.parseNarrative(JSON.stringify({
      summary: "Most of your evidence is in reliability across two projects.",
      paragraphs: [good, { text: "You are clearly a senior engineer who should be hired right away for this.", refs: ["dimension:quality"] }, { text: "This paragraph cites an id that does not exist at all in the report.", refs: ["growth:made_up"] }, { ...good, text: good.text + " Again." }],
    }), ids);
    assert.ok(parsed);
    assert.equal(parsed?.paragraphs.length, 2);
    assert.ok(parsed?.paragraphs.every((p) => !/senior|hired/.test(p.text)));
    const leaked = __test.parseNarrative(JSON.stringify({
      summary: "Most of your evidence is in reliability across two projects.",
      paragraphs: [good, { text: "Retries are documented as pattern:retries in two of your projects so far.", refs: ["pattern:retries"] }],
    }), ids);
    assert.equal(leaked, null, "paragraph with a raw id is dropped, leaving too few");
    assert.equal(__test.parseNarrative("not json", ids), null);
    assert.equal(__test.parseNarrative(JSON.stringify({ summary: "A great culture fit with strong evidence.", paragraphs: [good, good] }), ids), null);
  });

  await test("model narrative: a paragraph about missing evidence cites areas, not found practices", () => {
    const ids = citableIds(s);
    const dim = s.dimensions.find((d) => d.practices.some((p) => p.refs.length));
    assert.ok(dim);
    const practiceRef = dim.practices.find((p) => p.refs.length)!.refs[0].id;
    const good = { text: "Retries with timeouts appear in two of the analyzed service projects.", refs: ["pattern:retries"] };
    const parsed = __test.parseNarrative(JSON.stringify({
      summary: "Most evidence is in reliability across two projects.",
      paragraphs: [good, { text: "No evidence was found for linting or typed contracts in the analyzed projects.", refs: [practiceRef] }],
    }), ids, __test.dimensionIndex(s));
    assert.deepEqual(parsed?.paragraphs[1].refs, [`dimension:${dim.id}`]);
    assert.deepEqual(parsed?.paragraphs[0].refs, ["pattern:retries"], "paragraphs about found evidence keep their citations");
  });

  await test("model narrative: authorship and trait claims are dropped", () => {
    const ids = citableIds(s);
    const good = { text: "Retries with timeouts appear in two of the analyzed service projects.", refs: ["pattern:retries"] };
    const parsed = __test.parseNarrative(JSON.stringify({
      summary: "Most evidence is in reliability across two projects.",
      paragraphs: [
        good,
        { text: "You include automated tests in the code you wrote, as shown by one test file.", refs: ["pattern:retries"] },
        { text: "You consistently add retries around every outbound call in these projects.", refs: ["pattern:retries"] },
        { ...good, text: "Both analyzed projects run their checks in a CI workflow on each change." },
      ],
    }), ids);
    assert.equal(parsed?.paragraphs.length, 2);
    assert.equal(
      __test.parseNarrative(JSON.stringify({ summary: "You demonstrate a test\u2011oriented approach across your projects.", paragraphs: [good, good] }), ids),
      null,
    );
  });

  await test("scan reuses unchanged repositories and stops cleanly at a rate limit", async () => {
    let calls = 0;
    const fetcher = async (url: string) => {
      calls += 1;
      const u = new URL(url);
      if (u.pathname === "/users/sample/repos") {
        return new Response(JSON.stringify([
          { name: "a", full_name: "sample/a", fork: false, archived: false, pushed_at: "2026-09-01T00:00:00Z", default_branch: "main", html_url: "https://github.com/sample/a" },
          { name: "b", full_name: "sample/b", fork: false, archived: false, pushed_at: "2026-08-01T00:00:00Z", default_branch: "main", html_url: "https://github.com/sample/b" },
          { name: "c", full_name: "sample/c", fork: true, archived: false, pushed_at: "2026-07-01T00:00:00Z" },
        ]), { status: 200 });
      }
      return new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.round(NOW.getTime() / 1000) + 60) } });
    };
    const client = new GithubClient(fetcher, { maxAttempts: 1 });
    const previous = [activity("sample/a", { pushedAt: "2026-09-01T00:00:00Z", commits: { byYou: 7, capped: false, activeWeeks: 3, firstAt: null, lastAt: null, months: {}, messages: null } })];
    const out = await collectActivity("sample", previous, client);
    assert.equal(out.activity.length, 1);
    assert.equal(out.activity[0].reused, true);
    assert.equal(out.scope.forksExcluded, 1);
    assert.deepEqual(out.scope.skipped, [{ repo: "sample/b", reason: "GitHub rate limit reached" }]);
    assert.equal(out.scope.commitsSampled, 7);
    assert.equal(calls, 2, "listing plus one rate-limited request");
  });

  await test("added or removed projects count as changed sources; same set does not", () => {
    const report = synthesize(input);
    const same = sourceChanges(report, { projects: input.projects, githubLogin: "Sample" });
    assert.equal(hasSourceChanges(same), false);
    const added = sourceChanges(report, { projects: [...input.projects, project("sample/new", [])], githubLogin: "sample" });
    assert.deepEqual(added.added, ["sample/new"]);
    assert.equal(hasSourceChanges(added), true);
    const removed = sourceChanges(report, { projects: input.projects.slice(1), githubLogin: "sample" });
    assert.deepEqual(removed.removed, [input.projects[0].repoFullName]);
    assert.equal(sourceChanges(report, { projects: input.projects, githubLogin: null }).githubChanged, true);
  });

  await test("unknown GitHub user is reported, not thrown", async () => {
    const client = new GithubClient(async () => new Response("{}", { status: 404 }), { maxAttempts: 1 });
    const out = await collectActivity("nobody", undefined, client);
    assert.deepEqual(out.scope.skipped, [{ repo: "nobody", reason: "GitHub username not found" }]);
  });

  console.log(`\n${passed} builder analysis tests passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
