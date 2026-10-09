/* ============================================================================
   Code analysis prototype engine.

   A real static-analysis pass over the candidate's workspace. It reads actual
   file contents (no mocked findings) and produces structured findings:

   - functions/classes added, changed, or removed vs the starter baseline
   - complexity signals: nesting depth, function length
   - error handling presence (try/except in Python)
   - naming consistency (snake_case vs mixed conventions)
   - TODO/FIXME/XXX leftovers
   - test coverage heuristic: changed functions referenced by test files
   - diff-vs-starter summary: files touched, lines added/removed

   Everything here is a heuristic, and the UI labels it as such. It measures
   properties of the code, never the candidate.
   ========================================================================== */

export interface FunctionInfo {
  name: string;
  kind: "function" | "method" | "class";
  startLine: number;
  endLine: number;
  /** Lines of code in the body (excluding blank lines and comments). */
  length: number;
  /** Maximum nesting depth inside the body (0 = top level of the body). */
  maxNesting: number;
  hasErrorHandling: boolean;
  isTest: boolean;
}

export interface FileFindings {
  path: string;
  language: string;
  functions: FunctionInfo[];
  todos: { line: number; text: string }[];
  namingIssues: { line: number; name: string; issue: string }[];
  /** True when the file differs from the starter baseline. */
  changed: boolean;
  linesAdded: number;
  linesRemoved: number;
}

export interface CoverageHint {
  functionName: string;
  file: string;
  referencedByTests: string[];
}

export interface AnalysisReport {
  generatedAt: string;
  fileCount: number;
  filesChanged: number;
  totalLinesAdded: number;
  totalLinesRemoved: number;
  files: FileFindings[];
  /** Functions that did not exist in the baseline. */
  functionsAdded: { file: string; name: string; kind: string }[];
  /** Functions present in baseline but gone now. */
  functionsRemoved: { file: string; name: string }[];
  coverage: CoverageHint[];
  /** Aggregate signals, for quick scanning. */
  signals: {
    longFunctions: { file: string; name: string; lines: number }[];
    deepNesting: { file: string; name: string; depth: number }[];
    missingErrorHandling: { file: string; name: string }[];
    todoCount: number;
    testFiles: string[];
  };
  /** Honest scope note, shown in the UI. */
  scope: string;
}

export interface WorkspaceFile {
  path: string;
  content: string;
}

const LONG_FUNCTION_LINES = 40;
const DEEP_NESTING_DEPTH = 4;

function languageOf(path: string): string {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  return "other";
}

function isTestPath(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return (
    base.startsWith("test_") ||
    base.endsWith("_test.py") ||
    base.includes(".test.") ||
    base.includes(".spec.") ||
    path.includes("/tests/") ||
    path.includes("/__tests__/")
  );
}

/* ---------------- Python parsing (indentation-based) ---------------- */

interface PyDef {
  name: string;
  kind: "function" | "method" | "class";
  startLine: number;
  indent: number;
  isMethod: boolean;
}

/** Collect top-level def/class statements with their indentation. */
function collectPyDefs(lines: string[]): PyDef[] {
  const defs: PyDef[] = [];
  const re = /^(\s*)(async\s+)?(def|class)\s+([A-Za-z_][A-Za-z0-9_]*)/;
  let inClass: { name: string; indent: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, "    ").length;
    // Leaving a class body resets method context.
    if (inClass && indent <= inClass.indent && m[3] !== "def") {
      inClass = null;
    }
    if (m[3] === "class") {
      inClass = { name: m[4], indent };
      defs.push({ name: m[4], kind: "class", startLine: i + 1, indent, isMethod: false });
    } else {
      const isMethod = inClass != null && indent > inClass.indent;
      defs.push({
        name: m[4],
        kind: isMethod ? "method" : "function",
        startLine: i + 1,
        indent,
        isMethod,
      });
    }
  }
  return defs;
}

