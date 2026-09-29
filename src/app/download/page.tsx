import MarketingShell from "@/components/layout/MarketingShell";
import { Closing, Details, Faq, Hero, Section, SectionHead, Stage, Table } from "@/components/marketing/kit/Kit";
import { DesktopShot } from "@/components/marketing/kit/Shots";

export const metadata = {
  title: "Download",
  description: "Download the Fydell desktop app for macOS and Windows. Candidates use it to work engineering simulations.",
  alternates: { canonical: "/download" },
};

const VERSION = "0.1.4";
const RELEASES_URL = "https://github.com/MaahirPatel/fydell-mvp/releases";
const BASE = `${RELEASES_URL}/download/v${VERSION}`;
const DOWNLOADS = {
  mac: `${BASE}/Fydell_${VERSION}_aarch64.dmg`,
  windows: `${BASE}/Fydell_${VERSION}_x64-setup.exe`,
  windowsMsi: `${BASE}/Fydell_${VERSION}_x64_en-US.msi`,
};

export default function DownloadPage() {
  return (
    <MarketingShell>
      <Hero
        compact
        title={["Fydell for", "macOS and Windows"]}
        lead={`The app candidates use to work a simulation: it sets up the project, runs the setup check, keeps the brief and team beside the code, and records only the disclosed work trail. Version ${VERSION}, beta.`}
        aside={{ href: RELEASES_URL, label: "Release notes and other builds" }}
        actions={
          <>
            <a href={DOWNLOADS.mac} className="l-btn l-btn-lg l-btn-solid">Download for macOS</a>
            <a href={DOWNLOADS.windows} className="l-btn l-btn-lg l-btn-ghost">Download for Windows</a>
          </>
        }
      >
        <Stage hero label="Example: a simulation in the Fydell desktop app">
          <DesktopShot />
        </Stage>
      </Hero>

      <Section id="requirements" labelledBy="requirements-title">
        <SectionHead
          id="requirements-title"
          title={["System requirements"]}
          lead="Native builds for each platform. Candidates need the language runtime named in their simulation brief; the setup check confirms it before work starts."
        />
        <Table
          head={["", "macOS", "Windows"]}
          rows={[
            ["Version", "macOS 13 Ventura or later", "Windows 10 or later"],
            ["Processor", "Apple silicon (M1 or later)", "64-bit (x64)"],
            ["Installer", ".dmg", ".exe, or .msi for managed installs"],
            ["First launch", "Right-click the app, choose Open, then confirm", "In SmartScreen, choose More info, then Run anyway"],
          ]}
        />
      </Section>

      <Section id="beta" labelledBy="beta-title">
        <SectionHead
          id="beta-title"
          title={["What beta means", "right now"]}
          lead="We would rather tell you the limits than have you find them mid-simulation."
        />
        <Details
          items={[
            { title: "Not yet code-signed", body: "macOS and Windows will warn on first launch. The steps above get past it. Signed builds are next." },
            { title: "Manual updates", body: "When a new version ships, download it again from this page. The app tells you if your version is too old." },
            { title: "A browser fallback", body: "If the app will not run on your machine, your invitation link still works in the browser." },
          ]}
        />
      </Section>

      <Section id="questions" labelledBy="questions-title">
        <SectionHead id="questions-title" title={["Questions"]} lead="The short answers." />
        <Faq
          items={[
            { q: "Who needs the app?", a: "Candidates who have been invited to a simulation. Hiring teams review everything on the web and never need to install anything." },
            { q: "What does it record?", a: "During a simulation only: file changes in the project folder, commands and test runs started from the app, timing, team messages and your handoff. No screen, webcam, microphone, keystrokes or other apps." },
            { q: "Is it free?", a: "Yes. Engineers never pay for Fydell." },
            { q: "Is there a Linux build?", a: "Linux builds are published on the releases page for testing, but only macOS and Windows are supported for invited simulations today." },
            { q: "Where do I report a problem?", a: "Use the Support link inside the app, or contact us. Problems outside your control during a simulation are not held against you." },
          ]}
        />
      </Section>

      <Closing
        title={["Invited to a simulation?", "Start here."]}
        primary={{ href: "/login", label: "Sign in" }}
        secondary={{ href: "/developers", label: "What to expect" }}
      />
    </MarketingShell>
  );
}
