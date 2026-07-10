"use client";

import Link from "next/link";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { DemoReport } from "@/lib/dashboard-demo";

const SIGNAL_BADGE: Record<
  string,
  { bg: string; border: string; text: string; dot: string }
> = {
  strong: {
    bg: "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.28)",
    text: "var(--green)",
    dot: "var(--green)",
  },
  moderate: {
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.28)",
    text: "var(--warning)",
    dot: "var(--warning)",
  },
  weak: {
    bg: "rgba(248,113,113,0.10)",
    border: "rgba(248,113,113,0.28)",
    text: "var(--danger)",
    dot: "var(--danger)",
  },
};

const VERDICT_COLORS: Record<string, { color: string; bg: string }> = {
  go: { color: "var(--green)", bg: "rgba(52,211,153,0.10)" },
  hold: { color: "var(--warning)", bg: "rgba(245,158,11,0.10)" },
  revise: { color: "var(--blue)", bg: "rgba(37,99,255,0.10)" },
};

function ScoreArc({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color =
    score >= 80 ? "var(--green)" : score >= 65 ? "var(--warning)" : "var(--danger)";

  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
      <circle
        cx={45}
        cy={45}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={45} y={49} textAnchor="middle" fill="white" fontSize={18} fontWeight={700}>
        {score}
      </text>
    </svg>
  );
}

interface Props {
  report: DemoReport;
}

