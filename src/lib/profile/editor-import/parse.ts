/**
 * Local editor-history importer prototype (VS Code and Cursor).
 *
 * The engineer uploads a file from their own machine - e.g. VS Code's
 * `globalStorage/state.vscdb` (SQLite), `storage.json`, or a Local History
 * `entries.json` - and we extract work-session evidence from it.
 *
 * Honesty rules for this module:
 *  - Every result carries provenance 'local-import' and a `parseMethod`
 *    string describing EXACTLY what was parsed and how. Unknown keys and
 *    unrecognized shapes are reported, never silently dropped or invented.
 *  - We do not claim to know Cursor's internal schema. Cursor is a VS Code
 *    fork, so the same SQLite/JSON shapes are scanned, but anything found
 *    through heuristics is labeled as heuristic in `parseMethod`.
 *  - The raw uploaded file is never persisted (see the API route); only the
 *    extracted summary is stored.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EditorEvidenceFile } from "../types";

export type UploadKind = "json" | "sqlite" | "unknown";

export type ParsedEditorEvidence = {
  source: "vscode" | "cursor";
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
  /** Derivation is documented in parseMethod (e.g. distinct active days). */
  sessionCount: number;
  filesTouched: EditorEvidenceFile[];
  languages: string[];
  parseMethod: string;
  warnings: string[];
  provenance: "local-import";
};

const SQLITE_MAGIC = "SQLite format 3\0";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 500;
const MAX_WALK_DEPTH = 12;

