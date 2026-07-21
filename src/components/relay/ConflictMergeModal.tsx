"use client";

import { useState } from "react";

export default function ConflictMergeModal({
  open,
  path,
  base,
  local,
  remote,
  onResolve,
  onCancel,
}: {
  open: boolean;
  path: string;
  base: string;
  local: string;
  remote: string;
  onResolve: (content: string) => void;
  onCancel: () => void;
}) {
  const [choice, setChoice] = useState<"local" | "remote" | "manual">("local");
  const [manual, setManual] = useState(local);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        className="max-h-[88vh] w-full max-w-[720px] overflow-y-auto rounded-[12px] border border-white/[0.12] bg-[#10141D] p-5"
        role="dialog"
        aria-labelledby="merge-title"
      >
        <h2 id="merge-title" className="text-[17px] font-medium text-[#F4F5F7]">
          Version conflict — {path}
        </h2>
        <p className="mt-2 text-[13px] text-[#9AA3B2]">
          Your edit and a newer server version overlap. Choose local, remote, or edit a merged
          result. Unsafe automatic overwrite is blocked.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-[#687182]">Your version</p>
            <pre className="mt-1 max-h-40 overflow-auto rounded-[8px] border border-white/10 bg-[#0B0E14] p-2 text-[11px] text-[#9AA3B2]">
              {local.slice(0, 4000)}
            </pre>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-[#687182]">Server version</p>
            <pre className="mt-1 max-h-40 overflow-auto rounded-[8px] border border-white/10 bg-[#0B0E14] p-2 text-[11px] text-[#9AA3B2]">
              {remote.slice(0, 4000)}
            </pre>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["local", "Keep mine"],
              ["remote", "Keep server"],
              ["manual", "Edit merge"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setChoice(id);
                if (id === "manual") setManual(`${local}\n\n# -- merge with --\n\n${remote}`);
              }}
              className={`rounded-[7px] px-3 py-1.5 text-[12px] ${
                choice === id ? "bg-[#6470FF] text-white" : "border border-white/12 text-[#9AA3B2]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {choice === "manual" && (
          <textarea
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            rows={10}
            className="mt-3 w-full rounded-[8px] border border-white/10 bg-[#0B0E14] p-3 text-[12px] text-white/85"
          />
        )}

        <details className="mt-3 text-[11px] text-[#687182]">
          <summary>Base version</summary>
          <pre className="mt-1 max-h-24 overflow-auto">{base.slice(0, 2000)}</pre>
        </details>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-[8px] border border-white/15 px-3 text-[12px] text-[#9AA3B2]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const content =
                choice === "local" ? local : choice === "remote" ? remote : manual;
              onResolve(content);
            }}
            className="h-9 rounded-[8px] bg-[#F1F2F4] px-4 text-[12px] font-semibold text-[#08090C]"
          >
            Apply resolution
          </button>
        </div>
      </div>
    </div>
  );
}
