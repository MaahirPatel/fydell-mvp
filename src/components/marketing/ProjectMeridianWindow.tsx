"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import FydellMark from "@/components/brand/FydellMark";

const STAGE_CYCLE = ["forecast", "dataroom", "update", "memo"] as const;

const STAGES = [
  { id: "brief", label: "Brief" },
  { id: "dataroom", label: "Data Room" },
  { id: "forecast", label: "Forecast Model" },
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

const RECENT_EVIDENCE = [
  { time: "18:03", text: "Flagged cash runway risk" },
  { time: "12:47", text: "Updated revenue drivers" },
  { time: "09:12", text: "Revised churn assumption" },
];

const DATA_ROOM_FILES = [
  { name: "Management Deck", ext: "PDF" },
  { name: "Forecast Export", ext: "XLSX" },
  { name: "Customer Renewal Note", ext: "PDF", highlight: true },
  { name: "Hiring Plan", ext: "XLSX" },
  { name: "Market Research", ext: "PDF" },
];

function VarianceCell({ value, dir }: { value: string; dir: VarianceDir }) {
  const color =
    dir === "danger"
      ? "text-[#FF4D6D]"
      : dir === "warn"
        ? "text-white/[0.55]"
        : "text-white/[0.55]";
  return <span className={`tabular-nums ${color}`}>{value}</span>;
}

function ForecastPanel() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/[0.42]">
          Forecast Model
        </p>
      </div>
      <div className="flex-1 overflow-x-clip">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["Metric", "Candidate Forecast", "Company Base", "Variance", "Notes"].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-white/[0.42]"
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
                  "border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]",
                  row.varDir === "danger" ? "bg-[#E64C87]/[0.035]" : "",
                ].join(" ")}
              >
                <td className="px-4 py-2.5 font-medium text-white/[0.85]">{row.metric}</td>
                <td className="px-4 py-2.5 tabular-nums text-[#4B6FFF]">{row.candidate}</td>
                <td className="px-4 py-2.5 tabular-nums text-white/[0.46]">{row.base}</td>
                <td className="px-4 py-2.5">
                  <VarianceCell value={row.variance} dir={row.varDir} />
                </td>
                <td className="px-4 py-2.5 italic text-white/[0.38]">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DataRoomPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/[0.42]">
          Data Room
        </p>
      </div>
      <div className="space-y-1 px-3 py-3">
        {DATA_ROOM_FILES.map((f) => (
          <div
            key={f.name}
            className={[
              "flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[12px]",
              f.highlight
                ? "border border-amber-400/[0.22] bg-amber-400/[0.06]"
                : "border border-transparent bg-white/[0.02]",
            ].join(" ")}
          >
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                f.ext === "XLSX"
                  ? "bg-emerald-500/[0.15] text-emerald-400"
                  : "bg-white/[0.08] text-white/[0.45]"
              }`}
            >
              {f.ext}
            </span>
            <span className={f.highlight ? "text-amber-200/90" : "text-white/[0.72]"}>
              {f.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManagerPanel() {
  return (
    <div className="flex h-full flex-col px-5 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-400/80">
        Manager Update
      </p>
      <div className="mt-4 rounded-[12px] border border-amber-400/[0.22] bg-amber-400/[0.05] px-4 py-4">
        <p className="text-[13px] leading-[1.65] text-white/[0.78]">
          New information has been added. Review the customer renewal note before submitting your
          recommendation.
        </p>
      </div>
      <p className="mt-4 text-[12px] text-white/[0.42]">
        This mid-session data drop changes the picture. Evidence will capture how the candidate
        responds.
      </p>
    </div>
  );
}

function MemoPanel() {
  return (
    <div className="flex h-full flex-col px-5 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/[0.42]">
        Write Memo
      </p>
      <div className="mt-4 min-h-[160px] flex-1 rounded-[12px] border border-white/[0.10] bg-white/[0.03] px-4 py-3 text-[13px] leading-[1.65] text-white/[0.28] italic">
        Start writing your memo here
        <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-white/50 align-middle" />
      </div>
      <p className="mt-3 text-[11px] text-white/[0.35]">
        AI use is allowed. Sources should be reviewed before submission.
      </p>
    </div>
  );
}

export default function ProjectMeridianWindow({
  cycle = true,
}: {
  cycle?: boolean;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<(typeof STAGE_CYCLE)[number]>("forecast");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!cycle || reduce || paused) return;
    if (typeof document !== "undefined" && document.hidden) return;

    const id = window.setInterval(() => {
      if (document.hidden) return;
      setActive((prev) => {
        const idx = STAGE_CYCLE.indexOf(prev);
        return STAGE_CYCLE[(idx + 1) % STAGE_CYCLE.length];
      });
    }, 4000);

    return () => window.clearInterval(id);
  }, [cycle, reduce, paused]);

  const center =
    active === "dataroom" ? (
      <DataRoomPanel />
    ) : active === "update" ? (
      <ManagerPanel />
    ) : active === "memo" ? (
      <MemoPanel />
    ) : (
      <ForecastPanel />
    );

  return (
    <div
      className="fydell-product-frame w-full overflow-hidden"
      style={{ fontFamily: "var(--font-geist-sans, ui-sans-serif)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span className="inline-flex h-7 w-9 items-center justify-center rounded-md border border-white/[0.10] bg-white/[0.04]">
            <FydellMark width={22} />
          </span>
          <span className="text-[13px] font-semibold text-white">
            Project Meridian{" "}
            <span className="font-normal text-white/[0.42]">— FP&amp;A Work Trial</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#36D68A]/[0.24] bg-[#36D68A]/[0.10] px-2.5 py-0.5 text-[12px] font-semibold text-[#6EE7B7]">
            <span className="fydell-status-dot h-1.5 w-1.5 rounded-full bg-[#36D68A]" />
            Session Active
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-[12px] tabular-nums text-white/[0.42] sm:inline">
            Time remaining <span className="font-medium text-white/[0.75]">32:14</span>
          </span>
          <button
            type="button"
            tabIndex={-1}
            className="rounded-[8px] bg-[#315CFF] px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            Submit work
          </button>
        </div>
      </div>

      <div className="grid min-h-[500px] grid-cols-[160px_1fr_188px]">
        <div className="flex flex-col border-r border-white/[0.08] py-3">
          {STAGES.map((s) => {
            const isActive = s.id === active;
            return (
              <div
                key={s.id}
                className={[
                  "relative mx-2 mb-0.5 cursor-default rounded-[8px] px-3 py-2 text-[12px] font-medium transition-colors",
                  isActive
                    ? "bg-[#315CFF]/[0.10] text-white"
                    : "text-white/[0.42] hover:text-white/[0.72]",
                ].join(" ")}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[#4B6FFF]"
                    aria-hidden
                  />
                )}
                {s.label}
              </div>
            );
          })}
          <div className="mt-auto border-t border-white/[0.06] px-3 pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] text-white/[0.42]">Session progress</span>
              <span className="text-[10px] font-semibold text-white">68%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#315CFF] to-[#7B5CFF]"
                style={{ width: "68%" }}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden">{center}</div>

        <div className="flex flex-col border-l border-white/[0.08]">
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/[0.42]">
              Evidence Capture
            </p>
          </div>
          <div className="flex-1 space-y-2 px-4 py-3">
            {EVIDENCE_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[11px] text-white/[0.52]">{item.label}</span>
                <span className="text-[12px] font-semibold tabular-nums text-white">
                  {item.value}
                </span>
              </div>
            ))}
            <div className="pt-2">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/[0.35]">
                Recent Evidence
              </p>
              <div className="space-y-2">
                {RECENT_EVIDENCE.map((row) => (
                  <div key={row.time} className="flex gap-2">
                    <span className="w-9 shrink-0 text-[10px] tabular-nums text-white/[0.32]">
                      {row.time}
                    </span>
                    <span className="text-[11px] leading-[1.4] text-white/[0.58]">{row.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] px-4 py-3">
            <p className="text-[10px] text-white/[0.30]">Auto-saved just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
