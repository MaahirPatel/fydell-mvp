"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Clock, Code2, Download, Gauge, Monitor, UserRound } from "lucide-react";
import { catalogByTrack, type CatalogSummary } from "@/lib/sandbox-demo/catalog";
import type { DemoDifficulty } from "@/lib/sandbox-demo/catalog-types";
import { browserStorage, loadState, progressStatus, type ProgressStatus } from "@/lib/sandbox-demo/state";
import { DemoShell } from "./DemoShell";
import { useHydrated } from "./useDemoState";
import { cx } from "./ui";
import s from "./demo.module.css";

export const DIFFICULTY_LABEL: Record<DemoDifficulty, string> = {
  introductory: "Introductory",
  moderate: "Moderate",
  challenging: "Challenging",
};

const STATUS_LABEL: Record<Exclude<ProgressStatus, "not_started">, string> = {
  in_progress: "In progress",
  submitted: "Submitted",
};

export function scenarioHref(key: string): string {
  return `/sandbox/${key}`;
}

/** The public demo's front page: every simulation it can list, by engineering track. */
export default function SandboxLibrary() {
  const hydrated = useHydrated();
  const tracks = useMemo(() => catalogByTrack(), []);
  const statuses = useMemo(() => {
    if (!hydrated) return new Map<string, ProgressStatus>();
    const state = loadState(browserStorage());
    return new Map(Object.entries(state.scenarios).map(([key, p]) => [key, progressStatus(p)]));
  }, [hydrated]);
  const playable = tracks.reduce((n, t) => n + t.entries.filter((e) => e.playable).length, 0);

  return (
    <DemoShell>
      <div className={s.libraryHero}>
        <h1 className={s.h1}>Try a Fydell simulation</h1>
        <p className={s.lead}>
          Real engineering tasks from the Software Engineering library. Pick one, read its brief, then work in the same kind of workspace candidates use:
          edit the code, run tests in your browser and talk to simulated teammates. No account needed, and your work is saved in this browser.
        </p>
        <p className={s.heroNote}>
          These are browser previews. Real assessments run in the Fydell desktop app on the candidate&apos;s machine, with an isolated runner.
          <Link href="/download" className={s.inlineLink}>
            <Download size={14} aria-hidden />
            Get the desktop app
          </Link>
        </p>
      </div>

      <section aria-labelledby="track-umbrella" className={s.stackLg}>
        <div className={s.umbrella}>
          <h2 id="track-umbrella" className={s.h2Lg}>
            Software Engineering
          </h2>
          <p className={s.meta}>
            {`${playable === 1 ? "1 preview" : `${playable} previews`} in your browser${tracks.length > 1 ? `, across ${tracks.length} tracks` : ""}.`}
          </p>
        </div>
        {tracks.map((track) => (
          <section key={track.trackId} aria-labelledby={`track-${track.trackId}`} className={s.stack}>
            <h3 id={`track-${track.trackId}`} className={s.trackTitle}>
              {track.trackLabel}
            </h3>
            <ul className={s.cardGrid}>
              {track.entries.map((entry) => (
                <SimulationCard key={entry.key} entry={entry} status={statuses.get(entry.key) ?? "not_started"} />
              ))}
            </ul>
          </section>
        ))}
      </section>
    </DemoShell>
  );
}

function SimulationCard({ entry, status }: { entry: CatalogSummary; status: ProgressStatus }) {
  return (
    <li className={cx(s.panel, s.simCard)} data-playable={entry.playable ? "true" : "false"}>
      <div className={s.simCardHead}>
        {entry.taskFamilyLabel ? <span className={s.meta}>{entry.taskFamilyLabel}</span> : null}
        {status !== "not_started" ? (
          <span className={s.chip} data-tone={status === "submitted" ? "teal" : "indigo"}>
            {STATUS_LABEL[status]}
          </span>
        ) : null}
        {!entry.playable ? (
          <span className={s.chip}>
            <Monitor size={12} aria-hidden />
            Runs in the desktop app
          </span>
        ) : null}
      </div>
      <h4 className={s.h3}>{entry.title}</h4>
      <p className={s.body}>{entry.summary}</p>
      <dl className={s.factRow}>
        <div>
          <dt className="sr-only">Stack</dt>
          <dd>
            <Code2 size={13} aria-hidden />
            {entry.stackLabel}
          </dd>
        </div>
        <div>
          <dt className="sr-only">Approximate duration</dt>
          <dd>
            <Clock size={13} aria-hidden />
            About {entry.minutes} min
          </dd>
        </div>
        <div>
          <dt className="sr-only">Difficulty</dt>
          <dd>
            <Gauge size={13} aria-hidden />
            {DIFFICULTY_LABEL[entry.difficulty]}
          </dd>
        </div>
        {entry.levelLabel ? (
          <div>
            <dt className="sr-only">Level</dt>
            <dd>
              <UserRound size={13} aria-hidden />
              {entry.levelLabel}
            </dd>
          </div>
        ) : null}
      </dl>
      <div className={s.simCardFoot}>
        {entry.playable ? (
          <Link href={scenarioHref(entry.key)} className="l-btn l-btn-solid" aria-label={`Try the preview: ${entry.title}`}>
            Try the preview
            <ArrowRight size={14} aria-hidden />
          </Link>
        ) : (
          <p className={s.meta}>{entry.reason}</p>
        )}
      </div>
    </li>
  );
}