export function detectUploadKind(filename: string, buffer: Buffer): UploadKind {
  if (buffer.subarray(0, SQLITE_MAGIC.length).toString("binary") === SQLITE_MAGIC) return "sqlite";
  const lower = filename.toLowerCase();
  const head = buffer.subarray(0, 64).toString("utf8");
  // .vscdb files that are not SQLite are not something we can read.
  if (lower.endsWith(".json") || (!lower.endsWith(".vscdb") && /^\s*[[{]/.test(head))) return "json";
  return "unknown";
}

const EXTENSION_LANGUAGE: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  py: "Python", rb: "Ruby", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin", kts: "Kotlin",
  swift: "Swift", c: "C", h: "C", cc: "C++", cpp: "C++", hpp: "C++", cs: "C#",
  php: "PHP", scala: "Scala", sh: "Shell", bash: "Shell", zsh: "Shell", ps1: "PowerShell",
  sql: "SQL", html: "HTML", css: "CSS", scss: "SCSS", less: "Less", vue: "Vue", svelte: "Svelte",
  json: "JSON", yaml: "YAML", yml: "YAML", toml: "TOML", xml: "XML", md: "Markdown",
  tf: "Terraform", dockerfile: "Docker", r: "R", lua: "Lua", ex: "Elixir", exs: "Elixir",
  hs: "Haskell", clj: "Clojure", dart: "Dart", sol: "Solidity",
};

export function languageFromPath(path: string): string | null {
  const base = path.split("/").pop() ?? path;
  if (/^dockerfile(\.|$)/i.test(base)) return "Docker";
  const dot = base.lastIndexOf(".");
  if (dot < 0) return null;
  return EXTENSION_LANGUAGE[base.slice(dot + 1).toLowerCase()] ?? null;
}

function isMsEpoch(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 1_000_000_000_000 && n <= 2_000_000_000_000;
}

function toIso(ms: number): string | null {
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Decode a file:// URI to a filesystem path; null for non-file schemes. */
function fileUriToPath(uri: string): string | null {
  if (!uri.startsWith("file://")) return null;
  try {
    const withoutScheme = uri.replace(/^file:\/\/[^/]*/, "");
    return decodeURIComponent(withoutScheme) || null;
  } catch {
    return null;
  }
}

type FileAccum = { edits: number; firstMs: number | null; lastMs: number | null };

function emptyResult(source: "vscode" | "cursor", warnings: string[]): ParsedEditorEvidence {
  return {
    source,
    timeRangeStart: null,
    timeRangeEnd: null,
    sessionCount: 0,
    filesTouched: [],
    languages: [],
    parseMethod: "",
    warnings,
    provenance: "local-import",
  };
}

function finalize(
  source: "vscode" | "cursor",
  files: Map<string, FileAccum>,
  activeDays: Set<string>,
  parseMethod: string,
  warnings: string[],
): ParsedEditorEvidence {
  const sorted = [...files.entries()]
    .sort((a, b) => (b[1].lastMs ?? 0) - (a[1].lastMs ?? 0))
    .slice(0, MAX_FILES);
  const langs = new Set<string>();
  const filesTouched: EditorEvidenceFile[] = sorted.map(([path, acc]) => {
    const language = languageFromPath(path);
    if (language) langs.add(language);
    return {
      path,
      edits: acc.edits > 0 ? acc.edits : null,
      language,
      lastTouchedAt: acc.lastMs != null ? toIso(acc.lastMs) : null,
    };
  });
  const stamps = [...files.values()].map((f) => f.lastMs).filter((t): t is number => t != null);
  const starts = [...files.values()]
    .map((f) => f.firstMs ?? f.lastMs)
    .filter((t): t is number => t != null);
  return {
    source,
    timeRangeStart: starts.length ? toIso(Math.min(...starts)) : null,
    timeRangeEnd: stamps.length ? toIso(Math.max(...stamps)) : null,
    sessionCount: activeDays.size,
    filesTouched,
    languages: [...langs].sort(),
    parseMethod: `${parseMethod} Session count is the number of distinct calendar days with recorded activity.`,
    warnings,
    provenance: "local-import",
  };
}

function noteDay(activeDays: Set<string>, ms: number | null) {
  if (ms == null) return;
  const iso = toIso(ms);
  if (iso) activeDays.add(iso.slice(0, 10));
}

/**
 * Handle VS Code's `history.recentlyOpenedPathsList` shape:
 * [{ fileUri?, folderUri?, label? }, ...]
 */
function ingestRecentlyOpened(list: unknown, files: Map<string, FileAccum>, activeDays: Set<string>): number {
  if (!Array.isArray(list)) return 0;
  let count = 0;
  for (const entry of list) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const uri = typeof e.fileUri === "string" ? e.fileUri : typeof e.folderUri === "string" ? e.folderUri : null;
    const path = uri ? fileUriToPath(uri) : null;
    if (!path) continue;
    const acc = files.get(path) ?? { edits: 0, firstMs: null, lastMs: null };
    files.set(path, acc);
    count++;
  }
  void activeDays;
  return count;
}

/**
 * Handle VS Code Local History `entries.json`:
 * { resource: "file:///…", entries: [{ timestamp }] }
 */
function ingestLocalHistory(value: unknown, files: Map<string, FileAccum>, activeDays: Set<string>): number {
  if (typeof value !== "object" || value === null) return 0;
  const v = value as Record<string, unknown>;
  const path = typeof v.resource === "string" ? fileUriToPath(v.resource) : null;
  const entries = Array.isArray(v.entries) ? v.entries : null;
  if (!path || !entries) return 0;
  let edits = 0;
  let firstMs: number | null = null;
  let lastMs: number | null = null;
  for (const en of entries) {
    if (typeof en !== "object" || en === null) continue;
    const ts = (en as Record<string, unknown>).timestamp;
    if (isMsEpoch(ts)) {
      edits++;
      firstMs = firstMs == null ? ts : Math.min(firstMs, ts);
      lastMs = lastMs == null ? ts : Math.max(lastMs, ts);
      noteDay(activeDays, ts);
    }
  }
  const acc = files.get(path) ?? { edits: 0, firstMs: null, lastMs: null };
  acc.edits += edits;
  if (firstMs != null) acc.firstMs = acc.firstMs == null ? firstMs : Math.min(acc.firstMs, firstMs);
  if (lastMs != null) acc.lastMs = acc.lastMs == null ? lastMs : Math.max(acc.lastMs, lastMs);
  files.set(path, acc);
  return 1;
}

/** Generic recursive scan for file:// URIs and ms-epoch timestamps. */
function heuristicScan(value: unknown, depth: number, files: Map<string, FileAccum>, activeDays: Set<string>): { uris: number; stamps: number } {
  let uris = 0;
  let stamps = 0;
  const visit = (v: unknown, d: number): void => {
    if (d > MAX_WALK_DEPTH || v === null || v === undefined) return;
    if (typeof v === "string") {
      if (v.startsWith("file://")) {
        const path = fileUriToPath(v);
        if (path && !files.has(path)) {
          files.set(path, { edits: 0, firstMs: null, lastMs: null });
          uris++;
        }
      }
      return;
    }
    if (isMsEpoch(v)) {
      noteDay(activeDays, v);
      stamps++;
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) visit(item, d + 1);
      return;
    }
    if (typeof v === "object") {
      for (const val of Object.values(v)) visit(val, d + 1);
    }
  };
  visit(value, depth);
  return { uris, stamps };
}

