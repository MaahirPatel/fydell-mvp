import { createHash, timingSafeEqual } from "node:crypto";

/**
 * File-snapshot validation + server receipt (W4).
 *
 * Pure module - no `server-only`, no Supabase - so it is unit-testable
 * in-process. The submit route uses it before calling the atomic
 * `submit_session_atomic` RPC.
 *
 * Integrity model (stated precisely, no overclaim):
 * - The client sends the full file contents plus a per-file SHA-256 manifest.
 * - The server recomputes every hash and rejects any mismatch: the stored
 *   snapshot is provably the exact bytes the client sent (no transport
 *   corruption, no client/server hash disagreement).
 * - The server then computes the receipt hash itself over the canonical
 *   encoding. The client cannot forge or influence the receipt beyond
 *   choosing the file bytes.
 * - What this does NOT prove: who typed the bytes, or that the bytes were
 *   produced without AI assistance. The receipt is tamper-evidence for the
 *   artifact, not authorship proof.
 */

export const MAX_SNAPSHOT_FILES = 500;
export const MAX_SNAPSHOT_TOTAL_BYTES = 5 * 1024 * 1024; // 5 MiB
export const MAX_SNAPSHOT_FILE_BYTES = 1 * 1024 * 1024; // 1 MiB per file
export const MAX_SNAPSHOT_PATH_LENGTH = 256;
export const MAX_SNAPSHOT_PATH_SEGMENT_LENGTH = 128;

export interface FileSnapshotInput {
  scenarioId: string;
  scenarioVersion: string;
  files: Record<string, string>;
  manifest: Record<string, string>;
}

function isRecord(v: unknown): v is Record<string, string> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => typeof x === "string")
  );
}

export function isValidFileSnapshotShape(v: unknown): v is FileSnapshotInput {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.scenarioId === "string" &&
    s.scenarioId.length > 0 &&
    typeof s.scenarioVersion === "string" &&
    s.scenarioVersion.length > 0 &&
    isRecord(s.files) &&
    isRecord(s.manifest)
  );
}

