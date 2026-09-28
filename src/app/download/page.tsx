import Link from "next/link";
import "@/styles/marketing-v2.css";
import { Nav, Footer, FooterCTA } from "@/components/marketing/MarketingV2";

export const metadata = {
  title: "Download",
  description: "Get the Fydell simulation client for desktop, or run simulations in your browser.",
};

const RELEASES_URL = "https://github.com/MaahirPatel/fydell-mvp/releases";

/* Visual: desktop app window */
function DesktopVisual() {
  return (
    <div style={{ padding: 20, height: "100%", background: "var(--mk-surface-warm)" }}>
      <div style={{
        background: "var(--mk-surface)", border: "1px solid var(--mk-border)",
        borderRadius: 8, overflow: "hidden", height: "100%",
      }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#E8E8E6" }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: "var(--mk-text-secondary)", fontFamily: "monospace", marginLeft: 6 }}>
            Fydell Simulation Client
          </span>
        </div>
        <div style={{ padding: 14, fontFamily: "monospace", fontSize: 11, lineHeight: 1.8 }}>
          <div><span style={{ color: "#aaa" }}>13</span>&nbsp;&nbsp;send_receipt(job.receipt)</div>
          <div><span style={{ color: "#aaa" }}>14</span>&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>except</span> TransientError:</div>
          <div><span style={{ color: "#aaa" }}>15</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>raise</span></div>
          <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, background: "#E6F4F2", color: "var(--mk-teal)", padding: "3px 8px", borderRadius: 999, fontWeight: 500 }}>
              ✓ 12 tests
            </span>
            <span style={{ fontSize: 10, background: "var(--mk-surface-warm)", color: "var(--mk-text-secondary)", padding: "3px 8px", borderRadius: 999 }}>
              42:18 left
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Visual: web browser */
function WebVisual() {
  return (
    <div style={{ padding: 20, height: "100%", background: "#EDE9FE" }}>
      <div style={{
        background: "var(--mk-surface)", border: "1px solid var(--mk-border)",
        borderRadius: 8, overflow: "hidden", height: "100%",
      }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            flex: 1, background: "var(--mk-surface-warm)", borderRadius: 6,
            fontSize: 11, color: "var(--mk-text-secondary)", padding: "6px 12px", fontFamily: "monospace",
          }}>
            fydell.com/app/simulations
          </div>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Your simulations</div>
          {[
            ["Webhook retry incident", "In progress", "#0B6E67"],
            ["API rate limiting", "Completed", "#15803D"],
          ].map(([title, status, color]) => (
            <div key={title as string} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 12px", border: "1px solid var(--mk-border)",
              borderRadius: 6, marginBottom: 6,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
              <span style={{ fontSize: 12, flex: 1 }}>{title}</span>
              <span style={{ fontSize: 11, color: "var(--mk-text-secondary)" }}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Visual: passport on mobile */
function PassportVisual() {
  return (
    <div style={{ padding: 20, height: "100%", background: "#E6F4F2", display: "flex", justifyContent: "center" }}>
      <div style={{
        background: "var(--mk-surface)", border: "1px solid var(--mk-border)",
        borderRadius: 16, padding: 16, width: 180,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg, #0B6E67, #2B5CE6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 8,
        }}>
          SK
        </div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Sarah Kim</div>
        <div style={{ fontSize: 11, color: "var(--mk-text-secondary)", marginBottom: 12 }}>Backend Engineer</div>
        {["Webhook retry", "Rate limiting"].map((t) => (
          <div key={t} style={{
            fontSize: 11, padding: "6px 8px", background: "var(--mk-surface-warm)",
            borderRadius: 6, marginBottom: 4,
          }}>
            {t}
          </div>
        ))}
        <div style={{ fontSize: 10, color: "var(--mk-teal)", fontWeight: 500, marginTop: 8 }}>
          ✓ Verified
        </div>
      </div>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <div className="mk-canvas">
      <Nav />

      <div className="mk-hero" style={{ paddingBottom: 32 }}>
        <h1>Use Fydell everywhere you work.</h1>
        <p className="mk-sub">
          A unified workspace for simulations across every surface.
        </p>
      </div>

      <div className="mk-cards" style={{ paddingBottom: 64 }}>
        <div className="mk-card">
          <div className="mk-card-visual">
            <DesktopVisual />
          </div>
          <div className="mk-card-body">
            <h3>Desktop</h3>
            <p>
              The simulation client. A real editor, recorded test runs, and one-click submit. Works offline.
            </p>
            <a href={RELEASES_URL} className="mk-btn-dark" target="_blank" rel="noopener noreferrer">
              Coming soon — v0.1.0 ↓
            </a>
          </div>
        </div>

        <div className="mk-card">
          <div className="mk-card-visual">
            <WebVisual />
          </div>
          <div className="mk-card-body">
            <h3>Web</h3>
            <p>
              Run simulations right in your browser. Nothing to install. Same recordings, same evidence.
            </p>
            <Link href="/get-started" className="mk-btn-dark">
              Start in browser →
            </Link>
          </div>
        </div>

        <div className="mk-card">
          <div className="mk-card-visual">
            <PassportVisual />
          </div>
          <div className="mk-card-body">
            <h3>Passport</h3>
            <p>
              Your verified record lives on the web. Share it from any device. No app needed.
            </p>
            <Link href="/passport" className="mk-btn-light">
              View passports →
            </Link>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 24px 96px", fontSize: 18, color: "var(--mk-text)" }}>
        The Fydell desktop app will be available for macOS, Windows, and Linux.
      </div>

      <FooterCTA heading="Get the client." />
      <Footer />
    </div>
  );
}
