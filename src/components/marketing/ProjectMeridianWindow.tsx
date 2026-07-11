"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import FydellMark from "@/components/brand/FydellMark";

const STAGES = [
  { id: "brief", label: "Brief" },
  { id: "dataroom", label: "Data Room" },
  { id: "forecast", label: "Forecast Model" },
  { id: "assumptions", label: "Assumptions" },
  { id: "update", label: "Manager Update" },
  { id: "memo", label: "Write Memo" },
] as const;

type StageId = (typeof STAGES)[number]["id"];
type VarianceDir = "neutral" | "danger" | "warn";

interface ForecastRow {
  metric: string;
  candidate: string;
  base: string;
  variance: string;
  varDir: VarianceDir;
  notes: string;
  highlight?: boolean;
}

const TABLE_ROWS: ForecastRow[] = [
  {
    metric: "Revenue Growth",
    candidate: "8.2%",
    base: "12.0%",
    variance: "−3.8pp",
    varDir: "warn",
    notes: "Revised after renewal note",
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
    highlight: true,
  },
  {
    metric: "Sales Cycle",
    candidate: "72 days",
    base: "58 days",
    variance: "+14 days",
    varDir: "warn",
    notes: "Extended for SMB segment",
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
    highlight: true,
  },
];

const EVIDENCE_METRICS = [
  { label: "Documents reviewed", value: 7 },
  { label: "Assumptions revised", value: 4 },
  { label: "Material risks flagged", value: 2 },
  { label: "AI interactions", value: 9 },
  { label: "Sources verified", value: 5 },
];

const RECENT_EVIDENCE = [
  { time: "18:03", text: "Flagged a cash-runway risk" },
  { time: "12:47", text: "Revised the revenue drivers" },
  { time: "09:12", text: "Increased churn after reviewing renewals" },
];

function VarianceCell({ value, dir }: { value: string; dir: VarianceDir }) {
  const color =
    dir === "danger"
      ? "text-[#F26B82]"
      : dir === "warn"
        ? "text-[#A3A7B2]"
        : "text-[#717682]";
  return <span className={`tabular-nums ${color}`}>{value}</span>;
}

const DATA_ROOM_FILES = [
  { name: "Management Deck", ext: "PDF" },
  { name: "Forecast Export", ext: "XLSX" },
  { name: "Customer Renewal Note", ext: "PDF", highlight: true },
  { name: "Hiring Plan", ext: "XLSX" },
  { name: "Market Research", ext: "PDF" },
];

function DataRoomPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[42px] items-center border-b border-[var(--border-subtle)] px-4">
        <p
          className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
          style={{ fontWeight: 550 }}
        >
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
                ? "border border-[rgba(242,107,130,0.22)] bg-[rgba(242,107,130,0.06)]"
                : "border border-transparent bg-white/[0.02]",
            ].join(" ")}
          >
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] ${
                f.ext === "XLSX"
                  ? "bg-[rgba(103,217,160,0.14)] text-[#8EE4B8]"
                  : "bg-white/[0.06] text-[var(--text-tertiary)]"
              }`}
              style={{ fontWeight: 600 }}
            >
              {f.ext}
            </span>
            <span className={f.highlight ? "text-[#F7B0BC]" : "text-[var(--text-secondary)]"}>
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
      <p
        className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
        style={{ fontWeight: 550 }}
      >
        Manager Update
      </p>
      <div className="mt-4 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-1)] px-4 py-4">
        <p className="text-[13px] leading-[1.55] text-[var(--text-secondary)]">
          Renewal risk increased for the SMB segment. Review the customer renewal note before
          submitting your recommendation.
        </p>
      </div>
    </div>
  );
}

function MemoPanel() {
  return (
    <div className="flex h-full flex-col px-5 py-5">
      <p
        className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
        style={{ fontWeight: 550 }}
      >
        Write Memo
      </p>
      <div className="mt-4 min-h-[160px] flex-1 rounded-[10px] border border-[var(--border-default)] bg-white/[0.02] px-4 py-3 text-[13px] leading-[1.55] text-[var(--text-tertiary)] italic">
        Start writing your memo here
      </div>
    </div>
  );
}

function ForecastPanel() {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="flex h-[42px] items-center border-b border-[var(--border-subtle)] px-4">
        <p
          className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
          style={{ fontWeight: 550 }}
        >
          Forecast Model
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="h-[42px] border-b border-[var(--border-subtle)]">
              {["Metric", "Candidate", "Company base", "Variance", "Notes"].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-4 text-left text-[10px] uppercase tracking-[0.07em] text-[var(--text-tertiary)]"
                  style={{ fontWeight: 550 }}
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
                  "h-[54px] border-b border-white/[0.035] transition-colors duration-150 hover:bg-white/[0.015]",
                  row.highlight ? "bg-[rgba(242,107,130,0.04)]" : "",
                ].join(" ")}
              >
                <td className="px-4 text-[13px] text-[var(--text-primary)]" style={{ fontWeight: 520 }}>
                  {row.metric}
                </td>
                <td className="px-4 text-[13px] tabular-nums text-[#5662FF]" style={{ fontWeight: 600 }}>
                  {row.candidate}
                </td>
                <td className="px-4 text-[13px] tabular-nums text-[var(--text-tertiary)]">
                  {row.base}
                </td>
                <td className="px-4 text-[13px]">
                  <VarianceCell value={row.variance} dir={row.varDir} />
                </td>
                <td className="px-4 text-[12px] italic text-[var(--text-tertiary)]">{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProjectMeridianWindow({
  cycle = false,
  showToast = true,
}: {
  cycle?: boolean;
  showToast?: boolean;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<StageId>("forecast");
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (!showToast || reduce) return;
    const show = window.setTimeout(() => setToastVisible(true), 2200);
    const hide = window.setTimeout(() => setToastVisible(false), 7200);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [showToast, reduce]);

  useEffect(() => {
    if (!cycle || reduce) return;
    const id = window.setInterval(() => {
      setActive((prev) => {
        const order: StageId[] = ["forecast", "dataroom", "update", "memo"];
        const idx = order.indexOf(prev);
        return order[(idx + 1) % order.length];
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, [cycle, reduce]);

  return (
    <div
      className="fydell-product-frame relative w-full overflow-hidden"
      style={{
        fontFamily: "var(--font-geist-sans, ui-sans-serif)",
        minHeight: 640,
      }}
      aria-hidden
    >
      {/* Top bar */}
      <div className="relative z-[1] flex h-[56px] items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[#0A0D14] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-8 w-9 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[#11151D]">
            <FydellMark width={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] text-[#F4F5F7]" style={{ fontWeight: 600 }}>
              Project Meridian{" "}
              <span className="font-normal text-[#717682]">— FP&amp;A Work Trial</span>
            </p>
          </div>
          <span
            className="ml-1 inline-flex h-6 items-center gap-1.5 rounded-[7px] border border-[rgba(103,217,160,0.28)] bg-[rgba(103,217,160,0.12)] px-2.5 text-[11px] text-[#8EE4B8]"
            style={{ fontWeight: 600 }}
          >
            <span className="fydell-status-dot h-1.5 w-1.5 rounded-full bg-[#67D9A0]" />
            Session Active
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-[11px] text-[#717682]">Time remaining</p>
            <p className="text-[13px] tabular-nums text-[#F4F5F7]" style={{ fontWeight: 600 }}>
              32:14
            </p>
          </div>
          <span
            className="inline-flex h-9 items-center rounded-[8px] bg-[#5662FF] px-3.5 text-[13px] text-white"
            style={{ fontWeight: 600 }}
          >
            Submit Work
          </span>
        </div>
      </div>

      <div className="relative z-[1] grid min-h-[584px] grid-cols-[165px_minmax(0,1fr)_232px]">
        {/* Left nav */}
        <div className="flex flex-col border-r border-[var(--border-subtle)] bg-[#090C12] py-2.5">
          {STAGES.map((s) => {
            const isActive = s.id === active;
            return (
              <div
                key={s.id}
                className={[
                  "relative mx-2 mb-0.5 flex h-[42px] max-h-[42px] cursor-default items-center rounded-[8px] px-3 text-[13px] transition-colors duration-150",
                  isActive
                    ? "bg-[rgba(86,98,255,0.14)] text-[#F4F5F7]"
                    : "text-[#717682]",
                ].join(" ")}
                style={{ fontWeight: isActive ? 580 : 450 }}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded-full bg-[#5662FF]"
                    aria-hidden
                  />
                )}
                {s.label}
              </div>
            );
          })}
          <div className="mt-auto border-t border-[var(--border-subtle)] px-3 py-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-[#717682]">Session progress</span>
              <span className="text-[12px] tabular-nums text-[#F4F5F7]" style={{ fontWeight: 600 }}>
                68%
              </span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full"
                style={{
                  width: "68%",
                  background: "linear-gradient(90deg, #5662FF, #8657F4)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Main work area */}
        <div className="relative min-w-[650px] overflow-hidden border-r border-[var(--border-subtle)] bg-[#0B0F16] lg:min-w-0">
          {active === "dataroom" ? (
            <DataRoomPanel />
          ) : active === "update" ? (
            <ManagerPanel />
          ) : active === "memo" ? (
            <MemoPanel />
          ) : (
            <ForecastPanel />
          )}

          {toastVisible && (
            <div
              className="absolute bottom-4 left-4 z-[3] w-[250px] rounded-[10px] border border-[rgba(134,87,244,0.28)] bg-[#11151D] px-3.5 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
              style={{
                animation: reduce ? undefined : "fydell-toast-in 280ms var(--ease) both",
              }}
            >
              <p className="text-[12px] text-[#F4F5F7]" style={{ fontWeight: 600 }}>
                Manager update
              </p>
              <p className="mt-1 text-[12px] leading-[1.45] text-[#A3A7B2]">
                Renewal risk increased for the SMB segment.
              </p>
            </div>
          )}
        </div>

        {/* Evidence panel */}
        <div className="flex min-w-0 flex-col bg-[#090C12]">
          <div className="flex h-[42px] items-center border-b border-[var(--border-subtle)] px-4">
            <p
              className="text-[10px] uppercase tracking-[0.08em] text-[#717682]"
              style={{ fontWeight: 600 }}
            >
              Evidence Captured
            </p>
          </div>
          <div className="flex-1 space-y-3 px-4 py-3.5">
            {EVIDENCE_METRICS.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] text-[#A3A7B2]">{item.label}</span>
                <span className="text-[13px] tabular-nums text-[#F4F5F7]" style={{ fontWeight: 600 }}>
                  {item.value}
                </span>
              </div>
            ))}
            <div className="pt-3">
              <p
                className="mb-3 text-[10px] uppercase tracking-[0.08em] text-[#717682]"
                style={{ fontWeight: 600 }}
              >
                Recent evidence
              </p>
              <div className="space-y-3">
                {RECENT_EVIDENCE.map((row) => (
                  <div key={row.time} className="flex gap-2.5">
                    <span className="w-9 shrink-0 text-[11px] tabular-nums text-[#717682]">
                      {row.time}
                    </span>
                    <span className="text-[12px] leading-[1.4] text-[#A3A7B2]">{row.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-[var(--border-subtle)] px-4 py-2.5">
            <p className="text-[11px] text-[#717682]">Saved just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
