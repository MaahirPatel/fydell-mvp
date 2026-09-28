"use client";

import Link from "next/link";
import "@/styles/marketing-v2.css";
import { Nav, Footer } from "@/components/marketing/v2/MarketingV2Shared";

/* ============================================================================
   Developers page — for engineers.
   Linear format, Cursor copy (short), Stripe color.
   Visuals show the candidate perspective: starting, proving, owning, sharing.
   ========================================================================== */

/* Hero visual: incident brief — the candidate's starting point */
function IncidentBriefVisual() {
  return (
    <div className="mk-visual" style={{ marginTop: 48 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
        </div>
        <span style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginLeft: 8 }}>
          harbor-webhooks / retry-safe-jobs · Simulation brief
        </span>
        <span style={{
          marginLeft: "auto",
          fontSize: 12, fontWeight: 500,
          color: "var(--mk-amber)", background: "#FEF3E2",
          padding: "4px 12px", borderRadius: 999,
        }}>
          45:00 remaining
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", minHeight: 300 }}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-tertiary)", letterSpacing: "0.05em", marginBottom: 12 }}>
            INCIDENT BRIEF
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, letterSpacing: "-0.01em" }}>
            Webhook receipts are sending twice on retry
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--mk-text-secondary)", margin: "0 0 16px" }}>
            Customers report duplicate receipts after network blips. The retry logic in
            <span style={{ fontFamily: "monospace", background: "var(--mk-surface-warm)", padding: "2px 6px", borderRadius: 4 }}> worker.py </span>
            re-sends instead of checking first. Fix it. Tests must pass.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Python", "12 tests", "AI patch included"].map((tag) => (
              <span key={tag} style={{
                fontSize: 12, fontWeight: 500,
                background: "var(--mk-surface-warm)",
                border: "1px solid var(--mk-border)",
                padding: "4px 12px", borderRadius: 999,
                color: "var(--mk-text-secondary)",
              }}>
                {tag}
              </span>
            ))}
          </div>
          <div style={{
            marginTop: 20, padding: 12, borderRadius: 8,
            background: "#E6F4F2", border: "1px solid #C9E8E3",
            fontSize: 13, color: "var(--mk-teal)",
          }}>
            Recording disclosed: test runs and file changes are recorded. Nothing else.
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--mk-border)", padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>What gets recorded</div>
          {[
            ["Test runs", "Every run, pass or fail"],
            ["File changes", "Diffs at submit time"],
            ["Timing", "Start, submit, duration"],
          ].map(([title, desc]) => (
            <div key={title} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--mk-green)", fontSize: 12 }}>●</span> {title}
              </div>
              <div style={{ fontSize: 12, color: "var(--mk-text-tertiary)", marginLeft: 18 }}>{desc}</div>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, marginTop: 16 }}>What never is</div>
          {["Browsing", "Other windows", "Keystrokes"].map((t) => (
            <div key={t} style={{ fontSize: 13, color: "var(--mk-text-secondary)", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ color: "var(--mk-text-tertiary)", fontSize: 12 }}>○</span> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Section visual: passport with share controls — the engineer owns it */
function PassportShareVisual() {
  return (
    <div className="mk-visual">
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--mk-teal), var(--mk-blue))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 16, fontWeight: 600,
          }}>
            SK
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Sarah Kim</div>
            <div style={{ fontSize: 13, color: "var(--mk-text-secondary)" }}>Backend Engineer · 6 simulations</div>
          </div>
          <span style={{
            marginLeft: "auto",
            fontSize: 12, fontWeight: 500,
            color: "var(--mk-teal)", background: "#E6F4F2",
            padding: "6px 14px", borderRadius: 999,
          }}>
            You own this
          </span>
        </div>
        {[
          ["Webhook retry incident", "12 tests passed · 38 min", true],
          ["API rate limiting", "8 tests passed · 42 min", true],
          ["Database migration", "15 tests passed · 51 min", false],
        ].map(([title, meta, shared]) => (
          <div key={title as string} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            border: "1px solid var(--mk-border)",
            borderRadius: 8,
            marginBottom: 8,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--mk-text-secondary)" }}>{meta}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--mk-text-tertiary)" }}>
                {shared ? "Shared" : "Private"}
              </span>
              <div style={{
                width: 36, height: 20, borderRadius: 999,
                background: shared ? "var(--mk-teal)" : "var(--mk-border-strong)",
                position: "relative",
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 2,
                  left: shared ? 18 : 2,
                }} />
              </div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 12, color: "var(--mk-text-tertiary)", marginTop: 12 }}>
          Toggle a simulation to share or hide it. Links are per-employer. Revoke anytime.
        </div>
      </div>
    </div>
  );
}

