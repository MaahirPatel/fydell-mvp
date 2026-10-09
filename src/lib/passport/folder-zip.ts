import { zipSync } from "fflate";
import { selectFiles } from "./github/select";
import { UPLOAD_LIMITS, type SkipReason, type TreeEntry } from "./github/types";

const MAX_ARCHIVE_BYTES = 5 * 1024 * 1024;

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "dist", "build", "out", ".next", ".nuxt", ".turbo", ".cache", ".parcel-cache",
  "coverage", "venv", ".venv", "env", "__pycache__", ".pytest_cache", ".mypy_cache", "target", "vendor", ".idea",
  ".vscode", ".cursor", "bin", "obj", "Pods", ".gradle", "DerivedData", ".terraform", ".vercel", ".expo",
]);

const SECRET_FILE = /^(\.env(\..*)?|.*\.(pem|key|p12|pfx|keystore|jks)|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?|\.npmrc|\.pypirc|\.netrc|credentials(\.json)?)$/i;

export type FolderSkipReason = "dependency_or_build" | "possible_secret" | "not_source" | "over_limit";

export type FolderZip =
  | { ok: true; file: File; name: string; included: number; skipped: Record<FolderSkipReason, number> }
  | { ok: false; error: string };

function relativePath(file: File): string {
  const raw = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
  return raw.replace(/\\/g, "/");
}

function bucket(reason: SkipReason): FolderSkipReason {
  if (reason === "vendored_or_generated") return "dependency_or_build";
  if (reason === "possible_secret") return "possible_secret";
  if (reason === "file_limit" || reason === "byte_limit") return "over_limit";
  return "not_source";
}

/**
 * Packs a picked project folder in the browser with the same file selection
 * the server analyzes, so what is uploaded is what is read. Dependency
 * folders and credential files never leave the machine.
 */
export async function zipFolder(files: readonly File[]): Promise<FolderZip> {
  if (files.length === 0) return { ok: false, error: "That folder is empty." };
  const first = relativePath(files[0]);
  const root = first.includes("/") ? first.split("/")[0] : "";
  const skipped: Record<FolderSkipReason, number> = { dependency_or_build: 0, possible_secret: 0, not_source: 0, over_limit: 0 };

  const byPath = new Map<string, File>();
  for (const file of files) {
    const full = relativePath(file);
    const path = root && full.startsWith(`${root}/`) ? full.slice(root.length + 1) : full;
    const parts = path.split("/");
    if (parts.slice(0, -1).some((p) => SKIP_DIRS.has(p))) skipped.dependency_or_build++;
    else if (SECRET_FILE.test(parts[parts.length - 1] ?? "")) skipped.possible_secret++;
    else byPath.set(path, file);
  }

  const entries: TreeEntry[] = [...byPath].map(([path, file]) => ({ path, type: "blob", mode: "100644", size: file.size }));
  const selection = selectFiles(entries, UPLOAD_LIMITS);
  for (const s of selection.skipped) skipped[bucket(s.reason)]++;
  if (selection.selected.length === 0) {
    return { ok: false, error: "No source files were found after leaving out dependency folders, build output and credentials." };
  }

  const packed: Record<string, Uint8Array> = {};
  for (const entry of selection.selected) {
    const file = byPath.get(entry.path);
    if (file) packed[entry.path] = new Uint8Array(await file.arrayBuffer());
  }
  const zipped = zipSync(packed, { level: 6 });
  if (zipped.byteLength > MAX_ARCHIVE_BYTES) {
    return { ok: false, error: "Even without dependency and build folders this project is over 5 MB once packed. Choose a smaller folder, such as src." };
  }
  const name = root || "project";
  const body = new ArrayBuffer(zipped.byteLength);
  new Uint8Array(body).set(zipped);
  return { ok: true, file: new File([body], `${name}.zip`, { type: "application/zip" }), name, included: selection.selected.length, skipped };
}
