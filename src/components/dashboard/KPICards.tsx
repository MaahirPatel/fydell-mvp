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
  activeSimulations: number;
  invitesSent: number;
  completedReports: number;
  advanceRecommendations: number;
}

export function KPICards({
  activeSimulations,
  invitesSent,
  completedReports,
  advanceRecommendations,
}: Props) {
  const kpis: KPI[] = [
    {
      label: "Active simulation",
      value: activeSimulations,
      sub: "Project Meridian",
      icon: <TrendingUp size={18} />,
      accent: "var(--blue)",
    },
    {
      label: "Invites sent",
      value: invitesSent,
      sub: "last 30 days",
      icon: <Send size={18} />,
      accent: "var(--violet)",
    },
    {
      label: "Completed reports",
      value: completedReports,
      sub: `of ${invitesSent} invited`,
      icon: <FileCheck size={18} />,
      accent: "var(--cyan)",
    },
    {
      label: "Advance recommendations",
      value: advanceRecommendations,
      sub: `${completedReports > 0 ? Math.round((advanceRecommendations / completedReports) * 100) : 0}% advance rate`,
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
