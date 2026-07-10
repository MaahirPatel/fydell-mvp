"use client";

import FydellMark from "@/components/brand/FydellMark";

const STAGES = [
  { id: "brief", label: "Brief" },
  { id: "dataroom", label: "Data Room" },
  { id: "forecast", label: "Forecast Model", active: true },
  { id: "assumptions", label: "Assumptions" },
  { id: "update", label: "Manager Update" },
  { id: "memo", label: "Write Memo" },
];

const TABLE_ROWS = [
  { metric: "Revenue Growth", candidate: "8.2%", base: "12.0%", variance: "−3.8pp", danger: false },
  { metric: "Gross Margin", candidate: "42.1%", base: "45.0%", variance: "−2.9pp", danger: false },
  { metric: "Churn Rate", candidate: "6.3%", base: "3.5%", variance: "+2.8pp", danger: true },
  { metric: "Sales Cycle", candidate: "72 d", base: "58 d", variance: "+14 d", danger: false },
  { metric: "Hiring Ramp", candidate: "84%", base: "100%", variance: "−16pp", danger: false },
  { metric: "OpEx Growth", candidate: "11%", base: "8%", variance: "+3pp", danger: false },
  { metric: "Cash Runway", candidate: "9.1 mo", base: "14.0 mo", variance: "−4.9 mo", danger: true },
];

const DATA_ROOM_FILES = [
  { name: "Management Deck", ext: "PDF" },
  { name: "Forecast Export", ext: "XLSX" },
  { name: "Customer Renewal Note", ext: "PDF", highlight: true },
  { name: "Hiring Plan", ext: "XLSX" },
  { name: "Market Research", ext: "PDF" },
  { name: "Cohort Retention", ext: "XLSX" },
];

export default function WorkroomMockup() {
  return (
    <div
      className="fydell-product-frame w-full overflow-hidden"
      style={{ fontFamily: "var(--font-geist-sans, ui-sans-serif)" }}
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex h-7 w-9 items-center justify-center rounded-md border border-white/[0.10] bg-white/[0.04]">
            <FydellMark width={20} />
          </span>
          <span className="text-[13px] font-semibold text-white">
            Project Meridian <span className="font-normal text-white/[0.40]">— FP&amp;A Work Trial</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#36D68A]/[0.24] bg-[#36D68A]/[0.10] px-2.5 py-0.5 text-[11px] font-semibold text-[#6EE7B7]">
            <span className="fydell-status-dot h-1.5 w-1.5 rounded-full bg-[#36D68A]" />
            Session Active
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] tabular-nums text-white/[0.40]">32:14</span>
          <button
            type="button"
            tabIndex={-1}
            className="rounded-[7px] bg-[#315CFF] px-3 py-1.5 text-[11px] font-semibold text-white"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[148px_1fr_210px]">
        <div className="border-r border-white/[0.07] py-3">
          {STAGES.map((s) => (
            <div
              key={s.id}
              className={[
                "relative mx-2 mb-0.5 rounded-[7px] px-3 py-2 text-[11px] font-medium",
                s.active ? "bg-[#315CFF]/[0.10] text-white" : "text-white/[0.38]",
              ].join(" ")}
            >
              {s.active && (
                <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-[#4B6FFF]" />
              )}
              {s.label}
            </div>
          ))}
        </div>

        <div className="overflow-x-clip border-r border-white/[0.07]">
          <div className="border-b border-white/[0.06] px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/[0.38]">
              Forecast Model
            </span>
          </div>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Metric", "Candidate", "Base", "Variance"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-[0.07em] text-white/[0.38]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((row) => (
                <tr
                  key={row.metric}
                  className={[
                    "border-b border-white/[0.04]",
                    row.danger ? "bg-[#E64C87]/[0.035]" : "",
                  ].join(" ")}
                >
                  <td className="px-4 py-2.5 text-white/[0.80]">{row.metric}</td>
                  <td className="px-4 py-2.5 tabular-nums text-[#4B6FFF]">{row.candidate}</td>
                  <td className="px-4 py-2.5 tabular-nums text-white/[0.45]">{row.base}</td>
                  <td
                    className={`px-4 py-2.5 tabular-nums ${
                      row.danger ? "text-[#FF4D6D]" : "text-white/[0.50]"
                    }`}
                  >
                    {row.variance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col">
          <div className="border-b border-white/[0.07]">
            <div className="border-b border-white/[0.05] px-4 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/[0.38]">
                Data Room
              </span>
            </div>
            <div className="space-y-0.5 px-3 py-2">
              {DATA_ROOM_FILES.map((f) => (
                <div
                  key={f.name}
                  className={[
                    "flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-[11px]",
                    f.highlight
                      ? "border border-amber-400/[0.20] bg-amber-400/[0.06]"
                      : "hover:bg-white/[0.03]",
                  ].join(" ")}
                >
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold ${
                      f.ext === "XLSX"
                        ? "bg-emerald-500/[0.15] text-emerald-400"
                        : "bg-white/[0.08] text-white/[0.45]"
                    }`}
                  >
                    {f.ext}
                  </span>
                  <span className={f.highlight ? "text-amber-300/[0.85]" : "text-white/[0.60]"}>
                    {f.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-white/[0.07] px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.07em] text-amber-400/[0.75]">
              Manager Update
            </p>
            <p className="text-[11px] leading-[1.6] text-white/[0.60]">
              New information has been added. Review the customer renewal note before submitting
              your recommendation.
            </p>
          </div>

          <div className="border-b border-white/[0.07] px-4 py-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.07em] text-white/[0.38]">
              Memo Draft
            </p>
            <div className="min-h-[48px] rounded-[7px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] italic text-white/[0.25]">
              Start writing your memo here…
            </div>
          </div>

          <div className="px-4 py-3">
            <p className="text-[10px] leading-[1.6] text-white/[0.30]">
              AI use is allowed. Sources should be reviewed before submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
