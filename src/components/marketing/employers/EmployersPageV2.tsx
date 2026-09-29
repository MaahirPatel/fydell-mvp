import Link from "next/link";
import {
  UnifiedNav,
  UnifiedFooter,
  CtaBand,
  Faq,
} from "@/components/marketing/unified/UnifiedChrome";

/* ============================================================================
   /employers - for hiring teams. Unified Linear-grade structure.
   Server component. Faq is the client island.
   ========================================================================== */

/* Hero visual: the evidence report the reviewer opens */
function EvidenceReportHeroVisual() {
  const findings = [
    {
      tag: "Observed",
      tagColor: "var(--u-accent-deep)",
      tagBg: "var(--u-accent-tint)",
      title: "Fixed duplicate receipt on retry",
      code: "if job.id not in sent_set:",
      cite: "src/worker.py:13-15 · commit 4f1c9a2",
    },
    {
      tag: "Observed",
      tagColor: "var(--u-accent-deep)",
      tagBg: "var(--u-accent-tint)",
      title: "Added idempotency check before send",
      code: "sent_set.add(job.id)",
      cite: "src/worker.py:18-22 · commit 4f1c9a2",
    },
    {
      tag: "Generated",
      tagColor: "var(--u-amber)",
      tagBg: "var(--u-amber-tint)",
      title: "Handles TransientError without data loss",
      code: "test_no_double_send_on_retry PASS",
      cite: "test run · 0.34s",
    },
  ];
  return (
    <div className="u-pv u-pv-light">
      <div
        style={{
          padding: "20px 28px",
          borderBottom: "1px solid var(--u-line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Sarah Kim · Evidence report</div>
          <div style={{ fontSize: 13, color: "var(--u-muted)", marginTop: 2 }}>
            Webhook retry incident · submitted 2h ago
          </div>
        </div>
        <span className="u-chip teal" style={{ marginLeft: "auto" }}>
          12/12 tests passed
        </span>
      </div>
      <div style={{ padding: "8px 28px 24px" }}>
        {findings.map((f) => (
          <div
            key={f.title}
            style={{
              border: "1px solid var(--u-line-soft)",
              borderRadius: 10,
              padding: 16,
              marginTop: 16,
              background: "var(--u-bg)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span
                className="u-chip"
                style={{
                  fontSize: 11,
                  color: f.tagColor,
                  background: f.tagBg,
                  borderColor: "transparent",
                }}
              >
                {f.tag}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{f.title}</span>
            </div>
            <div
              style={{
                fontFamily: "var(--u-mono)",
                fontSize: 12.5,
                background: "var(--u-bg-2)",
                padding: "8px 12px",
                borderRadius: 6,
                color: "var(--u-muted)",
                marginBottom: 8,
              }}
            >
              {f.code}
            </div>
            <div
              style={{ fontSize: 12, color: "var(--u-faint)", fontFamily: "var(--u-mono)" }}
            >
              {f.cite}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <span className="u-btn u-btn-dark u-btn-sm" style={{ flex: 1 }}>
            Advance →
          </span>
          <span className="u-btn u-btn-light u-btn-sm" style={{ flex: 1 }}>
            Add note
          </span>
        </div>
      </div>
    </div>
  );
}

/* How-hiring-works step mini visuals */
function StepCreateRoleVisual() {
  return (
    <div
      style={{
        background: "var(--u-bg)",
        border: "1px solid var(--u-line-soft)",
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>New role</div>
      {[
        ["Title", "Backend Engineer"],
        ["Scenario", "Webhook retry incident"],
      ].map(([label, value]) => (
        <div
          key={label}
          style={{
            background: "var(--u-surface)",
            border: "1px solid var(--u-line-soft)",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--u-faint)", marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["Python", "45 min", "12 tests"].map((t) => (
          <span key={t} className="u-chip teal" style={{ fontSize: 11 }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepInviteVisual() {
  const rows = [
    { name: "Priya S.", status: "Accepted", on: true },
    { name: "Marcus T.", status: "Accepted", on: true },
    { name: "Elena R.", status: "Sent", on: false },
  ];
  return (
    <div
      style={{
        background: "var(--u-bg)",
        border: "1px solid var(--u-line-soft)",
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Invite candidates</div>
      {rows.map((r) => (
        <div
          key={r.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--u-surface)",
            border: "1px solid var(--u-line-soft)",
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--u-bg-2)",
              color: "var(--u-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {r.name.charAt(0)}
          </div>
          <span style={{ fontSize: 13, flex: 1, fontWeight: 500 }}>{r.name}</span>
          <span className={`u-chip${r.on ? " teal" : ""}`} style={{ fontSize: 11 }}>
            {r.status}
          </span>
        </div>
      ))}
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--u-accent-deep)",
          background: "var(--u-surface)",
          border: "1px dashed var(--u-line)",
          borderRadius: 8,
          padding: "10px 12px",
          textAlign: "center",
        }}
      >
        + Send invite link
      </div>
    </div>
  );
}

function StepReviewVisual() {
  return (
    <div
      style={{
        background: "var(--u-bg)",
        border: "1px solid var(--u-line-soft)",
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Review evidence</div>
      <div
        style={{
          background: "var(--u-surface)",
          border: "1px solid var(--u-line-soft)",
          borderRadius: 8,
          padding: 12,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span className="u-chip teal" style={{ fontSize: 10 }}>
            Observed
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Fixed duplicate receipt</span>
        </div>
        <div style={{ fontSize: 11, fontFamily: "var(--u-mono)", color: "var(--u-faint)" }}>
          src/worker.py:13-15
        </div>
      </div>
      <div
        style={{
          background: "var(--u-surface)",
          border: "1px solid var(--u-line-soft)",
          borderRadius: 8,
          padding: 12,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span className="u-chip amber" style={{ fontSize: 10 }}>
            Generated
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>12/12 tests pass</span>
        </div>
        <div style={{ fontSize: 11, fontFamily: "var(--u-mono)", color: "var(--u-faint)" }}>
          0.34s · all green
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--u-faint)" }}>Every claim opens to proof.</div>
    </div>
  );
}

function StepDecideVisual() {
  return (
    <div
      style={{
        background: "var(--u-bg)",
        border: "1px solid var(--u-line-soft)",
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Make a decision</div>
      <div
        style={{
          background: "var(--u-surface)",
          border: "1px solid var(--u-line-soft)",
          borderRadius: 8,
          padding: "10px 12px",
          marginBottom: 10,
          fontSize: 12.5,
          color: "var(--u-muted)",
          lineHeight: 1.6,
        }}
      >
        &ldquo;Strong debugging. Clean diff. Moved fast on the repro.&rdquo;
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <span className="u-btn u-btn-dark u-btn-sm" style={{ flex: 1 }}>
          Advance →
        </span>
        <span className="u-btn u-btn-light u-btn-sm" style={{ flex: 1 }}>
          Pass
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--u-faint)", marginTop: 10 }}>
        Notes stay with the report.
      </div>
    </div>
  );
}

const HIRING_STEPS = [
  {
    title: "Create a role",
    desc: "Pick a scenario. Set the time limit.",
    visual: <StepCreateRoleVisual />,
  },
  {
    title: "Invite candidates",
    desc: "Send links. They start when ready.",
    visual: <StepInviteVisual />,
  },
  {
    title: "Review evidence",
    desc: "Open the report. Click into proof.",
    visual: <StepReviewVisual />,
  },
  {
    title: "Make a decision",
    desc: "Advance or pass. Leave a note.",
    visual: <StepDecideVisual />,
  },
] as const;

/* Section visual: the full evidence report - findings / code and tests / decision */
function FullEvidenceReportVisual() {
  const tests = [
    ["test_no_double_send_on_retry", "0.34s"],
    ["test_retry_after_transient_error", "0.41s"],
    ["test_receipt_sent_once", "0.22s"],
    ["test_backoff_between_attempts", "0.58s"],
    ["test_queue_survives_restart", "0.47s"],
  ];
  const findings = [
    {
      tag: "Observed",
      title: "Reproduced the bug before fixing it",
      detail: "First test run showed duplicate receipts. Then the fix landed.",
      cite: "test runs 1-14 · 00:04 to 00:21",
    },
    {
      tag: "Observed",
      title: "Rejected the AI patch",
      detail: "The suggested patch masked the root cause. They wrote their own.",
      cite: "00:12 · diff vs AI patch",
    },
    {
      tag: "Generated",
      title: "Idempotency check covers all retry paths",
      detail: "Every send site now checks the sent set first.",
      cite: "src/worker.py:13-22 · commit 4f1c9a2",
    },
  ];
  return (
    <div className="u-visual u-pv u-pv-light">
      <div
        style={{
          padding: "20px 28px",
          borderBottom: "1px solid var(--u-line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Sarah Kim · Webhook retry incident</div>
          <div style={{ fontSize: 13, color: "var(--u-muted)", marginTop: 2 }}>
            Submitted 2h ago · 38 minutes · 14 test runs · 6 file changes
          </div>
        </div>
        <span className="u-chip teal" style={{ marginLeft: "auto" }}>
          12/12 tests passed
        </span>
      </div>
      <div className="u-ev-row">
        <div className="u-ev-col">
          <h4>Findings</h4>
          {findings.map((f) => (
            <div className="u-ev-item" key={f.title}>
              <span
                className={`u-chip${f.tag === "Observed" ? " teal" : " amber"}`}
                style={{ fontSize: 11 }}
              >
                {f.tag}
              </span>
              <div className="t" style={{ marginTop: 8 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--u-muted)", marginBottom: 8 }}>
                {f.detail}
              </div>
              <div className="m" style={{ color: "var(--u-accent-deep)" }}>
                {f.cite} →
              </div>
            </div>
          ))}
        </div>
        <div className="u-ev-col">
          <h4>Code and tests</h4>
          <div
            style={{
              fontFamily: "var(--u-mono)",
              fontSize: 12,
              lineHeight: 1.7,
              background: "var(--u-bg)",
              border: "1px solid var(--u-line-soft)",
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
              overflowX: "auto",
            }}
          >
            <div style={{ color: "#f87171" }}>- send_receipt(job.receipt)</div>
            <div style={{ color: "#0e7c66" }}>+ if job.id not in sent_set:</div>
            <div style={{ color: "#0e7c66" }}>+ send_receipt(job.receipt)</div>
            <div style={{ color: "#0e7c66" }}>+ sent_set.add(job.id)</div>
            <div style={{ color: "var(--u-faint)", marginTop: 8 }}>src/worker.py · +3 −1</div>
          </div>
          {tests.map(([name, time]) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid var(--u-line-soft)",
                fontSize: 13,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--u-accent)", flexShrink: 0 }} />
              <span
                style={{
                  fontFamily: "var(--u-mono)",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>
              <span style={{ color: "var(--u-faint)", fontFamily: "var(--u-mono)", fontSize: 12 }}>
                {time}
              </span>
            </div>
          ))}
          <div style={{ fontSize: 12.5, color: "var(--u-faint)", marginTop: 8 }}>
            + 7 more, all passing
          </div>
        </div>
        <div className="u-ev-col">
          <h4>Your decision</h4>
          <div className="u-ev-item">
            <div className="t">Reviewer note</div>
            <div style={{ fontSize: 13, color: "var(--u-muted)", lineHeight: 1.6 }}>
              &ldquo;Strong debugging. Clean diff. Moved fast on the repro.&rdquo;
            </div>
          </div>
          <div className="u-ev-item">
            <div className="t">Evidence quality</div>
            <div className="m">38 min · 14 runs · 12/12 green</div>
          </div>
          <span className="u-btn u-btn-dark u-btn-sm" style={{ width: "100%", marginBottom: 8 }}>
            Advance →
          </span>
          <span className="u-btn u-btn-light u-btn-sm" style={{ width: "100%" }}>
            Pass
          </span>
          <div style={{ fontSize: 12.5, color: "var(--u-faint)", marginTop: 12 }}>
            Notes stay with the report.
          </div>
        </div>
      </div>
    </div>
  );
}

/* Section visual: the session timeline - what the reviewer sees */
function SessionTimelineVisual() {
  const rows = [
    { time: "00:00", title: "Started", desc: "Opened the incident brief" },
    { time: "00:04", title: "First test run", desc: "3 failed: bug reproduced" },
    { time: "00:12", title: "Reviewed AI patch", desc: "Rejected: patch masked the root cause" },
    { time: "00:21", title: "Fix applied", desc: "Added idempotency check in worker.py" },
    { time: "00:28", title: "All tests pass", desc: "12/12 green" },
    { time: "00:38", title: "Submitted", desc: "Report generated" },
  ];
  return (
    <div className="u-visual u-pv u-pv-light">
      <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--u-line-soft)" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Session timeline</div>
        <div style={{ fontSize: 13, color: "var(--u-muted)", marginTop: 2 }}>
          38 minutes · 14 test runs · 6 file changes
        </div>
      </div>
      <div style={{ padding: 28 }}>
        {rows.map((row, i) => (
          <div key={row.time} style={{ display: "flex", gap: 16, marginBottom: i === rows.length - 1 ? 0 : 18 }}>
            <div
              style={{
                fontSize: 12,
                fontFamily: "var(--u-mono)",
                color: "var(--u-faint)",
                width: 44,
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              {row.time}
            </div>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--u-accent)",
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{row.title}</div>
              <div style={{ fontSize: 13, color: "var(--u-muted)" }}>{row.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* See vs don't see cards */
const SEE = [
  ["The code they wrote", "Full diff. Every line."],
  ["Every test run", "Pass or fail. Timed."],
  ["How they worked", "Timeline from start to submit."],
  ["Findings with citations", "Each claim links to proof."],
] as const;

const DONT_SEE = [
  ["No scores or rankings", "You judge the work yourself."],
  ["No personal data", "Private until they share it."],
  ["No browsing or keystrokes", "Only test runs and file changes."],
  ["Nothing off the record", "Recording is disclosed upfront."],
] as const;

/* Role templates */
const ROLE_TEMPLATES = [
  {
    title: "Backend Engineer",
    scenario: "Webhook retry incident",
    tags: ["Python", "45 min", "12 tests"],
    skills: [
      "Debugging under pressure",
      "Idempotent design",
      "Error handling",
      "Reading unfamiliar code",
    ],
  },
  {
    title: "Frontend Engineer",
    scenario: "Stale search results",
    tags: ["TypeScript", "45 min", "10 tests"],
    skills: ["Race conditions", "Async state", "Debounced input", "User-facing polish"],
  },
] as const;

/* Pricing plans */
const PLANS = [
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
] as const;

const FAQS = [
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

export default function EmployersPageV2() {
  return (
    <div className="u-mkt">
      <UnifiedNav current="/employers" />

      {/* HERO */}
      <header className="u-hero">
        <div className="u-wrap">
          <div className="u-hero-grid">
            <div>
              <p className="u-eyebrow">For employers</p>
              <h1>Hire for the work.</h1>
            </div>
            <div className="u-hero-sub">
              <p>Evidence from real simulations. Review code, not résumés.</p>
              <div className="u-hero-ctas">
                <Link href="/get-started" className="u-btn u-btn-dark">
                  Get started
                </Link>
                <Link href="/demo" className="u-btn u-btn-light">
                  See a sample report
                </Link>
              </div>
            </div>
          </div>
          <div className="u-hero-visual">
            <EvidenceReportHeroVisual />
          </div>
        </div>
      </header>

      {/* HOW HIRING WORKS */}
      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>How hiring works.</h2>
            <div className="u-sec-desc">
              <p>Four steps. From open role to decision, with evidence at every step.</p>
              <Link href="/get-started" className="u-learn">
                <span className="u-learn-num">1.0</span> Get started{" "}
                <span className="u-learn-arrow">→</span>
              </Link>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 24,
            }}
          >
            {HIRING_STEPS.map((step, i) => (
              <div className="u-card" key={step.title}>
                {step.visual}
                <span className="u-step">STEP {i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE EVIDENCE REPORT */}
      <section className="u-section tinted">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>The evidence report.</h2>
            <div className="u-sec-desc">
              <p>
                This is what lands in your inbox. Tests, diff, timing, findings. Each finding
                links to the file, commit, or test behind it.
              </p>
              <Link href="/demo" className="u-learn">
                <span className="u-learn-num">2.0</span> See a sample{" "}
                <span className="u-learn-arrow">→</span>
              </Link>
            </div>
          </div>
          <FullEvidenceReportVisual />
          <p className="u-visual-caption">
            Findings, code, and your decision in one view. Every claim opens to proof.
          </p>
          <div style={{ marginTop: 48 }}>
            <SessionTimelineVisual />
            <p className="u-visual-caption">
              The session behind the report. Every run timed, every fix recorded.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT YOU SEE / DON'T */}
      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>What you see.</h2>
            <div className="u-sec-desc">
              <p>The report shows work. Nothing else.</p>
              <Link href="/trust" className="u-learn">
                <span className="u-learn-num">3.0</span> How evidence works{" "}
                <span className="u-learn-arrow">→</span>
              </Link>
            </div>
          </div>
          <div className="u-cards-2">
            <div className="u-card">
              <h3>What you see</h3>
              {SEE.map(([title, desc]) => (
                <div key={title} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--u-accent-tint)",
                      color: "var(--u-accent-deep)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    ✓
                  </span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
                    <div style={{ fontSize: 14, color: "var(--u-muted)" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="u-card">
              <h3>What you don&apos;t</h3>
              {DONT_SEE.map(([title, desc]) => (
                <div key={title} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "1px solid var(--u-line)",
                      color: "var(--u-faint)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    ×
                  </span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
                    <div style={{ fontSize: 14, color: "var(--u-muted)" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ROLE TEMPLATES */}
      <section className="u-section tinted">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Start from a template.</h2>
            <div className="u-sec-desc">
              <p>Real scenarios. Tuned for the role. Ready in minutes.</p>
            </div>
          </div>
          <div className="u-cards-2">
            {ROLE_TEMPLATES.map((r) => (
              <div className="u-card" key={r.title}>
                <h3>{r.title}</h3>
                <p style={{ fontWeight: 600, color: "var(--u-ink)" }}>{r.scenario}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0 8px" }}>
                  {r.tags.map((t) => (
                    <span key={t} className="u-chip" style={{ fontSize: 12 }}>
                      {t}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "var(--u-faint)",
                    marginTop: 12,
                  }}
                >
                  WHAT IT TESTS
                </div>
                <ul style={{ margin: "8px 0 24px", padding: 0, listStyle: "none" }}>
                  {r.skills.map((s) => (
                    <li
                      key={s}
                      style={{
                        fontSize: 14,
                        color: "var(--u-muted)",
                        padding: "7px 0",
                        borderBottom: "1px solid var(--u-line-soft)",
                      }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
                <Link href="/get-started" className="u-btn u-btn-light u-btn-sm">
                  Use this template <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Pay for completed work.</h2>
            <div className="u-sec-desc">
              <p>No seats. No commitments. You pay when a candidate submits.</p>
              <Link href="/pricing" className="u-learn">
                <span className="u-learn-num">4.0</span> Full pricing{" "}
                <span className="u-learn-arrow">→</span>
              </Link>
            </div>
          </div>
          <div className="u-price-grid">
            {PLANS.map((p) => (
              <div className="u-price-card" key={p.name}>
                <h3>{p.name}</h3>
                <div className="u-price">{p.price}</div>
                <div className="u-per">{p.unit}</div>
                <ul>
                  <li>{p.desc}</li>
                </ul>
                <Link
                  href={p.href}
                  className={`u-btn u-btn-sm${p.dark ? " u-btn-dark" : " u-btn-light"}`}
                  style={{ width: "100%" }}
                >
                  {p.cta} <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="u-section tinted">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Questions.</h2>
            <div className="u-sec-desc">
              <p>Short answers. No sales pitch.</p>
            </div>
          </div>
          <Faq items={FAQS} />
        </div>
      </section>

      <CtaBand />
      <UnifiedFooter />
    </div>
  );
}
