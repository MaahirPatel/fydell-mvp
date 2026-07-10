"use client";

import Link from "next/link";
import { BarChart2, ChevronRight } from "lucide-react";
import { DEMO_REPORTS } from "@/lib/dashboard-demo";

const SIGNAL_CONFIG = {
  strong: { bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.28)", text: "var(--green)" },
  moderate: {
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.28)",
    text: "var(--warning)",
  },
  weak: { bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.28)", text: "var(--danger)" },
};

const VERDICT_COLORS: Record<string, string> = {
  go: "var(--green)",
  hold: "var(--warning)",
  revise: "var(--blue)",
};

export default function ReportsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          Reports
        </p>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            margin: "0 0 4px",
          }}
        >
          Candidate reports
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
          {DEMO_REPORTS.length} report{DEMO_REPORTS.length !== 1 ? "s" : ""} generated ·
          Project Meridian
        </p>
      </div>

      {/* Report cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {DEMO_REPORTS.map((report) => {
          const sig =
            SIGNAL_CONFIG[report.overallSignal] ?? SIGNAL_CONFIG.moderate;
          return (
            <Link
              key={report.id}
              href={`/dashboard/reports/${report.candidateId}`}
              style={{ textDecoration: "none" }}
            >
              <div
                className="glass-card"
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  cursor: "pointer",
                  transition: "border-color 150ms",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--blue), var(--violet))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {report.candidateName.charAt(0)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      {report.candidateName}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: sig.bg,
                        border: `1px solid ${sig.border}`,
                        color: sig.text,
                        borderRadius: 5,
                        padding: "2px 7px",
                      }}
                    >
                      {report.overallSignal}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                    Junior FP&A Analyst · Project Meridian
                  </p>
                </div>

                {/* Score */}
                <div style={{ textAlign: "center", minWidth: 52 }}>
                  <p
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      color: "var(--text)",
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    {report.score}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--faint)", margin: "3px 0 0" }}>
                    score
                  </p>
                </div>

                {/* Verdict */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: VERDICT_COLORS[report.verdict] ?? "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    minWidth: 52,
                    textAlign: "center",
                  }}
                >
                  {report.verdict}
                </div>

                {/* CTA */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--blue)",
                  }}
                >
                  <BarChart2 size={14} />
                  View report
                  <ChevronRight size={14} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
