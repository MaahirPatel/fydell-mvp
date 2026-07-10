"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KPICards } from "@/components/dashboard/KPICards";
import { CandidateTable } from "@/components/dashboard/CandidateTable";
import { DEMO_CANDIDATES, DEMO_STATS, type DemoCandidate } from "@/lib/dashboard-demo";

export default function DashboardOverview() {
  const [candidates, setCandidates] = useState<DemoCandidate[]>([]);
  const [stats, setStats] = useState(DEMO_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Show demo data immediately so the overview never looks empty while auth/API resolves.
    setCandidates(DEMO_CANDIDATES);
    setStats(DEMO_STATS);
    setLoading(false);

    async function load() {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch("/api/mvp/dashboard", { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!data.attempts?.length || cancelled) return;
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
              (a.report_json?.overall_signal as "strong" | "moderate" | "weak") ??
              "weak",
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
        if (cancelled) return;
        setCandidates(mapped);
        setStats({
          activeSimulations: data.stats?.totalSimulations ?? 1,
          invitesSent: data.stats?.totalInvites ?? 0,
          completedReports: data.stats?.completedAttempts ?? 0,
          advanceRecommendations: mapped.filter((c) => c.decision === "advance").length,
        });
      } catch {
        // Keep demo data
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Page header */}
      <div>
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          Employer dashboard
        </p>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            margin: 0,
          }}
        >
          Overview
        </h1>
      </div>

      {/* KPI cards */}
      {loading ? (
        <KPISkeletons />
      ) : (
        <KPICards
          activeSimulations={stats.activeSimulations}
          invitesSent={stats.invitesSent}
          completedReports={stats.completedReports}
          advanceRecommendations={stats.advanceRecommendations}
        />
      )}

      {/* Recent candidates */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <h2
              style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}
            >
              Recent candidates
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>
              Project Meridian · FP&A Forecast Review
            </p>
          </div>
          <Link
            href="/dashboard/candidates"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--blue)",
              textDecoration: "none",
            }}
          >
            View all →
          </Link>
        </div>
        <CandidateTable candidates={loading ? [] : candidates.slice(0, 5)} />
      </div>
    </div>
  );
}

function KPISkeletons() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card"
          style={{
            height: 120,
            background: "rgba(255,255,255,0.02)",
            animation: "fydell-pulse 1.6s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}
