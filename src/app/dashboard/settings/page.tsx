"use client";

import { User, Building, Bell, Shield, CreditCard } from "lucide-react";

const SECTIONS = [
  {
    icon: <Building size={18} />,
    title: "Workspace",
    description: "Company name, branding, and team members.",
    badge: "Acme Financial Group",
  },
  {
    icon: <User size={18} />,
    title: "Profile",
    description: "Your name, email, and login credentials.",
    badge: null,
  },
  {
    icon: <Bell size={18} />,
    title: "Notifications",
    description: "Email alerts when candidates submit or are scored.",
    badge: "On",
  },
  {
    icon: <Shield size={18} />,
    title: "Security",
    description: "Two-factor authentication and session management.",
    badge: null,
  },
  {
    icon: <CreditCard size={18} />,
    title: "Billing",
    description: "Subscription plan, usage, and invoices.",
    badge: "Starter",
  },
];

export default function SettingsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 680 }}>
      {/* Header */}
      <div>
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          Settings
        </p>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            margin: "0 0 4px",
          }}
        >
          Workspace settings
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
          Manage your workspace preferences and account.
        </p>
      </div>

      <div className="glass-card" style={{ overflow: "hidden" }}>
        {SECTIONS.map((s, i) => (
          <div
            key={s.title}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 24px",
              borderBottom: i < SECTIONS.length - 1 ? "1px solid var(--border)" : "none",
              cursor: "pointer",
              transition: "background 120ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(124,61,255,0.10)",
                  border: "1px solid rgba(124,61,255,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--violet)",
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>
                  {s.title}
                </p>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0" }}>
                  {s.description}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {s.badge && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--muted)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "3px 8px",
                  }}
                >
                  {s.badge}
                </span>
              )}
              <span style={{ color: "var(--faint)", fontSize: 13 }}>→</span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--faint)",
          padding: "0 4px",
          lineHeight: 1.5,
        }}
      >
        Fydell FP&A MVP · Version 0.1 · Settings fully configurable in production.
      </div>
    </div>
  );
}
