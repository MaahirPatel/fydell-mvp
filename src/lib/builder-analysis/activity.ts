import { GithubClient, GithubError, type AuthoredCommit, type PublicRepo } from "@/lib/passport/github/client";
import type { TreeEntry } from "@/lib/passport/github/types";
import { ANALYSIS_LIMITS, type CommitMessageStats, type RepoActivity } from "./types";

const GENERIC_SUBJECTS = new Set([
  "update", "updates", "updated", "fix", "fixes", "fixed", "wip", "changes", "change", "minor", "stuff", "test",
  "tests", "commit", "save", "misc", "cleanup", "refactor", "initial commit", "first commit", "init", "edit",
  "edits", "tweak", "tweaks", "done", "final", "temp", "asdf", "more", "work", "progress", "push", ".",
]);

const CONVENTIONAL = /^(feat|fix|chore|docs|refactor|test|tests|perf|build|ci|style|revert)(\([^)]{1,40}\))?!?:\s+\S/i;

/** A subject that says what changed: at least four words and not a stock phrase. */
export function isDescriptiveSubject(subject: string): boolean {
  const s = subject.trim().replace(/\s+/g, " ");
  if (!s) return false;
  const bare = s.replace(CONVENTIONAL, (m) => m.replace(/^[^:]+:\s*/, "")).toLowerCase().replace(/[.!]+$/, "");
  if (GENERIC_SUBJECTS.has(bare)) return false;
  const words = s.replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, "").split(" ").filter((w) => /[a-z0-9]/i.test(w));
  return words.length >= 4;
}

export function isConventionalSubject(subject: string): boolean {
  return CONVENTIONAL.test(subject.trim());
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

/** Merge commits are excluded: they record integration, not authored work. */
export function summarizeCommits(commits: AuthoredCommit[], capped: boolean): NonNullable<RepoActivity["commits"]> {
  const authored = commits.filter((c) => c.parents <= 1 && !/^Merge (pull request|branch|remote-tracking)/.test(c.subject));
  const weeks = new Set<string>();
  const months: Record<string, number> = {};
  let first: string | null = null;
  let last: string | null = null;
  for (const c of authored) {
    const d = new Date(c.authoredAt);
    if (Number.isNaN(d.getTime())) continue;
    weeks.add(isoWeek(d));
    const month = c.authoredAt.slice(0, 7);
    months[month] = (months[month] ?? 0) + 1;
    if (!first || c.authoredAt < first) first = c.authoredAt;
    if (!last || c.authoredAt > last) last = c.authoredAt;
  }
  const messages: CommitMessageStats | null = authored.length
    ? {
        sampled: authored.length,
        medianSubjectLength: median(authored.map((c) => c.subject.trim().length)),
        descriptivePct: Math.round((authored.filter((c) => isDescriptiveSubject(c.subject)).length / authored.length) * 100),
        conventionalPct: Math.round((authored.filter((c) => isConventionalSubject(c.subject)).length / authored.length) * 100),
      }
    : null;
  return { byYou: authored.length, capped, activeWeeks: weeks.size, firstAt: first, lastAt: last, months, messages };
}

const TEST_PATH = /(^|\/)(tests?|__tests__|specs?|e2e)(\/|$)|[._-](test|spec)\.[a-z]+$|(^|\/)test_[^/]+\.py$|(^|\/)tests?\.[a-z]+$/i;
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|rb|php|cs|swift|c|cc|cpp|h|hpp|scala|ex|exs|dart|vue|svelte)$/i;
const VENDORED = /(^|\/)(node_modules|vendor|dist|build|\.next|target|venv|\.venv|__pycache__)(\/|$)/;