/** Parse a JSON upload: storage.json, entries.json, or any JSON history export. */
export function parseJsonHistory(text: string, source: "vscode" | "cursor"): ParsedEditorEvidence {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const r = emptyResult(source, ["File is not valid JSON; nothing was extracted."]);
    r.parseMethod = "Rejected: not valid JSON.";
    return r;
  }
  const files = new Map<string, FileAccum>();
  const activeDays = new Set<string>();
  const notes: string[] = [];
  const obj = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, unknown>;

  // Recognized shapes first.
  const recent = obj["history.recentlyOpenedPathsList"] ?? (obj.history as Record<string, unknown> | undefined)?.["recentlyOpenedPathsList"];
  const recentCount = ingestRecentlyOpened(recent, files, activeDays);
  if (recentCount > 0) notes.push(`recognized history.recentlyOpenedPathsList (${recentCount} entries)`);
  const localCount = ingestLocalHistory(parsed, files, activeDays);
  if (localCount > 0) notes.push("recognized VS Code Local History entries.json (per-file edit timestamps)");

  // Heuristic pass over the rest for anything the recognized shapes missed.
  const before = files.size;
  const scan = heuristicScan(parsed, 0, files, activeDays);
  const heuristicNew = files.size - before;
  if (heuristicNew > 0) notes.push(`heuristic scan found ${heuristicNew} additional file URIs`);
  if (scan.stamps > 0 && activeDays.size === 0) notes.push(`${scan.stamps} timestamp-like values seen but none mapped to a file`);

  if (files.size === 0) warnings.push("No file references were recognized in this JSON; nothing was extracted.");
  const method =
    `Parsed uploaded JSON as ${source === "vscode" ? "VS Code" : "Cursor"} history data. ` +
    (notes.length ? `Recognized: ${notes.join("; ")}.` : "No known history shapes were recognized; only a heuristic scan ran.");
  return finalize(source, files, activeDays, method, warnings);
}

type SqliteDb = {
  prepare: (sql: string) => { all: () => Array<Record<string, unknown>> };
  close: () => void;
};

/**
 * Parse a VS Code / Cursor `state.vscdb` SQLite file.
 * Known layout: table ItemTable(key TEXT PRIMARY KEY, value BLOB) where values
 * are JSON strings. Keys we treat as recognized: history.recentlyOpenedPathsList.
 * Anything else is a labeled heuristic scan - reported, never asserted.
 */
