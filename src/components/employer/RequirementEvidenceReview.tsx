"use client";

import { useCallback, useEffect, useState } from "react";
import type { PassportEvidence } from "@/lib/passport/view";
import type { Assessment, EvidenceMapping, ReviewQuestion, MappingStatus } from "@/lib/employer/review";

/**
 * H06 - Requirement-to-evidence review screen.
 *
 * Three panels: requirements left, evidence center, source drawer right.
 * Each requirement shows mapped evidence and uncertainty; the reviewer can
 * accept a mapping, correct it, or ask a follow-up question (H09).
 *
 * "Not established" is visually distinct from "cannot do" - unresolved
 * requirements show the amber question state, never a red failure mark.
 */

interface Props {
  roleId: string;
  shareId: string;
  roleTitle: string;
  requirements: string[];
  evidence: PassportEvidence[];
  candidateName: string;
}

function dayFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function newRequestId(): string {
  return `q_${crypto.randomUUID().replace(/-/g, "")}`;
}

const STATUS_LABEL: Record<MappingStatus, string> = {
  suggested: "Suggested",
  accepted: "Accepted",
  corrected: "Corrected",
  questioned: "Question asked",
  unresolved: "Not established",
};

const ASSESSMENT_LABEL: Record<Assessment, string> = {
  supports: "Supports it",
  insufficient: "Relevant but not enough",
  not_observed: "Not observed",
  concern: "Concern",
};

function MappingBadge({ mapping }: { mapping: EvidenceMapping | undefined }) {
  if (!mapping) {
    return (
      <span style={{ display: "inline-flex", fontSize: 13, fontWeight: 600, padding: "3px 10px", borderRadius: "var(--radius-tag)", background: "var(--surface-subtle)", color: "var(--ink-secondary)" }}>
        Not reviewed
      </span>
    );
  }
  if (mapping.assessment) {
    const tone: React.CSSProperties =
      mapping.assessment === "supports"
        ? { background: "var(--confirmed-tint)", color: "var(--confirmed-ink)" }
        : mapping.assessment === "not_observed"
          ? { background: "var(--surface-subtle)", color: "var(--ink-secondary)" }
          : { background: "var(--question-tint)", color: "var(--question-ink)" };
    return (
      <span style={{ display: "inline-flex", fontSize: 13, fontWeight: 600, padding: "3px 10px", borderRadius: "var(--radius-tag)", ...tone }}>
        {ASSESSMENT_LABEL[mapping.assessment]}
      </span>
    );
  }
  return <StatusBadge status={mapping.status} />;
}

