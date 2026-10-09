"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp, CircleAlert, CircleCheck, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { PublicRunView } from "@/lib/eng/authored/types";
import { failureExcerpt, formatClock, runTally, type Problem } from "./lib";
import { RunHeadline, TestList } from "./TestBits";

export type BottomTab = "tests" | "output" | "problems" | "terminal";

function Pre({ children }: { children: ReactNode }) {
  return (
    <pre className="sim-scroll overflow-auto whitespace-pre-wrap break-words rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 py-2.5 font-mono text-app-meta leading-[1.6] text-[var(--text-body)]">
      {children}
    </pre>
  );
}

/** Whether a run executed exactly the files currently saved, and whether edits are pending. */
export function RevisionMatch({ run, savedSha, hasUnsaved }: { run: PublicRunView; savedSha: string | null; hasUnsaved: boolean }) {
  if (run.status !== "ran") return null;
  const matches = savedSha !== null && run.filesSha256 === savedSha;
  return (
    <div className="grid gap-1 text-[13px]">
      {savedSha === null ? (
        <p className="text-[var(--text-secondary)]">Save your files to compare them with these results.</p>
      ) : matches ? (
        <p className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
          <CircleCheck aria-hidden size={14} className="text-[var(--text-tertiary)]" />
          Results match your current saved files.
        </p>
      ) : (
        <p className="inline-flex items-center gap-1.5 text-[var(--sim-attention)]">
          <CircleAlert aria-hidden size={14} />
          Results are from an earlier version of your files.
        </p>
      )}
      {hasUnsaved ? <p className="text-[var(--sim-attention)]">You have unsaved edits that these results do not include.</p> : null}
    </div>
  );
}

