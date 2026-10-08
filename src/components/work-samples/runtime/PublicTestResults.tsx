import { Status, type StatusKind } from "@/components/ui/report";
import type { PublicRunView, TestOutcomeView } from "@/lib/eng/authored/types";

export const OUTCOME_LABEL: Record<TestOutcomeView, string> = {
  passed: "Passed",
  failed: "Failed",
  error: "Error",
  skipped: "Skipped",
  missing: "Did not run",
};

export function outcomeKind(outcome: TestOutcomeView): StatusKind {
  if (outcome === "passed") return "success";
  if (outcome === "failed" || outcome === "error") return "failed";
  if (outcome === "missing") return "attention";
  return "neutral";
}

const STATUS_COPY: Record<PublicRunView["status"], string> = {
  running: "Running",
  ran: "Finished",
  timeout: "Timed out",
  infrastructure_error: "Runner error",
  runner_unavailable: "Runner unavailable",
};

export function TestOutcomeList({ tests }: { tests: { name: string; outcome: TestOutcomeView }[] }) {
  if (!tests.length) return <p className="text-app-meta text-[var(--text-tertiary)]">The runner reported no individual test results.</p>;
  return (
    <ul className="grid divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
      {tests.map((t) => (
        <li key={t.name} className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="min-w-0 truncate font-mono text-[12.5px] text-[var(--text-primary)]" title={t.name}>
            {t.name}
          </span>
          <Status kind={outcomeKind(t.outcome)}>{OUTCOME_LABEL[t.outcome]}</Status>
        </li>
      ))}
    </ul>
  );
}

/** One public test run, as the runner reported it. No interpretation is added. */
export function PublicTestResults({ run }: { run: PublicRunView }) {
  const passed = run.tests.filter((t) => t.outcome === "passed").length;
  const allPassed = run.status === "ran" && run.tests.length > 0 && passed === run.tests.length;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-app-meta text-[var(--text-secondary)]">
        <Status kind={run.status === "ran" ? (allPassed ? "success" : "neutral") : run.status === "running" ? "pending" : "attention"}>
          {STATUS_COPY[run.status]}
        </Status>
        {run.status === "ran" ? (
          <span className="tabular-nums">
            {passed} of {run.tests.length} passed
          </span>
        ) : null}
        {run.durationMs !== null ? <span className="tabular-nums">{(run.durationMs / 1000).toFixed(1)}s</span> : null}
        {run.runnerLabel ? <span>{run.runnerLabel}</span> : null}
      </div>
      {run.detail ? <p className="text-app-body text-[var(--text-secondary)]">{run.detail}</p> : null}
      {run.status === "ran" || run.status === "timeout" ? <TestOutcomeList tests={run.tests} /> : null}
      {run.output ? (
        <details>
          <summary className="cursor-pointer text-app-meta text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Full output</summary>
          <pre className="mt-2 max-h-[320px] overflow-auto whitespace-pre-wrap rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-2.5 font-mono text-[12px] leading-[1.55] text-[var(--text-primary)]">
            {run.output}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
