"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { STAGE_ORDER, type RelayStage } from "@/lib/relay/phase";
import { cn } from "@/lib/cn";

export default function PhaseRail({
  index,
  activeStage,
  onSelectStage,
}: {
  index: number;
  /** Candidate-selected focus for the stage guide (does not lock tools). */
  activeStage?: RelayStage | null;
  onSelectStage?: (stage: RelayStage) => void;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const focus = activeStage || STAGE_ORDER[Math.min(index, STAGE_ORDER.length - 1)]?.id;
  const focusMeta = STAGE_ORDER.find((s) => s.id === focus);

  return (
    <div className="shrink-0 border-b border-white/[0.08] bg-[#0B0F16]">
      <div className="flex h-12 items-center gap-2 px-3 sm:px-5">
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Simulation stages">
          {STAGE_ORDER.map((stage, i) => {
            const done = i < index;
            const current = i === index;
            const selected = stage.id === focus;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  onSelectStage?.(stage.id);
                  setGuideOpen(true);
                }}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12.5px] transition-colors",
                  selected
                    ? "bg-[#6470FF]/15 text-[#F4F5F7]"
                    : done
                      ? "text-[#9AA3B2] hover:bg-white/[0.04]"
                      : "text-[#687182] hover:bg-white/[0.04] hover:text-[#9AA3B2]"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                    done
                      ? "bg-[#67d9a0]/20 text-[#67d9a0]"
                      : current || selected
                        ? "bg-[#6470FF] text-white"
                        : "border border-white/15 text-[#687182]"
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{stage.label}</span>
              </button>
            );
          })}
        </nav>
        <span className="shrink-0 text-[12px] tabular-nums text-[#687182]">
          {Math.min(index + 1, 5)} of 5
        </span>
      </div>

      {guideOpen && focusMeta && (
        <div className="flex items-start justify-between gap-3 border-t border-white/[0.06] bg-[#10141D]/80 px-4 py-2.5 sm:px-5">
          <p className="text-[12.5px] leading-relaxed text-[#9AA3B2]">
            <span className="font-medium text-[#F4F5F7]">{focusMeta.label}: </span>
            {focusMeta.guide} You can keep working in any panel — stages do not lock the workspace.
          </p>
          <button
            type="button"
            onClick={() => setGuideOpen(false)}
            className="shrink-0 text-[12px] text-[#687182] hover:text-[#F4F5F7]"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
