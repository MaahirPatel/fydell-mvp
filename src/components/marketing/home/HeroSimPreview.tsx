"use client";

/**
 * The investigation canvas, rendered from the real Northline fixture rather
 * than a screenshot. Synthetic data; not affiliated with any customer brand.
 *
 * The three steps are driven by the visitor, not by a timer. Nothing here
 * moves on its own.
 */
import { useState } from "react";

type Step = "investigate" | "conclusion" | "revised";

const ROWS: {
  period: "prior" | "current";
  line: string;
  shift: string;
  planned: number;
  completed: number;
  scrap: number;
  yield: string;
  reclass?: boolean;
  residual?: boolean;
}[] = [
  { period: "prior", line: "L1", shift: "Day", planned: 1000, completed: 940, scrap: 30, yield: "94.0%" },
  { period: "prior", line: "L2", shift: "Day", planned: 1000, completed: 930, scrap: 35, yield: "93.0%" },
  { period: "prior", line: "L1", shift: "Night", planned: 800, completed: 760, scrap: 20, yield: "95.0%" },
  { period: "current", line: "L1", shift: "Day", planned: 1000, completed: 900, scrap: 45, yield: "90.0%", reclass: true },
  { period: "current", line: "L2", shift: "Day", planned: 1000, completed: 820, scrap: 90, yield: "82.0%", reclass: true, residual: true },
  { period: "current", line: "L1", shift: "Night", planned: 800, completed: 750, scrap: 25, yield: "93.8%" },
  { period: "current", line: "L2", shift: "Night", planned: 900, completed: 860, scrap: 20, yield: "95.6%" },
];

const STEPS: {
  id: Step;
  label: string;
  heading: string;
  body: string;
}[] = [
  {
    id: "investigate",
    label: "Investigate",
    heading: "Working from the raw data",
    body: "Reported yield fell from 93.2 percent. Both periods are on screen before any conclusion is written.",
  },
  {
    id: "conclusion",
    label: "First conclusion",
    heading: "Most of the drop is a reporting change",
    body: "HOLD_RECLASS was introduced mid-period and routes held units out of good output. The prior period was never restated, so the two are not comparable.",
  },
  {
    id: "revised",
    label: "After the facts change",
    heading: "One real risk survives the correction",
    body: "Line L2 Day still carries rework and scrap beyond the reclassified volume. That is an operational issue and it should be validated before the next shift.",
  },
];

const EVIDENCE: { id: Step[]; title: string; detail: string; tone: "evidence" | "risk" }[] = [
  {
    id: ["conclusion", "revised"],
    title: "HOLD_RECLASS events",
    detail: "Q-303 and Q-304, current period only",
    tone: "evidence",
  },
  {
    id: ["conclusion", "revised"],
    title: "Metric dictionary",
    detail: "Yield excludes units that leave good output",
    tone: "evidence",
  },
  {
    id: ["revised"],
    title: "L2 Day rework and scrap",
    detail: "90 units, above the reclassified volume",
    tone: "risk",
  },
];

const FILES = [
  "production_runs.csv",
  "quality_events.csv",
  "Metric dictionary",
];

