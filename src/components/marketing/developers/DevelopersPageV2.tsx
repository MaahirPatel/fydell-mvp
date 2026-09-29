import Link from "next/link";
import {
  UnifiedNav,
  UnifiedFooter,
  CtaBand,
  Faq,
} from "@/components/marketing/unified/UnifiedChrome";

/* ============================================================================
   /developers - for engineers. Unified Linear-grade structure.
   Server component. Faq is the client island.
   ========================================================================== */

/* Hero visual: the incident brief - the candidate's starting point */
function IncidentBriefVisual() {
  return (
    <div className="u-pv u-pv-light">
      <div
        className="u-pv-titlebar"
        style={{ borderBottom: "1px solid var(--u-line-soft)", color: "var(--u-muted)" }}
      >
        <span className="u-pv-title">harbor-webhooks / retry-safe-jobs · Simulation brief</span>
        <span className="u-chip amber" style={{ marginLeft: "auto" }}>
          45:00 remaining
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr" }}>
        <div style={{ padding: 28 }}>
          <p className="u-pv-pane-label">Incident brief</p>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 12 }}>
            Webhook receipts are sending twice on retry
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--u-muted)", margin: "0 0 16px" }}>
            Customers report duplicate receipts after network blips. The retry logic in{" "}
            <code
              style={{
                fontFamily: "var(--u-mono)",
                fontSize: 13,
                background: "var(--u-bg-2)",
                padding: "2px 8px",
                borderRadius: 6,
              }}
            >
              worker.py
            </code>{" "}
            re-sends instead of checking first. Fix it. Tests must pass.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Python", "12 tests", "AI patch included"].map((tag) => (
              <span key={tag} className="u-chip">
                {tag}
              </span>
            ))}
          </div>
          <div
            style={{
              marginTop: 20,
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--u-accent-tint)",
              fontSize: 13.5,
              color: "var(--u-accent-deep)",
              fontWeight: 500,
            }}
          >
            Recording disclosed: test runs and file changes are recorded. Nothing else.
          </div>
        </div>
        <div
          style={{
            borderLeft: "1px solid var(--u-line-soft)",
            padding: 28,
            background: "var(--u-bg)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>What gets recorded</div>
          {[
            ["Test runs", "Every run, pass or fail"],
            ["File changes", "Diffs at submit time"],
            ["Timing", "Start, submit, duration"],
          ].map(([title, desc]) => (
            <div key={title} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--u-accent-deep)" }}>
                ● {title}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--u-muted)", marginTop: 2 }}>{desc}</div>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 700, margin: "20px 0 12px" }}>What never is</div>
          {["Browsing", "Other windows", "Keystrokes"].map((t) => (
            <div key={t} style={{ fontSize: 13, color: "var(--u-muted)", marginBottom: 6 }}>
              ○ {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Step visuals for the 3-step cards */
function StepBriefVisual() {
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
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--u-faint)", marginBottom: 8 }}>
        INCIDENT BRIEF
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
        Webhook receipts are sending twice on retry
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["Python", "12 tests", "45:00"].map((tag) => (
          <span key={tag} className="u-chip" style={{ fontSize: 11 }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepFixVisual() {
  return (
    <div
      style={{
        background: "var(--u-dark)",
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
        fontFamily: "var(--u-mono)",
        fontSize: 12,
        lineHeight: 1.8,
        color: "#d7dce2",
      }}
    >
      <div>
        <span style={{ color: "#5b6470" }}>14 </span>
        <span style={{ color: "#c792ea" }}>if</span> receipt.id{" "}
        <span style={{ color: "#c792ea" }}>in</span> sent_receipts:
      </div>
      <div>
        <span style={{ color: "#5b6470" }}>15 </span>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#c792ea" }}>return</span>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
        <span className="u-chip teal" style={{ fontSize: 11 }}>
          12 passed
        </span>
        <span className="u-chip" style={{ fontSize: 11 }}>
          0 failed
        </span>
      </div>
    </div>
  );
}

function StepSubmitVisual() {
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Evidence receipt</span>
        <span className="u-chip teal" style={{ fontSize: 11 }}>
          Verified
        </span>
      </div>
      {[
        ["12 tests", "all passing"],
        ["38 min", "total time"],
        ["1 diff", "worker.py"],
      ].map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12.5,
            padding: "7px 0",
            borderTop: "1px solid var(--u-line-soft)",
          }}
        >
          <span style={{ fontWeight: 600 }}>{k}</span>
          <span style={{ color: "var(--u-muted)" }}>{v}</span>
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

/* Section visual: the harbor-webhooks fix, with test runs */
function SimulationCodeVisual() {
  return (
    <div className="u-visual u-pv u-pv-dark">
      <div className="u-pv-titlebar">
        <div className="u-pv-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="u-pv-title">worker.py · harbor-webhooks</span>
        <span className="u-chip teal" style={{ marginLeft: "auto" }}>
          The fix
        </span>
      </div>
      <div className="u-pv-body">
        <div className="u-pv-side">
          <p className="u-pv-pane-label">Files</p>
          <div className="u-pv-file">__init__.py</div>
          <div className="u-pv-file active">worker.py</div>
          <div className="u-pv-file">test_worker.py</div>
          <div className="u-pv-file">requirements.txt</div>
        </div>
        <div className="u-pv-code">
          <div className="ln">
            <span className="ln-no">1</span>
            <span>
              <span className="tok-kw">def</span> <span className="tok-fn">handle_retry</span>
              <span className="tok-pl">(job):</span>
            </span>
          </div>
          <div className="ln">
            <span className="ln-no">2</span>
            <span>
              <span className="tok-pl">    receipt = </span>
              <span className="tok-fn">build_receipt</span>
              <span className="tok-pl">(job)</span>
            </span>
          </div>
          <div className="ln hl">
            <span className="ln-no">3</span>
            <span>
              <span className="tok-pl">    </span>
              <span className="tok-kw">if</span>
              <span className="tok-pl"> receipt.id </span>
              <span className="tok-kw">in</span>
              <span className="tok-pl"> sent_receipts:</span>
            </span>
          </div>
          <div className="ln hl">
            <span className="ln-no">4</span>
            <span>
              <span className="tok-pl">        </span>
              <span className="tok-kw">return</span>
              <span className="tok-pl">  </span>
              <span className="tok-cm"># already sent, skip</span>
            </span>
          </div>
          <div className="ln">
            <span className="ln-no">5</span>
            <span>
              <span className="tok-pl">    </span>
              <span className="tok-fn">send_receipt</span>
              <span className="tok-pl">(receipt)</span>
            </span>
          </div>
          <div className="ln">
            <span className="ln-no">6</span>
            <span>
              <span className="tok-pl">    sent_receipts.</span>
              <span className="tok-fn">add</span>
              <span className="tok-pl">(receipt.id)</span>
            </span>
          </div>
        </div>
        <div className="u-pv-side right">
          <p className="u-pv-pane-label">Test runs</p>
          {[
            ["test_idempotent_retry", "0.34s"],
            ["test_no_duplicate_send", "0.41s"],
            ["test_retry_backoff", "0.58s"],
          ].map(([name, dur]) => (
            <div className="u-pv-test" key={name}>
              <span className="pass">●</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </span>
              <span className="dur">{dur}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "#5b6470", padding: "8px", fontFamily: "var(--u-mono)" }}>
            … 9 more
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 12.5,
              fontWeight: 700,
              color: "#4ade80",
              padding: "0 8px",
              fontFamily: "var(--u-mono)",
            }}
          >
            12 passed · 0 failed · 2.1s
          </div>
        </div>
      </div>
    </div>
  );
}

/* Section visual: the desktop app - work locally, submit once */
function DesktopVisual() {
  return (
    <div className="u-visual u-pv u-pv-light">
      <div className="u-pv-titlebar" style={{ borderBottom: "1px solid var(--u-line-soft)" }}>
        <span className="u-pv-title" style={{ color: "var(--u-muted)" }}>
          Fydell Desktop · harbor-webhooks
        </span>
        <span className="u-chip" style={{ marginLeft: "auto" }}>
          Local
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px" }}>
        <div style={{ padding: 20, fontFamily: "var(--u-mono)", fontSize: 13, lineHeight: 1.8 }}>
          <div>
            <span style={{ color: "var(--u-faint)" }}>13</span>
            {"  "}send_receipt(job.receipt)
          </div>
          <div style={{ background: "var(--u-amber-tint)", margin: "0 -20px", padding: "0 20px" }}>
            <span style={{ color: "var(--u-faint)" }}>14</span>
            {"  "}
            <span style={{ color: "#6D28D9" }}>except</span> TransientError:
          </div>
          <div style={{ background: "var(--u-amber-tint)", margin: "0 -20px", padding: "0 20px" }}>
            <span style={{ color: "var(--u-faint)" }}>15</span>
            {"      "}
            <span style={{ color: "#B45309" }}># TODO: check sent set first</span>
          </div>
          <div>
            <span style={{ color: "var(--u-faint)" }}>16</span>
            {"      "}
            <span style={{ color: "#6D28D9" }}>raise</span>
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--u-line-soft)", padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Test runs</div>
          {[
            ["9 passed", "#4ade80", "2.1s"],
            ["3 failed", "#f87171", "0.8s"],
          ].map(([label, color, time]) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                padding: "9px 10px",
                background: "var(--u-bg)",
                border: "1px solid var(--u-line-soft)",
                borderRadius: 8,
                marginBottom: 6,
                fontFamily: "var(--u-mono)",
              }}
            >
              <span style={{ color }}>●</span>
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ color: "var(--u-faint)" }}>{time}</span>
            </div>
          ))}
          <span className="u-btn u-btn-dark u-btn-sm" style={{ width: "100%", marginTop: 12 }}>
            Submit
          </span>
          <div style={{ fontSize: 11.5, color: "var(--u-faint)", marginTop: 8, textAlign: "center" }}>
            One atomic submit. Nothing leaves before.
          </div>
        </div>
      </div>
    </div>
  );
}

/* Recording disclosure cards */
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

/* Section visual: passport with share controls - the engineer owns it */
function PassportVisual() {
  return (
    <div className="u-visual u-pv u-pv-light">
      <div style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--u-accent), var(--u-accent-deep))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            SK
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Sarah Kim</div>
            <div style={{ fontSize: 13, color: "var(--u-muted)" }}>
              Backend Engineer · 6 simulations
            </div>
          </div>
          <span className="u-chip teal" style={{ marginLeft: "auto" }}>
            You own this
          </span>
        </div>
        {(
          [
            ["Webhook retry incident", "12 tests passed · 38 min", true],
            ["API rate limiting", "8 tests passed · 42 min", true],
            ["Database migration", "15 tests passed · 51 min", false],
          ] as const
        ).map(([title, meta, shared]) => (
          <div className="u-toggle-row" key={title}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
              <div style={{ fontSize: 12.5, color: "var(--u-muted)" }}>{meta}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12.5, color: "var(--u-faint)" }}>
                {shared ? "Shared" : "Private"}
              </span>
              <div className={`u-toggle${shared ? "" : " off"}`} />
            </div>
          </div>
        ))}
        <div style={{ fontSize: 12.5, color: "var(--u-faint)", marginTop: 16 }}>
          Toggle a simulation to share or hide it. Links are per-employer. Revoke anytime.
        </div>
      </div>
    </div>
  );
}

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
];

