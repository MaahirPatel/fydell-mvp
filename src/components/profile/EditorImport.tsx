"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROVENANCE_LABELS, type EditorEvidenceImport } from "@/lib/profile/types";
import { ProvenanceBadge } from "./EvidenceTimeline";

const inputClass =
  "w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-[14px] text-[var(--text-primary)] focus:border-[var(--text-tertiary)] focus:outline-none";

const WHERE_TO_FIND: Record<"vscode" | "cursor", { mac: string; linux: string; windows: string }> = {
  vscode: {
    mac: "Library/Application Support/Code/User/globalStorage/state.vscdb",
    linux: ".config/Code/User/globalStorage/state.vscdb",
    windows: "AppData\\Roaming\\Code\\User\\globalStorage\\state.vscdb",
  },
  cursor: {
    mac: "Library/Application Support/Cursor/User/globalStorage/state.vscdb",
    linux: ".config/Cursor/User/globalStorage/state.vscdb",
    windows: "AppData\\Roaming\\Cursor\\User\\globalStorage\\state.vscdb",
  },
};

/**
 * Editor-history import prototype UI.
 *
 * Explicit consent is required before every upload. The component states
 * plainly that imported data is self-supplied and NOT independently observed
 * by Fydell — the provenance badge on the result says the same.
 */
export default function EditorImport({ onImported }: { onImported?: () => void }) {
  const router = useRouter();
  const [source, setSource] = useState<"vscode" | "cursor">("vscode");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EditorEvidenceImport | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !consent || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setWarnings([]);
    try {
      const form = new FormData();
      form.set("source", source);
      form.set("consent", "yes");
      form.set("file", file);
      const res = await fetch("/api/profile/editor-import", { method: "POST", body: form });
      const data = (await res.json()) as { import?: EditorEvidenceImport; warnings?: string[]; error?: string };
      if (!res.ok || !data.import) {
        setError(data.error ?? "The import could not be completed.");
        return;
      }
      setResult(data.import);
      setWarnings(data.warnings ?? []);
      // Register the editor as a connected account (best-effort).
      try {
        await fetch("/api/profile/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: source,
            label: "Local history",
            meta: { importId: data.import.id, importedAt: data.import.importedAt },
          }),
        });
      } catch {
        // Account registration is cosmetic; the import itself succeeded.
      }
      onImported?.();
      router.refresh();
    } catch {
      setError("Fydell could not be reached. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const paths = WHERE_TO_FIND[source];

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
        <p className="text-[13.5px] font-medium text-[var(--text-primary)]">What this is</p>
        <p className="mt-1 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
          Upload a history file from your own editor and Fydell extracts a work summary — files touched, languages,
          active days. Only the summary is stored; the uploaded file is discarded after parsing.{" "}
          <strong className="font-medium text-[var(--text-primary)]">
            This data is self-supplied: it is labeled as such everywhere and never treated as observed work.
          </strong>
        </p>
        <div className="mt-3 grid gap-2 text-[12.5px] leading-[1.55] text-[var(--text-tertiary)] sm:grid-cols-3">
          <p><span className="font-medium text-[var(--text-secondary)]">macOS</span><br />~/{paths.mac}</p>
          <p><span className="font-medium text-[var(--text-secondary)]">Linux</span><br />~/{paths.linux}</p>
          <p><span className="font-medium text-[var(--text-secondary)]">Windows</span><br />%APPDATA%/{paths.windows}</p>
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.55] text-[var(--text-tertiary)]">
          Accepts <code className="rounded bg-[var(--surface-selected)] px-1">state.vscdb</code> (SQLite workspace state),{" "}
          <code className="rounded bg-[var(--surface-selected)] px-1">storage.json</code>, or a VS Code Local History{" "}
          <code className="rounded bg-[var(--surface-selected)] px-1">entries.json</code>. Max 10&nbsp;MB.
          Close the editor before copying <code className="rounded bg-[var(--surface-selected)] px-1">state.vscdb</code>.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["vscode", "cursor"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              aria-pressed={source === s}
              className={`rounded-[8px] border px-3 py-1.5 text-[13.5px] font-medium ${
                source === s
                  ? "border-[var(--text-primary)] bg-[var(--surface-selected)] text-[var(--text-primary)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {s === "vscode" ? "VS Code" : "Cursor"}
            </button>
          ))}
        </div>
        <input
          type="file"
          accept=".vscdb,.json,application/json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={inputClass}
          aria-label="Editor history file"
        />
        <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 accent-[var(--text-primary)]"
          />
          <span>
            I confirm this history file comes from my own editor, and I want Fydell to extract a work summary from it.
            I understand it will be labeled as self-supplied, not independently observed.
          </span>
        </label>
        {error ? <p className="text-[13px] text-[var(--status-attention-ink)]">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !file || !consent}
          className="rounded-[8px] bg-[var(--text-primary)] px-4 py-2 text-[13.5px] font-medium text-[var(--surface-canvas)] disabled:opacity-50"
        >
          {busy ? "Parsing…" : "Import history"}
        </button>
      </form>

      {result ? (
        <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-medium text-[var(--text-primary)]">Import complete</p>
            <ProvenanceBadge provenance="local-import" />
          </div>
          <p className="mt-1 text-[12.5px] text-[var(--text-tertiary)]">{PROVENANCE_LABELS["local-import"].detail}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
            <div>
              <dt className="text-[var(--text-tertiary)]">Files touched</dt>
              <dd className="mt-0.5 font-medium text-[var(--text-primary)]">{result.filesTouched.length}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Active days</dt>
              <dd className="mt-0.5 font-medium text-[var(--text-primary)]">{result.sessionCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Languages</dt>
              <dd className="mt-0.5 font-medium text-[var(--text-primary)]">{result.languages.join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--text-tertiary)]">Range</dt>
              <dd className="mt-0.5 font-medium text-[var(--text-primary)]">
                {result.timeRangeStart ? result.timeRangeStart.slice(0, 10) : "—"}
                {result.timeRangeEnd ? ` → ${result.timeRangeEnd.slice(0, 10)}` : ""}
              </dd>
            </div>
          </dl>
          <details className="mt-3">
            <summary className="cursor-pointer text-[13px] font-medium text-[var(--text-secondary)]">
              How this was parsed ({result.filesTouched.length} files)
            </summary>
            <p className="mt-2 text-[12.5px] leading-[1.6] text-[var(--text-tertiary)]">{result.parseMethod}</p>
            {warnings.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12.5px] leading-[1.6] text-[var(--text-tertiary)]">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
            {result.filesTouched.length ? (
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-[12.5px] text-[var(--text-secondary)]">
                {result.filesTouched.slice(0, 100).map((f) => (
                  <li key={f.path} className="truncate font-mono">
                    {f.path}
                    {f.language ? <span className="text-[var(--text-tertiary)]"> · {f.language}</span> : null}
                    {typeof f.edits === "number" ? <span className="text-[var(--text-tertiary)]"> · {f.edits} edits</span> : null}
                  </li>
                ))}
                {result.filesTouched.length > 100 ? (
                  <li className="text-[var(--text-tertiary)]">…and {result.filesTouched.length - 100} more</li>
                ) : null}
              </ul>
            ) : null}
          </details>
        </div>
      ) : null}
    </div>
  );
}
