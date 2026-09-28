"use client";

import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { Surface } from "@/components/ui/Surface";

/**
 * Deterministic test results for an engineering attempt (employer report).
 * Kept visually and structurally separate from interpretive analysis: these
 * come from the scenario's pinned tests run in an isolated runner against the
 * exact submitted files, never from a model reading the code.
 */

interface GroupResult {
  id: string;
  label: string;
  dimension: string;
  status: "pass" | "fail" | "not_run" | "not_applicable";
  passed: number;
  total: number;
  note?: string;
}
interface TestCase {
  id: string;
  outcome: "passed" | "failed" | "error" | "skipped";
  origin: "provided" | "hidden" | "candidate";
  message?: string;
}
export interface EngineeringReportData {
  scenarioId: string;
  evaluation:
    | { state: "pending" }
    | { state: "no_files"; reason: string }
    | {
        state: "finished";
        runId: string;
        completedAt: string | null;
        result: {
          status: "completed" | "indeterminate" | "infrastructure_error" | "not_configured";
          statusReason: string | null;
          candidateSnapshotHash: string;
          scenarioVersion: string;
          suiteVersion: string;
          environmentVersion: string;
          provider: string;
          groups: GroupResult[];
          tests: TestCase[];
          integrity: { canary: string; missingExpected: string[] };
          restoredTrusted: string[];
          summary: { passed: number; failed: number; errors: number; skipped: number };
        };
      };
  practice: { runCount: number; lastRunAt: string | null; submittedVersionWasRun: boolean; note: string };
  changes?:
    | { files: { path: string; change: "added" | "removed" | "modified"; added: number; removed: number; hunks: string | null }[] }
    | { unavailable: string };
}

function CodeChanges({ changes }: { changes: NonNullable<EngineeringReportData["changes"]> }) {
  if ("unavailable" in changes) {
    return <p className="text-app-meta text-[var(--text-secondary)]">{changes.unavailable}</p>;
  }
  if (changes.files.length === 0) {
    return <p className="text-app-meta text-[var(--text-secondary)]">The candidate did not change any code.</p>;
  }
  return (
    <ul className="space-y-2">
      {changes.files.map((f) => (
        <li key={f.path}>
          <details className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3 py-2">
            <summary className="cursor-pointer text-app-meta">
              <span className="font-mono text-[var(--text-primary)] [overflow-wrap:anywhere]">{f.path}</span>{" "}
              <span className="text-[var(--text-tertiary)]">
                {f.change} · +{f.added} −{f.removed}
              </span>
            </summary>
            {f.hunks === null ? (
              <p className="mt-2 text-app-meta text-[var(--text-secondary)]">Too large to show as a line diff.</p>
            ) : (
              <pre className="mt-2 max-h-[420px] overflow-auto text-app-meta leading-[1.5]">
                {f.hunks.split("\n").map((line, i) => (
                  <span
                    key={i}
                    className={
                      line.startsWith("+")
                        ? "block text-[var(--ev-success-ink,var(--text-primary))]"
                        : line.startsWith("-")
                          ? "block text-[var(--status-attention-ink)]"
                          : line.startsWith("@@")
                            ? "block text-[var(--text-tertiary)]"
                            : "block text-[var(--text-secondary)]"
                    }
                  >
                    {line || " "}
                  </span>
                ))}
              </pre>
            )}
          </details>
        </li>
      ))}
    </ul>
  );
}

const GROUP_TONE: Record<GroupResult["status"], StatusTone> = {
  pass: "good",
  fail: "risk",
  not_run: "neutral",
  not_applicable: "neutral",
};
const GROUP_LABEL: Record<GroupResult["status"], string> = {
  pass: "All passing",
  fail: "Failing",
  not_run: "Not run",
  not_applicable: "Not observed",
};
const ORIGIN_LABEL: Record<TestCase["origin"], string> = {
  provided: "provided",
  hidden: "reviewer-only",
  candidate: "candidate's own",
};

