"use client";

import { useRef, useState } from "react";
import { Download, FolderSync } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AuthoredFile } from "@/lib/eng/authored/types";
import { Dialog } from "./Dialog";
import { downloadBytes, formatClock, slugify, zipProject, type WorkspaceFile } from "./lib";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".tox",
  "dist",
  "build",
  ".idea",
  ".vscode",
  ".cursor",
  ".next",
  "coverage",
]);

const TEXT_EXT = new Set(["py", "pyi", "js", "mjs", "cjs", "jsx", "ts", "tsx", "json", "md", "txt", "toml", "cfg", "ini", "yaml", "yml", "html", "css", "sh", "sql", "csv", "xml"]);

const MAX_NEW_FILE_BYTES = 200_000;

export interface FolderRead {
  files: AuthoredFile[];
  skipped: number;
}

function stripRoot(path: string, depth: number): string {
  return path.split("/").slice(depth).join("/");
}

/**
 * Reads a chosen project folder in the browser. Files already in the
 * workspace are always read; new files only when they look like source text.
 * Dependency, cache and editor folders are skipped.
 */
export async function readFolder(list: FileList, workspacePaths: string[]): Promise<FolderRead> {
  const entries = [...list].map((file) => ({ file, rel: (file.webkitRelativePath || file.name).replace(/\\/g, "/") }));
  const known = new Set(workspacePaths);
  let depth = 1;
  let best = -1;
  for (const d of [1, 2, 0]) {
    const hits = entries.filter((e) => known.has(stripRoot(e.rel, d))).length;
    if (hits > best) {
      best = hits;
      depth = d;
    }
  }
  const files: AuthoredFile[] = [];
  let skipped = 0;
  for (const { file, rel } of entries) {
    const path = stripRoot(rel, depth);
    const parts = path.split("/");
    if (!path || parts.some((p) => IGNORED_DIRS.has(p))) {
      skipped++;
      continue;
    }
    const exists = known.has(path);
    const ext = path.includes(".") ? path.split(".").pop()?.toLowerCase() ?? "" : "";
    const hidden = parts.some((p) => p.startsWith("."));
    if (!exists && (hidden || !TEXT_EXT.has(ext) || file.size > MAX_NEW_FILE_BYTES)) {
      skipped++;
      continue;
    }
    const content = await file.text();
    if (content.includes("\u0000")) {
      skipped++;
      continue;
    }
    files.push({ path, content });
  }
  return { files, skipped };
}

export interface SyncPlan {
  changed: AuthoredFile[];
  added: AuthoredFile[];
  missing: string[];
  skipped: number;
}

export function planSync(read: FolderRead, current: WorkspaceFile[], protectedPaths: Set<string>): SyncPlan {
  const now = new Map(current.map((f) => [f.path, f]));
  const incoming = new Set(read.files.map((f) => f.path));
  const changed: AuthoredFile[] = [];
  const added: AuthoredFile[] = [];
  for (const f of read.files) {
    const existing = now.get(f.path);
    if (!existing) added.push(f);
    else if (existing.content !== f.content && existing.editable !== false) changed.push(f);
  }
  const missing = current.filter((f) => !incoming.has(f.path) && !protectedPaths.has(f.path) && f.editable !== false).map((f) => f.path);
  return { changed, added, missing, skipped: read.skipped };
}

export function downloadWorkspaceZip(files: AuthoredFile[], title: string) {
  const folder = slugify(title);
  downloadBytes(zipProject(files, folder), `${folder}.zip`, "application/zip");
}

/** Explains working locally and turns local-editing mode on. */
export function LocalEditingDialog({
  title,
  files,
  starterHref,
  testCommand,
  setupCommands,
  localMode,
  onStart,
  onClose,
}: {
  title: string;
  files: AuthoredFile[];
  starterHref: string;
  testCommand: string;
  setupCommands: string[];
  localMode: boolean;
  onStart: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      title="Open in VS Code / Cursor"
      description="Work in your own editor, then sync your project folder back. The Fydell workspace stays the copy that is reviewed and submitted."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {localMode ? "Close" : "Stay in the browser"}
          </Button>
          {!localMode ? (
            <Button variant="primary" onClick={onStart}>
              Start local editing
            </Button>
          ) : null}
        </>
      }
    >
      <ol className="grid list-decimal gap-4 pl-5 text-[14px] leading-[1.6] text-[var(--text-body)]">
        <li>
          <p>Download your current files and unzip them. This includes edits you have not saved yet.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => downloadWorkspaceZip(files, title)}>
              <Download aria-hidden size={14} />
              Download current files (ZIP)
            </Button>
            <a
              href={starterHref}
              className="inline-flex h-8 items-center rounded-[8px] px-3 text-[13px] text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline"
            >
              Or the original starter (ZIP)
            </a>
          </div>
        </li>
        <li>
          <p>Open the folder in VS Code or Cursor and work as usual. Run the tests in your own terminal:</p>
          <pre className="sim-scroll mt-2 overflow-x-auto rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 py-2 font-mono text-app-meta text-[var(--text-body)]">
            {[...setupCommands, testCommand].join("\n")}
          </pre>
        </li>
        <li>
          <p>
            While local editing is on, the browser editor is read-only so the two copies cannot drift apart. When you want Fydell to have your work, choose Sync folder and pick
            the project folder. You will see exactly which files change before anything is saved.
          </p>
        </li>
      </ol>
      <p className="mt-4 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
        The timer keeps running while you work locally. Only files synced here are submitted, and public test runs here use your synced files.
      </p>
    </Dialog>
  );
}

