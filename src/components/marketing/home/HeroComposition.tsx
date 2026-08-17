/**
 * The hero poster: an open Fydell session, staged the way Linear stages an
 * issue, three panes, hairline structure, one related window floating on
 * the desk.
 *
 * Deliberately static. The interactive inspector lives in the section below.
 * Every value is the released Northline fixture.
 */
import type { ReactNode } from "react";
import { AppWindow, DesktopStage } from "@/components/fydell/ProductDesktop";
import {
  CITATION_SOURCES,
  NORTHLINE_CLAIMS,
  NORTHLINE_CONCLUSION,
  NORTHLINE_SCENARIO,
} from "@/lib/fixtures/northline";

const APP_NAV = ["Home", "Evaluations", "Candidates", "Reports", "Settings"] as const;

const RUNS = [
  { period: "prior", line: "L1", shift: "Day", completed: 940, scrap: 30, yield: "94.0%" },
  { period: "prior", line: "L2", shift: "Day", completed: 930, scrap: 35, yield: "93.0%" },
  { period: "current", line: "L1", shift: "Day", completed: 900, scrap: 45, yield: "90.0%", cited: true },
  { period: "current", line: "L2", shift: "Day", completed: 820, scrap: 90, yield: "82.0%", risk: true },
  { period: "current", line: "L2", shift: "Night", completed: 860, scrap: 20, yield: "95.6%" },
];

function WorkbenchTable() {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {["period", "line", "shift", "completed", "scrap", "yield"].map((h) => (
            <th
              key={h}
              className="px-2 py-1.5 text-left font-mono text-[10.5px] font-normal text-[var(--text-tertiary)]"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {RUNS.map((r, i) => (
          <tr
            key={`${r.period}-${r.line}-${r.shift}`}
            style={{
              background: r.risk
                ? "rgba(242,107,130,0.11)"
                : r.cited
                  ? "rgba(107,140,255,0.11)"
                  : i % 2
                    ? "rgba(255,255,255,0.015)"
                    : undefined,
            }}
          >
            {[r.period, r.line, r.shift, r.completed, r.scrap, r.yield].map(
              (cell, ci) => (
                <td
                  key={ci}
                  className="border-t border-[var(--border-subtle)] px-2 py-1.5 font-mono text-[11px] tabular-nums"
                  style={{
                    color: r.risk
                      ? "var(--fydell-risk)"
                      : r.cited
                        ? "var(--text-primary)"
                        : "var(--text-secondary)",
                  }}
                >
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-[12px] text-[var(--text-tertiary)]">{label}</span>
      <span className="min-w-0 text-right text-[12.5px] leading-[1.4] text-[var(--text-primary)]">
        {children}
      </span>
    </div>
  );
}

export default function HeroComposition() {
  const excerpt = CITATION_SOURCES.reclassEvents;

  return (
    <DesktopStage className="lg:pb-[176px]">
      <div className="relative">
        <AppWindow
          title="fydell"
          meta="Reports"
          session={{ label: "In review", tone: "verified" }}
        >
          <div className="grid lg:grid-cols-[188px_minmax(0,1fr)_220px]">
            <aside
              aria-hidden
              className="hidden border-r border-[var(--border-subtle)] bg-[var(--surface-deep)] px-2.5 py-3 lg:block"
            >
              <ul className="space-y-0.5">
                {APP_NAV.map((item) => (
                  <li
                    key={item}
                    className={`relative rounded-[6px] px-2.5 py-1.5 text-[12.5px] ${
                      item === "Reports"
                        ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {item === "Reports" ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-[var(--fydell-evidence)]"
                      />
                    ) : null}
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 px-2.5 text-[11px] font-medium text-[var(--text-tertiary)]">
                Open
              </p>
              <p className="mt-1.5 rounded-[6px] bg-white/[0.04] px-2.5 py-1.5 text-[12px] leading-[1.4] text-[var(--text-secondary)]">
                {NORTHLINE_SCENARIO.evaluation}
              </p>
            </aside>

            <div className="min-w-0 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ color: "var(--fydell-verified)" }}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--fydell-verified)" }}
                  />
                  In review
                </span>
                <span className="text-[12px] text-[var(--text-tertiary)]">
                  {NORTHLINE_SCENARIO.company} · synthetic
                </span>
              </div>
              <h3 className="mt-2 text-[22px] font-medium leading-[1.2] tracking-[-0.028em] text-[var(--text-primary)]">
                Evidence report
              </h3>
              <p className="mt-3 max-w-[62ch] text-[13.5px] leading-[1.55] text-[var(--text-secondary)]">
                {NORTHLINE_CONCLUSION}
              </p>

              <p className="mt-6 text-[12px] font-medium text-[var(--text-tertiary)]">
                Claims
              </p>
              <ol className="mt-2 space-y-0">
                {NORTHLINE_CLAIMS.map((claim, i) => {
                  const color =
                    claim.tone === "risk"
                      ? "var(--fydell-risk)"
                      : i === 0
                        ? "var(--fydell-evidence)"
                        : "var(--fydell-verified)";
                  return (
                    <li
                      key={claim.id}
                      className="relative border-b border-[var(--border-subtle)] py-2.5 last:border-b-0"
                    >
                      <span
                        aria-hidden
                        className="absolute left-0 top-3.5 h-1.5 w-1.5 rounded-full"
                        style={{ background: color }}
                      />
                      <p className="pl-4 text-[13px] leading-[1.45] text-[var(--text-primary)]">
                        {claim.text}
                      </p>
                      <p className="mt-1 pl-4 text-[11.5px] text-[var(--text-tertiary)]">
                        {claim.citations.length} cited
                        {claim.limitation ? " · limitation recorded" : ""}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>

            <aside className="border-t border-[var(--border-subtle)] px-4 py-4 lg:border-l lg:border-t-0">
              <MetaRow label="Status">
                <span style={{ color: "var(--fydell-verified)" }}>In review</span>
              </MetaRow>
              <MetaRow label="Role">{NORTHLINE_SCENARIO.role}</MetaRow>
              <MetaRow label="Duration">{NORTHLINE_SCENARIO.duration}</MetaRow>
              <MetaRow label="Source">quality_events.csv</MetaRow>

              <p className="mt-4 text-[12px] font-medium text-[var(--text-tertiary)]">
                Cited rows
              </p>
              <div className="mt-2 overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-deep)]">
                {excerpt.map((line) => (
                  <p
                    key={line.text}
                    className="truncate px-2 py-1 font-mono text-[10.5px] leading-[1.45]"
                    style={{
                      background: line.highlight
                        ? "rgba(107,140,255,0.13)"
                        : undefined,
                      color: line.highlight
                        ? "var(--text-primary)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            </aside>
          </div>
        </AppWindow>

        <div
          aria-hidden
          className="pointer-events-none absolute right-5 top-full z-10 hidden w-[min(440px,46%)] -translate-y-12 lg:block xl:right-7 xl:w-[460px]"
        >
          <AppWindow
            compact
            title="Candidate workbench"
            meta="production_runs.csv"
            session={{ label: "19:42 left", tone: "evidence" }}
            className="app-window-float"
          >
            <WorkbenchTable />
          </AppWindow>
        </div>
      </div>
    </DesktopStage>
  );
}
