import { runDetectors, type DraftFinding } from "./detectors";
import { checkEntailment, commentContradictions, untrustedInstructions } from "./entailment";
import { citationIsValid } from "./validate";
import type { AnalysisChecks, RepoFinding } from "./types";

const MAX_EXCERPT_LINES = 8;

/**
 * Shared analysis of one redacted snapshot: detectors, citation checks
 * against the same text, entailment checks, comment contradictions and
 * untrusted-instruction screening. Used by GitHub imports and uploads alike,
 * so both produce findings under the same rules.
 */
export function analyzeFiles(
  files: Map<string, string>,
  opts: { idFor: (draft: DraftFinding) => string; sourceUrl: (path: string, start: number, end: number) => string },
): { findings: RepoFinding[]; rejected: number; checks: AnalysisChecks } {
  const findings: RepoFinding[] = [];
  const checks: AnalysisChecks = { contradictions: [], untrustedInstructions: untrustedInstructions(files), rejectedClaims: [] };
  let rejected = 0;
  for (const draft of runDetectors(files)) {
    const text = files.get(draft.path) ?? "";
    const endLine = Math.min(draft.endLine, draft.startLine + MAX_EXCERPT_LINES - 1);
    const finding: RepoFinding = {
      ...draft,
      endLine,
      id: opts.idFor(draft),
      excerpt: text.split(/\r?\n/).slice(draft.startLine - 1, endLine),
      sourceUrl: opts.sourceUrl(draft.path, draft.startLine, endLine),
      attribution: "unverified",
    };
    if (!citationIsValid(finding, files)) {
      rejected += 1;
      continue;
    }
    const verdict = checkEntailment(draft, files);
    if (verdict.reject) {
      rejected += 1;
      checks.rejectedClaims.push({ detector: draft.detector, path: draft.path, startLine: draft.startLine, endLine, reason: verdict.reject });
      continue;
    }
    findings.push({ ...finding, entailment: verdict.entailment });
  }
  const supported = new Map<string, Set<string>>();
  for (const f of findings) {
    if (f.entailment?.status !== "supported") continue;
    supported.set(f.path, (supported.get(f.path) ?? new Set<string>()).add(f.detector));
  }
  checks.contradictions = commentContradictions(files, supported);
  return { findings, rejected, checks };
}
