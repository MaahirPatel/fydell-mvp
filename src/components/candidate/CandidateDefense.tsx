"use client";

/**
 * The candidate's side of the oral defense.
 *
 * These questions are generated from limitations the candidate wrote in their
 * own submission, and until now only the employer could see them. A candidate
 * being asked to defend their work in an interview should be able to read the
 * questions first, and answer in writing if they would rather do that than sit
 * a call.
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Surface, SurfaceHeader } from "@/components/ui/Surface";
import { StatusTag } from "@/components/ui/StatusTag";

interface Question {
  id: string;
  question_text: string;
  purpose: string;
}

interface Response {
  question_id: string;
  response_text: string;
  collection_method: string;
}

export function CandidateDefense({ sessionId }: { sessionId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/defense`);
      const data = await res.json();
      if (res.ok && data.defense) {
        setQuestions(data.defense.questions || []);
        setResponses(data.defense.responses || []);
      }
    } catch {
      // A missing defense set is normal, not an error worth showing.
    } finally {
      setLoaded(true);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (questionId: string) => {
    const text = (drafts[questionId] || "").trim();
    if (!text) return;
    setBusyId(questionId);
    setError(null);
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/defense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          responseText: text,
          collectionMethod: "candidate_typed",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your answer");
      setDrafts((d) => ({ ...d, [questionId]: "" }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your answer");
    } finally {
      setBusyId(null);
    }
  };

  if (!loaded || questions.length === 0) return null;

  const answered = responses.length;

  return (
    <Surface tone="panel">
      <SurfaceHeader
        title="Questions about your work"
        description="These come from the parts of your own submission where you said the evidence stopped. Answering here is optional; the company may also ask you in person."
        action={
          <StatusTag tone={answered >= questions.length ? "good" : "neutral"}>
            {answered} of {questions.length} answered
          </StatusTag>
        }
      />
      <ul className="divide-y divide-[var(--border-subtle)]">
        {questions.map((q) => {
          const existing = responses.find((r) => r.question_id === q.id);
          return (
            <li key={q.id} className="px-5 py-4">
              <p className="text-[14px] leading-[1.55] text-[var(--text-primary)]">
                {q.question_text}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--text-tertiary)]">
                {q.purpose}
              </p>

              {existing ? (
                <div className="mt-3">
                  <p className="border-l-2 border-[var(--border-strong)] pl-3 text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
                    {existing.response_text}
                  </p>
                  <p className="mt-1.5 pl-3 text-[12px] text-[var(--text-tertiary)]">
                    {existing.collection_method === "candidate_typed"
                      ? "Your written answer. The company can read this."
                      : "Recorded by the company from a conversation with you."}
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <Textarea
                    rows={3}
                    aria-label={`Your answer to: ${q.question_text}`}
                    value={drafts[q.id] || ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                    }
                    placeholder="Answer in your own words, or leave this for the conversation."
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={busyId === q.id}
                    disabled={!(drafts[q.id] || "").trim()}
                    onClick={() => void save(q.id)}
                  >
                    Send this answer
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p
          role="alert"
          className="border-t border-[var(--border-subtle)] px-5 py-3 text-[13px] text-[var(--fydell-risk)]"
        >
          {error}
        </p>
      ) : null}
      <p className="border-t border-[var(--border-subtle)] px-5 py-3 text-[12.5px] leading-[1.6] text-[var(--text-tertiary)]">
        An answer cannot be edited once sent, for the same reason your submission
        cannot. Say so in the answer itself if you want to correct something.
      </p>
    </Surface>
  );
}

export default CandidateDefense;