export async function parseWorkspaceStateDb(buffer: Buffer, source: "vscode" | "cursor"): Promise<ParsedEditorEvidence> {
  const warnings: string[] = [];
  let DatabaseSync: new (path: string, options?: { readOnly?: boolean }) => SqliteDb;
  try {
    ({ DatabaseSync } = await import("node:sqlite"));
  } catch {
    const r = emptyResult(source, ["This runtime cannot read SQLite files, so nothing was extracted."]);
    r.parseMethod = "Rejected: SQLite reading is unavailable in this runtime.";
    return r;
  }
  // node:sqlite opens by filesystem path only, so spill the upload to a temp
  // file (read-only) and delete it afterwards. The raw file is never kept.
  const dir = mkdtempSync(join(tmpdir(), "fydell-editor-import-"));
  const tmpPath = join(dir, "state.vscdb");
  let db: SqliteDb;
  try {
    writeFileSync(tmpPath, buffer);
    db = new DatabaseSync(tmpPath, { readOnly: true });
  } catch {
    rmSync(dir, { recursive: true, force: true });
    const r = emptyResult(source, ["The file has a SQLite header but could not be opened; nothing was extracted."]);
    r.parseMethod = "Rejected: SQLite file could not be opened.";
    return r;
  }
  try {
    const tables = db.prepare("select name from sqlite_master where type='table'").all().map((r) => String(r.name));
    if (!tables.includes("ItemTable")) {
      warnings.push(`No ItemTable found (tables: ${tables.join(", ") || "none"}); not a VS Code/Cursor state database.`);
      const r = emptyResult(source, warnings);
      r.parseMethod = `Opened SQLite file (${tables.length} tables) but found no ItemTable, so this does not look like editor state data.`;
      return r;
    }
    const rows = db.prepare("select key, value from ItemTable").all();
    const files = new Map<string, FileAccum>();
    const activeDays = new Set<string>();
    const recognized: string[] = [];
    const heuristicKeys: string[] = [];
    const skippedKeys: string[] = [];
    for (const row of rows) {
      const key = String(row.key);
      const raw = typeof row.value === "string" ? row.value : row.value instanceof Buffer ? row.value.toString("utf8") : "";
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        skippedKeys.push(key);
        continue;
      }
      if (key === "history.recentlyOpenedPathsList") {
        const n = ingestRecentlyOpened(value, files, activeDays);
        recognized.push(`${key} (${n} entries)`);
      } else if (/composer|chat|history|recent|timeline/i.test(key)) {
        const before = files.size;
        heuristicScan(value, 0, files, activeDays);
        heuristicKeys.push(`${key} (+${files.size - before} file refs)`);
      } else {
        skippedKeys.push(key);
      }
    }
    if (files.size === 0) warnings.push("No file references were recognized in this database; nothing was extracted.");
    const method =
      `Parsed uploaded state.vscdb (SQLite, ItemTable, ${rows.length} keys) as ${source === "vscode" ? "VS Code" : "Cursor"} workspace state. ` +
      (recognized.length ? `Recognized: ${recognized.join("; ")}.` : "No known state keys were recognized. ") +
      (heuristicKeys.length ? `Heuristic scan of editor-history-like keys: ${heuristicKeys.join("; ")}.` : "") +
      (skippedKeys.length > 10
        ? `${skippedKeys.length} unrelated keys ignored.`
        : skippedKeys.length
          ? `Ignored keys: ${skippedKeys.join(", ")}.`
          : "");
    return finalize(source, files, activeDays, method, warnings);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Route a raw upload to the right parser. Never throws for bad input. */
export async function parseEditorUpload(
  filename: string,
  buffer: Buffer,
  source: "vscode" | "cursor",
): Promise<ParsedEditorEvidence> {
  if (buffer.length === 0) {
    const r = emptyResult(source, ["The uploaded file is empty; nothing was extracted."]);
    r.parseMethod = "Rejected: empty file.";
    return r;
  }
  const kind = detectUploadKind(filename, buffer);
  if (kind === "sqlite") return parseWorkspaceStateDb(buffer, source);
  if (kind === "json") return parseJsonHistory(buffer.toString("utf8"), source);
  const r = emptyResult(source, [
    `Could not recognize "${filename}" as editor history data (expected JSON or a state.vscdb SQLite file); nothing was extracted.`,
  ]);
  r.parseMethod = `Rejected: unrecognized file type for "${filename}".`;
  return r;
}