/** Analyze one Python function body: length, nesting, error handling. */
function analyzePyBody(lines: string[], def: PyDef, nextStart: number): FunctionInfo {
  const bodyStart = def.startLine; // 1-based; body starts after the def line
  const bodyEnd = nextStart; // exclusive, 1-based
  let length = 0;
  let maxNesting = 0;
  let hasErrorHandling = false;
  const baseIndent = def.indent;
  for (let i = bodyStart; i < bodyEnd; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    // Skip decorators and the def line itself for length purposes is fine to include;
    // we count every non-blank, non-comment line in the span.
    length++;
    const indent = line.replace(/\t/g, "    ").length - line.trimStart().length;
    const rel = Math.max(0, Math.floor((indent - baseIndent) / 4) - 1);
    if (trimmed !== "" && rel > maxNesting) maxNesting = rel;
    if (/^try\s*:/.test(trimmed) || /^except[\s:]/.test(trimmed)) {
      hasErrorHandling = true;
    }
  }
  return {
    name: def.name,
    kind: def.kind,
    startLine: def.startLine,
    endLine: bodyEnd,
    length,
    maxNesting,
    hasErrorHandling,
    isTest: def.name.startsWith("test_"),
  };
}

function analyzePython(path: string, content: string): Omit<FileFindings, "changed" | "linesAdded" | "linesRemoved"> {
  const lines = content.split("\n");
  const defs = collectPyDefs(lines);
  const functions: FunctionInfo[] = defs
    .filter((d) => d.kind !== "class")
    .map((d, idx) => {
      const next = defs[idx + 1];
      const nextStart =
        next && next.startLine > d.startLine ? next.startLine - 1 : lines.length;
      return analyzePyBody(lines, d, nextStart);
    });
  // Class definitions themselves are reported as entries too (short).
  for (const d of defs.filter((d) => d.kind === "class")) {
    functions.push({
      name: d.name,
      kind: "class",
      startLine: d.startLine,
      endLine: d.startLine,
      length: 0,
      maxNesting: 0,
      hasErrorHandling: false,
      isTest: false,
    });
  }

  const todos: { line: number; text: string }[] = [];
  const namingIssues: { line: number; name: string; issue: string }[] = [];
  const todoRe = /\b(TODO|FIXME|XXX|HACK)\b\s*:?\s*(.*)/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(todoRe);
    if (m) todos.push({ line: i + 1, text: `${m[1]}${m[2] ? ": " + m[2].trim().slice(0, 80) : ""}` });
  }
  // Naming: flag CamelCase function names and UPPER_SNAKE locals in defs.
  for (const d of defs) {
    if (d.kind !== "class" && /[A-Z]/.test(d.name) && d.name !== d.name.toLowerCase()) {
      if (/^[a-z]+([A-Z][a-z0-9]+)+$/.test(d.name)) {
        namingIssues.push({
          line: d.startLine,
          name: d.name,
          issue: "camelCase function name in a snake_case codebase",
        });
      }
    }
  }

  return { path, language: "python", functions, todos, namingIssues };
}

/* ---------------- TypeScript/JavaScript (regex-based, shallow) ---------------- */

function analyzeScript(path: string, content: string, language: string) {
  const lines = content.split("\n");
  const functions: FunctionInfo[] = [];
  const re = /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/;
  const arrowRe = /^\s*(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?\(/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re) ?? lines[i].match(arrowRe);
    if (m) {
      functions.push({
        name: m[1],
        kind: "function",
        startLine: i + 1,
        endLine: i + 1,
        length: 0,
        maxNesting: 0,
        hasErrorHandling: /try\s*\{/.test(content),
        isTest: m[1].startsWith("test"),
      });
    }
  }
  const todos: { line: number; text: string }[] = [];
  const todoRe = /\b(TODO|FIXME|XXX|HACK)\b\s*:?\s*(.*)/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(todoRe);
    if (m) todos.push({ line: i + 1, text: `${m[1]}${m[2] ? ": " + m[2].trim().slice(0, 80) : ""}` });
  }
  return { path, language, functions, todos, namingIssues: [] as { line: number; name: string; issue: string }[] };
}

/* ---------------- diff vs baseline (line-based LCS on hashed lines) ---------------- */

function diffLineCounts(a: string[], b: string[]): { added: number; removed: number } {
  // Simple histogram diff: count lines unique to each side. Fast and honest
  // about its limits (it reports a lower bound on churn, not exact edits).
  const count = (xs: string[]) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const ma = count(a);
  const mb = count(b);
  let added = 0;
  let removed = 0;
  for (const [line, n] of mb) {
    const d = n - (ma.get(line) ?? 0);
    if (d > 0) added += d;
  }
  for (const [line, n] of ma) {
    const d = n - (mb.get(line) ?? 0);
    if (d > 0) removed += d;
  }
  return { added, removed };
}

/* ---------------- main entry ---------------- */

