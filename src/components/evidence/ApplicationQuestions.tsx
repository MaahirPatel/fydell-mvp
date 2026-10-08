"use client";

import { useMemo, useState } from "react";
import type { ApplicationQuestion } from "@/lib/profile-evidence/applications";
import { request } from "./request";

export type QuestionTarget = {
  versionId: string;
  title: string;
  findings: Array<{ id: string; finding: string }>;
};

const STATUS: Record<ApplicationQuestion["status"], string> = {
  open: "Waiting for an answer",
  answered: "Answered",
  closed: "Closed",
};

function newRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
}

export default function ApplicationQuestions({
  applicationId,
  initial,
  targets,
  canAsk,
  open,
}: {
  applicationId: string;
  initial: ApplicationQuestion[];
  targets: QuestionTarget[];
  canAsk: boolean;
  open: boolean;
}) {
  const [questions, setQuestions] = useState(initial);
  const [question, setQuestion] = useState("");
  const [versionId, setVersionId] = useState("");
  const [findingId, setFindingId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [requestId, setRequestId] = useState(newRequestId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleFor = useMemo(() => new Map(targets.map((t) => [t.versionId, t.title])), [targets]);
  const findingFor = useMemo(() => new Map(targets.flatMap((t) => t.findings.map((f) => [f.id, f.finding] as const))), [targets]);
  const findings = targets.find((t) => t.versionId === versionId)?.findings ?? [];

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await request<{ question: ApplicationQuestion }>(`/api/employer/applications/${applicationId}/questions`, "POST", {
      question,
      evidenceVersionId: versionId || null,
      findingId: findingId || null,
      dueAt: dueAt ? new Date(`${dueAt}T23:59:00`).toISOString() : null,
      clientRequestId: requestId,
    });
    setBusy(false);
    if (result.ok === false) return setError(result.error);
    setQuestions((prev) => [result.data.question, ...prev.filter((q) => q.id !== result.data.question.id)]);
    setQuestion("");
    setVersionId("");
    setFindingId("");
    setDueAt("");
    setRequestId(newRequestId());
  }

  async function update(questionId: string, action: "reviewed" | "close") {
    setError(null);
    const result = await request<{ question: ApplicationQuestion }>(`/api/employer/applications/${applicationId}/questions`, "PATCH", { questionId, action });
    if (result.ok === false) return setError(result.error);
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? result.data.question : q)));
  }

  return (
    <div className="grid gap-4">
      {canAsk && open ? (
        <form onSubmit={ask} className="grid gap-3">
          <label className="grid gap-1 text-app-meta text-[var(--text-secondary)]">
            Question
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={2000}
              rows={3}
              required
              className="platform-input min-h-[5rem] py-2 text-app-meta text-[var(--text-body)]"
              placeholder="What would you like them to explain about this work?"
            />
          </label>
          {targets.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-app-meta text-[var(--text-secondary)]">
                About a project (optional)
                <select
                  value={versionId}
                  onChange={(e) => {
                    setVersionId(e.target.value);
                    setFindingId("");
                  }}
                  className="platform-select h-8 text-app-meta"
                >
                  <option value="">The whole application</option>
                  {targets.map((t) => (
                    <option key={t.versionId} value={t.versionId}>{t.title}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-app-meta text-[var(--text-secondary)]">
                About a finding (optional)
                <select value={findingId} onChange={(e) => setFindingId(e.target.value)} disabled={findings.length === 0} className="platform-select h-8 text-app-meta">
                  <option value="">{versionId ? "The whole project" : "Choose a project first"}</option>
                  {findings.map((f) => (
                    <option key={f.id} value={f.id}>{f.finding.length > 80 ? `${f.finding.slice(0, 80)}...` : f.finding}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          <label className="grid gap-1 text-app-meta text-[var(--text-secondary)] sm:max-w-[14rem]">
            Answer by (optional)
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="platform-input h-8 text-app-meta" />
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy || !question.trim()} className="btn btn-primary h-8 px-3 text-app-meta">
              {busy ? "Sending" : "Send question"}
            </button>
            <span className="text-app-meta text-[var(--text-tertiary)]">They are notified in Fydell. No email is sent.</span>
          </div>
        </form>
      ) : !open ? (
        <p className="text-app-meta text-[var(--text-secondary)]">The applicant withdrew, so no new questions can be sent.</p>
      ) : null}
      {error ? <p role="alert" className="text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}
      {questions.length === 0 ? (
        <p className="text-app-meta text-[var(--text-secondary)]">No questions yet.</p>
      ) : (
        <ul className="grid gap-2">
          {questions.map((q) => (
            <li key={q.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta">
              <p className="text-[var(--text-tertiary)]">
                {STATUS[q.status]}
                {q.reviewedAt ? ", read" : ""}
                {q.dueAt && q.status === "open" ? `, answer by ${new Date(q.dueAt).toLocaleDateString()}` : ""}
              </p>
              {q.evidenceVersionId ? (
                <p className="mt-1 text-[var(--text-secondary)]">
                  About {titleFor.get(q.evidenceVersionId) ?? "a project they removed"}
                  {q.findingId && findingFor.get(q.findingId) ? `: ${findingFor.get(q.findingId)}` : ""}
                </p>
              ) : null}
              <p className="mt-1 whitespace-pre-wrap font-medium text-[var(--text-primary)]">{q.question}</p>
              {q.response ? <p className="mt-2 whitespace-pre-wrap text-[var(--text-body)]">{q.response}</p> : null}
              {canAsk && q.status !== "closed" ? (
                <div className="mt-2 flex gap-2">
                  {q.status === "answered" && !q.reviewedAt ? (
                    <button type="button" onClick={() => update(q.id, "reviewed")} className="btn btn-secondary h-7 px-2.5 text-app-meta">
                      Mark as read
                    </button>
                  ) : null}
                  <button type="button" onClick={() => update(q.id, "close")} className="btn btn-ghost h-7 px-2.5 text-app-meta">
                    Close
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
