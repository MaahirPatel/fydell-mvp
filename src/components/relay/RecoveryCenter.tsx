"use client";

import { useState } from "react";

export default function RecoveryCenter({
  open,
  onClose,
  onRestoreSnapshot,
  onReinitWorker,
  onReportIssue,
  runtimeCrashed,
  storageError,
}: {
  open: boolean;
  onClose: () => void;
  onRestoreSnapshot: () => void;
  onReinitWorker: () => Promise<void> | void;
  onReportIssue: (description: string) => Promise<void> | void;
  runtimeCrashed: boolean;
  storageError: boolean;
}) {
  const [issueText, setIssueText] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reinitializing, setReinitializing] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  if (!open) return null;

  function handleRestore() {
    onRestoreSnapshot();
    setConfirmation("Restored files, notes, and handoff from your local snapshot.");
  }

  async function handleReinit() {
    setReinitializing(true);
    setConfirmation(null);
    try {
      await onReinitWorker();
      setConfirmation("Python worker reinitialized.");
    } finally {
      setReinitializing(false);
    }
  }

  async function handleReport() {
    if (!issueText.trim()) return;
    setReporting(true);
    setConfirmation(null);
    try {
      await onReportIssue(issueText.trim());
      setIssueText("");
      setConfirmation("Reported — this is recorded on your session for review.");
    } finally {
      setReporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[420px] flex-col overflow-y-auto border-l border-white/10 bg-[#0A0C11] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-medium text-white">Recovery Center</h2>
          <button type="button" onClick={onClose} className="text-[13px] text-white/45 hover:text-white/80">
            Close
          </button>
        </div>

        {(runtimeCrashed || storageError) && (
          <div className="mt-3 rounded-[10px] border border-[#F26B82]/35 bg-[#F26B82]/[0.08] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#fda4b0]">
            {runtimeCrashed && <p>The Python runtime crashed. Try reinitializing it below.</p>}
            {storageError && <p>Local autosave storage is unavailable — sync to the server may be affected.</p>}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <section className="rounded-[10px] border border-white/10 bg-black/20 p-3.5">
            <p className="text-[13px] font-medium text-white/85">Restore from local snapshot</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/45">
              Reloads your files, deployment notes, and handoff draft from the last snapshot saved in this
              browser — use this if the workspace looks out of sync with what you last edited.
            </p>
            <button
              type="button"
              onClick={handleRestore}
              className="mt-2.5 inline-flex h-8 items-center rounded-[7px] border border-white/15 px-3 text-[12px] text-white/75 hover:bg-white/[0.05]"
            >
              Restore snapshot
            </button>
          </section>

          <section className="rounded-[10px] border border-white/10 bg-black/20 p-3.5">
            <p className="text-[13px] font-medium text-white/85">Reinitialize Python worker</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/45">
              Tears down and reboots the in-browser Python runtime with your current files — use this if
              commands stop responding.
            </p>
            <button
              type="button"
              disabled={reinitializing}
              onClick={handleReinit}
              className="mt-2.5 inline-flex h-8 items-center rounded-[7px] border border-white/15 px-3 text-[12px] text-white/75 hover:bg-white/[0.05] disabled:opacity-50"
            >
              {reinitializing ? "Reinitializing…" : "Reinitialize worker"}
            </button>
          </section>

          <section className="rounded-[10px] border border-white/10 bg-black/20 p-3.5">
            <p className="text-[13px] font-medium text-white/85">Report a technical issue</p>
            <p className="mt-1 text-[12px] leading-relaxed text-white/45">
              Recorded on your session so a reviewer can account for it — this does not pause your timer.
            </p>
            <textarea
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              rows={3}
              placeholder="What happened?"
              className="mt-2 w-full resize-none rounded-[7px] border border-white/10 bg-black/30 px-2.5 py-2 text-[12px] text-white/80 placeholder:text-white/25"
            />
            <button
              type="button"
              disabled={reporting || !issueText.trim()}
              onClick={handleReport}
              className="mt-2.5 inline-flex h-8 items-center rounded-[7px] border border-white/15 px-3 text-[12px] text-white/75 hover:bg-white/[0.05] disabled:opacity-50"
            >
              {reporting ? "Reporting…" : "Report issue"}
            </button>
          </section>
        </div>

        {confirmation && <p className="mt-4 text-[12px] text-[#8EE4B8]">{confirmation}</p>}
      </div>
    </div>
  );
}
