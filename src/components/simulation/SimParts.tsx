import {
  AlertTriangle,
  Bold,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Italic,
  Link2,
  List,
  Send,
  TrendingUp,
  Underline
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Shared mock data (sample numbers, role labels only)                 */
/* ------------------------------------------------------------------ */

export const STEPS = [
  { n: 1, label: "Analyze" },
  { n: 2, label: "Strategy" },
  { n: 3, label: "Model" },
  { n: 4, label: "Present" },
  { n: 5, label: "Q&A" }
] as const;

export const OBJECTIVES = [
  { label: "Assess financial performance", done: true },
  { label: "Evaluate strategic fit", done: true },
  { label: "Identify key risks", done: true },
  { label: "Build valuation", done: false },
  { label: "Form recommendation", done: false }
] as const;

export const FILES = [
  { name: "Case_Info_Memo.pdf", kind: "pdf" },
  { name: "Financial_Statements.xlsx", kind: "xls" },
  { name: "Industry_Analysis.pdf", kind: "pdf" },
  { name: "Comps_Dataset.xlsx", kind: "xls" }
] as const;

export const MAIN_TABS = [
  "Overview",
  "Financials",
  "Valuation",
  "Comps",
  "Synergies",
  "Risks",
  "Notes"
] as const;

export type Metric = {
  label: string;
  value: string;
  delta: string;
  dir: "up" | "down";
  spark: number[];
};

export const METRICS: Metric[] = [
  { label: "Revenue (LTM)", value: "$1.23B", delta: "18.6% YoY", dir: "up", spark: [42, 46, 51, 58, 67, 79, 94] },
  { label: "EBITDA Margin", value: "19.2%", delta: "220 bps YoY", dir: "up", spark: [50, 53, 52, 58, 63, 71, 82] },
  { label: "Revenue Growth", value: "18.6%", delta: "3.2 pp YoY", dir: "up", spark: [38, 44, 41, 52, 56, 64, 76] },
  { label: "Net Debt / EBITDA", value: "2.1x", delta: "0.3x YoY", dir: "down", spark: [82, 74, 70, 63, 58, 52, 46] },
  { label: "EV / EBITDA", value: "11.3x", delta: "0.7x vs comps", dir: "down", spark: [78, 80, 71, 66, 60, 55, 49] }
];

export const FINANCIAL_HEAD = ["Metric", "2021", "2022", "2023", "2024", "LTM", "YoY"] as const;

export const FINANCIAL_ROWS: string[][] = [
  ["Revenue", "756", "842", "948", "1,038", "1,231", "18.6%"],
  ["Growth %", "-", "11.4%", "12.6%", "9.5%", "18.6%", "-"],
  ["EBITDA", "128", "156", "175", "198", "236", "19.2%"],
  ["EBITDA Margin %", "16.9", "18.5", "18.4", "19.1", "19.2", "-"],
  ["Net Income", "68", "82", "95", "112", "132", "17.9%"],
  ["Net Debt", "234", "278", "326", "412", "494", "19.9%"]
];

export const TREND = {
  years: ["2021", "2022", "2023", "2024", "LTM"],
  revenue: [756, 842, 948, 1038, 1231],
  ebitda: [128, 156, 175, 198, 236]
};

export const CHAT = [
  { from: "You", self: true, msg: "I've reviewed the financials. EBITDA margin expansion looks sustainable.", time: "10:04 AM" },
  { from: "Manager", self: false, msg: "Agree. Let's run sensitivity on revenue growth.", time: "10:05 AM" },
  { from: "Associate", self: false, msg: "Working on comps now.", time: "10:06 AM" },
  { from: "Reviewer", self: false, msg: "Don't forget to stress-test net debt/EBITDA.", time: "10:07 AM" }
] as const;

export const PROGRESS_STEPS = [
  { label: "Analyze", state: "done" },
  { label: "Strategy", state: "done" },
  { label: "Model", state: "active" },
  { label: "Present", state: "todo" },
  { label: "Q&A", state: "todo" }
] as const;

export const INSIGHTS = [
  { label: "Margin expansion vs industry", value: "+210 bps", tone: "up" },
  { label: "Strong cash conversion detected", value: "", tone: "check" },
  { label: "Customer concentration risk", value: "Medium", tone: "warn" }
] as const;

export const MARKET = [
  { label: "Sector", value: "Premium Consumer Goods" },
  { label: "Market Sentiment", value: "Positive", tone: "good" },
  { label: "GDP Growth", value: "2.4%" },
  { label: "Inflation (YoY)", value: "2.8%" },
  { label: "Interest Rate", value: "4.75%" },
  { label: "Consumer Confidence", value: "102.3", spark: true }
] as const;

export const NOTES_BODY =
  "Preliminary view: The target shows strong top-line growth and margin expansion with a defensible brand portfolio. Valuation appears fair at the midpoint given current market multiples and growth profile.";

export const NOTES_STEPS = [
  "Validate synergy potential and integration costs",
  "Stress-test margin sustainability",
  "Assess working capital and cash conversion",
  "Deep-dive on customer concentration risk"
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function sparkLine(values: number[], w: number, h: number, pad = 2) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${h} L ${pts[0][0].toFixed(1)} ${h} Z`;
  return { line, area };
}

/* ------------------------------------------------------------------ */
/* Presentational components                                           */
/* ------------------------------------------------------------------ */

export function Sparkline({
  values,
  color = "#7c5cff",
  width = 120,
  height = 34,
  className = ""
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  const { line, area } = sparkLine(values, width, height, 2);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      style={{ color }}
      aria-hidden="true"
    >
      <path d={area} fill="currentColor" fillOpacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StepIndicator({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const active = i === 0;
        return (
          <div key={step.n} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <span
                className={`grid place-items-center rounded-full font-bold ${
                  compact ? "h-4 w-4 text-[8px]" : "h-5 w-5 text-[10px]"
                } ${
                  active
                    ? "bg-gradient-to-br from-[#7c5cff] to-[#5b8cff] text-white shadow-[0_0_16px_rgba(124,92,255,0.5)]"
                    : "border border-white/12 bg-white/[0.04] text-white/45"
                }`}
              >
                {step.n}
              </span>
              <span
                className={`font-semibold ${compact ? "text-[9px]" : "text-[11px]"} ${
                  active ? "text-[#b8a9ff]" : "text-white/45"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={`mx-1.5 inline-block border-t border-dotted border-white/22 ${compact ? "w-3" : "w-5"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MetricCard({ metric, compact = false }: { metric: Metric; compact?: boolean }) {
  const good = true; // every listed delta is a positive signal
  const Arrow = metric.dir === "up" ? "\u2191" : "\u2193";
  const color = good ? "#3dd68c" : "#fb7185";
  return (
    <div
      className={`flex flex-col rounded-xl border border-white/[0.07] bg-white/[0.025] ${
        compact ? "p-2" : "p-3"
      }`}
    >
      <span className={`font-semibold uppercase tracking-[0.08em] text-white/42 ${compact ? "text-[7px]" : "text-[9.5px]"}`}>
        {metric.label}
      </span>
      <span
        className={`tabular-nums font-extrabold leading-none text-white ${
          compact ? "mt-1 text-[14px]" : "mt-1.5 text-[22px]"
        }`}
      >
        {metric.value}
      </span>
      <span
        className={`mt-1 inline-flex items-center gap-0.5 font-bold ${compact ? "text-[7.5px]" : "text-[10px]"}`}
        style={{ color }}
      >
        {Arrow} {metric.delta}
      </span>
      <div className={compact ? "mt-1.5 h-5" : "mt-2.5 h-8"}>
        <Sparkline values={metric.spark} color={color} className="h-full w-full" />
      </div>
    </div>
  );
}

export function ValuationRange({ compact = false }: { compact?: boolean }) {
  // scale: low 1.85 -> 0%, high 2.95 -> 100%
  const band = { left: 27.3, right: 27.3 }; // 2.15 at 27.3%, 2.65 at 72.7% (right inset 27.3)
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.025] ${compact ? "p-2.5" : "p-4"}`}>
      <p className={`font-semibold uppercase tracking-[0.12em] text-[#8fa2ff] ${compact ? "text-[7px]" : "text-[10px]"}`}>
        Valuation Range (Implied Enterprise Value)
      </p>
      <p
        className={`tabular-nums font-extrabold tracking-[-0.03em] text-white ${
          compact ? "mt-1 text-[15px]" : "mt-2 text-[26px]"
        }`}
      >
        $2.15B - $2.65B
      </p>
      <div className={`relative rounded-full bg-white/[0.07] ${compact ? "mt-3 h-1.5" : "mt-6 h-2.5"}`}>
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#5b8cff] via-[#7c5cff] to-[#9b5cff]"
          style={{ left: `${band.left}%`, right: `${band.right}%` }}
        />
        <span
          className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#7c5cff] shadow-[0_0_18px_rgba(124,92,255,0.6)] ${
            compact ? "h-2.5 w-2.5" : "h-4 w-4"
          }`}
          style={{ left: "50%" }}
        />
      </div>
      <div className={`flex items-center justify-between ${compact ? "mt-2" : "mt-3"}`}>
        {[
          { k: "Low", v: "$1.85B" },
          { k: "Midpoint", v: "$2.40B" },
          { k: "High", v: "$2.95B" }
        ].map((m, i) => (
          <div key={m.k} className={i === 1 ? "text-center" : i === 2 ? "text-right" : "text-left"}>
            <div className={`text-white/40 ${compact ? "text-[7px]" : "text-[10px]"}`}>{m.k}</div>
            <div className={`tabular-nums font-bold text-white ${compact ? "text-[8.5px]" : "text-xs"}`}>{m.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinancialTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025] ${compact ? "p-2.5" : "p-4"}`}>
      <p className={`font-semibold uppercase tracking-[0.12em] text-[#8fa2ff] ${compact ? "text-[7px]" : "text-[10px]"}`}>
        Financial Summary (USD Millions)
      </p>
      <table className={`mt-2 w-full border-collapse ${compact ? "text-[7.5px]" : "text-[11px]"}`}>
        <thead>
          <tr className="text-white/40">
            {FINANCIAL_HEAD.map((h, i) => (
              <th
                key={h}
                className={`py-1 font-semibold ${i === 0 ? "text-left" : "text-right"} ${compact ? "px-1" : "px-1.5"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FINANCIAL_ROWS.map((row) => (
            <tr key={row[0]} className="border-t border-white/[0.05]">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-1 ${compact ? "px-1" : "px-1.5"} ${
                    ci === 0 ? "text-left font-medium text-white/72" : "text-right tabular-nums text-white/60"
                  } ${ci === row.length - 1 && cell !== "-" ? "font-semibold text-[#3dd68c]" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RevenueEbitdaTrend({ compact = false }: { compact?: boolean }) {
  const W = 520;
  const H = compact ? 110 : 200;
  const padL = 34;
  const padR = 32;
  const padT = 14;
  const padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const revMax = 1300;
  const ebMax = 280;
  const n = TREND.years.length;
  const slot = plotW / n;
  const barW = slot * 0.42;

  const ebPts = TREND.ebitda.map((v, i) => {
    const x = padL + slot * i + slot / 2;
    const y = padT + plotH * (1 - v / ebMax);
    return [x, y] as const;
  });
  const ebLine = ebPts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.025] ${compact ? "p-2.5" : "p-4"}`}>
      <div className="flex items-center justify-between">
        <p className={`font-semibold uppercase tracking-[0.12em] text-[#8fa2ff] ${compact ? "text-[7px]" : "text-[10px]"}`}>
          Revenue & EBITDA Trend
        </p>
        {!compact && (
          <div className="flex items-center gap-3 text-[10px] text-white/50">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-gradient-to-t from-[#5b8cff] to-[#9b5cff]" /> Revenue
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#3dd68c]" /> EBITDA
            </span>
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9b5cff" />
            <stop offset="100%" stopColor="#5b8cff" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((g) => {
          const y = padT + plotH * g;
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={compact ? 7 : 9} fill="rgba(255,255,255,0.34)">
                {Math.round(revMax * (1 - g))}
              </text>
              <text x={W - padR + 6} y={y + 3} textAnchor="start" fontSize={compact ? 7 : 9} fill="rgba(61,214,140,0.6)">
                {Math.round(ebMax * (1 - g))}
              </text>
            </g>
          );
        })}
        {TREND.revenue.map((v, i) => {
          const h = plotH * (v / revMax);
          const x = padL + slot * i + (slot - barW) / 2;
          const y = padT + plotH - h;
          return <rect key={i} x={x} y={y} width={barW} height={h} rx={3} fill="url(#revBar)" />;
        })}
        <path d={ebLine} fill="none" stroke="#3dd68c" strokeWidth={compact ? 1.7 : 2.2} strokeLinecap="round" strokeLinejoin="round" />
        {ebPts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={compact ? 2 : 3} fill="#03050d" stroke="#3dd68c" strokeWidth={1.6} />
        ))}
        {TREND.years.map((yr, i) => (
          <text
            key={yr}
            x={padL + slot * i + slot / 2}
            y={H - 6}
            textAnchor="middle"
            fontSize={compact ? 7 : 9}
            fill="rgba(255,255,255,0.4)"
          >
            {yr}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function ObjectivesList({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`space-y-2 ${compact ? "text-[9px]" : "text-[12px]"}`}>
      {OBJECTIVES.map((o) => (
        <div key={o.label} className="flex items-start gap-2 text-white/68">
          {o.done ? (
            <CheckCircle2 className={`${compact ? "h-3 w-3" : "h-4 w-4"} mt-px shrink-0 text-[#3dd68c]`} strokeWidth={1.7} />
          ) : (
            <Circle className={`${compact ? "h-3 w-3" : "h-4 w-4"} mt-px shrink-0 text-white/28`} strokeWidth={1.7} />
          )}
          <span className={o.done ? "" : "text-white/50"}>{o.label}</span>
        </div>
      ))}
    </div>
  );
}

export function UploadedFiles({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-1.5">
      {FILES.map((f) => {
        const Icon = f.kind === "xls" ? FileSpreadsheet : FileText;
        const tint = f.kind === "xls" ? "text-[#3dd68c]" : "text-[#8fa2ff]";
        return (
          <div
            key={f.name}
            className={`flex items-center gap-2 rounded-lg border border-white/[0.055] bg-[#060914]/60 ${
              compact ? "px-2 py-1 text-[8.5px]" : "px-2.5 py-1.5 text-[11px]"
            } text-white/64`}
          >
            <Icon className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} shrink-0 ${tint}`} strokeWidth={1.7} />
            <span className="truncate">{f.name}</span>
          </div>
        );
      })}
      <button
        className={`flex w-full items-center gap-2 rounded-lg border border-dashed border-white/12 text-white/45 transition hover:border-[#7c5cff]/40 hover:text-white/70 ${
          compact ? "px-2 py-1 text-[8.5px]" : "px-2.5 py-1.5 text-[11px]"
        }`}
      >
        <FilePlus2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={1.7} />
        Add more files
      </button>
    </div>
  );
}

export function TeamChat({ compact = false }: { compact?: boolean }) {
  const items = compact ? CHAT.slice(0, 3) : CHAT;
  return (
    <div className="flex h-full flex-col">
      <div className={`space-y-2 ${compact ? "" : "flex-1 overflow-y-auto scroll-slim pr-1"}`}>
        {items.map((m) => (
          <div
            key={m.from + m.time}
            className={`rounded-xl border ${compact ? "p-1.5" : "p-2.5"} ${
              m.self ? "border-[#7c5cff]/25 bg-[#7c5cff]/12" : "border-white/[0.055] bg-white/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`font-bold text-[#b8a9ff] ${compact ? "text-[8px]" : "text-[11px]"}`}>{m.from}</span>
              <span className={`tabular-nums font-mono text-white/30 ${compact ? "text-[6.5px]" : "text-[9px]"}`}>{m.time}</span>
            </div>
            <p className={`mt-1 leading-snug text-white/64 ${compact ? "text-[8px]" : "text-[11px]"}`}>{m.msg}</p>
          </div>
        ))}
      </div>
      <div
        className={`mt-2 flex items-center gap-2 rounded-lg border border-white/[0.075] bg-[#060914]/70 text-white/34 ${
          compact ? "px-2 py-1 text-[8px]" : "px-3 py-2 text-[11px]"
        }`}
      >
        <span>Type a message...</span>
        <Send className={`ml-auto text-[#8fa2ff] ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} strokeWidth={1.7} />
      </div>
    </div>
  );
}

export function ProgressDonut({ size = 90, value = 58 }: { size?: number; value?: number }) {
  const ring = size * 0.16;
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#7c5cff 0%, #5b8cff ${value}%, rgba(255,255,255,0.08) ${value}% 100%)`
      }}
    >
      <div
        className="grid place-items-center rounded-full bg-[#070b16]"
        style={{ width: size - ring, height: size - ring }}
      >
        <span className="tabular-nums font-extrabold text-white" style={{ fontSize: size * 0.24 }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

export function ProgressSteps({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`space-y-1.5 ${compact ? "text-[8px]" : "text-[11px]"}`}>
      {PROGRESS_STEPS.map((s) => (
        <div key={s.label} className="flex items-center gap-2">
          {s.state === "done" ? (
            <CheckCircle2 className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} text-[#3dd68c]`} strokeWidth={1.7} />
          ) : s.state === "active" ? (
            <span className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} grid place-items-center`}>
              <span className="h-2 w-2 animate-pulse-dot rounded-full bg-[#7c5cff]" />
            </span>
          ) : (
            <Circle className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} text-white/25`} strokeWidth={1.7} />
          )}
          <span className={s.state === "todo" ? "text-white/45" : "text-white/78"}>{s.label}</span>
          {s.state === "active" && (
            <span className="ml-auto rounded-full bg-[#7c5cff]/15 px-1.5 py-px text-[8px] font-bold text-[#b8a9ff]">
              In progress
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function LiveInsights({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`space-y-2 ${compact ? "text-[8.5px]" : "text-[12px]"}`}>
      {INSIGHTS.map((it) => {
        const Icon = it.tone === "warn" ? AlertTriangle : it.tone === "check" ? Check : TrendingUp;
        const color = it.tone === "warn" ? "#f5b942" : "#3dd68c";
        return (
          <div key={it.label} className="flex items-start gap-2 text-white/68">
            <Icon className={`${compact ? "h-3 w-3" : "h-4 w-4"} mt-px shrink-0`} style={{ color }} strokeWidth={1.7} />
            <span className="flex-1">{it.label}</span>
            {it.value && (
              <span className="font-bold" style={{ color }}>
                {it.value}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NotesPanel({ compact = false }: { compact?: boolean }) {
  const tools = [Bold, Italic, Underline, List, Link2];
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.025] ${compact ? "p-2.5" : "p-4"}`}>
      <p className={`font-semibold uppercase tracking-[0.12em] text-[#8fa2ff] ${compact ? "text-[7px]" : "text-[10px]"}`}>
        Notes / Recommendation
      </p>
      <div className={`mt-2 flex items-center gap-1 rounded-lg border border-white/[0.06] bg-[#060914]/60 ${compact ? "p-1" : "p-1.5"}`}>
        {tools.map((Icon, i) => (
          <span
            key={i}
            className={`grid place-items-center rounded text-white/55 hover:bg-white/[0.06] hover:text-white ${
              compact ? "h-4 w-4" : "h-6 w-6"
            }`}
          >
            <Icon className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} strokeWidth={1.7} />
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 rounded border border-white/[0.08] bg-white/[0.03] px-1.5 text-white/60 hover:text-white"
          style={{ height: compact ? 16 : 24, fontSize: compact ? 8 : 11 }}
        >
          Templates
          <ChevronDown className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={1.7} />
        </span>
      </div>
      <p className={`text-white/64 ${compact ? "mt-2 text-[8.5px] leading-snug" : "mt-3 text-[12.5px] leading-relaxed"}`}>
        {NOTES_BODY}
      </p>
      <p className={`font-semibold text-white/80 ${compact ? "mt-2 text-[8.5px]" : "mt-3 text-[12.5px]"}`}>Key next steps:</p>
      <ul className={`mt-1 space-y-1 ${compact ? "text-[8px]" : "text-[12px]"}`}>
        {NOTES_STEPS.map((s) => (
          <li key={s} className="flex items-start gap-2 text-white/60">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#7c5cff]" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <div className={`flex items-center justify-between text-white/35 ${compact ? "mt-2 text-[7.5px]" : "mt-3 text-[10px]"}`}>
        <span>312 words</span>
        <span>Saved 2 min ago</span>
      </div>
    </div>
  );
}

export function MarketStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.025] ${compact ? "p-2" : "p-3"}`}>
      <p className={`font-semibold uppercase tracking-[0.12em] text-[#8fa2ff] ${compact ? "text-[7px]" : "text-[10px]"}`}>
        Market Environment
      </p>
      <div className={`mt-2 flex flex-wrap items-center ${compact ? "gap-x-2 gap-y-1" : "gap-x-5 gap-y-2"}`}>
        {MARKET.map((m, i) => (
          <div key={m.label} className="flex items-center gap-2">
            <div>
              <div className={`text-white/40 ${compact ? "text-[7px]" : "text-[9.5px]"}`}>{m.label}</div>
              <div
                className={`font-bold ${compact ? "text-[8px]" : "text-[12px]"} ${
                  "tone" in m && m.tone === "good" ? "text-[#3dd68c]" : "text-white/82"
                }`}
              >
                {m.value}
              </div>
            </div>
            {"spark" in m && m.spark && (
              <Sparkline values={[40, 44, 42, 50, 55, 53, 60]} color="#3dd68c" width={48} height={20} className={compact ? "h-4 w-10" : "h-6 w-14"} />
            )}
            {i < MARKET.length - 1 && !compact && <span className="ml-3 h-7 w-px bg-white/8" />}
          </div>
        ))}
      </div>
    </div>
  );
}
