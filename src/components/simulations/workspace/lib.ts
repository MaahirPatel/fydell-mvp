import { strToU8, zipSync, type Zippable } from "fflate";
import type { AuthoredFile, PublicRunView } from "@/lib/eng/authored/types";

/**
 * A workspace file. `editable` is optional so the workspace honours a
 * read-only flag whenever the server sends one; absent means editable.
 */
export type WorkspaceFile = AuthoredFile & { editable?: boolean };

export function isReadOnlyFile(file: WorkspaceFile | undefined): boolean {
  return file?.editable === false;
}

const LANGUAGE_BY_EXT: Record<string, string> = {
  py: "python",
  pyi: "python",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "typescript",
  json: "json",
  md: "markdown",
  markdown: "markdown",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  ini: "ini",
  cfg: "ini",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sh: "shell",
  bash: "shell",
  sql: "sql",
  xml: "xml",
  txt: "plaintext",
};

export function languageFor(path: string): string {
  const name = path.split("/").pop() ?? path;
  if (name === "Dockerfile") return "dockerfile";
  if (name === "Makefile") return "plaintext";
  const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : "";
  return LANGUAGE_BY_EXT[ext] ?? "plaintext";
}

export function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "task"
  );
}

function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Shortest edit distance between two line lists (Myers), or null when too large to compute cheaply. */
function editDistance(a: string[], b: string[], maxD: number): number | null {
  const n = a.length;
  const m = b.length;
  const limit = Math.min(n + m, maxD);
  const offset = limit + 1;
  const v = new Int32Array(2 * limit + 3);
  for (let d = 0; d <= limit; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset]) ? v[k + 1 + offset] : v[k - 1 + offset] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[k + offset] = x;
      if (x >= n && y >= m) return d;
    }
  }
  return null;
}

/** Lines added and removed going from `before` to `after`. */
export function lineDiffCounts(before: string, after: string): { added: number; removed: number } {
  if (before === after) return { added: 0, removed: 0 };
  let a = splitLines(before);
  let b = splitLines(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  a = a.slice(start, endA);
  b = b.slice(start, endB);
  const d = editDistance(a, b, 4000);
  if (d === null) return { added: b.length, removed: a.length };
  return { added: (d + (b.length - a.length)) / 2, removed: (d - (b.length - a.length)) / 2 };
}

export type ChangeKind = "modified" | "added" | "removed";

export interface WorkspaceChange {
  path: string;
  change: ChangeKind;
  added: number;
  removed: number;
}

/** Files that differ from `base`, with line counts, in path order. */
export function diffFileSets(files: AuthoredFile[], base: AuthoredFile[]): WorkspaceChange[] {
  const before = new Map(base.map((f) => [f.path, f.content]));
  const now = new Map(files.map((f) => [f.path, f.content]));
  const changes: WorkspaceChange[] = [];
  for (const f of files) {
    const prev = before.get(f.path);
    if (prev === undefined) changes.push({ path: f.path, change: "added", ...lineDiffCounts("", f.content) });
    else if (prev !== f.content) changes.push({ path: f.path, change: "modified", ...lineDiffCounts(prev, f.content) });
  }
  for (const f of base) if (!now.has(f.path)) changes.push({ path: f.path, change: "removed", ...lineDiffCounts(f.content, "") });
  return changes.sort((x, y) => x.path.localeCompare(y.path));
}

export function sameFiles(a: AuthoredFile[], b: AuthoredFile[]): boolean {
  if (a.length !== b.length) return false;
  const map = new Map(a.map((f) => [f.path, f.content]));
  return b.every((f) => map.get(f.path) === f.content);
}

export type TreeNode = { kind: "dir"; name: string; path: string; children: TreeNode[] } | { kind: "file"; name: string; path: string };

export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const path of [...paths].sort((a, b) => a.localeCompare(b))) {
    const parts = path.split("/");
    let level = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const sub = parts.slice(0, i + 1).join("/");
      if (i === parts.length - 1) {
        level.push({ kind: "file", name, path: sub });
      } else {
        let dir = level.find((n): n is Extract<TreeNode, { kind: "dir" }> => n.kind === "dir" && n.name === name);
        if (!dir) {
          dir = { kind: "dir", name, path: sub, children: [] };
          level.push(dir);
        }
        level = dir.children;
      }
    }
  }
  const sortLevel = (nodes: TreeNode[]) => {
    nodes.sort((x, y) => (x.kind === y.kind ? x.name.localeCompare(y.name) : x.kind === "dir" ? -1 : 1));
    for (const n of nodes) if (n.kind === "dir") sortLevel(n.children);
  };
  sortLevel(root);
  return root;
}

export interface Problem {
  id: string;
  path: string;
  line: number;
  column: number | null;
  message: string;
  source: "Python" | "pytest" | "JavaScript";
}

