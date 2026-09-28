"use client";

import Link from "next/link";
import { useState } from "react";
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

/* ============================================================================
   NEW: How it works — 3 steps, each with a small visual mock.
   ========================================================================== */

function StepBriefVisual() {
  return (
    <div style={{ padding: 16, height: "100%" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-tertiary)", letterSpacing: "0.05em", marginBottom: 8 }}>
        INCIDENT BRIEF
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
        Webhook receipts are sending twice on retry
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["Python", "12 tests", "45:00"].map((tag) => (
          <span key={tag} style={{
            fontSize: 11, background: "var(--mk-surface)", border: "1px solid var(--mk-border)",
            padding: "3px 10px", borderRadius: 999, color: "var(--mk-text-secondary)",
          }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepFixVisual() {
  return (
    <div style={{ padding: 16, height: "100%", fontFamily: "monospace", fontSize: 12, lineHeight: 1.8 }}>
      <div><span style={{ color: "#888" }}>14</span>&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>if</span> receipt.id <span style={{ color: "#6D28D9" }}>in</span> sent_receipts:</div>
      <div><span style={{ color: "#888" }}>15</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>return</span></div>
      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
        <span style={{ fontSize: 10, background: "#E6F4F2", color: "var(--mk-teal)", padding: "3px 8px", borderRadius: 999, fontWeight: 500 }}>
          12 passed
        </span>
        <span style={{ fontSize: 10, background: "#FDECEC", color: "var(--mk-red)", padding: "3px 8px", borderRadius: 999, fontWeight: 500 }}>
          0 failed
        </span>
      </div>
    </div>
  );
}

function StepSubmitVisual() {
  return (
    <div style={{ padding: 16, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Evidence receipt</span>
        <span style={{ fontSize: 10, background: "#E6F4F2", color: "var(--mk-teal)", padding: "3px 8px", borderRadius: 999, fontWeight: 500 }}>
          Verified
        </span>
      </div>
      {[
        ["12 tests", "all passing"],
        ["38 min", "total time"],
        ["1 diff", "worker.py"],
      ].map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 0", borderTop: "1px solid var(--mk-border)" }}>
          <span style={{ fontWeight: 500 }}>{k}</span>
          <span style={{ color: "var(--mk-text-secondary)" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

const HOW_IT_WORKS = [
  {
    title: "Get the brief",
    desc: "Open a simulation. Read the incident brief. Know exactly what to fix.",
    visual: <StepBriefVisual />,
  },
  {
    title: "Fix the bug",
    desc: "Work in a real codebase. Run the tests locally. Iterate until green.",
    visual: <StepFixVisual />,
  },
  {
    title: "Submit your evidence",
    desc: "Submit one atomic diff. Tests, timing, and changes are recorded.",
    visual: <StepSubmitVisual />,
  },
] as const;

/* ============================================================================
   NEW: Sample simulation — code snippet from harbor-webhooks.
   ========================================================================== */

function SampleSimulationVisual() {
  return (
    <div className="mk-visual">
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: "var(--mk-text-secondary)", fontFamily: "monospace" }}>
          worker.py · harbor-webhooks
        </span>
        <span style={{
          marginLeft: "auto",
          fontSize: 12, fontWeight: 500,
          color: "var(--mk-teal)", background: "#E6F4F2",
          padding: "4px 12px", borderRadius: 999,
        }}>
          The fix
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px" }}>
        <div style={{ padding: 20, fontFamily: "monospace", fontSize: 13, lineHeight: 1.8 }}>
          <div><span style={{ color: "#888" }}>1</span>&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>def</span> <span style={{ color: "#2B5CE6" }}>handle_retry</span>(job):</div>
          <div><span style={{ color: "#888" }}>2</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;receipt = build_receipt(job)</div>
          <div style={{ background: "#E6F4F2", margin: "0 -20px", padding: "0 20px" }}>
            <span style={{ color: "#888" }}>3</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>if</span> receipt.id <span style={{ color: "#6D28D9" }}>in</span> sent_receipts:
          </div>
          <div style={{ background: "#E6F4F2", margin: "0 -20px", padding: "0 20px" }}>
            <span style={{ color: "#888" }}>4</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>return</span>&nbsp;&nbsp;<span style={{ color: "#15803D" }}># already sent, skip</span>
          </div>
          <div><span style={{ color: "#888" }}>5</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;send_receipt(receipt)</div>
          <div><span style={{ color: "#888" }}>6</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;sent_receipts.add(receipt.id)</div>
        </div>
        <div style={{ borderLeft: "1px solid var(--mk-border)", padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Test run</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.8, color: "var(--mk-text-secondary)" }}>
            <div>test_idempotent_retry <span style={{ color: "var(--mk-green)" }}>PASS</span></div>
            <div>test_no_duplicate_send <span style={{ color: "var(--mk-green)" }}>PASS</span></div>
            <div>test_retry_backoff <span style={{ color: "var(--mk-green)" }}>PASS</span></div>
            <div style={{ marginTop: 8, color: "var(--mk-text-tertiary)" }}>… 9 more</div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: "var(--mk-teal)" }}>
            12 passed · 0 failed · 2.1s
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   NEW: What gets recorded — full detailed section.
   ========================================================================== */

const RECORDED = [
  ["Test runs", "Every run, pass or fail. Full output with timestamps."],
  ["File changes", "The complete diff at submit time. Nothing before."],
  ["Timing", "When you started, when you submitted, total duration."],
  ["Environment", "Language, test command, and scenario version."],
] as const;

const NEVER_RECORDED = [
  ["Browsing", "Your tabs and history are never touched."],
  ["Other windows", "Only the simulation window is in scope."],
  ["Keystrokes", "No keylogging. Ever."],
  ["Camera and mic", "No audio or video recording."],
  ["Files outside the repo", "Only the simulation codebase is visible."],
] as const;

function RecordingSection() {
  return (
    <div className="mk-section" style={{ paddingTop: 0 }}>
      <div className="mk-section-split">
        <h2>You know exactly what is recorded.</h2>
        <div>
          <p className="mk-desc">
            Recording is disclosed before you start. It covers your work, not your life.
          </p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="mk-visual" style={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>What gets recorded</div>
          {RECORDED.map(([title, desc]) => (
            <div key={title} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--mk-green)", fontSize: 11 }}>●</span> {title}
              </div>
              <div style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginLeft: 19, marginTop: 4 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div className="mk-visual" style={{ padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>What never is</div>
          {NEVER_RECORDED.map(([title, desc]) => (
            <div key={title} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--mk-text-tertiary)", fontSize: 11 }}>○</span> {title}
              </div>
              <div style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginLeft: 19, marginTop: 4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   NEW: FAQ.
   ========================================================================== */

const FAQS = [
  {
    q: "Is it free?",
    a: "Yes. Simulations are free for engineers. Employers pay only when candidates finish.",
  },
  {
    q: "What languages are supported?",
    a: "Python today. New simulations add more languages as they launch.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. Run simulations in your browser. The desktop app is optional and works offline.",
  },
  {
    q: "Who sees my code?",
    a: "Only employers you share with. Your passport is private until you share a link. Revoke access anytime.",
  },
  {
    q: "Can I delete my data?",
    a: "Yes. Delete your passport anytime. Shared links stop working immediately.",
  },
] as const;

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mk-section" style={{ paddingTop: 0 }}>
      <div className="mk-section-split">
        <h2>Questions, answered.</h2>
        <div>
          <p className="mk-desc">
            Short answers to the things engineers ask first.
          </p>
        </div>
      </div>
      <div style={{ maxWidth: 800 }}>
        {FAQS.map((faq, i) => {
          const isOpen = open === i;
          return (
            <div
              key={faq.q}
              style={{
                borderBottom: "1px solid var(--mk-border)",
                padding: "20px 0",
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                style={{
                  all: "unset",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  cursor: "pointer",
                  fontSize: 18,
                  fontWeight: 500,
                  color: "var(--mk-text)",
                }}
              >
                {faq.q}
                <span style={{ fontSize: 20, color: "var(--mk-text-tertiary)", transform: isOpen ? "rotate(45deg)" : "none", transition: "transform 150ms" }}>
                  +
                </span>
              </button>
              {isOpen && (
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--mk-text-secondary)", margin: "12px 0 0", maxWidth: 640 }}>
                  {faq.a}
                </p>
              )}
            </div>
          );
        })}
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
          <h2>How it works.</h2>
          <div>
            <p className="mk-desc">
              Three steps. One finished simulation becomes a verified record.
            </p>
          </div>
        </div>
      </div>

      <div className="mk-cards" style={{ paddingBottom: 48 }}>
        {HOW_IT_WORKS.map((step, i) => (
          <div className="mk-card" key={step.title}>
            <div className="mk-card-visual">
              {step.visual}
            </div>
            <div className="mk-card-body">
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--mk-teal)", letterSpacing: "0.05em" }}>
                STEP {i + 1}
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          </div>
        ))}
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
          <h2>A real simulation.</h2>
          <div>
            <p className="mk-desc">
              harbor-webhooks: receipts send twice on retry. Find the bug. Fix it. Prove it.
            </p>
            <Link href="/demo" className="mk-learn-more">Run this simulation →</Link>
          </div>
        </div>
        <SampleSimulationVisual />
      </div>

      <RecordingSection />

      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>Your work, verified.</h2>
          <div>
            <p className="mk-desc">
              Every finished simulation becomes a verified passport entry. You own it. You share it.
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

      <FaqSection />

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
