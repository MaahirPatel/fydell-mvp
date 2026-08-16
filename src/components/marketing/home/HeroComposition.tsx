/**
 * The hero poster: the candidate's workbench and the employer's report in one
 * layered composition.
 *
 * Deliberately static. The interactive inspector lives in the section below,
 * where nothing overlaps it; layering floating panels over live controls would
 * put dead click targets in the first viewport for the sake of depth.
 *
 * Every value is the released Northline fixture, so the poster and the product
 * cannot drift apart.
 */
import FydellMark from "@/components/brand/FydellMark";
import {
  CITATION_SOURCES,
  NORTHLINE_CHANGED_FACT,
  NORTHLINE_CLAIMS,
  NORTHLINE_CONCLUSION,
  NORTHLINE_SCENARIO,
} from "@/lib/fixtures/northline";

const APP_NAV = ["Home", "Evaluations", "Candidates", "Reports", "Settings"] as const;

/** The rows the candidate is reading when they find the reclassification. */
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
      className="relative rounded-[var(--radius-control)] py-2 pl-3 pr-2.5"
      style={{ background: active ? "var(--surface-hover)" : undefined }}
    >
      <span
        aria-hidden
        className="absolute inset-y-1.5 left-0 w-[2px] rounded-full"
        style={{ background: active ? rail : "transparent" }}
      />
      <span
        className="block text-[13px] leading-[1.45]"
        style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
      >
        {text}
      </span>
      <span
        className="mt-1.5 inline-flex items-center gap-1 rounded-[var(--radius-tag)] px-1.5 py-0.5 text-[11.5px] tabular-nums"
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

export default function HeroComposition() {
  const excerpt = CITATION_SOURCES.reclassEvents;

  return (
    <div className="relative">
      {/* Base layer: the employer report inside the console. */}
      <figure
        className="product-frame m-0 overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)]"
        aria-label="The Fydell employer console showing an evidence report, with the candidate workbench and a revision beside it"
      >
        <div className="grid lg:grid-cols-[196px_minmax(0,1fr)]">
          <aside
            aria-hidden
            className="hidden border-r border-[var(--border-subtle)] bg-[var(--surface-deep)] px-3 py-3.5 lg:block"
          >
            <div className="mb-5 flex items-center gap-2 px-1.5">
              <FydellMark width={17} />
              <span className="text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                fydell
              </span>
            </div>
            <ul className="space-y-0.5">
              {APP_NAV.map((item) => (
                <li
                  key={item}
                  className={`rounded-[6px] px-2 py-1.5 text-[12.5px] ${
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
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                  Evidence report
                </span>
                <span className="hidden shrink-0 text-[12.5px] text-[var(--text-tertiary)] sm:inline">
                  {NORTHLINE_SCENARIO.company} · synthetic
                </span>
              </div>
              <span
                className="hidden shrink-0 rounded-[var(--radius-tag)] px-1.5 py-0.5 text-[11.5px] sm:inline"
                style={{
                  background: "rgba(176,127,208,0.14)",
                  color: "var(--fydell-verified)",
                }}
              >
                Evidence checked
              </span>
            </div>

            <div className="px-4 py-3.5">
              <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
                Candidate conclusion
              </p>
              <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-[1.5] text-[var(--text-primary)]">
                {NORTHLINE_CONCLUSION}
              </p>
            </div>

            {/* The left column reserves an empty band below the claims. The
                workbench panel floats into that band, so the layering reads as
                depth without a single line of evidence hidden behind it. */}
            <div className="grid border-t border-[var(--border-subtle)] lg:grid-cols-[minmax(0,1fr)_268px]">
              <div className="border-b border-[var(--border-subtle)] p-2 lg:min-h-[494px] lg:border-b-0 lg:border-r">
                <p className="px-2 pb-1.5 pt-1 text-[12px] font-medium text-[var(--text-tertiary)]">
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
                <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
                  Cited source
                </p>
                <p className="mt-1.5 font-mono text-[11.5px] text-[var(--fydell-evidence)]">
                  quality_events.csv · Q-303, Q-304
                </p>
                <div className="mt-2 overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-deep)]">
                  {excerpt.map((line) => (
                    <p
                      key={line.text}
                      className="truncate px-2 py-1 font-mono text-[11px] leading-[1.45]"
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

                <p className="mt-4 text-[12px] font-medium text-[var(--text-tertiary)]">
                  Where this claim stops
                </p>
                <p
                  className="mt-1 pl-2 text-[11.5px] leading-[1.5] text-[var(--text-secondary)]"
                  style={{ borderLeft: "2px solid var(--fydell-risk)" }}
                >
                  {NORTHLINE_CLAIMS[2].limitation}
                </p>

                <p
                  className="mt-4 text-[12px] font-medium"
                  style={{ color: "var(--fydell-changed)" }}
                >
                  {NORTHLINE_CHANGED_FACT.after.label}
                </p>
                <p className="mt-1 text-[11.5px] leading-[1.5] text-[var(--text-secondary)]">
                  {NORTHLINE_CHANGED_FACT.after.text}
                </p>
                <p
                  className="mt-2.5 text-[11.5px] font-medium"
                  style={{ color: "var(--fydell-good)" }}
                >
                  Candidate revised
                </p>
                <p className="mt-1 text-[11.5px] leading-[1.5] text-[var(--text-tertiary)]">
                  Reclassification share fell to about two thirds. The L2 Day
                  loss stayed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </figure>

      {/* Overlay: the candidate's workbench, where those claims came from.
          It sits in the reserved band, never over evidence text. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-5 left-5 hidden w-[430px] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-strong)] bg-[var(--surface-panel)] shadow-[0_18px_48px_-12px_rgba(0,0,0,0.8)] lg:block xl:w-[470px]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2">
          <span className="text-[12px] font-medium text-[var(--text-primary)]">
            production_runs.csv
          </span>
          <span className="font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
            7 rows
          </span>
        </div>
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
      </div>

    </div>
  );
}