function resolvePath(raw: string, known: string[]): string | null {
  const cleaned = raw.replace(/^file:\/\//, "").replace(/\\/g, "/").replace(/^\.\//, "");
  if (known.includes(cleaned)) return cleaned;
  let best: string | null = null;
  for (const p of known) {
    if (cleaned.endsWith(`/${p}`) && (!best || p.length > best.length)) best = p;
  }
  return best;
}

const PY_FRAME = /File "([^"]+)", line (\d+)(?:, in (.+))?/;
const PY_ERROR = /^\s*(?:E\s+)?([A-Za-z_][\w.]*(?:Error|Exception|Exit|Interrupt|Failure))\b:?\s?(.*)$/;
const PYTEST_LINE = /^([^\s:"']+\.py):(\d+):\s*(.*)$/;
const JS_FRAME = /at (?:[^()\n]*?\()?((?:file:\/\/)?[^\s()]+?\.(?:[cm]?js|[cm]?ts|tsx|jsx)):(\d+):(\d+)\)?/;

/**
 * Turns a run's raw output into clickable locations: Python traceback frames,
 * pytest `path:line:` lines and JavaScript stack frames. Only locations that
 * resolve to a workspace file are kept.
 */
export function parseProblems(output: string, knownPaths: string[]): Problem[] {
  const lines = output.split(/\r?\n/);
  const found = new Map<string, Problem>();
  const add = (p: Omit<Problem, "id">) => {
    const id = `${p.path}:${p.line}`;
    if (!found.has(id)) found.set(id, { ...p, id });
  };
  const errorAfter = (from: number): string | null => {
    for (let j = from; j < Math.min(lines.length, from + 40); j++) {
      const m = PY_ERROR.exec(lines[j]);
      if (m) return m[2] ? `${m[1]}: ${m[2]}` : m[1];
    }
    return null;
  };
  const errorBefore = (from: number): string | null => {
    for (let j = from - 1; j >= Math.max(0, from - 20); j--) {
      const t = lines[j].trim();
      if (t && !t.startsWith("at ")) return t.slice(0, 240);
    }
    return null;
  };
  lines.forEach((line, i) => {
    const py = PY_FRAME.exec(line);
    if (py) {
      const path = resolvePath(py[1], knownPaths);
      if (path) add({ path, line: Number(py[2]), column: null, message: errorAfter(i + 1) ?? (py[3] ? `in ${py[3]}` : "Traceback frame"), source: "Python" });
      return;
    }
    const pt = PYTEST_LINE.exec(line.trim());
    if (pt) {
      const path = resolvePath(pt[1], knownPaths);
      if (path) add({ path, line: Number(pt[2]), column: null, message: pt[3] || errorAfter(i + 1) || "Test failure", source: "pytest" });
      return;
    }
    const js = JS_FRAME.exec(line);
    if (js) {
      const path = resolvePath(js[1], knownPaths);
      if (path) add({ path, line: Number(js[2]), column: Number(js[3]), message: errorBefore(i) ?? "Stack frame", source: "JavaScript" });
    }
  });
  return [...found.values()];
}

/** The part of a run's output that explains failures, when the format is recognisable. */
export function failureExcerpt(output: string): string {
  const start = output.search(/^=+ (?:FAILURES|ERRORS) =+\s*$/m);
  if (start >= 0) {
    const rest = output.slice(start);
    const end = rest.search(/^=+ short test summary info =+\s*$/m);
    return (end > 0 ? rest.slice(0, end) : rest).trim().slice(0, 16000);
  }
  const lines = output.trimEnd().split(/\r?\n/);
  return lines.slice(-80).join("\n");
}

export type CodeSegment = { kind: "text"; text: string } | { kind: "code"; lang: string; text: string };

/** Splits plain text on fenced code blocks so code can be shown monospace. Nothing is rendered as HTML. */
export function splitFences(text: string): CodeSegment[] {
  const out: CodeSegment[] = [];
  const re = /```([\w+.-]*)[^\n]*\n([\s\S]*?)(?:```|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: "code", lang: m[1], text: m[2].replace(/\n$/, "") });
    last = re.lastIndex;
    if (m[0].length === 0) break;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out.filter((s) => s.kind === "code" || s.text.trim() !== "");
}

/** 8-64 chars of [A-Za-z0-9_-], as the collaboration routes require. */
export function newClientMsgId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID().replace(/-/g, "");
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function zipProject(files: AuthoredFile[], folder: string): Uint8Array {
  const tree: Zippable = {};
  for (const f of files) tree[`${folder}/${f.path}`] = strToU8(f.content);
  return zipSync(tree, { level: 6 });
}

export function downloadBytes(bytes: Uint8Array, name: string, type: string) {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function runTally(run: PublicRunView): { passed: number; failed: number; total: number; allPassed: boolean } {
  const passed = run.tests.filter((t) => t.outcome === "passed").length;
  const failed = run.tests.filter((t) => t.outcome === "failed" || t.outcome === "error").length;
  const total = run.tests.length;
  return { passed, failed, total, allPassed: run.status === "ran" && total > 0 && passed === total };
}

export const RUN_STATUS_LABEL: Record<PublicRunView["status"], string> = {
  running: "Running",
  ran: "Finished",
  timeout: "Timed out",
  infrastructure_error: "Runner error",
  runner_unavailable: "Runner unavailable",
};
