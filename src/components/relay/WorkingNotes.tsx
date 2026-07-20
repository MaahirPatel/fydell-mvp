"use client";

import { useState } from "react";

export type ChecklistItem = { id: string; label: string; done: boolean };

export type WorkingNotesState = {
  knowledge: string;
  unknowns: string;
  risks: string;
  checklist: ChecklistItem[];
};

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "tests", label: "Ran test and it reflects the current code", done: false },
  { id: "evals", label: "Ran evals and reviewed the metrics", done: false },
  { id: "policy", label: "Checked sensitive actions against the approval policy", done: false },
  { id: "notes", label: "Working notes are current", done: false },
  { id: "handoff", label: "Handoff drafted with an honest limitations section", done: false },
];

const FIELDS: { key: keyof Pick<WorkingNotesState, "knowledge" | "unknowns" | "risks">; label: string; placeholder: string }[] = [
  { key: "knowledge", label: "What I know", placeholder: "Facts you've confirmed — from the brief, the code, or the client." },
  { key: "unknowns", label: "What I still don't know", placeholder: "Open questions you haven't resolved yet." },
  { key: "risks", label: "Open risks", placeholder: "What could bite this after handoff, and how bad would it be?" },
];

export default function WorkingNotes({
  notes,
  onChange,
  onToggleChecklistItem,
}: {
  notes: WorkingNotesState;
  onChange: (key: "knowledge" | "unknowns" | "risks", value: string) => void;
  onToggleChecklistItem: (id: string) => void;
}) {
  const [checklistOpen, setChecklistOpen] = useState(true);
  const checklist = notes.checklist.length > 0 ? notes.checklist : DEFAULT_CHECKLIST;
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/[0.06] px-3 py-2.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Working notes</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/35">
          Yours to maintain — autosaved with the rest of your workspace, read as evidence of judgment, not graded
          on length.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">{field.label}</span>
            <textarea
              value={notes[field.key]}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className="mt-1.5 w-full resize-none rounded-[8px] border border-white/10 bg-black/30 px-3 py-2.5 text-[12.5px] leading-relaxed text-white/80 placeholder:text-white/25"
            />
          </label>
        ))}

        <div className="rounded-[10px] border border-white/[0.08] bg-[#0A0C11]/80">
          <button
            type="button"
            onClick={() => setChecklistOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">
              Ship checklist ({doneCount}/{checklist.length})
            </span>
            <span className="text-[11px] text-white/35">{checklistOpen ? "Hide" : "Show"}</span>
          </button>
          {checklistOpen && (
            <ul className="space-y-1.5 px-3 pb-3">
              {checklist.map((item) => (
                <li key={item.id}>
                  <label className="flex items-start gap-2.5 text-[12px] leading-relaxed text-white/70">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => onToggleChecklistItem(item.id)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#3B5BFF]"
                    />
                    <span className={item.done ? "text-white/40 line-through" : ""}>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