export function ReportDetail({ report }: Props) {
  const sig = SIGNAL_BADGE[report.overallSignal] ?? SIGNAL_BADGE.moderate;
  const verdictCfg = VERDICT_COLORS[report.verdict] ?? VERDICT_COLORS.hold;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Back */}
      <Link
        href="/dashboard/reports"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--muted)",
          textDecoration: "none",
          marginBottom: 24,
          transition: "color 120ms",
        }}
      >
        <ArrowLeft size={14} />
        All reports
      </Link>

      {/* ── Summary Header ── */}
      <div
        className="glass-card"
        style={{
          padding: "28px 32px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 28,
          flexWrap: "wrap",
        }}
      >
        <ScoreArc score={report.score} />

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <p className="eyebrow">Candidate report</p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: sig.bg,
                border: `1px solid ${sig.border}`,
                color: sig.text,
                borderRadius: 6,
                padding: "3px 9px",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: sig.dot,
                  display: "inline-block",
                }}
              />
              {report.overallSignal} signal
            </span>
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: "0 0 4px",
            }}
          >
            {report.candidateName}
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
            Junior FP&A Analyst · Project Meridian
          </p>
        </div>

        {/* Exec summary panel */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 20px",
            minWidth: 220,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--muted)",
              margin: "0 0 6px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Executive summary
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text)",
              fontWeight: 500,
              margin: "0 0 10px",
              lineHeight: 1.45,
            }}
          >
            {report.execSummary.headline}
          </p>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--muted)" }}>
            <div>
              <span style={{ color: "var(--text)", fontWeight: 700 }}>
                {report.execSummary.percentile}th
              </span>{" "}
              percentile
            </div>
            <div>
              Cohort avg{" "}
              <span style={{ color: "var(--text)", fontWeight: 700 }}>
                {report.execSummary.cohortAvg}
              </span>
            </div>
          </div>
        </div>

        {/* Verdict */}
        <div
          style={{
            background: verdictCfg.bg,
            border: `1px solid ${verdictCfg.color}33`,
            borderRadius: 14,
            padding: "16px 20px",
            textAlign: "center",
            minWidth: 100,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--muted)",
              margin: "0 0 4px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Candidate verdict
          </p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: verdictCfg.color,
              margin: 0,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
            }}
          >
            {report.verdict}
          </p>
        </div>
      </div>

      {/* ── Full Summary ── */}
      <Section title="Summary">
        <p
          style={{
            fontSize: 15,
            color: "rgba(226,232,240,0.82)",
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {report.summary}
        </p>
      </Section>

      {/* ── 6 Signal Cards ── */}
      <Section title="Signal Analysis">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {report.signalCards.map((card) => (
            <SignalCard key={card.label} card={card} />
          ))}
        </div>
      </Section>

      {/* ── Strengths + Risks ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Section title="Strengths" compact>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {report.strengths.map((s, i) => (
              <li key={i} style={{ display: "flex", gap: 8, fontSize: 13.5, color: "rgba(226,232,240,0.82)", lineHeight: 1.5 }}>
                <CheckCircle
                  size={14}
                  color="var(--green)"
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                {s}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Development areas" compact>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {report.risks.map((r, i) => (
              <li key={i} style={{ display: "flex", gap: 8, fontSize: 13.5, color: "rgba(226,232,240,0.82)", lineHeight: 1.5 }}>
                <AlertTriangle
                  size={14}
                  color="var(--warning)"
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                {r}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* ── Timeline ── */}
      <Section title="Session timeline">
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {report.timeline.map((evt, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 16,
                padding: "10px 0",
                borderBottom: i < report.timeline.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "var(--faint)",
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 44,
                  flexShrink: 0,
                }}
              >
                <Clock size={11} />
                {evt.time}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: stageColor(evt.stage),
                  minWidth: 100,
                  flexShrink: 0,
                  paddingTop: 1,
                }}
              >
                {evt.stage.replace("_", " ")}
              </div>
              <p style={{ fontSize: 13.5, color: "rgba(226,232,240,0.82)", margin: 0, lineHeight: 1.4 }}>
                {evt.event}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Final Memo ── */}
      <Section title="Final recommendation memo">
        <div
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--violet)",
            borderRadius: "0 10px 10px 0",
            padding: "20px 22px",
            fontSize: 13.5,
            color: "rgba(226,232,240,0.82)",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {report.finalMemo}
        </div>
      </Section>

      {/* ── Missed Signals ── */}
      {report.missedSignals.length > 0 && (
        <Section title="Missed signals">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {report.missedSignals.map((m, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(248,113,113,0.05)",
                  border: "1px solid rgba(248,113,113,0.16)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  gap: 12,
                }}
              >
                <XCircle size={16} color="var(--danger)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text)",
                      margin: "0 0 4px",
                    }}
                  >
                    {m.signal}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                    {m.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Interview Questions ── */}
      <Section title="Suggested interview questions">
        <ol
          style={{
            margin: 0,
            paddingLeft: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {report.interviewQuestions.map((q, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                color: "rgba(226,232,240,0.82)",
                lineHeight: 1.55,
              }}
            >
              {q}
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Compare Table ── */}
      <Section title="Cohort comparison">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
            background: "var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {[
            { label: "This candidate", value: report.score, sub: "score" },
            {
              label: "Percentile",
              value: `${report.compare.percentile}th`,
              sub: "in cohort",
            },
            { label: "Cohort average", value: report.compare.avgScore, sub: "score" },
            { label: "Top score", value: report.compare.topScore, sub: `of ${report.compare.n}` },
          ].map((col) => (
            <div
              key={col.label}
              style={{
                background: "var(--surface)",
                padding: "18px 20px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: "var(--text)",
                  margin: "0 0 4px",
                }}
              >
                {col.value}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                {col.label}
              </p>
              <p style={{ fontSize: 11, color: "var(--faint)", margin: "2px 0 0" }}>{col.sub}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className="glass-card"
      style={{
        padding: compact ? "20px 24px" : "24px 28px",
        marginBottom: 16,
      }}
    >
      <h3
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted)",
          margin: "0 0 16px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function SignalCard({
  card,
}: {
  card: {
    label: string;
    score: number;
    rationale: string;
    evidencePresent: boolean;
  };
}) {
  const color =
    card.score >= 80
      ? "var(--green)"
      : card.score >= 65
      ? "var(--warning)"
      : "var(--danger)";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          {card.label}
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {card.score}
        </span>
      </div>

      {/* Score bar */}
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.07)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${card.score}%`,
            background: color,
            borderRadius: 2,
            transition: "width 0.6s ease",
          }}
        />
      </div>

      <p
        style={{
          fontSize: 12.5,
          color: "var(--muted)",
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        {card.rationale}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          color: card.evidencePresent ? "var(--green)" : "var(--danger)",
        }}
      >
        {card.evidencePresent ? (
          <CheckCircle size={11} />
        ) : (
          <XCircle size={11} />
        )}
        {card.evidencePresent ? "Evidence captured" : "Evidence not found"}
      </div>
    </div>
  );
}

function stageColor(stage: string) {
  const map: Record<string, string> = {
    brief: "var(--cyan)",
    data_room: "var(--blue)",
    forecast: "var(--violet)",
    assumptions: "var(--warning)",
    manager_update: "var(--danger)",
    recommendation: "var(--green)",
  };
  return map[stage] ?? "var(--muted)";
}

