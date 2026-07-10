"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Beaker,
  Users,
  FileText,
  Settings,
  Plus,
  X,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/simulations", label: "Simulations", icon: Beaker },
  { href: "/dashboard/candidates", label: "Candidates", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface InviteForm {
  name: string;
  email: string;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState<InviteForm>({ name: "", email: "" });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function sendInvite() {
    if (!form.email.trim()) { setErr("Email is required."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/mvp/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          simulationId: "sim-meridian-001",
          candidateName: form.name || null,
          candidateEmail: form.email,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.token) {
        setInviteLink(`${window.location.origin}/workroom/${data.token}`);
      } else {
        // Demo fallback — generate a local preview link
        const fakeToken = `demo-${Math.random().toString(36).slice(2, 10)}`;
        setInviteLink(`${window.location.origin}/workroom/${fakeToken}`);
      }
    } catch {
      const fakeToken = `demo-${Math.random().toString(36).slice(2, 10)}`;
      setInviteLink(`${window.location.origin}/workroom/${fakeToken}`);
    }
    setBusy(false);
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeModal() {
    setInviteOpen(false);
    setForm({ name: "", email: "" });
    setInviteLink(null);
    setErr(null);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          background: "rgba(11,16,26,0.97)",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: "linear-gradient(135deg, var(--blue) 0%, var(--violet) 100%)",
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "-0.04em",
            }}
          >
            F
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", color: "var(--text)" }}>
            Fydell
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 10px" }}>
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  marginBottom: 2,
                  color: active ? "var(--text)" : "var(--muted)",
                  background: active
                    ? "rgba(124,61,255,0.12)"
                    : "transparent",
                  border: active ? "1px solid rgba(124,61,255,0.18)" : "1px solid transparent",
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 400,
                  textDecoration: "none",
                  transition: "all 140ms",
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border)",
            fontSize: 11,
            color: "var(--faint)",
          }}
        >
          FP&A MVP · Project Meridian
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            height: 58,
            borderBottom: "1px solid var(--border)",
            background: "rgba(11,16,26,0.94)",
            backdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: "var(--muted)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "4px 10px",
              }}
            >
              Acme Financial Group
            </span>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="platform-btn-primary"
            style={{
              fontSize: 13,
              padding: "0 16px",
              height: 36,
              gap: 6,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <Plus size={14} />
            Invite candidate
          </button>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          {children}
        </main>
      </div>

      {/* ── Invite Modal ── */}
      {inviteOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="glass-card"
            style={{ width: "100%", maxWidth: 460, padding: "28px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
              }}
            >
              <div>
                <p className="eyebrow" style={{ marginBottom: 8 }}>
                  Project Meridian
                </p>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                  Invite candidate
                </h2>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {!inviteLink ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: 6,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Candidate name
                  </label>
                  <input
                    className="platform-input"
                    type="text"
                    placeholder="Alex Chen"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    style={{ fontSize: 14 }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: 6,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Email address
                  </label>
                  <input
                    className="platform-input"
                    type="email"
                    placeholder="candidate@company.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    style={{ fontSize: 14 }}
                  />
                </div>
                {err && (
                  <p style={{ fontSize: 13, color: "var(--danger)", margin: 0 }}>{err}</p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 4,
                  }}
                >
                  <button
                    onClick={sendInvite}
                    disabled={busy}
                    className="platform-btn-primary"
                    style={{ flex: 1, fontSize: 14, height: 42 }}
                  >
                    {busy ? "Generating link…" : "Generate invite link"}
                  </button>
                  <button
                    onClick={closeModal}
                    className="platform-btn-ghost"
                    style={{ fontSize: 14, height: 42 }}
                  >
                    Cancel
                  </button>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--faint)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  The candidate receives a unique link to the 25-minute FP&A workroom.
                  Results are automatically scored on submission.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    background: "rgba(52,211,153,0.08)",
                    border: "1px solid rgba(52,211,153,0.24)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Check size={14} color="var(--green)" />
                  <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>
                    Invite link generated
                  </span>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--muted)",
                      marginBottom: 6,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Candidate link
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      background: "rgba(5,8,18,0.72)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      fontSize: 12,
                      color: "var(--muted)",
                      wordBreak: "break-all",
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ flex: 1 }}>{inviteLink}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={copyLink}
                    className="platform-btn-primary"
                    style={{
                      flex: 1,
                      fontSize: 13,
                      height: 40,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                  <a
                    href={inviteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="platform-btn-ghost"
                    style={{
                      fontSize: 13,
                      height: 40,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={13} />
                    Preview
                  </a>
                  <button
                    onClick={closeModal}
                    className="platform-btn-ghost"
                    style={{ fontSize: 13, height: 40 }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
