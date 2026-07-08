"use client";

import { useRef, useState } from "react";
import { RUBRIC_FIELDS, type Score } from "@/lib/types";

type BoolKey = (typeof RUBRIC_FIELDS)[number]["key"];

interface Props {
  candidateId: string;
  initial: Score | null;
}

export default function ScoringPanel({ candidateId, initial }: Props) {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    for (const f of RUBRIC_FIELDS) o[f.key] = Boolean(initial?.[f.key]);
    return o;
  });
  const [notes, setNotes] = useState(initial?.admin_notes ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const notesTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function save(next: Record<string, boolean>, nextNotes: string) {
    setSaveState("saving");
    try {
      await fetch(`/api/admin/candidates/${candidateId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...next, admin_notes: nextNotes })
      });
      setSaveState("saved");
    } catch {
      setSaveState("idle");
    }
  }

  function toggle(key: BoolKey) {
    const next = { ...checks, [key]: !checks[key] };
    setChecks(next);
    save(next, notes);
  }

  function onNotes(value: string) {
    setNotes(value);
    setSaveState("saving");
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => save(checks, value), 700);
  }

  const checkedCount = Object.values(checks).filter(Boolean).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg">Scoring Rubric</h2>
        <span className="text-sm font-semibold text-ink-2">
          {checkedCount}/{RUBRIC_FIELDS.length} |{" "}
          <span
            className={
              saveState === "saved"
                ? "text-teal-600"
                : saveState === "saving"
                  ? "text-muted"
                  : "text-muted"
            }
          >
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Auto-saves"}
          </span>
        </span>
      </div>

      <div className="mt-4 grid gap-2.5">
        {RUBRIC_FIELDS.map((f) => (
          <label
            key={f.key}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-bg p-3.5 transition-colors hover:border-line-strong"
          >
            <input
              type="checkbox"
              checked={checks[f.key]}
              onChange={() => toggle(f.key)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-teal"
            />
            <span className="text-sm leading-snug text-ink-2">{f.label}</span>
          </label>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-lg">Admin Notes</h2>
        <p className="mt-0.5 text-sm text-muted">
          Observations from the follow-up call, context for the hiring manager.
        </p>
        <textarea
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          rows={5}
          placeholder="Add your notes..."
          className="mt-3 w-full resize-y rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition-colors focus:border-blue"
        />
      </div>
    </div>
  );
}
