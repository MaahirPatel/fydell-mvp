import "server-only";
import { createHash } from "crypto";
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import type { PackageFile } from "../authoring/package";

/** Fixed timestamp so the same files always produce the same bytes and hash. */
const FIXED_MTIME = new Date("2026-01-01T00:00:00Z");

export function zipFiles(files: PackageFile[]): Uint8Array {
  const entries: Zippable = {};
  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) entries[f.path] = [strToU8(f.content), { mtime: FIXED_MTIME }];
  return zipSync(entries, { level: 6, mtime: FIXED_MTIME });
}

export function unzipFiles(bytes: Uint8Array): PackageFile[] {
  const out = unzipSync(bytes);
  return Object.entries(out)
    .filter(([path]) => !path.endsWith("/"))
    .map(([path, data]) => ({ path, content: strFromU8(data) }));
}

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Order-independent fingerprint of a file set, used to label public test runs. */
export function filesFingerprint(files: PackageFile[]): string {
  const h = createHash("sha256");
  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) h.update(`${f.path}\u0000${f.content}\u0000`);
  return h.digest("hex");
}
