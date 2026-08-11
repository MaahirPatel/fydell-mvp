"use client";

import { useEffect, useState } from "react";

export default function EmployerReviewActions({ sessionId }: { sessionId: string }) {
  const [decision, setDecision] = useState("advance");
  const [influence, setInfluence] = useState<"changed" | "confirmed" | "no_effect">("confirmed");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [defense, setDefense] = useState<{
    questions: { id: string; question_text: string; purpose: string }[];
    responses: { question_id: string; response_text: string }[];
  } | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [attestation, setAttestation] = useState("");

  useEffect(() => {
    void fetch(`/api/sim/sessions/${sessionId}/defense`)
      .then((r) => r.json())
      .then((data) => {
        if (data.defense) {
          setDefense({
            questions: data.defense.questions || [],
            responses: data.defense.responses || [],
          });
        }
      })
      .catch(() => {});
  }, [sessionId]);

  const saveDecision = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          notes,
          evidenceInfluence: influence,
          reviewStatus: "reviewed",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg("Decision saved. Fydell never changes hiring decisions automatically.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const saveFacilitatorNote = async (questionId: string) => {
    const text = responseDrafts[questionId] || "";
    if (!text.trim() || !attestation.trim()) {
      setMsg("Facilitator notes require a response and an attestation.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/defense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          responseText: text,
          collectionMethod: "facilitator_notes",
          attestation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg("Facilitator note saved with collection attestation.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-[15px] font-semibold text-slate-900">Human decision</h3>
        <p className="mt-1 text-[13px] text-slate-500">
          The hiring team owns the decision. Record whether Fydell evidence changed, confirmed, or
          did not affect the interview decision.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] text-slate-600">
            Decision
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="advance">Advance</option>
              <option value="hold">Hold</option>
              <option value="do_not_advance">Decline</option>
              <option value="needs_further_evidence">Needs further evidence</option>
            </select>
          </label>
          <label className="text-[13px] text-slate-600">
            Evidence influence
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={influence}
              onChange={(e) =>
                setInfluence(e.target.value as "changed" | "confirmed" | "no_effect")
              }
            >
              <option value="changed">Changed the interview decision</option>
              <option value="confirmed">Confirmed the interview decision</option>
              <option value="no_effect">Did not affect the interview decision</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block text-[13px] text-slate-600">
          Reviewer notes
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveDecision()}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
        >
          Save decision
        </button>
      </section>

      {defense && defense.questions.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-[15px] font-semibold text-slate-900">Oral defense (facilitator path)</h3>
          <p className="mt-1 text-[13px] text-slate-500">
            Questions are derived from this candidate&apos;s evidence. Recording is not required.
            Facilitator notes must include how they were collected.
          </p>
          <label className="mt-3 block text-[13px] text-slate-600">
            Collection attestation
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="e.g. Live video call notes entered by Jordan Hale on 2026-10-02"
              value={attestation}
              onChange={(e) => setAttestation(e.target.value)}
            />
          </label>
          <ul className="mt-4 space-y-4">
            {defense.questions.map((q) => {
              const existing = defense.responses.find((r) => r.question_id === q.id);
              return (
                <li key={q.id} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-[13.5px] font-medium text-slate-900">{q.question_text}</p>
                  <p className="mt-1 text-[12px] text-slate-500">{q.purpose}</p>
                  {existing ? (
                    <p className="mt-2 text-[13px] text-slate-700">{existing.response_text}</p>
                  ) : (
                    <>
                      <textarea
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px]"
                        rows={3}
                        value={responseDrafts[q.id] || ""}
                        onChange={(e) =>
                          setResponseDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void saveFacilitatorNote(q.id)}
                        className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-[12.5px] font-medium"
                      >
                        Save facilitator note
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {msg && <p className="text-[13px] text-slate-700">{msg}</p>}
    </div>
  );
}
