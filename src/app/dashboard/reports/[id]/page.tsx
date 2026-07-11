"use client";

import { use, useEffect, useState } from "react";
import { ReportDetail } from "@/components/dashboard/ReportDetail";
import { DEMO_REPORTS, type DemoReport } from "@/lib/dashboard-demo";

interface PageProps {
  params: Promise<{ id: string }>;
}

function mapAttemptToDemoReport(data: {
  attempt: {
    id: string;
    candidate_name: string | null;
    candidate_email: string | null;
    score: number | null;
    score_json: Record<string, number> | null;
    report_json: {
      overall_signal?: string;
      summary?: string;
      strengths?: string[];
      risks?: string[];
      evidence?: string[];
      interview_questions?: string[];
    } | null;
    final_recommendation: string | null;
    submitted_at: string | null;
    started_at: string | null;
  };
  report: {
    overall_signal?: string | null;
    summary?: string | null;
    strengths_json?: string[];
    risks_json?: string[];
    interview_questions_json?: string[];
  } | null;
  simulation: { role?: string } | null;
  events: Array<{ event_type: string; created_at: string }>;
}): DemoReport {
  const a = data.attempt;
  const rj = a.report_json ?? {};
  const signal = (rj.overall_signal ??
    data.report?.overall_signal ??
    "weak") as DemoReport["overallSignal"];
  const score = a.score ?? 0;
  const strengths = rj.strengths ?? data.report?.strengths_json ?? [];
  const risks = rj.risks ?? data.report?.risks_json ?? [];
  const scoreJson = a.score_json ?? {};

  const signalCards = Object.entries(scoreJson).map(([label, value]) => ({
    label: label.replace(/_/g, " "),
    score: Number(value) || 0,
    rationale: "Derived from the candidate’s submitted recommendation and work events.",
    evidencePresent: true,
  }));

  const started = a.started_at ? new Date(a.started_at).getTime() : null;
  const timeline = (data.events ?? []).map((e) => {
    const mins =
      started != null
        ? Math.max(0, Math.round((new Date(e.created_at).getTime() - started) / 60000))
        : 0;
    return {
      time: `${mins}:00`,
      event: e.event_type.replace(/_/g, " "),
      stage: e.event_type.includes("recommendation")
        ? "recommendation"
        : e.event_type.includes("assumption")
          ? "assumptions"
          : "work",
    };
  });

  const memo = a.final_recommendation ?? "";
  const verdict: DemoReport["verdict"] = /revise/i.test(memo)
    ? "revise"
    : /go\b/i.test(memo) && !/hold/i.test(memo)
      ? "go"
      : "hold";

  return {
    id: a.id,
    candidateId: a.id,
    candidateName: a.candidate_name ?? a.candidate_email ?? "Candidate",
    overallSignal: signal === "insufficient" ? "weak" : signal,
    score,
    verdict,
    summary: rj.summary ?? data.report?.summary ?? "Evidence report ready.",
    execSummary: {
      headline: `${signal.toUpperCase()} signal — review evidence before advancing`,
      signalLabel: signal.toUpperCase(),
      percentile: Math.min(99, Math.max(5, score)),
      cohortAvg: 70,
    },
    signalCards:
      signalCards.length > 0
        ? signalCards
        : [
            {
              label: "Overall",
              score,
              rationale: "Preliminary simulation signal from submitted work.",
              evidencePresent: true,
            },
          ],
    strengths,
    risks,
    timeline:
      timeline.length > 0
        ? timeline
        : [{ time: "0:00", event: "Simulation completed", stage: "recommendation" }],
    finalMemo: memo,
    missedSignals: risks.slice(0, 3).map((r) => ({
      signal: "Gap",
      description: r,
    })),
    interviewQuestions:
      rj.interview_questions ?? data.report?.interview_questions_json ?? [],
    compare: {
      percentile: Math.min(99, Math.max(5, score)),
      avgScore: 70,
      topScore: Math.max(score, 84),
      n: 1,
    },
  };
}

export default function ReportPage({ params }: PageProps) {
  const { id } = use(params);
  const [report, setReport] = useState<DemoReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/mvp/attempts/${id}/report`);
        if (res.ok) {
          const data = await res.json();
          setReport(mapAttemptToDemoReport(data));
          setLoading(false);
          return;
        }
      } catch {
        // fall through
      }

      const demo =
        DEMO_REPORTS.find((r) => r.candidateId === id || r.id === id) ?? null;
      if (demo) setReport(demo);
      else setMissing(true);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 40, color: "var(--muted)", fontSize: 14 }}>Loading report…</div>
    );
  }
  if (missing || !report) {
    return (
      <div style={{ padding: 40, color: "var(--muted)", fontSize: 14 }}>
        Report not found. Complete a work trial first, then open it from Reports.
      </div>
    );
  }

  return <ReportDetail report={report} />;
}
