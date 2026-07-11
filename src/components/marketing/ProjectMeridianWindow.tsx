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
  animateKey?: "churn" | "runway";
}

const BASE_ROWS: ForecastRow[] = [
  {
    metric: "Revenue Growth",
    candidate: "8.2%",
    base: "12.0%",
    variance: "−3.8pp",
    varDir: "warn",
    notes: "Revised after renewal review",
  },
  {
    metric: "Gross Margin",
    candidate: "42.1%",
    base: "45.0%",
    variance: "−2.9pp",
    varDir: "warn",
    notes: "COGS assumption updated",
  },
  {
    metric: "Churn Rate",
    candidate: "3.5%",
    base: "3.5%",
    variance: "0.0pp",
    varDir: "neutral",
    notes: "",
    highlight: true,
    animateKey: "churn",
  },
  {
    metric: "Sales Cycle",
    candidate: "72 days",
    base: "58 days",
    variance: "+14 days",
    varDir: "warn",
    notes: "SMB segment extended",
  },
  {
    metric: "Hiring Ramp",
    candidate: "84%",
    base: "100%",
    variance: "−16pp",
    varDir: "warn",
    notes: "Q3 hiring delayed",
  },
  {
    metric: "OpEx Growth",
    candidate: "11%",
    base: "8%",
    variance: "+3pp",
    varDir: "warn",
    notes: "Department requests reviewed",
  },
  {
    metric: "Cash Runway",
    candidate: "14.0 mo",
    base: "14.0 mo",
    variance: "0.0 mo",
    varDir: "neutral",
    notes: "",
    highlight: true,
    animateKey: "runway",
  },
];

const CHURN_FINAL = {
  candidate: "6.3%",
  variance: "+2.8pp",
  varDir: "danger" as const,
  notes: "Renewal risk identified",
};

const RUNWAY_FINAL = {
  candidate: "9.1 mo",
  variance: "−4.9 mo",
  varDir: "danger" as const,
  notes: "Stress scenario applied",
};

const EVIDENCE_METRICS = [
  { label: "Documents reviewed", value: 7 },
  { label: "Assumptions revised", value: 4 },
  { label: "Material risks flagged", value: 2 },
  { label: "AI interactions", value: 9 },
  { label: "Sources verified", value: 5 },
];

const INITIAL_EVIDENCE = [
  { time: "18:03", text: "Flagged a cash-runway risk" },
  { time: "12:47", text: "Revised the revenue drivers" },
];

function VarianceCell({ value, dir }: { value: string; dir: VarianceDir }) {
  const color =
    dir === "danger"
      ? "text-[#F26B82]"
      : dir === "warn"
        ? "text-[rgba(244,245,247,0.62)]"
        : "text-[rgba(244,245,247,0.4)]";
  return <span className={`tabular-nums ${color}`}>{value}</span>;
}

