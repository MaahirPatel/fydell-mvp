/**
 * Minimal unified-diff generator for the AI workspace patch preview.
 * Line-based LCS diff — good enough for scenario-sized source files, no
 * external dependency needed for a deterministic, offline diff preview.
 */

type DiffOp = { type: "equal" | "add" | "remove"; line: string };

function lcsDiff(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "remove", line: a[i] });
      i++;
    } else {
      ops.push({ type: "add", line: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ type: "remove", line: a[i++] });
  while (j < m) ops.push({ type: "add", line: b[j++] });
  return ops;
}

export type DiffLine = { type: "equal" | "add" | "remove"; line: string; lineNumber: number };

/** Returns the diff ops annotated with a running line number, trimmed to the
 * changed regions plus a little context — enough for a compact review UI. */
export function computeUnifiedDiff(before: string, after: string, context = 2): DiffLine[] {
  const a = before.split("\n");
  const b = before === after ? a : after.split("\n");
  const ops = lcsDiff(a, b);

  const annotated: DiffLine[] = [];
  let lineNumber = 0;
  for (const op of ops) {
    if (op.type !== "remove") lineNumber++;
    annotated.push({ ...op, lineNumber });
  }

  const changedIdx = annotated
    .map((op, idx) => (op.type !== "equal" ? idx : -1))
    .filter((idx) => idx >= 0);
  if (changedIdx.length === 0) return [];

  const keep = new Set<number>();
  for (const idx of changedIdx) {
    for (let k = Math.max(0, idx - context); k <= Math.min(annotated.length - 1, idx + context); k++) {
      keep.add(k);
    }
  }
  return annotated.filter((_, idx) => keep.has(idx));
}

export function diffStats(diff: DiffLine[]): { additions: number; removals: number } {
  return {
    additions: diff.filter((d) => d.type === "add").length,
    removals: diff.filter((d) => d.type === "remove").length,
  };
}
