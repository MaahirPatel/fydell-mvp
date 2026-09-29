import Link from "next/link";
import { UnifiedNav, UnifiedFooter, CtaBand, Faq } from "@/components/marketing/unified/UnifiedChrome";

export const metadata = {
  title: "Product",
  description: "How Fydell works: real simulations, verified passports, and evidence reports you can inspect.",
};

function LearnMore({ num, label, href }: { num: string; label: string; href: string }) {
  return (
    <a className="u-learn" href={href}>
      <span className="u-learn-num">{num}</span>
      {label}
      <span className="u-learn-arrow">→</span>
    </a>
  );
}

function SectionHead({ id, num, learnLabel, learnHref, title, children }: {
  id: string; num: string; learnLabel: string; learnHref: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="u-sec-head">
      <h2 id={id}>{title}</h2>
      <div className="u-sec-desc">
        {children}
        <LearnMore num={num} label={learnLabel} href={learnHref} />
      </div>
    </div>
  );
}

/* Hero visual: the candidate's simulation workspace, dark 3-pane */
function HeroWorkspace() {
  return (
    <div className="u-pv u-pv-dark">
      <div className="u-pv-titlebar">
        <div className="u-pv-dots"><span /><span /><span /></div>
        <span className="u-pv-title">harbor-webhooks / retry-safe-jobs</span>
        <span className="u-chip teal" style={{ marginLeft: "auto" }}>42:18 left</span>
      </div>
      <div className="u-pv-body">
        <div className="u-pv-side">
          <p className="u-pv-pane-label">Scenario</p>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4, padding: "0 8px" }}>
            Webhook retry incident
          </div>
          <div style={{ fontSize: 12.5, color: "#9aa3ad", lineHeight: 1.6, marginBottom: 20, padding: "0 8px" }}>
            Receipts are sent twice when the worker retries. Find the bug. Fix it. Prove it.
          </div>
          <p className="u-pv-pane-label">Files</p>
          <div className="u-pv-file active">worker.py</div>
          <div className="u-pv-file">mailer.py</div>
          <div className="u-pv-file">claims.py</div>
        </div>
        <div className="u-pv-code">
          <div className="ln"><span className="ln-no">11</span><span><span className="tok-kw">def</span> <span className="tok-fn">process</span><span className="tok-pl">(job):</span></span></div>
          <div className="ln"><span className="ln-no">12</span><span><span className="tok-pl">    </span><span className="tok-kw">try</span><span className="tok-pl">:</span></span></div>
          <div className="ln hl"><span className="ln-no">13</span><span><span className="tok-pl">        send_receipt(job.receipt)</span></span></div>
          <div className="ln"><span className="ln-no">14</span><span><span className="tok-pl">    </span><span className="tok-kw">except</span><span className="tok-pl"> TransientError:</span></span></div>
          <div className="ln"><span className="ln-no">15</span><span><span className="tok-pl">        </span><span className="tok-kw">raise</span></span></div>
          <div style={{ marginTop: 16, fontFamily: "Arial, sans-serif", fontSize: 12, color: "#9aa3ad" }}>
            <span style={{ background: "rgba(247,140,108,0.16)", color: "#f78c6c", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>
              Line 13 runs before the retry guard.
            </span>
          </div>
        </div>
        <div className="u-pv-side right">
          <p className="u-pv-pane-label">Conversation</p>
          <div style={{ marginBottom: 14, padding: "0 8px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c792ea", marginBottom: 4 }}>Interviewer</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "#d7dce2" }}>
              Walk me through what happens on retry.
            </div>
          </div>
          <div style={{ marginBottom: 20, padding: "0 8px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#14b8a6", marginBottom: 4 }}>You</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "#d7dce2" }}>
              send_receipt fires, then the exception retries the whole block.
            </div>
          </div>
          <p className="u-pv-pane-label">Tests</p>
          <div className="u-pv-test"><span className="pass">✓</span><span>test_no_double_send_on_retry</span><span className="dur">0.34s</span></div>
          <div className="u-pv-test"><span className="pass">✓</span><span>test_receipt_idempotent</span><span className="dur">0.18s</span></div>
        </div>
      </div>
    </div>
  );
}