export function BottomPanel({
  tab,
  open,
  run,
  running,
  runError,
  canRun,
  runsLeft,
  runsLimit,
  waitSeconds,
  savedSha,
  hasUnsaved,
  problems,
  testCommand,
  localEditingAvailable,
  onTab,
  onToggle,
  onRun,
  onOpenProblem,
  onSelectTest,
  onOpenLocal,
}: {
  tab: BottomTab;
  open: boolean;
  run: PublicRunView | null;
  running: boolean;
  runError: string | null;
  canRun: boolean;
  runsLeft: number;
  runsLimit: number;
  waitSeconds: number;
  savedSha: string | null;
  hasUnsaved: boolean;
  problems: Problem[];
  testCommand: string;
  localEditingAvailable: boolean;
  onTab: (tab: BottomTab) => void;
  onToggle: () => void;
  onRun: () => void;
  onOpenProblem: (problem: Problem) => void;
  onSelectTest: (name: string) => void;
  onOpenLocal: () => void;
}) {
  const refs = useRef(new Map<BottomTab, HTMLButtonElement>());
  const tabs: { value: BottomTab; label: string; count?: number }[] = [
    { value: "tests", label: "Tests" },
    { value: "output", label: "Output" },
    { value: "problems", label: "Problems", count: problems.length },
    { value: "terminal", label: "Terminal" },
  ];
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = tabs[(i + delta + tabs.length) % tabs.length];
    onTab(next.value);
    if (!open) onToggle();
    refs.current.get(next.value)?.focus();
  };
  const tally = run ? runTally(run) : null;
  const runBlocked = !canRun || running || runsLeft <= 0 || waitSeconds > 0;
  const runHint = !canRun ? null : runsLeft <= 0 ? "No public test runs left" : waitSeconds > 0 ? `Available in ${waitSeconds}s` : `${runsLeft} of ${runsLimit} runs left`;

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-[var(--border-default)] bg-[var(--surface-panel)]">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] pl-1 pr-2">
        <div role="tablist" aria-label="Panel" className="flex h-full min-w-0 items-stretch overflow-x-auto [scrollbar-width:none]">
          {tabs.map((t, i) => {
            const selected = open && tab === t.value;
            return (
              <button
                key={t.value}
                ref={(el) => {
                  if (el) refs.current.set(t.value, el);
                  else refs.current.delete(t.value);
                }}
                type="button"
                role="tab"
                id={`sim-bottom-tab-${t.value}`}
                aria-selected={selected}
                aria-controls={open ? "sim-bottom-panel" : undefined}
                tabIndex={tab === t.value ? 0 : -1}
                onClick={() => {
                  onTab(t.value);
                  if (!open) onToggle();
                }}
                onKeyDown={(e) => onKey(e, i)}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 px-2 text-app-meta outline-offset-[-2px] sm:px-2.5",
                  selected ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]",
                )}
              >
                {t.label}
                {t.count ? <span className="rounded-full bg-[var(--surface-raised)] px-1.5 text-app-marker tabular-nums text-[var(--text-secondary)]">{t.count}</span> : null}
                {selected ? <span aria-hidden className="absolute inset-x-2 bottom-0 h-[2px] bg-[var(--accent)]" /> : null}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {runHint ? <span className="hidden text-app-meta tabular-nums text-[var(--text-tertiary)] md:inline">{runHint}</span> : null}
          {canRun ? (
            <Button size="sm" variant="secondary" onClick={onRun} loading={running} disabled={runBlocked} className="h-7">
              {running ? null : <Play aria-hidden size={13} />}
              {running ? "Running" : "Run tests"}
            </Button>
          ) : null}
          <button
            type="button"
            onClick={onToggle}
            aria-label={open ? "Collapse panel" : "Expand panel"}
            aria-expanded={open}
            className="grid h-7 w-7 place-items-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            {open ? <ChevronDown aria-hidden size={15} /> : <ChevronUp aria-hidden size={15} />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="sim-bottom-panel" role="tabpanel" aria-labelledby={`sim-bottom-tab-${tab}`} className="sim-scroll min-h-0 flex-1 overflow-auto px-4 py-3">
          {tab === "tests" ? (
            <div className="grid gap-3">
              <div aria-live="polite" className="grid gap-1">
                {running ? (
                  <p className="text-[13.5px] text-[var(--text-primary)]">Saving and running the public tests on the test runner.</p>
                ) : run ? (
                  <RunHeadline run={run} />
                ) : (
                  <p className="text-[13.5px] text-[var(--text-secondary)]">
                    No public test runs yet. Run tests saves your files, then runs the public tests that came with the starter on the test runner. More checks run after you submit.
                  </p>
                )}
              </div>
              {runError ? (
                <p role="alert" className="rounded-[6px] bg-[var(--sim-error-bg)] px-3 py-2 text-[13px] text-[var(--sim-error)]">
                  {runError}
                </p>
              ) : null}
              {run && !running ? (
                <>
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-app-meta">
                    {run.command ? (
                      <>
                        <dt className="text-[var(--text-tertiary)]">Command</dt>
                        <dd className="truncate font-mono text-[var(--text-body)]">{run.command}</dd>
                      </>
                    ) : null}
                    <dt className="text-[var(--text-tertiary)]">Ran on</dt>
                    <dd className="text-[var(--text-body)]">
                      {run.runnerLabel ?? "The test runner"}
                      {run.durationMs !== null ? `, ${(run.durationMs / 1000).toFixed(1)}s` : ""}, {formatClock(run.createdAt)}
                    </dd>
                  </dl>
                  <RevisionMatch run={run} savedSha={savedSha} hasUnsaved={hasUnsaved} />
                  {run.detail ? <p className="text-[13px] text-[var(--text-secondary)]">{run.detail}</p> : null}
                  {run.tests.length ? <TestList tests={run.tests} onSelect={onSelectTest} /> : null}
                  {tally && (tally.failed > 0 || (run.status !== "ran" && run.output)) && run.output ? (
                    <div className="grid gap-1.5">
                      <h3 className="text-app-meta font-medium text-[var(--text-secondary)]">Failure output</h3>
                      <Pre>{failureExcerpt(run.output)}</Pre>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {tab === "output" ? (
            run?.output ? (
              <Pre>{run.output}</Pre>
            ) : (
              <p className="text-[13px] text-[var(--text-secondary)]">The raw output of the latest public test run appears here.</p>
            )
          ) : null}

          {tab === "problems" ? (
            problems.length ? (
              <ul aria-label="Problems from the latest run" className="grid">
                {problems.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onOpenProblem(p)}
                      className="flex w-full items-baseline gap-3 rounded-[4px] px-2 py-1 text-left hover:bg-[var(--surface-hover)]"
                    >
                      <CircleAlert aria-hidden size={13} className="shrink-0 translate-y-[2px] text-[var(--sim-error)]" />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-body)]">{p.message}</span>
                      <span className="shrink-0 font-mono text-app-meta text-[var(--text-tertiary)]">
                        {p.path}:{p.line}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-[var(--text-secondary)]">
                {run ? "No file locations were found in the latest run's output." : "Locations from tracebacks and failing tests in the latest run appear here."}
              </p>
            )
          ) : null}

          {tab === "terminal" ? (
            <div className="grid max-w-[72ch] gap-3 text-[13.5px] leading-[1.6] text-[var(--text-body)]">
              <p>Commands cannot run in this browser workspace. Public tests run on Fydell&apos;s test runner when you choose Run tests.</p>
              <p>To run commands yourself, work locally and run the task&apos;s test command in your own terminal:</p>
              <Pre>{testCommand}</Pre>
              {localEditingAvailable ? (
                <div>
                  <Button size="sm" variant="secondary" onClick={onOpenLocal}>
                    Open in VS Code / Cursor
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
