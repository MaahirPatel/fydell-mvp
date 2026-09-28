"use client";

import { useEffect, useState } from "react";
import { PageIntro } from "@/components/marketing/PageIntro";
import { ButtonLink } from "@/components/marketing/ui";
import { AppWindow, ArrowUpRight, BellOff, CheckCircle2, MonitorDown } from "lucide-react";
import s from "./download.module.css";

const RELEASES_URL = "https://github.com/MaahirPatel/fydell-mvp/releases";

type Os = "windows" | "macos" | "linux";

function detectOs(): Os | null {
  if (typeof navigator === "undefined") return null;
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? "";
  const ua = `${platform} ${navigator.userAgent}`.toLowerCase();
  if (/mac|darwin/.test(ua)) return "macos";
  if (/win/.test(ua)) return "windows";
  if (/linux/.test(ua)) return "linux";
  return null;
}

const OS_CARDS: Array<{
  id: Os;
  name: string;
  formats: string;
  note: string;
}> = [
  {
    id: "windows",
    name: "Windows",
    formats: ".msi installer",
    note: "Windows 10 version 1803 and later, 64-bit.",
  },
  {
    id: "macos",
    name: "macOS",
    formats: ".dmg disk image",
    note: "macOS 10.15 and later, Intel and Apple Silicon.",
  },
  {
    id: "linux",
    name: "Linux",
    formats: ".AppImage · .deb · .rpm",
    note: "64-bit. WebKitGTK 4.1; current Ubuntu, Fedora, and Debian families.",
  },
];

/**
 * What the client really does, verified against desktop/src (read-only):
 * Workspace.tsx mounts Monaco with brief/tests/team/submit/timeline panels;
 * SubmitPanel hands back a work receipt; App.tsx completes auth through a
 * deep-link handler and the Tauri build keeps session tokens in the OS
 * keychain (tauri-plugin keyring).
 */
const IN_THE_APP = [
  {
    title: "A real editor, not a web form",
    body: "The simulation workspace is Monaco, with the brief, tests, team chat, timeline, and submit panels beside the code.",
  },
  {
    title: "Submit produces a receipt",
    body: "Finishing an attempt hands you a work receipt. Your own copy of what you produced, whatever the employer decides.",
  },
  {
    title: "Sign-in that stays on your machine",
    body: "Authentication completes in your browser and hands back a deep link. Session tokens live in the OS keychain, not in a config file.",
  },
  {
    title: "Same rules as the web",
    body: "What gets recorded is disclosed before you start. The desktop client does not add surveillance to what the browser version already says.",
  },
] as const;

const REQUIREMENTS: Array<[string, string]> = [
  ["Windows", "Windows 10 version 1803+, 64-bit. WebView2 (ships with Windows 11; installed on demand on Windows 10)."],
  ["macOS", "macOS 10.15 Catalina or later, Intel or Apple Silicon."],
  ["Linux", "64-bit distribution with WebKitGTK 4.1. Current Ubuntu, Fedora, Debian, and Arch families work."],
  ["Network", "An internet connection for sign-in and submitting. Everything else runs on your machine."],
];

export default function DownloadClient() {
  const [os, setOs] = useState<Os | null>(null);
  useEffect(() => setOs(detectOs()), []);

  const ordered = [...OS_CARDS].sort((a, b) => (a.id === os ? -1 : b.id === os ? 1 : 0));

  return (
    <div className={s.page}>
      <PageIntro
        kicker="Desktop client"
        title={<>Download the <span className="t-evidence">desktop app.</span></>}
        lead="The Fydell simulation client for Windows, macOS, and Linux: a local workspace with a real editor, recorded test runs, and an atomic submit. Installers publish with v0.1.0."
        actions={
          <p className={s.stateNote}>
            <MonitorDown className="h-4 w-4 shrink-0" aria-hidden />
            Installers are not published yet. The buttons below open the GitHub Releases page, where they will appear.
          </p>
        }
      />

      <section className={s.section} aria-label="Choose your platform">
        <div className={s.grid}>
          {ordered.map((card) => (
            <div key={card.id} className={`${s.card} ${card.id === os ? s.cardPrimary : ""}`}>
              <div className={s.cardHead}>
                <AppWindow className="h-5 w-5" aria-hidden />
                <p className={s.cardName}>{card.name}</p>
                {card.id === os ? <span className={s.youBadge}>Your system</span> : null}
              </div>
              <p className={s.formats}>{card.formats}</p>
              <p className={s.cardNote}>{card.note}</p>
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                className={card.id === os ? s.btnSolid : s.btnGhost}
              >
                Open releases for {card.name} <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          ))}
        </div>
        <p className={s.releasesNote}>
          Every button goes to{" "}
          <a href={RELEASES_URL} target="_blank" rel="noreferrer" className={s.inlineLink}>
            github.com/MaahirPatel/fydell-mvp/releases
          </a>
          . There is no installer to download yet. This page says so plainly until there is.
        </p>
      </section>

      <section className={s.section} aria-labelledby="in-the-app">
        <h2 id="in-the-app" className={s.h2}>What is in the client</h2>
        <div className={s.twoCol}>
          {IN_THE_APP.map((f) => (
            <div key={f.title} className={s.feature}>
              <p className={s.featureTitle}>{f.title}</p>
              <p className={s.featureBody}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={s.section} aria-labelledby="requirements">
        <h2 id="requirements" className={s.h2}>System requirements</h2>
        <dl className={s.reqs}>
          {REQUIREMENTS.map(([k, v]) => (
            <div key={k} className={s.req}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={s.section} aria-labelledby="updates">
        <div className={s.updateBand}>
          <div className={s.updateIcon}>
            <BellOff className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 id="updates" className={s.h2}>Updates</h2>
            <p className={s.updateBody}>
              The client has no auto-updater yet, so there is nothing silently phoning home for patches.
              When a new version ships, download the installer for your platform from the releases page above.
              Automatic updates are planned for a later release and will be announced here.
            </p>
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="version-note">
        <div className={s.versionBand}>
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <p>
            <strong>Version note.</strong> The desktop client is packaged from the{" "}
            <span className={s.mono}>fydell-desktop 0.1.0</span> codebase in this repository. The first public
            installers ship with v0.1.0 — this page stays the source of truth until then.
          </p>
        </div>
        <div className={s.closing}>
          <ButtonLink href="/demo" variant="soft" arrow={false}>
            Meanwhile, try the web demo
          </ButtonLink>
          <ButtonLink href="/contact" variant="soft" arrow={false}>
            Ask about early access
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