function ForecastPanel({
  rows,
}: {
  rows: ForecastRow[];
}) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <div className="flex h-[42px] items-center border-b border-[var(--border-subtle)] px-4">
        <p
          className="text-[10.5px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
          style={{ fontWeight: 500 }}
        >
          Forecast Model
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          className="grid h-[42px] items-center border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
          style={{
            gridTemplateColumns: "1.15fr 1fr 0.9fr 0.85fr 1.35fr",
            fontWeight: 500,
            paddingInline: 16,
          }}
        >
          <span>Metric</span>
          <span>Candidate forecast</span>
          <span>Company base</span>
          <span>Variance</span>
          <span>Notes</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.metric}
            className={[
              "grid h-[52px] items-center border-b border-white/[0.035] text-[12px] transition-[background-color,color] duration-300",
              row.highlight && row.varDir === "danger"
                ? "bg-[rgba(242,107,130,0.045)]"
                : "",
            ].join(" ")}
            style={{
              gridTemplateColumns: "1.15fr 1fr 0.9fr 0.85fr 1.35fr",
              paddingInline: 16,
            }}
          >
            <span className="text-[12.5px] text-[#F4F5F7]" style={{ fontWeight: 550 }}>
              {row.metric}
            </span>
            <span className="tabular-nums text-[#5662FF]" style={{ fontWeight: 600 }}>
              {row.candidate}
            </span>
            <span className="tabular-nums text-[rgba(244,245,247,0.4)]">{row.base}</span>
            <VarianceCell value={row.variance} dir={row.varDir} />
            <span
              className={`text-[11.5px] text-[rgba(244,245,247,0.4)] ${
                row.notes.includes("Renewal") || row.notes.includes("Stress") ? "italic" : ""
              }`}
            >
              {row.notes}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectMeridianWindow({
  showToast = true,
}: {
  cycle?: boolean;
  showToast?: boolean;
}) {
  const reduce = useReducedMotion();
  const [active] = useState<StageId>("forecast");
  const [rows, setRows] = useState<ForecastRow[]>(() =>
    reduce
      ? BASE_ROWS.map((r) => {
          if (r.animateKey === "churn") return { ...r, ...CHURN_FINAL };
          if (r.animateKey === "runway") return { ...r, ...RUNWAY_FINAL };
          return r;
        })
      : BASE_ROWS
  );
  const [evidence, setEvidence] = useState(() =>
    reduce
      ? [
          { time: "09:12", text: "Increased churn after reviewing renewals" },
          ...INITIAL_EVIDENCE,
        ]
      : INITIAL_EVIDENCE
  );
  const [toastVisible, setToastVisible] = useState(Boolean(reduce && showToast));

  useEffect(() => {
    if (reduce) return;

    const t1 = window.setTimeout(() => {
      setRows((prev) =>
        prev.map((r) => (r.animateKey === "churn" ? { ...r, ...CHURN_FINAL } : r))
      );
    }, 1200);

    const t2 = window.setTimeout(() => {
      setEvidence((prev) => [
        { time: "09:12", text: "Increased churn after reviewing renewals" },
        ...prev,
      ]);
    }, 1800);

    const t3 = window.setTimeout(() => {
      setRows((prev) =>
        prev.map((r) => (r.animateKey === "runway" ? { ...r, ...RUNWAY_FINAL } : r))
      );
    }, 2400);

    const t4 = window.setTimeout(() => {
      if (showToast) setToastVisible(true);
    }, 3000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [reduce, showToast]);

  return (
    <div
      className="fydell-product-frame relative w-full overflow-hidden border border-[rgba(255,255,255,0.10)] bg-[#090B10] shadow-[0_28px_90px_rgba(0,0,0,0.46)]"
      style={{
        fontFamily: "var(--font-geist-sans), var(--font-inter), system-ui, sans-serif",
        minHeight: 620,
        borderRadius: 15,
        boxShadow: "0 28px 90px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.025)",
      }}
      aria-hidden
    >
      {/* Top bar */}
      <div className="relative z-[1] flex h-[51px] items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[#0A0D14] px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <FydellMark width={19} />
          <p className="truncate text-[12.5px] text-[#F4F5F7]" style={{ fontWeight: 580 }}>
            Project Meridian
          </p>
          <span className="hidden text-[rgba(244,245,247,0.28)] sm:inline" aria-hidden>
            ·
          </span>
          <span className="hidden text-[12px] text-[rgba(244,245,247,0.4)] sm:inline">
            FP&amp;A Work Trial
          </span>
          <span
            className="ml-1 inline-flex h-6 items-center gap-1.5 rounded-full border border-[rgba(103,217,160,0.22)] bg-[rgba(103,217,160,0.10)] px-2.5 text-[11px] text-[#8EE4B8]"
            style={{ fontWeight: 550 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#67D9A0]" />
            Session Active
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-[10px] text-[rgba(244,245,247,0.4)]">Time remaining</p>
            <p className="text-[12px] tabular-nums text-[#F4F5F7]" style={{ fontWeight: 560 }}>
              32:14
            </p>
          </div>
          <span
            className="inline-flex h-[34px] items-center rounded-[8px] bg-[#5662FF] px-[13px] text-[12px] text-white"
            style={{ fontWeight: 560 }}
          >
            Submit Work
          </span>
        </div>
      </div>

      <div className="relative z-[1] grid min-h-[568px] grid-cols-[152px_minmax(0,1fr)_222px]">
        {/* Left nav */}
        <div className="flex flex-col border-r border-[var(--border-subtle)] bg-[#080A0F] py-2">
          {STAGES.map((s) => {
            const isActive = s.id === active;
            return (
              <div
                key={s.id}
                className={[
                  "relative mx-2 mb-0.5 flex h-[39px] cursor-default items-center rounded-[7px] px-3.5 text-[12px] transition-colors duration-150",
                  isActive
                    ? "bg-[rgba(86,98,255,0.12)] text-[#F4F5F7]"
                    : "text-[rgba(244,245,247,0.4)]",
                ].join(" ")}
                style={{ fontWeight: isActive ? 550 : 450 }}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-full bg-[#5662FF]"
                    aria-hidden
                  />
                )}
                {s.label}
              </div>
            );
          })}
          <div className="mt-auto border-t border-[var(--border-subtle)] px-3.5 py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-[rgba(244,245,247,0.4)]">Session progress</span>
              <span className="text-[11.5px] tabular-nums text-[#F4F5F7]" style={{ fontWeight: 560 }}>
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
          <ForecastPanel rows={rows} />

          {toastVisible && (
            <div
              className="absolute bottom-4 left-4 z-[3] w-[268px] rounded-[10px] border border-[rgba(134,87,244,0.24)] bg-[#11151D] px-3.5 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
              style={{
                animation: reduce ? undefined : "fydell-toast-in 280ms var(--ease) both",
              }}
            >
              <p className="text-[12px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                Manager update
              </p>
              <p className="mt-1 text-[12px] leading-[1.45] text-[rgba(244,245,247,0.62)]">
                SMB renewal risk has increased. Revisit the downside forecast.
              </p>
            </div>
          )}
        </div>

        {/* Evidence panel */}
        <div className="flex min-w-0 flex-col bg-[#080A0F]">
          <div className="flex h-[42px] items-center border-b border-[var(--border-subtle)] px-4">
            <p
              className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
              style={{ fontWeight: 500 }}
            >
              Evidence Captured
            </p>
          </div>
          <div className="flex-1 space-y-2.5 px-4 py-3.5">
            {EVIDENCE_METRICS.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-[rgba(244,245,247,0.62)]">{item.label}</span>
                <span
                  className="text-[11.5px] tabular-nums text-[#F4F5F7]"
                  style={{ fontWeight: 550 }}
                >
                  {item.value}
                </span>
              </div>
            ))}
            <div className="pt-3">
              <p
                className="mb-2.5 text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
                style={{ fontWeight: 500 }}
              >
                Recent evidence
              </p>
              <div className="space-y-2.5">
                {evidence.map((row) => (
                  <div
                    key={`${row.time}-${row.text}`}
                    className="flex gap-2.5"
                    style={{
                      animation: reduce ? undefined : "fydell-toast-in 260ms var(--ease) both",
                    }}
                  >
                    <span className="w-9 shrink-0 text-[10px] tabular-nums text-[rgba(244,245,247,0.4)]">
                      {row.time}
                    </span>
                    <span className="text-[11px] leading-[1.4] text-[rgba(244,245,247,0.62)]">
                      {row.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
