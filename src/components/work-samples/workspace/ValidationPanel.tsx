"use client";

import { Button } from "@/components/ui/Button";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { Banner, LocalTime, StatusText, type Tone } from "../ui";
import type { CheckResult, DraftState, PublicJob, RunEvidence } from "../types";
import { JobStages } from "./JobStages";

const CHECK: Record<CheckResult["status"], { tone: Tone; text: string }> = {
  passed: { tone: "good", text: "Passed" },
  failed: { tone: "bad", text: "Failed" },
  not_run: { tone: "neutral", text: "Not run" },
};

const TEST_TONE: Record<string, Tone> = { passed: "good", failed: "bad", error: "bad", skipped: "neutral" };

export function ValidationPanel({
  state,
  testJob,
  canRun,
  running,
  onRun,
  dirty,
}: {
  state: DraftState;
  testJob: PublicJob | null;
  canRun: boolean;
  running: boolean;
  onRun: () => void;
  dirty: boolean;
}) {
  const v = state.validation;
  const live = testJob && (testJob.status === "queued" || testJob.status === "running");
  const stale = new Set(v?.staleCheckIds ?? []);
  const execution = v?.checks.filter((c) => c.kind === "execution") ?? [];
  const statics = v?.checks.filter((c) => c.kind === "static") ?? [];
  const passed = v?.checks.filter((c) => c.status === "passed").length ?? 0;

  return (
    <div className="grid gap-6">
      <Panel>
        <PanelSection
          title="Checks"
          description="Runs the starter, the reference solution and every incorrect solution against the tests, then checks the brief, criteria and policies."
          action={
            canRun ? (
              <Button variant="secondary" onClick={onRun} loading={running} disabled={Boolean(live)}>
                {live ? "Checks running" : "Run checks"}
              </Button>
            ) : null
          }
        >
          <div className="grid gap-3">
            {v?.runner ? (
              <p className="text-[14px] text-[var(--text-secondary)]">
                Runner: <span className="text-[var(--text-primary)]">{v.runner.label}</span>
                {v.runner.version ? <span className="text-[var(--text-tertiary)]"> ({v.runner.version})</span> : null}
              </p>
            ) : null}
            {v?.runner && !v.runner.isolated ? (
              <Banner tone="warn">This runner is not isolated. Results are fine for local testing; publishing for candidates requires the isolated sandbox.</Banner>
            ) : null}
            {v && !v.runner ? <Banner tone="warn">{v.runnerUnavailable ?? "Execution is not available here, so execution checks did not run."}</Banner> : null}
            {dirty ? <Banner tone="neutral">Unsaved edits are saved before the run starts.</Banner> : null}
            {testJob && (live || testJob.status === "failed") ? (
              <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3">
                <p className="mb-2 text-[14px] font-medium text-[var(--text-primary)]">{live ? "Running checks" : "The last run did not finish"}</p>
                <JobStages job={testJob} />
                {testJob.status === "failed" && testJob.error ? <p className="mt-2 text-[14px] text-[var(--fydell-risk)]">{testJob.error}</p> : null}
              </div>
            ) : null}
            {!v ? <p className="text-[14px] text-[var(--text-secondary)]">No checks have run on this draft yet.</p> : null}
            {v ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {v.status === "passed" && v.current && v.runner ? (
                  <StatusText tone="good">Checks passed on {v.runner.label}</StatusText>
                ) : (
                  <StatusText tone={v.current ? "bad" : "warn"}>
                    {passed} of {v.checks.length} checks passed{v.current ? "" : " on an earlier version"}
                  </StatusText>
                )}
                <span className="text-[13px] text-[var(--text-tertiary)]">Ran <LocalTime iso={v.ranAt} /></span>
              </div>
            ) : null}
          </div>
        </PanelSection>
      </Panel>

      {v ? (
        <>
          <CheckGroup title="Execution checks" checks={execution} stale={stale} />
          <CheckGroup title="Content checks" checks={statics} stale={stale} />
        </>
      ) : null}
    </div>
  );
}