function StatusBadge({ status }: { status: MappingStatus }) {
  const styles: Record<MappingStatus, React.CSSProperties> = {
    suggested: { background: "var(--surface-subtle)", color: "var(--ink-secondary)" },
    accepted: { background: "var(--confirmed-tint)", color: "var(--confirmed-ink)" },
    corrected: { background: "var(--action-tint)", color: "var(--action-hover)" },
    questioned: { background: "var(--question-tint)", color: "var(--question-ink)" },
    unresolved: { background: "var(--question-tint)", color: "var(--question-ink)" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: "var(--radius-tag)",
        ...styles[status],
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "currentColor",
        }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function RequirementEvidenceReview({
  roleId,
  shareId,
  roleTitle,
  requirements,
  evidence,
  candidateName,
}: Props) {
  const [mappings, setMappings] = useState<EvidenceMapping[]>([]);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [selectedReq, setSelectedReq] = useState(0);
  const [drawerEvidence, setDrawerEvidence] = useState<PassportEvidence | null>(null);
  const [questionDraft, setQuestionDraft] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [requestId, setRequestId] = useState(newRequestId);
  const [askingFor, setAskingFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      fetch(`/api/employer/review/${roleId}/${shareId}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.ok) throw new Error(data.error || "Could not load review.");
          setMappings(data.mappings);
          setQuestions(data.questions);
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : "Could not load review.");
        })
        .finally(() => {
          setLoading(false);
        }),
    [roleId, shareId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const mappingFor = (index: number) => mappings.find((m) => m.requirementIndex === index);
  const evidenceFor = (mapping: EvidenceMapping | undefined) =>
    mapping?.evidenceId ? evidence.find((e) => e.id === mapping.evidenceId) : undefined;
  const questionsFor = (mappingId: string) => questions.filter((q) => q.mappingId === mappingId);

  async function saveMapping(
    index: number,
    patch: { evidenceId?: string | null; status: MappingStatus; reviewerNote?: string }
  ) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/employer/review/${roleId}/${shareId}/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirementText: requirements[index],
          requirementIndex: index,
          evidenceProjectId: null,
          evidenceId: patch.evidenceId ?? null,
          status: patch.status,
          reviewerNote: patch.reviewerNote ?? "",
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Could not save.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function askFollowUp(index: number) {
    if (!questionDraft.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      // A question is always attached to its requirement; create the
      // assessment first when this requirement has none yet.
      let mapping = mappingFor(index);
      if (!mapping) {
        const created = await fetch(`/api/employer/review/${roleId}/${shareId}/mappings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requirementText: requirements[index], requirementIndex: index, evidenceProjectId: null, evidenceId: null, status: "questioned", reviewerNote: "" }),
        });
        const createdData = (await created.json()) as { ok?: boolean; error?: string; mapping?: EvidenceMapping };
        if (!createdData.ok || !createdData.mapping) throw new Error(createdData.error || "Could not save the requirement before asking.");
        mapping = createdData.mapping;
      }
      const res = await fetch(`/api/employer/review/${roleId}/${shareId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionDraft.trim(), mappingId: mapping.id, dueAt: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : null, clientRequestId: requestId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Could not send the question. Your draft is kept; try again.");
      setQuestionDraft("");
      setDueDate("");
      setRequestId(newRequestId());
      setAskingFor(null);
      if (mapping.status !== "questioned") {
        await saveMapping(index, { evidenceId: mapping.evidenceId, status: "questioned" });
      } else {
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the question. Your draft is kept; try again.");
    } finally {
      setSaving(false);
    }
  }

  async function updateQuestion(questionId: string, action: "reviewed" | "close" | "reopen") {
    setError(null);
    try {
      const res = await fetch(`/api/employer/review/${roleId}/${shareId}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, action }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; question?: ReviewQuestion };
      if (!data.ok || !data.question) throw new Error(data.error || "Could not update the question.");
      const updated = data.question;
      setQuestions((list) => list.map((q) => (q.id === questionId ? updated : q)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the question.");
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 32, color: "var(--ink-secondary)" }}>
        Loading review…
      </div>
    );
  }

  const current = mappingFor(selectedReq);
  const currentEvidence = evidenceFor(current);
  const currentQuestions = current ? questionsFor(current.id) : [];

  return (
    <div>
      {error && (
        <div
          role="alert"
          style={{
            background: "var(--error-tint)",
            color: "var(--error-ink)",
            borderRadius: "var(--radius-control)",
            padding: "12px 16px",
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          gap: 0,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
          background: "var(--surface)",
        }}
      >
        {/* Left: requirements */}
        <div
          style={{
            borderRight: "1px solid var(--border)",
            background: "var(--canvas)",
            padding: 16,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 4px" }}>
            ROLE
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>{roleTitle}</p>
          <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: "0 0 16px" }}>
            Candidate: {candidateName}
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 8px" }}>
            REQUIREMENTS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requirements.map((req, i) => {
              const m = mappingFor(i);
              const active = i === selectedReq;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedReq(i)}
                  style={{
                    textAlign: "left",
                    border: `1px solid ${active ? "var(--action)" : "var(--border)"}`,
                    borderRadius: "var(--radius-control)",
                    background: active ? "var(--action-tint)" : "var(--surface)",
                    padding: "10px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>{req}</span>
                  <MappingBadge mapping={m} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: evidence for selected requirement */}
        <div style={{ padding: 24, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 8px" }}>
                {requirements[selectedReq]}
              </h2>
              <MappingBadge mapping={current} />
            </div>
          </div>

          {currentEvidence ? (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-control)",
                padding: 16,
                marginBottom: 16,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 8px" }}>
                MAPPED EVIDENCE · {currentEvidence.repo}
              </p>
              <p style={{ fontSize: 14, margin: "0 0 8px" }}>{currentEvidence.finding}</p>
              <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: "0 0 12px" }}>
                {currentEvidence.path}:{currentEvidence.startLine}-{currentEvidence.endLine}
              </p>
              <button
                onClick={() => setDrawerEvidence(currentEvidence)}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--action)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Inspect source →
              </button>
            </div>
          ) : (
            <div
              style={{
                border: "1px dashed var(--control-border)",
                borderRadius: "var(--radius-control)",
                padding: 20,
                marginBottom: 16,
                background: "var(--question-tint)",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 6px", color: "var(--question-ink)" }}>
                No evidence linked yet
              </p>
              <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: 0 }}>
                This is not a negative judgment. Select evidence below, or ask the candidate a follow-up question.
              </p>
            </div>
          )}

          {/* Evidence picker */}
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 8px" }}>
            AVAILABLE EVIDENCE
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, maxHeight: 320, overflowY: "auto" }}>
            {evidence.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--ink-secondary)" }}>No evidence items in this profile.</p>
            )}
            {evidence.map((e) => {
              const selected = currentEvidence?.id === e.id;
              return (
                <div
                  key={e.id}
                  style={{
                    border: `1px solid ${selected ? "var(--action)" : "var(--border)"}`,
                    borderRadius: "var(--radius-control)",
                    padding: "10px 12px",
                    background: selected ? "var(--action-tint)" : "var(--surface)",
                  }}
                >
                  <p style={{ fontSize: 13, margin: "0 0 4px" }}>{e.finding}</p>
                  <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: "0 0 8px" }}>
                    {e.repo} · {e.path}:{e.startLine}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => saveMapping(selectedReq, { evidenceId: e.id, status: "accepted" })}
                      disabled={saving}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "6px 12px",
                        borderRadius: "var(--radius-control)",
                        border: "1px solid var(--action)",
                        background: selected ? "var(--action)" : "var(--surface)",
                        color: selected ? "#fff" : "var(--action)",
                        cursor: "pointer",
                      }}
                    >
                      {selected ? "Mapped" : "Map to requirement"}
                    </button>
                    <button
                      onClick={() => setDrawerEvidence(e)}
                      style={{
                        fontSize: 13,
                        padding: "6px 12px",
                        borderRadius: "var(--radius-control)",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        cursor: "pointer",
                      }}
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reviewer actions */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 16,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() =>
                saveMapping(selectedReq, {
                  evidenceId: current?.evidenceId ?? null,
                  status: "accepted",
                })
              }
              disabled={saving || !currentEvidence}
              style={actionButtonStyle(false)}
            >
              Accept mapping
            </button>
            <button
              onClick={() =>
                saveMapping(selectedReq, {
                  evidenceId: null,
                  status: "unresolved",
                  reviewerNote: "Mapping removed by reviewer.",
                })
              }
              disabled={saving}
              style={actionButtonStyle(false)}
            >
              Mark unresolved
            </button>
            <button
              onClick={() => setAskingFor(askingFor === "new" ? null : "new")}
              style={actionButtonStyle(askingFor === "new")}
            >
              Ask a question
            </button>
          </div>

          {askingFor === "new" && (
            <div style={{ marginTop: 12 }}>
              <textarea
                value={questionDraft}
                onChange={(e) => setQuestionDraft(e.target.value)}
                placeholder="What do you need the candidate to clarify about this requirement?"
                rows={3}
                style={{
                  width: "100%",
                  fontSize: 14,
                  padding: 12,
                  borderRadius: "var(--radius-control)",
                  border: "1px solid var(--control-border)",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "var(--ink-secondary)" }}>
                Answer by (optional)
                <input
                  type="date"
                  value={dueDate}
                  min={dayFromNow(1)}
                  max={dayFromNow(60)}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ fontSize: 13, padding: "4px 8px", borderRadius: "var(--radius-control)", border: "1px solid var(--control-border)", fontFamily: "inherit" }}
                />
              </label>
              {dueDate ? (
                <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: "4px 0 0" }}>
                  The candidate will see this date. Only set one your team will hold to.
                </p>
              ) : null}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => askFollowUp(selectedReq)}
                  disabled={saving || !questionDraft.trim()}
                  style={actionButtonStyle(true)}
                >
                  {saving ? "Sending…" : "Send question"}
                </button>
                <button onClick={() => { setAskingFor(null); setQuestionDraft(""); setDueDate(""); }} style={actionButtonStyle(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Thread */}
          {currentQuestions.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 8px" }}>
                FOLLOW-UP THREAD
              </p>
              {currentQuestions.map((q) => (
                <div
                  key={q.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-control)",
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: "0 0 4px" }}>
                    {q.status === "closed"
                      ? "Closed"
                      : q.status === "answered"
                        ? q.reviewedAt
                          ? "Answered · read"
                          : "Answered · needs your review"
                        : `Waiting for the candidate${q.dueAt ? ` · due ${new Date(q.dueAt).toLocaleDateString()}` : ""}`}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 6px" }}>{q.question}</p>
                  {q.response ? (
                    <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>{q.response}</p>
                  ) : null}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {q.status === "answered" && !q.reviewedAt ? (
                      <button onClick={() => void updateQuestion(q.id, "reviewed")} style={actionButtonStyle(true)}>
                        Mark as read
                      </button>
                    ) : null}
                    {q.status !== "closed" ? (
                      <button onClick={() => void updateQuestion(q.id, "close")} style={actionButtonStyle(false)}>
                        Close question
                      </button>
                    ) : (
                      <button onClick={() => void updateQuestion(q.id, "reopen")} style={actionButtonStyle(false)}>
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: source drawer */}
      {drawerEvidence && (
        <div
          role="dialog"
          aria-label="Evidence source"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(480px, 100%)",
            background: "var(--surface)",
            borderLeft: "1px solid var(--border)",
            boxShadow: "var(--shadow-2)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 4px" }}>
                SOURCE
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{drawerEvidence.repo}</p>
              <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: "4px 0 0", fontFamily: "var(--font-mono)" }}>
                {drawerEvidence.path}:{drawerEvidence.startLine}-{drawerEvidence.endLine}
              </p>
            </div>
            <button
              onClick={() => setDrawerEvidence(null)}
              aria-label="Close source drawer"
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-control)",
                background: "var(--surface)",
                width: 32,
                height: 32,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
            <p style={{ fontSize: 13, margin: "0 0 12px" }}>{drawerEvidence.finding}</p>
            <pre
              style={{
                background: "var(--code-bg)",
                color: "var(--code-text)",
                borderRadius: "var(--radius-control)",
                padding: 16,
                fontSize: 13,
                overflowX: "auto",
                fontFamily: "var(--font-mono)",
              }}
            >
              {drawerEvidence.excerpt.join("\n")}
            </pre>
            {drawerEvidence.limitations.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 6px" }}>
                  LIMITATIONS
                </p>
                <ul style={{ fontSize: 13, color: "var(--ink-secondary)", margin: 0, paddingLeft: 18 }}>
                  {drawerEvidence.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
            {drawerEvidence.sourceUrl ? (
              <a
                href={drawerEvidence.sourceUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 13, color: "var(--action)", display: "inline-block", marginTop: 16 }}
              >
                Open in repository →
              </a>
            ) : (
              <p style={{ fontSize: 13, color: "var(--ink-secondary)", marginTop: 16 }}>
                Uploaded by the candidate. There is no hosted repository to open.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function actionButtonStyle(primary: boolean): React.CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 16px",
    borderRadius: "var(--radius-control)",
    border: primary ? "none" : "1px solid var(--control-border)",
    background: primary ? "var(--action)" : "var(--surface)",
    color: primary ? "#fff" : "var(--ink)",
    cursor: "pointer",
    opacity: undefined,
  };
}
