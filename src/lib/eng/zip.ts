import { inflateSync } from "fflate";

/**
 * Archive inspection for candidate submissions. The central directory is read
 * and every limit is enforced before a single byte is inflated, then each
 * inflated entry is checked against its declared size and CRC. Nothing is
 * written to disk and nothing is executed here.
 */
export const ZIP_LIMITS = {
  maxArchiveBytes: 5 * 1024 * 1024,
  maxEntries: 2000,
  maxEvaluatedFiles: 300,
  maxFileBytes: 1024 * 1024,
  maxTotalUncompressedBytes: 20 * 1024 * 1024,
  maxRatio: 200,
  maxPathLength: 240,
} as const;

export type ZipRejectionCode =
  | "not_a_zip"
  | "unsupported_archive"
  | "too_large"
  | "too_many_entries"
  | "encrypted_entry"
  | "unsafe_path"
  | "symlink"
  | "duplicate_name"
  | "nested_archive"
  | "credential_file"
  | "compression_ratio"
  | "file_too_large"
  | "corrupt_entry"
  | "missing_manifest"
  | "wrong_scenario"
  | "missing_source";

export interface ZipRejection {
  ok: false;
  code: ZipRejectionCode;
  message: string;
  path?: string;
}

export interface ZipAccepted {
  ok: true;
  prefix: string;
  entryCount: number;
  uncompressedBytes: number;
  files: { path: string; size: number }[];
  ignored: string[];
  contents: Map<string, Uint8Array>;
}

const IGNORED_SEGMENTS = new Set([
  "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".git", ".idea", ".vscode",
  ".venv", "venv", "env", "node_modules", "__MACOSX", "dist", "build", ".tox", ".eggs",
]);
const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
const NESTED_ARCHIVE = /\.(zip|tar|gz|tgz|bz2|xz|7z|rar|jar|whl|egg)$/i;
const CREDENTIAL = /(^|\/)(\.env(\.(?!example$|sample$|template$)[^/]+)?|id_rsa|id_ed25519|[^/]+\.pem|[^/]+\.p12|[^/]+\.pfx|credentials\.json)$/i;

function reject(code: ZipRejectionCode, message: string, path?: string): ZipRejection {
  return { ok: false, code, message, path };
}

let CRC_TABLE: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

interface CentralEntry {
  name: string;
  flags: number;
  method: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
  isDirectory: boolean;
  isSymlink: boolean;
}

function decodeName(raw: Uint8Array, utf8: boolean): string | null {
  try {
    return utf8 ? new TextDecoder("utf-8", { fatal: true }).decode(raw) : new TextDecoder("latin1").decode(raw);
  } catch {
    return null;
  }
}

function safePath(name: string): string | null {
  const normalized = name.replace(/\\/g, "/");
  if (normalized.length === 0 || normalized.length > ZIP_LIMITS.maxPathLength) return null;
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return null;
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return null;
  const parts = normalized.split("/");
  const trailing = parts[parts.length - 1] === "";
  const body = trailing ? parts.slice(0, -1) : parts;
  if (body.some((part) => part === ".." || part === "." || part === "")) return null;
  return normalized;
}

