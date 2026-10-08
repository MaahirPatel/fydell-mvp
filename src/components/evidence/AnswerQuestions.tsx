"use client";

import { useState } from "react";
import type { ApplicationQuestion } from "@/lib/profile-evidence/applications";
import { request } from "./request";

function AnswerForm({ question, onAnswered }: { question: ApplicationQuestion; onAnswered: (q: ApplicationQuestion) => void }) {
  const storageKey = `fydell:answer:${question.id}`;
  const [text, setText] = useState(() => window.sessionStorage.getItem(storageKey) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await request<{ question: ApplicationQuestion }>(`/api/applications/${question.applicationId}/questions`, "POST", { questionId: question.id, response: text });
    setBusy(false);
    if (result.ok === false) return setError(result.error);
    window.sessionStorage.removeItem(storageKey);
    onAnswered(result.data.question);
  }

  return (
    <form onSubmit={submit} className="mt-2 grid gap-2">
      <label className="sr-only" htmlFor={`answer-${question.id}`}>Your answer</label>
      <textarea
        id={`answer-${question.id}`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          window.sessionStorage.setItem(storageKey, e.target.value);
        }}
        rows={4}
        maxLength={4000}
        className="platform-input min-h-[6rem] py-2 text-app-meta text-[var(--text-body)]"
        placeholder="Answer in your own words. Point to the code or decision where it helps."
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || !text.trim()} className="btn btn-primary h-8 px-3 text-app-meta">
          {busy ? "Sending" : "Send answer"}
        </button>
        <span className="text-app-meta text-[var(--text-tertiary)]">Your draft is kept in this browser tab until you send it.</span>
      </div>
      {error ? <p role="alert" className="text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}
    </form>
  );
}

export default function AnswerQuestions({ initial, titles, withdrawn }: { initial: ApplicationQuestion[]; titles: Record<string, string>; withdrawn: boolean }) {
  const [questions, setQuestions] = useState(initial);
  const [answering, setAnswering] = useState<Set<string>>(() => new Set());
  if (questions.length === 0) return <p className="text-app-meta text-[var(--text-secondary)]">The team has not asked anything yet.</p>;
  return (
    <ul className="grid gap-3">
      {questions.map((q) => (
        <li key={q.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta">
          <p className="text-[var(--text-tertiary)]">
            {q.status === "answered" ? "Answered" : q.status === "closed" ? "Closed by the team" : "Waiting for your answer"}
            {q.dueAt && q.status === "open" ? `, by ${new Date(q.dueAt).toLocaleDateString()}` : ""}
          </p>
          {q.evidenceVersionId && titles[q.evidenceVersionId] ? <p className="mt-1 text-[var(--text-secondary)]">About {titles[q.evidenceVersionId]}</p> : null}
          <p className="mt-1 whitespace-pre-wrap font-medium text-[var(--text-primary)]">{q.question}</p>
          {q.response ? <p className="mt-2 whitespace-pre-wrap text-[var(--text-body)]">{q.response}</p> : null}
          {q.status === "open" && !withdrawn ? (
            answering.has(q.id) ? (
              <AnswerForm question={q} onAnswered={(next) => setQuestions((prev) => prev.map((x) => (x.id === next.id ? next : x)))} />
            ) : (
              <button type="button" onClick={() => setAnswering((prev) => new Set(prev).add(q.id))} className="btn btn-secondary mt-2 h-8 px-3 text-app-meta">
                Answer
              </button>
            )
          ) : null}
        </li>
      ))}
    </ul>
  );
}
