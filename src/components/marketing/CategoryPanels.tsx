"use client";

import { Stagger, StaggerItem } from "@/components/motion/Reveal";

function WorkroomSchematic() {
  return (
    <svg viewBox="0 0 120 72" className="h-[72px] w-[120px]" aria-hidden>
      <rect x="8" y="10" width="36" height="52" rx="4" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x="14"
          y={18 + i * 10}
          width="24"
          height="5"
          rx="1.5"
          fill={i === 2 ? "rgba(86,98,255,0.35)" : "rgba(255,255,255,0.1)"}
        />
      ))}
      <rect x="52" y="10" width="60" height="52" rx="4" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x="58" y={20 + r * 10} width="22" height="3" rx="1" fill="rgba(255,255,255,0.14)" />
          <rect
            x="84"
            y={20 + r * 10}
            width="16"
            height="3"
            rx="1"
            fill={r === 2 ? "rgba(242,107,130,0.35)" : "rgba(86,98,255,0.25)"}
          />
        </g>
      ))}
    </svg>
  );
}

function EvidenceSchematic() {
  return (
    <svg viewBox="0 0 120 72" className="h-[72px] w-[120px]" aria-hidden>
      <circle cx="24" cy="36" r="5" fill="rgba(86,98,255,0.5)" />
      <circle cx="60" cy="22" r="4" fill="rgba(255,255,255,0.2)" />
      <circle cx="60" cy="50" r="4" fill="rgba(255,255,255,0.2)" />
      <circle cx="96" cy="36" r="5" fill="rgba(58,191,210,0.55)" />
      <path
        d="M29 36 L55 24 M29 36 L55 48 M65 24 L91 36 M65 48 L91 36"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1"
      />
    </svg>
  );
}

function MemoSchematic() {
  return (
    <svg viewBox="0 0 120 72" className="h-[72px] w-[120px]" aria-hidden>
      <rect x="18" y="12" width="84" height="48" rx="5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <rect x="26" y="20" width="40" height="3" rx="1" fill="rgba(255,255,255,0.2)" />
      <rect x="26" y="28" width="52" height="2.5" rx="1" fill="rgba(255,255,255,0.1)" />
      <rect x="26" y="35" width="46" height="2.5" rx="1" fill="rgba(255,255,255,0.1)" />
      <rect
        x="26"
        y="44"
        width="28"
        height="8"
        rx="3"
        fill="rgba(103,217,160,0.16)"
        stroke="rgba(103,217,160,0.28)"
      />
    </svg>
  );
}

const PANELS = [
  {
    id: "session",
    title: "Relay session",
    copy: "The FDE gets Northbeam's real ask, three messy CSVs, a working repo, an allowlisted terminal, and a live stakeholder chat.",
    Schematic: WorkroomSchematic,
  },
  {
    id: "evidence",
    title: "Evidence trail",
    copy: "File saves, terminal commands, chat messages, and the response to the deadline curveball are all captured as timestamped evidence.",
    Schematic: EvidenceSchematic,
  },
  {
    id: "memo",
    title: "Evidence receipt",
    copy: "Hiring teams get ten cited trait findings in four buckets — plus a secondary fit score — before recording a decision.",
    Schematic: MemoSchematic,
  },
];

export default function CategoryPanels() {
  return (
    <Stagger className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8 lg:gap-12" amount={0.15}>
      {PANELS.map(({ id, title, copy, Schematic }) => (
        <StaggerItem key={id}>
          <div>
            <div className="mb-5 opacity-90">
              <Schematic />
            </div>
            <h3
              className="text-[15px] text-[#F4F5F7]"
              style={{ fontWeight: 560, letterSpacing: "-0.015em" }}
            >
              {title}
            </h3>
            <p
              className="mt-2 max-w-[280px] text-[14px] leading-[1.55] text-[rgba(244,245,247,0.62)]"
              style={{ fontWeight: 430 }}
            >
              {copy}
            </p>
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