function readCentralDirectory(buf: Uint8Array): CentralEntry[] | ZipRejection {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length < 22 || view.getUint32(0, true) !== 0x04034b50) {
    return reject("not_a_zip", "This file is not a ZIP archive. Create a .zip of the project folder and try again.");
  }
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return reject("not_a_zip", "The ZIP file is incomplete or damaged. Create it again and re-upload.");
  const total = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (total === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    return reject("unsupported_archive", "ZIP64 archives are not supported. The project is small enough for a standard ZIP.");
  }
  if (total > ZIP_LIMITS.maxEntries) {
    return reject("too_many_entries", `The archive has ${total} entries; the limit is ${ZIP_LIMITS.maxEntries}. Leave out virtual environments and dependency folders.`);
  }
  if (cdOffset + cdSize > eocd) return reject("not_a_zip", "The ZIP file is damaged. Create it again and re-upload.");

  const entries: CentralEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    if (p + 46 > buf.length || view.getUint32(p, true) !== 0x02014b50) {
      return reject("not_a_zip", "The ZIP file is damaged. Create it again and re-upload.");
    }
    const madeBy = view.getUint16(p + 4, true);
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    const crc = view.getUint32(p + 16, true);
    const compressedSize = view.getUint32(p + 20, true);
    const uncompressedSize = view.getUint32(p + 24, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const externalAttrs = view.getUint32(p + 38, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decodeName(buf.subarray(p + 46, p + 46 + nameLen), (flags & 0x800) !== 0);
    if (name === null) return reject("unsafe_path", "A file name in the archive is not valid text. Rename it and re-create the ZIP.");
    const host = madeBy >> 8;
    const mode = (externalAttrs >>> 16) & 0o170000;
    entries.push({
      name,
      flags,
      method,
      crc,
      compressedSize,
      uncompressedSize,
      localOffset,
      isDirectory: name.endsWith("/") || name.endsWith("\\"),
      isSymlink: host === 3 && mode === 0o120000,
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function isIgnored(path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  if (parts.some((part) => IGNORED_SEGMENTS.has(part))) return true;
  return IGNORED_FILES.has(parts[parts.length - 1] ?? "");
}

export function inspectArchive(buf: Uint8Array, expectedScenarioKey: string): ZipAccepted | ZipRejection {
  if (buf.length > ZIP_LIMITS.maxArchiveBytes) {
    return reject("too_large", "The archive is larger than 5 MB. Leave out virtual environments, caches and build output.");
  }
  const central = readCentralDirectory(buf);
  if (!Array.isArray(central)) return central;

  let declaredTotal = 0;
  const seen = new Set<string>();
  const candidates: (CentralEntry & { path: string })[] = [];
  const ignored: string[] = [];
  for (const entry of central) {
    const path = safePath(entry.name);
    if (!path) return reject("unsafe_path", "The archive contains a path that points outside the project folder. Re-create the ZIP from the project folder itself.", entry.name.slice(0, 200));
    if (entry.flags & 0x1) return reject("encrypted_entry", "Password-protected ZIP files are not accepted. Create the ZIP without a password.", path);
    if (entry.isSymlink) return reject("symlink", "Symbolic links are not accepted. Replace the link with the real file or remove it.", path);
    const key = path.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) return reject("duplicate_name", "Two files in the archive have the same name (ignoring letter case). Rename one and re-create the ZIP.", path);
    seen.add(key);
    declaredTotal += entry.uncompressedSize;
    if (declaredTotal > ZIP_LIMITS.maxTotalUncompressedBytes) {
      return reject("too_large", "The archive expands to more than 20 MB. Leave out virtual environments, caches and build output.");
    }
    if (entry.isDirectory) continue;
    if (isIgnored(path)) {
      ignored.push(path);
      continue;
    }
    if (CREDENTIAL.test(path)) return reject("credential_file", "The archive contains a credentials file. Remove it (keep .env.example if you need one) and re-create the ZIP.", path);
    if (NESTED_ARCHIVE.test(path)) return reject("nested_archive", "Archives inside the archive are not accepted. Include the files directly.", path);
    if (entry.method !== 0 && entry.method !== 8) return reject("unsupported_archive", "The archive uses an unsupported compression method. Use your system's standard ZIP tool.", path);
    if (entry.uncompressedSize > ZIP_LIMITS.maxFileBytes) return reject("file_too_large", "A single file is larger than 1 MB. Remove large data or generated files.", path);
    if (entry.uncompressedSize > 1024 * 1024 / 4 && entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > ZIP_LIMITS.maxRatio) {
      return reject("compression_ratio", "A file expands far more than normal source code does. Remove it and re-create the ZIP.", path);
    }
    candidates.push({ ...entry, path });
  }

  if (candidates.length > ZIP_LIMITS.maxEvaluatedFiles) {
    return reject("too_many_entries", `The project has ${candidates.length} files after caches are ignored; the limit is ${ZIP_LIMITS.maxEvaluatedFiles}.`);
  }

  const manifestPath = candidates.find((c) => c.path === "fydell.json" || /^[^/]+\/fydell\.json$/.test(c.path))?.path;
  if (!manifestPath) {
    return reject("missing_manifest", "fydell.json was not found at the top of the project. Zip the project folder you downloaded (the one that contains fydell.json).");
  }
  const prefix = manifestPath === "fydell.json" ? "" : manifestPath.slice(0, manifestPath.indexOf("/") + 1);
  const outside = candidates.find((c) => !c.path.startsWith(prefix));
  if (outside) return reject("unsafe_path", "The archive contains files outside the project folder. Zip only the project folder.", outside.path);

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const contents = new Map<string, Uint8Array>();
  let actualTotal = 0;
  for (const entry of candidates) {
    const lo = entry.localOffset;
    if (lo + 30 > buf.length || view.getUint32(lo, true) !== 0x04034b50) {
      return reject("corrupt_entry", "The archive is damaged. Create it again and re-upload.", entry.path);
    }
    const start = lo + 30 + view.getUint16(lo + 26, true) + view.getUint16(lo + 28, true);
    const end = start + entry.compressedSize;
    if (end > buf.length) return reject("corrupt_entry", "The archive is damaged. Create it again and re-upload.", entry.path);
    const raw = buf.subarray(start, end);
    let data: Uint8Array;
    try {
      data = entry.method === 0 ? raw.slice() : inflateSync(raw, { out: new Uint8Array(entry.uncompressedSize) });
    } catch {
      return reject("corrupt_entry", "A file in the archive could not be read. Create the ZIP again and re-upload.", entry.path);
    }
    if (data.length !== entry.uncompressedSize || crc32(data) !== entry.crc) {
      return reject("corrupt_entry", "A file in the archive does not match its recorded size or checksum. Create the ZIP again.", entry.path);
    }
    actualTotal += data.length;
    contents.set(entry.path.slice(prefix.length), data);
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(new TextDecoder().decode(contents.get("fydell.json")));
  } catch {
    return reject("missing_manifest", "fydell.json could not be read. Restore it from the starter project.");
  }
  const scenario = (manifest as { scenario?: unknown } | null)?.scenario;
  if (scenario !== expectedScenarioKey) {
    return reject("wrong_scenario", "This archive is for a different task. Upload the project you downloaded for this assessment.");
  }
  if (!contents.has("webhooks/dispatcher.py")) {
    return reject("missing_source", "webhooks/dispatcher.py is missing. Include the whole project folder.");
  }

  const files = [...contents.entries()]
    .map(([path, data]) => ({ path, size: data.length }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return { ok: true, prefix, entryCount: central.length, uncompressedBytes: actualTotal, files, ignored, contents };
}
