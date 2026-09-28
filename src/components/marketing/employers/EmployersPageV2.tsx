"use client";

import Link from "next/link";
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
          ["00:00", "Started", "Opened the incident brief", "var(--mk-blue)"],
          ["00:04", "First test run", "3 failed — reproduced the bug", "var(--mk-amber)"],
          ["00:12", "Reviewed AI patch", "Rejected: patch masked the root cause", "var(--mk-violet)"],
          ["00:21", "Fix applied", "Added idempotency check in worker.py", "var(--mk-teal)"],
          ["00:28", "All tests pass", "12/12 green", "var(--mk-green)"],
          ["00:38", "Submitted", "Report generated", "var(--mk-text)"],
        ].map(([time, title, desc, color]) => (
          <div key={time as string} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--mk-text-tertiary)", width: 44, flexShrink: 0, paddingTop: 2 }}>
              {time}
            </div>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color as string, marginTop: 5, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
              <div style={{ fontSize: 13, color: "var(--mk-text-secondary)" }}>{desc}</div>
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
