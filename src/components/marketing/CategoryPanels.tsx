"use client";

import { Stagger, StaggerItem } from "@/components/motion/Reveal";

function WorkroomSchematic() {
  return (
    <svg viewBox="0 0 260 140" fill="none" className="w-full" aria-hidden>
      <rect x="8" y="8" width="52" height="124" rx="6" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {["Brief", "Data Room", "Forecast", "Memo"].map((label, i) => (
        <g key={label}>
          <rect
            x="12"
            y={16 + i * 26}
            width="44"
            height="18"
            rx="4"
            fill={i === 2 ? "rgba(49,92,255,0.18)" : "rgba(255,255,255,0.03)"}
            stroke={i === 2 ? "rgba(49,92,255,0.28)" : "rgba(255,255,255,0.07)"}
            strokeWidth="1"
          />
          <text
            x="34"
            y={28 + i * 26}
            textAnchor="middle"
            fill={i === 2 ? "rgba(75,111,255,0.95)" : "rgba(255,255,255,0.3)"}
            fontSize="6"
            fontFamily="ui-sans-serif, system-ui"
          >
            {label}
          </text>
        </g>
      ))}
      <rect x="70" y="8" width="182" height="124" rx="6" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      <rect x="70" y="8" width="182" height="22" rx="6" fill="rgba(255,255,255,0.04)" />
      {[0, 1, 2, 3, 4].map((r) => (
        <g key={r}>
          <rect x="74" y={34 + r * 18} width="40" height="6" rx="2" fill="rgba(255,255,255,0.10)" />
          <rect
            x="120"
            y={34 + r * 18}
            width="20"
            height="6"
            rx="2"
            fill={r === 2 ? "rgba(230,76,135,0.25)" : "rgba(49,92,255,0.18)"}
          />
          <rect x="146" y={34 + r * 18} width="20" height="6" rx="2" fill="rgba(255,255,255,0.07)" />
          <rect
            x="172"
            y={34 + r * 18}
            width="18"
            height="6"
            rx="2"
            fill={r === 2 ? "rgba(230,76,135,0.22)" : "rgba(255,255,255,0.06)"}
          />
        </g>
      ))}
      <polyline
        points="200,110 210,98 220,104 232,88 244,92"
        fill="none"
        stroke="rgba(49,92,255,0.55)"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function EvidenceSchematic() {
  const nodes = [
    { y: 22, label: "Opened data room", color: "rgba(49,92,255,0.85)" },
    { y: 48, label: "Changed assumption", color: "rgba(255,255,255,0.5)" },
    { y: 74, label: "Flagged churn risk", color: "rgba(230,76,135,0.85)" },
    { y: 100, label: "Submitted memo draft", color: "rgba(54,214,138,0.85)" },
    { y: 126, label: "Updated revenue logic", color: "rgba(33,199,217,0.8)" },
  ];
  return (
    <svg viewBox="0 0 260 140" fill="none" className="w-full" aria-hidden>
      <line x1="36" y1="14" x2="36" y2="130" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      {nodes.map(({ y, label, color }) => (
        <g key={label}>
          <circle cx="36" cy={y} r="4.5" fill="rgba(8,11,18,1)" stroke={color} strokeWidth="1.2" />
          <circle cx="36" cy={y} r="1.8" fill={color} />
          <rect
            x="50"
            y={y - 9}
            width="190"
            height="18"
            rx="4"
            fill="rgba(255,255,255,0.035)"
            stroke="rgba(255,255,255,0.08)"
          />
          <text x="58" y={y + 3.5} fill="rgba(255,255,255,0.58)" fontSize="6" fontFamily="ui-sans-serif">
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function MemoSchematic() {
  return (
    <svg viewBox="0 0 260 140" fill="none" className="w-full" aria-hidden>
      <rect x="16" y="8" width="228" height="124" rx="8" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      <rect x="16" y="8" width="228" height="28" rx="8" fill="rgba(255,255,255,0.04)" />
      <text x="28" y="26" fill="rgba(255,255,255,0.65)" fontSize="7.5" fontWeight="600" fontFamily="ui-sans-serif">
        Hiring Evidence Report
      </text>
      <rect
        x="158"
        y="14"
        width="74"
        height="14"
        rx="4"
        fill="rgba(54,214,138,0.12)"
        stroke="rgba(54,214,138,0.28)"
      />
      <text x="195" y="23.5" textAnchor="middle" fill="rgba(110,231,183,0.95)" fontSize="5.5" fontFamily="ui-sans-serif">
        Advance to Interview
      </text>
      {["Summary", "Key takeaways", "Risks", "Evidence"].map((label, i) => (
        <g key={label}>
          <text x="28" y={48 + i * 20} fill="rgba(255,255,255,0.45)" fontSize="6" fontFamily="ui-sans-serif">
            {label}
          </text>
          <rect x="28" y={52 + i * 20} width={90 + (i % 2) * 30} height="5" rx="2" fill="rgba(255,255,255,0.08)" />
        </g>
      ))}
    </svg>
  );
}

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

export default function CategoryPanels() {
  return (
    <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3" amount={0.15}>
      {PANELS.map(({ id, title, copy, Schematic }) => (
        <StaggerItem key={id}>
          <div className="flex h-full flex-col overflow-hidden rounded-[16px] border border-white/[0.10] bg-[#0B0F18] transition-[transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-white/[0.18]">
            <div className="border-b border-white/[0.06] bg-[#080B12] px-4 py-5">
              <Schematic />
            </div>
            <div className="flex flex-col gap-2 px-5 py-5">
              <h3 className="text-[15px] font-semibold text-white">{title}</h3>
              <p className="text-[13px] leading-[1.6] text-white/[0.55]">{copy}</p>
            </div>
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
