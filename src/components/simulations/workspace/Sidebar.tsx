"use client";

import { useRef, type KeyboardEvent } from "react";
import { Expand, FileText, Files, GitCompareArrows, History } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AuthoredCandidateView } from "@/lib/eng/authored/types";
import { BriefContent, type BriefTeammate } from "./BriefContent";
import { FileTree } from "./FileTree";
import { formatClock, type ChangeKind, type WorkspaceChange } from "./lib";

export type SidebarSection = "brief" | "files" | "changes" | "activity";

export type ActivityKind = "tests" | "save" | "assistant" | "scenario" | "sync" | "team" | "problem";

export interface ActivityItem {
  id: string;
  at: string;
  kind: ActivityKind;
  text: string;
}

const SECTIONS: { value: SidebarSection; label: string; Icon: typeof FileText }[] = [
  { value: "brief", label: "Brief", Icon: FileText },
  { value: "files", label: "Files", Icon: Files },
  { value: "changes", label: "Changes", Icon: GitCompareArrows },
  { value: "activity", label: "Activity", Icon: History },
];

const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  tests: "Tests",
  save: "Saved",
  assistant: "Assistant",
  scenario: "Team",
  sync: "Sync",
  team: "Team",
  problem: "Notice",
};

/** The vertical icon rail that switches sidebar sections. Clicking the open section collapses the panel. */
export function SidebarRail({
  section,
  open,
  changeCount,
  onSelect,
  sections,
}: {
  section: SidebarSection;
  open: boolean;
  changeCount: number;
  onSelect: (section: SidebarSection) => void;
  /** Limits the rail to these sections. Defaults to all of them. */
  sections?: SidebarSection[];
}) {
  const refs = useRef(new Map<SidebarSection, HTMLButtonElement>());
  const shown = sections ? SECTIONS.filter((s) => sections.includes(s.value)) : SECTIONS;
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = shown[(i + delta + shown.length) % shown.length];
    refs.current.get(next.value)?.focus();
  };
  return (
    <div role="tablist" aria-label="Sidebar" aria-orientation="vertical" className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-[var(--border-default)] bg-[var(--surface-canvas)] py-2">
      {shown.map(({ value, label, Icon }, i) => {
        const selected = open && section === value;
        return (
          <button
            key={value}
            ref={(el) => {
              if (el) refs.current.set(value, el);
              else refs.current.delete(value);
            }}
            type="button"
            role="tab"
            id={`sim-side-tab-${value}`}
            aria-selected={selected}
            aria-controls={open ? "sim-sidebar-panel" : undefined}
            aria-label={value === "changes" && changeCount ? `${label}, ${changeCount} changed files` : label}
            title={label}
            tabIndex={section === value ? 0 : -1}
            onClick={() => onSelect(value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "relative grid h-9 w-9 place-items-center rounded-[8px]",
              selected ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon aria-hidden size={17} />
            {value === "changes" && changeCount ? (
              <span aria-hidden className="absolute right-0.5 top-0.5 min-w-[15px] rounded-full bg-[var(--accent)] px-1 text-center text-app-marker font-semibold leading-[15px] text-[var(--control-solid-ink)]">
                {changeCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

const CHANGE_WORD: Record<ChangeKind, string> = { modified: "Edited", added: "New", removed: "Removed" };

/** The contents of the open sidebar section. */
export function SidebarPanel({
  section,
  view,
  teammates,
  messagingAvailable,
  paths,
  activePath,
  dirtyPaths,
  changes,
  deletable,
  readOnly,
  activity,
  onOpenFile,
  onOpenDiff,
  onAddFile,
  onDeleteFile,
  onExpandBrief,
}: {
  section: SidebarSection;
  view: AuthoredCandidateView;
  teammates: BriefTeammate[];
  messagingAvailable: boolean;
  paths: string[];
  activePath: string | null;
  dirtyPaths: Set<string>;
  changes: WorkspaceChange[];
  deletable: Set<string>;
  readOnly: boolean;
  activity: ActivityItem[];
  onOpenFile: (path: string) => void;
  onOpenDiff: (path: string) => void;
  onAddFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onExpandBrief: () => void;
}) {
  const label = SECTIONS.find((s) => s.value === section)?.label ?? "";
  const changeMap = new Map(changes.map((c) => [c.path, c.change]));
  return (
    <div id="sim-sidebar-panel" role="tabpanel" aria-labelledby={`sim-side-tab-${section}`} className="flex h-full min-h-0 flex-col bg-[var(--surface-panel)]">
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</h2>
        {section === "brief" ? (
          <button
            type="button"
            onClick={onExpandBrief}
            className="inline-flex h-6 items-center gap-1 rounded-[4px] px-1.5 text-app-meta text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <Expand aria-hidden size={12} />
            Full view
          </button>
        ) : null}
      </div>

      {section === "brief" ? (
        <div className="sim-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-6">
          <BriefContent view={view} teammates={teammates} messagingAvailable={messagingAvailable} compact idBase="side-brief" />
        </div>
      ) : null}

      {section === "files" ? (
        <FileTree
          paths={paths}
          activePath={activePath}
          dirtyPaths={dirtyPaths}
          changes={changeMap}
          deletable={deletable}
          readOnly={readOnly}
          onOpen={onOpenFile}
          onAdd={onAddFile}
          onDelete={onDeleteFile}
        />
      ) : null}

      {section === "changes" ? (
        <div className="sim-scroll min-h-0 flex-1 overflow-y-auto pb-2">
          {changes.length ? (
            <ul aria-label="Files changed from the starter">
              {changes.map((c) => (
                <li key={c.path}>
                  <button
                    type="button"
                    onClick={() => onOpenDiff(c.path)}
                    title={`${c.path}, ${CHANGE_WORD[c.change].toLowerCase()}`}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left outline-offset-[-2px] hover:bg-[var(--surface-hover)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-app-meta text-[var(--text-primary)]">{c.path.split("/").pop()}</span>
                      <span className="block truncate text-app-meta text-[var(--text-tertiary)]">
                        {CHANGE_WORD[c.change]}
                        {c.path.includes("/") ? `, ${c.path.slice(0, c.path.lastIndexOf("/"))}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-app-marker tabular-nums">
                      <span className="text-[var(--sim-success)]">+{c.added}</span> <span className="text-[var(--sim-error)]">-{c.removed}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-app-meta leading-[1.55] text-[var(--text-tertiary)]">No files differ from the starter yet.</p>
          )}
        </div>
      ) : null}

      {section === "activity" ? (
        <div className="sim-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {activity.length ? (
            <ol aria-label="Activity, newest first" className="grid gap-2.5">
              {activity.map((a) => (
                <li key={a.id} className="grid gap-0.5">
                  <p className="flex items-baseline justify-between gap-2 text-app-meta text-[var(--text-tertiary)]">
                    <span>{ACTIVITY_LABEL[a.kind]}</span>
                    <time dateTime={a.at} className="tabular-nums">
                      {formatClock(a.at)}
                    </time>
                  </p>
                  <p className="text-app-meta leading-[1.5] text-[var(--text-body)]">{a.text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-2 text-app-meta text-[var(--text-tertiary)]">Test runs, saves, assistant decisions and team events will appear here.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
