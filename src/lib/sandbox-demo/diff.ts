export type DiffOp =
  | { kind: "same"; text: string; oldLine: number; newLine: number }
  | { kind: "del"; text: string; oldLine: number; newLine: null }
  | { kind: "add"; text: string; oldLine: null; newLine: number };

export type LineRange = { start: number; end: number };

export type FileDiff = {
  path: string;
  ops: DiffOp[];
  added: number;
  removed: number;
  /** Line ranges in the submitted file that were added or next to a removal. */
  ranges: LineRange[];
};

function splitLines(text: string): string[] {
  const lines = text.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Above this many cells the LCS table is skipped and the file is shown as replaced. */
const MAX_CELLS = 4_000_000;

/** Line diff from the longest common subsequence. Files in this demo are small. */
export function diffLines(before: string, after: string): DiffOp[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const n = a.length;
  const m = b.length;
  const ops: DiffOp[] = [];

  if (n * m > MAX_CELLS) {
    a.forEach((text, i) => ops.push({ kind: "del", text, oldLine: i + 1, newLine: null }));
    b.forEach((text, j) => ops.push({ kind: "add", text, oldLine: null, newLine: j + 1 }));
    return ops;
  }

  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] = a[i] === b[j] ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: "same", text: a[i], oldLine: i + 1, newLine: j + 1 });
      i++;
      j++;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      ops.push({ kind: "del", text: a[i], oldLine: i + 1, newLine: null });
      i++;
    } else {
      ops.push({ kind: "add", text: b[j], oldLine: null, newLine: j + 1 });
      j++;
    }
  }
  for (; i < n; i++) ops.push({ kind: "del", text: a[i], oldLine: i + 1, newLine: null });
  for (; j < m; j++) ops.push({ kind: "add", text: b[j], oldLine: null, newLine: j + 1 });
  return ops;
}

/**
 * Ranges of lines in the new file that changed. A pure removal is anchored
 * to the line that now sits where the removed lines were.
 */
export function changedRanges(ops: DiffOp[]): LineRange[] {
  const ranges: LineRange[] = [];
  let lastNewLine = 0;
  const touch = (line: number) => {
    const prev = ranges[ranges.length - 1];
    if (prev && line <= prev.end + 1) prev.end = Math.max(prev.end, line);
    else ranges.push({ start: line, end: line });
  };
  ops.forEach((op, index) => {
    if (op.kind === "add") {
      touch(op.newLine);
      lastNewLine = op.newLine;
    } else if (op.kind === "same") {
      lastNewLine = op.newLine;
    } else {
      const next = ops.slice(index + 1).find((o) => o.kind !== "del");
      const anchor = next && next.newLine !== null ? next.newLine : Math.max(1, lastNewLine);
      touch(anchor);
    }
  });
  return ranges;
}

export function diffFile(path: string, before: string, after: string): FileDiff {
  const ops = diffLines(before, after);
  return {
    path,
    ops,
    added: ops.filter((o) => o.kind === "add").length,
    removed: ops.filter((o) => o.kind === "del").length,
    ranges: changedRanges(ops),
  };
}

/** Diffs every path present in either map, returning only files that changed. */
export function diffFiles(before: Record<string, string>, after: Record<string, string>, paths: string[]): FileDiff[] {
  return paths
    .map((path) => diffFile(path, before[path] ?? "", after[path] ?? ""))
    .filter((d) => d.added > 0 || d.removed > 0);
}

export type Hunk = { ops: DiffOp[]; header: string };

/** Groups a diff into hunks with `context` unchanged lines around each change. */
export function toHunks(ops: DiffOp[], context = 3): Hunk[] {
  const changed = ops.map((o, i) => (o.kind === "same" ? -1 : i)).filter((i) => i >= 0);
  if (changed.length === 0) return [];
  const windows: { from: number; to: number }[] = [];
  for (const index of changed) {
    const from = Math.max(0, index - context);
    const to = Math.min(ops.length - 1, index + context);
    const prev = windows[windows.length - 1];
    if (prev && from <= prev.to + 1) prev.to = Math.max(prev.to, to);
    else windows.push({ from, to });
  }
  return windows.map(({ from, to }) => {
    const slice = ops.slice(from, to + 1);
    const firstOld = slice.find((o) => o.oldLine !== null)?.oldLine ?? 0;
    const firstNew = slice.find((o) => o.newLine !== null)?.newLine ?? 0;
    const oldCount = slice.filter((o) => o.kind !== "add").length;
    const newCount = slice.filter((o) => o.kind !== "del").length;
    return { ops: slice, header: `@@ -${firstOld},${oldCount} +${firstNew},${newCount} @@` };
  });
}

export function formatRange(range: LineRange): string {
  return range.start === range.end ? `line ${range.start}` : `lines ${range.start} to ${range.end}`;
}
