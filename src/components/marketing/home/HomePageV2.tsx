"use client";

import Link from "next/link";
import "@/styles/marketing-v2.css";

/* ============================================================================
   Fydell homepage — Linear format, Cursor light mode, Stripe color.

   Copy is short like Cursor. Every section has a product visual like Linear.
   No jargon. No AI slop.
   ========================================================================== */

function Logo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="11" cy="14" r="7" stroke="#0B6E67" strokeWidth="2.5" />
        <circle cx="17" cy="14" r="7" stroke="#6D28D9" strokeWidth="2.5" />
      </svg>
      <span style={{ fontSize: 20, fontWeight: 600, color: "var(--mk-text)", letterSpacing: "-0.02em" }}>
        fydell
      </span>
    </Link>
  );
}

function Nav() {
  return (
    <nav className="mk-nav">
      <div className="mk-nav-inner">
        <Logo />
        <div className="mk-nav-links">
          <Link href="/developers">Developers</Link>
          <Link href="/employers">Employers</Link>
          <Link href="/product">Product</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="mk-nav-actions">
          <Link href="/login" style={{ fontSize: 14, color: "var(--mk-text-secondary)", textDecoration: "none" }}>
            Sign in
          </Link>
          <Link href="/get-started" className="mk-btn-dark" style={{ padding: "8px 20px" }}>
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* Product visual: simulation workspace */
function SimVisual() {
  return (
    <div className="mk-visual" style={{ marginTop: 48 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
        </div>
        <span style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginLeft: 8 }}>
          harbor-webhooks / retry-safe-jobs · Fydell Simulation
        </span>
        <span style={{
          marginLeft: "auto",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--mk-teal)",
          background: "#E6F4F2",
          padding: "4px 12px",
          borderRadius: 999,
        }}>
          LIVE
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 280px", minHeight: 320 }}>
        {/* File tree */}
        <div style={{ borderRight: "1px solid var(--mk-border)", padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-tertiary)", marginBottom: 12, letterSpacing: "0.05em" }}>
            HARBOR-WEBHOOKS
          </div>
          {["worker.py", "mailer.py", "claims.py"].map((f, i) => (
            <div key={f} style={{
              fontSize: 13,
              padding: "6px 10px",
              borderRadius: 6,
              background: i === 0 ? "#E6F4F2" : "transparent",
              color: i === 0 ? "var(--mk-text)" : "var(--mk-text-secondary)",
              fontFamily: "monospace",
              marginBottom: 4,
            }}>
              {f}
            </div>
          ))}
        </div>
        {/* Code */}
        <div style={{ padding: 16, fontFamily: "monospace", fontSize: 13, lineHeight: 1.7 }}>
          <div><span style={{ color: "#888" }}>1</span>  <span style={{ color: "#6D28D9" }}>import</span> time</div>
          <div><span style={{ color: "#888" }}>2</span>  <span style={{ color: "#6D28D9" }}>from</span> mailer <span style={{ color: "#6D28D9" }}>import</span> send_receipt</div>
          <div><span style={{ color: "#888" }}>3</span>  <span style={{ color: "#6D28D9" }}>from</span> claims <span style={{ color: "#6D28D9" }}>import</span> ClaimStore</div>
          <div style={{ marginTop: 12 }}><span style={{ color: "#888" }}>13</span>  send_receipt(job.receipt)</div>
          <div><span style={{ color: "#888" }}>14</span>  <span style={{ color: "#6D28D9" }}>except</span> TransientError:</div>
          <div><span style={{ color: "#888" }}>15</span>      <span style={{ color: "#6D28D9" }}>raise</span></div>
        </div>
        {/* Tests */}
        <div style={{ borderLeft: "1px solid var(--mk-border)", padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Test run</div>
          {[
            ["test_acquire_first_sender_wins", "0.21s"],
            ["test_no_double_send_on_retry", "0.34s"],
            ["test_receipt_idempotent", "0.18s"],
          ].map(([name, time]) => (
            <div key={name} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontFamily: "monospace",
              padding: "8px 10px",
              background: "var(--mk-surface-warm)",
              borderRadius: 6,
              marginBottom: 6,
            }}>
              <span style={{ color: "var(--mk-green)" }}>✓</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
              <span style={{ color: "var(--mk-text-tertiary)" }}>{time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Product visual: passport */
function PassportVisual() {
  return (
    <div className="mk-visual">
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--mk-teal), var(--mk-blue))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 20, fontWeight: 600,
          }}>
            SK
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Sarah Kim</div>
            <div style={{ fontSize: 14, color: "var(--mk-text-secondary)" }}>Backend Engineer · 6 simulations</div>
          </div>
          <span style={{
            marginLeft: "auto",
            fontSize: 12, fontWeight: 500,
            color: "var(--mk-teal)", background: "#E6F4F2",
            padding: "6px 14px", borderRadius: 999,
          }}>
            Verified
          </span>
        </div>
        {[
          ["Webhook retry incident", "harbor-webhooks", "12 tests passed", "var(--mk-teal)"],
          ["API rate limiting", "gateway-api", "8 tests passed", "var(--mk-blue)"],
          ["Database migration", "user-store", "15 tests passed", "var(--mk-violet)"],
        ].map(([title, repo, tests, color]) => (
          <div key={title} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 16px",
            border: "1px solid var(--mk-border)",
            borderRadius: 8,
            marginBottom: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--mk-text-secondary)", fontFamily: "monospace" }}>{repo}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--mk-text-secondary)" }}>{tests}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Product visual: evidence */
function EvidenceVisual() {
  return (
    <div className="mk-visual">
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Evidence report</div>
        <div style={{
          background: "var(--mk-surface-warm)",
          border: "1px solid var(--mk-border)",
          borderRadius: 8,
          padding: 16,
          fontFamily: "monospace",
          fontSize: 13,
          lineHeight: 1.7,
          marginBottom: 16,
        }}>
          <div><span style={{ color: "var(--mk-teal)" }}>3</span> lines cited in evidence</div>
          <div style={{ marginTop: 8, color: "var(--mk-text-secondary)" }}>
            src/worker.py:13-15 · commit 4f1c9a2
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Observed", "Generated", "Private"].map((label, i) => (
            <span key={label} style={{
              fontSize: 12, fontWeight: 500,
              padding: "6px 14px", borderRadius: 999,
              background: i === 0 ? "#E6F4F2" : i === 1 ? "#EDE9FE" : "var(--mk-surface-warm)",
              color: i === 0 ? "var(--mk-teal)" : i === 1 ? "var(--mk-violet)" : "var(--mk-text-secondary)",
            }}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <>
      <div className="mk-footer-cta">
        <h2>Hire for the work.</h2>
        <div className="mk-hero-actions">
          <Link href="/get-started" className="mk-btn-dark">Get started →</Link>
          <Link href="/demo" className="mk-btn-light">Explore demo</Link>
        </div>
      </div>
      <footer className="mk-footer">
        <div className="mk-footer-grid">
          <div className="mk-footer-brand">
            <Logo />
            <p>
              The proof-of-work network for software engineers.
              Real simulations. Reviewable evidence.
            </p>
          </div>
          <div className="mk-footer-col">
            <h4>Product</h4>
            <Link href="/developers">Developers</Link>
            <Link href="/employers">Employers</Link>
            <Link href="/product">Product</Link>
            <Link href="/demo">Demo</Link>
            <Link href="/download">Download</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
          <div className="mk-footer-col">
            <h4>Developers</h4>
            <Link href="/developers">Simulations</Link>
            <Link href="/passport">Passport</Link>
            <Link href="/download">Desktop app</Link>
          </div>
          <div className="mk-footer-col">
            <h4>Employers</h4>
            <Link href="/employers">Hiring</Link>
            <Link href="/employers">Evidence reports</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
          <div className="mk-footer-col">
            <h4>Company</h4>
            <Link href="/trust">Trust</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/login">Sign in</Link>
            <Link href="/get-started">Get started</Link>
          </div>
          <div className="mk-footer-col">
            <h4>Legal</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/security">Security</Link>
          </div>
        </div>
        <div className="mk-footer-bottom">
          <span>© 2026 Fydell</span>
          <nav>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/security">Security</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

export default function HomePageV2() {
  return (
    <div className="mk-canvas">
      <Nav />

      {/* Hero — Linear format */}
      <div className="mk-hero">
        <h1>Hire engineers for the work they've done.</h1>
        <p className="mk-sub">
          Fydell runs real engineering simulations. You review the code, not the résumé.
        </p>
        <div className="mk-hero-actions">
          <Link href="/get-started" className="mk-btn-dark">Get started →</Link>
          <Link href="/demo" className="mk-btn-light">Explore demo</Link>
        </div>
        <SimVisual />
      </div>

      {/* Section 1: Simulations — Linear split */}
      <div className="mk-section">
        <div className="mk-section-split">
          <h2>Real work, not toy problems.</h2>
          <div>
            <p className="mk-desc">
              Candidates debug production incidents in working codebases. Every fix is tested, timed, and recorded.
            </p>
            <Link href="/product" className="mk-learn-more">Learn more →</Link>
          </div>
        </div>
      </div>

      {/* Section 2: Passports — Linear split */}
      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>A passport for your work.</h2>
          <div>
            <p className="mk-desc">
              Engineers own a verified record of every simulation. Share it with any team. No references needed.
            </p>
            <Link href="/developers" className="mk-learn-more">Learn more →</Link>
          </div>
        </div>
        <PassportVisual />
      </div>

      {/* Section 3: Evidence — Linear split */}
      <div className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-section-split">
          <h2>Every claim opens to proof.</h2>
          <div>
            <p className="mk-desc">
              Each line in a report links to the file, commit, or test behind it. Review evidence, not claims.
            </p>
            <Link href="/employers" className="mk-learn-more">Learn more →</Link>
          </div>
        </div>
        <EvidenceVisual />
      </div>

      <Footer />
    </div>
  );
}
