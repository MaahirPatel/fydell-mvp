"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";
import { Button } from "@/components/ui/Button";
import { StatusTag } from "@/components/ui/StatusTag";
import { ROLE_DISPLAY } from "@/lib/sim-engine/types";
import type { RoleKey, AttemptStatus } from "@/lib/sim-engine/types";
import { useWorkbenchChrome } from "./WorkbenchChrome";

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
  const chrome = useWorkbenchChrome();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-3">
      {chrome?.back ? (
        <Link
          href={chrome.back.href}
          className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-control)] py-1 pl-1 pr-2 text-app-meta text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.7} aria-hidden />
          {chrome.back.label}
        </Link>
      ) : (
        <FydellBrand markSize={22} />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-app-body font-medium text-[var(--text-primary)]">{title}</div>
        <div className="truncate text-app-meta text-[var(--text-tertiary)]">{display.label}</div>
      </div>
      {chrome?.note ? (
        <span className="hidden truncate text-app-meta text-[var(--text-tertiary)] lg:inline">
          {chrome.note}
        </span>
      ) : null}
      <StatusTag tone={status === "SUBMITTED" ? "good" : status === "IN_PROGRESS" ? "active" : "neutral"}>
        {status.replaceAll("_", " ")}
      </StatusTag>
      <span className="font-mono text-app-meta tabular-nums text-[var(--text-secondary)]" aria-label="Time remaining">
        {m}:{String(s).padStart(2, "0")}
      </span>
      <span className="hidden text-app-meta text-[var(--text-tertiary)] sm:inline">{saveLabel}</span>
      {chrome?.links?.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="hidden h-8 shrink-0 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-app-body font-medium text-[var(--text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] sm:inline-flex"
        >
          {link.label}
        </Link>
      ))}
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
