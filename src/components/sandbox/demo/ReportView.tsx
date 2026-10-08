"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { demoScenario, referenceSolution } from "@/lib/sandbox-demo/catalog";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import type { LineRange } from "@/lib/sandbox-demo/diff";
import { deriveReport, writtenEvidence, type Report } from "@/lib/sandbox-demo/report";
import { RUN_LOCATION_LABEL } from "@/lib/sandbox-demo/runner";
import { emptyHandoff, type Attempt, type Handoff, type TeamMessage } from "@/lib/sandbox-demo/state";
import type { RunRecord } from "@/lib/sandbox-demo/types";
import { DemoShell } from "./DemoShell";
import { workspaceHref } from "./ScenarioBrief";
import { Transcript } from "./Transcript";
import { useHydrated, useScenarioProgress } from "./useDemoState";
import { runFiles } from "./useTestRun";
import { Badge, DiffView, Note, StateBadge, TestList, cx, formatTime } from "./ui";
import s from "./demo.module.css";

export type Highlight = { path: string; ranges: LineRange[] };

/**
 * Scrolls the diff's own scroll area to a changed range. The page itself only
 * moves when the diff panel is not on screen, as on narrow layouts.
 */
export function revealInDiff(path: string, range: LineRange) {
  const row = document.getElementById(`diff-${path}-${range.start}`);
  if (!row) return;
  const scroller = row.closest<HTMLElement>("[data-diff-scroll]");
  if (scroller) {
    const offset = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTo({ top: Math.max(0, offset - scroller.clientHeight / 3), behavior: "smooth" });
    const box = scroller.getBoundingClientRect();
    if (box.top < 0 || box.top > window.innerHeight - 80) scroller.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }
  row.scrollIntoView({ block: "center", behavior: "smooth" });
}

/** Where a view of this scenario can go back to. */
export function BackToBrief({ scenario }: { scenario: DemoScenario }) {
  return (
    <Link href={`/sandbox/${scenario.key}`} className={s.backLink}>
      <ArrowLeft size={14} aria-hidden />
      {scenario.title}
    </Link>
  );
}

export function DemoAttemptNote({ example = false }: { example?: boolean }) {
  return (
    <Note>
      {example
        ? "Illustrative example. Built from the scenario's reference solution, run through the real tests in your browser just now. It is not your result and no candidate wrote it. Real assessment results come from the isolated runner in the Fydell desktop app."
        : "Browser preview, not a candidate assessment. It was built in this browser from your own work, and nothing was sent to an employer. A real assessment runs in the Fydell desktop app, where results come from the isolated runner rather than the browser."}
    </Note>
  );
}

/** "Your report": only ever built from the visitor's latest real submission. */
export function YourReportPage({ scenarioKey }: { scenarioKey: string }) {
  const scenario = demoScenario(scenarioKey);
  const hydrated = useHydrated();
  if (!scenario) return null;
  return <DemoShell>{hydrated ? <YourReport scenario={scenario} /> : <p className={s.loading}>Opening your report</p>}</DemoShell>;
}

function YourReport({ scenario }: { scenario: DemoScenario }) {
  const { progress } = useScenarioProgress(scenario);
  const attempt = progress.attempts[progress.attempts.length - 1] ?? null;
  return (
    <div className={s.briefPage}>
      <BackToBrief scenario={scenario} />
      {attempt ? (
        <ReportView scenario={scenario} attempt={attempt} mode="yours" />
      ) : (
        <div className={s.stack}>
          <h1 className={s.h1}>Your report</h1>
          <Note>
            You have not submitted this simulation yet, so there is no report of your work. Submit from the workspace and your report appears here, built
            from the tests that ran on your files.
          </Note>
          <Link href={workspaceHref(scenario.key)} className={cx("l-btn l-btn-solid", s.alignStart)}>
            <Play size={14} aria-hidden />
            Launch workspace
          </Link>
        </div>
      )}
    </div>
  );
}

