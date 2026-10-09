import { createHash } from "node:crypto";
import { readProjectArchive, type ZipRejection } from "../eng/zip";
import { analyzeFiles } from "./github/analyze";
import { redactSecrets } from "./github/redact";
import { selectFiles } from "./github/select";
import { suggestRoles } from "./rules";
import {
  ANALYSIS_VERSION,
  UPLOAD_LIMITS,
  type SelectionLimits,
  MANIFEST_MAX_ENTRIES,
  type ExtractionResult,
  type ManifestEntry,
  type SkippedFile,
  type TreeEntry,
} from "./github/types";

export const UPLOAD_IMPORTER_VERSION = "local-upload-v1";
export const UPLOAD_REPO_PREFIX = "upload/";

export const UPLOAD_NOTICE =
  "Uploaded by the engineer. Fydell has not checked where this code came from or who wrote it.";

const LANGUAGE_BY_EXT: Record<string, string> = {
  py: "Python", ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", go: "Go", rs: "Rust",
  java: "Java", kt: "Kotlin", rb: "Ruby", php: "PHP", cs: "C#", swift: "Swift", scala: "Scala", c: "C", cpp: "C++",
};

export type UploadPreview = {
  name: string;
  contentHash: string;
  totalFiles: number;
  selectedFiles: { path: string; size: number }[];
  skipped: SkippedFile[];
  limits: SelectionLimits;
};

export type UploadAnalysis =
  | { ok: true; preview: UploadPreview; result: ExtractionResult }
  | { ok: false; error: ZipRejection | { ok: false; code: "invalid_name"; message: string } };

/** Lowercase slug used as the project's stable name within the engineer's Passport. */
export function uploadSlug(name: string): string | null {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return slug.length >= 2 ? slug : null;
}

/**
 * Negative ids never collide with GitHub repository ids. The id is scoped to
 * the owner so two engineers uploading a project with the same name stay apart.
 */
export function uploadRepoId(ownerId: string, slug: string): number {
  const hex = createHash("sha256").update(`${ownerId}|${slug}`).digest("hex").slice(0, 12);
  return -(parseInt(hex, 16) + 1);
}

function gitBlobSha(data: Uint8Array): string {
  return createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
}

/** Content identity of the uploaded snapshot: same files, same hash, regardless of archive timestamps or order. */
function contentHash(entries: TreeEntry[]): string {
  const h = createHash("sha1");
  for (const e of [...entries].sort((a, b) => a.path.localeCompare(b.path))) h.update(`${e.path}\0${e.sha}\n`);
  return h.digest("hex");
}

function findingId(hash: string, f: { detector: string; path: string; startLine: number; endLine: number }): string {
  return `ev_${createHash("sha256").update(`${ANALYSIS_VERSION}|${hash}|${f.detector}|${f.path}|${f.startLine}-${f.endLine}`).digest("hex").slice(0, 16)}`;
}

