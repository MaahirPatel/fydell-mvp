"use client";

// ─── SVG Schematics ───────────────────────────────────────────────────────────

function WorkroomSchematic() {
  return (
    <svg
      viewBox="0 0 260 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      aria-hidden
    >
      {/* Stage rail */}
      <rect x="8" y="8" width="52" height="124" rx="6" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {["Brief", "Data Room", "Forecast", "Memo"].map((label, i) => (
        <g key={label}>
          <rect
            x="12"
            y={16 + i * 26}
            width="44"
            height="18"
            rx="4"
            fill={i === 2 ? "rgba(59,91,255,0.18)" : "rgba(255,255,255,0.03)"}
            stroke={i === 2 ? "rgba(59,91,255,0.28)" : "rgba(255,255,255,0.07)"}
            strokeWidth="1"
          />
          <text
            x="34"
            y={28 + i * 26}
            textAnchor="middle"
            fill={i === 2 ? "rgba(59,91,255,0.9)" : "rgba(255,255,255,0.3)"}
            fontSize="6"
            fontFamily="ui-sans-serif, system-ui"
          >
            {label}
          </text>
        </g>
      ))}
      {/* Table area */}
      <rect x="70" y="8" width="182" height="124" rx="6" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      {/* Table header */}
      <rect x="70" y="8" width="182" height="22" rx="6" fill="rgba(255,255,255,0.04)" />
      <rect x="70" y="26" width="182" height="2" fill="rgba(255,255,255,0.06)" />
      {["Metric","Value","Base","Var"].map((h, i) => (
        <text key={h} x={82 + i * 44} y={23} fill="rgba(255,255,255,0.28)" fontSize="5.5" fontFamily="ui-sans-serif">
          {h}
        </text>
      ))}
      {/* Table rows */}
      {[0,1,2,3,4].map((r) => (
        <g key={r}>
          <rect
            x="70" y={30 + r * 20} width="182" height="18"
            fill={r % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent"}
          />
          <rect x="74" y={34 + r * 20} width="40" height="6" rx="2" fill="rgba(255,255,255,0.10)" />
          <rect x="120" y={34 + r * 20} width="20" height="6" rx="2" fill={r === 2 ? "rgba(240,98,146,0.25)" : "rgba(59,91,255,0.18)"} />
          <rect x="146" y={34 + r * 20} width="20" height="6" rx="2" fill="rgba(255,255,255,0.07)" />
          <rect x="172" y={34 + r * 20} width="18" height="6" rx="2" fill={r === 2 ? "rgba(240,98,146,0.22)" : "rgba(255,255,255,0.06)"} />
        </g>
      ))}
      {/* Blue accent dot */}
      <circle cx="245" cy="18" r="4" fill="rgba(59,91,255,0.6)" />
    </svg>
  );
}

function EvidenceSchematic() {
  return (
    <svg
      viewBox="0 0 260 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      aria-hidden
    >
      {/* Vertical timeline spine */}
      <line x1="40" y1="12" x2="40" y2="128" stroke="rgba(255,255,255,0.10)" strokeWidth="1" strokeDasharray="3 3" />
      {/* Timeline nodes */}
      {[
        { y: 22, label: "Opened data room", color: "rgba(59,91,255,0.8)", accent: "rgba(59,91,255,0.18)" },
        { y: 52, label: "Changed assumption × 2", color: "rgba(255,255,255,0.5)", accent: "rgba(255,255,255,0.06)" },
        { y: 82, label: "Flagged churn risk", color: "rgba(240,98,146,0.8)", accent: "rgba(240,98,146,0.12)" },
        { y: 112, label: "Submitted memo draft", color: "rgba(57,217,138,0.8)", accent: "rgba(57,217,138,0.12)" },
      ].map(({ y, label, color, accent }) => (
        <g key={y}>
          <circle cx="40" cy={y} r="5" fill={accent} stroke={color} strokeWidth="1.2" />
          <circle cx="40" cy={y} r="2" fill={color} />
          <rect x="54" y={y - 10} width="168" height="20" rx="4" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <text x="62" y={y + 4} fill="rgba(255,255,255,0.55)" fontSize="6" fontFamily="ui-sans-serif">
            {label}
          </text>
          <text x="208" y={y + 4} fill="rgba(255,255,255,0.25)" fontSize="5.5" fontFamily="ui-sans-serif">
            {["09:12","12:47","18:03","24:11"][Math.round((y - 22) / 30)]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function MemoSchematic() {
  return (
    <svg
      viewBox="0 0 260 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      aria-hidden
    >
      {/* Document outline */}
      <rect x="16" y="8" width="228" height="124" rx="8" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      {/* Header band */}
      <rect x="16" y="8" width="228" height="28" rx="8" fill="rgba(255,255,255,0.04)" />
      <rect x="16" y="32" width="228" height="1" fill="rgba(255,255,255,0.07)" />
      <text x="28" y="26" fill="rgba(255,255,255,0.65)" fontSize="7.5" fontWeight="600" fontFamily="ui-sans-serif">
        Hiring Evidence Report
      </text>
      {/* Recommendation tag */}
      <rect x="180" y="14" width="56" height="14" rx="4" fill="rgba(57,217,138,0.14)" stroke="rgba(57,217,138,0.28)" strokeWidth="1" />
      <text x="208" y="23.5" textAnchor="middle" fill="rgba(57,217,138,0.9)" fontSize="5.5" fontFamily="ui-sans-serif">Advance</text>
      {/* Section lines */}
      {[0,1,2,3,4,5].map((r) => (
        <g key={r}>
          <rect x="28" y={46 + r * 14} width={r === 0 ? 60 : 100 + Math.sin(r) * 40} height="6" rx="2" fill="rgba(255,255,255,0.08)" />
        </g>
      ))}
      {/* Two column lower section */}
      <line x1="144" y1="50" x2="144" y2="126" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      {[0,1,2].map((r) => (
        <g key={r}>
          <rect x="152" y={54 + r * 22} width="72" height="14" rx="3" fill="rgba(59,91,255,0.06)" stroke="rgba(59,91,255,0.12)" strokeWidth="1" />
          <rect x="156" y={58 + r * 22} width={32 + r * 8} height="5" rx="1.5" fill="rgba(59,91,255,0.22)" />
        </g>
      ))}
      {/* Green accent line */}
      <rect x="16" y="130" width="80" height="2" rx="1" fill="rgba(57,217,138,0.5)" />
    </svg>
  );
}

// ─── Panel data ───────────────────────────────────────────────────────────────

const PANELS = [
  {
    id: "workroom",
    title: "Workroom",
    copy: "Candidates complete role-specific FP&A tasks in a structured work environment.",
    Schematic: WorkroomSchematic,
  },
  {
    id: "evidence",
    title: "Evidence trail",
    copy: "Decisions, revisions, AI usage, and assumptions are captured as evidence.",
    Schematic: EvidenceSchematic,
  },
  {
    id: "memo",
    title: "Hiring memo",
    copy: "Hiring teams get a structured report showing what to ask, review, and trust.",
    Schematic: MemoSchematic,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CategoryPanels() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {PANELS.map(({ id, title, copy, Schematic }) => (
        <div
          key={id}
          className="flex flex-col overflow-hidden rounded-[16px] border border-white/[0.12] bg-[#0a0e17] shadow-[0_16px_48px_rgba(0,0,0,0.28)] transition-transform duration-300 ease-out hover:-translate-y-0.5"
        >
          {/* Schematic area */}
          <div className="border-b border-white/[0.06] bg-[#080B12] px-4 py-5">
            <Schematic />
          </div>
          {/* Text area */}
          <div className="flex flex-col gap-2 px-5 py-5">
            <h3 className="text-[15px] font-semibold text-white">{title}</h3>
            <p className="text-[13px] leading-[1.6] text-white/[0.55]">{copy}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
