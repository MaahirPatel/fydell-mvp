import { createHash } from "node:crypto";
import { GithubClient, GithubError } from "./client";
import { runDetectors, type DraftFinding } from "./detectors";
import { redactSecrets } from "./redact";
import { selectFiles } from "./select";
import { citationIsValid } from "./validate";
import { suggestRoles } from "../rules";
import {
  ANALYSIS_VERSION,
  LIMITS,
  MANIFEST_MAX_ENTRIES,
  type ExtractionError,
  type ExtractionProgress,
  type ExtractionResult,
  type ManifestEntry,
  type RepoFinding,
  type RepoRef,
  type RepositoryMeta,
  type SkippedFile,
  type TreeEntry,
} from "./types";

const MAX_EXCERPT_LINES = 8;
const CONCURRENCY = 4;

function emptyResult(error: ExtractionError | null = null): ExtractionResult {
  return {
    analysisVersion: ANALYSIS_VERSION,
    status: error ? "failed" : "complete",
    repository: null,
    commitSha: null,
    coverage: { totalFiles: 0, analyzedFiles: 0, analyzedBytes: 0, languages: [], treeTruncated: false, skipped: [] },
    findings: [],
    rejectedFindings: 0,
    roleSuggestions: [],
    notices: [],
    error,
  };
}

function toError(err: unknown): ExtractionError {
  if (err instanceof GithubError) {
    if (err.code === "not_found") return { code: "not_found", message: "This repository does not exist or is not public." };
    if (err.code === "rate_limited")
      return { code: "rate_limited", message: "GitHub is limiting requests right now. Try again shortly.", retryAfterSeconds: err.retryAfterSeconds };
    return { code: "github_unavailable", message: err.message };
  }
  return { code: "github_unavailable", message: "GitHub could not be reached." };
}

function findingId(sha: string, draft: DraftFinding): string {
  return `ev_${createHash("sha256").update(`${ANALYSIS_VERSION}|${sha}|${draft.detector}|${draft.path}|${draft.startLine}-${draft.endLine}`).digest("hex").slice(0, 16)}`;
}

const LANGUAGE_BY_EXT: Record<string, string> = {
  py: "Python", pyi: "Python", ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript",
  mjs: "JavaScript", cjs: "JavaScript", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin",
  rb: "Ruby", php: "PHP", cs: "C#", swift: "Swift", scala: "Scala", sql: "SQL", sh: "Shell",
  vue: "Vue", svelte: "Svelte", css: "CSS", scss: "CSS", html: "HTML", r: "R", jl: "Julia",
  c: "C", cc: "C++", cpp: "C++", h: "C/C++", hpp: "C++",
};

/** Languages observed in the analyzed files, for the coverage display (GH-09). */
function languagesIn(paths: string[]): string[] {
  const seen = new Set<string>();
  for (const path of paths) {
    const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
    const lang = LANGUAGE_BY_EXT[ext];
    if (lang) seen.add(lang);
  }
  return [...seen].sort();
}

export type ExtractOptions = {
  /** Analyze exactly this commit (from a scope preview) instead of the branch head. */
  commitSha?: string;
  onProgress?: (progress: ExtractionProgress) => void | Promise<void>;
};

function buildManifest(
  selected: TreeEntry[],
  included: Set<string>,
  skipped: SkippedFile[],
  sizes: Map<string, TreeEntry>,
): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  for (const entry of selected) {
    if (!included.has(entry.path)) continue;
    entries.push({ path: entry.path, size: entry.size ?? null, blobSha: entry.sha ?? null, included: true });
  }
  for (const s of skipped) {
    const t = sizes.get(s.path);
    entries.push({ path: s.path, size: t?.size ?? null, blobSha: t?.sha ?? null, included: false, reason: s.reason });
  }
  return entries.slice(0, MANIFEST_MAX_ENTRIES);
}

export type ScopePreview =
  | {
      ok: true;
      repository: RepositoryMeta;
      commitSha: string;
      revisionRef: string;
      totalFiles: number;
      selectedFiles: Array<{ path: string; size: number | null }>;
      skipReasons: Record<string, number>;
      treeTruncated: boolean;
      notices: string[];
      limits: typeof LIMITS;
    }
  | { ok: false; error: ExtractionError };

