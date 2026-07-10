"use client";

import FydellMark from "@/components/brand/FydellMark";

// ─── Data ─────────────────────────────────────────────────────────────────────

const STAGES = [
  { id: "brief", label: "Brief" },
  { id: "dataroom", label: "Data Room" },
  { id: "forecast", label: "Forecast Model", active: true },
  { id: "assumptions", label: "Assumptions" },
  { id: "update", label: "Manager Update" },
  { id: "memo", label: "Write Memo" },
];

type VarianceDir = "neutral" | "danger" | "warn";

interface ForecastRow {
  metric: string;
  candidate: string;
  base: string;
  variance: string;
  varDir: VarianceDir;
  notes: string;
}

const TABLE_ROWS: ForecastRow[] = [
  {
    metric: "Revenue Growth",
    candidate: "8.2%",
    base: "12.0%",
    variance: "−3.8pp",
    varDir: "warn",
    notes: "Revised down post-renewal note",
  },
  {
    metric: "Gross Margin",
    candidate: "42.1%",
    base: "45.0%",
    variance: "−2.9pp",
    varDir: "warn",
    notes: "COGS uplift assumption",
  },
  {
    metric: "Churn Rate",
    candidate: "6.3%",
    base: "3.5%",
    variance: "+2.8pp",
    varDir: "danger",
    notes: "Risk flagged in assumptions",
  },
  {
    metric: "Sales Cycle",
    candidate: "72 days",
    base: "58 days",
    variance: "+14 days",
    varDir: "warn",
    notes: "Extended per SMB segment",
  },
  {
    metric: "Hiring Ramp",
    candidate: "84%",
    base: "100%",
    variance: "−16pp",
    varDir: "warn",
    notes: "Q3 headcount delayed",
  },
  {
    metric: "OpEx Growth",
    candidate: "11%",
    base: "8%",
    variance: "+3pp",
    varDir: "warn",
    notes: "",
  },
  {
    metric: "Cash Runway",
    candidate: "9.1 mo",
    base: "14.0 mo",
    variance: "−4.9 mo",
    varDir: "danger",
    notes: "Stress scenario applied",
  },
];

const EVIDENCE_ITEMS = [
  { label: "Documents opened", value: 7 },
  { label: "Assumptions changed", value: 4 },
  { label: "Risks flagged", value: 2 },
  { label: "AI prompts logged", value: 9 },
  { label: "Sources reviewed", value: 5 },
  { label: "Notes added", value: 3 },
];

// ─── Variance cell helper ─────────────────────────────────────────────────────

function VarianceCell({ value, dir }: { value: string; dir: VarianceDir }) {
  const color =
    dir === "danger"
      ? "text-[#F06292]"
      : dir === "warn"
      ? "text-white/[0.55]"
      : "text-white/[0.55]";
  return <span className={`tabular-nums ${color}`}>{value}</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectMeridianWindow() {
  return (
    <div
      className="w-full overflow-hidden rounded-[20px] border border-white/[0.12] bg-[#080B12]/85 shadow-[0_32px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      style={{ fontFamily: "var(--font-geist-sans, ui-sans-serif)" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-9 items-center justify-center rounded-md border border-white/[0.10] bg-white/[0.04]">
            <FydellMark width={22} />
          </span>
          <span className="text-[13px] font-semibold text-white">
            Project Meridian{" "}
            <span className="text-white/[0.42] font-normal">— FP&amp;A Work Trial</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/[0.25] bg-emerald-500/[0.10] px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            In progress
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] tabular-nums text-white/[0.42]">
            Time remaining{" "}
            <span className="text-white/[0.75] font-medium">32:14</span>
          </span>
          <button
            type="button"
            className="rounded-[8px] bg-[#3B5BFF] px-3 py-1.5 text-[12px] font-medium text-white"
          >
            Submit work
          </button>
        </div>
      </div>

      {/* Body — 3 columns */}
      <div className="grid grid-cols-[160px_1fr_172px] min-h-[480px]">
        {/* Left stage rail */}
        <div className="border-r border-white/[0.08] py-3">
          {STAGES.map((s) => (
            <div
              key={s.id}
              className={[
                "mx-2 mb-0.5 cursor-default rounded-[8px] px-3 py-2 text-[12px] font-medium transition-colors",
                s.active
                  ? "border border-[#3B5BFF]/[0.20] bg-[#3B5BFF]/[0.15] text-white"
                  : "text-white/[0.45] hover:text-white/[0.75]",
              ].join(" ")}
            >
              {s.label}
            </div>
          ))}
        </div>

        {/* Center — Forecast table */}
        <div className="flex flex-col overflow-hidden">
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/[0.42]">
              Forecast Model
            </p>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Metric", "Candidate Forecast", "Company Base", "Variance", "Notes"].map(
                    (h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-white/[0.42]"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row, i) => (
                  <tr
                    key={row.metric}
                    className={[
                      "border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]",
                      row.varDir === "danger" ? "bg-[#F06292]/[0.03]" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-2.5 font-medium text-white/[0.85]">
                      {row.metric}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-white">
                      {row.candidate}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-white/[0.55]">
                      {row.base}
                    </td>
                    <td className="px-4 py-2.5">
                      <VarianceCell value={row.variance} dir={row.varDir} />
                    </td>
                    <td className="px-4 py-2.5 text-white/[0.40] italic">
                      {row.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right — Evidence panel */}
        <div className="border-l border-white/[0.08] flex flex-col">
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/[0.42]">
              Evidence capture
            </p>
          </div>
          <div className="flex-1 px-4 py-3 space-y-2">
            {EVIDENCE_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[11px] text-white/[0.55]">{item.label}</span>
                <span className="text-[12px] font-semibold tabular-nums text-white">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          {/* Session summary */}
          <div className="border-t border-white/[0.06] px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-white/[0.42]">Session progress</span>
              <span className="text-[11px] font-semibold text-white">68%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-[#3B5BFF]"
                style={{ width: "68%" }}
              />
            </div>
            <p className="mt-2 text-[10px] text-white/[0.30]">Auto-saved just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