export function EngineeringResults({ data }: { data: EngineeringReportData }) {
  const { evaluation, practice } = data;
  return (
    <section aria-labelledby="eng-h" className="space-y-3">
      <div>
        <h2 id="eng-h" className="text-app-section font-medium text-[var(--text-primary)]">
          Code evaluation
        </h2>
        <p className="mt-1 max-w-[74ch] text-app-meta leading-[1.6] text-[var(--text-secondary)]">
          The scenario&apos;s provided and reviewer-only tests, run by Fydell&apos;s isolated test runner against the
          exact files the candidate submitted. These are test outcomes, not an interpretation.
        </p>
      </div>

      {evaluation.state === "pending" ? (
        <Surface tone="panel" className="px-5 py-4" role="status">
          <p className="text-app-body text-[var(--text-primary)]">Tests are still running for this submission.</p>
          <p className="mt-1 text-app-meta text-[var(--text-secondary)]">This page refreshes when analysis finishes.</p>
        </Surface>
      ) : evaluation.state === "no_files" ? (
        <Surface tone="panel" className="px-5 py-4">
          <p className="text-app-body text-[var(--text-primary)]">{evaluation.reason}</p>
        </Surface>
      ) : (
        <FinishedEvaluation evaluation={evaluation} />
      )}

      {data.changes ? (
        <Surface tone="panel" className="px-5 py-4">
          <h3 className="mb-2 text-app-body font-medium text-[var(--text-primary)]">Code changes</h3>
          <p className="mb-2 max-w-[74ch] text-app-meta leading-[1.6] text-[var(--text-tertiary)]">
            The candidate&apos;s submitted files compared with the starter repository they were given.
          </p>
          <CodeChanges changes={data.changes} />
        </Surface>
      ) : null}

      <Surface tone="panel" className="px-5 py-4">
        <p className="text-app-body text-[var(--text-primary)]">
          {practice.runCount === 0
            ? "The candidate did not run the tests in the workspace."
            : `The candidate ran the tests ${practice.runCount} time${practice.runCount === 1 ? "" : "s"} in the workspace${
                practice.lastRunAt ? `, last at ${new Date(practice.lastRunAt).toLocaleTimeString()}` : ""
              }.`}{" "}
          {practice.runCount > 0
            ? practice.submittedVersionWasRun
              ? "The submitted version was among the versions they ran."
              : "The submitted version was not run in the workspace before submitting."
            : null}
        </p>
        <p className="mt-1.5 max-w-[74ch] text-app-meta leading-[1.6] text-[var(--text-tertiary)]">{practice.note}</p>
      </Surface>
    </section>
  );
}

function FinishedEvaluation({
  evaluation,
}: {
  evaluation: Extract<EngineeringReportData["evaluation"], { state: "finished" }>;
}) {
  const r = evaluation.result;
  const trustworthy = r.status === "completed";
  return (
    <Surface tone="panel" className="px-5 py-4">
      {!trustworthy ? (
        <div className="mb-3 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3 py-2" role="status">
          <p className="text-app-body font-medium text-[var(--text-primary)]">
            {r.status === "indeterminate"
              ? "Results need human review"
              : r.status === "infrastructure_error"
                ? "The test runner failed; this is not a result about the candidate"
                : "Tests could not run in this environment"}
          </p>
          {r.statusReason ? (
            <p className="mt-1 text-app-meta leading-[1.6] text-[var(--text-secondary)]">{r.statusReason}</p>
          ) : null}
        </div>
      ) : null}

      {r.groups.length > 0 ? (
        <ul className="space-y-2">
          {r.groups.map((g) => (
            <li key={g.id} className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-app-body font-medium text-[var(--text-primary)]">{g.label}</p>
                {g.note ? <p className="text-app-meta text-[var(--text-secondary)]">{g.note}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-app-meta tabular-nums text-[var(--text-secondary)]">
                  {g.passed}/{g.total} tests
                </span>
                <StatusTag tone={trustworthy ? GROUP_TONE[g.status] : "neutral"}>
                  {trustworthy ? GROUP_LABEL[g.status] : "Unverified"}
                </StatusTag>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {r.tests.length > 0 ? (
        <details className="mt-3 border-t border-[var(--border-subtle)] pt-3">
          <summary className="cursor-pointer text-app-meta font-medium text-[var(--text-secondary)]">
            All {r.tests.length} test outcomes
          </summary>
          <ul className="mt-2 space-y-1">
            {r.tests.map((t) => (
              <li key={t.id} className="text-app-meta">
                <span className="font-mono text-[var(--text-primary)] [overflow-wrap:anywhere]">{t.id}</span>{" "}
                <span className="text-[var(--text-tertiary)]">({ORIGIN_LABEL[t.origin]})</span>{" "}
                <span className={t.outcome === "passed" ? "text-[var(--text-secondary)]" : "text-[var(--status-attention-ink)]"}>
                  {t.outcome}
                </span>
                {t.message && t.outcome !== "passed" ? (
                  <span className="block pl-3 font-mono text-[var(--text-tertiary)] [overflow-wrap:anywhere]">{t.message}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {r.restoredTrusted.length > 0 ? (
        <p className="mt-3 text-app-meta leading-[1.6] text-[var(--text-secondary)]">
          The candidate had edited {r.restoredTrusted.join(", ")}; the original provided tests were used.
        </p>
      ) : null}

      <dl className="mt-3 grid gap-3 border-t border-[var(--border-subtle)] pt-3 sm:grid-cols-3">
        <div>
          <dt className="text-app-meta text-[var(--text-tertiary)]">Test suite</dt>
          <dd className="mt-0.5 font-mono text-app-meta text-[var(--text-primary)] [overflow-wrap:anywhere]">{r.suiteVersion}</dd>
        </div>
        <div>
          <dt className="text-app-meta text-[var(--text-tertiary)]">Submitted files</dt>
          <dd className="mt-0.5 font-mono text-app-meta text-[var(--text-primary)]" title={r.candidateSnapshotHash}>
            {r.candidateSnapshotHash.slice(0, 12)}
          </dd>
        </div>
        <div>
          <dt className="text-app-meta text-[var(--text-tertiary)]">Runner</dt>
          <dd className="mt-0.5 font-mono text-app-meta text-[var(--text-primary)] [overflow-wrap:anywhere]">
            {r.provider}
            {evaluation.completedAt ? ` · ${new Date(evaluation.completedAt).toLocaleString()}` : ""}
          </dd>
        </div>
      </dl>
    </Surface>
  );
}
