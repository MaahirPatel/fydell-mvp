"use client";

import { useCallback, useEffect, useState } from "react";
import type { PassportEvidence } from "@/lib/passport/view";
import type { EvidenceMapping, ReviewQuestion, MappingStatus } from "@/lib/employer/review";
import VerificationRequestPanel from "./VerificationRequestPanel";

/**
 * H06 — Requirement-to-evidence review screen.
 *
 * Three panels: requirements left, evidence center, source drawer right.
 * Each requirement shows mapped evidence and uncertainty; the reviewer can
 * accept a mapping, correct it, or ask a follow-up question (H09).
 *
 * "Not established" is visually distinct from "cannot do" — unresolved
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

const STATUS_LABEL: Record<MappingStatus, string> = {
  suggested: "Suggested",
  accepted: "Accepted",
  corrected: "Corrected",
  questioned: "Question asked",
  unresolved: "Not established",
};

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
        fontSize: 12,
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
  const [askingFor, setAskingFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/employer/review/${roleId}/${shareId}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Could not load review.");
      setMappings(data.mappings);
      setQuestions(data.questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load review.");
    } finally {
      setLoading(false);
    }
  }, [roleId, shareId]);

  useEffect(() => {
    load();
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

  async function askFollowUp(mappingId: string | null) {
    if (!questionDraft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/employer/review/${roleId}/${shareId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionDraft.trim(), mappingId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Could not ask question.");
      setQuestionDraft("");
      setAskingFor(null);
      const mapping = mappings.find((m) => m.id === mappingId);
      if (mapping) {
        await saveMapping(mapping.requirementIndex, {
          evidenceId: mapping.evidenceId,
          status: "questioned",
        });
      } else {
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not ask question.");
    } finally {
      setSaving(false);
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
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 4px" }}>
            ROLE
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>{roleTitle}</p>
          <p style={{ fontSize: 12, color: "var(--ink-secondary)", margin: "0 0 16px" }}>
            Candidate: {candidateName}
          </p>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 8px" }}>
            REQUIREMENTS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requirements.map((req, i) => {
              const m = mappingFor(i);
              const status: MappingStatus = m?.status ?? "unresolved";
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
                  <StatusBadge status={status} />
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
              {current ? <StatusBadge status={current.status} /> : <StatusBadge status="unresolved" />}
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
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 8px" }}>
                MAPPED EVIDENCE · {currentEvidence.repo}
              </p>
              <p style={{ fontSize: 14, margin: "0 0 8px" }}>{currentEvidence.finding}</p>
              <p style={{ fontSize: 12, color: "var(--ink-secondary)", margin: "0 0 12px" }}>
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
                Not established by the supplied evidence
              </p>
              <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: 0 }}>
                This is not a negative judgment. Select evidence below, or ask the candidate a follow-up question.
              </p>
            </div>
          )}

          {/* Evidence picker */}
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 8px" }}>
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
                  <p style={{ fontSize: 12, color: "var(--ink-secondary)", margin: "0 0 8px" }}>
                    {e.repo} · {e.path}:{e.startLine}
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => saveMapping(selectedReq, { evidenceId: e.id, status: "accepted" })}
                      disabled={saving}
                      style={{
                        fontSize: 12,
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
                        fontSize: 12,
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
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => askFollowUp(current?.id ?? null)}
                  disabled={saving || !questionDraft.trim()}
                  style={actionButtonStyle(true)}
                >
                  Send question
                </button>
                <button onClick={() => { setAskingFor(null); setQuestionDraft(""); }} style={actionButtonStyle(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Thread */}
          {currentQuestions.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 8px" }}>
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
                  <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 6px" }}>{q.question}</p>
                  {q.response ? (
                    <p style={{ fontSize: 13, color: "var(--ink-secondary)", margin: 0 }}>{q.response}</p>
                  ) : (
                    <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink-secondary)", margin: 0 }}>
                      Awaiting candidate response
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Targeted verification */}
          <div style={{ marginTop: 20, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <VerificationRequestPanel
              roleId={roleId}
              shareId={shareId}
              mappingId={current?.id ?? null}
              candidateName={candidateName}
            />
          </div>
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
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 4px" }}>
                SOURCE
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{drawerEvidence.repo}</p>
              <p style={{ fontSize: 12, color: "var(--ink-secondary)", margin: "4px 0 0", fontFamily: "var(--font-mono)" }}>
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
                fontSize: 12,
                overflowX: "auto",
                fontFamily: "var(--font-mono)",
              }}
            >
              {drawerEvidence.excerpt.join("\n")}
            </pre>
            {drawerEvidence.limitations.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 6px" }}>
                  LIMITATIONS
                </p>
                <ul style={{ fontSize: 13, color: "var(--ink-secondary)", margin: 0, paddingLeft: 18 }}>
                  {drawerEvidence.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
            <a
              href={drawerEvidence.sourceUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, color: "var(--action)", display: "inline-block", marginTop: 16 }}
            >
              Open in repository →
            </a>
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
