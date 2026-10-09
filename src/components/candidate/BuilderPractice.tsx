"use client";

import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import DemoWorkspace from "@/components/sandbox/demo/task/TaskWorkspace";
import { ReportView } from "@/components/sandbox/demo/ReportView";
import { useHydrated, useScenarioProgress } from "@/components/sandbox/demo/useDemoState";
import { demoScenario } from "@/lib/sandbox-demo/catalog";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import { DEMO_SCENARIO_KEY } from "@/lib/employer-demo/fixtures";
import { PRACTICE_HOME, PRACTICE_REPORT, PRACTICE_WORKSPACE } from "./practice-paths";

/** Practice runs are stored apart from the employer demo, so the two never overwrite each other. */
const scopeFor = (userId: string) => `practice:${userId}`;

/** The practice task in the full-screen workspace. Tests run in the browser; nothing leaves it. */
export function PracticeTask({ userId }: { userId: string }) {
  return (
    <DemoWorkspace
      scenarioKey={DEMO_SCENARIO_KEY}
      embed={{
        storageScope: scopeFor(userId),
        overview: { href: PRACTICE_HOME, label: "Practice overview" },
        notice: (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-2 text-[13px]">
            <p className="text-[var(--text-primary)]">
              <span className="font-medium">Practice simulation.</span>{" "}
              <span className="text-[var(--text-secondary)]">Tests run in your browser. Nothing is sent to an employer or added to your profile.</span>
            </p>
            <Link href={PRACTICE_HOME} className="inline-flex items-center gap-1.5 font-medium text-[var(--text-primary)] underline underline-offset-2">
              <ArrowLeft aria-hidden className="h-3.5 w-3.5" strokeWidth={1.7} />
              Leave practice
            </Link>
          </div>
        ),
        consequence: {
          confirm: "Submit practice run",
          kept: "Your files, handoff answers and test run stay in this browser and open as your practice report. Nobody else sees it.",
        },
        onSubmitted: async () => ({ ok: true, href: PRACTICE_REPORT }),
      }}
    />
  );
}

/** The latest practice run, as the report an employer would read for a real simulation. */
export function PracticeReport({ userId }: { userId: string }) {
  const hydrated = useHydrated();
  const scenario = demoScenario(DEMO_SCENARIO_KEY);
  if (!scenario) return null;
  if (!hydrated) {
    return (
      <p role="status" className="text-app-body text-[var(--text-secondary)]">
        Opening your practice report
      </p>
    );
  }
  return <LatestReport userId={userId} scenario={scenario} />;
}

function LatestReport({ userId, scenario }: { userId: string; scenario: DemoScenario }) {
  const { progress } = useScenarioProgress(scenario, scopeFor(userId));
  const attempt = progress.attempts[progress.attempts.length - 1] ?? null;
  if (!attempt) {
    return (
      <div className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-5 py-5">
        <p className="text-app-body font-medium text-[var(--text-primary)]">No practice run yet</p>
        <p className="mt-1 text-app-body text-[var(--text-secondary)]">Submit from the workspace and your report appears here, built from the tests that ran on your files.</p>
        <Link href={PRACTICE_WORKSPACE} className="l-btn l-btn-solid mt-4 inline-flex">
          <Play size={14} aria-hidden />
          Open the workspace
        </Link>
      </div>
    );
  }
  return <ReportView scenario={scenario} attempt={attempt} mode="yours" links={{ workspace: PRACTICE_WORKSPACE, employerView: null }} />;
}

/** Whether a practice run has been submitted from this browser, for the overview's actions. */
export function PracticeActions({ userId }: { userId: string }) {
  const hydrated = useHydrated();
  const scenario = demoScenario(DEMO_SCENARIO_KEY);
  if (!scenario) return null;
  return hydrated ? <Actions userId={userId} scenario={scenario} /> : <StartLink label="Start practice" />;
}

function Actions({ userId, scenario }: { userId: string; scenario: DemoScenario }) {
  const { progress } = useScenarioProgress(scenario, scopeFor(userId));
  const submitted = progress.attempts.length > 0;
  const started = !!progress.startedAt;
  return (
    <div className="flex flex-wrap gap-2">
      <StartLink label={started ? "Continue practice" : "Start practice"} />
      {submitted ? (
        <Link href={PRACTICE_REPORT} className="l-btn l-btn-quiet">
          View your last report
        </Link>
      ) : null}
    </div>
  );
}

function StartLink({ label }: { label: string }) {
  return (
    <Link href={PRACTICE_WORKSPACE} className="l-btn l-btn-solid">
      <Play size={14} aria-hidden />
      {label}
    </Link>
  );
}
