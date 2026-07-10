"use client";

import { useEffect, useState } from "react";
import { CandidateTable } from "@/components/dashboard/CandidateTable";
import { DEMO_CANDIDATES, type DemoCandidate } from "@/lib/dashboard-demo";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<DemoCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mvp/dashboard");
        if (res.ok) {
          const data = await res.json();
          if (data.attempts?.length) {
            const mapped: DemoCandidate[] = data.attempts.map(
              (a: {
                id: string;
                candidate_name: string | null;
                candidate_email: string | null;
                status: string;
                hiring_decision: string;
                score: number | null;
                report_json: { overall_signal?: string } | null;
                started_at: string | null;
                submitted_at: string | null;
              }) => ({
                id: a.id,
                name: a.candidate_name ?? a.candidate_email ?? "Candidate",
                email: a.candidate_email ?? "",
                role: "FP&A Analyst",
                status: a.status,
                decision: a.hiring_decision,
                score: a.score ?? 0,
                signal:
                  (a.report_json?.overall_signal as "strong" | "moderate" | "weak") ?? "weak",
                completionMins:
                  a.submitted_at && a.started_at
                    ? Math.round(
                        (new Date(a.submitted_at).getTime() -
                          new Date(a.started_at).getTime()) /
                          60000
                      )
                    : 0,
                submittedAt: a.submitted_at ?? "",
                verdict: null,
                flags: 0,
                modelEdits: 0,
              })
            );
            setCandidates(mapped);
            setLoading(false);
            return;
          }
        }
      } catch {
        // fallthrough
      }
      setCandidates(DEMO_CANDIDATES);
      setLoading(false);
    }
    load();
  }, []);

  const FILTERS = [
    { label: "All", value: "all" },
    { label: "Reviewed", value: "reviewed" },
    { label: "Submitted", value: "submitted" },
    { label: "In progress", value: "in_progress" },
  ];

  const filtered =
    filter === "all" ? candidates : candidates.filter((c) => c.status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            Candidates
          </p>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              margin: "0 0 4px",
            }}
          >
            All candidates
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} · Project Meridian
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4 }}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const count =
            f.value === "all"
              ? candidates.length
              : candidates.filter((c) => c.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--text)" : "var(--muted)",
                background: active ? "rgba(255,255,255,0.07)" : "transparent",
                border: `1px solid ${active ? "var(--border-strong)" : "transparent"}`,
                borderRadius: 8,
                padding: "5px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {f.label}
              <span
                style={{
                  fontSize: 11,
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  color: "var(--muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
            Loading candidates…
          </div>
        ) : (
          <CandidateTable candidates={filtered} />
        )}
      </div>
    </div>
  );
}
