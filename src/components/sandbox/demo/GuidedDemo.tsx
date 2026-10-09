"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Clock, Code2, Download, FileText, Play, UserRound } from "lucide-react";
import MarketingShell from "@/components/layout/MarketingShell";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import ProfileWorkspace from "@/components/marketing/site/ProfileWorkspace";
import TintStage, { type Tint } from "@/components/marketing/site/TintStage";
import { CenteredClosing } from "@/components/marketing/site/Home";
import { playableScenarios } from "@/lib/sandbox-demo/catalog";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import { browserStorage, loadState, progressStatus, type ProgressStatus } from "@/lib/sandbox-demo/state";
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

type TourStep = { id: string; tint: Tint; label: string; short: string; state: string };

/** The product tour: one engineer's profile, the task they do, and the hiring team's review of it. */
export default function GuidedDemo() {
  const scenario = useMemo(() => playableScenarios()[0] ?? null, []);
  const hydrated = useHydrated();
  const status = useMemo<ProgressStatus>(() => {
    if (!hydrated || !scenario) return "not_started";
    return progressStatus(loadState(browserStorage()).scenarios[scenario.key]);
  }, [hydrated, scenario]);

  const steps: TourStep[] = [
    { id: "profile", tint: "teal", label: "The engineer's profile", short: "Profile", state: "Example" },
    { id: "task", tint: "blue", label: "The task", short: "Task", state: scenario ? TASK_STATE[status] : "Unavailable" },
    { id: "review", tint: "violet", label: "The team's review", short: "Review", state: status === "submitted" ? "Your submission is ready" : "Example ready" },
  ];

  return (
    <MarketingShell>
      <div className={s.container}>
        <header className={s.hero}>
          <h1 className={s.title}>See how a hire runs on Fydell.</h1>
          <p className={s.lead}>
            Open an engineer&apos;s profile, work the task a candidate would, then review that work as the hiring team. It runs in your browser on
            fictional data, with no account, and nothing is sent to anyone.
          </p>
        </header>
      </div>

      <TourNav steps={steps} />

      <div className={s.container}>
        <TourSection
          id="profile"
          n={1}
          title="Start where the candidate starts."
          aside="An engineer applies with a Passport."
          more={{ href: "/developers", label: "More about Passports" }}
        >
          <p className={s.body}>
            Their projects, their part in each, and findings that open to the source lines they cite. Select a highlight to follow one.
          </p>
          <TintStage tint="teal">
            <ProductFrame
              interactive
              title="Example Passport"
              label="One project in an example Passport: its purpose, the engineer's part, and a finding opened to the source lines it cites. Select a highlight to open it."
            >
              <ProfileWorkspace />
            </ProductFrame>
          </TintStage>
        </TourSection>

        <TourSection id="task" n={2} title="Do the task they would do." aside="Real code, tests that run in your browser.">
          <p className={s.body}>
            Edit the code, run the public tests and ask the simulated teammates what you need. Submit with a short handoff and the protected tests run on
            your files.
          </p>
          <TintStage tint="blue" crop={false}>
            {scenario ? <TaskCard scenario={scenario} status={status} /> : <p className={s.body}>The browser task is unavailable right now.</p>}
          </TintStage>
        </TourSection>

        <TourSection id="review" n={3} title="Review it as the hiring team." aside="No score. Your team decides.">
          <p className={s.body}>
            Each acceptance criterion gets a state from the tests that ran. Read the changes and the handoff, draft a follow-up question and record a
            decision.
          </p>
          <TintStage tint="violet" crop={false}>
            {scenario ? <ReviewCard scenario={scenario} submitted={status === "submitted"} /> : null}
          </TintStage>
        </TourSection>
      </div>

      <CenteredClosing
        title="Run it with your own role."
        lead="This is a browser preview. Real assessments run tests in Fydell's isolated runner, not in the browser."
        actions={
          <>
            <Link href="/signup?as=employer" className="l-btn l-btn-solid">
              Create a workspace
            </Link>
            <Link href="/download" className="l-btn l-btn-quiet">
              <Download size={14} aria-hidden />
              Get the desktop app
            </Link>
          </>
        }
      />
    </MarketingShell>
  );
}

function TourSection({
  id,
  n,
  title,
  aside,
  more,
  children,
}: {
  id: string;
  n: number;
  title: string;
  aside: string;
  more?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={s.section}>
      <div className={s.head}>
        <h2 id={`${id}-title`} className={s.h2}>
          <span className="sr-only">Step {n}: </span>
          {title} <span className={s.muted}>{aside}</span>
        </h2>
        {more ? (
          <Link href={more.href} className={s.textLink}>
            {more.label}
            <ArrowRight size={14} aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Sticky step bar. Tracks the step in view and links to each one. */
function TourNav({ steps }: { steps: readonly TourStep[] }) {
  const [active, setActive] = useState(steps[0]?.id ?? "");
  const ids = steps.map((step) => step.id).join(",");

  useEffect(() => {
    const sections = ids
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        let best = "";
        let bestRatio = 0;
        for (const el of sections) {
          const ratio = visible.get(el.id) ?? 0;
          if (ratio > bestRatio) {
            best = el.id;
            bestRatio = ratio;
          }
        }
        if (best) setActive(best);
      },
      { rootMargin: "-140px 0px -35% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === active),
  );

  return (
    <nav aria-label="Tour steps" className={s.tourNav}>
      <div className={s.container}>
        <ol className={s.tourSteps}>
          {steps.map((step, i) => (
            <li key={step.id}>
              <a
                href={`#${step.id}`}
                className={s.tourStep}
                data-tint={step.tint}
                data-state={i === activeIndex ? "active" : i < activeIndex ? "done" : undefined}
                aria-current={i === activeIndex ? "step" : undefined}
              >
                <span className={s.tourNum} aria-hidden>
                  {i + 1}
                </span>
                <span className={s.tourText}>
                  <span className={s.tourLabel}>{step.label}</span>
                  <span className={s.tourShort} aria-hidden>
                    {step.short}
                  </span>
                  <span className={s.tourState}>{step.state}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
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
