/**
 * Starter-vs-submission code changes for reviewers (REP-02, WORK-02).
 *
 * Pure and bounded: a line-level LCS diff rendered as unified hunks with
 * three lines of context. Very large files are reported as changed without
 * a line diff rather than slowing the report down.
 */

export interface FileChange {
  path: string;
  change: "added" | "removed" | "modified";
  added: number;
  removed: number;
  /** Unified diff hunks, or null when the file was too large to diff. */
  hunks: string | null;
}

const CONTEXT = 3;
const MAX_CELLS = 2_000_000;

type Op = { kind: " " | "+" | "-"; line: string };

function splitLines(s: string): string[] {
  const lines = s.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function lineOps(a: string[], b: string[]): Op[] | null {
  const n = a.length;
  const m = b.length;
  if (n * m > MAX_CELLS) return null;
  // lcs[i][j] = LCS length of a[i:] and b[j:], one flat array.
  const w = m + 1;
  const lcs = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * w + j] = a[i] === b[j] ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: " ", line: a[i] });
      i++;
      j++;
    } else if (lcs[(i + 1) * w + j] >= lcs[i * w + j + 1]) {
      ops.push({ kind: "-", line: a[i++] });
    } else {
      ops.push({ kind: "+", line: b[j++] });
    }
  }
  while (i < n) ops.push({ kind: "-", line: a[i++] });
  while (j < m) ops.push({ kind: "+", line: b[j++] });
  return ops;
}

function unified(ops: Op[]): string {
  const changed = ops.map((o, idx) => (o.kind === " " ? -1 : idx)).filter((idx) => idx >= 0);
  if (changed.length === 0) return "";
  // Group changes whose context windows overlap into hunks.
  const hunks: Array<[number, number]> = [];
  for (const idx of changed) {
    const start = Math.max(0, idx - CONTEXT);
    const end = Math.min(ops.length - 1, idx + CONTEXT);
    const last = hunks[hunks.length - 1];
    if (last && start <= last[1] + 1) last[1] = end;
    else hunks.push([start, end]);
  }
  const out: string[] = [];
  for (const [start, end] of hunks) {
    let oldLine = 1;
    let newLine = 1;
    for (let k = 0; k < start; k++) {
      if (ops[k].kind !== "+") oldLine++;
      if (ops[k].kind !== "-") newLine++;
    }
    const slice = ops.slice(start, end + 1);
    const oldCount = slice.filter((o) => o.kind !== "+").length;
    const newCount = slice.filter((o) => o.kind !== "-").length;
    out.push(`@@ -${oldLine},${oldCount} +${newLine},${newCount} @@`);
    for (const o of slice) out.push(`${o.kind}${o.line}`);
  }
  return out.join("\n");
}

export function diffFiles(
  starter: Record<string, string>,
  submitted: Record<string, string>,
  include: (path: string) => boolean = () => true
): FileChange[] {
  const paths = [...new Set([...Object.keys(starter), ...Object.keys(submitted)])].filter(include).sort();
  const changes: FileChange[] = [];
  for (const path of paths) {
    const before = starter[path];
    const after = submitted[path];
    if (before === after) continue;
    const a = before === undefined ? [] : splitLines(before);
    const b = after === undefined ? [] : splitLines(after);
    const change: FileChange["change"] = before === undefined ? "added" : after === undefined ? "removed" : "modified";
    const ops = lineOps(a, b);
    if (!ops) {
      changes.push({ path, change, added: b.length, removed: a.length, hunks: null });
      continue;
    }
    const hunks = unified(ops);
    if (change === "modified" && hunks === "") continue; // line-ending-only difference
    changes.push({
      path,
      change,
      added: ops.filter((o) => o.kind === "+").length,
      removed: ops.filter((o) => o.kind === "-").length,
      hunks,
    });
  }
  return changes;
}
