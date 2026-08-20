"use client";

import { useState } from "react";
import { Check, EllipsisVertical, FileText } from "lucide-react";
import {
  SAMPLE_ACTIVE_FILE,
  SAMPLE_CURRENT_RECOMMENDATION,
  SAMPLE_FILES,
  SAMPLE_EVIDENCE_CONSIDERED,
  SAMPLE_EVIDENCE_NOTE,
  SAMPLE_LATEST_MESSAGE,
  SAMPLE_LIVE_TIMELINE,
  SAMPLE_STEPS,
  SAMPLE_SUPERSEDED_RECOMMENDATION,
  type EvidenceStatus,
} from "./sample-artifacts";
import { StatusDot, Stepper, TimelineMarker } from "./sandbox-ui";

const STATUS_COLOR: Record<EvidenceStatus, string> = {
  confirmed: "var(--color-good)",
  unverified: "var(--color-changed)",
  blocking: "var(--color-risk)",
};

export function SandboxLiveSimulation() {
  const [activeFile, setActiveFile] = useState<string>(SAMPLE_ACTIVE_FILE);
  const file = SAMPLE_FILES.find((entry) => entry.name === activeFile) ?? SAMPLE_FILES[0];

  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0">
        <h1 className="text-app-page">Live simulation</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-app-body text-[var(--text-secondary)]">
          <span>Candidate 01 · Solutions Engineer</span>
          <StatusDot tone="good" label="In progress" />
        </p>

        <Stepper steps={SAMPLE_STEPS} className="mt-7" />

        <div className="mt-7 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-5 py-3.5">
            <h2 className="text-app-section">Acme technical discovery</h2>
            <span className="ml-auto inline-flex items-center gap-1.5 text-app-meta text-[var(--text-tertiary)]">
              <Check className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
              Saved just now
            </span>
            <EllipsisVertical
              className="h-4 w-4 text-[var(--text-tertiary)]"
              strokeWidth={1.7}
              aria-hidden
            />
          </div>

          <div className="grid md:grid-cols-[196px_minmax(0,1fr)]">
            <div className="border-b border-[var(--border-subtle)] py-2 md:border-b-0 md:border-r">
              {SAMPLE_FILES.map((file) => {
                const active = file.name === activeFile;
                return (
                  <button
                    key={file.name}
                    type="button"
                    onClick={() => setActiveFile(file.name)}
                    aria-current={active ? "true" : undefined}
                    className={`flex min-h-9 w-full items-center gap-2.5 px-4 text-left text-app-body ${
                      active
                        ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" strokeWidth={1.7} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    {active ? (
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: "var(--color-evidence)" }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 px-5 py-5">
              <p className="text-app-meta text-[var(--text-tertiary)]">{file.meta}</p>

              {file.kind === "plan" ? (
                <>
                  <p className="mt-4 text-app-body font-medium">
                    Initial recommendation{" "}
                    <span className="font-normal text-[var(--text-tertiary)]">(superseded)</span>
                  </p>
                  <p className="mt-2 max-w-[70ch] text-app-body text-[var(--text-tertiary)] line-through">
                    {SAMPLE_SUPERSEDED_RECOMMENDATION}
                  </p>

                  <p className="mt-6 text-app-body font-medium">
                    Current recommendation <span className="font-normal text-[var(--text-tertiary)]">(revised)</span>
                  </p>
                  <p className="mt-2 max-w-[70ch] text-app-body text-[var(--text-secondary)]">
                    {SAMPLE_CURRENT_RECOMMENDATION}
                  </p>
                </>
              ) : (
                <p className="mt-4 max-w-[70ch] text-app-body text-[var(--text-secondary)]">{file.body}</p>
              )}

              <p className="mt-7 text-app-body font-medium">Evidence considered</p>
              <table className="mt-3 w-full border-collapse text-app-body">
                <thead>
                  <tr className="text-app-meta text-[var(--text-tertiary)]">
                    <th scope="col" className="border-b border-[var(--border-subtle)] pb-2 pr-4 text-left font-normal">
                      Item
                    </th>
                    <th scope="col" className="border-b border-[var(--border-subtle)] pb-2 pr-4 text-left font-normal">
                      Status
                    </th>
                    <th scope="col" className="border-b border-[var(--border-subtle)] pb-2 text-left font-normal">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_EVIDENCE_CONSIDERED.map((row) => (
                    <tr key={row.item} className="align-top">
                      <td className="border-b border-[var(--border-subtle)] py-2.5 pr-4 text-[var(--text-primary)]">
                        {row.item}
                      </td>
                      <td
                        className="border-b border-[var(--border-subtle)] py-2.5 pr-4"
                        style={{ color: STATUS_COLOR[row.status] }}
                      >
                        {row.statusLabel}
                      </td>
                      <td className="border-b border-[var(--border-subtle)] py-2.5 text-[var(--text-secondary)]">
                        {row.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <aside className="min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-app-section">Live evidence</h2>
          <span className="ml-auto rounded-[var(--radius-tag)] border border-[var(--border-subtle)] px-2 py-1 text-app-meta text-[var(--text-tertiary)]">
            Persisted event 07
          </span>
        </div>

        <ol className="mt-5">
          {SAMPLE_LIVE_TIMELINE.map((entry, index) => (
            <li key={entry.title} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
              <TimelineMarker state={entry.state} last={index === SAMPLE_LIVE_TIMELINE.length - 1} />
              <div
                className={`pb-5 ${
                  entry.state === "current"
                    ? "-mx-2 rounded-[var(--radius-control)] bg-[var(--surface-selected)] px-2 pt-1"
                    : ""
                }`}
              >
                <p className="flex items-center gap-2 text-app-body font-medium">
                  {entry.time ? (
                    <span className="tabular-nums text-app-meta text-[var(--text-tertiary)]">{entry.time}</span>
                  ) : null}
                  <span>{entry.title}</span>
                  {entry.badge ? (
                    <span className="rounded-[var(--radius-tag)] border border-[var(--border-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--text-tertiary)]">
                      {entry.badge}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-app-meta text-[var(--text-secondary)]">{entry.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">Latest message</p>
        <p className="mt-2 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3.5 py-3 text-app-meta text-[var(--text-secondary)]">
          {SAMPLE_LATEST_MESSAGE}
        </p>

        <p className="mt-5 text-app-meta text-[var(--text-tertiary)]">Evidence note</p>
        <p className="mt-2 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3.5 py-3 text-app-meta text-[var(--text-secondary)]">
          {SAMPLE_EVIDENCE_NOTE}
        </p>
      </aside>
    </div>
  );
}
