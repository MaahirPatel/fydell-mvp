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

  const inProgress = candidates.filter((c) => c.status === "in_progress").length;
  const reportsReady = stats.completedReports;
  const feedbackNeeded = candidates.filter((c) => c.decision === "not_decided").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            Employer operating system
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              margin: 0,
            }}
          >
            Finance Hiring Overview
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "8px 0 0", maxWidth: 520 }}>
            Track candidate progress, review evidence, and prepare interviews.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/dashboard/simulations"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 40,
              padding: "0 16px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            View Work Trial
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      {loading ? (
        <KPISkeletons />
      ) : (
        <KPICards
          invited={stats.invitesSent}
          inProgress={inProgress}
          reportsReady={reportsReady}
          advanceRecommendations={stats.advanceRecommendations}
        />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
          gap: 16,
        }}
      >
        <div className="glass-card" style={{ padding: "22px 24px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--faint)",
              margin: "0 0 12px",
            }}
          >
            Active role summary
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            FP&A Analyst
          </h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
            Simulation: Project Meridian — FP&A Forecast Review
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginTop: 18,
            }}
          >
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                {stats.invitesSent}
              </p>
              <p style={{ fontSize: 12, color: "var(--faint)", margin: "2px 0 0" }}>Invited</p>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                {inProgress}
              </p>
              <p style={{ fontSize: 12, color: "var(--faint)", margin: "2px 0 0" }}>In progress</p>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>
                {reportsReady}
              </p>
              <p style={{ fontSize: 12, color: "var(--faint)", margin: "2px 0 0" }}>Reports ready</p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "16px 0 0" }}>
            Status: Active · No payment required to explore this workspace
          </p>
        </div>

        <div className="glass-card" style={{ padding: "22px 24px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--faint)",
              margin: "0 0 12px",
            }}
          >
            Next actions
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <li style={{ fontSize: 13, color: "var(--text)" }}>
              Invite candidates to Project Meridian
            </li>
            <li style={{ fontSize: 13, color: "var(--text)" }}>
              Review evidence reports as they complete
            </li>
            <li style={{ fontSize: 13, color: "var(--muted)" }}>
              Feedback needed: {feedbackNeeded || "—"}
            </li>
          </ul>
          <Link
            href="/dashboard/reports"
            style={{
              display: "inline-flex",
              marginTop: 18,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--blue)",
              textDecoration: "none",
            }}
          >
            Review reports →
          </Link>
        </div>
      </div>

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
