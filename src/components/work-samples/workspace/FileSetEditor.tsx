"use client";

import { useId, useState } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { PackageFile } from "../types";
import { CodeEditor } from "./CodeEditor";

const SAFE_PATH = /^(?!\/)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9_][A-Za-z0-9_./-]{0,119}$/;

/** Mirrors the server's rule: relative, no "..", no leading slash, at most 120 characters. */
export function pathProblem(path: string, taken: string[]): string | null {
  const p = path.trim();
  if (!p) return "Enter a file path.";
  if (!SAFE_PATH.test(p) || p.endsWith("/")) return "Use a relative path with letters, digits, _, -, . and /. No leading slash and no \"..\".";
  if (taken.includes(p)) return "A file with this path already exists.";
  return null;
}

/** File list plus editor for one set of files. Paths are validated before they are applied. */
export function FileSetEditor({
  files,
  onChange,
  label,
  emptyText,
  tagFor,
  readOnly,
  newFilePlaceholder = "src/module.py",
  takenElsewhere = [],
}: {
  files: PackageFile[];
  onChange: (files: PackageFile[]) => void;
  label: string;
  emptyText: string;
  tagFor?: (path: string) => string | null;
  readOnly?: boolean;
  newFilePlaceholder?: string;
  /** Paths that would collide in the same project (for example evaluation tests vs starter files). */
  takenElsewhere?: string[];
}) {
  const base = useId();
  const [selected, setSelected] = useState<string | null>(files[0]?.path ?? null);
  const [adding, setAdding] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const current = files.find((f) => f.path === selected) ?? sorted[0] ?? null;
  const paths = files.map((f) => f.path);

  function add() {
    if (adding === null) return;
    const err = pathProblem(adding, [...paths, ...takenElsewhere]);
    if (err) return setProblem(err);
    const path = adding.trim();
    onChange([...files, { path, content: "" }]);
    setSelected(path);
    setAdding(null);
    setProblem(null);
  }

  function rename() {
    if (!renaming) return;
    const err = renaming.to.trim() === renaming.from ? null : pathProblem(renaming.to, [...paths.filter((p) => p !== renaming.from), ...takenElsewhere]);
    if (err) return setProblem(err);
    const to = renaming.to.trim();
    onChange(files.map((f) => (f.path === renaming.from ? { ...f, path: to } : f)));
    setSelected(to);
    setRenaming(null);
    setProblem(null);
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)]">
      <div className="grid md:grid-cols-[230px_minmax(0,1fr)]">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] md:border-b-0 md:border-r">
          <ul aria-label={label} className="max-h-[360px] overflow-y-auto py-1">
            {sorted.length === 0 ? <li className="px-3 py-2 text-[13px] text-[var(--text-tertiary)]">{emptyText}</li> : null}
            {sorted.map((f) => {
              const tag = tagFor?.(f.path);
              const on = current?.path === f.path;
              return (
                <li key={f.path}>
                  <button
                    type="button"
                    aria-current={on ? "true" : undefined}
                    onClick={() => {
                      setSelected(f.path);
                      setRenaming(null);
                      setConfirmDelete(null);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-app-meta",
                      on ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
                    )}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">{f.path}</span>
                    {tag ? <span className="ml-auto shrink-0 font-sans text-app-meta text-[var(--text-tertiary)]">{tag}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {readOnly ? null : (
            <div className="border-t border-[var(--border-subtle)] p-2">
              {adding === null ? (
                <Button size="sm" variant="quiet" onClick={() => setAdding("")}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add file
                </Button>
              ) : (
                <div className="grid gap-1.5">
                  <label htmlFor={`${base}-new`} className="text-app-meta font-medium text-[var(--text-primary)]">
                    New file path
                  </label>
                  <Input
                    id={`${base}-new`}
                    autoFocus
                    value={adding}
                    placeholder={newFilePlaceholder}
                    className="h-8 font-mono text-app-meta"
                    onChange={(e) => setAdding(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        add();
                      } else if (e.key === "Escape") {
                        setAdding(null);
                        setProblem(null);
                      }
                    }}
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" onClick={add}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="quiet"
                      onClick={() => {
                        setAdding(null);
                        setProblem(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0">
          {current ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-1.5">
                {renaming ? (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    <label htmlFor={`${base}-rename`} className="sr-only">
                      Rename {renaming.from}
                    </label>
                    <Input
                      id={`${base}-rename`}
                      autoFocus
                      value={renaming.to}
                      className="h-8 min-w-[180px] flex-1 font-mono text-app-meta"
                      onChange={(e) => setRenaming({ ...renaming, to: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          rename();
                        } else if (e.key === "Escape") {
                          setRenaming(null);
                          setProblem(null);
                        }
                      }}
                    />
                    <Button size="sm" variant="secondary" onClick={rename}>
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="quiet"
                      onClick={() => {
                        setRenaming(null);
                        setProblem(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <span className="min-w-0 truncate font-mono text-app-meta text-[var(--text-secondary)]">{current.path}</span>
                )}
                {readOnly || renaming ? null : (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="quiet" onClick={() => setRenaming({ from: current.path, to: current.path })}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Rename
                    </Button>
                    {confirmDelete === current.path ? (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            onChange(files.filter((f) => f.path !== current.path));
                            setConfirmDelete(null);
                            setSelected(null);
                          }}
                        >
                          Delete {current.path.split("/").pop()}
                        </Button>
                        <Button size="sm" variant="quiet" onClick={() => setConfirmDelete(null)}>
                          Keep
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="quiet" onClick={() => setConfirmDelete(current.path)}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <CodeEditor
                id={`${base}-editor`}
                label={`Contents of ${current.path}`}
                value={current.content}
                readOnly={readOnly}
                onChange={(content) => onChange(files.map((f) => (f.path === current.path ? { ...f, content } : f)))}
              />
            </>
          ) : (
            <p className="px-4 py-6 text-[14px] text-[var(--text-secondary)]">{emptyText}</p>
          )}
        </div>
      </div>
      {problem ? (
        <p role="alert" className="border-t border-[var(--border-subtle)] px-3 py-2 text-[13px] text-[var(--fydell-risk)]">
          {problem}
        </p>
      ) : null}
    </div>
  );
}

export default FileSetEditor;
