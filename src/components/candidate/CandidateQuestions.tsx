"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface CandidateQuestion {
  id: string;
  organizationName: string;
  roleTitle: string;
  question: string;
  response: string;
  status: "open" | "answered" | "closed";
  dueAt: string | null;
  answeredAt: string | null;
  createdAt: string;
  shareActive: boolean;
}

const DRAFT_KEY = (id: string) => `fydell:question-draft:${id}`;

function readDraft(id: string): string {
  try {
    return window.localStorage.getItem(DRAFT_KEY(id)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(id: string, text: string) {
  try {
    if (text) window.localStorage.setItem(DRAFT_KEY(id), text);
    else window.localStorage.removeItem(DRAFT_KEY(id));
  } catch {
    // Storage can be unavailable (private mode); the draft still lives in memory.
  }
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function dueLabel(iso: string, now: number): { text: string; late: boolean } {
  const days = Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
  if (days < 0) return { text: `Was due ${formatDay(iso)}`, late: true };
  if (days === 0) return { text: "Due today", late: false };
  return { text: `Due ${formatDay(iso)}`, late: false };
}

const textareaClass =
  "w-full resize-y rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-[14px] leading-[1.55] text-[var(--text-primary)] focus:border-[var(--text-tertiary)] focus:outline-none";

/**
 * Follow-up questions from hiring teams. Open questions come first with any
 * due date the employer set; answered and closed ones stay as history.
 * Unsent answers are kept in this browser so a reload doesn't lose them.
 */
export default function CandidateQuestions() {
  const [questions, setQuestions] = useState<CandidateQuestion[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  function apply(list: CandidateQuestion[]) {
    setQuestions(list);
    setDrafts((current) => {
      const next = { ...current };
      for (const q of list) if (next[q.id] === undefined) next[q.id] = readDraft(q.id);
      return next;
    });
  }

  useEffect(() => {
    let live = true;
    fetch("/api/candidate/questions")
      .then((res) => res.json())
      .then((data: { ok?: boolean; error?: string; questions?: CandidateQuestion[] }) => {
        if (!live) return;
        if (!data.ok) throw new Error(data.error || "Could not load questions.");
        apply(data.questions ?? []);
      })
      .catch((e: unknown) => {
        if (live) setLoadError(e instanceof Error ? e.message : "Could not load questions.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  function setDraft(id: string, text: string) {
    setDrafts((d) => ({ ...d, [id]: text }));
    writeDraft(id, text);
  }

  async function respond(q: CandidateQuestion) {
    const response = (drafts[q.id] ?? "").trim();
    if (!response || saving) return;
    setSaving(q.id);
    setErrors((e) => ({ ...e, [q.id]: "" }));
    try {
      const res = await fetch("/api/candidate/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, response }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; question?: { response: string; status: CandidateQuestion["status"]; answeredAt: string | null } };
      if (!data.ok || !data.question) throw new Error(data.error || "Could not send your answer. Your text is kept; try again.");
      const saved = data.question;
      setQuestions((list) => list.map((x) => (x.id === q.id ? { ...x, response: saved.response, status: saved.status, answeredAt: saved.answeredAt } : x)));
      setDraft(q.id, "");
      setEditing(null);
    } catch (e) {
      setErrors((x) => ({ ...x, [q.id]: e instanceof Error ? e.message : "Could not send your answer. Your text is kept; try again." }));
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading questions">
        <div className="h-4 w-48 animate-pulse rounded bg-[var(--surface-selected)]" />
        <div className="h-16 animate-pulse rounded-[10px] bg-[var(--surface-selected)]" />
      </div>
    );
  }
  if (loadError) {
    return (
      <p role="alert" className="text-[14px] text-[var(--status-attention-ink)]">
        {loadError} Reload the page to try again.
      </p>
    );
  }
  if (questions.length === 0) {
    return <p className="text-[14px] text-[var(--text-secondary)]">No questions from employers. When a hiring team asks about your evidence, it will appear here.</p>;
  }

  const open = questions.filter((q) => q.status === "open");
  const history = questions.filter((q) => q.status !== "open");

  return (
    <div className="space-y-6">
      {open.length ? (
        <ul className="space-y-3">
          {open.map((q) => (
            <li key={q.id} className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
              <QuestionHeader q={q} now={now} />
              <p className="mt-2 text-[15px] font-medium leading-[1.5] text-[var(--text-primary)]">{q.question}</p>
              {q.shareActive ? (
                <AnswerForm
                  id={q.id}
                  value={drafts[q.id] ?? ""}
                  onChange={(t) => setDraft(q.id, t)}
                  onSend={() => void respond(q)}
                  busy={saving === q.id}
                  error={errors[q.id]}
                  label="Send answer"
                />
              ) : (
                <p className="mt-3 text-[13px] text-[var(--text-tertiary)]">
                  The link you shared with {q.organizationName} is no longer active, so they can&apos;t read an answer.
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-[var(--text-secondary)]">Nothing is waiting for your answer.</p>
      )}

      {history.length ? (
        <details className="group">
          <summary className="cursor-pointer text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Answered and closed ({history.length})
          </summary>
          <ul className="mt-3 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {history.map((q) => (
              <li key={q.id} className="py-3">
                <QuestionHeader q={q} now={now} />
                <p className="mt-1.5 text-[14px] font-medium text-[var(--text-primary)]">{q.question}</p>
                {q.response ? <p className="mt-1 whitespace-pre-wrap text-[14px] leading-[1.55] text-[var(--text-secondary)]">{q.response}</p> : null}
                {q.status === "answered" && q.shareActive ? (
                  editing === q.id ? (
                    <AnswerForm
                      id={q.id}
                      value={drafts[q.id] ?? ""}
                      onChange={(t) => setDraft(q.id, t)}
                      onSend={() => void respond(q)}
                      busy={saving === q.id}
                      error={errors[q.id]}
                      label="Send updated answer"
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(q.id);
                        if (!drafts[q.id]) setDraft(q.id, q.response);
                      }}
                      className="mt-1.5 text-[13px] font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4"
                    >
                      Update answer
                    </button>
                  )
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function QuestionHeader({ q, now }: { q: CandidateQuestion; now: number }) {
  const due = q.status === "open" && q.dueAt ? dueLabel(q.dueAt, now) : null;
  const state =
    q.status === "open"
      ? "Waiting for your answer"
      : q.status === "answered"
        ? `Answered ${q.answeredAt ? formatDay(q.answeredAt) : ""}`.trim()
        : "Closed by the employer";
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-[var(--text-tertiary)]">
      <span className="font-medium text-[var(--text-secondary)]">{q.organizationName}</span>
      <span aria-hidden>·</span>
      <span>{q.roleTitle}</span>
      <span aria-hidden>·</span>
      <span>{state}</span>
      {due ? (
        <>
          <span aria-hidden>·</span>
          <span className={due.late ? "font-medium text-[var(--status-attention-ink)]" : ""}>{due.text}</span>
        </>
      ) : null}
    </p>
  );
}

function AnswerForm(props: {
  id: string;
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  busy: boolean;
  error?: string;
  label: string;
  onCancel?: () => void;
}) {
  return (
    <div className="mt-3">
      <label htmlFor={`answer-${props.id}`} className="sr-only">
        Your answer
      </label>
      <textarea
        id={`answer-${props.id}`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder="Write your answer. You can point to files or findings in your Passport."
        rows={3}
        maxLength={4000}
        className={textareaClass}
      />
      {props.error ? (
        <p role="alert" className="mt-1.5 text-[13px] text-[var(--status-attention-ink)]">
          {props.error}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={props.onSend} loading={props.busy} disabled={props.busy || !props.value.trim()}>
          {props.busy ? "Sending…" : props.label}
        </Button>
        {props.onCancel ? (
          <Button size="sm" variant="quiet" onClick={props.onCancel} disabled={props.busy}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
