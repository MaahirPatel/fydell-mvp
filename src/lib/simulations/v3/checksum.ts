/**
 * Content hashing for resource bundles.
 *
 * Kept apart from `resources.ts` because this reaches for `node:crypto` and
 * `resources.ts` has to stay importable from the browser. Checksums are
 * computed when a bundle is authored, declared in the bundle, and verified by
 * a test and again when an attempt starts. Nothing recomputes a checksum at
 * read time and trusts the result: that would defeat the point.
 */

import { createHash } from "node:crypto";
import type { ResourceBundle, ResourceFile } from "./resources";

/**
 * Deterministic serialisation. `JSON.stringify` preserves insertion order, so
 * two files with identical content but differently ordered keys would hash
 * differently. Sorting object keys makes the hash depend on content alone.
 * Array order is meaningful and is preserved.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
}

export function checksumFile(file: ResourceFile): string {
  return createHash("sha256").update(canonicalize(file), "utf8").digest("hex");
}

/** Recomputes every file hash. Used when authoring and by the fixture test. */
export function computeChecksums(files: ResourceFile[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of files) out[file.fileId] = checksumFile(file);
  return out;
}

export interface ChecksumMismatch {
  fileId: string;
  declared: string | undefined;
  actual: string;
}

/**
 * Compares declared checksums against the current content. A non-empty result
 * means a resource changed without its bundle being republished, which
 * invalidates every evidence reference taken against the old content.
 */
export function verifyChecksums(bundle: ResourceBundle): ChecksumMismatch[] {
  const mismatches: ChecksumMismatch[] = [];
  for (const file of bundle.files) {
    const actual = checksumFile(file);
    if (bundle.checksums[file.fileId] !== actual) {
      mismatches.push({ fileId: file.fileId, declared: bundle.checksums[file.fileId], actual });
    }
  }
  return mismatches;
}
