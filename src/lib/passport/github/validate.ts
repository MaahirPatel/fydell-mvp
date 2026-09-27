import type { RepoFinding } from "./types";

/**
 * A finding is published only if its citation resolves against the retrieved
 * snapshot: the path was actually fetched, the line range lies inside the
 * file, and the excerpt is byte-identical to those lines.
 */
export function citationIsValid(finding: RepoFinding, files: Map<string, string>): boolean {
  const text = files.get(finding.path);
  if (text === undefined) return false;
  const ls = text.split(/\r?\n/);
  const { startLine, endLine } = finding;
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) return false;
  if (startLine < 1 || endLine < startLine || endLine > ls.length) return false;
  const expected = ls.slice(startLine - 1, endLine);
  return expected.length === finding.excerpt.length && expected.every((line, i) => line === finding.excerpt[i]);
}
