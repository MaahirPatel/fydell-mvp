"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, EyeOff, Play } from "lucide-react";
import { demoScenario, referenceSolution } from "@/lib/sandbox-demo/catalog";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import type { LineRange } from "@/lib/sandbox-demo/diff";
import { deriveReport } from "@/lib/sandbox-demo/report";
import { candidateFinding, defaultFollowUp, reviewerObservation } from "@/lib/sandbox-demo/review";
import { runtimeFor } from "@/lib/sandbox-demo/runtime";
import { DECISIONS, emptyHandoff, emptyReview, type Attempt, type DecisionValue, type ReviewDraft } from "@/lib/sandbox-demo/state";
import type { RunRecord } from "@/lib/sandbox-demo/types";
import { DemoShell } from "./DemoShell";
import { BackToBrief, DemoAttemptNote, RunSummaryPanel, WrittenEvidencePanel, revealInDiff, type Highlight } from "./ReportView";
import { workspaceHref } from "./ScenarioBrief";
import { Transcript } from "./Transcript";
import { useHydrated, useScenarioProgress } from "./useDemoState";
import { runFiles } from "./useTestRun";
import { Badge, DiffView, Note, StateBadge, StatusIcon, TestList, cx, formatTime } from "./ui";
import s from "./demo.module.css";

const DECISION_LABEL: Record<DecisionValue, string> = { advance: "Advance", hold: "Hold", decline: "Decline" };

/** "Employer view of your submission": the visitor's own latest attempt, as a hiring team would review it. */
export function EmployerViewPage({ scenarioKey }: { scenarioKey: string }) {
  const scenario = demoScenario(scenarioKey);
  const hydrated = useHydrated();
  if (!scenario) return null;
  return <DemoShell>{hydrated ? <EmployerView scenario={scenario} /> : <p className={s.loading}>Opening the employer view</p>}</DemoShell>;
}