export function summarizeTree(entries: TreeEntry[], truncated: boolean): NonNullable<RepoActivity["structure"]> {
  const blobs = entries.filter((e) => e.type === "blob" && !VENDORED.test(e.path));
  const paths = blobs.map((e) => e.path);
  const lower = paths.map((p) => p.toLowerCase());
  const has = (re: RegExp) => lower.some((p) => re.test(p));
  const extensions: Record<string, number> = {};
  let testFiles = 0;
  let sourceFiles = 0;
  for (const p of paths) {
    const ext = p.includes(".") ? p.slice(p.lastIndexOf(".") + 1).toLowerCase() : "";
    if (SOURCE_EXT.test(p)) {
      sourceFiles += 1;
      if (ext) extensions[ext] = (extensions[ext] ?? 0) + 1;
      if (TEST_PATH.test(p)) testFiles += 1;
    }
  }
  const topLevelDirs = new Set(
    entries.filter((e) => e.type === "tree" && !e.path.includes("/") && !e.path.startsWith(".") && !VENDORED.test(e.path)).map((e) => e.path),
  ).size;
  return {
    totalFiles: blobs.length,
    testFiles,
    sourceFiles,
    hasCi: has(/^\.github\/workflows\/[^/]+\.ya?ml$/) || has(/^\.gitlab-ci\.yml$/) || has(/^\.circleci\//),
    hasLicense: has(/^(license|licence|copying)(\.[a-z]+)?$/),
    hasDocsDir: has(/^docs?\//),
    hasChangelog: has(/^(changelog|changes|history)(\.[a-z]+)?$/),
    hasContributing: has(/^(\.github\/)?contributing(\.[a-z]+)?$/),
    hasContainer: has(/(^|\/)dockerfile$/) || has(/(^|\/)docker-compose\.ya?ml$/),
    hasTypeConfig: has(/(^|\/)tsconfig\.json$/) || has(/(^|\/)(mypy\.ini|pyrightconfig\.json)$/),
    hasLintConfig: has(/(^|\/)(\.eslintrc(\.[a-z]+)?|eslint\.config\.[a-z]+|\.ruff\.toml|ruff\.toml|\.flake8|biome\.json|\.golangci\.ya?ml|\.prettierrc(\.[a-z]+)?)$/),
    topLevelDirs,
    extensions,
    truncated,
  };
}

const README_SECTIONS: Array<[string, RegExp]> = [
  ["setup", /^#{1,3}\s*(install|installation|setup|getting started|quick ?start|requirements|prerequisites)/im],
  ["usage", /^#{1,3}\s*(usage|how to use|examples?|running|run|commands)/im],
  ["architecture", /^#{1,3}\s*(architecture|design|how it works|overview|structure)/im],
  ["testing", /^#{1,3}\s*(tests?|testing)/im],
  ["configuration", /^#{1,3}\s*(config|configuration|environment|env)/im],
  ["api", /^#{1,3}\s*(api|endpoints|reference)/im],
  ["deployment", /^#{1,3}\s*(deploy|deployment|release)/im],
];

export function summarizeReadme(text: string): NonNullable<RepoActivity["readme"]> {
  const body = text.slice(0, ANALYSIS_LIMITS.readmeChars);
  const sections = README_SECTIONS.filter(([, re]) => re.test(body)).map(([name]) => name);
  const hasCodeBlock = /```[\s\S]+?```/.test(body);
  return {
    chars: body.trim().length,
    sections,
    hasSetup: sections.includes("setup") || (hasCodeBlock && /(npm|pnpm|yarn|pip|poetry|cargo|go) (install|run|build)/i.test(body)),
    hasUsage: sections.includes("usage"),
  };
}

function errorLabel(err: unknown): string {
  if (err instanceof GithubError) {
    if (err.code === "rate_limited") return "rate_limited";
    if (err.code === "not_found") return "not_found";
    if (err.code === "unauthorized") return "unauthorized";
  }
  return "unavailable";
}

export class RateLimitedError extends Error {
  constructor() {
    super("GitHub rate limit reached.");
  }
}

/**
 * Reads one public repository: its tree at the default branch, the README,
 * the owner's most recent commits and the release count. Four requests at
 * most. A rate limit stops the whole scan; other failures are recorded and
 * the rest of the repository is still measured.
 */
export async function measureRepository(client: GithubClient, repo: PublicRepo, login: string): Promise<RepoActivity> {
  const [owner, name] = repo.fullName.split("/");
  const ref = { owner, repo: name };
  const branch = repo.defaultBranch || "main";
  const errors: string[] = [];
  const activity: RepoActivity = {
    repo: repo.fullName,
    url: repo.htmlUrl ?? `https://github.com/${repo.fullName}`,
    language: repo.language,
    description: repo.description ?? null,
    fork: repo.fork,
    archived: repo.archived,
    pushedAt: repo.pushedAt,
    sizeKb: repo.sizeKb ?? null,
    stars: repo.stars ?? null,
    defaultBranch: branch,
    commits: null,
    releases: null,
    structure: null,
    readme: null,
    reused: false,
    errors,
  };

  const guard = async <T>(step: string, fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (err) {
      const label = errorLabel(err);
      if (label === "rate_limited") throw new RateLimitedError();
      errors.push(`${step}: ${label}`);
      return null;
    }
  };

  const tree = await guard("tree", () => client.getTree(ref, branch));
  if (tree) {
    activity.structure = summarizeTree(tree.entries, tree.truncated);
    const readmePath = tree.entries
      .filter((e) => e.type === "blob" && /^readme(\.(md|markdown|rst|txt))?$/i.test(e.path))
      .map((e) => e.path)[0];
    if (readmePath) {
      const text = await guard("readme", () => client.getFileText(ref, branch, readmePath));
      if (text !== null) activity.readme = summarizeReadme(text);
    } else {
      activity.readme = { chars: 0, sections: [], hasSetup: false, hasUsage: false };
    }
  }

  const commits = await guard("commits", () => client.listCommitsByAuthor(ref, login, ANALYSIS_LIMITS.commitsPerRepo));
  if (commits) activity.commits = summarizeCommits(commits, commits.length >= ANALYSIS_LIMITS.commitsPerRepo);

  const releases = await guard("releases", () => client.countReleases(ref));
  if (releases !== null) activity.releases = releases;

  return activity;
}

/**
 * Chooses which public repositories to scan: forks are excluded (their
 * history is mostly someone else's), active repositories come before
 * archived ones, most recently pushed first.
 */
export function selectRepositories(repos: PublicRepo[], max = ANALYSIS_LIMITS.maxScannedRepos): {
  selected: PublicRepo[];
  forksExcluded: number;
  overCap: PublicRepo[];
} {
  const own = repos.filter((r) => !r.fork);
  const ordered = [...own].sort((a, b) => {
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    return (b.pushedAt ?? "").localeCompare(a.pushedAt ?? "");
  });
  return { selected: ordered.slice(0, max), forksExcluded: repos.length - own.length, overCap: ordered.slice(max) };
}
