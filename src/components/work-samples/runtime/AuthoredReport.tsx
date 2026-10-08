import { Status, type StatusKind } from "@/components/ui/report";
import { PanelLabel, PanelSection } from "@/components/ui/Panel";
import { BulletList } from "@/components/eng/CandidateParts";
import type { AuthoredCandidateReport, AuthoredState, CandidateAcceptanceResult } from "@/lib/eng/authored/types";
import { TestOutcomeList } from "./PublicTestResults";

const ACCEPTANCE: Record<CandidateAcceptanceResult["state"], { label: string; kind: StatusKind }> = {
  confirmed: { label: "Confirmed by tests", kind: "success" },
  not_confirmed: { label: "Not confirmed", kind: "failed" },
  no_result: { label: "No test result", kind: "neutral" },
};

export const STATE_KIND: Record<AuthoredState, StatusKind> = {
  demonstrated: "success",
  partially_demonstrated: "attention",
  concern_observed: "failed",
  not_assessed: "neutral",
  insufficient_evidence: "neutral",
};

/**
 * The released report for an employer-authored task. Only public test names
 * appear; checks that ran after submission are shown as counts against the
 * acceptance criterion they check.
 */
export function AuthoredReport({ report }: { report: AuthoredCandidateReport }) {
  return (
    <>
      <PanelSection title="What the tests confirmed" description={report.summary}>
        <ol className="grid gap-4">
          {report.acceptance.map((ac) => (
            <li key={ac.id} className="grid gap-2 border-t border-[var(--border-subtle)] pt-4 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="max-w-[64ch] text-app-body leading-[1.55] text-[var(--text-primary)]">
                  <span className="mr-2 font-mono text-app-meta text-[var(--text-tertiary)]">{ac.id}</span>
                  {ac.text}
                </p>
                <Status kind={ACCEPTANCE[ac.state].kind}>{ACCEPTANCE[ac.state].label}</Status>
              </div>
              {ac.evaluationChecks.total > 0 ? (
                <p className="text-app-meta text-[var(--text-secondary)]">
                  Checks run after you submitted: <span className="tabular-nums">{ac.evaluationChecks.passed} of {ac.evaluationChecks.total}</span> passed.
                </p>
              ) : null}
              {ac.publicTests.length ? <TestOutcomeList tests={ac.publicTests} /> : null}
            </li>
          ))}
        </ol>
      </PanelSection>

      {report.criteria.length ? (
        <PanelSection title="What this shows" description="Each area is described from the tests that ran. There is no overall score.">
          <ul className="grid gap-4">
            {report.criteria.map((c) => (
              <li key={c.id} className="grid gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-app-body font-medium text-[var(--text-primary)]">{c.label}</span>
                  <Status kind={STATE_KIND[c.state]}>{c.stateLabel}</Status>
                </div>
                {c.explanation ? <p className="max-w-[68ch] text-app-meta text-[var(--text-secondary)]">{c.explanation}</p> : null}
                <p className="max-w-[68ch] text-app-body leading-[1.55] text-[var(--text-body)]">{c.rationale}</p>
                {c.limitations ? <p className="max-w-[68ch] text-app-meta text-[var(--text-tertiary)]">{c.limitations}</p> : null}
              </li>
            ))}
          </ul>
        </PanelSection>
      ) : null}

      {report.reviewerNote ? (
        <PanelSection title="Note from the reviewer">
          <p className="max-w-[68ch] whitespace-pre-wrap text-app-body leading-[1.6] text-[var(--text-body)]">{report.reviewerNote}</p>
        </PanelSection>
      ) : null}

      <PanelSection title="Limits of this report">
        <div className="grid gap-4 text-app-body text-[var(--text-secondary)]">
          {report.notAssessed.length ? (
            <div>
              <PanelLabel>Not assessed by tests</PanelLabel>
              <BulletList className="mt-2" items={report.notAssessed} />
            </div>
          ) : null}
          {report.limitations.length ? (
            <div>
              <PanelLabel>Limitations</PanelLabel>
              <BulletList className="mt-2" items={report.limitations} />
            </div>
          ) : null}
          <p className="text-app-meta">
            Tests ran on {report.runner.label}
            {report.runner.isolated ? "." : ", which is not an isolated environment."} Hidden test code and reference solutions are never shared.
          </p>
        </div>
      </PanelSection>
    </>
  );
}
