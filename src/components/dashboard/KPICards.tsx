"use client";

import { TrendingUp, Send, FileCheck, ThumbsUp } from "lucide-react";

interface KPI {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}

interface Props {
  invited: number;
  inProgress: number;
  reportsReady: number;
  advanceRecommendations: number;
}

export function KPICards({
  invited,
  inProgress,
  reportsReady,
  advanceRecommendations,
}: Props) {
  const kpis: KPI[] = [
    {
      label: "Candidates invited",
      value: invited,
      sub: "Across the active FP&A role",
      icon: <Send size={18} />,
      accent: "var(--blue)",
    },
    {
      label: "In progress",
      value: inProgress,
      sub: "Work trial underway",
      icon: <TrendingUp size={18} />,
      accent: "var(--violet)",
    },
    {
      label: "Reports ready",
      value: reportsReady,
      sub: "Evidence available to review",
      icon: <FileCheck size={18} />,
      accent: "var(--cyan)",
    },
    {
      label: "Recommended to advance",
      value: advanceRecommendations,
      sub: "Based on completed work",
      icon: <ThumbsUp size={18} />,
      accent: "var(--green)",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
      }}
    >
      {kpis.map((k) => (
        <div
          key={k.label}
          className="glass-card"
          style={{
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `color-mix(in srgb, ${k.accent} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${k.accent} 28%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: k.accent,
            }}
          >
            {k.icon}
          </div>
          <div>
            <p
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                color: "var(--text)",
                margin: 0,
                lineHeight: 1,
              }}
            >
              {k.value}
            </p>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text)",
                margin: "4px 0 0",
              }}
            >
              {k.label}
            </p>
            {k.sub && (
              <p style={{ fontSize: 12, color: "var(--faint)", margin: "2px 0 0" }}>
                {k.sub}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
