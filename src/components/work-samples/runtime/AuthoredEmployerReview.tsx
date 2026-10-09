import { Status, type StatusKind } from "@/components/ui/report";
import { PanelLabel, PanelSection } from "@/components/ui/Panel";
import { BulletList, Disclosure, Facts } from "@/components/eng/CandidateParts";
import { AUTHORED_STATE_LABEL, type AuthoredFile, type CandidateAcceptanceResult, type EmployerAuthoredEvaluation } from "@/lib/eng/authored/types";
import type { AuthoredDecisionBrief, AuthoredFollowUp } from "@/lib/eng/authored/follow-ups";
import { STATE_KIND } from "./AuthoredReport";
import { CopyBriefButton } from "./CopyBriefButton";
import { OUTCOME_LABEL, outcomeKind } from "./PublicTestResults";

const ACCEPTANCE_KIND: Record<CandidateAcceptanceResult["state"], { label: string; kind: StatusKind }> = {
  confirmed: { label: "Confirmed", kind: "success" },
  not_confirmed: { label: "Not confirmed", kind: "failed" },
  no_result: { label: "No result", kind: "neutral" },
};

/**
 * Employer view of an automated evaluation. Includes protected test names
 * and runner output, so it must only be rendered on employer pages.
 */
export function AuthoredEvaluationPanel({ evaluation }: { evaluation: EmployerAuthoredEvaluation }) {
  const { runner, suite } = evaluation;
  return (
    <>
      <PanelSection title="Automated evaluation" description="States come only from tests that ran. There is no overall score, and reviewer-judged areas are left for you.">
        <Facts
          items={[
            { label: "Runner", value: runner.isolated || /not isolated/i.test(runner.label) ? runner.label : `${runner.label}, not isolated` },
            { label: "Suite", value: suite.outcome === "timeout" ? `Timed out after ${(suite.durationMs / 1000).toFixed(0)}s` : `Finished in ${(suite.durationMs / 1000).toFixed(1)}s, exit code ${suite.exitCode ?? "none"}` },
            { label: "Command", value: <code className="font-mono text-app-meta">{suite.command}</code> },
            { label: "Tests", value: `${evaluation.tests.filter((t) => t.outcome === "passed").length} of ${evaluation.tests.length} passed` },
          ]}
        />
      </PanelSection>
      <PanelSection title="Criteria">
        <ul className="grid gap-4">
          {evaluation.criteria.map((c) => (
            <li key={c.id} className="grid gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-app-body font-medium text-[var(--text-primary)]">{c.label}</span>
                <Status kind={STATE_KIND[c.state]}>{c.judgedBy === "reviewer" ? "Not assessed: awaiting reviewer" : AUTHORED_STATE_LABEL[c.state]}</Status>
              </div>
              <p className="max-w-[72ch] text-app-body leading-[1.55] text-[var(--text-body)]">{c.rationale}</p>
              {c.judgedBy === "tests" ? (
                <p className="text-app-meta text-[var(--text-tertiary)]">
                  Acceptance criteria {c.acceptanceCriterionIds.join(", ") || "none"}: {c.evidence.confirmed} confirmed, {c.evidence.notConfirmed} not confirmed, {c.evidence.noResult} without a result.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </PanelSection>
      <PanelSection title="Acceptance criteria">
        <ol className="grid gap-3">
          {evaluation.acceptance.map((a) => (
            <li key={a.id} className="grid gap-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="max-w-[64ch] text-app-body text-[var(--text-primary)]">
                  <span className="mr-2 font-mono text-app-meta text-[var(--text-tertiary)]">{a.id}</span>
                  {a.text}
                </p>
                <Status kind={ACCEPTANCE_KIND[a.state].kind}>{ACCEPTANCE_KIND[a.state].label}</Status>
              </div>
              <p className="text-app-meta tabular-nums text-[var(--text-tertiary)]">
                {a.passed} passed, {a.failed} failed, {a.missing} did not run
              </p>
            </li>
          ))}
        </ol>
      </PanelSection>
      <PanelSection title="Tests" description="Protected tests were not visible to the candidate.">
        <ul className="grid divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
          {evaluation.tests.map((t) => (
            <li key={`${t.file}:${t.name}`} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-app-meta text-[var(--text-primary)]" title={t.name}>
                  {t.name}
                </p>
                <p className="text-app-meta text-[var(--text-tertiary)]">
                  {t.visibility === "protected" ? "Protected" : "Public"} · {t.file}
                  {t.criterionIds.length ? ` · ${t.criterionIds.join(", ")}` : ""}
                </p>
              </div>
              <Status kind={outcomeKind(t.outcome)}>{OUTCOME_LABEL[t.outcome]}</Status>
            </li>
          ))}
        </ul>
      </PanelSection>
      {evaluation.limitations.length || evaluation.output ? (
        <PanelSection title="Limitations and output">
          {evaluation.limitations.length ? <BulletList className="text-app-body text-[var(--text-secondary)]" items={evaluation.limitations} /> : null}
          {evaluation.output ? (
            <div className="mt-3">
              <Disclosure summary="Runner output">
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-2.5 font-mono text-app-meta leading-[1.55] text-[var(--text-primary)]">
                  {evaluation.output}
                </pre>
              </Disclosure>
            </div>
          ) : null}
        </PanelSection>
      ) : null}
    </>
  );
}

export function AuthoredFollowUpsPanel({ followUps }: { followUps: AuthoredFollowUp[] }) {
  return (
    <PanelSection title="Follow-up questions" description="Each question comes from a finding above. Use them in the next interview; none are sent to the candidate.">
      {followUps.length ? (
        <ol className="grid gap-4">
          {followUps.map((f, i) => (
            <li key={`${f.criterionId}-${i}`} className="grid gap-1">
              <p className="max-w-[72ch] text-app-body leading-[1.55] text-[var(--text-primary)]">{f.question}</p>
              <p className="text-app-meta text-[var(--text-tertiary)]">
                {f.criterionLabel}. {f.basis}
              </p>
              {f.tests.length ? (
                <p className="text-app-meta text-[var(--text-tertiary)]">
                  Tests: <span className="font-mono text-app-meta">{f.tests.join(", ")}</span>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-app-body text-[var(--text-secondary)]">The evaluation found no gaps to follow up on.</p>
      )}
    </PanelSection>
  );
}

function BriefLine({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <PanelLabel>{label}</PanelLabel>
      <p className="mt-0.5 text-app-meta text-[var(--text-body)]">{items.join(", ")}</p>
    </div>
  );
}

export function AuthoredBriefPanel({ brief, text }: { brief: AuthoredDecisionBrief; text: string }) {
  const { acceptance } = brief;
  return (
    <PanelSection title="Decision brief" description="What the evidence supports, in one place.">
      <div className="grid gap-3">
        <p className="text-app-body text-[var(--text-primary)]">
          {acceptance.confirmed} of {acceptance.total} acceptance criteria confirmed by tests
          {acceptance.notConfirmed ? `, ${acceptance.notConfirmed} not confirmed` : ""}
          {acceptance.noResult ? `, ${acceptance.noResult} without a result` : ""}.
        </p>
        <BriefLine label="Demonstrated" items={brief.demonstrated} />
        <BriefLine label="Partially demonstrated" items={brief.partial} />
        <BriefLine label="Concern observed" items={brief.concerns} />
        <BriefLine label="Left for you" items={brief.notAssessed} />
        <CopyBriefButton text={text} />
      </div>
    </PanelSection>
  );
}

export function AuthoredSubmissionPanel({
  files,
  changedPaths,
  handoff,
  aiDisclosure,
}: {
  files: AuthoredFile[] | null;
  changedPaths: Set<string>;
  handoff: { id: string; label: string; answer: string }[];
  aiDisclosure: string | null;
}) {
  return (
    <>
      <PanelSection title="Handoff">
        {handoff.length ? (
          <div className="grid gap-4">
            {handoff.map((h) => (
              <div key={h.id} id={`handoff-${h.id}`} className="scroll-mt-6">
                <PanelLabel>{h.label}</PanelLabel>
                <p className="mt-1 max-w-[72ch] whitespace-pre-wrap text-app-body leading-[1.6] text-[var(--text-body)]">{h.answer || "No answer."}</p>
              </div>
            ))}
            {aiDisclosure ? (
              <div>
                <PanelLabel>AI assistance, as stated by the candidate</PanelLabel>
                <p className="mt-1 max-w-[72ch] whitespace-pre-wrap text-app-body text-[var(--text-body)]">{aiDisclosure}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-app-body text-[var(--text-secondary)]">No handoff was recorded.</p>
        )}
      </PanelSection>
      <PanelSection title="Submitted files" description="Read from the sealed archive.">
        {files ? (
          <div>
            {[...files]
              .sort((a, b) => Number(changedPaths.has(b.path)) - Number(changedPaths.has(a.path)) || a.path.localeCompare(b.path))
              .map((f) => (
                <Disclosure key={f.path} summary={`${f.path}${changedPaths.has(f.path) ? " (changed)" : ""}`}>
                  <pre className="max-h-[420px] overflow-auto whitespace-pre rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-2.5 font-mono text-app-meta leading-[1.55] text-[var(--text-primary)]">
                    {f.content}
                  </pre>
                </Disclosure>
              ))}
          </div>
        ) : (
          <p className="text-app-body text-[var(--text-secondary)]">The archive could not be read.</p>
        )}
      </PanelSection>
    </>
  );
}