/* Section 1 visual: the client view. Editor, test output, submit. */
function ClientVisual() {
  return (
    <div className="u-pv u-pv-light">
      <div className="u-pv-titlebar" style={{ borderBottom: "1px solid var(--u-line-soft)" }}>
        <div className="u-pv-dots" style={{ filter: "invert(0.85)" }}><span /><span /><span /></div>
        <span className="u-pv-title" style={{ color: "var(--u-muted)" }}>Fydell Simulation Client</span>
        <span className="u-chip amber" style={{ marginLeft: "auto" }}>42:18 left</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px" }}>
        <div style={{ padding: 20, borderRight: "1px solid var(--u-line-soft)" }}>
          <p className="u-pv-pane-label" style={{ color: "var(--u-faint)" }}>worker.py</p>
          <div className="u-pv-code" style={{ padding: 0, color: "var(--u-ink)" }}>
            <div className="ln"><span className="ln-no" style={{ color: "#c4beb0" }}>11</span><span><span className="tok-kw" style={{ color: "#7c3aed" }}>def</span> <span className="tok-fn" style={{ color: "#0e7c66" }}>process</span>(job):</span></div>
            <div className="ln"><span className="ln-no" style={{ color: "#c4beb0" }}>12</span><span>&nbsp;&nbsp;&nbsp;&nbsp;receipt = job.receipt</span></div>
            <div className="ln"><span className="ln-no" style={{ color: "#c4beb0" }}>13</span><span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="tok-kw" style={{ color: "#7c3aed" }}>if</span> <span className="tok-fn" style={{ color: "#0e7c66" }}>already_sent</span>(receipt.id):</span></div>
            <div className="ln"><span className="ln-no" style={{ color: "#c4beb0" }}>14</span><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="tok-kw" style={{ color: "#7c3aed" }}>return</span></span></div>
            <div className="ln" style={{ background: "var(--u-accent-tint)", borderRadius: 4, margin: "0 -12px", padding: "0 12px" }}><span className="ln-no" style={{ color: "#c4beb0" }}>15</span><span>&nbsp;&nbsp;&nbsp;&nbsp;send_receipt(receipt)</span></div>
            <div className="ln"><span className="ln-no" style={{ color: "#c4beb0" }}>16</span><span>&nbsp;&nbsp;&nbsp;&nbsp;<span className="tok-kw" style={{ color: "#7c3aed" }}>except</span> TransientError:</span></div>
            <div className="ln"><span className="ln-no" style={{ color: "#c4beb0" }}>17</span><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="tok-kw" style={{ color: "#7c3aed" }}>raise</span></span></div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <p className="u-pv-pane-label" style={{ color: "var(--u-faint)" }}>Test output</p>
          <div style={{ fontFamily: "var(--u-mono)", fontSize: 12, lineHeight: 1.9, background: "var(--u-bg)", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
            <div><span style={{ color: "#15803D", fontWeight: 700 }}>PASS</span> test_no_double_send <span style={{ color: "var(--u-faint)" }}>0.34s</span></div>
            <div><span style={{ color: "#15803D", fontWeight: 700 }}>PASS</span> test_receipt_idempotent <span style={{ color: "var(--u-faint)" }}>0.18s</span></div>
            <div><span style={{ color: "#DC2626", fontWeight: 700 }}>FAIL</span> test_timeout_during_send <span style={{ color: "var(--u-faint)" }}>0.41s</span></div>
            <div style={{ color: "var(--u-faint)", marginTop: 8 }}>11 passed, 1 failed</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Run tests</div>
          <div style={{ fontSize: 13, color: "var(--u-muted)", lineHeight: 1.6, marginBottom: 20 }}>
            Tests run inside the client. Every run is recorded with its output.
          </div>
          <a href="/get-started" className="u-btn u-btn-dark" style={{ width: "100%" }}>Submit simulation</a>
          <div style={{ fontSize: 12, color: "var(--u-faint)", marginTop: 10, textAlign: "center" }}>
            One click. The recording, diff, and results go with it.
          </div>
        </div>
      </div>
    </div>
  );
}

/* Section 2 visual: passport profile + share toggle rows */
function PassportSharingVisual() {
  return (
    <div className="u-pv u-pv-light">
      <div style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, #0B6E67, #2B5CE6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 20, fontWeight: 600,
          }}>
            SK
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Sarah Kim</div>
            <div style={{ fontSize: 14, color: "var(--u-muted)" }}>Backend Engineer</div>
          </div>
          <span className="u-chip teal" style={{ marginLeft: "auto" }}>6 simulations verified</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--u-faint)", marginBottom: 20, fontFamily: "var(--u-mono)" }}>
          fydell.com/p/sarah-kim
        </div>
        {[
          ["Webhook retry incident", "harbor-webhooks · 12 tests passed · 42 min"],
          ["API rate limiting", "gateway-api · 8 tests passed · 38 min"],
          ["Database migration", "user-store · 15 tests passed · 51 min"],
        ].map(([title, meta]) => (
          <div key={title} className="u-ev-item">
            <div className="t">{title}</div>
            <div className="m">{meta}</div>
          </div>
        ))}
        <div style={{ fontSize: 13, color: "var(--u-muted)", margin: "20px 0 4px" }}>
          Each link is scoped to one employer. Preview it before it goes out. Revoking cuts access instantly.
        </div>
        <div style={{ borderTop: "1px solid var(--u-line-soft)" }}>
          {[
            ["Acme Corp", "Shared 2 days ago · 14 views", true],
            ["Northwind", "Shared 1 week ago · 6 views", true],
            ["Globex", "Revoked yesterday", false],
          ].map(([employer, meta, active]: [string, string, boolean]) => (
            <div key={employer} className="u-toggle-row" style={{ opacity: active ? 1 : 0.55 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{employer}</div>
                <div style={{ fontSize: 13, color: "var(--u-muted)" }}>{meta}</div>
              </div>
              <div className={"u-toggle" + (active ? "" : " off")} aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Section 3 visual: employer review. 3-col findings / code / decision. */
function EmployerReviewVisual() {
  return (
    <div className="u-pv u-pv-light">
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--u-line-soft)", display: "flex", alignItems: "center", gap: 8 }}>
        <div className="u-pv-dots" style={{ filter: "invert(0.85)" }}><span /><span /><span /></div>
        <span style={{ fontSize: 13, color: "var(--u-muted)", marginLeft: 8 }}>Acme · Backend Engineer</span>
        <span className="u-chip" style={{ marginLeft: "auto" }}>Sarah Kim</span>
      </div>
      <div className="u-ev-row">
        <div className="u-ev-col">
          <h4>Findings</h4>
          <div className="u-ev-item">
            <div className="t"><span className="u-chip teal" style={{ marginRight: 8 }}>Observed</span>Fixed the double-send bug</div>
            <div className="m">Moved send_receipt after the idempotency check. 12 tests pass.</div>
          </div>
          <div className="u-ev-item">
            <div className="t"><span className="u-chip amber" style={{ marginRight: 8 }}>Generated</span>Explained the retry flow</div>
            <div className="m">Described exactly when receipts fire during retries.</div>
          </div>
          <div className="u-ev-item">
            <div className="t"><span className="u-chip teal" style={{ marginRight: 8 }}>Observed</span>Handled the edge case</div>
            <div className="m">Covered the timeout-during-send path in tests.</div>
          </div>
        </div>
        <div className="u-ev-col">
          <h4>Code</h4>
          <div className="u-ev-item">
            <div className="t" style={{ fontFamily: "var(--u-mono)", fontSize: 13 }}>src/worker.py:13-15</div>
            <div className="m">receipt = job.receipt<br />if already_sent(receipt.id): return<br />send_receipt(receipt)</div>
          </div>
          <div className="u-ev-item">
            <div className="t" style={{ fontFamily: "var(--u-mono)", fontSize: 13 }}>src/worker.py:28-31</div>
            <div className="m">Timeout-during-send path covered by test_timeout_during_send.</div>
          </div>
          <div className="u-ev-item">
            <div className="t" style={{ fontFamily: "var(--u-mono)", fontSize: 13 }}>conversation · 04:12</div>
            <div className="m">Spoke through the retry flow before touching code.</div>
          </div>
        </div>
        <div className="u-ev-col">
          <h4>Decision</h4>
          <div className="u-ev-item">
            <div className="t">Queue</div>
            <div className="m">Sarah Kim · Evidence ready · 2h ago</div>
          </div>
          <div className="u-ev-item">
            <div className="t">Notes</div>
            <div className="m">Clean fix. Asked one clarifying question first.</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <a href="/get-started" className="u-btn u-btn-dark u-btn-sm">Move to interview</a>
            <a href="/get-started" className="u-btn u-btn-light u-btn-sm">Add note</a>
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--u-line-soft)", fontSize: 13, color: "var(--u-muted)" }}>
        Every claim links to the file, line, or recording behind it. No scores. Just evidence.
      </div>
    </div>
  );
}

/* Section 4 visual: session timeline + recording scope */
function RecordingVisual() {
  const events = [
    { at: "04:12", left: "8%", color: "#6D28D9", label: "Conversation" },
    { at: "11:47", left: "27%", color: "#0B6E67", label: "Test run · 9 passed" },
    { at: "19:03", left: "45%", color: "#2B5CE6", label: "File diff · worker.py" },
    { at: "26:31", left: "62%", color: "#DC2626", label: "Test run · 1 failed" },
    { at: "33:55", left: "79%", color: "#0B6E67", label: "Test run · 12 passed" },
  ];
  return (
    <div className="u-pv u-pv-light">
      <div style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Session timeline</div>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--u-muted)", fontFamily: "var(--u-mono)" }}>
            0:00 → 42:18
          </span>
        </div>
        <div style={{ position: "relative", height: 6, background: "var(--u-bg-2)", borderRadius: 999, marginBottom: 56, marginTop: 56 }}>
          {events.map((e) => (
            <div key={e.at} style={{ position: "absolute", left: e.left, top: "50%", transform: "translate(-50%, -50%)" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: e.color, border: "3px solid #fff", boxShadow: "0 0 0 1px var(--u-line)" }} />
              <div style={{ position: "absolute", top: -56, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{e.label}</div>
                <div style={{ fontSize: 11, color: "var(--u-faint)", fontFamily: "var(--u-mono)" }}>{e.at}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="u-cards-3">
          {[
            ["Test runs", "Every run, pass or fail, with full output."],
            ["File diffs", "The exact changes at submit time."],
            ["Timing", "When work started, paused, and shipped."],
          ].map(([title, desc]) => (
            <div key={title} className="u-card">
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PRODUCT_FAQS = [
  {
    q: "What is a simulation?",
    a: "A timed engineering task in a working repo. Candidates debug a real incident, run tests, and submit a diff. Everything is recorded.",
  },
  {
    q: "Who owns the passport?",
    a: "The engineer. They control every share link and can revoke access or delete recordings at any time.",
  },
  {
    q: "Do candidates need the desktop client?",
    a: "No. The browser client runs the same simulations with the same evidence. The desktop client adds offline work.",
  },
  {
    q: "What does an employer actually see?",
    a: "An evidence report. Each finding cites the file, line, test, or conversation moment behind it. There are no scores.",
  },
];

export default function ProductPage() {
  return (
    <div className="u-mkt">
      <UnifiedNav current="/product" />

      <header className="u-hero">
        <div className="u-wrap">
          <div className="u-hero-grid">
            <h1>The whole loop.</h1>
            <div className="u-hero-sub">
              <p>Simulations, passports, and evidence reports in one workflow.</p>
              <div className="u-hero-ctas">
                <Link href="/demo" className="u-btn u-btn-dark">Explore demo</Link>
                <Link href="/get-started" className="u-btn u-btn-light">Get started</Link>
              </div>
            </div>
          </div>
          <div className="u-hero-visual">
            <HeroWorkspace />
          </div>
        </div>
      </header>

      <section className="u-section">
        <div className="u-wrap">
          <SectionHead id="client" num="1.0" learnLabel="Developers" learnHref="/developers" title="Simulation client.">
            <p>A real editor, live tests, and one submit button. The same simulation runs on desktop and in the browser.</p>
          </SectionHead>
          <div className="u-visual">
            <ClientVisual />
          </div>
          <ul className="u-feat-list">
            <li>A real editor</li>
            <li>Built-in test runner</li>
            <li>Recording indicator</li>
            <li>One-click submit</li>
            <li>Offline first</li>
            <li>Invitation inbox</li>
          </ul>
        </div>
      </section>

      <section className="u-section tinted">
        <div className="u-wrap">
          <SectionHead id="passport" num="2.0" learnLabel="Build a passport" learnHref="/passport/new" title="Passport sharing.">
            <p>Every simulation becomes a verified record. Engineers own it. Teams can inspect it. Each link is scoped to one employer.</p>
          </SectionHead>
          <div className="u-visual">
            <PassportSharingVisual />
          </div>
          <p className="u-visual-caption">Preview a link before it goes out. Revoke it anytime.</p>
        </div>
      </section>

      <section className="u-section">
        <div className="u-wrap">
          <SectionHead id="review" num="3.0" learnLabel="Employers" learnHref="/employers" title="Employer review.">
            <p>One queue for every candidate. Open any report to see the findings, the code, and the decision in one view.</p>
          </SectionHead>
          <div className="u-visual">
            <EmployerReviewVisual />
          </div>
        </div>
      </section>

      <section className="u-section tinted">
        <div className="u-wrap">
          <SectionHead id="recording" num="4.0" learnLabel="Download" learnHref="/download" title="Recording, scoped.">
            <p>Test runs, file diffs, and timing. A timeline of the work. Nothing else is ever captured.</p>
          </SectionHead>
          <div className="u-visual">
            <RecordingVisual />
          </div>
          <div className="u-cards-2" style={{ marginTop: 24 }}>
            <div className="u-card">
              <span className="u-step">Never recorded</span>
              <h3>The client cannot see these.</h3>
              <p>Browsing history. Other windows and tabs. Keystrokes. None of it leaves the machine.</p>
            </div>
            <div className="u-card">
              <span className="u-step">Your controls</span>
              <h3>Your recordings belong to you.</h3>
              <p>Preview before sharing. Revoke any share link. Delete your recordings. Export your data.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Product questions.</h2>
            <div className="u-sec-desc">
              <p>The short answers.</p>
            </div>
          </div>
          <Faq items={PRODUCT_FAQS} />
        </div>
      </section>

      <CtaBand />
      <UnifiedFooter />
    </div>
  );
}