function hashesEqual(aHex: string, bHex: string): boolean {
  let a: Buffer;
  let b: Buffer;
  try {
    a = Buffer.from(aHex, "hex");
    b = Buffer.from(bHex, "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Path + content safety (UP-04 / UP-07)
// ---------------------------------------------------------------------------

export type SnapshotIssueCode =
  | "SCENARIO_MISMATCH"
  | "VERSION_MISMATCH"
  | "EMPTY_SNAPSHOT"
  | "TOO_MANY_FILES"
  | "MANIFEST_INCONSISTENT"
  | "MANIFEST_DIGEST_INVALID"
  | "PATH_UNSAFE"
  | "DUPLICATE_PATH"
  | "FILE_TOO_LARGE"
  | "TOTAL_TOO_LARGE"
  | "HASH_MISMATCH"
  | "CONTENT_UNSAFE";

export interface SnapshotIssue {
  code: SnapshotIssueCode;
  /** Human-readable, actionable, secret-free. May name the offending path. */
  message: string;
  /** The offending raw path, if any (sanitize before rendering). */
  path?: string;
}

/**
 * Returns a reason string when a snapshot path is unsafe, or null when it is
 * safe. A safe path is relative, slash-separated, free of control characters
 * and NUL bytes, and has no `.` / `..` / empty segments.
 */
export function unsafeSnapshotPathReason(p: string): string | null {
  if (typeof p !== "string" || p.length === 0) return "empty path";
  if (p.length > MAX_SNAPSHOT_PATH_LENGTH) {
    return `path too long (${p.length} > ${MAX_SNAPSHOT_PATH_LENGTH} chars)`;
  }
  if (p.includes("\0")) return "NUL byte in path";
  if (p.startsWith("/")) return "absolute path";
  if (p.includes("\\")) return "backslash in path";
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(p)) return "control character in path";
  const segments = p.split("/");
  for (const s of segments) {
    if (s.length === 0) return "empty path segment";
    if (s === "." || s === "..") return `reserved segment ${JSON.stringify(s)}`;
    if (s.length > MAX_SNAPSHOT_PATH_SEGMENT_LENGTH) {
      return `path segment too long (>${MAX_SNAPSHOT_PATH_SEGMENT_LENGTH} chars)`;
    }
  }
  return null;
}

/**
 * Finds two paths that differ only by case (they would collide on
 * case-insensitive filesystems). Returns the pair, or null.
 */
export function findCaseInsensitiveDuplicate(paths: string[]): [string, string] | null {
  const seen = new Map<string, string>();
  for (const p of paths) {
    const key = p.toLowerCase();
    const prev = seen.get(key);
    if (prev !== undefined && prev !== p) return [prev, p];
    seen.set(key, p);
  }
  return null;
}

/**
 * Structured snapshot validation. Returns every issue found (deterministic
 * order); an empty array means the snapshot is accepted. `validateFileSnapshot`
 * throws on the first issue for the legacy call sites.
 */
export function collectSnapshotIssues(
  snapshot: FileSnapshotInput,
  expectedScenarioId: string,
  expectedScenarioVersion: string
): SnapshotIssue[] {
  const issues: SnapshotIssue[] = [];
  const fail = (code: SnapshotIssueCode, message: string, path?: string) => {
    issues.push(path === undefined ? { code, message } : { code, message, path });
  };

  if (snapshot.scenarioId !== expectedScenarioId) {
    fail(
      "SCENARIO_MISMATCH",
      `File snapshot is for scenario ${JSON.stringify(snapshot.scenarioId)}, expected ${JSON.stringify(expectedScenarioId)}`
    );
    return issues;
  }
  if (snapshot.scenarioVersion !== expectedScenarioVersion) {
    fail(
      "VERSION_MISMATCH",
      `File snapshot pins scenario version ${JSON.stringify(snapshot.scenarioVersion)}, session is pinned to ${JSON.stringify(expectedScenarioVersion)}`
    );
    return issues;
  }

  const filePaths = Object.keys(snapshot.files);
  const manifestPaths = Object.keys(snapshot.manifest);

  if (filePaths.length === 0) {
    fail("EMPTY_SNAPSHOT", "File snapshot contains no files");
    return issues;
  }
  if (filePaths.length > MAX_SNAPSHOT_FILES) {
    fail("TOO_MANY_FILES", `File snapshot has ${filePaths.length} files (max ${MAX_SNAPSHOT_FILES})`);
    return issues;
  }

  const missing = manifestPaths.filter((p) => !(p in snapshot.files));
  if (missing.length > 0) {
    fail(
      "MANIFEST_INCONSISTENT",
      `Manifest lists files with no contents: ${missing.slice(0, 5).map(sanitizeDisplayPath).join(", ")}`
    );
    return issues;
  }
  const extra = filePaths.filter((p) => !(p in snapshot.manifest));
  if (extra.length > 0) {
    fail(
      "MANIFEST_INCONSISTENT",
      `Files have no manifest entry: ${extra.slice(0, 5).map(sanitizeDisplayPath).join(", ")}`
    );
    return issues;
  }
  for (const p of manifestPaths) {
    if (!/^[0-9a-f]{64}$/.test(snapshot.manifest[p])) {
      fail("MANIFEST_DIGEST_INVALID", `Manifest entry for ${sanitizeDisplayPath(p)} is not a SHA-256 hex digest`, p);
      return issues;
    }
  }

  for (const p of filePaths) {
    const reason = unsafeSnapshotPathReason(p);
    if (reason !== null) {
      fail("PATH_UNSAFE", `Unsafe file path ${JSON.stringify(sanitizeDisplayPath(p))}: ${reason}`, p);
      return issues;
    }
  }
  const dup = findCaseInsensitiveDuplicate(filePaths);
  if (dup) {
    fail(
      "DUPLICATE_PATH",
      `Duplicate file path (differs only by case): ${JSON.stringify(sanitizeDisplayPath(dup[0]))} vs ${JSON.stringify(sanitizeDisplayPath(dup[1]))}`,
      dup[1]
    );
    return issues;
  }

  let totalBytes = 0;
  for (const p of filePaths) {
    const content = snapshot.files[p];
    if (content.includes("\0")) {
      fail("CONTENT_UNSAFE", `File ${JSON.stringify(sanitizeDisplayPath(p))} contains NUL bytes`, p);
      return issues;
    }
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > MAX_SNAPSHOT_FILE_BYTES) {
      fail("FILE_TOO_LARGE", `File ${JSON.stringify(sanitizeDisplayPath(p))} is ${bytes} bytes (max ${MAX_SNAPSHOT_FILE_BYTES})`, p);
      return issues;
    }
    totalBytes += bytes;
    if (totalBytes > MAX_SNAPSHOT_TOTAL_BYTES) {
      fail("TOTAL_TOO_LARGE", `File snapshot exceeds ${MAX_SNAPSHOT_TOTAL_BYTES} bytes total`);
      return issues;
    }
    const actual = createHash("sha256").update(content, "utf8").digest("hex");
    if (!hashesEqual(actual, snapshot.manifest[p])) {
      fail(
        "HASH_MISMATCH",
        `Hash mismatch for ${JSON.stringify(sanitizeDisplayPath(p))}: manifest does not match file contents (snapshot rejected, nothing stored)`,
        p
      );
      return issues;
    }
  }
  return issues;
}

/**
 * Make a raw snapshot path safe to display. Strips control characters and
 * truncates; the result is plain text - render it as a text node. For HTML
 * string contexts, pass the result through `escapeHtml`.
 */
export function sanitizeDisplayPath(p: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = String(p).replace(/[\x00-\x1f\x7f]/g, "").slice(0, 120);
  return cleaned.length > 0 ? cleaned : "(unnamed file)";
}

/** Escape a string for interpolation into an HTML string context. */
export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/**
 * Validate a client-supplied file snapshot against the pinned scenario
 * version. Throws a descriptive Error on the first problem found.
 *
 * Path safety (UP-04/UP-07): every path in the snapshot must be a relative,
 * slash-separated, control-character-free path. Rejected: traversal (`..`),
 * absolute paths, backslashes, NUL bytes, empty segments, overlong paths.
 * Symlinks: the JSON snapshot format carries no file-type metadata, so a
 * symlink cannot be represented or created from a snapshot - extraction must
 * create regular files only. Paths that collide case-insensitively are
 * treated as duplicates (they would collide on case-insensitive filesystems).
 *
 * Content safety (UP-07): NUL bytes in file contents are rejected - no
 * downstream renderer or extractor has to cope with them. Contents are never
 * executed, evaluated, or written to the app host filesystem; they are stored
 * as opaque bytes in the submission row.
 */
export function validateFileSnapshot(
  snapshot: FileSnapshotInput,
  expectedScenarioId: string,
  expectedScenarioVersion: string
): void {
  const issues = collectSnapshotIssues(snapshot, expectedScenarioId, expectedScenarioVersion);
  if (issues.length > 0) throw new Error(issues[0].message);
}

/**
 * Pure assembly of the submission snapshot JSON. The file snapshot and the
 * server-computed receipt hash ride inside the single `sim_submissions.snapshot`
 * jsonb row, so the file set is stored atomically with the submission.
 */
export function buildSubmissionSnapshot(args: {
  deliverable: unknown;
  notes: unknown;
  workspace: unknown;
  completedTaskIds: unknown;
  messageCount: number;
  submittedRevision: number;
  fileSnapshot: {
    scenarioId: string;
    scenarioVersion: string;
    files: Record<string, string>;
    manifest: Record<string, string>;
  };
  receiptHash: string;
}): Record<string, unknown> {
  return {
    deliverable: args.deliverable,
    notes: args.notes,
    workspace: args.workspace,
    completedTaskIds: args.completedTaskIds,
    messageCount: args.messageCount,
    submittedRevision: args.submittedRevision,
    fileSnapshot: args.fileSnapshot,
    receiptHash: args.receiptHash,
  };
}

/**
 * Canonical server-computed receipt hash. Deterministic: same inputs always
 * produce the same receipt; any byte change in any file changes the receipt.
 */
export function computeReceiptHash(
  sessionId: string,
  scenarioId: string,
  scenarioVersion: string,
  manifest: Record<string, string>
): string {
  const h = createHash("sha256");
  const feed = (s: string) => {
    h.update(s, "utf8");
    h.update("\0", "utf8");
  };
  feed("fydell-file-snapshot-receipt-v1");
  feed(sessionId);
  feed(scenarioId);
  feed(scenarioVersion);
  for (const path of Object.keys(manifest).sort()) {
    feed(path);
    feed(manifest[path]);
  }
  return h.digest("hex");
}
