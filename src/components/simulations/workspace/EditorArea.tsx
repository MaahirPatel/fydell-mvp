"use client";

import dynamic from "next/dynamic";
import { useRef, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { ChevronRight, GitCompareArrows, Lock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AuthoredFile } from "@/lib/eng/authored/types";
import { baseName, isReadOnlyFile, languageFor, type WorkspaceFile } from "./lib";
import { EditorLoadingNotice, PlainCodeEditor } from "./EditorFallback";
import type { CodeDiff as MonacoCodeDiff, CodeEditor as MonacoCodeEditor, RevealRequest } from "./MonacoViews";
import type { SimTheme } from "./prefs";

const EditorLoading = () => <EditorLoadingNotice />;

function EditorChunkFailed(props: ComponentProps<typeof MonacoCodeEditor>) {
  return <PlainCodeEditor value={props.value} onChange={props.onChange} readOnly={props.readOnly} label={props.label} />;
}

function DiffChunkFailed(props: ComponentProps<typeof MonacoCodeDiff>) {
  return (
    <p role="alert" className="p-5 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
      The comparison view could not be downloaded. {props.label} is not shown; your files are unchanged.
    </p>
  );
}

const CodeEditor = dynamic(
  () =>
    import("./MonacoViews")
      .then((m) => m.CodeEditor)
      .catch(() => EditorChunkFailed),
  { ssr: false, loading: EditorLoading },
);
export const CodeDiff = dynamic(
  () =>
    import("./MonacoViews")
      .then((m) => m.CodeDiff)
      .catch(() => DiffChunkFailed),
  { ssr: false, loading: EditorLoading },
);

export type EditorTab = { kind: "file"; path: string } | { kind: "diff"; path: string };

export const tabId = (t: EditorTab) => `${t.kind}:${t.path}`;

function domId(id: string) {
  return `sim-tab-${id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

export function Breadcrumb({ path, trailing }: { path: string; trailing?: ReactNode }) {
  const parts = path.split("/");
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3">
      <nav aria-label="File path" className="flex min-w-0 flex-1 items-center gap-1 text-app-meta text-[var(--text-tertiary)]">
        {parts.map((p, i) => (
          <span key={`${p}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 ? <ChevronRight aria-hidden size={12} className="shrink-0 text-[var(--text-quaternary)]" /> : null}
            <span className={cn("truncate", i === parts.length - 1 && "text-[var(--text-secondary)]")}>{p}</span>
          </span>
        ))}
      </nav>
      {trailing}
    </div>
  );
}

/**
 * The centre of the workspace: open files and comparisons as tabs, with the
 * Monaco editor or diff editor below. Buffers are owned by the parent.
 */
