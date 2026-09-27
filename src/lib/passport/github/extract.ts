import { createHash } from "node:crypto";
import { GithubClient, GithubError } from "./client";
import { runDetectors, type DraftFinding } from "./detectors";
import { selectFiles } from "./select";
import { citationIsValid } from "./validate";
import { suggestRoles } from "../rules";
import {
  ANALYSIS_VERSION,
  LIMITS,
  type ExtractionError,
  type ExtractionResult,
  type RepoFinding,
  type RepoRef,
  type SkippedFile,
} from "./types";

const MAX_EXCERPT_LINES = 8;
const CONCURRENCY = 4;

function emptyResult(error: ExtractionError | null = null): ExtractionResult {
  return {
    analysisVersion: ANALYSIS_VERSION,
    status: error ? "failed" : "complete",
    repository: null,
    commitSha: null,
    coverage: { totalFiles: 0, analyzedFiles: 0, analyzedBytes: 0, treeTruncated: false, skipped: [] },
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

export async function extractRepository(ref: RepoRef, client = new GithubClient()): Promise<ExtractionResult> {
  let meta: Awaited<ReturnType<GithubClient["getRepository"]>>;
  try {
    meta = await client.getRepository(ref);
  } catch (err) {
    return emptyResult(toError(err));
  }
  if (meta.private) {
    return emptyResult({ code: "private_repository", message: "Only public repositories can be analyzed." });
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
    sha = await client.getCommitSha(ref, meta.defaultBranch);
    tree = await client.getTree(ref, sha);
  } catch (err) {
    const error = toError(err);
    if (error.code === "not_found" || meta.sizeKb === 0) {
      return { ...result, status: "failed", error: { code: "empty_repository", message: "This repository has no commits to analyze." } };
    }
    return { ...result, status: "failed", error };
  }
  result.commitSha = sha;

  const { selected, skipped, totalFiles } = selectFiles(tree.entries);
  if (totalFiles === 0) {
    return { ...result, status: "failed", error: { code: "empty_repository", message: "This repository has no files to analyze." } };
  }

  const files = new Map<string, string>();
  const fetchSkipped: SkippedFile[] = [];
  let bytes = 0;
  let rateLimited: ExtractionError | null = null;
  for (let i = 0; i < selected.length && !rateLimited; i += CONCURRENCY) {
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
      files.set(path, text);
      bytes += size;
    });
  }
  if (rateLimited) {
    const fetched = new Set([...files.keys(), ...fetchSkipped.map((s) => s.path)]);
    for (const entry of selected) if (!fetched.has(entry.path)) fetchSkipped.push({ path: entry.path, reason: "fetch_failed" });
  }

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
    if (citationIsValid(finding, files)) findings.push(finding);
    else rejected += 1;
  }

  result.findings = findings;
  result.rejectedFindings = rejected;
  result.roleSuggestions = suggestRoles(findings);
  result.coverage = {
    totalFiles,
    analyzedFiles: files.size,
    analyzedBytes: bytes,
    treeTruncated: tree.truncated,
    skipped: [...skipped, ...fetchSkipped],
  };
  if (tree.truncated) result.notices.push("GitHub returned a partial file list for this repository; coverage is incomplete.");
  if (findings.length === 0) result.notices.push("No supported patterns were found in the analyzed files. This does not mean the work lacks quality.");

  const partial = tree.truncated || fetchSkipped.some((s) => s.reason === "fetch_failed");
  result.status = partial ? "partial" : "complete";
  if (rateLimited) result.error = rateLimited;
  return result;
}
