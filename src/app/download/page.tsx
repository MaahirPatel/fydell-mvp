import Link from "next/link";
import "@/styles/marketing-v2.css";
import { Nav, Footer, FooterCTA } from "@/components/marketing/MarketingV2";

export const metadata = {
  title: "Download",
  description: "Get the Fydell simulation client for desktop, or run simulations in your browser.",
};

const RELEASES_URL = "https://github.com/MaahirPatel/fydell-mvp/releases";
const V010 = "https://github.com/MaahirPatel/fydell-mvp/releases/download/v0.1.0";
const DOWNLOADS = {
  windowsExe: `${V010}/Fydell_0.1.0_x64-setup.exe`,
  windowsMsi: `${V010}/Fydell_0.1.0_x64_en-US.msi`,
  macDmg: `${V010}/Fydell_0.1.0_aarch64.dmg`,
  linuxAppImage: `${V010}/Fydell_0.1.0_amd64.AppImage`,
  linuxDeb: `${V010}/Fydell_0.1.0_amd64.deb`,
};

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

/* Visual: client feature tour — editor, test runs, recording, submit */
function ClientTourVisual() {
  return (
    <div style={{ padding: 24, background: "var(--mk-surface-warm)" }}>
      <div style={{
        background: "var(--mk-surface)", border: "1px solid var(--mk-border)",
        borderRadius: 12, overflow: "hidden",
      }}>
        {/* Title bar */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--mk-border)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8E8E6" }} />
            ))}
          </div>
          <span style={{ fontSize: 12, color: "var(--mk-text-secondary)", fontFamily: "monospace", marginLeft: 8 }}>
            Fydell — harbor-webhooks / retry-safe-jobs
          </span>
          <span style={{
            marginLeft: "auto", fontSize: 11, fontWeight: 500, color: "#fff",
            background: "var(--mk-teal)", borderRadius: 999, padding: "4px 10px",
          }}>
            ● Recording
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px" }}>
          {/* Editor + test runner */}
          <div style={{ padding: 16, borderRight: "1px solid var(--mk-border)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-tertiary)", marginBottom: 8, letterSpacing: "0.04em" }}>
              WORKER.PY
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.9 }}>
              <div><span style={{ color: "#aaa" }}>18</span>&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>def</span> handle_retry(job):</div>
              <div><span style={{ color: "#aaa" }}>19</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>if</span> receipt_exists(job.id):</div>
              <div><span style={{ color: "#aaa" }}>20</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#6D28D9" }}>return</span></div>
              <div><span style={{ color: "#aaa" }}>21</span>&nbsp;&nbsp;&nbsp;&nbsp;process(job)</div>
              <div><span style={{ color: "#aaa" }}>22</span>&nbsp;&nbsp;&nbsp;&nbsp;send_receipt(job.receipt)</div>
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--mk-border)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-tertiary)", marginBottom: 8, letterSpacing: "0.04em" }}>
                TEST RUNS
              </div>
              {[
                ["test_no_duplicate_receipt", "PASS", "#15803D", "#E6F4F2"],
                ["test_retry_backoff", "PASS", "#15803D", "#E6F4F2"],
                ["test_poison_message", "FAIL", "#DC2626", "#FDECEC"],
              ].map(([name, result, color, bg]) => (
                <div key={name as string} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11, flex: 1 }}>{name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: color as string, background: bg as string, borderRadius: 999, padding: "2px 8px" }}>
                    {result}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Side panel: recording + submit */}
          <div style={{ padding: 16, background: "#FBFBFA" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-tertiary)", marginBottom: 10, letterSpacing: "0.04em" }}>
              SESSION
            </div>
            <div style={{ fontSize: 12, color: "var(--mk-text-secondary)", lineHeight: 1.7, marginBottom: 8 }}>
              Test runs and file changes are recorded. Nothing else.
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 10, background: "var(--mk-surface-warm)", color: "var(--mk-text-secondary)", padding: "3px 8px", borderRadius: 999 }}>
                38:04 left
              </span>
            </div>
            <div style={{
              background: "var(--mk-text)", color: "#fff", borderRadius: 8,
              padding: "10px 12px", fontSize: 12, fontWeight: 500, textAlign: "center",
            }}>
              Submit solution
            </div>
            <div style={{ fontSize: 11, color: "var(--mk-text-tertiary)", marginTop: 8, lineHeight: 1.6 }}>
              One click. Your diff and test runs go to the reviewer.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SYSTEM_REQUIREMENTS = [
  {
    os: "Windows",
    version: "Windows 10 or later",
    arch: "64-bit (x64)",
    formats: ".exe installer · .msi",
    note: "SmartScreen may warn on first launch. The build is unsigned.",
  },
  {
    os: "macOS",
    version: "macOS 13 Ventura or later",
    arch: "Apple Silicon (arm64)",
    formats: ".dmg",
    note: "Gatekeeper blocks unsigned apps. Right-click, then Open, on first launch.",
  },
  {
    os: "Linux",
    version: "Ubuntu 20.04 or later",
    arch: "64-bit (x86_64)",
    formats: ".AppImage · .deb",
    note: "The AppImage runs anywhere. Make it executable first.",
  },
];

