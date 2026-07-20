"use client";

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
      return "Syncing…";
    case "synced":
      return "Synced";
    case "error":
      return "Save issue";
    default:
      return "";
  }
}

function runtimeLabel(stage: RuntimeStage): string {
  switch (stage) {
    case "booting":
      return "Python booting…";
    case "ready":
      return "Python ready";
    case "crashed":
      return "Runtime recovering…";
    default:
      return "Runtime idle";
  }
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

export default function TopBar({
  missionTitle,
  connection,
  saveState,
  runtimeStage,
  editorReady,
  remainingSeconds,
  submitting,
  onExit,
  onOpenRecovery,
  recoveryAlert,
  onOpenShipGate,
}: {
  missionTitle: string;
  connection: ConnectionState;
  saveState: SaveState;
  runtimeStage: RuntimeStage;
  editorReady: boolean;
  remainingSeconds: number;
  submitting: boolean;
  onExit: () => void;
  onOpenRecovery: () => void;
  recoveryAlert: boolean;
  onOpenShipGate: () => void;
}) {
  const lowTime = remainingSeconds <= 300 && remainingSeconds > 0;
  const timeUp = remainingSeconds <= 0;

  return (
    <header className="flex h-14 flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#090B10] px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <FydellBrand markSize={22} wordmarkSize={15} />
        <span className="hidden truncate text-[12px] text-white/40 sm:inline">
          Project Relay <span className="text-white/25">·</span> Northbeam Logistics
          <span className="text-white/25"> · </span>Synthetic deployment
        </span>
        {missionTitle && (
          <span className="hidden max-w-[200px] truncate text-[12.5px] text-white/35 lg:inline">
            {missionTitle}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="hidden items-center gap-2 text-[11px] text-white/35 md:flex"
          style={{ fontFamily: MONO }}
        >
          <span className={connection === "online" ? "text-white/40" : "text-[#F26B82]"}>
            {connection === "online" ? "online" : "offline"}
          </span>
          <span aria-hidden>·</span>
          <span>{saveLabel(saveState) || "—"}</span>
          <span aria-hidden>·</span>
          <span>{runtimeLabel(runtimeStage)}</span>
          <span aria-hidden>·</span>
          <span>{editorReady ? "Editor ready" : "Editor loading…"}</span>
        </div>

        <button
          type="button"
          onClick={onOpenRecovery}
          className={`inline-flex h-8 items-center rounded-[7px] border px-2.5 text-[11.5px] font-medium transition-colors ${
            recoveryAlert
              ? "border-[#F26B82]/50 bg-[#F26B82]/10 text-[#fda4b0]"
              : "border-white/12 text-white/50 hover:bg-white/[0.05]"
          }`}
        >
          Recovery{recoveryAlert ? " ⚠" : ""}
        </button>

        <span
          className={`rounded-full border px-3 py-1 text-[11.5px] ${
            timeUp ? "border-[#F26B82]/35 text-[#fda4b0]" : lowTime ? "border-[#F2C36B]/30 text-[#F2C36B]/90" : "border-white/10 text-white/45"
          }`}
          style={{ fontFamily: MONO }}
        >
          {timeUp ? "Time up" : formatClock(remainingSeconds)}
        </span>

        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-9 items-center rounded-[8px] border border-white/15 px-3 text-[12.5px] text-white/70 hover:bg-white/[0.05]"
        >
          Exit safely
        </button>

        <button
          type="button"
          disabled={submitting}
          onClick={onOpenShipGate}
          className="inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-4 text-[12.5px] font-semibold text-[#08090C] disabled:opacity-50"
        >
          {submitting ? "Shipping…" : "Ship"}
        </button>
      </div>
    </header>
  );
}
