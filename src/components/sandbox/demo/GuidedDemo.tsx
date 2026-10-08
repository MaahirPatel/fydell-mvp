"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Clock, Code2, Download, FileText, Play, UserRound } from "lucide-react";
import ColorStage from "@/components/marketing/site/ColorStage";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import ProfileWorkspace from "@/components/marketing/site/ProfileWorkspace";
import { playableScenarios } from "@/lib/sandbox-demo/catalog";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import { browserStorage, loadState, progressStatus, type ProgressStatus } from "@/lib/sandbox-demo/state";
import { DemoShell } from "./DemoShell";
import { workspaceHref } from "./ScenarioBrief";
import { Avatar } from "./Transcript";
import { useHydrated } from "./useDemoState";
import { DIFFICULTY_LABEL, cx } from "./ui";
import s from "./guided.module.css";

const TASK_STATE: Record<ProgressStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
};

/** The public demo: one engineer's profile, the task they do, and the hiring team's review of it. */
export default function GuidedDemo() {
  const scenario = useMemo(() => playableScenarios()[0] ?? null, []);
  const hydrated = useHydrated();
  const status = useMemo<ProgressStatus>(() => {
    if (!hydrated || !scenario) return "not_started";
    return progressStatus(loadState(browserStorage()).scenarios[scenario.key]);
  }, [hydrated, scenario]);

  return (
    <DemoShell>
      <header className={s.hero}>
        <h1 className={s.title}>Walk through a hiring loop</h1>
        <p className={s.lead}>
          Follow one engineer from their profile, into a real task, and on to the hiring team&apos;s review. Everything runs in this browser with fictional
          data. No account is needed and nothing is sent to anyone.
        </p>
        <nav aria-label="Demo steps" className={s.steps}>
          <ol>
            <StepLink n={1} href="#profile" tone="engineer" label="The engineer's profile" state="Example" />
            <StepLink n={2} href="#task" tone="simulation" label="The task" state={scenario ? TASK_STATE[status] : "Unavailable"} />
            <StepLink n={3} href="#review" tone="employer" label="The team's review" state={status === "submitted" ? "Your submission is ready" : "Example ready"} />
          </ol>
        </nav>
      </header>

      <section id="profile" aria-labelledby="profile-title" className={s.section}>
        <div className={s.intro}>
          <span className={s.num} data-tone="engineer" aria-hidden>
            1
          </span>
          <div>
            <h2 id="profile-title" className={s.h2}>
              Start where the candidate starts
            </h2>
            <p className={s.body}>
              An engineer applies with a Passport: their projects, their part in each, and findings that open to the source lines they cite. Select a highlight
              to follow one.
            </p>
            <Link href="/developers" className={s.textLink}>
              More about Passports
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
        <ColorStage tone="engineer" compact>
          <ProductFrame
            interactive
            title="Example Passport"
            label="One project in an example Passport: its purpose, the engineer's part, and a finding opened to the source lines it cites. Select a highlight to open it."
          >
            <ProfileWorkspace />
          </ProductFrame>
        </ColorStage>
      </section>

      <section id="task" aria-labelledby="task-title" className={s.section}>
        <div className={s.intro}>
          <span className={s.num} data-tone="simulation" aria-hidden>
            2
          </span>
          <div>
            <h2 id="task-title" className={s.h2}>
              Do the task they would do
            </h2>
            <p className={s.body}>
              Edit the code, run the public tests in your browser and ask the simulated teammates what you need. Submit with a short handoff and the
              protected tests run on your files.
            </p>
          </div>
        </div>
        <ColorStage tone="simulation" compact>
          {scenario ? <TaskCard scenario={scenario} status={status} /> : <p className={s.body}>The browser task is unavailable right now.</p>}
        </ColorStage>
      </section>

      <section id="review" aria-labelledby="review-title" className={s.section}>
        <div className={s.intro}>
          <span className={s.num} data-tone="employer" aria-hidden>
            3
          </span>
          <div>
            <h2 id="review-title" className={s.h2}>
              Review it as the hiring team
            </h2>
            <p className={s.body}>
              Each acceptance criterion gets a state from the tests that ran, with no score. Read the changes and the handoff, draft a follow-up question
              and record a decision.
            </p>
          </div>
        </div>
        <ColorStage tone="employer" compact>
          {scenario ? <ReviewCard scenario={scenario} submitted={status === "submitted"} /> : null}
        </ColorStage>
      </section>

      <footer className={s.foot}>
        <p className={s.body}>
          This is a browser preview. Real assessments run in the Fydell desktop app on the candidate&apos;s machine, with an isolated test runner.
        </p>
        <div className={s.footActions}>
          <Link href="/signup?as=employer" className="l-btn l-btn-solid">
            Create a workspace
          </Link>
          <Link href="/download" className="l-btn l-btn-quiet">
            <Download size={14} aria-hidden />
            Get the desktop app
          </Link>
        </div>
      </footer>
    </DemoShell>
  );
}

