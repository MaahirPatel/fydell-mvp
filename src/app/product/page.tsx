import Link from "next/link";
import "@/styles/marketing-v2.css";
import { Nav, Footer, FooterCTA, SectionSplit, LearnMore } from "@/components/marketing/MarketingV2";

export const metadata = {
  title: "Product",
  description: "How Fydell works: real simulations, verified passports, and evidence reports you can inspect.",
};

/* Visual: simulation workspace — the candidate's view */
function SimulationVisual() {
  return (
    <div className="mk-visual" style={{ marginTop: 48 }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
          ))}
        </div>
        <span style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginLeft: 8, fontFamily: "monospace" }}>
          harbor-webhooks / retry-safe-jobs
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 12, fontWeight: 500,
          color: "var(--mk-teal)", background: "#E6F4F2",
          padding: "4px 12px", borderRadius: 999,
        }}>
          42:18 left
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr 300px", minHeight: 340 }}>
        <div style={{ borderRight: "1px solid var(--mk-border)", padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-tertiary)", marginBottom: 12, letterSpacing: "0.05em" }}>
            SCENARIO
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Webhook retry incident</div>
          <div style={{ fontSize: 12, color: "var(--mk-text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
            Receipts are sent twice when the worker retries. Find the bug. Fix it. Prove it.
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-tertiary)", marginBottom: 8, letterSpacing: "0.05em" }}>
            FILES
          </div>
          {["worker.py", "mailer.py", "claims.py"].map((f, i) => (
            <div key={f} style={{
              fontSize: 13, padding: "6px 10px", borderRadius: 6,
              background: i === 0 ? "#E6F4F2" : "transparent",
              color: i === 0 ? "var(--mk-text)" : "var(--mk-text-secondary)",
              fontFamily: "monospace", marginBottom: 4,
            }}>
              {f}
            </div>
          ))}
        </div>
        <div style={{ padding: 16, fontFamily: "monospace", fontSize: 13, lineHeight: 1.8 }}>
          <div><span style={{ color: "#aaa" }}>11</span>&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>def</span> <span style={{ color: "#0B6E67" }}>process</span>(job):</div>
          <div><span style={{ color: "#aaa" }}>12</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>try</span>:</div>
          <div style={{ background: "#FEF3C7", borderRadius: 4, padding: "0 4px" }}>
            <span style={{ color: "#aaa" }}>13</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;send_receipt(job.receipt)
          </div>
          <div><span style={{ color: "#aaa" }}>14</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>except</span> TransientError:</div>
          <div><span style={{ color: "#aaa" }}>15</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>raise</span></div>
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--mk-text-secondary)", fontFamily: "var(--font-sans)" }}>
            <span style={{ background: "#FEF3C7", padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>
              Line 13 runs before the retry guard.
            </span>
          </div>
        </div>
        <div style={{ borderLeft: "1px solid var(--mk-border)", padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Conversation</div>
          {[
            ["Interviewer", "Walk me through what happens on retry.", "#EDE9FE", "var(--mk-violet)"],
            ["You", "send_receipt fires, then the exception retries the whole block.", "#E6F4F2", "var(--mk-teal)"],
          ].map(([who, text, bg, color]) => (
            <div key={who as string} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 4 }}>{who}</div>
              <div style={{ fontSize: 13, background: bg, padding: "8px 12px", borderRadius: 8, lineHeight: 1.5 }}>
                {text}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, marginTop: 16 }}>Tests</div>
          {[
            ["test_no_double_send_on_retry", "0.34s", true],
            ["test_receipt_idempotent", "0.18s", true],
          ].map(([name, time, pass]) => (
            <div key={name as string} style={{
              display: "flex", alignItems: "center", gap: 8, fontSize: 12,
              fontFamily: "monospace", padding: "8px 10px",
              background: "var(--mk-surface-warm)", borderRadius: 6, marginBottom: 6,
            }}>
              <span style={{ color: pass ? "var(--mk-green)" : "var(--mk-red)" }}>{pass ? "✓" : "✗"}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
              <span style={{ color: "var(--mk-text-tertiary)" }}>{time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Visual: passport — the engineer's verified record */
function PassportVisual() {
  return (
    <div className="mk-visual" style={{ marginTop: 48 }}>
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
            <div style={{ fontSize: 14, color: "var(--mk-text-secondary)" }}>Backend Engineer</div>
          </div>
          <span style={{
            marginLeft: "auto", fontSize: 12, fontWeight: 500,
            color: "var(--mk-teal)", background: "#E6F4F2",
            padding: "6px 14px", borderRadius: 999,
          }}>
            6 simulations verified
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--mk-text-tertiary)", marginBottom: 20, fontFamily: "monospace" }}>
          fydell.com/p/sarah-kim
        </div>
        {[
          ["Webhook retry incident", "harbor-webhooks · 12 tests passed · 42 min", "#0B6E67"],
          ["API rate limiting", "gateway-api · 8 tests passed · 38 min", "#2B5CE6"],
          ["Database migration", "user-store · 15 tests passed · 51 min", "#6D28D9"],
        ].map(([title, meta, color]) => (
          <div key={title} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 16px", border: "1px solid var(--mk-border)",
            borderRadius: 8, marginBottom: 8, background: "var(--mk-surface)",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
              <div style={{ fontSize: 12, color: "var(--mk-text-secondary)", fontFamily: "monospace" }}>{meta}</div>
            </div>
            <span style={{ fontSize: 12, color: "var(--mk-blue)", fontWeight: 500 }}>View evidence →</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 999, background: "var(--mk-surface-warm)", color: "var(--mk-text-secondary)" }}>
            Share link
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 999, background: "var(--mk-surface-warm)", color: "var(--mk-text-secondary)" }}>
            Export JSON
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 999, background: "#E6F4F2", color: "var(--mk-teal)" }}>
            Owned by Sarah
          </span>
        </div>
      </div>
    </div>
  );
}

/* Visual: evidence report — what the hiring team sees */
function EvidenceVisual() {
  return (
    <div className="mk-visual" style={{ marginTop: 48 }}>
      <div style={{ padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Evidence report</div>
          <span style={{
            marginLeft: "auto", fontSize: 12,
            color: "var(--mk-text-secondary)", fontFamily: "monospace",
          }}>
            harbor-webhooks · completed 2h ago
          </span>
        </div>
        {[
          ["Fixed the double-send bug", "Moved send_receipt after the idempotency check. 12 tests pass.", "src/worker.py:13-15", "#0B6E67", "Observed"],
          ["Explained the retry flow", "Described exactly when receipts fire during retries.", "conversation · 04:12", "#6D28D9", "Generated"],
          ["Handled the edge case", "Covered the timeout-during-send path in tests.", "src/worker.py:28-31", "#0B6E67", "Observed"],
        ].map(([title, desc, cite, color, tag]) => (
          <div key={title} style={{
            border: "1px solid var(--mk-border)", borderRadius: 8,
            padding: "16px", marginBottom: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 999, background: color === "#0B6E67" ? "#E6F4F2" : "#EDE9FE", color }}>
                {tag}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
            </div>
            <div style={{ fontSize: 14, color: "var(--mk-text-secondary)", marginBottom: 8 }}>{desc}</div>
            <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--mk-blue)" }}>
              ⌗ {cite}
            </div>
          </div>
        ))}
        <div style={{ fontSize: 13, color: "var(--mk-text-secondary)", marginTop: 8 }}>
          Every claim links to the file, line, or recording behind it.
        </div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  return (
    <div className="mk-canvas">
      <Nav />

      <div className="mk-hero">
        <h1>How Fydell works.</h1>
        <p className="mk-sub">
          Candidates do real work. Teams review the evidence.
        </p>
        <div className="mk-hero-actions">
          <Link href="/get-started" className="mk-btn-dark">Get started →</Link>
          <Link href="/demo" className="mk-btn-light">Explore demo</Link>
        </div>
      </div>

      <SectionSplit title="Real simulations. Real code.">
        <p className="mk-desc">
          Candidates debug production-style incidents in working repos. Timed, tested, recorded.
        </p>
        <LearnMore href="/developers" />
        <SimulationVisual />
      </SectionSplit>

      <SectionSplit title="A passport for the work.">
        <p className="mk-desc">
          Every simulation becomes a verified record. Engineers own it. Teams can inspect it.
        </p>
        <LearnMore href="/developers" />
        <PassportVisual />
      </SectionSplit>

      <SectionSplit title="Reports that open to proof.">
        <p className="mk-desc">
          Each finding cites the file, commit, or test behind it. No scores. Just evidence.
        </p>
        <LearnMore href="/employers" />
        <EvidenceVisual />
      </SectionSplit>

      <FooterCTA heading="See it on real work." />
      <Footer />
    </div>
  );
}