function EmployerView({ scenario }: { scenario: DemoScenario }) {
  const { progress, updateProgress } = useScenarioProgress(scenario);
  const attempt = progress.attempts[progress.attempts.length - 1] ?? null;
  return (
    <div className={s.briefPage}>
      <BackToBrief scenario={scenario} />
      {attempt ? (
        <>
          <div className={s.viewHead}>
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <span className={s.chip} data-tone="teal">
                  Browser preview
                </span>
              </div>
              <h1 className={s.h1}>Employer view of your submission</h1>
              <p className={s.lead}>Your submission from {formatTime(attempt.at)}, as a hiring team would review it. Nothing here is sent to anyone. In a real assessment these results come from the desktop app&apos;s isolated runner.</p>
            </div>
            <div className={s.actions}>
              <Link href={`/sandbox/${scenario.key}/report`} className="l-btn l-btn-quiet">
                Your report
              </Link>
            </div>
          </div>
          <DemoAttemptNote />
          <div className="mt-6">
            <ReviewBody
              key={attempt.id}
              scenario={scenario}
              attempt={attempt}
              review={progress.review}
              setReview={(patch) => updateProgress((p) => ({ ...p, review: { ...p.review, ...patch } }))}
            />
          </div>
        </>
      ) : (
        <div className={s.stack}>
          <h1 className={s.h1}>Employer view of your submission</h1>
          <Note>There is no submission to review yet. Submit from the workspace and the employer view of your work appears here.</Note>
          <div className={s.actions}>
            <Link href={workspaceHref(scenario.key)} className="l-btn l-btn-solid">
              <Play size={14} aria-hidden />
              Launch workspace
            </Link>
            <Link href={`/sandbox/${scenario.key}/example/review`} className="l-btn l-btn-quiet">
              Review an example submission
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** The same employer view, built from the reference solution run in this browser. Nothing here is stored. */
export function ExampleEmployerViewPage({ scenarioKey }: { scenarioKey: string }) {
  const scenario = demoScenario(scenarioKey);
  const hydrated = useHydrated();
  if (!scenario) return null;
  return <DemoShell>{hydrated ? <ExampleEmployerView scenario={scenario} /> : <p className={s.loading}>Opening the example review</p>}</DemoShell>;
}

function ExampleEmployerView({ scenario }: { scenario: DemoScenario }) {
  const reference = useMemo(() => referenceSolution(scenario.key), [scenario.key]);
  const [run, setRun] = useState<RunRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReviewState] = useState<ReviewDraft>(emptyReview);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    runFiles(scenario, reference, "all").then(
      (record) => {
        if (!cancelled) setRun(record);
      },
      (e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "The example could not run in this browser.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reference, scenario]);

  return (
    <div className={s.briefPage}>
      <Link href="/sandbox" className={s.backLink}>
        <ArrowLeft size={14} aria-hidden />
        Guided demo
      </Link>
      <div className={s.viewHead}>
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <span className={s.chip} data-tone="indigo">
              Illustrative example
            </span>
          </div>
          <h1 className={s.h1}>The hiring team&apos;s review</h1>
          <p className={s.lead}>
            {scenario.title}. This is what a reviewer sees for one submission: the changes, every test result, and room for a decision. Decisions stay in this
            browser and nobody is notified.
          </p>
        </div>
        <div className={s.actions}>
          <Link href={workspaceHref(scenario.key)} className="l-btn l-btn-quiet">
            <Play size={14} aria-hidden />
            Try the task yourself
          </Link>
        </div>
      </div>
      <DemoAttemptNote example />
      <div className="mt-6">
        {!reference ? (
          <Note>This simulation has no reference solution in the demo, so there is no example to review.</Note>
        ) : run ? (
          <ReviewBody
            scenario={scenario}
            attempt={{ id: "example", at: run.at, files: reference, run, handoff: emptyHandoff(), transcript: [] }}
            review={review}
            setReview={(patch) => setReviewState((r) => ({ ...r, ...patch }))}
            example
          />
        ) : (
          <div role="status" aria-live="polite">
            <Note>{error ?? "Running the example submission through the public and protected tests in your browser."}</Note>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewBody({
  scenario,
  attempt,
  review,
  setReview,
  example = false,
}: {
  scenario: DemoScenario;
  attempt: Attempt;
  review: ReviewDraft;
  setReview: (patch: Partial<ReviewDraft>) => void;
  example?: boolean;
}) {
  const rt = runtimeFor(scenario);
  const report = useMemo(() => deriveReport(scenario, attempt.files, attempt.run.results), [scenario, attempt]);
  const finding = candidateFinding(report);
  const followUp = review.followUp ?? defaultFollowUp(report);
  const privateNote = review.privateNote ?? reviewerObservation(report);
  const decision = review.decision;
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);
  const allLines = report.diffs.flatMap((d) => d.ranges.map((r) => ({ path: d.path, range: r })));

  function reveal(path: string, range: LineRange) {
    setHighlight({ path, ranges: [range] });
    window.requestAnimationFrame(() => revealInDiff(path, range));
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(followUp);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };

  const rows = attempt.run.results.flatMap((r) => {
    const meta = rt.testMeta(r.id);
    return meta ? [{ meta, status: r.status, message: r.message }] : [];
  });

  return (
    <div className={s.split}>
      <div className={s.stack}>
        <RunSummaryPanel report={report} run={attempt.run} noChangesText="The starter code was submitted unchanged, so nothing is assessed." />

        <section className={s.panel} aria-labelledby="rev-changes">
          <div className={s.panelHead}>
            <h2 id="rev-changes" className={s.h2}>
              Submitted changes
            </h2>
            <span className={s.chip}>{example ? "Example submission" : "Your submission"}</span>
          </div>
          <div className="max-h-[520px] overflow-auto" data-lenis-prevent data-diff-scroll>
            <DiffView diffs={report.diffs} highlight={highlight} />
          </div>
        </section>

        <section className={s.panel} aria-labelledby="rev-req">
          <div className={s.panelHead}>
            <h2 id="rev-req" className={s.h2}>
              Acceptance criteria to evidence
            </h2>
          </div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">Criterion from the brief</th>
                  <th scope="col">Tests</th>
                  <th scope="col">State</th>
                </tr>
              </thead>
              <tbody>
                {report.criteria.map((o) => (
                  <tr key={o.criterion.id}>
                    <td className="min-w-[220px] text-[var(--text-primary)]">{o.criterion.text}</td>
                    <td className="min-w-[200px]">
                      {o.tests.length > 0 ? (
                        <ul className={s.stackSm}>
                          {o.tests.map((t) => (
                            <li key={t.meta.id} className="flex gap-2">
                              <StatusIcon status={t.status} />
                              <span className={s.testName}>{t.meta.name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className={s.meta}>No test</span>
                      )}
                    </td>
                    <td>
                      <StateBadge state={o.state} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allLines.length > 0 ? (
            <div className={cx(s.panelBody, "border-t border-[var(--border-subtle)]")}>
              <p className={cx(s.label, "mb-1.5")}>Changed lines behind this evidence</p>
              <div className={s.evidenceRow}>
                {allLines.map(({ path, range }) => (
                  <button key={`${path}-${range.start}`} type="button" className={s.linkBtn} onClick={() => reveal(path, range)}>
                    {path} {range.start === range.end ? `line ${range.start}` : `lines ${range.start} to ${range.end}`}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className={s.panel} aria-labelledby="rev-tests">
          <div className={s.panelHead}>
            <h2 id="rev-tests" className={s.h2}>
              Test results
            </h2>
            <span className={s.chip}>Ran in your browser (preview)</span>
          </div>
          <div className={s.panelBody}>
            <p className={cx(s.meta, "mb-2")}>
              Reviewers see protected test names; the candidate only sees the requirement each one checks. Ran at {formatTime(attempt.run.at)}.
            </p>
            <TestList rows={rows} audience="evaluator" />
          </div>
        </section>

        <WrittenEvidencePanel scenario={scenario} handoff={attempt.handoff} transcript={attempt.transcript} example={example} />

        <section className={s.panel} aria-labelledby="rev-team">
          <div className={s.panelHead}>
            <h2 id="rev-team" className={s.h2}>
              Team conversation
            </h2>
            <span className={s.meta}>Check-ins are labelled</span>
          </div>
          <div className={s.panelBody}>
            {example ? (
              <p className={s.meta}>Not observed. The example has no candidate, so there is no conversation.</p>
            ) : (
              <Transcript scenario={scenario} messages={attempt.transcript} />
            )}
          </div>
        </section>
      </div>

      <aside className={cx(s.stack, s.sticky)} aria-label="Review">
        <section className={s.panel} aria-labelledby="rev-brief">
          <div className={s.panelHead}>
            <h2 id="rev-brief" className={s.h2}>
              Decision brief
            </h2>
          </div>
          <div className={cx(s.panelBody, s.stack)}>
            <ul className={s.stackSm}>
              {report.criteria.map((o, i) => (
                <li key={o.criterion.id} className="flex items-center justify-between gap-3">
                  <span className={s.body}>Criterion {i + 1}</span>
                  <StateBadge state={o.state} />
                </li>
              ))}
              <li className="flex items-center justify-between gap-3">
                <span className={s.body}>Reasoning and handoff</span>
                <Badge tone="neutral">Read, not scored</Badge>
              </li>
            </ul>
            <div>
              <p className={cx(s.label, "mb-2")} id="decision-label">
                Your decision
              </p>
              <div className={s.decisionBtns} role="group" aria-labelledby="decision-label">
                {DECISIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={s.decisionBtn}
                    aria-pressed={decision?.value === d}
                    onClick={() => setReview({ decision: { value: d, at: new Date().toISOString() } })}
                  >
                    {DECISION_LABEL[d]}
                  </button>
                ))}
              </div>
              <p className={cx(s.meta, "mt-2")} role="status" aria-live="polite">
                {decision
                  ? `${DECISION_LABEL[decision.value]} recorded in this browser at ${formatTime(decision.at)}. Nobody was notified.`
                  : "A decision is recorded only in this browser. Nobody is notified."}
              </p>
            </div>
          </div>
        </section>

        <section className={s.panel} aria-labelledby="rev-finding">
          <div className={s.panelHead}>
            <h2 id="rev-finding" className={s.h2}>
              Finding the candidate sees
            </h2>
          </div>
          <div className={cx(s.panelBody, s.stackSm)}>
            <p className={s.h3}>{finding.title}</p>
            <p className={s.body}>{finding.text}</p>
          </div>
        </section>

        <section className={s.panel} aria-labelledby="rev-private">
          <div className={s.panelHead}>
            <h2 id="rev-private" className={s.h2}>
              Reviewer observation
            </h2>
            <span className={s.privateTag}>
              <EyeOff size={12} aria-hidden />
              Private
            </span>
          </div>
          <div className={cx(s.panelBody, s.stackSm)}>
            <label htmlFor="private-note" className={s.help}>
              Private to the hiring team. The candidate never sees it. Drafted from the test results; edit it freely.
            </label>
            <textarea id="private-note" className={s.textarea} rows={6} value={privateNote} onChange={(e) => setReview({ privateNote: e.target.value })} />
          </div>
        </section>

        <section className={s.panel} aria-labelledby="rev-follow">
          <div className={s.panelHead}>
            <h2 id="rev-follow" className={s.h2}>
              Follow-up question
            </h2>
            <span className={s.meta}>Draft</span>
          </div>
          <div className={cx(s.panelBody, s.stackSm)}>
            <label htmlFor="follow-up" className={s.help}>
              Drafted from the first gap in the evidence. In an employer account it goes to the candidate&apos;s workspace thread; the demo keeps it in this
              browser.
            </label>
            <textarea
              id="follow-up"
              className={s.textarea}
              rows={4}
              value={followUp}
              onChange={(e) => {
                setCopied(null);
                setReview({ followUp: e.target.value });
              }}
            />
            <div className={s.actions}>
              <button type="button" className="l-btn l-btn-ghost" onClick={() => void copy()}>
                <Copy size={13} aria-hidden />
                Copy question
              </button>
            </div>
            <p className={s.meta} role="status" aria-live="polite">
              {copied === "done" ? "Copied to your clipboard." : copied === "failed" ? "This browser blocked the clipboard. Select the text to copy it." : ""}
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}
