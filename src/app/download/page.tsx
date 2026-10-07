import MarketingShell from "@/components/layout/MarketingShell";
import DownloadPicker from "@/components/marketing/site/DownloadPicker";
import ReleasePanel from "@/components/marketing/site/ReleasePanel";
import { Feature, SiteClosing, SiteFaq, SiteHero } from "@/components/marketing/site/Sections";
import { LATEST, RELEASES_URL } from "@/components/marketing/site/releases";
import s from "@/components/marketing/site/site.module.css";

export const metadata = {
  title: "Download",
  description: `Fydell Desktop ${LATEST.version} for macOS (Apple silicon), Windows and Linux. Optional: everything also works in the browser.`,
  alternates: { canonical: "/download" },
};

const INSTALL = [
  {
    title: "macOS",
    body: "Open the .dmg and drag Fydell to Applications. The build is not yet signed, so on first launch right-click Fydell, choose Open, then confirm.",
  },
  {
    title: "Windows",
    body: "Run the .exe installer. SmartScreen warns about unsigned apps: choose More info, then Run anyway. Use the .msi for managed installs.",
  },
  {
    title: "Linux",
    body: "Make the AppImage executable (chmod +x) and run it, or install the .deb or .rpm with your package manager.",
  },
] as const;

const REQUIREMENTS = [
  { title: "macOS", body: "A Mac with Apple silicon (M1 or later). There is no Intel build." },
  { title: "Windows", body: "Windows 10 or 11, 64-bit. Uses Microsoft Edge WebView2, which ships with Windows 11 and is installed on demand on Windows 10." },
  { title: "Linux", body: "64-bit (x86_64) with WebKitGTK 4.1, for example Ubuntu 22.04 or later." },
] as const;

export default function DownloadPage() {
  return (
    <MarketingShell>
      <SiteHero
        title={["Download Fydell"]}
        lead="Work invited simulations in a workspace on your computer, with your Passport in the same app. The desktop app is optional; everything also works in the browser."
      >
        <DownloadPicker />
        <p className={`${s.caption} text-center`}>
          Beta: unsigned test builds, with no automatic updates yet. <a href={RELEASES_URL}>All builds on GitHub</a>.
        </p>
      </SiteHero>

      <Feature id="release" title={`What's in ${LATEST.version}`} body="The latest release, and which builds exist for each platform." link={{ href: "/changelog", label: "Read the changelog" }}>
        <ReleasePanel />
      </Feature>

      <Feature
        id="adds"
        layout="text"
        title="What the desktop app adds"
        body="An invited simulation opens in an editor with the brief, public tests, team thread and submission beside the code, plus a command palette and keyboard shortcuts. Sign-in completes in your browser and hands back to the app."
        points={[
          { title: "Same rules as the web", body: "What is recorded is disclosed before you start, exactly as in the browser." },
          { title: "Your Passport", body: "Your profile and projects are in the app too." },
          { title: "Not required", body: "Every invitation also works in the browser. Hiring teams never need to install anything." },
        ]}
      />

      <Feature id="install" layout="text" title="Install" body="The builds are not yet code-signed, so the first launch needs one extra step." points={INSTALL} />

      <Feature id="requirements" layout="text" title="System requirements" body="An internet connection is needed for sign-in and submitting." points={REQUIREMENTS} />

      <SiteFaq
        items={[
          { q: "Do I need the desktop app?", a: "No. Invitations, your Passport and every other part of Fydell work in the browser. The app is there if you prefer a local workspace." },
          { q: "How do I update?", a: "Automatic updates are turned off in these builds. Download the new version from this page when a release is published; the changelog lists every release." },
          { q: "Why does my system warn me?", a: "The installers are not code-signed yet. macOS Gatekeeper and Windows SmartScreen warn about unsigned apps; the install steps above get past it. Signed builds are planned." },
          { q: "Where do I report a problem?", a: "Use Contact on this site, or the Support link inside a simulation. Problems outside your control during a simulation are not held against you." },
        ]}
      />

      <SiteClosing
        title="Prefer the browser?"
        body="Sign up and continue on the web. You can install the app later."
        primary={{ href: "/signup", label: "Continue in the browser" }}
        secondary={{ href: "/contact", label: "Get support" }}
      />
    </MarketingShell>
  );
}
