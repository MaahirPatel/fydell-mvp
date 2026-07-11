"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DEMO_REPORTS } from "@/lib/dashboard-demo";

const SIGNAL_CONFIG = {
  strong: { bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.28)", text: "var(--green)" },
  moderate: {
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.28)",
    text: "var(--warning)",
  },
  weak: { bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.28)", text: "var(--danger)" },
  insufficient: {
    bg: "rgba(248,113,113,0.10)",
    border: "rgba(248,113,113,0.28)",
    text: "var(--danger)",
  },
};

type ReportRow = {
  id: string;
  candidateId: string;
  candidateName: string;
  overallSignal: "strong" | "moderate" | "weak" | "insufficient";
  score: number;
  summary: string;
  submittedAt: string;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mvp/dashboard");
        if (res.ok) {
          const data = await res.json();
          const rows: ReportRow[] = (data.attempts ?? [])
            .filter(
              (a: { status: string; report_json?: { summary?: string } | null }) =>
                a.status === "submitted" || a.status === "reviewed" || a.report_json
            )
            .map(
              (a: {
                id: string;
                candidate_name: string | null;
                candidate_email: string | null;
                score: number | null;
                report_json: {
                  overall_signal?: string;
                  summary?: string;
                } | null;
                submitted_at: string | null;
              }) => ({
                id: a.id,
                candidateId: a.id,
                candidateName: a.candidate_name ?? a.candidate_email ?? "Candidate",
                overallSignal: (a.report_json?.overall_signal as ReportRow["overallSignal"]) ?? "weak",
                score: a.score ?? 0,
                summary: a.report_json?.summary ?? "Evidence report ready.",
                submittedAt: a.submitted_at ?? "",
              })
            );
          setReports(rows);
          setUsingDemo(false);
          setLoading(false);
          return;
        }
      } catch {
        // fall through to demo
      }
      setReports(
        DEMO_REPORTS.map((r) => ({
          id: r.id,
          candidateId: r.candidateId,
          candidateName: r.candidateName,
          overallSignal: r.overallSignal,
          score: r.score,
          summary: r.summary,
          submittedAt: "",
        }))
      );
      setUsingDemo(true);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
          {loading
            ? "Loading…"
            : `${reports.length} report${reports.length !== 1 ? "s" : ""} · Project Meridian`}
          {usingDemo ? " · sample data" : ""}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {!loading && reports.length === 0 ? (
          <div className="glass-card" style={{ padding: "28px 24px" }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
              No reports yet. Invite a candidate, have them complete Project Meridian, and the
              evidence report will appear here.
            </p>
          </div>
        ) : null}
        {reports.map((report) => {
          const sig = SIGNAL_CONFIG[report.overallSignal] ?? SIGNAL_CONFIG.moderate;
          return (
            <Link
              key={report.id}
              href={`/dashboard/reports/${report.candidateId}`}
              style={{ textDecoration: "none" }}
            >
              <div
                className="glass-card"
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 650,
                        color: "var(--text)",
                      }}
                    >
                      {report.candidateName}
                    </p>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: sig.bg,
                        border: `1px solid ${sig.border}`,
                        color: sig.text,
                      }}
                    >
                      {report.overallSignal}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 640,
                    }}
                  >
                    {report.summary}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--text)",
                    }}
                  >
                    {report.score}
                  </span>
                  <ChevronRight size={16} color="var(--faint)" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