/** "See an example report": the reference solution, run for real, clearly labelled as an illustration. */
export function ExampleReportPage({ scenarioKey }: { scenarioKey: string }) {
  const scenario = demoScenario(scenarioKey);
  const hydrated = useHydrated();
  if (!scenario) return null;
  return <DemoShell>{hydrated ? <ExampleReport scenario={scenario} /> : <p className={s.loading}>Opening the example report</p>}</DemoShell>;
}

function ExampleReport({ scenario }: { scenario: DemoScenario }) {
  const reference = useMemo(() => referenceSolution(scenario.key), [scenario.key]);
  const [run, setRun] = useState<RunRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <BackToBrief scenario={scenario} />
      {!reference ? (
        <Note>This simulation has no reference solution in the demo, so there is no example report.</Note>
      ) : run ? (
        <ReportView scenario={scenario} attempt={{ id: "example", at: run.at, files: reference, run, handoff: emptyHandoff(), transcript: [] }} mode="example" />
      ) : (
        <div className={s.stack}>
          <h1 className={s.h1}>Example report</h1>
          <div role="status" aria-live="polite">
            <Note>{error ?? "Running the reference solution through the public and protected tests in your browser."}</Note>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReportView({ scenario, attempt, mode }: { scenario: DemoScenario; attempt: Attempt; mode: "yours" | "example" }) {
  const report = useMemo(() => deriveReport(scenario, attempt.files, attempt.run.results), [scenario, attempt]);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const example = mode === "example";

  function reveal(path: string, range: LineRange) {
    setHighlight({ path, ranges: [range] });
    window.requestAnimationFrame(() => revealInDiff(path, range));
  }

  return (
    <div className={s.stack}>
      <div className={s.viewHead}>
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {example ? (
              <span className={s.chip} data-tone="indigo">
                Illustrative example
              </span>
            ) : (
              <span className={s.chip} data-tone="teal">
                Browser preview
              </span>
            )}
          </div>
          <h1 className={s.h1}>{example ? "Example report" : "Your report"}</h1>
          <p className={s.lead}>
            {example ? "Reference solution, run" : "Submitted"} at {formatTime(attempt.at)}. Each state comes from the tests listed under it. There are no
            scores.
          </p>
        </div>
        <div className={s.actions}>
          {example ? null : (
            <>
              <Link href={workspaceHref(scenario.key)} className="l-btn l-btn-quiet">
                <ArrowLeft size={14} aria-hidden />
                Back to the workspace
              </Link>
              <Link href={`/sandbox/${scenario.key}/review`} className="l-btn l-btn-solid">
                Employer view of your submission
                <ArrowRight size={14} aria-hidden />
              </Link>
            </>
          )}
        </div>
      </div>
      <DemoAttemptNote example={example} />

      <div className={cx(s.split, s.splitWide)}>
        <div className={s.stack}>
          <RunSummaryPanel report={report} run={attempt.run} noChangesText={example ? null : "You submitted the starter code unchanged, so nothing is assessed."} />

          {report.criteria.map((o, i) => (
            <section key={o.criterion.id} className={cx(s.panel, s.criterion)} aria-labelledby={`rep-${o.criterion.id}`}>
              <div className={s.criterionHead}>
                <span className={s.critNum}>{i + 1}</span>
                <h2 id={`rep-${o.criterion.id}`} className={s.h3}>
                  {o.criterion.text}
                </h2>
                <StateBadge state={o.state} />
              </div>
              <p className={cx(s.meta, "mt-2")}>{o.reason}</p>
              {o.tests.length > 0 ? (
                <div className="mt-3">
                  <p className={s.label}>Supporting tests</p>
                  <TestList audience="candidate" rows={o.tests} />
                </div>
              ) : null}
            </section>
          ))}

          <WrittenEvidencePanel scenario={scenario} handoff={attempt.handoff} transcript={attempt.transcript} example={example} />

          <section className={s.panel} aria-labelledby="rep-team">
            <div className={s.panelHead}>
              <h2 id="rep-team" className={s.h2}>
                Team conversation
              </h2>
              <span className={s.meta}>As it stood when submitted</span>
            </div>
            <div className={s.panelBody}>
              {example ? (
                <p className={s.meta}>Not observed. The example has no candidate, so there is no conversation.</p>
              ) : (
                <Transcript scenario={scenario} messages={attempt.transcript} />
              )}
            </div>
          </section>
          <p className={s.meta}>Protected tests are described by the requirement they check. Their code stays private, as it would in a real simulation.</p>
        </div>

        <aside className={cx(s.panel, s.sticky)} aria-label={example ? "Reference changes" : "Your changes"}>
          <div className={s.panelHead}>
            <h2 className={s.h2}>{example ? "Reference changes" : "Your changes"}</h2>
            <span className={s.meta}>Compared with the starter code</span>
          </div>
          <ChangedLines report={report} onReveal={reveal} />
          <div className="max-h-[calc(100vh-260px)] overflow-auto" data-lenis-prevent data-diff-scroll>
            <DiffView diffs={report.diffs} highlight={highlight} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export function RunSummaryPanel({ report, run, noChangesText }: { report: Report; run: RunRecord; noChangesText: string | null }) {
  return (
    <div className={cx(s.panel, s.panelBody, "flex flex-wrap items-center gap-x-8 gap-y-2")}>
      <p className={s.runLabel}>
        <span className={s.inlineCode}>{RUN_LOCATION_LABEL}</span>
      </p>
      <p className={s.body}>
        Public tests: {report.publicTests.passed} of {report.publicTests.total} passed
      </p>
      <p className={s.body}>
        Protected tests: {report.protectedTests.passed} of {report.protectedTests.total} passed
      </p>
      {run.outcomeMessage ? <p className={s.error}>{run.outcomeMessage}</p> : null}
      {report.noChanges && noChangesText ? <p className={s.meta}>{noChangesText}</p> : null}
    </div>
  );
}

function ChangedLines({ report, onReveal }: { report: Report; onReveal: (path: string, range: LineRange) => void }) {
  const lines = report.diffs.flatMap((d) => d.ranges.map((r) => ({ path: d.path, range: r })));
  if (lines.length === 0) return null;
  return (
    <div className={cx(s.panelBody, s.evidenceRow, "border-b border-[var(--border-subtle)]")}>
      {lines.map(({ path, range }) => (
        <button key={`${path}-${range.start}`} type="button" className={s.linkBtn} onClick={() => onReveal(path, range)}>
          {path} {range.start === range.end ? `line ${range.start}` : `lines ${range.start} to ${range.end}`}
        </button>
      ))}
    </div>
  );
}

/** The candidate's own words. Read by the reviewer and never scored. */
export function WrittenEvidencePanel({
  scenario,
  handoff,
  transcript,
  example = false,
}: {
  scenario: DemoScenario;
  handoff: Handoff;
  transcript: TeamMessage[];
  example?: boolean;
}) {
  const evidence = writtenEvidence(scenario, handoff, transcript);
  const observed = evidence.handoff.length > 0 || evidence.messages.length > 0;
  return (
    <section className={cx(s.panel, s.criterion)} aria-labelledby="rep-written">
      <div className={s.criterionHead}>
        <h2 id="rep-written" className={s.h3}>
          Reasoning and handoff
        </h2>
        <Badge tone={observed ? "info" : "neutral"}>{observed ? "Read by the reviewer" : "Not observed"}</Badge>
      </div>
      <p className={cx(s.meta, "mt-2")}>Read by the reviewer; Fydell does not score writing. Fewer or shorter messages never count against anyone.</p>
      {observed ? (
        <div className={cx(s.stack, "mt-3")}>
          {evidence.handoff.map((h) => (
            <div key={h.field} className={s.stackSm}>
              <p className={s.label}>{h.prompt}</p>
              <p className={s.quote}>{h.text}</p>
            </div>
          ))}
          {evidence.messages.length > 0 ? (
            <div className={s.stackSm}>
              <p className={s.label}>Messages the candidate sent</p>
              <ul className={s.stackSm}>
                {evidence.messages.map((m) => (
                  <li key={m.id} className={s.quote}>
                    <span className={s.meta}>To {m.to}, {formatTime(m.at)}</span>
                    <br />
                    {m.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={cx(s.body, "mt-2")}>
          {example ? "The example has no handoff or messages." : "No handoff answers or team messages were written before submitting."}
        </p>
      )}
    </section>
  );
}
