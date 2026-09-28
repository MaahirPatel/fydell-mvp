/**
 * AI-02 — Review the correct inputs.
 *
 * The reviewer analyzes exactly: the pinned starter/submission diff, the
 * necessary surrounding code, the actual tests, scenario events, and the
 * transcript. Every input is pinned by hash. Anything omitted or truncated is
 * tracked explicitly on the bundle — the report must disclose what the
 * reviewer did NOT see.
 */

import { createHash } from "crypto";

export type InputRole =
  | "starter"
  | "submission"
  | "test"
  | "event"
  | "transcript"
  | "surrounding";

export interface PinnedFile {
  path: string;
  role: InputRole;
  sha256: string;
  bytes: number;
  /** True when content was cut at the byte cap — the reviewer saw a prefix. */
  truncated: boolean;
  content: string;
}

export interface Omission {
  path: string;
  role: InputRole;
  reason: string;
}

export interface Truncation {
  path: string;
  keptBytes: number;
  totalBytes: number;
}

export interface InputBundle {
  bundleHash: string;
  createdAt: string;
  files: PinnedFile[];
  /** Files excluded by policy (credentials, dependencies, unrelated paths). */
  omitted: Omission[];
  /** Files cut at the cap. */
  truncated: Truncation[];
  /** Unified-diff-ish summary of starter vs submission for submission files. */
  diffSummary: string;
}

export interface BundleFileInput {
  path: string;
  role: InputRole;
  content: string;
}

export const MAX_BUNDLE_FILE_BYTES = 100_000;

/** Paths that are never review inputs: secrets, dependencies, binaries. */
const EXCLUDED_PATH_RE =
  /(^|\/)\.(git|env)\b|\.env(\.|$)|(^|\/)node_modules\//i;

const SECRET_NAME_RE = /(credential|secret|token|passwd|\.pem$|\.key$)/i;

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function isExcluded(path: string, role: InputRole): string | null {
  if (role === "submission" || role === "surrounding" || role === "starter") {
    if (EXCLUDED_PATH_RE.test(path)) return "excluded by path policy (vcs metadata, env files, dependencies)";
    if (SECRET_NAME_RE.test(path)) return "excluded: filename suggests credentials";
  }
  return null;
}

/** Build a pinned, disclosure-complete input bundle. */
export function buildInputBundle(inputs: BundleFileInput[]): InputBundle {
  const files: PinnedFile[] = [];
  const omitted: Omission[] = [];
  const truncated: Truncation[] = [];

  for (const input of inputs) {
    const excluded = isExcluded(input.path, input.role);
    if (excluded) {
      omitted.push({ path: input.path, role: input.role, reason: excluded });
      continue;
    }
    const totalBytes = Buffer.byteLength(input.content, "utf8");
    const wasTruncated = totalBytes > MAX_BUNDLE_FILE_BYTES;
    const content = wasTruncated
      ? Buffer.from(input.content, "utf8").slice(0, MAX_BUNDLE_FILE_BYTES).toString("utf8")
      : input.content;
    if (wasTruncated) {
      truncated.push({ path: input.path, keptBytes: MAX_BUNDLE_FILE_BYTES, totalBytes });
    }
    files.push({
      path: input.path,
      role: input.role,
      sha256: sha256Hex(content),
      bytes: Buffer.byteLength(content, "utf8"),
      truncated: wasTruncated,
      content,
    });
  }

  // Starter vs submission diff summary (line counts only — the full contents
  // are pinned above; the summary is for the reviewer prompt).
  const starterLines = new Set(
    files.filter((f) => f.role === "starter").flatMap((f) => f.content.split("\n")),
  );
  const submissionLines = files.filter((f) => f.role === "submission").flatMap((f) => f.content.split("\n"));
  const added = submissionLines.filter((l) => l.trim() !== "" && !starterLines.has(l)).length;
  const diffSummary =
    `starter files: ${files.filter((f) => f.role === "starter").length}, ` +
    `submission files: ${files.filter((f) => f.role === "submission").length}, ` +
    `non-blank added lines vs starter: ${added}, ` +
    `omitted: ${omitted.length}, truncated: ${truncated.length}`;

  const bundleHash = sha256Hex(
    files.map((f) => `${f.role}:${f.path}:${f.sha256}`).sort().join("\n"),
  );

  return {
    bundleHash,
    createdAt: new Date().toISOString(),
    files,
    omitted,
    truncated,
    diffSummary,
  };
}
