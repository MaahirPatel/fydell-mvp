"use client";

import FydellBrand from "@/components/brand/FydellBrand";
import { Button } from "@/components/ui/Button";
import { StatusTag } from "@/components/ui/StatusTag";
import { ROLE_DISPLAY } from "@/lib/sim-engine/types";
import type { RoleKey, AttemptStatus } from "@/lib/sim-engine/types";

export function SimulationHeader({
  title,
  roleKey,
  remainingSeconds,
  status,
  saveLabel,
  onSubmit,
  submitDisabled,
}: {
  title: string;
  roleKey: RoleKey;
  remainingSeconds: number;
  status: AttemptStatus;
  saveLabel: string;
  onSubmit: () => void;
  submitDisabled?: boolean;
}) {
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  const display = ROLE_DISPLAY[roleKey];

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-3">
      <FydellBrand markSize={22} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-[var(--text-primary)]">{title}</div>
        <div className="truncate text-[11px] text-[var(--text-tertiary)]">{display.label}</div>
      </div>
      <StatusTag tone={status === "SUBMITTED" ? "good" : status === "IN_PROGRESS" ? "active" : "neutral"}>
        {status.replaceAll("_", " ")}
      </StatusTag>
      <span className="font-mono text-[12px] tabular-nums text-[var(--text-secondary)]" aria-label="Time remaining">
        {m}:{String(s).padStart(2, "0")}
      </span>
      <span className="hidden text-[11px] text-[var(--text-tertiary)] sm:inline">{saveLabel}</span>
      <Button
        size="sm"
        variant="primary"
        onClick={onSubmit}
        disabled={submitDisabled || status === "SUBMITTED" || status === "SUBMITTING"}
      >
        Submit
      </Button>
    </header>
  );
}