export default function DevelopersPageV2() {
  return (
    <div className="u-mkt">
      <UnifiedNav current="/developers" />

      {/* HERO */}
      <header className="u-hero">
        <div className="u-wrap">
          <div className="u-hero-grid">
            <div>
              <p className="u-eyebrow">For developers</p>
              <h1>Build your proof.</h1>
            </div>
            <div className="u-hero-sub">
              <p>Real simulations. A passport you own. Free for engineers.</p>
              <div className="u-hero-ctas">
                <Link href="/passport/new" className="u-btn u-btn-dark">
                  Build your passport
                </Link>
                <Link href="/demo" className="u-btn u-btn-light">
                  See an example
                </Link>
              </div>
            </div>
          </div>
          <div className="u-hero-visual">
            <IncidentBriefVisual />
          </div>
        </div>
      </header>

      {/* HOW IT WORKS */}
      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>How it works.</h2>
            <div className="u-sec-desc">
              <p>Three steps. One finished simulation becomes a verified record.</p>
              <Link href="/demo" className="u-learn">
                <span className="u-learn-num">1.0</span> Try the demo{" "}
                <span className="u-learn-arrow">→</span>
              </Link>
            </div>
          </div>
          <div className="u-cards-3">
            {HOW_IT_WORKS.map((step, i) => (
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

      {/* A REAL SIMULATION */}
      <section className="u-section tinted">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>A real simulation.</h2>
            <div className="u-sec-desc">
              <p>
                Real incidents, real code. harbor-webhooks: receipts send twice on retry. Find
                the bug. Fix it. Prove it.
              </p>
              <Link href="/demo" className="u-learn">
                <span className="u-learn-num">2.0</span> Run this simulation{" "}
                <span className="u-learn-arrow">→</span>
              </Link>
            </div>
          </div>
          <SimulationCodeVisual />
          <p className="u-visual-caption">
            The fix: an idempotency check before send. 12 tests pass in 2.1 seconds.
          </p>
          <div style={{ marginTop: 48 }}>
            <DesktopVisual />
            <p className="u-visual-caption">
              Work in the Fydell desktop app on your own machine.{" "}
              <Link href="/download" style={{ color: "var(--u-accent-deep)", fontWeight: 600 }}>
                Download it here.
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* RECORDING DISCLOSURE */}
      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Know what&apos;s recorded.</h2>
            <div className="u-sec-desc">
              <p>Recording is disclosed before you start. It covers your work, not your life.</p>
              <Link href="/trust" className="u-learn">
                <span className="u-learn-num">3.0</span> How recording works{" "}
                <span className="u-learn-arrow">→</span>
              </Link>
            </div>
          </div>
          <div className="u-cards-2">
            <div className="u-card">
              <h3>What gets recorded</h3>
              {RECORDED.map(([title, desc]) => (
                <div key={title} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--u-accent-deep)",
                      marginBottom: 4,
                    }}
                  >
                    ● {title}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--u-muted)", lineHeight: 1.6 }}>
                    {desc}
                  </div>
                </div>
              ))}
            </div>
            <div className="u-card">
              <h3>What never is</h3>
              {NEVER_RECORDED.map(([title, desc]) => (
                <div key={title} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>○ {title}</div>
                  <div style={{ fontSize: 14, color: "var(--u-muted)", lineHeight: 1.6 }}>
                    {desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PASSPORT */}
      <section className="u-section tinted">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Your passport.</h2>
            <div className="u-sec-desc">
              <p>
                Every finished simulation becomes a verified passport entry. You own it. You
                share it.
              </p>
              <Link href="/passport/new" className="u-learn">
                <span className="u-learn-num">4.0</span> Start your passport{" "}
                <span className="u-learn-arrow">→</span>
              </Link>
            </div>
          </div>
          <PassportVisual />
          <ul className="u-feat-list">
            <li>You own your data</li>
            <li>Per-employer share links</li>
            <li>Revoke anytime</li>
            <li>Delete everything on request</li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Questions, answered.</h2>
            <div className="u-sec-desc">
              <p>Short answers to the things engineers ask first.</p>
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
