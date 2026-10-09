import { codeOnly, type DraftFinding } from "./detectors";
import { blockEnd } from "./practice-detectors";
import { isReadme, isTestFile } from "./select";
import type { CommentContradiction, Entailment, EntailmentCheck, UntrustedInstruction } from "./types";

/**
 * Entailment checks: does the cited code actually carry the finding? A
 * pattern match proves only that some lines look a certain way. These checks
 * catch the common ways that is misleading: the code is never called, can
 * never run, is a stub, is only a comment, or is a test that is skipped,
 * asserts nothing or cannot import what it tests. None of them runs code.
 */

type Files = Map<string, string>;

type Symbol = { name: string; kind: "function" | "test"; header: number; end: number; exported: boolean; skipped: boolean; decorated: boolean };

const JS_FN = /^\s*(export\s+)?(default\s+)?(async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/;
const JS_ARROW = /^\s*(export\s+)?(const|let|var)\s+([A-Za-z_$][\w$]*)\s*(:[^=]+)?=\s*(async\s+)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*(:[^=]+)?=>/;
const JS_METHOD = /^\s*(?:(?:public|private|protected|static|async)\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(:\s*[^{]+)?\{\s*$/;
const PY_DEF = /^\s*(async\s+)?def\s+([A-Za-z_]\w*)\s*\(/;
const GO_FN = /^func\s+(\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/;
const JS_TEST = /^\s*(x?(?:it|test))((?:\.\w+)*)\s*\(\s*(['"`])(.*?)\3/;
const NOT_A_NAME = new Set(["if", "for", "while", "switch", "catch", "function", "return", "else", "do", "try", "with"]);

const TEST_DETECTORS = new Set(["test_suite", "failure_path_test", "test_isolation", "parametrized_test"]);
const ASSERTION =
  /\bexpect\s*\(|\bassert\w*\b|\.should\b|\bt\.(is|true|false|deepEqual|throws\w*|rejects)\(|pytest\.raises|self\.assert\w+\(|\.to(Be|Equal|Throw|Match|Have|Contain)\w*\(|\.rejects\.|\.resolves\.|assertThrows\(|\bmust\.\w+/;
const STUB = /not implemented|NotImplementedError|unimplemented!\(|todo!\(/i;
const EXIT = /^\s*(return\b|throw\b|raise\b|break\b|continue\b)/;
const DEAD_IF = /^\s*(\}\s*)?(else\s+)?if\s*\(?\s*(false|False|0)\s*\)?\s*[:{]/;

const indentOf = (line: string) => line.search(/\S/);
const isBlank = (line: string) => !line.trim();
const isCommentLine = (line: string) => {
  const t = line.trim();
  return !t || t.startsWith("//") || t.startsWith("#") || t.startsWith("/*") || t.startsWith("*") || codeOnly(line).trim() === "";
};
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function decoratedAbove(ls: string[], i: number): string[] {
  const out: string[] = [];
  for (let j = i - 1; j >= 0 && /^\s*@/.test(ls[j]); j--) out.push(ls[j]);
  return out;
}

function headerAt(ls: string[], i: number, path: string, text: string): Omit<Symbol, "end"> | null {
  const line = ls[i];
  const test = JS_TEST.exec(line);
  if (test) {
    const skipped = test[1].startsWith("x") || /\.(skip|todo)\b/.test(test[2]);
    return { name: test[4], kind: "test", header: i, exported: false, skipped, decorated: false };
  }
  const py = PY_DEF.exec(line);
  if (py) {
    const decorators = decoratedAbove(ls, i);
    const isTest = isTestFile(path) && py[2].startsWith("test");
    return {
      name: py[2],
      kind: isTest ? "test" : "function",
      header: i,
      exported: new RegExp(`__all__[^\\n]*['"]${escape(py[2])}['"]`).test(text),
      skipped: isTest && decorators.some((d) => /skip/i.test(d)),
      decorated: decorators.length > 0,
    };
  }
  const fn = JS_FN.exec(line);
  if (fn) return { name: fn[4], kind: "function", header: i, exported: !!fn[1] || exportedElsewhere(text, fn[4]), skipped: false, decorated: false };
  const arrow = JS_ARROW.exec(line);
  if (arrow) return { name: arrow[3], kind: "function", header: i, exported: !!arrow[1] || exportedElsewhere(text, arrow[3]), skipped: false, decorated: false };
  const go = GO_FN.exec(line);
  if (go) return { name: go[2], kind: "function", header: i, exported: /^[A-Z]/.test(go[2]), skipped: false, decorated: false };
  const method = JS_METHOD.exec(line);
  if (method && !NOT_A_NAME.has(method[1]) && !/^\s*(if|for|while|switch|catch)\b/.test(line)) {
    // Class methods are reached through their instance; never call them unused.
    return { name: method[1], kind: "function", header: i, exported: true, skipped: false, decorated: false };
  }
  return null;
}

function exportedElsewhere(text: string, name: string): boolean {
  const n = escape(name);
  return new RegExp(`export\\s*\\{[^}]*\\b${n}\\b|export\\s+default\\s+${n}\\b|module\\.exports[^\\n]*\\b${n}\\b|exports\\.${n}\\b`).test(text);
}

/**
 * Last line of a function or test body. Braces inside the parameter list or
 * a return type on the header line (`(job: { id: string })`) do not close it.
 */
function bodyEnd(ls: string[], start: number): number {
  if (/:\s*(#.*)?$/.test(ls[start]) && !/[{]\s*$/.test(ls[start])) return blockEnd(ls, start);
  let paren = 0;
  let depth = 0;
  let opened = false;
  let closedOnHeader = false;
  const last = Math.min(ls.length - 1, start + 400);
  for (let i = start; i <= last; i++) {
    for (const ch of codeOnly(ls[i]).replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "")) {
      if (ch === "(") paren += 1;
      else if (ch === ")") paren -= 1;
      else if (paren > 0) continue;
      else if (ch === "{") {
        depth += 1;
        opened = true;
      } else if (ch === "}") {
        depth -= 1;
        if (opened && depth <= 0) {
          if (i > start) return i;
          opened = false;
          closedOnHeader = true;
          depth = 0;
        }
      }
    }
    if (i === start && closedOnHeader && !opened) return start;
    if (!opened && i > start + 3) return blockEnd(ls, start);
  }
  return blockEnd(ls, start);
}

/** The innermost function or test whose block contains the 0-based line. */
export function enclosingSymbol(ls: string[], line: number, path: string, text: string, kind?: Symbol["kind"]): Symbol | null {
  for (let i = line; i >= 0 && i >= line - 300; i--) {
    const h = headerAt(ls, i, path, text);
    if (!h || (kind && h.kind !== kind)) continue;
    const end = h.kind === "test" ? blockEnd(ls, i) : bodyEnd(ls, i);
    if (end >= line) return { ...h, end };
  }
  return null;
}

/** Code references to a name across the snapshot, not counting its own definition line or comments. */
function references(files: Files, name: string, definitionPath: string, definitionLine: number): number {
  const re = new RegExp(`(^|[^\\w$])${escape(name)}(?![\\w$])`, "g");
  let n = 0;
  for (const [path, text] of files) {
    if (isReadme(path) || /\.(md|txt)$/i.test(path)) continue;
    text.split(/\r?\n/).forEach((l, i) => {
      if (path === definitionPath && i === definitionLine) return;
      n += (codeOnly(l).match(re) ?? []).length;
    });
  }
  return n;
}

/** The block header that contains the line, judged by indentation, and whether an exit statement precedes the line in that block. */
function unreachable(ls: string[], line: number): string | null {
  const indent = indentOf(ls[line]);
  if (indent < 0) return null;
  for (let j = line - 1; j >= 0; j--) {
    if (isBlank(ls[j]) || isCommentLine(ls[j])) continue;
    const ind = indentOf(ls[j]);
    if (ind < indent) {
      return DEAD_IF.test(codeOnly(ls[j])) ? `Line ${j + 1} opens a branch that can never run (${ls[j].trim().slice(0, 60)}).` : null;
    }
    if (ind === indent && EXIT.test(codeOnly(ls[j]))) {
      return `Line ${j + 1} leaves the block (${ls[j].trim().slice(0, 60)}) before the cited lines, so they never run.`;
    }
  }
  return null;
}

function resolveImport(from: string, spec: string, files: Files): string | null {
  if (!spec.startsWith(".")) return null;
  const parts = from.split("/").slice(0, -1);
  for (const seg of spec.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  const base = parts.join("/");
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}/index.ts`, `${base}/index.js`]) {
    if (files.has(cand)) return cand;
  }
  return null;
}

function definesName(text: string, name: string): boolean {
  const n = escape(name);
  return new RegExp(`\\b(function\\*?|const|let|var|class|def|type|interface|enum)\\s+${n}\\b|export\\s*\\{[^}]*\\b${n}\\b|^\\s*${n}\\s*=`, "m").test(text);
}

/** Names a test file imports from files in the snapshot that those files do not define. */
function brokenImports(path: string, text: string, files: Files): string[] {
  const missing: string[] = [];
  for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const target = resolveImport(path, m[2], files);
    if (!target) continue;
    const body = files.get(target) ?? "";
    for (const raw of m[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name && !definesName(body, name)) missing.push(`${name} from ${m[2]}`);
    }
  }
  for (const m of text.matchAll(/^\s*from\s+([\w.]+)\s+import\s+([\w, ]+)$/gm)) {
    const target = `${m[1].replace(/\./g, "/")}.py`;
    if (!files.has(target)) continue;
    const body = files.get(target) ?? "";
    for (const raw of m[2].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name && !definesName(body, name)) missing.push(`${name} from ${m[1]}`);
    }
  }
  return missing;
}

export type EntailmentVerdict = { reject: string | null; entailment: Entailment };

/**
 * Checks one draft finding against the snapshot. `reject` is set when the
 * cited lines cannot carry any version of the claim (only a comment, or code
 * that can never run); otherwise the entailment says whether the claim
 * stands or is narrowed.
 */
export function checkEntailment(draft: DraftFinding, files: Files): EntailmentVerdict {
  const text = files.get(draft.path) ?? "";
  const ls = text.split(/\r?\n/);
  const start = draft.startLine - 1;
  const span = ls.slice(start, draft.endLine);
  const checks: Entailment["checks"] = [];
  const isTestFinding = TEST_DETECTORS.has(draft.detector);
  const fn = enclosingSymbol(ls, start, draft.path, text, isTestFinding ? "test" : undefined) ?? enclosingSymbol(ls, start, draft.path, text);
  const entailment = (status: Entailment["status"]): Entailment => ({ status, checks, symbol: fn?.name ?? null, executed: false });
  const add = (check: EntailmentCheck, detail: string) => checks.push({ check, detail });

  if (draft.basis === "dependency_declaration" || /\.(json|toml|ya?ml|cfg|ini|txt)$|Dockerfile$/.test(draft.path)) {
    return { reject: null, entailment: entailment("supported") };
  }

  if (span.length && span.every(isCommentLine)) {
    return { reject: "The cited lines are only comments.", entailment: entailment("narrowed") };
  }
  const dead = unreachable(ls, start);
  if (dead) return { reject: dead, entailment: entailment("narrowed") };

  if (isTestFinding) {
    add("not_executed", "Tests were read, not run. Whether they pass is unknown.");
    const problems = (test: Symbol): Array<[EntailmentCheck, string]> => {
      const out: Array<[EntailmentCheck, string]> = [];
      if (test.skipped) out.push(["skipped_test", `The test "${test.name.slice(0, 80)}" is marked skipped, so it would not run.`]);
      else if (!ls.slice(test.header, test.end + 1).some((l) => ASSERTION.test(codeOnly(l)))) {
        out.push(["assertion_free_test", `The test "${test.name.slice(0, 80)}" calls code but asserts nothing about the result.`]);
      }
      return out;
    };
    if (draft.detector === "test_suite") {
      // The finding is about the file's tests: it narrows only when none of them could show anything.
      const tests: Symbol[] = [];
      for (let i = 0; i < ls.length; i++) {
        const h = headerAt(ls, i, draft.path, text);
        if (h?.kind === "test") tests.push({ ...h, end: blockEnd(ls, i) });
      }
      const found = tests.map(problems);
      if (tests.length && found.every((p) => p.length)) for (const [check, detail] of found.flat().slice(0, 4)) add(check, detail);
    } else {
      const test = enclosingSymbol(ls, start, draft.path, text, "test");
      if (test) for (const [check, detail] of problems(test)) add(check, detail);
    }
    const broken = brokenImports(draft.path, text, files);
    if (broken.length) add("broken_import", `The test file imports ${broken.slice(0, 2).join(" and ")}, which the snapshot does not define, so it could not run as written.`);
  } else if (fn && fn.kind === "function") {
    const body = ls.slice(fn.header, fn.end + 1);
    if (body.some((l) => STUB.test(codeOnly(l)))) add("stub_body", `${fn.name}() contains a "not implemented" stub, so the cited behaviour is incomplete.`);
    if (!fn.exported && !fn.decorated && fn.name !== "main" && references(files, fn.name, draft.path, fn.header) === 0) {
      add("unused_function", `${fn.name}() is never called in the analyzed files, so the cited lines do not run as part of this project.`);
    }
  }
  const narrowing = checks.some((c) => c.check !== "not_executed");
  return { reject: null, entailment: entailment(narrowing ? "narrowed" : "supported") };
}

/** Comment claims, keyed to the detectors that would support them. Intentions (TODO, should, planned) are not claims. */
const COMMENT_CLAIMS: Array<{ re: RegExp; detectors: string[]; claims: string }> = [
  { re: /\bretr(y|ies|ied)\b.*\b(backoff|delay)|exponential backoff/i, detectors: ["retry_with_backoff"], claims: "retries with backoff" },
  { re: /idempoten|\bdedup|duplicates? (are |is )?(ignored|skipped|dropped)|exactly[- ]once/i, detectors: ["idempotency_guard"], claims: "duplicate work is prevented" },
  { re: /\btime(s)?[ -]?out\b/i, detectors: ["outbound_timeout"], claims: "calls time out" },
  { re: /\bvalidat(es|ed|ion)\b.*\b(input|request|body|payload|schema)/i, detectors: ["schema_validated_handler", "fastapi_validated_route", "llm_output_validation"], claims: "input is validated" },
  { re: /\b(in a |inside a |uses a )?transaction\b|\batomic(ally)?\b/i, detectors: ["db_transaction", "idempotency_guard"], claims: "writes are atomic" },
  { re: /\bparameteri[sz]ed\b|\bsql injection\b/i, detectors: ["parameterized_sql"], claims: "SQL values are bound as parameters" },
];

/** Detectors that would have supported a recorded comment claim. */
export function claimDetectors(claims: string): string[] {
  return COMMENT_CLAIMS.find((c) => c.claims === claims)?.detectors ?? [];
}

const INTENTION = /\b(todo|fixme|xxx|should|could|would|might|not yet|later|planned|someday|maybe|eventually|consider)\b/i;

function commentText(line: string): string | null {
  const code = codeOnly(line);
  if (code.length === line.length) {
    const m = /^\s*(\/\*+|\*)\s?(.*?)(\*\/)?\s*$/.exec(line);
    return m && /^\s*(\/\*|\*)/.test(line) ? m[2] : null;
  }
  return line.slice(code.length).replace(/^\s*(#|\/\/)\s?/, "");
}

/** Comments that claim behaviour no supported finding in the same file shows. Preserved as contradictions, never as evidence. */
export function commentContradictions(files: Files, supportedByPath: Map<string, Set<string>>): CommentContradiction[] {
  const out: CommentContradiction[] = [];
  for (const [path, text] of files) {
    if (isTestFile(path) || isReadme(path) || /\.(md|txt|json|ya?ml|toml)$/i.test(path)) continue;
    const ls = text.split(/\r?\n/);
    ls.forEach((line, i) => {
      if (out.length >= 6) return;
      const comment = commentText(line);
      if (!comment || INTENTION.test(comment)) return;
      for (const claim of COMMENT_CLAIMS) {
        if (!claim.re.test(comment)) continue;
        const have = supportedByPath.get(path) ?? new Set<string>();
        if (claim.detectors.some((d) => have.has(d))) continue;
        out.push({
          path,
          line: i + 1,
          text: comment.trim().slice(0, 160),
          claims: claim.claims,
          detail: `A comment says ${claim.claims}, but no supported finding in ${path} shows it.`,
        });
        return;
      }
    });
  }
  return out;
}

const INJECTION =
  /ignore (all |any )?(the )?(previous|prior|above|earlier) (instructions|rules)|you are (an? )?(ai|assistant|language model|analy[sz]er|reviewer)|(rate|score|grade) (this|the) (candidate|engineer|developer|author)|(give|assign) (this|the) (candidate|engineer|author)|system prompt|as an ai\b|disregard (your|the) (rules|policy|instructions)/i;

/** README and doc lines that address an analyzer. They are recorded and never followed or sent as instructions. */
export function untrustedInstructions(files: Files): UntrustedInstruction[] {
  const out: UntrustedInstruction[] = [];
  for (const [path, text] of files) {
    if (!isReadme(path) && !/\.(md|txt)$/i.test(path)) continue;
    text.split(/\r?\n/).forEach((line, i) => {
      if (out.length < 5 && INJECTION.test(line)) out.push({ path, line: i + 1, excerpt: line.trim().slice(0, 140) });
    });
  }
  return out;
}