/**
 * Resolves the revision and the files an import would read, without fetching
 * any file contents. The engineer confirms this scope before analysis starts,
 * and the analysis is pinned to the commit shown here.
 */
export async function previewRepository(ref: RepoRef, client = new GithubClient()): Promise<ScopePreview> {
  let meta: Awaited<ReturnType<GithubClient["getRepository"]>>;
  try {
    meta = await client.getRepository(ref);
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
  if (meta.private) return { ok: false, error: { code: "private_repository", message: "Only public repositories can be analyzed." } };
  let sha: string;
  let tree: Awaited<ReturnType<GithubClient["getTree"]>>;
  try {
    sha = await client.getCommitSha(ref, meta.defaultBranch);
    tree = await client.getTree(ref, sha);
  } catch (err) {
    const error = toError(err);
    if (error.code === "not_found" || meta.sizeKb === 0) {
      return { ok: false, error: { code: "empty_repository", message: "This repository has no commits to analyze." } };
    }
    return { ok: false, error };
  }
  const { selected, skipped, totalFiles } = selectFiles(tree.entries);
  if (totalFiles === 0) return { ok: false, error: { code: "empty_repository", message: "This repository has no files to analyze." } };
  const skipReasons: Record<string, number> = {};
  for (const s of skipped) skipReasons[s.reason] = (skipReasons[s.reason] ?? 0) + 1;
  const notices: string[] = [];
  if (meta.fork) notices.push("This repository is a fork. Findings may describe work by the original authors.");
  if (meta.archived) notices.push("This repository is archived.");
  if (tree.truncated) notices.push("GitHub returned a partial file list for this repository; coverage will be incomplete.");
  return {
    ok: true,
    repository: {
      id: meta.id,
      fullName: meta.fullName,
      htmlUrl: meta.htmlUrl,
      defaultBranch: meta.defaultBranch,
      fork: meta.fork,
      archived: meta.archived,
      primaryLanguage: meta.primaryLanguage,
      sizeKb: meta.sizeKb,
    },
    commitSha: sha,
    revisionRef: meta.defaultBranch,
    totalFiles,
    selectedFiles: selected.map((e) => ({ path: e.path, size: e.size ?? null })),
    skipReasons,
    treeTruncated: tree.truncated,
    notices,
    limits: LIMITS,
  };
}

export async function extractRepository(ref: RepoRef, client = new GithubClient(), options: ExtractOptions = {}): Promise<ExtractionResult> {
  const progress = async (p: ExtractionProgress) => {
    try {
      await options.onProgress?.(p);
    } catch {
      // Progress reporting must never fail the analysis.
    }
  };
  await progress({ stage: "resolving" });
  let meta: Awaited<ReturnType<GithubClient["getRepository"]>>;
  try {
    meta = await client.getRepository(ref);
  } catch (err) {
    return emptyResult(toError(err));
  }
  if (meta.private) {
    return emptyResult({ code: "private_repository", message: "Only public repositories can be analyzed." });
  }
  if (options.commitSha !== undefined && !/^[0-9a-f]{40}$/.test(options.commitSha)) {
    return emptyResult({ code: "invalid_input", message: "The selected revision is not a valid commit." });
  }

  const result = emptyResult();
  result.repository = {
    id: meta.id,
    fullName: meta.fullName,
    htmlUrl: meta.htmlUrl,
    defaultBranch: meta.defaultBranch,
    fork: meta.fork,
    archived: meta.archived,
    primaryLanguage: meta.primaryLanguage,
    sizeKb: meta.sizeKb,
  };
  if (meta.fork) result.notices.push("This repository is a fork. Findings may describe work by the original authors.");
  if (meta.archived) result.notices.push("This repository is archived.");

  let sha: string;
  let tree: Awaited<ReturnType<GithubClient["getTree"]>>;
  try {
    sha = options.commitSha ?? (await client.getCommitSha(ref, meta.defaultBranch));
    await progress({ stage: "listing" });
    tree = await client.getTree(ref, sha);
  } catch (err) {
    const error = toError(err);
    if (options.commitSha && error.code === "not_found") {
      return { ...result, status: "failed", error: { code: "not_found", message: "The selected revision is no longer available on GitHub." } };
    }
    if (error.code === "not_found" || meta.sizeKb === 0) {
      return { ...result, status: "failed", error: { code: "empty_repository", message: "This repository has no commits to analyze." } };
    }
    return { ...result, status: "failed", error };
  }
  result.commitSha = sha;
  result.revisionRef = meta.defaultBranch;

  const { selected, skipped, totalFiles } = selectFiles(tree.entries);
  if (totalFiles === 0) {
    return { ...result, status: "failed", error: { code: "empty_repository", message: "This repository has no files to analyze." } };
  }

  const files = new Map<string, string>();
  const fetchSkipped: SkippedFile[] = [];
  let bytes = 0;
  let rateLimited: ExtractionError | null = null;
  await progress({ stage: "fetching", filesFetched: 0, filesSelected: selected.length });
  for (let i = 0; i < selected.length && !rateLimited; i += CONCURRENCY) {
    if (i > 0) await progress({ stage: "fetching", filesFetched: i, filesSelected: selected.length });
    const batch = selected.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((entry) => client.getFileText(ref, sha, entry.path)));
    settled.forEach((outcome, k) => {
      const path = batch[k].path;
      if (outcome.status === "rejected") {
        if (outcome.reason instanceof GithubError && outcome.reason.code === "rate_limited") rateLimited = toError(outcome.reason);
        fetchSkipped.push({ path, reason: "fetch_failed" });
        return;
      }
      const text = outcome.value;
      const size = Buffer.byteLength(text, "utf8");
      if (text.includes("\u0000")) return void fetchSkipped.push({ path, reason: "binary" });
      if (size > LIMITS.maxBytesPerFile) return void fetchSkipped.push({ path, reason: "too_large" });
      if (bytes + size > LIMITS.maxBytesPerRepository) return void fetchSkipped.push({ path, reason: "byte_limit" });
      // Redact likely secrets at ingestion: detectors, excerpts, citation
      // validation and the summarisation model all see the same redacted
      // snapshot, so redacted excerpts still validate byte-identical (GH-07).
      files.set(path, redactSecrets(text));
      bytes += size;
    });
  }
  if (rateLimited) {
    const fetched = new Set([...files.keys(), ...fetchSkipped.map((s) => s.path)]);
    for (const entry of selected) if (!fetched.has(entry.path)) fetchSkipped.push({ path: entry.path, reason: "fetch_failed" });
  }

  await progress({ stage: "analyzing", filesFetched: selected.length, filesSelected: selected.length });
  const drafts = runDetectors(files);
  const findings: RepoFinding[] = [];
  let rejected = 0;
  for (const draft of drafts) {
    const text = files.get(draft.path) ?? "";
    const endLine = Math.min(draft.endLine, draft.startLine + MAX_EXCERPT_LINES - 1);
    const finding: RepoFinding = {
      ...draft,
      endLine,
      id: findingId(sha, draft),
      excerpt: text.split(/\r?\n/).slice(draft.startLine - 1, endLine),
      sourceUrl: `${meta.htmlUrl}/blob/${sha}/${draft.path.split("/").map(encodeURIComponent).join("/")}#L${draft.startLine}-L${endLine}`,
      attribution: "unverified",
    };
    // The snapshot text was redacted at ingestion, so the excerpt stored
    // here is already safe to display and send to the model (GH-07), and
    // the citation validates byte-identical against the same snapshot.
    if (citationIsValid(finding, files)) {
      findings.push(finding);
    } else rejected += 1;
  }

  result.findings = findings;
  result.rejectedFindings = rejected;
  result.roleSuggestions = suggestRoles(findings);
  result.coverage = {
    totalFiles,
    analyzedFiles: files.size,
    analyzedBytes: bytes,
    languages: languagesIn([...files.keys()]),
    treeTruncated: tree.truncated,
    skipped: [...skipped, ...fetchSkipped],
  };
  result.manifest = buildManifest(
    selected,
    new Set(files.keys()),
    [...fetchSkipped, ...skipped],
    new Map(tree.entries.map((e) => [e.path, e])),
  );
  if (tree.truncated) result.notices.push("GitHub returned a partial file list for this repository; coverage is incomplete.");
  if (findings.length === 0) result.notices.push("No supported patterns were found in the analyzed files. This does not mean the work lacks quality.");

  const partial = tree.truncated || fetchSkipped.some((s) => s.reason === "fetch_failed");
  result.status = partial ? "partial" : "complete";
  if (rateLimited) result.error = rateLimited;
  return result;
}
