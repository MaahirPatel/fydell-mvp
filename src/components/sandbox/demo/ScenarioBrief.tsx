"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, CircleX, FileText, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { demoScenario, referenceSolution } from "@/lib/sandbox-demo/catalog";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import { validationChecks, type ValidationCheck } from "@/lib/sandbox-demo/report";
import { RUN_LOCATION_LABEL, RUN_TIMEOUT_MS } from "@/lib/sandbox-demo/runner";
import { runtimeFor } from "@/lib/sandbox-demo/runtime";
import { progressStatus } from "@/lib/sandbox-demo/state";
import { CHECKIN_RULES, CHECKIN_TRIGGERS } from "@/lib/sandbox-demo/team";
import { checkinSenderId } from "@/lib/sandbox-demo/team-client";
import { DemoShell } from "./DemoShell";
import { DIFFICULTY_LABEL } from "./SandboxLibrary";
import { Avatar } from "./Transcript";
import { useHydrated, useScenarioProgress } from "./useDemoState";
import { runFiles } from "./useTestRun";
import { Note, cx, formatTime } from "./ui";
import s from "./demo.module.css";

export function workspaceHref(key: string) {
  return `/sandbox/${key}/workspace`;
}

/** A simulation's brief page: what the visitor will do, the brief, the team and what finishing produces. */
export default function ScenarioBrief({ scenarioKey }: { scenarioKey: string }) {
  const scenario = demoScenario(scenarioKey);
  const hydrated = useHydrated();
  if (!scenario) return null;
  return (
    <DemoShell>
      <div className={s.briefPage}>
        <Link href="/sandbox" className={s.backLink}>
          <ArrowLeft size={14} aria-hidden />
          All simulations
        </Link>
        <BriefHeader scenario={scenario} />
        <div className={cx(s.split, s.splitBrief)}>
          <div className={s.stackLg}>
            <BriefBody scenario={scenario} />
          </div>
          <aside className={cx(s.stack, s.sticky)} aria-label="Start">
            {hydrated ? <StartPanel scenario={scenario} /> : <div className={cx(s.panel, s.panelBody)} aria-hidden />}
          </aside>
        </div>
      </div>
    </DemoShell>
  );
}

function BriefHeader({ scenario }: { scenario: DemoScenario }) {
  return (
    <div className={s.briefHead}>
      <div className={s.chips}>
        <span className={s.chip} data-tone="indigo">
          {scenario.trackLabel}
        </span>
        <span className={s.chip}>{scenario.taskFamilyLabel}</span>
        <span className={s.chip}>{scenario.stackLabel}</span>
        <span className={s.chip}>About {scenario.minutes} min</span>
        <span className={s.chip}>{DIFFICULTY_LABEL[scenario.difficulty]}</span>
        <span className={s.chip}>{scenario.levelLabel}</span>
      </div>
      <h1 className={s.h1}>{scenario.title}</h1>
      <p className={s.lead}>{scenario.summary}</p>
    </div>
  );
}

