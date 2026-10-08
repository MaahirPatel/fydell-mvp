"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusTag } from "@/components/ui/StatusTag";
import { isActive, type ImportJobView } from "@/lib/passport/import-jobs";
import { IMPORT_STAGES, IMPORT_STATE, formatDate, formatDateTime, shortSha, stageIndex } from "@/lib/passport/record-states";

export const IMPORTS_CHANGED_EVENT = "fydell:imports-changed";

const POLL_MS = 2500;
const RESUME_EVERY_MS = 20_000;

function secondsUntil(iso: string | null, now: number): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.parse(iso) - now) / 1000));
}

function StageTrack({ job }: { job: ImportJobView }) {
  const current = stageIndex(job.stage);
  return (
    <ol className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Import stages">
      {IMPORT_STAGES.map((s, i) => {
        const done = i < current || job.state === "succeeded";
        const now = i === current && job.state === "running";
        return (
          <li key={s.key} className="min-w-0">
            <span
              aria-hidden
              className={`block h-1 rounded-full ${done ? "bg-[var(--accent)]" : now ? "bg-[var(--accent-line)]" : "bg-[var(--border-default)]"}`}
            />
            <span className={`mt-1.5 block truncate text-app-caption ${now ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
              {s.label}
              <span className="sr-only">{done ? " (done)" : now ? " (in progress)" : " (not started)"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function JobRow({ job, now, onAction, busy }: { job: ImportJobView; now: number; onAction: (id: string, action: "cancel" | "retry") => void; busy: boolean }) {
  const state = IMPORT_STATE[job.state];
  const stage = IMPORT_STAGES[stageIndex(job.stage)];
  const wait = secondsUntil(job.nextAttemptAt, now);
  const files =
    job.progress.filesSelected !== undefined
      ? `${job.progress.filesFetched ?? 0} of ${job.progress.filesSelected} files`
      : null;

  let detail: string;
  if (job.needsWorker) detail = "The worker running this import stopped responding. Resuming from the last saved state; nothing already saved is lost.";
  else if (job.state === "running") detail = [stage?.detail, files].filter(Boolean).join(" · ");
  else if (job.state === "queued") detail = "Waiting for a worker. This usually takes a few seconds.";
  else if (job.state === "retry_scheduled") detail = `${job.error ?? "Temporary problem."} Next attempt ${wait !== null && wait > 0 ? `in ${wait}s` : "now"} (attempt ${job.attempts + 1} of ${job.maxAttempts}).`;
  else if (job.state === "succeeded")
    detail = job.result
      ? job.result.reusedExistingVersion
        ? "Report unchanged. This commit was already analyzed, or the report has notes or a pinned share."
        : `${job.result.findings} finding${job.result.findings === 1 ? "" : "s"}${job.result.status === "partial" ? " · partial coverage" : ""}`
      : "Saved.";
  else detail = job.error ?? "";

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="min-w-0 truncate text-[15px] font-medium text-[var(--text-primary)]" title={job.repository}>
          {job.repository}
        </span>
        <span className="text-[13px] text-[var(--text-tertiary)]" title={job.commitSha}>
          {job.revisionRef ? `${job.revisionRef} ` : ""}
          <span className="font-mono">{shortSha(job.commitSha)}</span>
        </span>
        <StatusTag tone={state.tone} className="ml-auto">
          {state.label}
        </StatusTag>
      </div>
      <p className="mt-1 text-app-meta leading-[1.5] text-[var(--text-secondary)]">{detail}</p>
      {job.state === "running" || job.state === "queued" ? <StageTrack job={job} /> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {job.state === "succeeded" && job.result ? (
          <ButtonLink href={`/app/candidate/projects/${job.result.projectId}`} variant="secondary" size="sm">
            Open report
          </ButtonLink>
        ) : null}
        {job.state === "failed" && job.retryable ? (
          <Button size="sm" variant="secondary" loading={busy} onClick={() => onAction(job.id, "retry")}>
            Try again
          </Button>
        ) : null}
        {isActive(job.state) ? (
          <Button size="sm" variant="quiet" disabled={busy || job.stage === "saving"} onClick={() => onAction(job.id, "cancel")}>
            Cancel import
          </Button>
        ) : null}
        <span className="ml-auto text-[13px] text-[var(--text-tertiary)]" title={formatDateTime(job.createdAt)}>
          Started {formatDate(job.createdAt)}
        </span>
      </div>
    </li>
  );
}

/**
 * Imports from the server, newest first. State always comes from the job
 * row: closing the tab or refreshing loses nothing, and polling a stalled
 * job asks the server to recover it.
 */
export default function ImportJobsPanel({ initialJobs }: { initialJobs: ImportJobView[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<ImportJobView[]>(initialJobs);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resumedAt = useRef(new Map<string, number>());
  const finished = useRef(new Set(initialJobs.filter((j) => !isActive(j.state)).map((j) => j.id)));

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/passport/imports", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { jobs: ImportJobView[] };
      setJobs(data.jobs);
    } catch {
      // Keep showing the last known state; the next poll retries.
    }
  }, []);

  useEffect(() => {
    const onChange = () => void reload();
    window.addEventListener(IMPORTS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(IMPORTS_CHANGED_EVENT, onChange);
  }, [reload]);

  const activeIds = jobs.filter((j) => isActive(j.state)).map((j) => j.id).join(",");
  useEffect(() => {
    if (!activeIds) return;
    const timer = setInterval(async () => {
      setNow(Date.now());
      const ids = activeIds.split(",");
      const updates = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/api/passport/imports/${id}`, { cache: "no-store" });
            if (!res.ok) return null;
            return ((await res.json()) as { job: ImportJobView }).job;
          } catch {
            return null;
          }
        }),
      );
      setJobs((prev) => prev.map((j) => updates.find((u) => u?.id === j.id) ?? j));
      for (const u of updates) {
        if (!u?.needsWorker) continue;
        const last = resumedAt.current.get(u.id) ?? 0;
        if (Date.now() - last < RESUME_EVERY_MS) continue;
        resumedAt.current.set(u.id, Date.now());
        void fetch(`/api/passport/imports/${u.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resume" }),
        }).catch(() => undefined);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [activeIds]);

  useEffect(() => {
    let changed = false;
    for (const j of jobs) {
      if (!isActive(j.state) && !finished.current.has(j.id)) {
        finished.current.add(j.id);
        if (j.state === "succeeded") changed = true;
      }
    }
    if (changed) router.refresh();
  }, [jobs, router]);

  async function act(id: string, action: "cancel" | "retry") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/passport/imports/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { job?: ImportJobView; error?: string };
      if (!res.ok || !data.job) throw new Error(data.error ?? "That did not work. Try again.");
      const updated = data.job;
      if (isActive(updated.state)) finished.current.delete(updated.id);
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const visible = jobs.filter(
    (j) => isActive(j.state) || j.state === "failed" || (j.state === "succeeded" && now - Date.parse(j.finishedAt ?? j.createdAt) < 15 * 60_000),
  );
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="imports-heading" className="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
        <h2 id="imports-heading" className="text-[15px] font-semibold">
          Imports
        </h2>
        <p className="text-[13px] text-[var(--text-tertiary)]">Keeps running if you close this page</p>
      </div>
      {error ? (
        <p role="alert" className="border-b border-[var(--border-subtle)] px-5 py-2.5 text-app-meta text-[var(--fydell-risk)] sm:px-6">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-[var(--border-subtle)]" aria-live="polite">
        {visible.map((job) => (
          <JobRow key={job.id} job={job} now={now} onAction={act} busy={busy === job.id} />
        ))}
      </ul>
    </section>
  );
}
