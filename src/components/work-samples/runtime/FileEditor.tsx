"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { AuthoredFile } from "@/lib/eng/authored/types";

export type FileChange = { path: string; change: "modified" | "added" | "removed" };

/** Files that differ from the starter, in path order. */
export function changedFiles(files: AuthoredFile[], starter: AuthoredFile[]): FileChange[] {
  const base = new Map(starter.map((f) => [f.path, f.content]));
  const now = new Map(files.map((f) => [f.path, f.content]));
  const changes: FileChange[] = [];
  for (const f of files) {
    const before = base.get(f.path);
    if (before === undefined) changes.push({ path: f.path, change: "added" });
    else if (before !== f.content) changes.push({ path: f.path, change: "modified" });
  }
  for (const f of starter) if (!now.has(f.path)) changes.push({ path: f.path, change: "removed" });
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

const CHANGE_LABEL: Record<FileChange["change"], string> = { modified: "Edited", added: "New", removed: "Removed" };

/**
 * A plain textarea editor over the workspace files. Controlled: the parent
 * owns the files and saving. Public test files can be read and edited, but
 * the starter copies are what run.
 */
export function FileEditor({
  files,
  starter,
  testFiles,
  disabled,
  onChange,
}: {
  files: AuthoredFile[];
  starter: AuthoredFile[];
  testFiles: string[];
  disabled?: boolean;
  onChange: (files: AuthoredFile[]) => void;
}) {
  const sorted = useMemo(() => [...files].sort((a, b) => a.path.localeCompare(b.path)), [files]);
  const [selected, setSelected] = useState<string>(() => sorted.find((f) => !testFiles.includes(f.path))?.path ?? sorted[0]?.path ?? "");
  const [newPath, setNewPath] = useState("");
  const [pathError, setPathError] = useState<string | null>(null);
  const changes = useMemo(() => new Map(changedFiles(files, starter).map((c) => [c.path, c.change])), [files, starter]);
  const current = files.find((f) => f.path === selected) ?? null;
  const starterCopy = starter.find((f) => f.path === selected) ?? null;
  const isTest = testFiles.includes(selected);

  const update = (content: string) => onChange(files.map((f) => (f.path === selected ? { ...f, content } : f)));

  const addFile = () => {
    const path = newPath.trim().replace(/\\/g, "/");
    if (!/^[A-Za-z0-9_.\-/]+$/.test(path) || path.startsWith("/") || path.split("/").some((p) => p === "" || p === "." || p === "..")) {
      setPathError("Use a relative path with letters, numbers, dots, dashes, underscores and slashes.");
      return;
    }
    if (files.some((f) => f.path === path)) {
      setPathError("That file already exists.");
      return;
    }
    onChange([...files, { path, content: "" }]);
    setSelected(path);
    setNewPath("");
    setPathError(null);
  };

  return (
    <div className="grid min-h-[520px] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] md:grid-cols-[230px_minmax(0,1fr)]">
      <div className="flex flex-col border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] md:border-b-0 md:border-r">
        <ul className="flex-1 overflow-y-auto py-1" aria-label="Files">
          {sorted.map((f) => {
            const change = changes.get(f.path);
            return (
              <li key={f.path}>
                <button
                  type="button"
                  onClick={() => setSelected(f.path)}
                  aria-current={f.path === selected ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left font-mono text-app-meta",
                    f.path === selected ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <span className="min-w-0 truncate" title={f.path}>
                    {f.path}
                  </span>
                  {change ? <span className="shrink-0 font-sans text-app-meta text-[var(--text-tertiary)]">{CHANGE_LABEL[change]}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
        {!disabled ? (
          <div className="grid gap-1.5 border-t border-[var(--border-subtle)] p-2">
            <label className="text-app-meta font-medium text-[var(--text-tertiary)]" htmlFor="authored-new-file">
              New file
            </label>
            <div className="flex gap-1.5">
              <input
                id="authored-new-file"
                value={newPath}
                onChange={(e) => {
                  setNewPath(e.target.value);
                  setPathError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFile();
                  }
                }}
                placeholder="src/helpers.py"
                className="h-8 min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 font-mono text-app-meta text-[var(--text-primary)]"
              />
              <Button type="button" size="sm" variant="secondary" onClick={addFile} disabled={!newPath.trim()}>
                Add
              </Button>
            </div>
            {pathError ? <p className="text-app-meta text-[var(--fy-red-ink)]">{pathError}</p> : null}
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col">
        {current ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-1.5">
              <span className="min-w-0 truncate font-mono text-app-meta text-[var(--text-primary)]">{current.path}</span>
              {!disabled ? (
                <div className="flex gap-1">
                  {starterCopy && starterCopy.content !== current.content ? (
                    <Button type="button" size="sm" variant="quiet" onClick={() => update(starterCopy.content)}>
                      Revert to starter
                    </Button>
                  ) : null}
                  {!starterCopy ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="quiet"
                      onClick={() => {
                        onChange(files.filter((f) => f.path !== current.path));
                        setSelected(sorted.find((f) => f.path !== current.path)?.path ?? "");
                      }}
                    >
                      Delete file
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {isTest ? (
              <p className="border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-1.5 text-app-meta text-[var(--text-secondary)]">
                This is a public test file. Tests always run from the starter copy, so edits here do not change results.
              </p>
            ) : null}
            <textarea
              aria-label={`Contents of ${current.path}`}
              value={current.content}
              onChange={(e) => update(e.target.value)}
              readOnly={disabled}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              onKeyDown={(e) => {
                if (e.key !== "Tab" || disabled) return;
                e.preventDefault();
                const el = e.currentTarget;
                const start = el.selectionStart;
                const end = el.selectionEnd;
                const next = `${el.value.slice(0, start)}    ${el.value.slice(end)}`;
                update(next);
                requestAnimationFrame(() => el.setSelectionRange(start + 4, start + 4));
              }}
              className="min-h-[460px] w-full flex-1 resize-y bg-[var(--surface-raised)] px-3 py-2.5 font-mono text-[13px] leading-[1.6] text-[var(--text-primary)] outline-none"
            />
          </>
        ) : (
          <p className="p-4 text-app-body text-[var(--text-secondary)]">Choose a file on the left.</p>
        )}
      </div>
    </div>
  );
}
