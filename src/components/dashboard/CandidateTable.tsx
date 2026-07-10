"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock, BarChart2 } from "lucide-react";
import type { DemoCandidate } from "@/lib/dashboard-demo";

const SIGNAL_COLORS = {
  strong: { bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.28)", text: "var(--green)" },
  moderate: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)", text: "var(--warning)" },
  weak: { bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.28)", text: "var(--danger)" },
};

const STATUS_COLORS = {
  reviewed: { bg: "rgba(52,211,153,0.08)", text: "var(--green)", label: "Reviewed" },
  submitted: { bg: "rgba(37,99,255,0.10)", text: "var(--blue)", label: "Submitted" },
  in_progress: { bg: "rgba(245,158,11,0.10)", text: "var(--warning)", label: "In progress" },
  not_started: { bg: "rgba(255,255,255,0.05)", text: "var(--muted)", label: "Not started" },
};

const DECISION_CONFIG = {
  advance: { label: "Advance", color: "var(--green)", border: "rgba(52,211,153,0.3)" },
  hold: { label: "Hold", color: "var(--warning)", border: "rgba(245,158,11,0.3)" },
  reject: { label: "Reject", color: "var(--danger)", border: "rgba(248,113,113,0.3)" },
  not_decided: { label: "—", color: "var(--faint)", border: "var(--border)" },
  offer: { label: "Offer", color: "var(--cyan)", border: "rgba(46,211,208,0.3)" },
  hired: { label: "Hired", color: "#a78bfa", border: "rgba(167,139,250,0.3)" },
};

interface Props {
  candidates: DemoCandidate[];
  onDecision?: (candidateId: string, decision: "advance" | "hold" | "reject") => void;
}

export function CandidateTable({ candidates, onDecision }: Props) {
  const [decisions, setDecisions] = useState<Record<string, string>>({});

  function handleDecision(id: string, decision: "advance" | "hold" | "reject") {
    setDecisions((prev) => ({ ...prev, [id]: decision }));
    onDecision?.(id, decision);
  }

  if (candidates.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px",
          color: "var(--muted)",
          fontSize: 14,
        }}
      >
        No candidates yet. Invite your first candidate to get started.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {[
              "Candidate",
              "Status",
              "Signal",
              "Score",
              "Decision",
              "Time",
              "",
            ].map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--faint)",
                  borderBottom: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map((c, i) => {
            const sig = c.signal in SIGNAL_COLORS ? SIGNAL_COLORS[c.signal] : SIGNAL_COLORS.weak;
            const stat =
              c.status in STATUS_COLORS
                ? STATUS_COLORS[c.status as keyof typeof STATUS_COLORS]
                : STATUS_COLORS.not_started;
            const effectiveDecision = (decisions[c.id] ?? c.decision) as keyof typeof DECISION_CONFIG;
            const dec = DECISION_CONFIG[effectiveDecision] ?? DECISION_CONFIG.not_decided;
            const canDecide = c.status === "submitted" || c.status === "reviewed";

            return (
              <tr
                key={c.id}
                style={{
                  borderBottom:
                    i < candidates.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                {/* Candidate */}
                <td style={{ padding: "14px 14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, var(--blue), var(--violet))`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text)",
                          margin: 0,
                          lineHeight: 1.2,
                        }}
                      >
                        {c.name}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          margin: "2px 0 0",
                        }}
                      >
                        {c.role}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td style={{ padding: "14px 14px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: stat.bg,
                      color: stat.text,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      borderRadius: 6,
                      padding: "3px 8px",
                    }}
                  >
                    {stat.label}
                  </span>
                </td>

                {/* Signal */}
                <td style={{ padding: "14px 14px" }}>
                  {c.status !== "in_progress" && c.score > 0 ? (
                    <span
                      style={{
                        display: "inline-block",
                        background: sig.bg,
                        border: `1px solid ${sig.border}`,
                        color: sig.text,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      {c.signal}
                    </span>
                  ) : (
                    <span style={{ color: "var(--faint)", fontSize: 13 }}>—</span>
                  )}
                </td>

                {/* Score */}
                <td style={{ padding: "14px 14px" }}>
                  {c.score > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 40,
                          height: 5,
                          borderRadius: 3,
                          background: "rgba(255,255,255,0.08)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${c.score}%`,
                            background:
                              c.score >= 80
                                ? "var(--green)"
                                : c.score >= 65
                                ? "var(--warning)"
                                : "var(--danger)",
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {c.score}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: "var(--faint)", fontSize: 13 }}>—</span>
                  )}
                </td>

                {/* Decision */}
                <td style={{ padding: "14px 14px" }}>
                  {canDecide ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      {(["advance", "hold", "reject"] as const).map((d) => {
                        const cfg = DECISION_CONFIG[d];
                        const isActive = effectiveDecision === d;
                        return (
                          <button
                            key={d}
                            onClick={() => handleDecision(c.id, d)}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: "0.04em",
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: `1px solid ${isActive ? cfg.border : "var(--border)"}`,
                              background: isActive
                                ? `color-mix(in srgb, ${cfg.color} 12%, transparent)`
                                : "transparent",
                              color: isActive ? cfg.color : "var(--muted)",
                              cursor: "pointer",
                              transition: "all 120ms",
                              textTransform: "capitalize",
                            }}
                          >
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: 13,
                        color: dec.color,
                        fontWeight: dec.label === "—" ? 400 : 600,
                      }}
                    >
                      {dec.label}
                    </span>
                  )}
                </td>

                {/* Time */}
                <td style={{ padding: "14px 14px" }}>
                  {c.completionMins > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 13,
                        color: "var(--muted)",
                      }}
                    >
                      <Clock size={12} />
                      {c.completionMins}m
                    </div>
                  ) : (
                    <span style={{ color: "var(--faint)", fontSize: 13 }}>—</span>
                  )}
                </td>

                {/* Actions */}
                <td style={{ padding: "14px 14px" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {c.status !== "in_progress" && c.score > 0 && (
                      <Link
                        href={`/dashboard/reports/${c.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--blue)",
                          textDecoration: "none",
                          padding: "5px 10px",
                          borderRadius: 7,
                          border: "1px solid rgba(37,99,255,0.22)",
                          background: "rgba(37,99,255,0.07)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <BarChart2 size={12} />
                        View report
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/candidates`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        color: "var(--faint)",
                        textDecoration: "none",
                      }}
                    >
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
