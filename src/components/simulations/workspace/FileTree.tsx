"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FilePlus2, Lock, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { buildTree, type ChangeKind, type TreeNode } from "./lib";

const CHANGE_MARK: Record<ChangeKind, { letter: string; label: string; className: string }> = {
  modified: { letter: "M", label: "modified", className: "text-[var(--sim-attention)]" },
  added: { letter: "A", label: "new file", className: "text-[var(--sim-success)]" },
  removed: { letter: "D", label: "removed", className: "text-[var(--sim-error)]" },
};

const SAFE_PATH = /^[A-Za-z0-9_.\-/]+$/;

export function validNewPath(raw: string, existing: string[]): { ok: true; path: string } | { ok: false; error: string } {
  const path = raw.trim().replace(/\\/g, "/");
  if (!path) return { ok: false, error: "Enter a file path." };
  if (!SAFE_PATH.test(path) || path.startsWith("/") || path.split("/").some((p) => p === "" || p === "." || p === "..")) {
    return { ok: false, error: "Use a relative path with letters, numbers, dots, dashes, underscores and slashes." };
  }
  if (existing.includes(path)) return { ok: false, error: "That file already exists." };
  return { ok: true, path };
}

/** The workspace files as a folder tree, with a filter and change markers. */
export function FileTree({
  paths,
  activePath,
  dirtyPaths,
  changes,
  deletable,
  readOnly,
  onOpen,
  onAdd,
  onDelete,
  lockedPaths,
}: {
  paths: string[];
  activePath: string | null;
  dirtyPaths: Set<string>;
  changes: Map<string, ChangeKind>;
  /** Paths the candidate may delete (files they added). */
  deletable: Set<string>;
  readOnly: boolean;
  /** Files that cannot be edited, marked with a lock. */
  lockedPaths?: Set<string>;
  onOpen: (path: string) => void;
  onAdd: (path: string) => void;
  onDelete: (path: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [pathError, setPathError] = useState<string | null>(null);
  const tree = useMemo(() => buildTree(paths), [paths]);
  const q = query.trim().toLowerCase();
  const matches = q ? paths.filter((p) => p.toLowerCase().includes(q)).sort((a, b) => a.localeCompare(b)) : null;

  const toggle = (path: string) =>
    setClosed((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const submitNew = () => {
    const checked = validNewPath(newPath, paths);
    if (checked.ok === false) {
      setPathError(checked.error);
      return;
    }
    onAdd(checked.path);
    setNewPath("");
    setPathError(null);
    setAdding(false);
  };

  const fileRow = (path: string, label: string, depth: number) => {
    const change = changes.get(path);
    const mark = change ? CHANGE_MARK[change] : null;
    const dirty = dirtyPaths.has(path);
    return (
      <li key={path} className="group relative">
        <button
          type="button"
          onClick={() => onOpen(path)}
          aria-current={path === activePath ? "true" : undefined}
          title={path}
          style={{ paddingLeft: 10 + depth * 12 }}
          className={cn(
            "flex h-7 w-full items-center gap-1.5 pr-2 text-left text-[13px] outline-offset-[-2px]",
            path === activePath ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
          )}
        >
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{label}</span>
          {lockedPaths?.has(path) ? (
            <>
              <Lock aria-hidden size={11} className="shrink-0 text-[var(--text-tertiary)]" />
              <span className="sr-only">, read-only</span>
            </>
          ) : null}
          {dirty ? (
            <>
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-secondary)]" />
              <span className="sr-only">, unsaved changes</span>
            </>
          ) : null}
          {mark ? (
            <span className={cn("w-3 shrink-0 text-center font-mono text-[11px] font-semibold", mark.className)}>
              <span aria-hidden>{mark.letter}</span>
              <span className="sr-only">, {mark.label}</span>
            </span>
          ) : null}
        </button>
        {!readOnly && deletable.has(path) ? (
          <button
            type="button"
            aria-label={`Delete ${path}`}
            onClick={() => onDelete(path)}
            className="absolute right-6 top-1 grid h-5 w-5 place-items-center rounded-[4px] text-[var(--text-tertiary)] opacity-0 hover:bg-[var(--surface-selected)] hover:text-[var(--sim-error)] focus:opacity-100 group-hover:opacity-100"
          >
            <Trash2 aria-hidden size={12} />
          </button>
        ) : null}
      </li>
    );
  };

  const renderNodes = (nodes: TreeNode[], depth: number): React.ReactNode =>
    nodes.map((n) => {
      if (n.kind === "file") return fileRow(n.path, n.name, depth);
      const open = !closed.has(n.path);
      return (
        <li key={`dir:${n.path}`}>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => toggle(n.path)}
            style={{ paddingLeft: 4 + depth * 12 }}
            className="flex h-7 w-full items-center gap-1 pr-2 text-left text-[13px] text-[var(--text-secondary)] outline-offset-[-2px] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            {open ? <ChevronDown aria-hidden size={13} className="shrink-0" /> : <ChevronRight aria-hidden size={13} className="shrink-0" />}
            <span className="truncate font-mono text-[12.5px]">{n.name}</span>
          </button>
          {open ? <ul>{renderNodes(n.children, depth + 1)}</ul> : null}
        </li>
      );
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 px-2 pb-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Filter files</span>
          <Search aria-hidden size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter files"
            className="h-7 w-full rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-7 pr-2 text-[12.5px] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)]"
          />
        </label>
        {!readOnly ? (
          <button
            type="button"
            aria-label="New file"
            aria-expanded={adding}
            onClick={() => {
              setAdding((a) => !a);
              setPathError(null);
            }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <FilePlus2 aria-hidden size={14} />
          </button>
        ) : null}
      </div>
      {adding ? (
        <div className="grid shrink-0 gap-1 px-2 pb-2">
          <label htmlFor="sim-new-file" className="text-[12px] text-[var(--text-secondary)]">
            New file path
          </label>
          <input
            id="sim-new-file"
            autoFocus
            value={newPath}
            onChange={(e) => {
              setNewPath(e.target.value);
              setPathError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitNew();
              } else if (e.key === "Escape") {
                setAdding(false);
              }
            }}
            placeholder="src/helpers.py"
            aria-invalid={pathError ? true : undefined}
            aria-describedby={pathError ? "sim-new-file-error" : undefined}
            className="h-7 rounded-[6px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-2 font-mono text-[12px] text-[var(--text-primary)]"
          />
          {pathError ? (
            <p id="sim-new-file-error" className="text-[12px] text-[var(--sim-error)]">
              {pathError}
            </p>
          ) : (
            <p className="text-[11.5px] text-[var(--text-tertiary)]">Press Enter to add, Escape to cancel.</p>
          )}
        </div>
      ) : null}
      <div className="sim-scroll min-h-0 flex-1 overflow-y-auto pb-2">
        {matches ? (
          matches.length ? (
            <ul aria-label="Matching files">{matches.map((p) => fileRow(p, p, 0))}</ul>
          ) : (
            <p className="px-3 py-2 text-[12.5px] text-[var(--text-tertiary)]">No files match.</p>
          )
        ) : (
          <ul aria-label="Files">{renderNodes(tree, 0)}</ul>
        )}
      </div>
    </div>
  );
}
