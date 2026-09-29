"use client";

import Link from "next/link";
import { useState } from "react";
import "@/styles/marketing-v2.css";
import { Nav, Footer } from "@/components/marketing/v2/MarketingV2Shared";

/* ============================================================================
   Employers page — for hiring teams.
   Linear format, Cursor copy (short), Stripe color.
   Visuals show the reviewer perspective: evidence, timeline, decision.
   Distinct from DevelopersPageV2: cooler accents, report-first, pricing close.
   ========================================================================== */

/* Hero visual: evidence report — what the reviewer opens */
function EvidenceReportVisual() {
  return (
    <div className="mk-visual" style={{ marginTop: 48 }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Sarah Kim — Evidence report</div>
          <div style={{ fontSize: 12, color: "var(--mk-text-secondary)" }}>Webhook retry incident · submitted 2h ago</div>
        </div>
        <span style={{
          marginLeft: "auto",
          fontSize: 12, fontWeight: 500,
          color: "var(--mk-teal)", background: "#E6F4F2",
          padding: "6px 14px", borderRadius: 999,
        }}>
          12/12 tests passed
        </span>
      </div>
      <div style={{ padding: 24 }}>
        {[
          {
            title: "Fixed duplicate receipt on retry",
            cite: "src/worker.py:13-15 · commit 4f1c9a2",
            code: "if job.id not in sent_set:",
            tag: "Observed",
            tagColor: "var(--mk-teal)",
            tagBg: "#E6F4F2",
          },
          {
            title: "Added idempotency check before send",
            cite: "src/worker.py:18-22 · commit 4f1c9a2",
            code: "sent_set.add(job.id)",
            tag: "Observed",
            tagColor: "var(--mk-teal)",
            tagBg: "#E6F4F2",
          },
          {
            title: "Handles TransientError without data loss",
            cite: "test run · 0.34s",
            code: "test_no_double_send_on_retry ✓",
            tag: "Generated",
            tagColor: "var(--mk-violet)",
            tagBg: "#EDE9FE",
          },
        ].map((f) => (
          <div key={f.title} style={{
            border: "1px solid var(--mk-border)",
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: f.tagColor, background: f.tagBg,
                padding: "3px 10px", borderRadius: 999,
              }}>
                {f.tag}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{f.title}</span>
            </div>
            <div style={{
              fontFamily: "monospace", fontSize: 12,
              background: "var(--mk-surface-warm)",
              padding: "8px 12px", borderRadius: 6,
              color: "var(--mk-text-secondary)",
              marginBottom: 8,
            }}>
              {f.code}
            </div>
            <div style={{ fontSize: 12, color: "var(--mk-text-tertiary)", fontFamily: "monospace" }}>
              {f.cite}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <span style={{
            flex: 1, textAlign: "center",
            fontSize: 13, fontWeight: 500,
            background: "var(--mk-text)", color: "#fff",
            padding: "10px", borderRadius: 999,
          }}>
            Advance →
          </span>
          <span style={{
            flex: 1, textAlign: "center",
            fontSize: 13, fontWeight: 500,
            background: "var(--mk-surface-warm)",
            border: "1px solid var(--mk-border)",
            padding: "10px", borderRadius: 999,
            color: "var(--mk-text-secondary)",
          }}>
            Add note
          </span>
        </div>
      </div>
    </div>
  );
}

/* Section visual: review timeline — the candidate's session as the reviewer sees it */
function ReviewTimelineVisual() {
  return (
    <div className="mk-visual">
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--mk-border)" }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Session timeline</div>
        <div style={{ fontSize: 12, color: "var(--mk-text-secondary)" }}>38 minutes · 14 test runs · 6 file changes</div>
      </div>
      <div style={{ padding: 24 }}>
        {[
          { time: "00:00", title: "Started", desc: "Opened the incident brief", color: "var(--mk-blue)" },
          { time: "00:04", title: "First test run", desc: "3 failed — reproduced the bug", color: "var(--mk-amber)" },
          { time: "00:12", title: "Reviewed AI patch", desc: "Rejected: patch masked the root cause", color: "var(--mk-violet)" },
          { time: "00:21", title: "Fix applied", desc: "Added idempotency check in worker.py", color: "var(--mk-teal)" },
          { time: "00:28", title: "All tests pass", desc: "12/12 green", color: "var(--mk-green)" },
          { time: "00:38", title: "Submitted", desc: "Report generated", color: "var(--mk-text)" },
        ].map((row) => (
          <div key={row.time} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--mk-text-tertiary)", width: 44, flexShrink: 0, paddingTop: 2 }}>
              {row.time}
            </div>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: row.color, marginTop: 5, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{row.title}</div>
              <div style={{ fontSize: 13, color: "var(--mk-text-secondary)" }}>{row.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Section visual: pricing cards — Cursor 3-col */
function PricingTeaser() {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      unit: "per simulation",
      desc: "Pay as you go. No commitment.",
      cta: "Start hiring",
      href: "/signup?as=employer",
      dark: true,
    },
    {
      name: "Team",
      price: "$399",
      unit: "per month",
      desc: "10 simulations included. Then $35 each.",
      cta: "See pricing",
      href: "/pricing",
      dark: false,
    },
    {
      name: "Enterprise",
      price: "Custom",
      unit: "annual",
      desc: "Volume pricing. SSO and audit logs.",
      cta: "Talk to us",
      href: "/contact",
      dark: false,
    },
  ];
  return (
    <div className="mk-cards" style={{ padding: 0 }}>
      {plans.map((p) => (
        <div key={p.name} className="mk-card">
          <div className="mk-card-body">
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text-tertiary)", letterSpacing: "0.05em" }}>
              {p.name.toUpperCase()}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>{p.price}</span>
              <span style={{ fontSize: 13, color: "var(--mk-text-secondary)" }}>{p.unit}</span>
            </div>
            <p>{p.desc}</p>
            <Link href={p.href} className={p.dark ? "mk-btn-dark" : "mk-btn-light"}>
              {p.cta} →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   NEW: How hiring works — 4 steps, each with a visual mock.
   ========================================================================== */

function StepVisualCreateRole() {
  return (
    <div style={{ padding: 16, background: "var(--mk-surface-warm)", borderRadius: 8, height: "100%" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>New role</div>
      <div style={{ background: "#fff", border: "1px solid var(--mk-border)", borderRadius: 6, padding: "10px 12px", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "var(--mk-text-tertiary)", marginBottom: 2 }}>Title</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Backend Engineer</div>
      </div>
      <div style={{ background: "#fff", border: "1px solid var(--mk-border)", borderRadius: 6, padding: "10px 12px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--mk-text-tertiary)", marginBottom: 2 }}>Scenario</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Webhook retry incident</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {["Python", "45 min", "12 tests"].map((t) => (
          <span key={t} style={{ fontSize: 11, background: "#E6F4F2", color: "var(--mk-teal)", padding: "4px 10px", borderRadius: 999, fontWeight: 500 }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepVisualInvite() {
  const rows = [
    { name: "Priya S.", status: "Accepted", color: "var(--mk-teal)", bg: "#E6F4F2" },
    { name: "Marcus T.", status: "Accepted", color: "var(--mk-teal)", bg: "#E6F4F2" },
    { name: "Elena R.", status: "Sent", color: "var(--mk-text-secondary)", bg: "var(--mk-surface-warm)" },
  ];
  return (
    <div style={{ padding: 16, background: "var(--mk-surface-warm)", borderRadius: 8, height: "100%" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Invite candidates</div>
      {rows.map((r) => (
        <div key={r.name} style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#fff", border: "1px solid var(--mk-border)",
          borderRadius: 6, padding: "10px 12px", marginBottom: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "var(--mk-border)", color: "var(--mk-text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}>
            {r.name.charAt(0)}
          </div>
          <span style={{ fontSize: 13, flex: 1 }}>{r.name}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: r.color, background: r.bg, padding: "3px 10px", borderRadius: 999 }}>
            {r.status}
          </span>
        </div>
      ))}
      <div style={{
        fontSize: 12, fontWeight: 500, color: "var(--mk-teal)",
        background: "#fff", border: "1px dashed var(--mk-border-strong)",
        borderRadius: 6, padding: "10px 12px", textAlign: "center",
      }}>
        + Send invite link
      </div>
    </div>
  );
}

function StepVisualReview() {
  return (
    <div style={{ padding: 16, background: "var(--mk-surface-warm)", borderRadius: 8, height: "100%" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Review evidence</div>
      <div style={{ background: "#fff", border: "1px solid var(--mk-border)", borderRadius: 6, padding: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--mk-teal)", background: "#E6F4F2", padding: "2px 8px", borderRadius: 999 }}>
            Observed
          </span>
          <span style={{ fontSize: 12, fontWeight: 500 }}>Fixed duplicate receipt</span>
        </div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--mk-text-tertiary)" }}>
          src/worker.py:13-15
        </div>
      </div>
      <div style={{ background: "#fff", border: "1px solid var(--mk-border)", borderRadius: 6, padding: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--mk-violet)", background: "#EDE9FE", padding: "2px 8px", borderRadius: 999 }}>
            Generated
          </span>
          <span style={{ fontSize: 12, fontWeight: 500 }}>12/12 tests pass</span>
        </div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--mk-text-tertiary)" }}>
          0.34s · all green
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--mk-text-tertiary)" }}>
        Every claim opens to proof.
      </div>
    </div>
  );
}

function StepVisualDecide() {
  return (
    <div style={{ padding: 16, background: "var(--mk-surface-warm)", borderRadius: 8, height: "100%" }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Make a decision</div>
      <div style={{
        background: "#fff", border: "1px solid var(--mk-border)", borderRadius: 6,
        padding: "10px 12px", marginBottom: 8, fontSize: 12,
        color: "var(--mk-text-secondary)",
      }}>
        "Strong debugging. Clean diff. Moved fast on the repro."
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{
          flex: 1, textAlign: "center", fontSize: 12, fontWeight: 500,
          background: "var(--mk-text)", color: "#fff",
          padding: "9px", borderRadius: 999,
        }}>
          Advance →
        </span>
        <span style={{
          flex: 1, textAlign: "center", fontSize: 12, fontWeight: 500,
          background: "#fff", border: "1px solid var(--mk-border)",
          padding: "9px", borderRadius: 999, color: "var(--mk-text-secondary)",
        }}>
          Pass
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--mk-text-tertiary)", marginTop: 8 }}>
        Notes stay with the report.
      </div>
    </div>
  );
}

function HowHiringWorks() {
  const steps = [
    { n: "01", title: "Create a role", desc: "Pick a scenario. Set the time limit.", visual: <StepVisualCreateRole /> },
    { n: "02", title: "Invite candidates", desc: "Send links. They start when ready.", visual: <StepVisualInvite /> },
    { n: "03", title: "Review evidence", desc: "Open the report. Click into proof.", visual: <StepVisualReview /> },
    { n: "04", title: "Make a decision", desc: "Advance or pass. Leave a note.", visual: <StepVisualDecide /> },
  ];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: 24,
      marginTop: 32,
    }}>
      {steps.map((s) => (
        <div key={s.n}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-teal)", marginBottom: 8 }}>
            {s.n}
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{s.title}</div>
          <p style={{ fontSize: 15, color: "var(--mk-text-secondary)", margin: "0 0 16px", lineHeight: 1.5 }}>
            {s.desc}
          </p>
          {s.visual}
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   NEW: Full evidence report — test results, diff, timing, findings with cites.
   ========================================================================== */

function FullEvidenceReport() {
  const tests = [
    { name: "test_no_double_send_on_retry", result: "pass", time: "0.34s" },
    { name: "test_retry_after_transient_error", result: "pass", time: "0.41s" },
    { name: "test_receipt_sent_once", result: "pass", time: "0.22s" },
    { name: "test_backoff_between_attempts", result: "pass", time: "0.58s" },
    { name: "test_queue_survives_restart", result: "pass", time: "0.47s" },
  ];
  const findings = [
    {
      tag: "Observed",
      tagColor: "var(--mk-teal)",
      tagBg: "#E6F4F2",
      title: "Reproduced the bug before fixing it",
      detail: "First test run showed duplicate receipts. Then the fix landed.",
      cite: "test runs 1-14 · timeline 00:04 → 00:21",
    },
    {
      tag: "Observed",
      tagColor: "var(--mk-teal)",
      tagBg: "#E6F4F2",
      title: "Rejected the AI patch",
      detail: "The suggested patch masked the root cause. They wrote their own.",
      cite: "timeline 00:12 · diff vs AI patch",
    },
    {
      tag: "Generated",
      tagColor: "var(--mk-violet)",
      tagBg: "#EDE9FE",
      title: "Idempotency check covers all retry paths",
      detail: "Every send site now checks the sent set first.",
      cite: "src/worker.py:13-22 · commit 4f1c9a2",
    },
  ];
  return (
    <div className="mk-visual" style={{ marginTop: 32 }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--mk-border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>Sarah Kim — Webhook retry incident</div>
            <div style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginTop: 2 }}>
              Submitted 2h ago · 38 minutes · 14 test runs · 6 file changes
            </div>
          </div>
          <span style={{
            marginLeft: "auto",
            fontSize: 13, fontWeight: 600,
            color: "var(--mk-teal)", background: "#E6F4F2",
            padding: "8px 16px", borderRadius: 999,
          }}>
            12/12 tests passed
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        <div style={{ padding: 24, borderRight: "1px solid var(--mk-border)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, letterSpacing: "0.02em" }}>
            TEST RESULTS
          </div>
          {tests.map((t) => (
            <div key={t.name} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 0", borderBottom: "1px solid var(--mk-border)",
              fontSize: 13,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--mk-green)", flexShrink: 0,
              }} />
              <span style={{ fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.name}
              </span>
              <span style={{ color: "var(--mk-text-tertiary)", fontFamily: "monospace", fontSize: 12 }}>
                {t.time}
              </span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "var(--mk-text-tertiary)", marginTop: 8 }}>
            + 7 more, all passing
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, margin: "24px 0 12px", letterSpacing: "0.02em" }}>
            CODE DIFF
          </div>
          <div style={{
            fontFamily: "monospace", fontSize: 12, lineHeight: 1.7,
            background: "var(--mk-surface-warm)", borderRadius: 8, padding: 16,
            overflowX: "auto",
          }}>
            <div style={{ color: "var(--mk-red)" }}>-  send_receipt(job.receipt)</div>
            <div style={{ color: "var(--mk-green)" }}>+  if job.id not in sent_set:</div>
            <div style={{ color: "var(--mk-green)" }}>+      send_receipt(job.receipt)</div>
            <div style={{ color: "var(--mk-green)" }}>+      sent_set.add(job.id)</div>
            <div style={{ color: "var(--mk-text-tertiary)", marginTop: 8 }}>
              src/worker.py · +3 −1
            </div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, letterSpacing: "0.02em" }}>
            FINDINGS
          </div>
          {findings.map((f) => (
            <div key={f.title} style={{
              border: "1px solid var(--mk-border)", borderRadius: 8,
              padding: 16, marginBottom: 12,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: f.tagColor, background: f.tagBg,
                padding: "3px 10px", borderRadius: 999,
              }}>
                {f.tag}
              </span>
              <div style={{ fontSize: 14, fontWeight: 500, margin: "8px 0 4px" }}>
                {f.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginBottom: 8 }}>
                {f.detail}
              </div>
              <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--mk-teal)" }}>
                {f.cite} →
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   NEW: What you see vs what you don't.
   ========================================================================== */

function SeeVsDontSee() {
  const see = [
    { title: "The code they wrote", desc: "Full diff. Every line." },
    { title: "Every test run", desc: "Pass or fail. Timed." },
    { title: "How they worked", desc: "Timeline from start to submit." },
    { title: "Findings with citations", desc: "Each claim links to proof." },
  ];
  const dont = [
    { title: "No scores or rankings", desc: "You judge the work yourself." },
    { title: "No personal data", desc: "Private until they share it." },
    { title: "No browsing or keystrokes", desc: "Only test runs and file changes." },
    { title: "Nothing off the record", desc: "Recording is disclosed upfront." },
  ];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 24,
      marginTop: 32,
    }}>
      <div style={{
        background: "var(--mk-surface)", border: "1px solid var(--mk-border)",
        borderRadius: 12, padding: 32,
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>What you see</div>
        {see.map((item) => (
          <div key={item.title} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "#E6F4F2", color: "var(--mk-teal)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1,
            }}>
              ✓
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: "var(--mk-text-secondary)" }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        background: "var(--mk-surface-warm)", border: "1px solid var(--mk-border)",
        borderRadius: 12, padding: 32,
      }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>What you don't</div>
        {dont.map((item) => (
          <div key={item.title} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              border: "1px solid var(--mk-border-strong)",
              color: "var(--mk-text-tertiary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, flexShrink: 0, marginTop: 1,
            }}>
              —
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: "var(--mk-text-secondary)" }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   NEW: Role templates.
   ========================================================================== */

function RoleTemplates() {
  const roles = [
    {
      title: "Backend Engineer",
      scenario: "Webhook retry incident",
      stack: "Python",
      time: "45 min",
      tests: "12 tests",
      skills: ["Debugging under pressure", "Idempotent design", "Error handling", "Reading unfamiliar code"],
    },
    {
      title: "Frontend Engineer",
      scenario: "Stale search results",
      stack: "TypeScript",
      time: "45 min",
      tests: "10 tests",
      skills: ["Race conditions", "Async state", "Debounced input", "User-facing polish"],
    },
  ];
  return (
    <div className="mk-cards" style={{ padding: 0, marginTop: 32, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
      {roles.map((r) => (
        <div key={r.title} className="mk-card">
          <div className="mk-card-body">
            <h3>{r.title}</h3>
            <p style={{ fontWeight: 500, color: "var(--mk-text)" }}>{r.scenario}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0 8px" }}>
              {[r.stack, r.time, r.tests].map((t) => (
                <span key={t} style={{
                  fontSize: 12, background: "var(--mk-surface-warm)",
                  color: "var(--mk-text-secondary)",
                  padding: "4px 10px", borderRadius: 999, fontWeight: 500,
                }}>
                  {t}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text-tertiary)", letterSpacing: "0.04em", marginTop: 8 }}>
              WHAT IT TESTS
            </div>
            <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
              {r.skills.map((s) => (
                <li key={s} style={{
                  fontSize: 14, color: "var(--mk-text-secondary)",
                  padding: "6px 0", borderBottom: "1px solid var(--mk-border)",
                }}>
                  {s}
                </li>
              ))}
            </ul>
            <Link href="/get-started" className="mk-btn-light">
              Use this template →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   NEW: FAQ accordion.
   ========================================================================== */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    {
      q: "How much does it cost?",
      a: "$49 per completed simulation. Or $399 a month for 10. You pay nothing until a candidate submits.",
    },
    {
      q: "How long do simulations take?",
      a: "45 minutes. The timer is visible to the candidate. The session is recorded.",
    },
    {
      q: "Can candidates cheat?",
      a: "Every test run and file change is recorded. AI help is disclosed and visible. You see what assistance was used, not just the output.",
    },
    {
      q: "Do we see personal information?",
      a: "No. You review code, tests, and timing. Names and details appear only when a candidate shares their passport with you.",
    },
    {
      q: "What if no one finishes?",
      a: "You pay nothing. Charges apply only to submitted simulations.",
    },
  ];
  return (
    <div style={{ marginTop: 32, maxWidth: 800 }}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} style={{ borderBottom: "1px solid var(--mk-border)" }}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              style={{
                width: "100%", textAlign: "left", background: "none", border: "none",
                padding: "20px 0", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                fontSize: 17, fontWeight: 500, color: "var(--mk-text)",
                fontFamily: "inherit",
              }}
            >
              {item.q}
              <span style={{
                fontSize: 20, color: "var(--mk-text-tertiary)",
                transform: isOpen ? "rotate(45deg)" : "none",
                transition: "transform 150ms", flexShrink: 0,
              }}>
                +
              </span>
            </button>
            {isOpen && (
              <p style={{
                margin: "0 0 20px", fontSize: 15, lineHeight: 1.6,
                color: "var(--mk-text-secondary)", maxWidth: 640,
              }}>
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EmployersPageV2() {
  return (
    <div className="mk-canvas">
      <Nav />

      <div className="mk-hero">
        <h1>See the work before you hire.</h1>
        <p className="mk-sub">
          Evidence from real simulations. Review code, not résumés.
        </p>
        <div className="mk-hero-actions">
          <Link href="/signup?as=employer" className="mk-btn-dark">Start hiring →</Link>
          <Link href="/pricing" className="mk-btn-light">See pricing</Link>
        </div>
        <EvidenceReportVisual />
      </div>

      <div className="mk-section">
        <div className="mk-section-split">
          <h2>How hiring works.</h2>
          <div>
            <p className="mk-desc">
              Four steps. From open role to decision, with evidence at every step.
            </p>
            <Link href="/get-started" className="mk-learn-more">Get started →</Link>
          </div>
        </div>
        <HowHiringWorks />
      </div>

      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>Every claim opens to proof.</h2>
          <div>
            <p className="mk-desc">
              Each finding links to the file, commit, or test behind it.
            </p>
            <Link href="/product" className="mk-learn-more">Learn more →</Link>
          </div>
        </div>
      </div>

      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>The full report.</h2>
          <div>
            <p className="mk-desc">
              This is what lands in your inbox. Tests, diff, timing, findings. All cited.
            </p>
            <Link href="/demo" className="mk-learn-more">Explore the demo →</Link>
          </div>
        </div>
        <FullEvidenceReport />
      </div>

      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>Watch how they work.</h2>
          <div>
            <p className="mk-desc">
              See every test run, every fix, every decision. Timed and recorded.
            </p>
            <Link href="/demo" className="mk-learn-more">See a session →</Link>
          </div>
        </div>
        <ReviewTimelineVisual />
      </div>

      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>What you see. What you don't.</h2>
          <div>
            <p className="mk-desc">
              The report shows work. Nothing else.
            </p>
          </div>
        </div>
        <SeeVsDontSee />
      </div>

      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>Start from a template.</h2>
          <div>
            <p className="mk-desc">
              Real scenarios. Tuned for the role. Ready in minutes.
            </p>
            <Link href="/get-started" className="mk-learn-more">Browse all roles →</Link>
          </div>
        </div>
        <RoleTemplates />
      </div>

      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>Pay for completed work.</h2>
          <div>
            <p className="mk-desc">
              No seats. No commitments. You pay when a candidate submits.
            </p>
            <Link href="/pricing" className="mk-learn-more">Full pricing →</Link>
          </div>
        </div>
        <div style={{ marginTop: 32 }}>
          <PricingTeaser />
        </div>
      </div>

      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>Questions.</h2>
          <div>
            <p className="mk-desc">
              Short answers. No sales pitch.
            </p>
            <Link href="/contact" className="mk-learn-more">Talk to us →</Link>
          </div>
        </div>
        <Faq />
      </div>

      <Footer
        ctaTitle="Bring one open role."
        ctaPrimary="Start hiring"
        ctaPrimaryHref="/signup?as=employer"
        ctaSecondary="Talk to us"
        ctaSecondaryHref="/contact"
      />
    </div>
  );
}
