"use client";

import { PanelLabel } from "@/components/ui/Panel";
import { BulletList } from "@/components/eng/CandidateParts";
import type { CandidateTask } from "@/lib/eng/authored/types";
import type { FileChange } from "./FileEditor";

const CHANGE_LABEL: Record<FileChange["change"], string> = { modified: "Edited", added: "New file", removed: "Removed" };

const fieldClass =
  "w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2 text-app-body leading-[1.55] text-[var(--text-primary)] disabled:opacity-60";

/** What will be sealed, and the handoff answers. Controlled by the parent. */
export function SubmissionReview({
  task,
  changes,
  answers,
  aiUse,
  disabled,
  onAnswer,
  onAiUse,
}: {
  task: CandidateTask;
  changes: FileChange[];
  answers: Record<string, string>;
  aiUse: string;
  disabled?: boolean;
  onAnswer: (id: string, value: string) => void;
  onAiUse: (value: string) => void;
}) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <PanelLabel>Files changed from the starter</PanelLabel>
        {changes.length ? (
          <ul className="grid divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
            {changes.map((c) => (
              <li key={c.path} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate font-mono text-[12.5px] text-[var(--text-primary)]">{c.path}</span>
                <span className="shrink-0 text-app-meta text-[var(--text-secondary)]">{CHANGE_LABEL[c.change]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-app-body text-[var(--text-secondary)]">No files differ from the starter yet. You can still submit, and the starter is what will be evaluated.</p>
        )}
        <p className="text-app-meta text-[var(--text-tertiary)]">
          Every file in the editor is sealed together. Public test files are replaced with the starter copies when tests run.
        </p>
      </div>

      {task.submission.requirements.length ? (
        <div className="grid gap-2">
          <PanelLabel>Before you submit</PanelLabel>
          <BulletList className="text-app-body text-[var(--text-secondary)]" items={task.submission.requirements} />
        </div>
      ) : null}

      {task.submission.handoffPrompts.map((p) => (
        <div key={p.id} className="grid gap-1.5">
          <label htmlFor={`handoff-${p.id}`} className="text-app-body font-medium text-[var(--text-primary)]">
            {p.label}
          </label>
          {p.help ? <p className="text-app-meta text-[var(--text-secondary)]">{p.help}</p> : null}
          <textarea
            id={`handoff-${p.id}`}
            rows={4}
            maxLength={8000}
            value={answers[p.id] ?? ""}
            disabled={disabled}
            onChange={(e) => onAnswer(p.id, e.target.value)}
            className={fieldClass}
          />
        </div>
      ))}

      <div className="grid gap-1.5">
        <label htmlFor="handoff-ai-use" className="text-app-body font-medium text-[var(--text-primary)]">
          AI assistance (optional)
        </label>
        <p className="text-app-meta text-[var(--text-secondary)]">Recorded as your statement. Fydell does not see your tools.</p>
        <textarea id="handoff-ai-use" rows={2} maxLength={4000} value={aiUse} disabled={disabled} onChange={(e) => onAiUse(e.target.value)} className={fieldClass} />
      </div>
    </div>
  );
}