export default function HeroSimPreview() {
  const [step, setStep] = useState<Step>("investigate");
  const [currentOnly, setCurrentOnly] = useState(false);

  const active = STEPS.find((s) => s.id === step)!;
  const rows = currentOnly ? ROWS.filter((r) => r.period === "current") : ROWS;
  const evidence = EVIDENCE.filter((e) => e.id.includes(step));

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[var(--shadow-panel)]"
      data-scene="investigation-canvas"
      data-fixture="northline-ops-yield"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
            Operations performance investigation
          </span>
          <span className="hidden shrink-0 text-[12.5px] text-[var(--text-tertiary)] sm:inline">
            Northline Components
          </span>
        </div>
        {/* "Saved" used to sit here. It was a static word with no save behind
            it, which is exactly the decorative status pill the product should
            not ship. The timer stays because the task really is timed. */}
        <div className="flex shrink-0 items-center gap-3 text-[12.5px] text-[var(--text-tertiary)]">
          <span className="tabular-nums">19:42 left</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[188px_minmax(0,1fr)_248px]">
        <aside className="border-b border-[var(--border-subtle)] p-4 lg:border-b-0 lg:border-r">
          <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
            Business question
          </p>
          <p className="mt-2 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
            Reported yield fell. Is production worse, or did reporting change?
          </p>
          <p className="mt-5 text-[12px] font-medium text-[var(--text-tertiary)]">
            Resources
          </p>
          <ul className="mt-2 space-y-0.5">
            {FILES.map((file, i) => (
              <li
                key={file}
                className={`rounded-[5px] px-2 py-1.5 text-[12.5px] ${
                  i === 0
                    ? "bg-white/[0.06] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {file}
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0 border-b border-[var(--border-subtle)] p-4 lg:border-b-0 lg:border-r">
          <div
            className="mb-3 inline-flex rounded-[6px] border border-[var(--border-subtle)] p-0.5"
            role="group"
            aria-label="Filter rows by period"
          >
            {[
              { label: "All periods", value: false },
              { label: "Current only", value: true },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setCurrentOnly(option.value)}
                aria-pressed={currentOnly === option.value}
                className={`rounded-[4px] px-2.5 py-1 text-[12px] transition-colors ${
                  currentOnly === option.value
                    ? "bg-white/[0.09] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[430px] border-collapse text-left text-[12.5px] tabular-nums">
              <caption className="sr-only">
                Production runs by period, line and shift
              </caption>
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {["Period", "Line", "Shift", "Planned", "Completed", "Yield"].map(
                    (head, i) => (
                      <th
                        key={head}
                        scope="col"
                        className={`py-2 pr-3 text-[11.5px] font-medium uppercase tracking-[0.04em] text-[var(--text-tertiary)] ${
                          i > 2 ? "text-right" : ""
                        }`}
                      >
                        {head}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const flagged = step !== "investigate" && r.reclass;
                  const risky = step === "revised" && r.residual;
                  return (
                    <tr
                      key={`${r.period}-${r.line}-${r.shift}`}
                      className={`border-b border-[var(--border-subtle)] last:border-b-0 ${
                        risky
                          ? "bg-[rgba(242,107,130,0.07)]"
                          : flagged
                            ? "bg-[rgba(233,185,73,0.07)]"
                            : ""
                      }`}
                    >
                      <td className="py-2 pr-3 text-[var(--text-secondary)]">{r.period}</td>
                      <td className="py-2 pr-3 text-[var(--text-primary)]">{r.line}</td>
                      <td className="py-2 pr-3 text-[var(--text-secondary)]">{r.shift}</td>
                      <td className="py-2 pr-3 text-right text-[var(--text-secondary)]">
                        {r.planned}
                      </td>
                      <td className="py-2 pr-3 text-right text-[var(--text-secondary)]">
                        {r.completed}
                      </td>
                      <td
                        className={`py-2 pr-3 text-right font-medium ${
                          risky
                            ? "text-[var(--fydell-risk)]"
                            : flagged
                              ? "text-[var(--fydell-changed)]"
                              : "text-[var(--text-primary)]"
                        }`}
                      >
                        {r.yield}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="flex flex-col p-4">
          <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
            {active.id === "investigate" ? "Notes" : "Conclusion"}
          </p>
          <p className="mt-2 text-[12.5px] font-medium leading-[1.45] text-[var(--text-primary)]">
            {active.heading}
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-[var(--text-secondary)]">
            {active.body}
          </p>

          {evidence.length > 0 ? (
            <>
              <p className="mt-5 text-[12px] font-medium text-[var(--text-tertiary)]">
                Cited evidence
              </p>
              <ul className="mt-2 space-y-1.5">
                {evidence.map((item) => (
                  <li
                    key={item.title}
                    className="relative rounded-[6px] border border-[var(--border-subtle)] py-2 pl-3 pr-2.5"
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-y-1.5 left-0 w-[2px] rounded-full ${
                        item.tone === "risk"
                          ? "bg-[var(--fydell-risk)]"
                          : "bg-[var(--fydell-evidence)]"
                      }`}
                    />
                    <p className="text-[12px] font-medium text-[var(--text-primary)]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-[1.45] text-[var(--text-secondary)]">
                      {item.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </aside>
      </div>

      {/* Selection is a filled index and a top rail, not a background pill. The
          control keeps one silhouette whether or not a step is active, so the
          footer does not turn into a field of capsules. */}
      <div className="flex flex-wrap items-stretch border-t border-[var(--border-subtle)]">
        {STEPS.map((s, i) => {
          const active = step === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              aria-pressed={active}
              className="group relative flex items-center gap-2 px-3.5 py-2.5 text-[12px] transition-colors"
            >
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-[2px] ${
                  active ? "bg-[var(--fydell-evidence)]" : "bg-transparent"
                }`}
              />
              <span
                aria-hidden
                className={`inline-flex h-[17px] w-[17px] items-center justify-center rounded-[4px] border text-[10.5px] tabular-nums ${
                  active
                    ? "border-[rgba(107,140,255,0.5)] bg-[rgba(107,140,255,0.18)] text-[#a9bcff]"
                    : "border-[var(--border-default)] text-[var(--text-tertiary)]"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={
                  active
                    ? "font-medium text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                }
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