export function analyzeFile(
  path: string,
  content: string,
  baselineContent: string | null
): FileFindings {
  const language = languageOf(path);
  const base =
    language === "python"
      ? analyzePython(path, content)
      : language === "typescript" || language === "javascript"
        ? analyzeScript(path, content, language)
        : {
            path,
            language,
            functions: [],
            todos: [],
            namingIssues: [] as { line: number; name: string; issue: string }[],
          };
  if (baselineContent == null) {
    return { ...base, changed: content.trim().length > 0, linesAdded: 0, linesRemoved: 0 };
  }
  const changed = baselineContent !== content;
  const { added, removed } = changed
    ? diffLineCounts(baselineContent.split("\n"), content.split("\n"))
    : { added: 0, removed: 0 };
  return { ...base, changed, linesAdded: added, linesRemoved: removed };
}

export function analyzeWorkspace(
  files: WorkspaceFile[],
  baseline: WorkspaceFile[]
): AnalysisReport {
  const baseByPath = new Map(baseline.map((f) => [f.path, f.content]));
  const analyzed = files.map((f) => analyzeFile(f.path, f.content, baseByPath.get(f.path) ?? null));

  // Functions added/removed vs baseline (by name, per file).
  const baseFuncs = new Map<string, Set<string>>();
  for (const b of baseline) {
    const lang = languageOf(b.path);
    if (lang !== "python") continue;
    const defs = collectPyDefs(b.content.split("\n")).filter((d) => d.kind !== "class");
    baseFuncs.set(b.path, new Set(defs.map((d) => d.name)));
  }
  const functionsAdded: { file: string; name: string; kind: string }[] = [];
  const functionsRemoved: { file: string; name: string }[] = [];
  for (const f of analyzed) {
    const base = baseFuncs.get(f.path) ?? new Set<string>();
    const now = new Set(f.functions.filter((fn) => fn.kind !== "class").map((fn) => fn.name));
    for (const fn of f.functions) {
      if (fn.kind === "class") continue;
      if (!base.has(fn.name)) functionsAdded.push({ file: f.path, name: fn.name, kind: fn.kind });
    }
    for (const name of base) {
      if (!now.has(name)) functionsRemoved.push({ file: f.path, name });
    }
  }

  // Coverage heuristic: test files that mention a changed function by name.
  const testFiles = analyzed.filter((f) => isTestPath(f.path));
  const coverage: CoverageHint[] = [];
  for (const f of analyzed) {
    if (isTestPath(f.path) || !f.changed) continue;
    for (const fn of f.functions) {
      if (fn.kind === "class" || fn.isTest) continue;
      const refs = testFiles
        .filter((t) => t.path !== f.path && new RegExp(`\\b${fn.name}\\b`).test(
          files.find((x) => x.path === t.path)?.content ?? ""
        ))
        .map((t) => t.path);
      coverage.push({ functionName: fn.name, file: f.path, referencedByTests: refs });
    }
  }

  const signals = {
    longFunctions: [] as { file: string; name: string; lines: number }[],
    deepNesting: [] as { file: string; name: string; depth: number }[],
    missingErrorHandling: [] as { file: string; name: string }[],
    todoCount: 0,
    testFiles: testFiles.map((t) => t.path),
  };
  for (const f of analyzed) {
    signals.todoCount += f.todos.length;
    for (const fn of f.functions) {
      if (fn.kind === "class") continue;
      if (fn.length >= LONG_FUNCTION_LINES) {
        signals.longFunctions.push({ file: f.path, name: fn.name, lines: fn.length });
      }
      if (fn.maxNesting >= DEEP_NESTING_DEPTH) {
        signals.deepNesting.push({ file: f.path, name: fn.name, depth: fn.maxNesting });
      }
      if (!fn.hasErrorHandling && fn.length >= 10 && !fn.isTest) {
        signals.missingErrorHandling.push({ file: f.path, name: fn.name });
      }
    }
  }

  const filesChanged = analyzed.filter((f) => f.changed).length;
  return {
    generatedAt: new Date().toISOString(),
    fileCount: analyzed.length,
    filesChanged,
    totalLinesAdded: analyzed.reduce((s, f) => s + f.linesAdded, 0),
    totalLinesRemoved: analyzed.reduce((s, f) => s + f.linesRemoved, 0),
    files: analyzed,
    functionsAdded,
    functionsRemoved,
    coverage,
    signals,
    scope:
      "Heuristic static analysis of workspace text. It counts structure, not " +
      "quality: long functions and missing try/except are signals for a human " +
      "reviewer, never verdicts.",
  };
}