export function EditorArea({
  tabs,
  activeId,
  files,
  starter,
  testFiles,
  dirtyPaths,
  readOnly,
  readOnlyReason,
  theme,
  fontSize,
  reveal,
  overlay,
  onActivate,
  onClose,
  onOpenDiff,
  onOpenFile,
  onChange,
  onCursor,
  onSave,
}: {
  tabs: EditorTab[];
  activeId: string | null;
  files: WorkspaceFile[];
  starter: AuthoredFile[];
  testFiles: Set<string>;
  dirtyPaths: Set<string>;
  readOnly: boolean;
  readOnlyReason: string | null;
  theme: SimTheme;
  fontSize: number;
  reveal: RevealRequest | null;
  /** Replaces the editor surface, for reviewing an assistant proposal. */
  overlay: ReactNode;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onOpenDiff: (path: string) => void;
  onOpenFile: (path: string) => void;
  onChange: (path: string, content: string) => void;
  onCursor: (path: string, line: number, column: number) => void;
  onSave: () => void;
}) {
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const active = tabs.find((t) => tabId(t) === activeId) ?? null;
  const fileMap = new Map(files.map((f) => [f.path, f]));
  const starterMap = new Map(starter.map((f) => [f.path, f.content]));

  const focusTab = (index: number) => {
    const t = tabs[(index + tabs.length) % tabs.length];
    if (!t) return;
    onActivate(tabId(t));
    tabRefs.current.get(tabId(t))?.focus();
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusTab(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusTab(index - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusTab(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusTab(tabs.length - 1);
    } else if (e.key === "Delete") {
      e.preventDefault();
      const id = tabId(tabs[index]);
      onClose(id);
      const next = tabs[index + 1] ?? tabs[index - 1];
      if (next) window.requestAnimationFrame(() => tabRefs.current.get(tabId(next))?.focus());
    }
  };

  let surface: ReactNode;
  if (overlay) {
    surface = overlay;
  } else if (!active) {
    surface = (
      <div className="grid h-full place-items-center p-8 text-center">
        <p className="max-w-[36ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">Open a file from Files in the sidebar. Changes save automatically.</p>
      </div>
    );
  } else if (active.kind === "file") {
    const file = fileMap.get(active.path);
    const fileLocked = isReadOnlyFile(file);
    const starterCopy = starterMap.get(active.path);
    const differs = starterCopy === undefined || starterCopy !== file?.content;
    surface = file ? (
      <div className="flex h-full min-h-0 flex-col">
        <Breadcrumb
          path={file.path}
          trailing={
            <div className="flex shrink-0 items-center gap-1">
              {fileLocked || readOnly ? (
                <span className="inline-flex items-center gap-1 text-app-meta text-[var(--text-tertiary)]">
                  <Lock aria-hidden size={12} />
                  Read-only
                </span>
              ) : null}
              {differs ? (
                <button
                  type="button"
                  onClick={() => onOpenDiff(file.path)}
                  className="inline-flex h-6 items-center gap-1 rounded-[4px] px-1.5 text-app-meta text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  <GitCompareArrows aria-hidden size={13} />
                  Compare with starter
                </button>
              ) : null}
            </div>
          }
        />
        {testFiles.has(file.path) ? (
          <p className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-band)] px-3 py-1.5 text-app-meta text-[var(--text-secondary)]">
            Public test file. Tests always run from the starter copy, so edits here do not change results.
          </p>
        ) : null}
        {readOnly && readOnlyReason ? (
          <p className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-band)] px-3 py-1.5 text-app-meta text-[var(--text-secondary)]">{readOnlyReason}</p>
        ) : null}
        <div className="min-h-0 flex-1">
          <CodeEditor
            path={file.path}
            value={file.content}
            language={languageFor(file.path)}
            readOnly={readOnly || fileLocked}
            theme={theme}
            fontSize={fontSize}
            label={`Contents of ${file.path}`}
            reveal={reveal}
            onChange={(v) => onChange(file.path, v)}
            onCursor={(line, column) => onCursor(file.path, line, column)}
            onSaveShortcut={onSave}
          />
        </div>
      </div>
    ) : (
      <p className="p-5 text-[14px] text-[var(--text-secondary)]">This file is no longer in the workspace.</p>
    );
  } else {
    const current = fileMap.get(active.path)?.content ?? "";
    const before = starterMap.get(active.path) ?? "";
    surface = (
      <div className="flex h-full min-h-0 flex-col">
        <Breadcrumb
          path={active.path}
          trailing={
            <div className="flex shrink-0 items-center gap-2 text-app-meta text-[var(--text-tertiary)]">
              <span>Starter on the left, your version on the right</span>
              {fileMap.has(active.path) ? (
                <button
                  type="button"
                  onClick={() => onOpenFile(active.path)}
                  className="inline-flex h-6 items-center rounded-[4px] px-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  Open file
                </button>
              ) : null}
            </div>
          }
        />
        <div className="min-h-0 flex-1">
          <CodeDiff
            id={`starter/${active.path}`}
            original={before}
            modified={current}
            language={languageFor(active.path)}
            theme={theme}
            fontSize={fontSize}
            label={`Changes to ${active.path} compared with the starter`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[var(--surface-panel)]">
      {!overlay && tabs.length ? (
        <div role="tablist" aria-label="Open files" className="sim-scroll flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-[var(--border-default)] bg-[var(--surface-canvas)]">
          {tabs.map((t, i) => {
            const id = tabId(t);
            const selected = id === activeId;
            const dirty = t.kind === "file" && dirtyPaths.has(t.path);
            const name = baseName(t.path);
            return (
              <div
                key={id}
                className={cn(
                  "group relative flex shrink-0 items-center border-r border-[var(--border-subtle)]",
                  selected ? "bg-[var(--surface-panel)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
                )}
              >
                {selected ? <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-[var(--accent)]" /> : null}
                <button
                  ref={(el) => {
                    if (el) tabRefs.current.set(id, el);
                    else tabRefs.current.delete(id);
                  }}
                  id={domId(id)}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="sim-editor-panel"
                  aria-keyshortcuts="Delete"
                  tabIndex={selected ? 0 : -1}
                  title={t.kind === "diff" ? `${t.path} compared with the starter` : t.path}
                  onClick={() => onActivate(id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  onAuxClick={(e) => {
                    if (e.button === 1) onClose(id);
                  }}
                  className="flex h-full items-center gap-1.5 pl-3 pr-1 text-[13px] outline-offset-[-2px]"
                >
                  {t.kind === "diff" ? <GitCompareArrows aria-hidden size={13} className="text-[var(--text-tertiary)]" /> : null}
                  <span className="max-w-[180px] truncate">{t.kind === "diff" ? `${name} (changes)` : name}</span>
                  {dirty ? (
                    <>
                      <span aria-hidden className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[var(--text-secondary)]" />
                      <span className="sr-only">, unsaved changes</span>
                    </>
                  ) : null}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Close ${t.kind === "diff" ? `${name} changes` : name}`}
                  onClick={() => onClose(id)}
                  className={cn(
                    "mr-1.5 grid h-5 w-5 place-items-center rounded-[4px] text-[var(--text-tertiary)] hover:bg-[var(--surface-selected)] hover:text-[var(--text-primary)]",
                    selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                  )}
                >
                  <X aria-hidden size={13} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
      <div
        id="sim-editor-panel"
        role={!overlay && active ? "tabpanel" : undefined}
        aria-labelledby={!overlay && active ? domId(tabId(active)) : undefined}
        className="min-h-0 flex-1"
      >
        {surface}
      </div>
    </div>
  );
}
