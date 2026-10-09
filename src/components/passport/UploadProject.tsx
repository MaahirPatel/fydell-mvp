"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SKIP_REASON_LABEL } from "@/lib/passport/record-states";
import { zipFolder, type FolderSkipReason } from "@/lib/passport/folder-zip";

const FOLDER_SKIP_LABEL: Record<FolderSkipReason, string> = {
  dependency_or_build: "in dependency or build folders",
  possible_secret: "that may hold credentials",
  not_source: "that aren't source code or are too large",
  over_limit: "beyond the 300 files Fydell reads",
};

type Preview = {
  name: string;
  contentHash: string;
  totalFiles: number;
  selectedFiles: { path: string; size: number }[];
  selectedCount: number;
  skipReasons: Record<string, number>;
  skippedSample: { path: string; reason: string }[];
};

const inputClass =
  "w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-app-body text-[var(--text-primary)] focus:border-[var(--text-tertiary)] focus:outline-none";

function formatBytes(n: number): string {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
}

/**
 * Adds a project from a ZIP for engineers whose work is not in a public
 * GitHub repository. The engineer reviews exactly which files will be read
 * before anything is saved.
 */
export default function UploadProject({ onSaved }: { onSaved?: (projectId: string, name: string) => void } = {}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [source, setSource] = useState<"folder" | "zip">("folder");
  const [folderNote, setFolderNote] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  function chooseFile(next: File | null) {
    setFile(next);
    setPreview(null);
    setError(null);
    setFolderNote(null);
    if (next && !name) setName(next.name.replace(/\.zip$/i, ""));
  }

  async function chooseFolder(list: FileList | null) {
    setFile(null);
    setPreview(null);
    setError(null);
    setFolderNote(null);
    if (!list || list.length === 0) return;
    setZipping(true);
    try {
      const packed = await zipFolder(Array.from(list));
      if (packed.ok === false) {
        setError(packed.error);
        return;
      }
      setFile(packed.file);
      if (!name) setName(packed.name.slice(0, 80));
      const left = Object.entries(packed.skipped)
        .filter(([, n]) => n > 0)
        .map(([reason, n]) => `${n} ${FOLDER_SKIP_LABEL[reason as FolderSkipReason]}`);
      setFolderNote(`${packed.included} files packed from “${packed.name}”.${left.length ? ` Not uploaded: ${left.join(", ")}.` : ""}`);
    } catch {
      setError("That folder could not be read. Try again, or upload a ZIP instead.");
    } finally {
      setZipping(false);
    }
  }

  function switchSource(next: "folder" | "zip") {
    if (next === source) return;
    setSource(next);
    setFile(null);
    setPreview(null);
    setError(null);
    setFolderNote(null);
    setFileInputKey((k) => k + 1);
  }

  async function send(intent: "preview" | "save") {
    if (!file || busy) return;
    setBusy(intent);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("name", name);
      form.set("intent", intent);
      if (intent === "save" && preview) form.set("contentHash", preview.contentHash);
      const res = await fetch("/api/passport/uploads", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { preview?: Preview; projectId?: string; error?: string; path?: string; code?: string };
      if (!res.ok) {
        if (data.code === "preview_mismatch") setPreview(null);
        setError(`${data.error ?? "The upload could not be processed."}${data.path ? ` (${data.path})` : ""}`);
        return;
      }
      if (intent === "preview" && data.preview) setPreview(data.preview);
      if (intent === "save" && data.projectId) {
        if (onSaved) {
          onSaved(data.projectId, preview?.name ?? name);
          setFile(null);
          setFileInputKey((k) => k + 1);
          setName("");
          setPreview(null);
          router.refresh();
        } else {
          router.push(`/app/candidate/projects/${data.projectId}`);
        }
      }
    } catch {
      setError("Fydell could not be reached. Your file is still selected; try again.");
    } finally {
      setBusy(null);
    }
  }

  const skipped = preview ? Object.entries(preview.skipReasons).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="space-y-4">
      <p className="max-w-[64ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">
        For work that isn&apos;t in a public GitHub repository, such as a project you open in VS Code or Cursor. Choose
        the project folder, or a ZIP of it, up to 5&nbsp;MB once packed. Credential files, dependency folders and build
        output are left out unread. Fydell keeps the file list and the cited lines of each finding, not the files.
      </p>

      <div role="radiogroup" aria-label="Upload from" className="inline-flex rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] p-0.5">
        {(["folder", "zip"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={source === key}
            onClick={() => switchSource(key)}
            className={`h-8 rounded-[6px] px-3 text-app-meta font-medium transition-colors ${
              source === key ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {key === "folder" ? "Project folder" : "ZIP file"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {source === "folder" ? (
          <label className="block">
            <span className="mb-1 block text-app-meta font-medium text-[var(--text-secondary)]">Project folder</span>
            <input
              key={fileInputKey}
              type="file"
              multiple
              ref={(el) => {
                el?.setAttribute("webkitdirectory", "");
                el?.setAttribute("directory", "");
              }}
              onChange={(e) => void chooseFolder(e.target.files)}
              disabled={zipping}
              className={inputClass}
            />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-app-meta font-medium text-[var(--text-secondary)]">Project archive (.zip)</span>
            <input
              key={fileInputKey}
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              className={inputClass}
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-app-meta font-medium text-[var(--text-secondary)]">Project name</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setPreview(null);
            }}
            maxLength={80}
            className={inputClass}
            placeholder="payments-service"
          />
        </label>
      </div>

      {zipping ? <p className="text-app-meta text-[var(--text-secondary)]">Packing the folder…</p> : null}
      {folderNote && !zipping ? <p className="text-app-meta text-[var(--text-secondary)]">{folderNote}</p> : null}

      {!preview ? (
        <Button variant="secondary" size="md" onClick={() => send("preview")} disabled={!file || zipping || name.trim().length < 2} loading={busy === "preview"}>
          {busy === "preview" ? "Reading files…" : "Review files"}
        </Button>
      ) : null}

      {error ? (
        <p role="alert" className="text-app-meta text-[var(--status-attention-ink)]">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
          <p className="text-app-body font-medium text-[var(--text-primary)]">
            {preview.selectedCount} of {preview.totalFiles} files will be read
          </p>
          <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]">
            Saved as <span className="font-mono">upload/{preview.name}</span> · revision {preview.contentHash.slice(0, 7)} · private until you share it
          </p>

          {skipped.length ? (
            <div className="mt-3">
              <p className="text-app-meta font-medium text-[var(--text-secondary)]">Left out</p>
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-app-meta text-[var(--text-secondary)]">
                {skipped.map(([reason, count]) => (
                  <li key={reason}>
                    {SKIP_REASON_LABEL[reason] ?? reason}: {count}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <details className="mt-3">
            <summary className="cursor-pointer text-app-meta font-medium text-[var(--text-secondary)]">Files to be read</summary>
            <ul className="mt-2 max-h-56 space-y-0.5 overflow-auto text-app-meta">
              {preview.selectedFiles.map((f) => (
                <li key={f.path} className="flex justify-between gap-4 font-mono text-[var(--text-secondary)]">
                  <span className="truncate">{f.path}</span>
                  <span className="shrink-0 text-[var(--text-tertiary)]">{formatBytes(f.size)}</span>
                </li>
              ))}
              {preview.selectedCount > preview.selectedFiles.length ? (
                <li className="text-[var(--text-tertiary)]">…and {preview.selectedCount - preview.selectedFiles.length} more</li>
              ) : null}
            </ul>
          </details>

          <p className="mt-4 text-app-meta leading-[1.55] text-[var(--text-tertiary)]">
            The report will say this code was uploaded by you. Fydell can&apos;t check where it came from or who wrote it, so
            add your part in the project on the report once it&apos;s saved.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" size="md" onClick={() => send("save")} loading={busy === "save"} disabled={busy !== null || preview.selectedCount === 0}>
              {busy === "save" ? "Analyzing…" : "Analyze and save"}
            </Button>
            <Button variant="quiet" size="md" onClick={() => setPreview(null)} disabled={busy !== null}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