function StepLink({ n, href, tone, label, state }: { n: number; href: string; tone: string; label: string; state: string }) {
  return (
    <li>
      <a href={href} className={s.step} data-tone={tone}>
        <span className={s.stepNum} aria-hidden>
          {n}
        </span>
        <span className={s.stepText}>
          <span className={s.stepLabel}>{label}</span>
          <span className={s.stepState}>{state}</span>
        </span>
      </a>
    </li>
  );
}

function TaskCard({ scenario, status }: { scenario: DemoScenario; status: ProgressStatus }) {
  return (
    <article className={s.card} aria-labelledby="task-card-title">
      <div className={s.cardMain}>
        <p className={s.meta}>
          {scenario.trackLabel} · {scenario.taskFamilyLabel} · {scenario.businessContext}
        </p>
        <h3 id="task-card-title" className={s.cardTitle}>
          {scenario.title}
        </h3>
        <p className={s.body}>{scenario.summary}</p>
        <ul className={s.facts} aria-label="About this task">
          <li>
            <Code2 size={14} aria-hidden />
            {scenario.stackLabel}
          </li>
          <li>
            <Clock size={14} aria-hidden />
            About {scenario.minutes} min, not timed
          </li>
          <li>
            <UserRound size={14} aria-hidden />
            {scenario.levelLabel}, {DIFFICULTY_LABEL[scenario.difficulty].toLowerCase()}
          </li>
        </ul>
        <div>
          <h4 className={s.label}>Acceptance criteria</h4>
          <ol className={s.criteria}>
            {scenario.criteria.map((c) => (
              <li key={c.id}>{c.text}</li>
            ))}
          </ol>
        </div>
      </div>
      <div className={s.cardSide}>
        <div>
          <h4 className={s.label}>Your teammates</h4>
          <ul className={s.team}>
            {scenario.teammates.map((m) => (
              <li key={m.id}>
                <Avatar scenario={scenario} id={m.id} />
                <span>
                  <span className={s.teamName}>{m.name}</span>
                  <span className={s.meta}>{m.title}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className={s.cardActions}>
          <Link href={workspaceHref(scenario.key)} className="l-btn l-btn-solid">
            <Play size={14} aria-hidden />
            {status === "not_started" ? "Start the task" : "Resume the task"}
          </Link>
          {status === "submitted" ? (
            <Link href={`/sandbox/${scenario.key}/report`} className="l-btn l-btn-quiet">
              <FileText size={14} aria-hidden />
              Your report
            </Link>
          ) : (
            <Link href={`/sandbox/${scenario.key}`} className="l-btn l-btn-quiet">
              Read the full brief
            </Link>
          )}
        </div>
        <p className={s.meta}>Your edits are saved in this browser. Only messages to teammates go to Fydell&apos;s server, to write the replies.</p>
      </div>
    </article>
  );
}

const REVIEW_PARTS = [
  { title: "Changes", detail: "Every changed line, compared with the starter code" },
  { title: "Tests", detail: "Public and protected results, mapped to each criterion" },
  { title: "Writing", detail: "The handoff and team conversation, read and not scored" },
  { title: "Decision", detail: "Advance, hold or decline, a private note and a follow-up" },
] as const;

function ReviewCard({ scenario, submitted }: { scenario: DemoScenario; submitted: boolean }) {
  return (
    <article className={cx(s.card, s.reviewCard)} aria-labelledby="review-card-title">
      <div className={s.cardMain}>
        <h3 id="review-card-title" className={s.cardTitle}>
          {submitted ? "Your submission is waiting for review" : "An example submission is waiting for review"}
        </h3>
        <p className={s.body}>
          {submitted
            ? "Open it as a reviewer would. Your decision and notes stay in this browser and nobody is notified."
            : "The example is the task's reference solution, run through the same tests in your browser when you open it. Submit the task yourself and you can review your own work too."}
        </p>
        <ul className={s.parts}>
          {REVIEW_PARTS.map((p) => (
            <li key={p.title}>
              <span className={s.partTitle}>{p.title}</span>
              <span className={s.meta}>{p.detail}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={s.cardActions}>
        {submitted ? (
          <>
            <Link href={`/sandbox/${scenario.key}/review`} className="l-btn l-btn-solid">
              Review your submission
              <ArrowRight size={14} aria-hidden />
            </Link>
            <Link href={`/sandbox/${scenario.key}/example/review`} className="l-btn l-btn-quiet">
              Review the example
            </Link>
          </>
        ) : (
          <Link href={`/sandbox/${scenario.key}/example/review`} className="l-btn l-btn-solid">
            Review the example submission
            <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}
