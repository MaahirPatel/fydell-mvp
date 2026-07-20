"use client";

import { PHASE_ORDER } from "@/lib/relay/phase";

/**
 * Deliberately quiet — a workday phase rail, not a quiz progress bar. Plain
 * text, thin dividers, no circles/checkmarks/percentages. Derived purely
 * from recorded activity signals (see lib/relay/phase.ts) — never a
 * self-report toggle.
 */
export default function PhaseRail({ index }: { index: number }) {
  return (
    <div className="flex items-center gap-x-2 gap-y-1 overflow-x-auto border-b border-white/[0.06] bg-[#08090D] px-4 py-2 text-[12px] sm:px-6">
      {PHASE_ORDER.map((phase, i) => (
        <span key={phase.id} className="flex shrink-0 items-center gap-2">
          <span className={i === index ? "font-medium text-white/75" : i < index ? "text-white/40" : "text-white/25"}>
            {phase.label}
          </span>
          {i < PHASE_ORDER.length - 1 && <span className="text-white/15">·</span>}
        </span>
      ))}
    </div>
  );
}
