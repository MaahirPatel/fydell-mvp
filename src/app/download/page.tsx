import Link from "next/link";
import { UnifiedNav, UnifiedFooter, CtaBand, Faq } from "@/components/marketing/unified/UnifiedChrome";

export const metadata = {
  title: "Download",
  description: "Get the Fydell simulation client for desktop, or run simulations in your browser.",
};

const RELEASES_URL = "https://github.com/MaahirPatel/fydell-mvp/releases";
const V011 = "https://github.com/MaahirPatel/fydell-mvp/releases/download/v0.1.1";
const DOWNLOADS = {
  windowsExe: `${V011}/Fydell_0.1.1_x64-setup.exe`,
  windowsMsi: `${V011}/Fydell_0.1.1_x64_en-US.msi`,
  macDmg: `${V011}/Fydell_0.1.1_aarch64.dmg`,
  linuxAppImage: `${V011}/Fydell_0.1.1_amd64.AppImage`,
  linuxDeb: `${V011}/Fydell_0.1.1_amd64.deb`,
};

/* Hero visual: desktop workspace panel */
function DesktopHeroVisual() {
  return (
    <div className="u-pv u-pv-dark">
      <div className="u-pv-titlebar">
        <div className="u-pv-dots"><span /><span /><span /></div>
        <span className="u-pv-title">Fydell · harbor-webhooks / retry-safe-jobs</span>
        <span className="u-chip" style={{ marginLeft: "auto", background: "rgba(255,255,255,0.1)", borderColor: "transparent", color: "#fff" }}>
          <span style={{ color: "#f87171" }}>●</span> Recording
        </span>
      </div>
      <div className="u-pv-body">
        <div className="u-pv-side">
          <p className="u-pv-pane-label">Session</p>
          <div style={{ fontSize: 12.5, color: "#9aa3ad", lineHeight: 1.7, marginBottom: 12, padding: "0 8px" }}>
            Test runs and file changes are recorded. Nothing else.
          </div>
          <div style={{ padding: "0 8px", marginBottom: 20 }}>
            <span style={{ fontFamily: "var(--u-mono)", fontSize: 11, color: "#9aa3ad", background: "rgba(255,255,255,0.08)", padding: "4px 10px", borderRadius: 999 }}>
              38:04 left
            </span>
          </div>
          <div style={{ padding: "0 8px" }}>
            <div style={{ background: "#fff", color: "#101418", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, fontWeight: 600, textAlign: "center" }}>
              Submit solution
            </div>
          </div>
        </div>
        <div className="u-pv-code">
          <div className="ln"><span className="ln-no">18</span><span><span className="tok-kw">def</span> <span className="tok-fn">handle_retry</span><span className="tok-pl">(job):</span></span></div>
          <div className="ln"><span className="ln-no">19</span><span><span className="tok-pl">    </span><span className="tok-kw">if</span><span className="tok-pl"> receipt_exists(job.id):</span></span></div>
          <div className="ln"><span className="ln-no">20</span><span><span className="tok-pl">        </span><span className="tok-kw">return</span></span></div>
          <div className="ln"><span className="ln-no">21</span><span><span className="tok-pl">    process(job)</span></span></div>
          <div className="ln hl"><span className="ln-no">22</span><span><span className="tok-pl">    send_receipt(job.receipt)</span></span></div>
        </div>
        <div className="u-pv-side right">
          <p className="u-pv-pane-label">Test runs</p>
          <div className="u-pv-test"><span className="pass">✓</span><span>test_no_duplicate_receipt</span></div>
          <div className="u-pv-test"><span className="pass">✓</span><span>test_retry_backoff</span></div>
          <div className="u-pv-test"><span className="fail">✗</span><span>test_poison_message</span></div>
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

const INCLUDED = [
  "Simulation client for Windows, macOS, and Linux",
  "Code editor with syntax highlighting",
  "Local test runner with recorded runs",
  "Invitation inbox with accept-by-code",
  "One-click submit with diff and test history",
];

const LIMITATIONS = [
  "Builds are unsigned. Expect OS warnings on first launch.",
  "No auto-update yet. New versions need a fresh download.",
  "Beta quality. Report issues on the releases page.",
];

export default function DownloadPage() {
  return (
    <div className="u-mkt">
      <UnifiedNav current="/download" />

      <header className="u-hero">
        <div className="u-wrap">
          <div className="u-hero-grid">
            <h1>Take the simulation with you.</h1>
            <div className="u-hero-sub">
              <p>Native apps for Windows, macOS, and Linux. The simulation runs locally.</p>
              <div className="u-hero-ctas">
                <a href={DOWNLOADS.windowsExe} className="u-btn u-btn-dark">Download for Windows</a>
                <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="u-btn u-btn-light">All releases</a>
              </div>
            </div>
          </div>
          <div className="u-hero-visual">
            <DesktopHeroVisual />
          </div>
        </div>
      </header>

      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Pick your OS.</h2>
            <div className="u-sec-desc">
              <p>Native builds for each platform. Pick the installer that matches your machine.</p>
            </div>
          </div>
          <div className="u-dl-row" style={{ marginTop: 0 }}>
            <div className="u-dl-card">
              <h3>Windows</h3>
              <p>Windows 10 or later · 64-bit (x64)</p>
              <a href={DOWNLOADS.windowsExe} className="u-btn u-btn-dark" style={{ width: "100%" }}>Download .exe</a>
              <a href={DOWNLOADS.windowsMsi} className="u-btn u-btn-light" style={{ width: "100%" }}>Download .msi</a>
            </div>
            <div className="u-dl-card">
              <h3>macOS</h3>
              <p>macOS 13 Ventura or later · Apple Silicon (arm64)</p>
              <a href={DOWNLOADS.macDmg} className="u-btn u-btn-dark" style={{ width: "100%" }}>Download .dmg</a>
            </div>
            <div className="u-dl-card">
              <h3>Linux</h3>
              <p>Ubuntu 20.04 or later · 64-bit (x86_64)</p>
              <a href={DOWNLOADS.linuxAppImage} className="u-btn u-btn-dark" style={{ width: "100%" }}>Download .AppImage</a>
              <a href={DOWNLOADS.linuxDeb} className="u-btn u-btn-light" style={{ width: "100%" }}>Download .deb</a>
            </div>
          </div>
          <p className="u-visual-caption">
            v0.1.1 · Unsigned test build. <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">All releases →</a>
          </p>
        </div>
      </section>

      <section className="u-section tinted">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>System requirements.</h2>
            <div className="u-sec-desc">
              <p>Native builds for each platform. The notes below matter on first launch.</p>
            </div>
          </div>
          <div className="u-cards-3">
            {SYSTEM_REQUIREMENTS.map((req) => (
              <div key={req.os} className="u-card">
                <h3>{req.os}</h3>
                <p>{req.version}</p>
                <p style={{ marginTop: 12, fontSize: 13 }}>
                  {req.arch}<br />
                  {req.formats}
                </p>
                <p style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--u-line-soft)" }}>{req.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>What is in the client.</h2>
            <div className="u-sec-desc">
              <p>Everything you need to finish a simulation. Nothing you do not.</p>
            </div>
          </div>
          <div className="u-cards-3">
            {CLIENT_FEATURES.map((f) => (
              <div key={f.title} className="u-card">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="u-section tinted">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Also on the web.</h2>
            <div className="u-sec-desc">
              <p>No install needed. The browser client and your passport live on the web.</p>
            </div>
          </div>
          <div className="u-cards-2">
            <div className="u-card">
              <span className="u-step">Web</span>
              <h3>Run simulations in your browser.</h3>
              <p>Nothing to install. Same recordings, same evidence.</p>
              <div style={{ marginTop: 20 }}>
                <Link href="/get-started" className="u-btn u-btn-dark">Start in browser</Link>
              </div>
            </div>
            <div className="u-card">
              <span className="u-step">Passport</span>
              <h3>Your verified record lives on the web.</h3>
              <p>Share it from any device. No app needed.</p>
              <div style={{ marginTop: 20 }}>
                <Link href="/passport/new" className="u-btn u-btn-light">View passports</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="u-section">
        <div className="u-wrap">
          <div className="u-card" style={{ background: "#FFFBEB", borderColor: "#F5D99B" }}>
            <h3>This is an unsigned test build.</h3>
            <p style={{ maxWidth: 720 }}>
              v0.1.1 is not code-signed yet. Your OS will warn you on first launch. That is expected.
            </p>
            <p style={{ maxWidth: 720, marginTop: 12 }}>
              On Windows, SmartScreen shows a warning. Click More info, then Run anyway. On macOS, right-click the app and choose Open, then confirm.
            </p>
            <p style={{ maxWidth: 720, marginTop: 12 }}>
              Signed installers are coming. Until then, treat these builds as beta.
            </p>
          </div>
        </div>
      </section>

      <section className="u-section tinted">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Release notes.</h2>
            <div className="u-sec-desc">
              <p>v0.1.1. The first beta.</p>
            </div>
          </div>
          <div className="u-card" style={{ maxWidth: 760 }}>
            <h3>v0.1.1 · Initial beta</h3>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--u-accent-deep)", margin: "20px 0 8px" }}>Included</p>
            <ul style={{ margin: "0 0 20px", paddingLeft: 20, fontSize: 14, color: "var(--u-muted)", lineHeight: 1.8 }}>
              {INCLUDED.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--u-amber)", margin: "0 0 8px" }}>Known limitations</p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "var(--u-muted)", lineHeight: 1.8 }}>
              {LIMITATIONS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="u-section">
        <div className="u-wrap">
          <div className="u-sec-head">
            <h2>Questions.</h2>
            <div className="u-sec-desc">
              <p>The short answers.</p>
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
