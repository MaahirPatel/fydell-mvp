import type { CriterionOutcome, Report } from "./report";

const GAP_STATES = new Set(["concern_observed", "partially_demonstrated"]);

function firstGap(report: Report): CriterionOutcome | undefined {
  return report.criteria.find((c) => GAP_STATES.has(c.state));
}

/** The one finding the candidate would see, written from the results. */
export function candidateFinding(report: Report): { title: string; text: string; criterionId: string | null } {
  if (report.noChanges) {
    return { title: "No changes submitted", text: "The submission matches the starter code, so there is nothing to give feedback on.", criterionId: null };
  }
  const gap = firstGap(report);
  if (gap) {
    const passing = gap.tests.filter((t) => t.status === "pass").length;
    const lead = passing > 0 ? `Part of this works: ${passing} of ${gap.tests.length} supporting checks passed.` : "None of the supporting checks passed.";
    return { title: "Not met yet", text: `${lead} The requirement: ${gap.criterion.text}`, criterionId: gap.criterion.id };
  }
  const tested = report.criteria.some((c) => c.state === "demonstrated");
  return {
    title: tested ? "Tested requirements met" : "Nothing could be checked",
    text: tested
      ? "Every acceptance criterion that has tests passed them, including the protected tests that run on submission."
      : "None of the acceptance criteria had a test result, so the report cannot say whether they are met.",
    criterionId: null,
  };
}

/** A starting point for the reviewer's private note, stated only from what ran. */
export function reviewerObservation(report: Report): string {
  const files = report.diffs.map((d) => `${d.path} (+${d.added} \u2212${d.removed})`).join(", ");
  const gaps = report.criteria.filter((c) => GAP_STATES.has(c.state)).map((c) => c.criterion.id);
  return [
    report.noChanges ? "No files were changed." : `Changed ${files}.`,
    `${report.publicTests.passed} of ${report.publicTests.total} public and ${report.protectedTests.passed} of ${report.protectedTests.total} protected tests passed.`,
    gaps.length > 0 ? `Criteria not fully met: ${gaps.join(", ")}.` : "No gaps in the tested criteria.",
    "Reasoning is not scored: read the handoff and team messages, and probe it in the interview.",
  ].join(" ");
}

export function defaultFollowUp(report: Report): string {
  const gap = firstGap(report);
  if (gap) return `This requirement is not fully met yet: "${gap.criterion.text}" How would you find out what is still failing, and what would you change?`;
  return "What could still go wrong with your change in production, and how would you find out?";
}
