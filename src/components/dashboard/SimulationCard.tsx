"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Users, ExternalLink, Plus, Check, Copy } from "lucide-react";

interface Props {
  id: string;
  title: string;
  role: string;
  industry: string;
  durationMinutes: number;
  difficulty: string;
  status: "active" | "draft" | "archived";
  totalInvites: number;
  completedAttempts: number;
}

export function SimulationCard({
  id,
  title,
  role,
  industry,
  durationMinutes,
  difficulty,
  status,
  totalInvites,
  completedAttempts,
}: Props) {
  const [inviting, setInviting] = useState(false);
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    setInviting(true);
    try {
      const res = await fetch("/api/mvp/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ simulationId: id }),
      });
      const data = await res.json().catch(() => ({}));
      const token = data.token || data.invite?.token;
      if (!token) {
        setPreviewLink(null);
        setInviting(false);
        return;
      }
      const link = `${window.location.origin}/workroom/${token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      setPreviewLink(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setPreviewLink(null);
    }
    setInviting(false);
  }

  return (
    <div
      className="glass-card spotlight-card"
      style={{ padding: "24px", maxWidth: 480 }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "linear-gradient(135deg, rgba(37,99,255,0.18) 0%, rgba(124,61,255,0.22) 100%)",
            border: "1px solid rgba(124,61,255,0.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          📊
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: status === "active" ? "var(--green)" : "var(--muted)",
            background:
              status === "active" ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${status === "active" ? "rgba(52,211,153,0.26)" : "var(--border)"}`,
            borderRadius: 6,
            padding: "3px 8px",
          }}
        >
          {status === "active" ? "● Active" : status}
        </span>
      </div>

      {/* Info */}
      <p className="eyebrow" style={{ marginBottom: 8 }}>
        {industry}
      </p>
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>{role}</p>

      {/* Meta */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        <span
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <Clock size={12} />
          {durationMinutes} min
        </span>
        <span
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <Users size={12} />
          {totalInvites} invited · {completedAttempts} completed
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--violet)",
          }}
        >
          {difficulty}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleInvite}
          disabled={inviting}
          className="platform-btn-primary"
          style={{
            fontSize: 13,
            height: 38,
            flex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {inviting ? (
            "Generating…"
          ) : copied ? (
            <>
              <Check size={13} /> Link copied
            </>
          ) : (
            <>
              <Plus size={13} /> Invite candidate
            </>
          )}
        </button>
        <Link
          href="/workroom/demo"
          className="platform-btn-ghost"
          style={{
            fontSize: 13,
            height: 38,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            textDecoration: "none",
            padding: "0 14px",
          }}
        >
          <ExternalLink size={12} />
          Preview
        </Link>
      </div>

      {previewLink && (
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: "var(--faint)",
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <Check size={11} color="var(--green)" />
          <span style={{ wordBreak: "break-all" }}>Link ready: {previewLink}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(previewLink).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <Copy size={11} color="var(--muted)" />
          </button>
        </div>
      )}
    </div>
  );
}
