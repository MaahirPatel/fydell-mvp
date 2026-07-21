"use client";

import { useState } from "react";
import FydellBrand from "@/components/brand/FydellBrand";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export type ConnectionState = "online" | "offline";
export type SaveState = "idle" | "local" | "syncing" | "synced" | "error";
export type RuntimeStage = "idle" | "booting" | "ready" | "crashed";

function saveLabel(state: SaveState): string {
  switch (state) {
    case "local":
      return "Saved locally";
    case "syncing":
      return "Saving…";
    case "synced":
      return "Saved just now";
    case "error":
      return "Save failed · Retry";
    default:
      return "Saved just now";
  }
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

export default function TopBar({
  customerName = "Northbeam Logistics",
  connection,
  saveState,
  runtimeStage,
  remainingSeconds,
  submitting,
  onExit,
  onOpenRecovery,
  recoveryAlert,
  onOpenShipGate,
  onRetrySave,
}: {
  missionTitle?: string;
  customerName?: string;
  connection: ConnectionState;
  saveState: SaveState;
  runtimeStage: RuntimeStage;
  editorReady?: boolean;
  remainingSeconds: number;
  submitting: boolean;
  onExit: () => void;
  onOpenRecovery: () => void;
  recoveryAlert: boolean;
  onOpenShipGate: () => void;
  onRetrySave?: () => void;
}) {
  const [tipOpen, setTipOpen] = useState(false);
  const lowTime = remainingSeconds <= 300 && remainingSeconds > 0;
  const timeUp = remainingSeconds <= 0;
  const showRuntime = runtimeStage === "booting" || runtimeStage === "crashed";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#080A0F] px-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <FydellBrand markSize={22} wordmarkSize={15} />
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <span className="text-[12.5px] text-[#9AA3B2]">Project Relay</span>
          <span className="text-white/20" aria-hidden>
            /
          </span>
          <span className="truncate text-[12.5px] text-[#F4F5F7]">{customerName}</span>
          <button
            type="button"
            className="relative rounded-[6px] px-1.5 py-0.5 text-[11px] text-[#687182] hover:bg-white/[0.05] hover:text-[#9AA3B2]"
            aria-label="About synthetic deployment"
            onClick={() => setTipOpen((v) => !v)}
            onBlur={() => setTipOpen(false)}
          >
            Synthetic deployment
            {tipOpen && (
              <span className="absolute left-0 top-full z-50 mt-1 w-[260px] rounded-[8px] border border-white/[0.12] bg-[#10141D] p-3 text-left text-[12px] leading-relaxed text-[#9AA3B2] shadow-xl">
                A realistic customer environment for this assessment. Actions are recorded as evidence.
                Hidden scoring rules are never shown here.
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 md:flex">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[#9AA3B2]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${connection === "online" ? "bg-[#67d9a0]" : "bg-[#F26B82]"}`}
              aria-hidden
            />
            {connection === "online" ? "Session active" : "Offline"}
          </span>
          <span className="text-white/15" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={() => saveState === "error" && onRetrySave?.()}
            className={`text-[12px] ${
              saveState === "error" ? "text-[#fda4b0] underline" : "text-[#687182]"
            }`}
          >
            {saveLabel(saveState)}
          </button>
          {showRuntime && (
            <>
              <span className="text-white/15" aria-hidden>
                ·
              </span>
              <span className="text-[12px] text-[#F2C36B]/90">
                {runtimeStage === "booting" ? "Starting workspace…" : "Workspace interrupted"}
              </span>
            </>
          )}
        </div>

        {recoveryAlert && (
          <button
            type="button"
            onClick={onOpenRecovery}
            className="inline-flex h-8 items-center rounded-[8px] border border-[#F26B82]/45 bg-[#F26B82]/10 px-2.5 text-[11.5px] font-medium text-[#fda4b0]"
          >
            Recover
          </button>
        )}

        <span
          className={`rounded-[8px] border px-2.5 py-1 text-[12.5px] tabular-nums ${
            timeUp
              ? "border-[#F26B82]/35 text-[#fda4b0]"
              : lowTime
                ? "border-[#F2C36B]/30 text-[#F2C36B]"
                : "border-white/[0.1] text-[#F4F5F7]"
          }`}
          style={{ fontFamily: MONO }}
          aria-live="polite"
        >
          {timeUp ? "Time up" : `${formatClock(remainingSeconds)} remaining`}
        </span>

        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-9 items-center rounded-[8px] border border-white/[0.14] px-3 text-[12.5px] text-[#9AA3B2] hover:bg-white/[0.04] hover:text-[#F4F5F7]"
        >
          Exit safely
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={onOpenShipGate}
          className="inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-3.5 text-[12.5px] font-semibold text-[#08090C] disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Review & submit"}
        </button>
      </div>
    </header>
  );
}