function PathList({ title, paths, tone }: { title: string; paths: string[]; tone: "added" | "changed" | "removed" }) {
  if (!paths.length) return null;
  const color = tone === "added" ? "text-[var(--sim-success)]" : tone === "removed" ? "text-[var(--sim-error)]" : "text-[var(--sim-attention)]";
  return (
    <div className="grid gap-1.5">
      <h3 className="text-[13.5px] font-medium text-[var(--text-primary)]">
        {title} <span className="font-normal text-[var(--text-tertiary)]">({paths.length})</span>
      </h3>
      <ul className="grid gap-0.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 py-2">
        {paths.map((p) => (
          <li key={p} className={`truncate font-mono text-app-meta ${color}`}>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shows what a folder sync would change and saves it on confirmation. */
export function SyncPreviewDialog({
  plan,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  plan: SyncPlan;
  busy: boolean;
  error: string | null;
  onConfirm: (removeMissing: boolean) => void;
  onClose: () => void;
}) {
  const [removeMissing, setRemoveMissing] = useState(false);
  const nothing = !plan.changed.length && !plan.added.length && (!removeMissing || !plan.missing.length);
  return (
    <Dialog
      title="Sync preview"
      description="These changes will be saved to your Fydell workspace."
      onClose={onClose}
      dismissable={!busy}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onConfirm(removeMissing)} loading={busy} disabled={nothing}>
            Save to workspace
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {nothing && !plan.missing.length ? <p className="text-[14px] text-[var(--text-secondary)]">Your folder matches the workspace. Nothing to sync.</p> : null}
        <PathList title="Changed" paths={plan.changed.map((f) => f.path)} tone="changed" />
        <PathList title="New files" paths={plan.added.map((f) => f.path)} tone="added" />
        {plan.missing.length ? (
          <div className="grid gap-2">
            <PathList title="In the workspace but not in the folder" paths={plan.missing} tone="removed" />
            <label className="flex items-center gap-2 text-[13.5px] text-[var(--text-body)]">
              <input type="checkbox" checked={removeMissing} onChange={(e) => setRemoveMissing(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--accent)]" />
              Remove these files from the workspace
            </label>
          </div>
        ) : null}
        {plan.skipped ? (
          <p className="text-app-meta text-[var(--text-tertiary)]">
            {plan.skipped} {plan.skipped === 1 ? "file was" : "files were"} skipped: dependency or cache folders, hidden files, binary files, or new files that are not source
            text.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-[6px] bg-[var(--sim-error-bg)] px-3 py-2 text-[13px] text-[var(--sim-error)]">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

export type SyncStatus = { kind: "idle" } | { kind: "reading" } | { kind: "synced"; at: string; count: number } | { kind: "failed"; message: string };

/** The strip above the editor while local editing is on. */
export function LocalEditingBar({
  status,
  onPickFolder,
  onDownload,
  onStop,
}: {
  status: SyncStatus;
  onPickFolder: (files: FileList) => void;
  onDownload: () => void;
  onStop: () => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[var(--border-default)] bg-[var(--surface-band)] px-3 py-2">
      <p className="min-w-0 flex-1 text-[13px] text-[var(--text-body)]">
        <span className="font-medium text-[var(--text-primary)]">Local editing is on.</span> The browser editor is read-only.{" "}
        <span aria-live="polite" className="text-[var(--text-secondary)]">
          {status.kind === "reading"
            ? "Reading your folder."
            : status.kind === "synced"
              ? `Last synced at ${formatClock(status.at)}, ${status.count} ${status.count === 1 ? "file" : "files"} updated.`
              : status.kind === "failed"
                ? status.message
                : "Not synced yet."}
        </span>
      </p>
      <input
        ref={(el) => {
          input.current = el;
          if (el) {
            el.setAttribute("webkitdirectory", "");
            el.setAttribute("directory", "");
          }
        }}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files?.length) onPickFolder(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="primary" onClick={() => input.current?.click()} loading={status.kind === "reading"} className="h-7">
          <FolderSync aria-hidden size={14} />
          Sync folder
        </Button>
        <Button size="sm" variant="quiet" onClick={onDownload} className="h-7">
          Download files
        </Button>
        <Button size="sm" variant="quiet" onClick={onStop} className="h-7">
          Stop local editing
        </Button>
      </div>
    </div>
  );
}
