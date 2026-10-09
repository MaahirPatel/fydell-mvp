"use client";

import { useRef, type KeyboardEvent } from "react";
import { ChevronDown, ChevronUp, CircleAlert, CircleCheck, CircleDashed, CircleX, Lock, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { FileDiff } from "@/lib/sandbox-demo/diff";
import { RUN_LOCATION_LABEL, RUN_TIMEOUT_MS } from "@/lib/sandbox-demo/runner";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import { runtimeFor } from "@/lib/sandbox-demo/runtime";
import type { RunRecord, TestMeta, TestStatus } from "@/lib/sandbox-demo/types";
import { formatClock } from "@/components/simulations/workspace/lib";
import { TeammateAvatar } from "./TeamDock";

export function TaskBrief({ scenario }: { scenario: DemoScenario }) {
  const brief = scenario.brief;
  return (
    <div className="grid gap-5 text-[13.5px] leading-[1.6] text-[var(--text-body)]">
      <div className="grid gap-2.5">
        {brief.context.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p className="font-medium text-[var(--text-primary)]">{brief.task}</p>
      </div>
      <section className="grid gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Acceptance criteria</h3>
        <ol className="grid list-decimal gap-1.5 pl-5 marker:text-[var(--accent-ink)]">
          {scenario.criteria.map((r) => (
            <li key={r.id}>{r.text}</li>
          ))}
        </ol>
      </section>
      <section className="grid gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Constraints</h3>
        <ul className="grid list-disc gap-1.5 pl-5 marker:text-[var(--text-quaternary)]">
          {brief.constraints.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
      {brief.outOfScope.length > 0 ? (
        <section className="grid gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Out of scope</h3>
          <ul className="grid list-disc gap-1.5 pl-5 marker:text-[var(--text-quaternary)]">
            {brief.outOfScope.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="grid gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Your team</h3>
        <ul className="grid gap-2.5">
          {scenario.teammates.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5">
              <TeammateAvatar scenario={scenario} id={c.id} size={26} />
              <span className="grid">
                <span className="font-medium text-[var(--text-primary)]">{c.name}</span>
                <span className="text-app-meta text-[var(--text-secondary)]">{c.title}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-app-meta text-[var(--text-secondary)]">
        About {scenario.minutes} minutes, with no hard limit. {brief.aiPolicy} {scenario.testCommandLabel}
      </p>
    </div>
  );
}

export function ChangesList({ diffs, onOpenDiff }: { diffs: FileDiff[]; onOpenDiff: (path: string) => void }) {
  if (!diffs.length) return <p className="px-3 py-2 text-app-meta leading-[1.55] text-[var(--text-secondary)]">No files differ from the starter yet.</p>;
  return (
    <ul aria-label="Files changed from the starter">
      {diffs.map((d) => (
        <li key={d.path}>
          <button
            type="button"
            onClick={() => onOpenDiff(d.path)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left outline-offset-[-2px] hover:bg-[var(--surface-hover)]"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-app-meta text-[var(--text-primary)]">{d.path.split("/").pop()}</span>
              <span className="block truncate text-app-meta text-[var(--text-tertiary)]">Edited, {d.path.slice(0, d.path.lastIndexOf("/")) || "root"}</span>
            </span>
            <span className="shrink-0 font-mono text-app-marker tabular-nums">
              <span className="text-[var(--sim-success)]">+{d.added}</span> <span className="text-[var(--sim-error)]">-{d.removed}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export type BottomTab = "tests" | "output";


function StatusGlyph({ status }: { status: TestStatus }) {
  if (status === "pass") return <CircleCheck aria-hidden size={15} className="mt-[2px] shrink-0 text-[var(--sim-success)]" />;
  if (status === "fail") return <CircleX aria-hidden size={15} className="mt-[2px] shrink-0 text-[var(--sim-error)]" />;
  return <CircleDashed aria-hidden size={15} className="mt-[2px] shrink-0 text-[var(--text-tertiary)]" />;
}

const STATUS_WORD: Record<TestStatus, string> = { pass: "Passed", fail: "Failed", not_run: "Not run" };

export function publicRows(scenario: DemoScenario, run: RunRecord | null) {
  return runtimeFor(scenario).publicTests.map((meta) => {
    const r = run?.results.find((x) => x.id === meta.id);
    return { meta, status: r?.status ?? ("not_run" as TestStatus), message: r?.message ?? null };
  });
}

/** One line for a run. Green only when a real run reported every public test passing. */
export function RunHeadline({ scenario, run }: { scenario: DemoScenario; run: RunRecord }) {
  const rows = publicRows(scenario, run);
  const passed = rows.filter((r) => r.status === "pass").length;
  const all = run.outcome === "completed" && passed === rows.length;
  const tone = run.outcome !== "completed" ? "attention" : all ? "success" : "error";
  const text = run.outcome === "timeout" ? "The run timed out" : run.outcome === "error" ? "The run could not finish" : `${passed} of ${rows.length} public tests passed`;
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-[13.5px] font-medium",
        tone === "success" && "text-[var(--sim-success)]",
        tone === "error" && "text-[var(--sim-error)]",
        tone === "attention" && "text-[var(--sim-attention)]",
      )}
    >
      {tone === "success" ? <CircleCheck aria-hidden size={15} /> : tone === "error" ? <CircleX aria-hidden size={15} /> : <CircleAlert aria-hidden size={15} />}
      {text}
    </p>
  );
}

export function TaskBottomPanel({
  scenario,
  tab,
  open,
  run,
  running,
  onTab,
  onToggle,
  onRun,
  onSelectTest,
}: {
  scenario: DemoScenario;
  tab: BottomTab;
  open: boolean;
  run: RunRecord | null;
  running: boolean;
  onTab: (tab: BottomTab) => void;
  onToggle: () => void;
  onRun: () => void;
  onSelectTest: (meta: TestMeta) => void;
}) {
  const refs = useRef(new Map<BottomTab, HTMLButtonElement>());
  const tabs: { value: BottomTab; label: string; count?: number }[] = [
    { value: "tests", label: "Tests" },
    { value: "output", label: "Output", count: run?.logs.length ?? 0 },
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
  const rows = publicRows(scenario, run);
  const protectedCount = runtimeFor(scenario).tests.length - rows.length;

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-[var(--border-default)] bg-[var(--surface-panel)]">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] pl-1 pr-2">
        <div role="tablist" aria-label="Panel" className="flex h-full items-stretch">
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
                id={`demo-bottom-tab-${t.value}`}
                aria-selected={selected}
                aria-controls={open ? "demo-bottom-panel" : undefined}
                tabIndex={tab === t.value ? 0 : -1}
                onClick={() => {
                  onTab(t.value);
                  if (!open) onToggle();
                }}
                onKeyDown={(e) => onKey(e, i)}
                className={cn(
                  "relative flex items-center gap-1.5 px-2.5 text-app-meta outline-offset-[-2px]",
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
        <div className="ml-auto flex items-center gap-2">
          {run && !running ? <span className="hidden text-app-meta text-[var(--text-tertiary)] md:inline">{RUN_LOCATION_LABEL}</span> : null}
          <Button size="sm" variant="secondary" onClick={onRun} loading={running} disabled={running} className="h-7">
            {running ? null : <Play aria-hidden size={13} />}
            {running ? "Running" : "Run tests"}
          </Button>
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
        <div id="demo-bottom-panel" role="tabpanel" aria-labelledby={`demo-bottom-tab-${tab}`} className="sim-scroll min-h-0 flex-1 overflow-auto px-4 py-3">
          {tab === "tests" ? (
            <div className="grid gap-3">
              <div aria-live="polite" className="grid gap-1">
                {running ? (
                  <p className="text-[13.5px] text-[var(--text-primary)]">Running your files against the public tests in this browser (preview).</p>
                ) : run ? (
                  <>
                    <RunHeadline scenario={scenario} run={run} />
                    <p className="text-app-meta text-[var(--text-secondary)]">
                      {RUN_LOCATION_LABEL}, {formatClock(run.at)}, {run.durationMs} ms
                    </p>
                  </>
                ) : (
                  <p className="max-w-[80ch] text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                    No runs yet. Run tests executes your current files and the public tests in a Web Worker in this browser, stopped after {RUN_TIMEOUT_MS / 1000}{" "}
                    seconds so an endless loop cannot freeze the page. Protected tests run when you submit.
                  </p>
                )}
              </div>
              {run && !running && run.outcomeMessage ? (
                <p role="alert" className="rounded-[6px] bg-[var(--sim-error-bg)] px-3 py-2 text-[13px] text-[var(--sim-error)]">
                  {run.outcomeMessage}
                </p>
              ) : null}
              {!running ? (
                <ul className="grid gap-0.5" aria-label="Public tests">
                  {rows.map((r) => (
                    <li key={r.meta.id} className="grid gap-1 rounded-[6px] px-2 py-1.5 hover:bg-[var(--surface-hover)]">
                      <div className="flex items-start gap-2">
                        <StatusGlyph status={r.status} />
                        <button
                          type="button"
                          onClick={() => onSelectTest(r.meta)}
                          className="min-w-0 flex-1 text-left"
                          title={`Open this test in ${r.meta.file}`}
                        >
                          <span className="block font-mono text-app-meta text-[var(--text-primary)] underline-offset-2 hover:underline">{r.meta.name}</span>
                          <span className="block text-app-meta leading-[1.5] text-[var(--text-secondary)]">{r.meta.requirement}</span>
                        </button>
                        <span
                          className={cn(
                            "shrink-0 text-app-meta",
                            r.status === "pass" && "text-[var(--sim-success)]",
                            r.status === "fail" && "text-[var(--sim-error)]",
                            r.status === "not_run" && "text-[var(--text-tertiary)]",
                          )}
                        >
                          {run ? STATUS_WORD[r.status] : "Not run yet"}
                        </span>
                      </div>
                      {r.status === "fail" && r.message ? (
                        <pre className="ml-6 overflow-x-auto whitespace-pre-wrap break-words rounded-[6px] bg-[var(--sim-error-bg)] px-3 py-2 font-mono text-app-meta leading-[1.55] text-[var(--sim-error)]">
                          {r.message}
                        </pre>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="flex items-center gap-1.5 text-app-meta text-[var(--text-tertiary)]">
                <Lock aria-hidden size={11} />
                {protectedCount === 1 ? "1 protected test runs" : `${protectedCount} protected tests run`} on your files when you submit. Your report shows the requirement each checks, not its code.
              </p>
            </div>
          ) : null}

          {tab === "output" ? (
            run?.logs.length ? (
              <pre className="sim-scroll overflow-auto whitespace-pre-wrap break-words rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 py-2.5 font-mono text-app-meta leading-[1.6] text-[var(--text-body)]">
                {run.logs.join("\n")}
              </pre>
            ) : (
              <p className="text-[13px] text-[var(--text-secondary)]">
                {run ? "The latest run printed nothing. Anything your code or the tests pass to console.log appears here." : "Console output from your next run appears here."}
              </p>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
