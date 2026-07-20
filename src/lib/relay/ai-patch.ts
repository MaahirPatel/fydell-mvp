/**
 * Deterministic, fully-offline "AI workspace" helper for Project Relay.
 *
 * There is no live model call here — every suggestion is either a
 * hand-authored fix for the known report.py join-wiring defect, or a
 * mechanical, clearly-labeled note appended for a candidate-typed
 * instruction. Nothing here fabricates a real LLM response.
 */

export type PatchProposal = {
  file: string;
  before: string;
  after: string;
  summary: string;
  source: "report_join_fix" | "instruction";
};

const REPORT_FILE_SUFFIX = "report.py";

const REPORT_IMPORT_BEFORE = `from join import naive_join
from metrics import carrier_breakdown, late_rate`;

const REPORT_IMPORT_AFTER = `from join import naive_join
from metrics import carrier_breakdown, late_rate
from reconcile import reconciled_join`;

const REPORT_DEFAULT_BEFORE = `    join_fn: JoinFn = naive_join,`;

const REPORT_DEFAULT_AFTER = `    # Fix: default to the ID-reconciled join so the report reflects the true
    # late rate instead of silently understating it (see docs/data-integrity.md).
    join_fn: JoinFn = reconciled_join,`;

export function detectReportJoinBug(file: string, content: string): boolean {
  return (
    file.endsWith(REPORT_FILE_SUFFIX) &&
    content.includes(REPORT_DEFAULT_BEFORE) &&
    !content.includes("join_fn: JoinFn = reconciled_join")
  );
}

function reportJoinFix(file: string, content: string): PatchProposal | null {
  if (!detectReportJoinBug(file, content)) return null;
  let after = content.replace(REPORT_IMPORT_BEFORE, REPORT_IMPORT_AFTER);
  after = after.replace(REPORT_DEFAULT_BEFORE, REPORT_DEFAULT_AFTER);
  if (after === content) return null;
  return {
    file,
    before: content,
    after,
    summary:
      "Known defect: build_report() defaults to join.naive_join, which silently drops delay-tracking rows " +
      "whose shipment_id format doesn't match shipments.csv (see docs/data-integrity.md). This patch rewires " +
      "the default to reconcile.reconciled_join so the report reflects the true late rate.",
    source: "report_join_fix",
  };
}

const UNSAFE_TO_ANNOTATE = [".json", ".jsonl", ".csv"];

function commentPrefixFor(file: string): string {
  if (file.endsWith(".py")) return "#";
  if (file.endsWith(".md")) return "<!--";
  return "//";
}

function instructionPatch(file: string, content: string, instruction: string): PatchProposal | null {
  const trimmed = instruction.trim();
  if (UNSAFE_TO_ANNOTATE.some((ext) => file.endsWith(ext))) return null;
  const prefix = commentPrefixFor(file);
  const suffix = prefix === "<!--" ? " -->" : "";
  const note = `${prefix} AI workspace note (deterministic, offline — not a live model call): ${trimmed}${suffix}`;
  const after = content.endsWith("\n") ? `${content}${note}\n` : `${content}\n${note}\n`;
  return {
    file,
    before: content,
    after,
    summary: `No live model is wired up, so this appends a clearly-labeled note capturing your instruction rather than inventing a code change: "${trimmed}".`,
    source: "instruction",
  };
}

/**
 * Propose a deterministic patch for the given file.
 * - A typed instruction always wins (that's the more specific request).
 * - Otherwise, if the file is report.py and still defaults to the naive join,
 *   propose the canonical fix.
 * - Otherwise there is nothing to suggest.
 */
export function proposePatch(file: string, content: string, instruction: string): PatchProposal | null {
  if (instruction.trim()) return instructionPatch(file, content, instruction);
  return reportJoinFix(file, content);
}
