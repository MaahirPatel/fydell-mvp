"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Surface, SurfaceHeader } from "@/components/ui/Surface";

export default function EmployerReviewActions({ sessionId }: { sessionId: string }) {
  const [decision, setDecision] = useState("advance");
  const [influence, setInfluence] = useState<"changed" | "confirmed" | "no_effect">(
    "confirmed"
  );
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
      if (!res.ok) throw new Error(data.error || "Could not save the decision");
      setMsg("Decision saved.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save the decision");
    } finally {
      setBusy(false);
    }
  };

  const saveFacilitatorNote = async (questionId: string) => {
    const text = responseDrafts[questionId] || "";
    if (!text.trim() || !attestation.trim()) {
      setMsg("A facilitator note needs both a response and an attestation.");
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
      if (!res.ok) throw new Error(data.error || "Could not save the note");
      setMsg("Facilitator note saved with its collection attestation.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save the note");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Surface tone="panel">
        <SurfaceHeader
          title="Your decision"
          description="The hiring team owns the outcome. Fydell records what you decided and how much the evidence mattered."
        />
        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Decision" htmlFor="review-decision">
              <Select
                id="review-decision"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                <option value="advance">Advance</option>
                <option value="hold">Hold</option>
                <option value="do_not_advance">Decline</option>
                <option value="needs_further_evidence">Needs further evidence</option>
              </Select>
            </Field>
            <Field label="Evidence influence" htmlFor="review-influence">
              <Select
                id="review-influence"
                value={influence}
                onChange={(e) =>
                  setInfluence(e.target.value as "changed" | "confirmed" | "no_effect")
                }
              >
                <option value="changed">Changed the decision</option>
                <option value="confirmed">Confirmed the decision</option>
                <option value="no_effect">Did not affect the decision</option>
              </Select>
            </Field>
          </div>
          <Field label="Notes" htmlFor="review-notes" optional>
            <Textarea
              id="review-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What you concluded, in your own words."
            />
          </Field>
          <Button variant="primary" loading={busy} onClick={() => void saveDecision()}>
            Save decision
          </Button>
        </div>
      </Surface>

      {defense && defense.questions.length > 0 ? (
        <Surface tone="panel">
          <SurfaceHeader
            title="Oral defense"
            description="Questions generated from this candidate's own evidence. Recording is not required, but a note must say how it was collected."
          />
          <div className="space-y-4 px-5 py-4">
            <Field
              label="Collection attestation"
              htmlFor="review-attestation"
              help="Who collected these answers, how, and when."
            >
              <Input
                id="review-attestation"
                placeholder="Live video call, notes entered by Jordan Hale"
                value={attestation}
                onChange={(e) => setAttestation(e.target.value)}
              />
            </Field>

            <ul className="space-y-3">
              {defense.questions.map((q) => {
                const existing = defense.responses.find((r) => r.question_id === q.id);
                return (
                  <li
                    key={q.id}
                    className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3"
                  >
                    <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                      {q.question_text}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--text-tertiary)]">
                      {q.purpose}
                    </p>
                    {existing ? (
                      <p className="mt-2.5 border-l border-[var(--border-default)] pl-3 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                        {existing.response_text}
                      </p>
                    ) : (
                      <div className="mt-2.5 space-y-2">
                        <Textarea
                          rows={3}
                          aria-label={`Response to: ${q.question_text}`}
                          value={responseDrafts[q.id] || ""}
                          onChange={(e) =>
                            setResponseDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                          }
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() => void saveFacilitatorNote(q.id)}
                        >
                          Save note
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </Surface>
      ) : null}

      {msg ? (
        <p role="status" className="text-[13px] text-[var(--text-secondary)]">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
