"use client";

import { useEffect, useState } from "react";

interface CandidateQuestion {
  id: string;
  organizationId: string;
  organizationName: string;
  roleTitle: string;
  question: string;
  response: string;
  status: string;
  createdAt: string;
}

/**
 * H09 candidate side: view open follow-up questions from employers
 * and respond. Each question shows which employer and role it relates to.
 */
export default function CandidateQuestions() {
  const [questions, setQuestions] = useState<CandidateQuestion[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/candidate/questions");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Could not load questions.");
      setQuestions(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function respond(q: CandidateQuestion) {
    const response = (drafts[q.id] ?? "").trim();
    if (!response) return;
    setSaving(q.id);
    setError(null);
    try {
      const res = await fetch("/api/candidate/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          organizationId: q.organizationId,
          response,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Could not save response.");
      setDrafts((d) => ({ ...d, [q.id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save response.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <p style={{ fontSize: 14, color: "var(--ink-secondary)" }}>Loading questions…</p>;
  }

  if (questions.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--ink-secondary)", margin: 0 }}>
        No open questions from employers. When a hiring team asks about your evidence, it will appear here.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && (
        <div
          role="alert"
          style={{
            background: "var(--error-tint)",
            color: "var(--error-ink)",
            borderRadius: "var(--radius-control)",
            padding: "10px 14px",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      {questions.map((q) => (
        <div
          key={q.id}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-control)",
            padding: 16,
            background: "var(--surface)",
          }}
        >
          <p style={{ fontSize: 12, color: "var(--ink-secondary)", margin: "0 0 6px" }}>
            {q.organizationName} · {q.roleTitle}
          </p>
          <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 12px" }}>{q.question}</p>
          <textarea
            value={drafts[q.id] ?? ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))}
            placeholder="Write your response…"
            rows={3}
            style={{
              width: "100%",
              fontSize: 14,
              padding: 12,
              borderRadius: "var(--radius-control)",
              border: "1px solid var(--control-border)",
              fontFamily: "inherit",
              resize: "vertical",
              marginBottom: 8,
            }}
          />
          <button
            onClick={() => respond(q)}
            disabled={saving === q.id || !(drafts[q.id] ?? "").trim()}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 16px",
              borderRadius: "var(--radius-control)",
              border: "none",
              background: "var(--action)",
              color: "#fff",
              cursor: "pointer",
              opacity: saving === q.id ? 0.6 : 1,
            }}
          >
            {saving === q.id ? "Sending…" : "Send response"}
          </button>
        </div>
      ))}
    </div>
  );
}
