"use client";

/**
 * Investigation canvas for the October DA flagship.
 * Fixture: Northline Components ops-yield (synthetic). Not a PM board or chat demo.
 */
import { useEffect, useState } from "react";

type Phase = "investigate" | "finding" | "revise";

const ROWS = [
  { period: "prior", line: "L1", shift: "Day", planned: 1000, completed: 940, scrap: 30, yield: "94.0%" },
  { period: "prior", line: "L2", shift: "Day", planned: 1000, completed: 930, scrap: 35, yield: "93.0%" },
  { period: "current", line: "L1", shift: "Day", planned: 1000, completed: 900, scrap: 45, yield: "90.0%", hold: true },
  { period: "current", line: "L2", shift: "Day", planned: 1000, completed: 820, scrap: 90, yield: "82.0%", residual: true },
  { period: "current", line: "L1", shift: "Night", planned: 800, completed: 750, scrap: 25, yield: "93.8%" },
];

const PHASES: { id: Phase; label: string; note: string }[] = [
  {
    id: "investigate",
    label: "Investigate",
    note: "Filter current period. Compare completed vs planned by line and shift.",
  },
  {
    id: "finding",
    label: "Working conclusion",
    note: "HOLD_RECLASS mid-period mapping treats holds like scrap. Prior period was not restated.",
  },
  {
    id: "revise",
    label: "Facts changed",
    note: "Reporting change confirmed - residual risk still sits on L2 Day. Validate before next shift.",
  },
];

export default function HeroSimPreview() {
  const [phase, setPhase] = useState<Phase>("investigate");
  const [filterCurrent, setFilterCurrent] = useState(true);

  useEffect(() => {
    const order: Phase[] = ["investigate", "finding", "revise"];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % order.length;
      const next = order[i];
      setPhase(next);
      setFilterCurrent(next !== "investigate");
    }, 4200);
    return () => clearInterval(t);
  }, []);

  const visible = filterCurrent ? ROWS.filter((r) => r.period === "current") : ROWS;
  const active = PHASES.find((p) => p.id === phase)!;

  return (
    <div
      className="overflow-hidden rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)]"
      data-scene="investigation-canvas"
      data-fixture="northline-ops-yield"
    >
      {/* Window chrome - utilitarian, not decorative glow */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-white/90">Operations performance investigation</span>
          <span className="text-[12px] text-white/35">Northline Components</span>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-white/40">
          <span className="tabular-nums">19:42 left</span>
          <span className="text-white/25">|</span>
          <span>Saved</span>
        </div>
      </div>

      <div className="grid min-h-[440px] lg:min-h-[480px] lg:grid-cols-[210px_1fr_240px]">
        {/* Brief */}
        <aside className="border-b border-[var(--border-subtle)] p-4 lg:border-b-0 lg:border-r">
          <p className="text-[12px] font-medium text-white/50">Business question</p>
          <p className="mt-2 text-[13px] leading-relaxed text-white/80">
            Reported plant yield fell from 93.2%. Is production worse, or did reporting change?
          </p>
          <p className="mt-4 text-[12px] font-medium text-white/50">Resources</p>
          <ul className="mt-2 space-y-1.5 text-[12.5px]">
            <li className="rounded-[6px] bg-white/[0.06] px-2.5 py-1.5 text-white">
              production_runs.csv
            </li>
            <li className="rounded-[6px] px-2.5 py-1.5 text-white/55 hover:bg-white/[0.03]">
              quality_events.csv
            </li>
            <li className="rounded-[6px] px-2.5 py-1.5 text-white/55 hover:bg-white/[0.03]">
              Metric dictionary
            </li>
          </ul>
        </aside>

        {/* Table */}
        <div className="border-b border-[var(--border-subtle)] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterCurrent(false)}
              className={`rounded-[6px] border px-2.5 py-1 text-[12px] transition ${
                !filterCurrent
                  ? "border-white/25 bg-white/[0.08] text-white"
                  : "border-transparent text-white/45 hover:text-white/70"
              }`}
            >
              All periods
            </button>
            <button
              type="button"
              onClick={() => setFilterCurrent(true)}
              className={`rounded-[6px] border px-2.5 py-1 text-[12px] transition ${
                filterCurrent
                  ? "border-white/25 bg-white/[0.08] text-white"
                  : "border-transparent text-white/45 hover:text-white/70"
              }`}
            >
              Current period
            </button>
          </div>
          <div className="overflow-x-auto rounded-[10px] border border-[var(--border-subtle)]">
            <table className="w-full min-w-[480px] border-collapse text-left text-[12px] tabular-nums">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-white/[0.03] text-white/45">
                  <th className="px-2.5 py-2 font-medium">Period</th>
                  <th className="px-2.5 py-2 font-medium">Line</th>
                  <th className="px-2.5 py-2 font-medium">Shift</th>
                  <th className="px-2.5 py-2 font-medium">Planned</th>
                  <th className="px-2.5 py-2 font-medium">Completed</th>
                  <th className="px-2.5 py-2 font-medium">Yield</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const highlight =
                    (phase !== "investigate" && r.hold) ||
                    (phase === "revise" && r.residual);
                  return (
                    <tr
                      key={`${r.period}-${r.line}-${r.shift}`}
                      className={`border-b border-[var(--border-subtle)] last:border-0 ${
                        highlight ? "bg-[var(--fydell-evidence)]/10" : ""
                      }`}
                    >
                      <td className="px-2.5 py-2 text-white/70">{r.period}</td>
                      <td className="px-2.5 py-2 text-white">{r.line}</td>
                      <td className="px-2.5 py-2 text-white/70">{r.shift}</td>
                      <td className="px-2.5 py-2 text-white/70">{r.planned}</td>
                      <td className="px-2.5 py-2 text-white/70">{r.completed}</td>
                      <td
                        className={`px-2.5 py-2 font-medium ${
                          r.residual && phase === "revise"
                            ? "text-[var(--fydell-risk)]"
                            : "text-white"
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

        {/* Evidence tray + conclusion */}
        <aside className="flex flex-col gap-3 p-4">
          <p className="text-[12px] font-medium text-white/50">Evidence tray</p>
          <div className="space-y-2">
            <div className="relative rounded-[10px] border border-[var(--border-subtle)] bg-white/[0.02] py-2.5 pl-3 pr-2.5 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-[var(--fydell-evidence)]">
              <p className="text-[12px] font-medium text-white">HOLD_RECLASS events</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-white/45">
                Appear only in current period (Q-303, Q-304)
              </p>
            </div>
            <div
              className={`relative rounded-[10px] border border-[var(--border-subtle)] bg-white/[0.02] py-2.5 pl-3 pr-2.5 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full ${
                phase === "revise"
                  ? "before:bg-[var(--fydell-risk)]"
                  : "before:bg-white/20"
              }`}
            >
              <p className="text-[12px] font-medium text-white">L2 Day scrap / rework</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-white/45">
                Elevated beyond reclass volume
              </p>
            </div>
          </div>

          <div className="mt-auto rounded-[10px] border border-[var(--border-subtle)] bg-white/[0.03] p-3">
            <p className="text-[12px] font-medium text-white/50">{active.label}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/75">{active.note}</p>
          </div>
        </aside>
      </div>

      {/* Phase selector - compact, not pill ornaments */}
      <div className="flex flex-wrap gap-1 border-t border-[var(--border-subtle)] px-3 py-2">
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPhase(p.id)}
            className={`rounded-[6px] px-2.5 py-1 text-[12px] transition ${
              phase === p.id
                ? "bg-white/[0.1] text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
