"use client";

import { useEffect, useState } from "react";
import { formatDuration, StatusIcon, type Tone } from "../ui";
import type { JobStage, PublicJob, StageStatus } from "../types";

const STAGE: Record<StageStatus, { tone: Tone; text: string }> = {
  pending: { tone: "pending", text: "Not started" },
  running: { tone: "busy", text: "In progress" },
  done: { tone: "good", text: "Done" },
  kept: { tone: "neutral", text: "Kept from the current draft" },
  waiting: { tone: "warn", text: "Waiting" },
  failed: { tone: "bad", text: "Failed" },
};

/** Ticks once a second so elapsed times stay current without reading the clock during render. */
function useNow(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    if (!active) return () => window.clearTimeout(first);
    const t = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [active]);
  return now;
}

export function JobStages({ job }: { job: PublicJob }) {
  const live = job.status === "queued" || job.status === "running";
  const now = useNow(live);
  const started = new Date(job.createdAt).getTime();
  const ended = job.finishedAt ? new Date(job.finishedAt).getTime() : null;
  const elapsed = now === null ? null : (ended ?? now) - started;
  const waitingUntil = job.waitingUntil ? new Date(job.waitingUntil).getTime() : null;
  const waitLeft = waitingUntil && now !== null ? waitingUntil - now : null;

  return (
    <div className="grid gap-4">
      <ol className="grid gap-0.5" aria-label="Stages">
        {job.stages.map((s: JobStage) => {
          const meta = STAGE[s.status];
          return (
            <li key={s.id} className="flex items-start gap-3 py-1.5">
              <StatusIcon tone={meta.tone} className="mt-[3px]" />
              <div className="min-w-0">
                <p className="text-[14.5px] text-[var(--text-primary)]">
                  {s.label}
                  <span className="sr-only">: {meta.text}</span>
                </p>
                <p className="text-[13px] leading-[1.45] text-[var(--text-secondary)]">
                  {s.note ? s.note : s.status === "pending" ? "" : meta.text}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="grid gap-1 text-[13px] leading-[1.5] text-[var(--text-secondary)]" aria-live="polite">
        {elapsed !== null ? (
          <p>
            {live ? "Running for" : "Took"} {formatDuration(elapsed)}
          </p>
        ) : null}
        {job.attempt > 0 ? (
          <p>
            Attempt {Math.min(job.attempt + 1, job.maxAttempts)} of {job.maxAttempts}
          </p>
        ) : null}
        {live && job.error ? <p>{job.error}</p> : null}
        {live && waitLeft !== null && waitLeft > 0 ? <p>Continues automatically in about {formatDuration(waitLeft)}.</p> : null}
      </div>
    </div>
  );
}

export default JobStages;