function primaryLanguage(paths: string[]): string | null {
  const counts = new Map<string, number>();
  for (const p of paths) {
    const lang = LANGUAGE_BY_EXT[p.slice(p.lastIndexOf(".") + 1).toLowerCase()];
    if (lang) counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

function languagesIn(paths: string[]): string[] {
  return [...new Set(paths.map((p) => LANGUAGE_BY_EXT[p.slice(p.lastIndexOf(".") + 1).toLowerCase()]).filter((l): l is string => !!l))].sort();
}

/**
 * Analyzes an uploaded project archive entirely in memory. Nothing from the
 * archive is executed or written to disk; only the manifest and the cited
 * excerpts of published findings leave this function.
 */
export function analyzeUpload(buf: Uint8Array, input: { ownerId: string; name: string }): UploadAnalysis {
  const slug = uploadSlug(input.name);
  if (!slug) return { ok: false, error: { ok: false, code: "invalid_name", message: "Give the project a name of at least two letters or numbers." } };
  const archive = readProjectArchive(buf);
  if (archive.ok === false) return { ok: false, error: archive };

  const entries: TreeEntry[] = [...archive.contents.entries()].map(([path, data]) => ({
    path,
    type: "blob",
    mode: "100644",
    size: data.length,
    sha: gitBlobSha(data),
  }));
  const hash = contentHash(entries);
  const archiveSkipped: SkippedFile[] = archive.excluded.map((e) => ({
    path: e.path,
    reason: e.reason === "possible_secret" ? "possible_secret" : e.reason === "nested_archive" ? "binary" : "vendored_or_generated",
  }));
  const { selected, skipped } = selectFiles(entries, UPLOAD_LIMITS);

  const files = new Map<string, string>();
  const readSkipped: SkippedFile[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (const entry of selected) {
    const data = archive.contents.get(entry.path);
    if (!data) continue;
    let text: string;
    try {
      text = decoder.decode(data);
    } catch {
      readSkipped.push({ path: entry.path, reason: "binary" });
      continue;
    }
    if (text.includes("\u0000")) {
      readSkipped.push({ path: entry.path, reason: "binary" });
      continue;
    }
    files.set(entry.path, redactSecrets(text));
  }
  const allSkipped = [...archiveSkipped, ...skipped, ...readSkipped];

  const preview: UploadPreview = {
    name: slug,
    contentHash: hash,
    totalFiles: entries.length + archiveSkipped.length,
    selectedFiles: selected.filter((e) => files.has(e.path)).map((e) => ({ path: e.path, size: e.size ?? 0 })),
    skipped: allSkipped,
    limits: UPLOAD_LIMITS,
  };

  const { findings, rejected, checks } = analyzeFiles(files, {
    idFor: (draft) => findingId(hash, draft),
    sourceUrl: () => "",
  });

  const manifest: ManifestEntry[] = [
    ...selected.filter((e) => files.has(e.path)).map((e) => ({ path: e.path, size: e.size ?? null, blobSha: e.sha ?? null, included: true })),
    ...allSkipped.map((s) => {
      const t = entries.find((e) => e.path === s.path);
      return { path: s.path, size: t?.size ?? null, blobSha: t?.sha ?? null, included: false, reason: s.reason };
    }),
  ].slice(0, MANIFEST_MAX_ENTRIES);

  const notices = [UPLOAD_NOTICE];
  if (checks.untrustedInstructions.length) notices.push("Some documentation addresses an automated reviewer. Fydell recorded it and did not follow it.");
  if (findings.length === 0) notices.push("No supported patterns were found in the analyzed files. This does not mean the work lacks quality.");

  const analyzedBytes = [...files.values()].reduce((n, t) => n + Buffer.byteLength(t, "utf8"), 0);
  const result: ExtractionResult = {
    analysisVersion: ANALYSIS_VERSION,
    status: "complete",
    repository: {
      id: uploadRepoId(input.ownerId, slug),
      fullName: `${UPLOAD_REPO_PREFIX}${slug}`,
      htmlUrl: "",
      defaultBranch: "upload",
      fork: false,
      archived: false,
      primaryLanguage: primaryLanguage([...files.keys()]),
      sizeKb: Math.ceil(archive.uncompressedBytes / 1024),
    },
    commitSha: hash,
    revisionRef: "upload",
    manifest,
    coverage: {
      totalFiles: preview.totalFiles,
      analyzedFiles: files.size,
      analyzedBytes,
      languages: languagesIn([...files.keys()]),
      treeTruncated: false,
      skipped: allSkipped,
    },
    findings,
    rejectedFindings: rejected,
    roleSuggestions: suggestRoles(findings),
    notices,
    error: null,
    checks,
    contributionSignals: {
      login: null,
      repositoryOwner: "",
      ownerMatchesLogin: false,
      fork: false,
      checked: "upload_no_history",
      paths: [],
      checkedAt: new Date(0).toISOString(),
    },
  };
  return { ok: true, preview, result };
}