function CheckGroup({ title, checks, stale }: { title: string; checks: CheckResult[]; stale: Set<string> }) {
  if (checks.length === 0) return null;
  return (
    <Panel>
      <PanelSection title={title} />
      {checks.map((c) => (
        <CheckRow key={c.id} check={c} stale={stale.has(c.id)} />
      ))}
    </Panel>
  );
}

function CheckRow({ check, stale }: { check: CheckResult; stale: boolean }) {
  const meta = CHECK[check.status];
  return (
    <div className="px-5 py-4 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <p className="text-[14.5px] font-medium text-[var(--text-primary)]">{check.label}</p>
        <div className="flex flex-wrap items-center gap-3">
          {stale ? <StatusText tone="warn">Out of date: inputs changed since this run</StatusText> : null}
          <StatusText tone={meta.tone}>{meta.text}</StatusText>
        </div>
      </div>
      <p className="mt-1 text-[14px] leading-[1.5] text-[var(--text-body)]">{check.detail}</p>
      {check.issues.length > 1 || (check.issues.length === 1 && check.issues[0] !== check.detail) ? (
        <ul className="mt-2 grid list-disc gap-1 pl-5 text-[14px] leading-[1.5] text-[var(--text-body)] marker:text-[var(--text-tertiary)]">
          {check.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      ) : null}
      {check.evidence.length ? (
        <div className="mt-3 grid gap-2">
          {check.evidence.map((e, i) => (
            <Evidence key={i} evidence={e} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Evidence({ evidence: e }: { evidence: RunEvidence }) {
  const counts = e.tests.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.outcome]: (acc[t.outcome] ?? 0) + 1 }), {});
  const outcome = e.outcome === "ran" ? `exit code ${e.exitCode ?? "none"}` : e.outcome === "timeout" ? "timed out" : "runner error";
  return (
    <details className="group rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13.5px] text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
        <span className="font-medium">{e.label}</span>
        <span className="text-[var(--text-secondary)]">
          {outcome}, {(e.durationMs / 1000).toFixed(1)} s
          {e.tests.length ? `, ${e.tests.length} tests: ${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(", ")}` : ""}
        </span>
        <span className="ml-auto text-[12.5px] text-[var(--text-tertiary)] group-open:hidden">Show details</span>
        <span className="ml-auto hidden text-[12.5px] text-[var(--text-tertiary)] group-open:inline">Hide details</span>
      </summary>
      <div className="grid gap-3 border-t border-[var(--border-subtle)] px-3 py-3">
        {e.command ? (
          <div>
            <p className="text-[12.5px] text-[var(--text-tertiary)]">Command</p>
            <code className="mt-0.5 block overflow-x-auto whitespace-pre font-mono text-[12.5px] text-[var(--text-primary)]">{e.command}</code>
          </div>
        ) : null}
        {e.tests.length ? (
          <ul className="grid gap-1">
            {e.tests.map((t) => (
              <li key={t.name} className="flex items-start justify-between gap-3 text-[13px]">
                <span className="min-w-0 break-all font-mono text-[12.5px] text-[var(--text-body)]">{t.name}</span>
                <StatusText tone={TEST_TONE[t.outcome] ?? "neutral"} className="shrink-0">
                  {t.outcome[0].toUpperCase() + t.outcome.slice(1)}
                </StatusText>
              </li>
            ))}
          </ul>
        ) : null}
        {e.output ? (
          <div>
            <p className="text-[12.5px] text-[var(--text-tertiary)]">Output</p>
            <pre className="mt-0.5 max-h-[320px] overflow-auto rounded-[6px] bg-[var(--surface-code)] px-3 py-2 font-mono text-[12px] leading-[1.55] text-[var(--text-primary)]">{e.output}</pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export default ValidationPanel;