/* Section visual: desktop app — local editor experience */
function DesktopVisual() {
  return (
    <div className="mk-visual">
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
        </div>
        <span style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginLeft: 8 }}>
          Fydell Desktop · harbor-webhooks
        </span>
        <span style={{
          marginLeft: "auto",
          fontSize: 12, fontWeight: 500,
          color: "var(--mk-blue)", background: "#E8EFFE",
          padding: "4px 12px", borderRadius: 999,
        }}>
          Local
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", minHeight: 260 }}>
        <div style={{ padding: 16, fontFamily: "monospace", fontSize: 13, lineHeight: 1.7 }}>
          <div><span style={{ color: "#888" }}>13</span>  send_receipt(job.receipt)</div>
          <div style={{ background: "#FEF3E2", margin: "0 -16px", padding: "0 16px" }}>
            <span style={{ color: "#888" }}>14</span>  <span style={{ color: "#6D28D9" }}>except</span> TransientError:
          </div>
          <div style={{ background: "#FEF3E2", margin: "0 -16px", padding: "0 16px" }}>
            <span style={{ color: "#888" }}>15</span>      <span style={{ color: "#B45309" }}># TODO: check sent set first</span>
          </div>
          <div><span style={{ color: "#888" }}>16</span>      <span style={{ color: "#6D28D9" }}>raise</span></div>
        </div>
        <div style={{ borderLeft: "1px solid var(--mk-border)", padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Test runs</div>
          {[
            ["9 passed", "var(--mk-green)", "2.1s"],
            ["3 failed", "var(--mk-red)", "0.8s"],
          ].map(([label, color, time]) => (
            <div key={label as string} style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, padding: "8px 10px",
              background: "var(--mk-surface-warm)", borderRadius: 6, marginBottom: 6,
            }}>
              <span style={{ color: color as string }}>●</span>
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ color: "var(--mk-text-tertiary)" }}>{time}</span>
            </div>
          ))}
          <button style={{
            width: "100%", marginTop: 12,
            background: "var(--mk-text)", color: "#fff",
            border: "none", borderRadius: 999,
            padding: "10px", fontSize: 13, fontWeight: 500,
            cursor: "pointer",
          }}>
            Submit
          </button>
          <div style={{ fontSize: 11, color: "var(--mk-text-tertiary)", marginTop: 8, textAlign: "center" }}>
            One atomic submit. Nothing leaves before.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DevelopersPageV2() {
  return (
    <div className="mk-canvas">
      <Nav />

      <div className="mk-hero">
        <h1>Build your proof.</h1>
        <p className="mk-sub">
          Real simulations. A passport you own. Free for engineers.
        </p>
        <div className="mk-hero-actions">
          <Link href="/passport/new" className="mk-btn-dark">Build your passport →</Link>
          <Link href="/demo" className="mk-btn-light">See an example</Link>
        </div>
        <IncidentBriefVisual />
      </div>

      <div className="mk-section">
        <div className="mk-section-split">
          <h2>Real incidents. Real code.</h2>
          <div>
            <p className="mk-desc">
              Debug production bugs in working codebases. Every fix is tested and timed.
            </p>
            <Link href="/demo" className="mk-learn-more">Try the demo →</Link>
          </div>
        </div>
      </div>

      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>Your work, verified.</h2>
          <div>
            <p className="mk-desc">
              Every simulation becomes a verified record. You own it. You share it.
            </p>
            <Link href="/passport" className="mk-learn-more">Learn more →</Link>
          </div>
        </div>
        <PassportShareVisual />
      </div>

      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>A real editor. Your machine.</h2>
          <div>
            <p className="mk-desc">
              Run simulations in the Fydell desktop app. Nothing leaves until you submit.
            </p>
            <Link href="/download" className="mk-learn-more">Download →</Link>
          </div>
        </div>
        <DesktopVisual />
      </div>

      <Footer
        ctaTitle="Your code makes the case."
        ctaPrimary="Build your passport"
        ctaPrimaryHref="/passport/new"
        ctaSecondary="Create an account"
        ctaSecondaryHref="/signup?as=developer"
      />
    </div>
  );
}
