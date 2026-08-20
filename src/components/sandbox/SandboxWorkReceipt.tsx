"use client";

import { ArrowRight, Check, Copy, Download, Link2, TriangleAlert } from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import {
  SAMPLE_RECEIPT_ARTIFACTS,
  SAMPLE_RECEIPT_CHANGE,
  SAMPLE_RECEIPT_HASH,
  SAMPLE_RECEIPT_HASH_NOTICE,
  SAMPLE_RECEIPT_ID,
  SAMPLE_RECEIPT_LIMITATION,
  SAMPLE_RECEIPT_LINEAGE,
  SAMPLE_RECEIPT_META,
  SAMPLE_RECEIPT_OBSERVED,
  SAMPLE_RECEIPT_VERIFICATION,
  SAMPLE_RECEIPT_WORK,
} from "./sample-artifacts";
import { TimelineMarker } from "./sandbox-ui";

export function SandboxWorkReceipt() {
  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-app-page">Work receipt</h1>
            <p className="mt-2 text-app-body text-[var(--text-secondary)]">
              Candidate 01 · Solutions Engineer · Acme rollout
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-app-meta text-[var(--text-secondary)]">
              <Check className="h-3.5 w-3.5" strokeWidth={2.2} style={{ color: "var(--color-good)" }} aria-hidden />
              Issued · Integrity verified
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-app-body text-[var(--text-secondary)]">
              <Link2 className="h-4 w-4" strokeWidth={1.7} aria-hidden />
              Copy verification link
            </span>
            <span className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3 text-app-body font-medium text-[var(--control-solid-ink)]">
              <Download className="h-4 w-4" strokeWidth={1.7} aria-hidden />
              Download receipt
            </span>
          </div>
        </div>

        <article className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-panel)]">
          <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-6 py-4">
            <FydellMark width={22} />
            <span className="text-[11px] uppercase tracking-[0.09em] text-[var(--text-tertiary)]">
              Fydell work receipt
            </span>
            <span className="ml-auto font-mono text-app-meta text-[var(--text-tertiary)]">{SAMPLE_RECEIPT_ID}</span>
          </div>

          <div className="px-6 py-5">
            <h2 className="text-app-section font-medium">Acme technical discovery and rollout</h2>
            <p className="mt-1.5 text-app-meta text-[var(--text-secondary)]">
              Demonstrated work completed for a fictional Solutions Engineer simulation
            </p>
            <p
              className="mt-3 inline-flex items-center gap-2 text-app-meta"
              style={{ color: "var(--color-changed)" }}
            >
              <TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
              Fictional sandbox work receipt. Not valid for employment verification.
            </p>

            <dl className="mt-5 grid gap-x-6 gap-y-4 border-y border-[var(--border-subtle)] py-4 sm:grid-cols-3">
              {SAMPLE_RECEIPT_META.map((entry) => (
                <div key={entry.label}>
                  <dt className="text-app-meta text-[var(--text-tertiary)]">{entry.label}</dt>
                  <dd className="mt-0.5 text-app-body text-[var(--text-primary)]">{entry.value}</dd>
                </div>
              ))}
            </dl>

            <section className="mt-6">
              <h3 className="text-app-body font-medium">1. Work completed</h3>
              <ol className="mt-3">
                {SAMPLE_RECEIPT_WORK.map((row, index) => (
                  <li key={row.label} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
                    <TimelineMarker state={row.state} last={index === SAMPLE_RECEIPT_WORK.length - 1} />
                    <div className="flex flex-wrap items-baseline gap-x-4 pb-3">
                      <span className="tabular-nums text-app-meta text-[var(--text-tertiary)]">{row.time}</span>
                      <span className="min-w-0 flex-1 text-app-body text-[var(--text-primary)]">{row.label}</span>
                      <span className="text-app-meta" style={{ color: "var(--color-evidence)" }}>
                        {row.source}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-6">
              <h3 className="text-app-body font-medium">2. Artifacts and revisions</h3>
              <table className="mt-3 w-full border-collapse text-app-body">
                <thead>
                  <tr className="text-app-meta text-[var(--text-tertiary)]">
                    {["Artifact", "Version", "Status", "Change recorded", "Source"].map((head) => (
                      <th
                        key={head}
                        scope="col"
                        className="border-b border-[var(--border-subtle)] pb-2 pr-4 text-left font-normal last:pr-0"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_RECEIPT_ARTIFACTS.map((row) => (
                    <tr key={row.version} className="align-top">
                      <td className="border-b border-[var(--border-subtle)] py-2.5 pr-4">{row.artifact}</td>
                      <td className="border-b border-[var(--border-subtle)] py-2.5 pr-4 text-[var(--text-secondary)]">
                        {row.version}
                      </td>
                      <td
                        className="border-b border-[var(--border-subtle)] py-2.5 pr-4"
                        style={{
                          color: row.status === "Superseded" ? "var(--color-changed)" : "var(--color-good)",
                        }}
                      >
                        {row.status}
                      </td>
                      <td className="border-b border-[var(--border-subtle)] py-2.5 pr-4 text-[var(--text-secondary)]">
                        {row.change}
                      </td>
                      <td className="border-b border-[var(--border-subtle)] py-2.5" style={{ color: "var(--color-evidence)" }}>
                        {row.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-app-meta">
                <span style={{ color: "var(--color-changed)" }}>{SAMPLE_RECEIPT_CHANGE.from}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" strokeWidth={1.7} aria-hidden />
                <span style={{ color: "var(--color-good)" }}>{SAMPLE_RECEIPT_CHANGE.to}</span>
              </p>
            </section>

            <section className="mt-6">
              <h3 className="text-app-body font-medium">3. Observed work, with limits</h3>
              <dl className="mt-3">
                {SAMPLE_RECEIPT_OBSERVED.map((row) => (
                  <div
                    key={row.competency}
                    className="grid gap-1 border-b border-[var(--border-subtle)] py-2.5 last:border-b-0 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4"
                  >
                    <dt className="text-app-body text-[var(--text-primary)]">{row.competency}</dt>
                    <dd className="text-app-body text-[var(--text-secondary)]">{row.detail}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-hover)] px-4 py-3">
              <span
                className="inline-flex items-center gap-2 text-app-meta"
                style={{ color: "var(--color-changed)" }}
              >
                <TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                Limitation
              </span>
              <span className="min-w-0 flex-1 text-app-meta text-[var(--text-secondary)]">
                {SAMPLE_RECEIPT_LIMITATION}
              </span>
              <span className="inline-flex items-center gap-1.5 text-app-meta" style={{ color: "var(--color-evidence)" }}>
                Trace supporting evidence
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
              </span>
            </div>
          </div>
        </article>
      </section>

      <aside className="min-w-0">
        <h2 className="text-app-section">Receipt verification</h2>
        <dl className="mt-4">
          {SAMPLE_RECEIPT_VERIFICATION.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-2 text-app-meta">
              <dt className="text-[var(--text-secondary)]">{row.label}</dt>
              <dd
                className="inline-flex items-center gap-1.5 text-right"
                style={{ color: row.tone === "good" ? "var(--color-good)" : "var(--text-primary)" }}
              >
                {row.tone === "good" ? <Check className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden /> : null}
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-app-meta text-[var(--text-tertiary)]">SHA-256 integrity hash</p>
        <p className="mt-1.5 inline-flex items-center gap-2 font-mono text-app-body text-[var(--text-primary)]">
          {SAMPLE_RECEIPT_HASH}
          <Copy className="h-3.5 w-3.5 text-[var(--text-tertiary)]" strokeWidth={1.7} aria-hidden />
        </p>
        <p className="mt-2 text-app-meta text-[var(--text-secondary)]">{SAMPLE_RECEIPT_HASH_NOTICE}</p>

        <p className="mt-5 text-app-meta text-[var(--text-tertiary)]">Receipt lineage</p>
        <ol className="mt-3">
          {SAMPLE_RECEIPT_LINEAGE.map((row, index) => (
            <li key={row.label} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
              <TimelineMarker state={row.state} last={index === SAMPLE_RECEIPT_LINEAGE.length - 1} />
              <span className="pb-2.5 text-app-body text-[var(--text-secondary)]">{row.label}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
