/**
 * The hero poster: an open Fydell session.
 *
 * Two related windows on a graphite desk — the employer report the visitor
 * is being asked to trust, and the candidate workbench that produced it.
 * Deliberately static. The interactive inspector lives in the section below.
 *
 * Every value is the released Northline fixture.
 */
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

function ClaimRow({
  text,
  index,
  tone,
  active,
}: {
  text: string;
  index: number;
  tone: "neutral" | "risk";
  active: boolean;
}) {
  const rail = tone === "risk" ? "var(--fydell-risk)" : "var(--fydell-evidence)";
  return (
    <li
      className="relative rounded-[var(--radius-control)] py-1.5 pl-3 pr-2"
      style={{ background: active ? "var(--surface-hover)" : undefined }}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-0 w-[2px] rounded-full"
        style={{ background: active ? rail : "transparent" }}
      />
      <span
        className="block text-[12.5px] leading-[1.4]"
        style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
      >
        {text}
      </span>
      <span
        className="mt-1 inline-flex items-center gap-1 rounded-[var(--radius-tag)] px-1.5 py-0.5 text-[11px] tabular-nums"
        style={{
          background:
            tone === "risk" ? "rgba(242,107,130,0.12)" : "rgba(107,140,255,0.12)",
          color: tone === "risk" ? "var(--fydell-risk)" : "var(--fydell-evidence)",
        }}
      >
        {index} cited
      </span>
    </li>
  );
}

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

export default function HeroComposition() {
  const excerpt = CITATION_SOURCES.reclassEvents;

  return (
    <DesktopStage className="lg:pb-[168px]">
      <div className="relative">
        <AppWindow
          title="Evidence report"
          meta={`${NORTHLINE_SCENARIO.company} · synthetic`}
          session={{ label: "In review", tone: "verified" }}
        >
          <div className="grid lg:grid-cols-[176px_minmax(0,1fr)]">
            <aside
              aria-hidden
              className="hidden border-r border-[var(--border-subtle)] bg-[var(--surface-deep)] px-2.5 py-3 lg:block"
            >
              <ul className="space-y-0.5">
                {APP_NAV.map((item) => (
                  <li
                    key={item}
                    className={`rounded-[6px] px-2 py-1.5 text-[12px] ${
                      item === "Reports"
                        ? "bg-white/[0.06] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </aside>

            <div className="min-w-0">
              <div className="px-4 py-3">
                <p className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
                  Candidate conclusion
                </p>
                <p className="mt-1.5 max-w-[64ch] text-[13px] leading-[1.5] text-[var(--text-primary)]">
                  {NORTHLINE_CONCLUSION}
                </p>
              </div>

              <div className="grid border-t border-[var(--border-subtle)] lg:grid-cols-[minmax(0,1fr)_250px]">
                <div className="border-b border-[var(--border-subtle)] p-2 lg:border-b-0 lg:border-r">
                  <p className="px-2 pb-1 pt-1 text-[11.5px] font-medium text-[var(--text-tertiary)]">
                    Claims
                  </p>
                  <ul className="space-y-0.5">
                    {NORTHLINE_CLAIMS.map((claim, i) => (
                      <ClaimRow
                        key={claim.id}
                        text={claim.text}
                        index={claim.citations.length}
                        tone={claim.tone}
                        active={i === 0}
                      />
                    ))}
                  </ul>
                </div>

                <div className="p-3">
                  <p className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
                    Cited source
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] text-[var(--fydell-evidence)]">
                    quality_events.csv · Q-303, Q-304
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
                  <p className="mt-3 text-[11.5px] font-medium text-[var(--text-tertiary)]">
                    Where this claim stops
                  </p>
                  <p
                    className="mt-1 pl-2 text-[11px] leading-[1.5] text-[var(--text-secondary)]"
                    style={{ borderLeft: "2px solid var(--fydell-risk)" }}
                  >
                    {NORTHLINE_CLAIMS[2].limitation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AppWindow>

        <div
          aria-hidden
          className="pointer-events-none absolute left-5 top-full z-10 hidden w-[min(440px,48%)] -translate-y-12 lg:block xl:left-7 xl:w-[460px]"
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
