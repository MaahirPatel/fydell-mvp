import { createHash, timingSafeEqual } from "node:crypto";

/**
 * File-snapshot validation + server receipt (W4).
 *
 * Pure module — no `server-only`, no Supabase — so it is unit-testable
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

/**
 * Validate a client-supplied file snapshot against the pinned scenario
 * version. Throws a descriptive Error on the first problem found.
 */
export function validateFileSnapshot(
  snapshot: FileSnapshotInput,
  expectedScenarioId: string,
  expectedScenarioVersion: string
): void {
  if (snapshot.scenarioId !== expectedScenarioId) {
    throw new Error(
      `File snapshot is for scenario ${JSON.stringify(snapshot.scenarioId)}, expected ${JSON.stringify(expectedScenarioId)}`
    );
  }
  if (snapshot.scenarioVersion !== expectedScenarioVersion) {
    throw new Error(
      `File snapshot pins scenario version ${JSON.stringify(snapshot.scenarioVersion)}, session is pinned to ${JSON.stringify(expectedScenarioVersion)}`
    );
  }

  const filePaths = Object.keys(snapshot.files);
  const manifestPaths = Object.keys(snapshot.manifest);

  if (filePaths.length === 0) throw new Error("File snapshot contains no files");
  if (filePaths.length > MAX_SNAPSHOT_FILES) {
    throw new Error(`File snapshot has ${filePaths.length} files (max ${MAX_SNAPSHOT_FILES})`);
  }
  const missing = manifestPaths.filter((p) => !(p in snapshot.files));
  if (missing.length > 0) {
    throw new Error(`Manifest lists files with no contents: ${missing.slice(0, 5).join(", ")}`);
  }
  const extra = filePaths.filter((p) => !(p in snapshot.manifest));
  if (extra.length > 0) {
    throw new Error(`Files have no manifest entry: ${extra.slice(0, 5).join(", ")}`);
  }
  for (const p of manifestPaths) {
    if (!/^[0-9a-f]{64}$/.test(snapshot.manifest[p])) {
      throw new Error(`Manifest entry for ${p} is not a SHA-256 hex digest`);
    }
  }

  let totalBytes = 0;
  for (const p of filePaths) {
    const content = snapshot.files[p];
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > MAX_SNAPSHOT_FILE_BYTES) {
      throw new Error(`File ${p} is ${bytes} bytes (max ${MAX_SNAPSHOT_FILE_BYTES})`);
    }
    totalBytes += bytes;
    if (totalBytes > MAX_SNAPSHOT_TOTAL_BYTES) {
      throw new Error(`File snapshot exceeds ${MAX_SNAPSHOT_TOTAL_BYTES} bytes total`);
    }
    const actual = createHash("sha256").update(content, "utf8").digest("hex");
    if (!hashesEqual(actual, snapshot.manifest[p])) {
      throw new Error(
        `Hash mismatch for ${p}: manifest does not match file contents (snapshot rejected, nothing stored)`
      );
    }
  }
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
