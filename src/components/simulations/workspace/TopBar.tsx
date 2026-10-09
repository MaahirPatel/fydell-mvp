"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CircleAlert, Cloud, CloudOff, Ellipsis, LoaderCircle, PanelRight } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { Popover, PopoverItem } from "./Popover";
import { useSimPrefs } from "./prefs";
import { SettingsMenu } from "./SettingsMenu";
import type { SaveState } from "./useWorkspaceFiles";

function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** Milliseconds left until `dueAt`, on the server's clock. Null until the first client tick. */
export function useRemaining(dueAt: string | null, serverNow: string): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!dueAt) return;
    const offset = new Date(serverNow).getTime() - Date.now();
    const due = new Date(dueAt).getTime();
    const update = () => setLeft(Math.max(0, due - (Date.now() + offset)));
    const first = window.setTimeout(update, 0);
    const id = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [dueAt, serverNow]);
  return dueAt ? left : null;
}

function remainingText(ms: number): string {
  if (ms <= 0) return "Time is up";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Under 1 min left";
  if (minutes >= 90) return `${Math.floor(minutes / 60)} h ${minutes % 60} min left`;
  return `${minutes} min left`;
}

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "Saved to workspace",
  saving: "Saving",
  unsaved: "Unsaved changes",
  offline: "Offline, retrying",
  error: "Not saved",
  conflict: "Saved copy changed elsewhere",
};

export function TopBar({
  title,
  submitted,
  saveState,
  remaining,
  late,
  preview,
  compact,
  rightOpen,
  rightAvailable,
  onToggleRight,
  onRetrySave,
  onReview,
  onOpenLocal,
  onDownloadCurrent,
  starterHref,
}: {
  title: string;
  submitted: boolean;
  saveState: SaveState;
  remaining: number | null;
  late: boolean;
  preview: boolean;
  compact: boolean;
  rightOpen: boolean;
  rightAvailable: boolean;
  onToggleRight: () => void;
  onRetrySave: () => void;
  onReview: () => void;
  onOpenLocal: (() => void) | null;
  onDownloadCurrent: () => void;
  starterHref: string;
}) {
  const { theme } = useSimPrefs();
  const online = useOnline();
  const effective: SaveState = !online && saveState !== "conflict" ? "offline" : saveState;
  const attention = remaining !== null && remaining < 10 * 60_000;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-2 sm:gap-3 sm:px-3">
      <FydellLogo height={17} tone={theme === "dark" ? "dark" : "light"} />
      <span aria-hidden className="hidden h-5 w-px bg-[var(--border-default)] sm:block" />
      <h1 className="sr-only min-w-0 truncate text-[14px] font-medium text-[var(--text-primary)] sm:not-sr-only" title={title}>
        {title}
      </h1>
      {preview ? <span className="shrink-0 rounded-[4px] bg-[var(--surface-raised)] px-1.5 py-0.5 text-app-meta text-[var(--text-secondary)]">Preview</span> : null}

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {!submitted ? (
          <div className="flex items-center gap-2 text-app-meta">
            <span
              role="status"
              aria-live="polite"
              className={cn(
                "inline-flex items-center gap-1.5",
                effective === "saved" && "text-[var(--text-tertiary)]",
                (effective === "saving" || effective === "unsaved") && "text-[var(--text-secondary)]",
                (effective === "offline" || effective === "conflict") && "text-[var(--sim-attention)]",
                effective === "error" && "text-[var(--sim-error)]",
              )}
            >
              {effective === "saving" ? (
                <LoaderCircle aria-hidden size={13} className="animate-spin" />
              ) : effective === "offline" ? (
                <CloudOff aria-hidden size={13} />
              ) : effective === "error" || effective === "conflict" ? (
                <CircleAlert aria-hidden size={13} />
              ) : (
                <Cloud aria-hidden size={13} />
              )}
              <span className="sr-only sm:not-sr-only">{SAVE_LABEL[effective]}</span>
            </span>
            {effective === "error" ? (
              <button type="button" onClick={onRetrySave} className="text-app-meta font-medium text-[var(--text-primary)] underline underline-offset-2">
                Retry
              </button>
            ) : null}
          </div>
        ) : (
          <span className="text-app-meta text-[var(--text-secondary)]">Submitted</span>
        )}

        {!submitted && remaining !== null ? (
          <span className={cn("text-[13px] tabular-nums", attention ? "font-medium text-[var(--sim-attention)]" : "text-[var(--text-secondary)]")}>
            {late && remaining <= 0 ? "Past the time limit, submissions are marked late" : remainingText(remaining)}
          </span>
        ) : null}

        <div className="flex items-center gap-0.5">
          <Popover label="Workspace options" button={<Ellipsis aria-hidden size={16} />}>
            {(close) => (
              <div className="grid">
                {onOpenLocal ? (
                  <PopoverItem
                    hint="Download, edit locally, sync back"
                    onClick={() => {
                      close();
                      onOpenLocal();
                    }}
                  >
                    Open in VS Code / Cursor
                  </PopoverItem>
                ) : null}
                <PopoverItem
                  hint={submitted ? "The files you submitted" : "Includes edits not yet saved"}
                  onClick={() => {
                    close();
                    onDownloadCurrent();
                  }}
                >
                  {submitted ? "Download your files (ZIP)" : "Download current files (ZIP)"}
                </PopoverItem>
                <a href={starterHref} className="flex w-full flex-col rounded-[6px] px-2.5 py-2 text-[13.5px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">
                  Download the starter project (ZIP)
                </a>
              </div>
            )}
          </Popover>
          <SettingsMenu showFontSize />
          {rightAvailable && compact ? (
            <button
              type="button"
              onClick={onToggleRight}
              aria-expanded={rightOpen}
              aria-controls="sim-right-panel"
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                rightOpen && "bg-[var(--surface-hover)] text-[var(--text-primary)]",
              )}
            >
              <PanelRight aria-hidden size={15} />
              <span className="sr-only sm:not-sr-only">Team</span>
            </button>
          ) : null}
        </div>

        <Button size="sm" variant="primary" onClick={onReview}>
          <span className="sm:hidden">{submitted ? "Receipt" : "Review"}</span>
          <span className="hidden sm:inline">{submitted ? "View receipt" : "Review submission"}</span>
        </Button>
      </div>
    </header>
  );
}
