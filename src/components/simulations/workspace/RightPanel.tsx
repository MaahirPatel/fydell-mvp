"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Bot, PanelRightClose, Users } from "lucide-react";
import { cn } from "@/lib/cn";

export type RightTab = "team" | "assistant";

const TABS: { value: RightTab; label: string; caption: string; Icon: typeof Users }[] = [
  { value: "team", label: "Team", caption: "Simulated teammates. They answer from the scenario and never edit your files.", Icon: Users },
  { value: "assistant", label: "Assistant", caption: "Coding assistant. It proposes changes; you decide what goes into your files.", Icon: Bot },
];

/**
 * The docked collaboration panel: simulated teammates and, when the task
 * allows it, the coding assistant. The two tabs look deliberately different
 * so a person is never mistaken for a tool.
 */
export function RightPanel({
  tab,
  assistantAvailable,
  teamUnread,
  onTab,
  onCollapse,
  collapseLabel,
  team,
  assistant,
}: {
  tab: RightTab;
  assistantAvailable: boolean;
  teamUnread: boolean;
  onTab: (tab: RightTab) => void;
  onCollapse: () => void;
  collapseLabel: string;
  team: ReactNode;
  assistant: ReactNode;
}) {
  const refs = useRef(new Map<RightTab, HTMLButtonElement>());
  const tabs = TABS.filter((t) => t.value === "team" || assistantAvailable);
  const current = tabs.find((t) => t.value === tab) ?? tabs[0];
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta || tabs.length < 2) return;
    e.preventDefault();
    const next = tabs[(i + delta + tabs.length) % tabs.length];
    onTab(next.value);
    refs.current.get(next.value)?.focus();
  };
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--surface-panel)]">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-[var(--border-default)] px-2">
        <div role="tablist" aria-label="Collaboration" className="flex items-center gap-1">
          {tabs.map((t, i) => {
            const selected = current.value === t.value;
            return (
              <button
                key={t.value}
                ref={(el) => {
                  if (el) refs.current.set(t.value, el);
                  else refs.current.delete(t.value);
                }}
                type="button"
                role="tab"
                id={`sim-right-tab-${t.value}`}
                aria-selected={selected}
                aria-controls="sim-right-tabpanel"
                aria-label={t.value === "team" ? `Team, simulated teammates${teamUnread ? ", new messages" : ""}` : "Assistant, coding assistant"}
                tabIndex={selected ? 0 : -1}
                onClick={() => onTab(t.value)}
                onKeyDown={(e) => onKey(e, i)}
                className={cn(
                  "relative inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium",
                  selected
                    ? t.value === "assistant"
                      ? "bg-[var(--sim-assistant-bg)] text-[var(--text-primary)] ring-1 ring-[var(--accent-line)]"
                      : "bg-[var(--surface-selected)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
                )}
              >
                <t.Icon aria-hidden size={14} />
                {t.label}
                {t.value === "team" && teamUnread ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label={collapseLabel}
          className="ml-auto grid h-7 w-7 place-items-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <PanelRightClose aria-hidden size={15} />
        </button>
      </div>
      <p className={cn("shrink-0 border-b border-[var(--border-subtle)] px-4 py-2 text-app-meta leading-[1.5] text-[var(--text-secondary)]", current.value === "assistant" && "bg-[var(--sim-assistant-bg)]")}>
        {current.caption}
      </p>
      <div id="sim-right-tabpanel" role="tabpanel" aria-labelledby={`sim-right-tab-${current.value}`} className="min-h-0 flex-1">
        {current.value === "team" ? team : assistant}
      </div>
    </div>
  );
}

/** Shown in place of the panel when it is collapsed on a wide screen. */
export function RightRail({ assistantAvailable, teamUnread, onOpen }: { assistantAvailable: boolean; teamUnread: boolean; onOpen: (tab: RightTab) => void }) {
  return (
    <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-l border-[var(--border-default)] bg-[var(--surface-canvas)] py-2">
      <button
        type="button"
        onClick={() => onOpen("team")}
        aria-label={`Open Team, simulated teammates${teamUnread ? ", new messages" : ""}`}
        title="Team"
        className="relative grid h-9 w-9 place-items-center rounded-[8px] text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      >
        <Users aria-hidden size={17} />
        {teamUnread ? <span aria-hidden className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> : null}
      </button>
      {assistantAvailable ? (
        <button
          type="button"
          onClick={() => onOpen("assistant")}
          aria-label="Open Assistant, coding assistant"
          title="Assistant"
          className="grid h-9 w-9 place-items-center rounded-[8px] text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <Bot aria-hidden size={17} />
        </button>
      ) : null}
    </div>
  );
}