const CLIENT_FEATURES = [
  {
    title: "A real editor",
    desc: "Full code editing with syntax highlighting. The starter repo opens ready to run.",
  },
  {
    title: "Built-in test runner",
    desc: "Run the suite locally. Pass and fail counts are recorded with each run.",
  },
  {
    title: "Recording indicator",
    desc: "You always see when recording is on. Test runs and file diffs only.",
  },
  {
    title: "One-click submit",
    desc: "Ship your diff and test history to the reviewer. No zip files.",
  },
  {
    title: "Offline first",
    desc: "Write code and run tests with no connection. Submit when you are back.",
  },
  {
    title: "Invitation inbox",
    desc: "Accept simulation invites by code. Everything you have been sent lives here.",
  },
];

const FAQS = [
  {
    q: "Is the desktop client free?",
    a: "Yes. Engineers never pay for Fydell. Simulations and passports are free.",
  },
  {
    q: "Does it work offline?",
    a: "Mostly. You can write code and run tests offline. Submitting needs a connection.",
  },
  {
    q: "What data does it collect?",
    a: "Test runs and file changes during a simulation. Browsing, other windows, and keystrokes are never recorded.",
  },
  {
    q: "How do updates work?",
    a: "Manual for now. Download the new installer when a release ships. Auto-update is coming.",
  },
  {
    q: "Can I use the web version instead?",
    a: "Yes. The browser client runs the same simulations with the same evidence.",
  },
];

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
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
              <a href={DOWNLOADS.windowsExe} className="mk-btn-dark">
                Download for Windows ↓
              </a>
              <a href={DOWNLOADS.macDmg} className="mk-btn-light">
                Download for macOS ↓
              </a>
              <a href={DOWNLOADS.linuxAppImage} className="mk-btn-light">
                Download for Linux ↓
              </a>
            </div>
            <p style={{ fontSize: 12, color: "var(--mk-text-tertiary)", marginTop: 12 }}>
              v0.1.0 · Unsigned test build. <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>All releases →</a>
            </p>
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
            <Link href="/passport/new" className="mk-btn-light">
              View passports →
            </Link>
          </div>
        </div>
      </div>

      {/* System requirements */}
      <div className="mk-section" style={{ paddingTop: 32 }}>
        <div className="mk-section-split">
          <h2>System requirements.</h2>
          <p className="mk-desc">
            Native builds for each platform. Pick the installer that matches your machine.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {SYSTEM_REQUIREMENTS.map((req) => (
            <div
              key={req.os}
              style={{
                background: "var(--mk-surface)",
                border: "1px solid var(--mk-border)",
                borderRadius: 12,
                padding: 24,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{req.os}</div>
              <div style={{ fontSize: 14, color: "var(--mk-text-secondary)", marginBottom: 12 }}>
                {req.version}
              </div>
              <div style={{ fontSize: 13, color: "var(--mk-text-tertiary)", lineHeight: 1.7 }}>
                <div>{req.arch}</div>
                <div>{req.formats}</div>
              </div>
              <div style={{
                marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--mk-border)",
                fontSize: 13, color: "var(--mk-text-secondary)", lineHeight: 1.6,
              }}>
                {req.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What's in the client */}
      <div className="mk-section" style={{ paddingTop: 32 }}>
        <div className="mk-section-split">
          <h2>What is in the client.</h2>
          <p className="mk-desc">
            Everything you need to finish a simulation. Nothing you do not.
          </p>
        </div>
        <div className="mk-visual" style={{ marginBottom: 32 }}>
          <ClientTourVisual />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {CLIENT_FEATURES.map((f) => (
            <div key={f.title}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unsigned build notice */}
      <div className="mk-section" style={{ paddingTop: 32 }}>
        <div style={{
          background: "#FFFBEB",
          border: "1px solid #F5D99B",
          borderRadius: 12,
          padding: 28,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            This is an unsigned test build.
          </div>
          <div style={{ fontSize: 15, color: "var(--mk-text-secondary)", lineHeight: 1.7, maxWidth: 720 }}>
            <p style={{ margin: "0 0 12px" }}>
              v0.1.0 is not code-signed yet. Your OS will warn you on first launch. That is expected.
            </p>
            <p style={{ margin: "0 0 12px" }}>
              On Windows, SmartScreen shows a warning. Click More info, then Run anyway. On macOS, right-click the app and choose Open, then confirm.
            </p>
            <p style={{ margin: 0 }}>
              Signed installers are coming. Until then, treat these builds as beta.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mk-section" style={{ paddingTop: 32 }}>
        <div className="mk-section-split">
          <h2>Questions.</h2>
          <p className="mk-desc">
            The short answers.
          </p>
        </div>
        <div style={{ maxWidth: 760 }}>
          {FAQS.map((faq) => (
            <div key={faq.q} style={{ padding: "20px 0", borderTop: "1px solid var(--mk-border)" }}>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>{faq.q}</div>
              <div style={{ fontSize: 15, color: "var(--mk-text-secondary)", lineHeight: 1.6 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Release notes */}
      <div className="mk-section" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <div className="mk-section-split">
          <h2>Release notes.</h2>
          <p className="mk-desc">
            v0.1.0. The first beta.
          </p>
        </div>
        <div style={{
          background: "var(--mk-surface)",
          border: "1px solid var(--mk-border)",
          borderRadius: 12,
          padding: 32,
          maxWidth: 760,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            v0.1.0 · Initial beta
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--mk-teal)" }}>
            Included
          </div>
          <ul style={{ margin: "0 0 20px", paddingLeft: 20, fontSize: 14, color: "var(--mk-text-secondary)", lineHeight: 1.8 }}>
            <li>Simulation client for Windows, macOS, and Linux</li>
            <li>Code editor with syntax highlighting</li>
            <li>Local test runner with recorded runs</li>
            <li>Invitation inbox with accept-by-code</li>
            <li>One-click submit with diff and test history</li>
          </ul>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--mk-amber)" }}>
            Known limitations
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "var(--mk-text-secondary)", lineHeight: 1.8 }}>
            <li>Builds are unsigned. Expect OS warnings on first launch.</li>
            <li>No auto-update yet. New versions need a fresh download.</li>
            <li>Beta quality. Report issues on the releases page.</li>
          </ul>
        </div>
      </div>

      <FooterCTA heading="Get the client." />
      <Footer />
    </div>
  );
}
