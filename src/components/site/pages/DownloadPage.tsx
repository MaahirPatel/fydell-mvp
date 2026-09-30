import type { CSSProperties } from "react";
import { Download } from "lucide-react";
import s from "../site.module.css";
import Reveal from "../Reveal";
import { ArrowLink, ButtonLink, Caption, CheckItem, FAQ, PageHero, Section, SectionHead, Stage } from "../primitives";
import { Mark } from "../Mark";
import { DesktopProvisioning } from "../visuals/app";

const i = (n: number) => ({ "--i": n }) as CSSProperties;

/** The current desktop release. Bump with each published GitHub release. */
export const DESKTOP_VERSION = "0.1.4";
const RELEASES = "https://github.com/MaahirPatel/fydell-mvp/releases";
const BASE = `${RELEASES}/download/v${DESKTOP_VERSION}`;

const PLATFORMS = [
  {
    os: "macOS",
    req: "Apple silicon Macs (M1 or later)",
    primary: { label: "Download for macOS", href: `${BASE}/Fydell_${DESKTOP_VERSION}_aarch64.dmg`, file: ".dmg" },
    others: [],
    warning: "macOS will say the app is from an unidentified developer. Right-click the app, choose Open, then Open again.",
  },
  {
    os: "Windows",
    req: "Windows 10 or 11, 64-bit",
    primary: { label: "Download for Windows", href: `${BASE}/Fydell_${DESKTOP_VERSION}_x64-setup.exe`, file: ".exe" },
    others: [{ label: "MSI installer", href: `${BASE}/Fydell_${DESKTOP_VERSION}_x64_en-US.msi` }],
    warning: "SmartScreen may say it protected your PC. Choose More info, then Run anyway.",
  },
];

export default function DownloadPage() {
  return (
    <>
      <PageHero
        title="The Fydell desktop app"
        lead="Simulations run in the desktop app: a file tree, an editor, a terminal, tests and the team thread in one window. It records only the work trail you agree to."
      />

      <Section tight>
        <Reveal className={s.grid2}>
          {PLATFORMS.map((p, n) => (
            <div key={p.os} className={s.plan} data-r="" style={i(n)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Mark size={16} />
                <h2 className={s.planName} style={{ fontSize: 17 }}>
                  {p.os}
                </h2>
                <span className={s.body} style={{ marginLeft: "auto", fontSize: 13 }}>
                  v{DESKTOP_VERSION}
                </span>
              </div>
              <p className={s.planUnit} style={{ margin: 0 }}>
                {p.req}
              </p>
              <div className={s.actions}>
                <ButtonLink href={p.primary.href}>
                  <Download size={15} strokeWidth={1.75} aria-hidden />
                  {p.primary.label}
                </ButtonLink>
                {p.others.map((o) => (
                  <ButtonLink key={o.href} href={o.href} variant="ghost">
                    {o.label}
                  </ButtonLink>
                ))}
              </div>
              <p className={s.caption} style={{ marginTop: 0 }}>
                {p.warning}
              </p>
            </div>
          ))}
        </Reveal>
        <Reveal>
          <div className={`${s.card} ${s.cardQuiet}`} data-r="" style={{ marginTop: 24 }}>
            <h3 className={s.h3}>Early build: expect operating system warnings</h3>
            <p className={s.body} style={{ marginTop: 8, maxWidth: "70ch" }}>
              These installers are not yet code-signed, so macOS and Windows warn the first time you open them. That is
              expected for this build and is not a sign that anything is wrong. Signed installers will replace these.
              Linux builds (AppImage, deb, rpm) are on the{" "}
              <a href={`${RELEASES}/tag/v${DESKTOP_VERSION}`} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                release page
              </a>
              .
            </p>
          </div>
        </Reveal>
      </Section>

      <Section>
        <SectionHead
          title="Ready before your timer starts"
          lead="When you open an invitation, the app downloads the project, verifies it, and prepares an isolated environment. The timer starts only when you open the brief."
        />
        <Reveal className={`${s.headToVisual} ${s.gridWide}`}>
          <div data-r="visual" style={i(0)}>
            <Stage quiet>
              <DesktopProvisioning />
            </Stage>
            <Caption>preparing a workspace.</Caption>
          </div>
          <div className={s.card} data-r="" style={i(1)}>
            <h3 className={s.h3} style={{ marginBottom: 18 }}>
              What the app records
            </h3>
            <ul className={s.checkList}>
              <CheckItem>Files changed in the project folder</CheckItem>
              <CheckItem>Commands run in the Fydell terminal</CheckItem>
              <CheckItem>Test runs, results and timing</CheckItem>
              <CheckItem never>Screen, webcam, microphone</CheckItem>
              <CheckItem never>Browsing, other apps, keystrokes</CheckItem>
            </ul>
            <div style={{ marginTop: 24 }}>
              <ArrowLink href="/trust">Read the full disclosure</ArrowLink>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section>
        <SectionHead title="Installing" />
        <div className={s.headToVisual}>
          <FAQ
            items={[
              { q: "Do I need an account first?", a: "No. Sign in to the app with the email address your invitation was sent to." },
              { q: "Is there an Intel Mac build?", a: "Not yet. This build supports Apple silicon Macs." },
              { q: "Can I uninstall it afterwards?", a: "Yes. It is a normal app; remove it the way you remove any other." },
              {
                q: "Where are release notes?",
                a: (
                  <>
                    On the{" "}
                    <a href={RELEASES} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                      GitHub releases page
                    </a>
                    , with every installer for each version.
                  </>
                ),
              },
            ]}
          />
        </div>
      </Section>
      <div style={{ height: 168 }} />
    </>
  );
}