function BriefBody({ scenario }: { scenario: DemoScenario }) {
  const rt = runtimeFor(scenario);
  return (
    <>
      <section className={s.panel} aria-labelledby="what-you-do">
        <div className={s.panelHead}>
          <h2 id="what-you-do" className={s.h2}>
            What you will do
          </h2>
        </div>
        <ol className={cx(s.panelBody, s.doList)}>
          <li>
            <span className={s.doNum}>1</span>
            <span>Open a full-screen workspace with the code, this brief and your team. Read what you need; nothing is timed.</span>
          </li>
          <li>
            <span className={s.doNum}>2</span>
            <span>
              Edit the files and run the public tests. They run in your browser, as a preview of the isolated runner in the desktop app. Message your teammates whenever it
              helps.
            </span>
          </li>
          <li>
            <span className={s.doNum}>3</span>
            <span>
              Submit with a short handoff. Protected tests run on your files and you get a report built from what actually ran, plus the view an employer
              would see.
            </span>
          </li>
        </ol>
      </section>

      <section aria-labelledby="brief-title" className={s.stack}>
        <h2 id="brief-title" className={s.h2Lg}>
          The brief
        </h2>
        <div className={s.stackSm}>
          {scenario.brief.context.map((p) => (
            <p key={p} className={s.body}>
              {p}
            </p>
          ))}
          <p className={cx(s.body, s.strongText)}>{scenario.brief.task}</p>
        </div>
        <div>
          <h3 className={s.h3}>Acceptance criteria</h3>
          <ol className={cx(s.body, "mt-2 list-decimal space-y-1 pl-5")}>
            {scenario.criteria.map((c) => (
              <li key={c.id}>{c.text}</li>
            ))}
          </ol>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <h3 className={s.h3}>Constraints</h3>
            <ul className={cx(s.body, "mt-2 list-disc space-y-1 pl-5")}>
              {scenario.brief.constraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          {scenario.brief.outOfScope.length > 0 ? (
            <div>
              <h3 className={s.h3}>Out of scope</h3>
              <ul className={cx(s.body, "mt-2 list-disc space-y-1 pl-5")}>
                {scenario.brief.outOfScope.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <p className={s.meta}>
          {scenario.brief.aiPolicy} Business context: {scenario.businessContext} {scenario.testCommandLabel}
        </p>
      </section>

      <section aria-labelledby="team-title" className={s.stack}>
        <div>
          <h2 id="team-title" className={s.h2Lg}>
            Your teammates
          </h2>
          <p className={cx(s.body, "mt-1")}>
            Simulated teammates, written by a language model from this scenario&apos;s facts and what they can see of your work: changed files and test
            results. They never edit your code, and how many messages you send is never scored.
          </p>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {scenario.teammates.map((m) => (
            <li key={m.id} className={cx(s.panel, s.panelBody, s.stackSm)}>
              <div className="flex items-center gap-3">
                <Avatar scenario={scenario} id={m.id} large />
                <div>
                  <h3 className={s.h3}>{m.name}</h3>
                  <p className={s.meta}>{m.title}</p>
                </div>
              </div>
              <p className={cx(s.label, "mt-1")}>Can help with</p>
              <ul className={cx(s.body, "list-disc space-y-1 pl-5")}>
                {m.knows.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
              <p className={cx(s.label, "mt-1")}>Will not share</p>
              <p className={s.body}>{m.wontShare}</p>
            </li>
          ))}
        </ul>
        <details className={s.details}>
          <summary>When do teammates check in?</summary>
          <ul className={cx(s.stackSm, "mt-2")}>
            {CHECKIN_TRIGGERS.map((trigger) => {
              const sender = scenario.teammates.find((m) => m.id === checkinSenderId(scenario, trigger));
              return (
                <li key={trigger} className="flex items-start gap-2.5">
                  <Avatar scenario={scenario} id={sender?.id ?? ""} />
                  <span className={s.body}>
                    <span className={s.strongText}>{sender?.name ?? "A teammate"}</span>: {CHECKIN_RULES[trigger]}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={cx(s.meta, "mt-2")}>Each check-in happens at most once.</p>
        </details>
      </section>

      <section aria-labelledby="produces-title" className={s.stack}>
        <h2 id="produces-title" className={s.h2Lg}>
          What finishing it produces
        </h2>
        <ul className={s.pathList}>
          <li>
            <CircleCheck size={15} aria-hidden />
            <span>
              A report with one state per acceptance criterion: demonstrated, partially demonstrated, concern observed or not assessed. Each comes from
              the {rt.publicTests.length} public and {rt.tests.length - rt.publicTests.length} protected tests that ran on your files. There are no scores.
            </span>
          </li>
          <li>
            <CircleCheck size={15} aria-hidden />
            <span>Your handoff answers and the team conversation, shown to the reviewer as written. Writing is read, not scored.</span>
          </li>
          <li>
            <CircleCheck size={15} aria-hidden />
            <span>The employer view of your submission: the diff, every test result, a decision brief and a drafted follow-up question.</span>
          </li>
        </ul>
        <Note>
          This is a browser preview, not a candidate assessment. Real assessments run in the Fydell desktop app on the candidate&apos;s machine, with an isolated runner. Nothing is sent to an employer, and your files stay in this browser. Only messages to
          teammates, with a short summary of your changes and test results, go to Fydell&apos;s server to write the replies.
        </Note>
      </section>

      <HowBuilt scenario={scenario} />
    </>
  );
}

function StartPanel({ scenario }: { scenario: DemoScenario }) {
  const { progress, started, reset } = useScenarioProgress(scenario);
  const status = started ? progressStatus(progress) : "not_started";
  const latest = progress.attempts[progress.attempts.length - 1] ?? null;
  const hasExample = referenceSolution(scenario.key) !== null;
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
      <section className={s.panel} aria-labelledby="start-title">
        <div className={cx(s.panelBody, s.stack)}>
          <div>
            <h2 id="start-title" className={s.h2}>
              {status === "not_started" ? "Ready when you are" : status === "submitted" ? "You submitted this simulation" : "Your workspace is saved"}
            </h2>
            <p className={cx(s.meta, "mt-1")}>
              {status === "not_started"
                ? `About ${scenario.minutes} minutes, with no hard limit. Works best on a laptop or desktop.`
                : status === "submitted" && latest
                  ? `Latest submission at ${formatTime(latest.at)}. You can keep working and submit again.`
                  : "Saved in this browser. Pick up where you left off."}
            </p>
          </div>
          <Link href={workspaceHref(scenario.key)} className="l-btn l-btn-solid w-full justify-center">
            <Play size={14} aria-hidden />
            {status === "not_started" ? "Launch workspace" : "Resume workspace"}
          </Link>
          {latest ? (
            <div className={s.stackSm}>
              <Link href={`/sandbox/${scenario.key}/report`} className="l-btn l-btn-ghost w-full justify-center">
                <FileText size={14} aria-hidden />
                Your report
              </Link>
              <Link href={`/sandbox/${scenario.key}/review`} className="l-btn l-btn-ghost w-full justify-center">
                Employer view of your submission
                <ArrowRight size={14} aria-hidden />
              </Link>
            </div>
          ) : null}
          {status !== "not_started" ? (
            confirmReset ? (
              <div role="group" aria-label="Confirm start over" className={cx(s.confirmBox, s.stackSm)}>
                <p className={s.body}>Clear your edits, test runs, team thread and submissions for this simulation? Other simulations are kept.</p>
                <div className={s.actions}>
                  <button type="button" className="l-btn l-btn-quiet" onClick={() => setConfirmReset(false)}>
                    Keep my work
                  </button>
                  <button
                    type="button"
                    className="l-btn l-btn-solid"
                    onClick={() => {
                      reset();
                      setConfirmReset(false);
                    }}
                  >
                    Clear and start over
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className={cx("l-btn l-btn-quiet", s.alignStart)} onClick={() => setConfirmReset(true)}>
                <RotateCcw size={13} aria-hidden />
                Start over
              </button>
            )
          ) : null}
        </div>
      </section>

      {hasExample ? (
        <section className={s.panel} aria-labelledby="example-title">
          <div className={cx(s.panelBody, s.stackSm)}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="example-title" className={s.h3}>
                See an example report
              </h2>
              <span className={s.chip} data-tone="indigo">
                Illustrative example
              </span>
            </div>
            <p className={s.meta}>Built by running the scenario&apos;s reference solution through the same tests in your browser. It is not your result.</p>
            <Link href={`/sandbox/${scenario.key}/example`} className={cx("l-btn l-btn-ghost", s.alignStart)}>
              See an example report
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </section>
      ) : null}
    </>
  );
}

function HowBuilt({ scenario }: { scenario: DemoScenario }) {
  const reference = referenceSolution(scenario.key);
  const [checks, setChecks] = useState<{ at: string; list: ValidationCheck[] } | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!reference || running) return;
    setRunning(true);
    try {
      const starter = await runFiles(scenario, {}, "all");
      const solved = await runFiles(scenario, reference, "all");
      setChecks({ at: solved.at, list: validationChecks(scenario, starter.results, solved.results) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <details className={cx(s.panel, s.disclosure)}>
      <summary>
        <ShieldCheck size={15} aria-hidden />
        How this simulation was built
      </summary>
      <div className={cx(s.panelBody, s.stack)}>
        <p className={s.body}>
          It comes from a role-model scenario package in Fydell&apos;s {scenario.trackLabel} track, version {scenario.version}. The demo runs that package as
          is: the same files, the same public and protected tests and the same acceptance criteria.
        </p>
        <div className={s.stackSm}>
          <h3 className={s.h3}>Checks a package passes before it is published</h3>
          <ul className={s.pathList}>
            <li>
              <CircleCheck size={15} aria-hidden />
              <span>Every test loads and reports a result.</span>
            </li>
            <li>
              <CircleCheck size={15} aria-hidden />
              <span>The starter code fails the tests that describe the work, so there is something real to do.</span>
            </li>
            <li>
              <CircleCheck size={15} aria-hidden />
              <span>A reference solution passes every public and protected test.</span>
            </li>
          </ul>
          {reference ? (
            <div className={s.stackSm}>
              <button type="button" className={cx("l-btn l-btn-ghost", s.alignStart, running && s.btnBusy)} onClick={() => void run()} aria-busy={running}>
                <Play size={13} aria-hidden />
                {running ? "Running in your browser" : checks ? "Run the checks again" : "Run these checks in your browser"}
              </button>
              <div role="status" aria-live="polite">
                {checks ? (
                  <ul className={cx(s.stackSm, "mt-1")}>
                    {checks.list.map((c) => (
                      <li key={c.id} className="flex gap-2.5">
                        {c.passed ? (
                          <CircleCheck size={16} className={cx(s.pass, "mt-0.5 shrink-0")} aria-label="Passed" />
                        ) : (
                          <CircleX size={16} className={cx(s.fail, "mt-0.5 shrink-0")} aria-label="Failed" />
                        )}
                        <span>
                          <span className={s.strongText}>{c.label}.</span> <span className={s.meta}>{c.detail}</span>
                        </span>
                      </li>
                    ))}
                    <li className={s.meta}>
                      {RUN_LOCATION_LABEL} at {formatTime(checks.at)}. Each run is stopped after {RUN_TIMEOUT_MS / 1000} seconds.
                    </li>
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className={s.stackSm}>
          <h3 className={s.h3}>What an employer can change</h3>
          <p className={s.body}>
            The level, the suggested time, the AI policy, the capabilities the rubric emphasises and the description of what the candidate works on. A
            changed package is validated again with the same checks before candidates can open it.
          </p>
        </div>
      </div>
    </details>
  );
}
