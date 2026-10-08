"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AuthoredCandidateView, PublicRunView } from "@/lib/eng/authored/types";
import { RevisionMatch } from "./BottomPanel";
import { formatClock, type WorkspaceChange } from "./lib";
import { RunHeadline } from "./TestBits";
import type { SaveState } from "./useWorkspaceFiles";

const CHANGE_WORD: Record<WorkspaceChange["change"], string> = { modified: "Edited", added: "New file", removed: "Removed" };

const field =
  "w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-[15px] leading-[1.55] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] disabled:opacity-60";

function Card({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="grid gap-3 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-4">
      <h2 id={id} className="text-[15px] font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The review screen before submitting: what changed, what the tests last
 * said, exactly what the employer receives, and the handoff answers.
 */
export function ReviewSubmission({
  view,
  changes,
  run,
  savedSha,
  hasUnsaved,
  saveState,
  localMode,
  answers,
  aiUse,
  teamMessages,
  assistantInteractions,
  assistantEnabled,
  onAnswer,
  onAiUse,
  onOpenDiff,
  onSaveNow,
  onSubmit,
  onClose,
}: {
  view: AuthoredCandidateView;
  changes: WorkspaceChange[];
  run: PublicRunView | null;
  savedSha: string | null;
  hasUnsaved: boolean;
  saveState: SaveState;
  localMode: boolean;
  answers: Record<string, string>;
  aiUse: string;
  teamMessages: number;
  assistantInteractions: number;
  assistantEnabled: boolean;
  onAnswer: (id: string, value: string) => void;
  onAiUse: (value: string) => void;
  onOpenDiff: (path: string) => void;
  onSaveNow: () => Promise<boolean>;
  onSubmit: () => Promise<string | null>;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const prompts = view.task.submission.handoffPrompts;
  const answered = prompts.some((p) => (answers[p.id] ?? "").trim());
  const saveTrouble = saveState === "offline" || saveState === "error" || saveState === "conflict";

  useEffect(() => {
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const problem = await onSubmit();
    if (problem) {
      setError(problem);
      setSubmitting(false);
      setConfirming(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="sim-review-title" className="fixed inset-0 z-[70] flex flex-col bg-[var(--surface-canvas)]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border-default)] bg-[var(--surface-panel)] px-4">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <ArrowLeft aria-hidden size={15} />
          Back to workspace
        </button>
        <h1 id="sim-review-title" ref={heading} tabIndex={-1} className="text-[14px] font-semibold text-[var(--text-primary)] outline-none">
          Review submission
        </h1>
      </header>

      <div className="sim-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="grid content-start gap-6">
            {hasUnsaved || saveTrouble ? (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[10px] bg-[var(--sim-attention-bg)] px-4 py-3">
                <CircleAlert aria-hidden size={16} className="text-[var(--sim-attention)]" />
                <p className="min-w-0 flex-1 text-[14px] text-[var(--text-primary)]">
                  {saveState === "conflict"
                    ? "Your files changed in another tab or window. Go back to the workspace to choose which copy to keep before submitting."
                    : "You have changes that are not saved yet. Save them so the submission includes them."}
                </p>
                {saveState !== "conflict" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={saving}
                    onClick={async () => {
                      setSaving(true);
                      await onSaveNow();
                      setSaving(false);
                    }}
                  >
                    Save now
                  </Button>
                ) : null}
              </div>
            ) : null}
            {localMode ? (
              <p className="rounded-[10px] bg-[var(--sim-attention-bg)] px-4 py-3 text-[14px] text-[var(--text-primary)]">
                Local editing is on. If you changed files in your own editor, sync your folder first. Only files in the Fydell workspace are submitted.
              </p>
            ) : null}

            <section aria-labelledby="sim-handoff-title" className="grid gap-5">
              <div className="grid gap-1">
                <h2 id="sim-handoff-title" className="text-[18px] font-semibold text-[var(--text-primary)]">
                  Handoff
                </h2>
                <p className="text-[14px] text-[var(--text-secondary)]">Write as you would to a colleague picking this up tomorrow. Short and specific is fine.</p>
              </div>
              {prompts.map((p) => (
                <div key={p.id} className="grid gap-1.5">
                  <label htmlFor={`sim-handoff-${p.id}`} className="text-[15px] font-medium text-[var(--text-primary)]">
                    {p.label}
                  </label>
                  {p.help ? (
                    <p id={`sim-handoff-${p.id}-help`} className="text-[13px] text-[var(--text-secondary)]">
                      {p.help}
                    </p>
                  ) : null}
                  <textarea
                    id={`sim-handoff-${p.id}`}
                    aria-describedby={p.help ? `sim-handoff-${p.id}-help` : undefined}
                    rows={4}
                    maxLength={8000}
                    value={answers[p.id] ?? ""}
                    disabled={submitting}
                    onChange={(e) => onAnswer(p.id, e.target.value)}
                    className={field}
                  />
                </div>
              ))}
              <div className="grid gap-1.5">
                <label htmlFor="sim-handoff-ai" className="text-[15px] font-medium text-[var(--text-primary)]">
                  Other AI assistance (optional)
                </label>
                <p id="sim-handoff-ai-help" className="text-[13px] text-[var(--text-secondary)]">
                  {assistantEnabled
                    ? "Your use of the built-in assistant is already included. Mention any other tools you used, in your own words."
                    : "Recorded as your statement. Fydell does not see tools outside this workspace."}
                </p>
                <textarea id="sim-handoff-ai" aria-describedby="sim-handoff-ai-help" rows={2} maxLength={4000} value={aiUse} disabled={submitting} onChange={(e) => onAiUse(e.target.value)} className={field} />
              </div>
            </section>

            {error ? (
              <p role="alert" className="rounded-[8px] bg-[var(--sim-error-bg)] px-3 py-2 text-[14px] text-[var(--sim-error)]">
                {error}
              </p>
            ) : null}

            {confirming ? (
              <div className="grid gap-3 rounded-[12px] border border-[var(--border-strong)] bg-[var(--surface-panel)] p-4">
                <p className="text-[15px] text-[var(--text-primary)]">Submit now? Your files and answers are sealed and cannot be changed afterwards.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={submit} loading={submitting}>
                    Submit and seal
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirming(false)} disabled={submitting}>
                    Keep working
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={() => setConfirming(true)} disabled={(prompts.length > 0 && !answered) || saveState === "conflict"}>
                  Submit
                </Button>
                {prompts.length > 0 && !answered ? <p className="text-[13px] text-[var(--text-secondary)]">Answer at least one handoff question to submit.</p> : null}
              </div>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <Card title="Files changed from the starter" id="sim-review-files">
              {changes.length ? (
                <ul className="grid gap-0.5">
                  {changes.map((c) => (
                    <li key={c.path}>
                      <button
                        type="button"
                        onClick={() => onOpenDiff(c.path)}
                        className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left hover:bg-[var(--surface-hover)]"
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[var(--text-primary)] underline-offset-2 hover:underline">{c.path}</span>
                        <span className="shrink-0 text-[12px] text-[var(--text-tertiary)]">{CHANGE_WORD[c.change]}</span>
                        <span className="shrink-0 font-mono text-[11.5px] tabular-nums">
                          <span className="text-[var(--sim-success)]">+{c.added}</span> <span className="text-[var(--sim-error)]">-{c.removed}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13.5px] text-[var(--text-secondary)]">No files differ from the starter yet. You can still submit, and the starter is what will be evaluated.</p>
              )}
            </Card>

            <Card title="Latest public test run" id="sim-review-tests">
              {run ? (
                <div className="grid gap-2">
                  <RunHeadline run={run} />
                  <p className="text-[12.5px] text-[var(--text-tertiary)]">
                    {run.runnerLabel ?? "Test runner"}, {formatClock(run.createdAt)}
                  </p>
                  <RevisionMatch run={run} savedSha={savedSha} hasUnsaved={hasUnsaved} />
                </div>
              ) : (
                <p className="text-[13.5px] text-[var(--text-secondary)]">You have not run the public tests in the workspace. That is fine; the full test suite runs after you submit.</p>
              )}
            </Card>

            {view.task.submission.requirements.length ? (
              <Card title="Submission requirements" id="sim-review-reqs">
                <ul className="grid list-disc gap-1.5 pl-5 text-[13.5px] leading-[1.55] text-[var(--text-body)] marker:text-[var(--text-quaternary)]">
                  {view.task.submission.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card title={`What ${view.role.organizationName} receives`} id="sim-review-receives">
              <ul className="grid list-disc gap-1.5 pl-5 text-[13.5px] leading-[1.55] text-[var(--text-body)] marker:text-[var(--text-quaternary)]">
                <li>Every file in the workspace as last saved, sealed with a fingerprint</li>
                <li>Your public test runs and the results of the full test suite after you submit</li>
                <li>Your handoff answers{aiUse.trim() ? " and your note on other AI assistance" : ""}</li>
                <li>
                  The team thread ({teamMessages} {teamMessages === 1 ? "message" : "messages"})
                  {assistantEnabled ? ` and the assistant transcript (${assistantInteractions} ${assistantInteractions === 1 ? "request" : "requests"}, with your accept and reject decisions)` : ""}
                </li>
                <li>A timeline of your activity in this workspace, such as test runs, assistant decisions and team events</li>
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
