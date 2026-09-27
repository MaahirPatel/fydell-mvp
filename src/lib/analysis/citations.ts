/**
 * AI-04 — Citation validation.
 *
 * Every material finding must link to a verifiable location: valid lines in
 * the pinned submission snapshot, a test-output record, or an exact message.
 * Invalid references fail validation — the report cannot ship with them.
 *
 * A citation is a claim of the form "this is true, look here". This module
 * checks that "here" exists. It does not check that the claim is *correct* —
 * that is the reviewer's job (see grounding.ts).
 */

export type CitationSource = "snapshot" | "test_output" | "message";

export interface Citation {
  /** Where the evidence lives. */
  source: CitationSource;
  /** File path within the snapshot (source=snapshot). */
  file?: string;
  /** 1-based line number (source=snapshot). */
  line?: number;
  /** 1-based inclusive end line (source=snapshot). */
  endLine?: number;
  /** Record id for test_output / message citations. */
  refId?: string;
  /** Short human note, e.g. "defect location". */
  note?: string;
}

/** path -> number of lines in the pinned snapshot. */
export type SnapshotIndex = Map<string, number>;

export interface CitationProblem {
  citationIndex: number;
  reason: string;
}

export interface CitationValidation {
  valid: boolean;
  problems: CitationProblem[];
}

/**
 * Validate one citation against the snapshot / test-output / message indexes.
 * Returns a list of problems (empty = valid).
 */
export function validateCitation(
  citation: Citation,
  snapshot: SnapshotIndex,
  testOutputs: Set<string>,
  messages: Set<string>,
  index: number,
): CitationProblem[] {
  const problems: CitationProblem[] = [];
  const bad = (reason: string) => problems.push({ citationIndex: index, reason });

  if (citation.source === "snapshot") {
    if (!citation.file) {
      bad("snapshot citation is missing `file`");
      return problems;
    }
    const lineCount = snapshot.get(citation.file);
    if (lineCount === undefined) {
      bad(`file "${citation.file}" is not in the pinned submission snapshot`);
      return problems;
    }
    const line = citation.line;
    if (typeof line !== "number" || !Number.isInteger(line) || line < 1) {
      bad(`line must be a positive integer, got ${String(citation.line)}`);
    } else if (line > lineCount) {
      bad(`line ${line} is past the end of "${citation.file}" (${lineCount} lines)`);
    }
    if (citation.endLine !== undefined) {
      const end = citation.endLine;
      if (!Number.isInteger(end) || end < (line ?? 1)) {
        bad(`endLine ${String(end)} is before line ${String(line)}`);
      } else if (end > lineCount) {
        bad(`endLine ${end} is past the end of "${citation.file}" (${lineCount} lines)`);
      }
    }
  } else if (citation.source === "test_output") {
    if (!citation.refId) bad("test_output citation is missing `refId`");
    else if (!testOutputs.has(citation.refId)) {
      bad(`test output "${citation.refId}" is not a recorded test run`);
    }
  } else if (citation.source === "message") {
    if (!citation.refId) bad("message citation is missing `refId`");
    else if (!messages.has(citation.refId)) {
      bad(`message "${citation.refId}" is not in the recorded transcript`);
    }
  } else {
    bad(`unknown citation source "${String((citation as Citation).source)}"`);
  }
  return problems;
}

/**
 * Validate the citations of one finding.
 *
 * @param material  true for findings whose claims matter (defects, security,
 *                  high-severity) — these MUST carry at least one citation.
 *                  Non-material notes may carry none.
 */
export function validateFindingCitations(
  citations: Citation[] | undefined,
  material: boolean,
  snapshot: SnapshotIndex,
  testOutputs: Set<string>,
  messages: Set<string>,
): CitationValidation {
  const problems: CitationProblem[] = [];
  const list = citations ?? [];
  if (material && list.length === 0) {
    return {
      valid: false,
      problems: [{ citationIndex: -1, reason: "material finding has no citations" }],
    };
  }
  list.forEach((c, i) => {
    problems.push(...validateCitation(c, snapshot, testOutputs, messages, i));
  });
  return { valid: problems.length === 0, problems };
}

/** Build a SnapshotIndex from file path -> content. */
export function indexSnapshot(files: { path: string; content: string }[]): SnapshotIndex {
  const index = new Map<string, number>();
  for (const f of files) index.set(f.path, f.content.split("\n").length);
  return index;
}
