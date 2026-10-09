import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import DownloadPicker from "@/components/marketing/site/DownloadPicker";
import PaintedStage from "@/components/marketing/site/PaintedStage";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import SimulationHero from "@/components/marketing/site/SimulationHero";
import { AppleIcon, WindowsIcon } from "@/components/marketing/site/OsIcons";
import { Announcement, CenteredHero, ShowcaseSection, Tiles } from "@/components/marketing/site/Home";
import { SiteFaq } from "@/components/marketing/site/Sections";
import { LATEST, RELEASES, RELEASES_URL, formatReleaseDate } from "@/components/marketing/site/releases";

export const metadata = {
  title: "Download",
  description: `Fydell Desktop ${LATEST.version} for Windows and macOS (Apple silicon). Optional: everything also works in the browser.`,
  alternates: { canonical: "/download" },
};

const INSTALL = [
  {
    os: "Windows",
    icon: <WindowsIcon size={18} />,
    requirement: "Windows 10 or 11, 64-bit",
    steps: [
      "Download the .exe installer and open it.",
      "If Windows SmartScreen appears, choose More info, then Run anyway. Beta builds are not code-signed yet.",
      "Follow the installer. Fydell opens when it finishes and appears in the Start menu.",
      "Sign in. Your browser opens to finish, then hands you back to the app.",
    ],
  },
  {
    os: "macOS",
    icon: <AppleIcon size={18} />,
    requirement: "Apple silicon (M1 or later)",
    steps: [
      "Download the .dmg and open it.",
      "Drag Fydell into Applications.",
      "On first launch, right-click Fydell in Applications and choose Open. Beta builds are not notarized yet.",
      "Sign in. Your browser opens to finish, then hands you back to the app.",
    ],
  },
] as const;

export default function DownloadPage() {
  const recent = RELEASES.slice(0, 3);
  return (
    <MarketingShell>
      <CenteredHero
        announcement={<Announcement href="/changelog" label={`Version ${LATEST.version}`} action="Read the changelog" />}
        title="Download Fydell"
        lead="Take simulations in a native workspace on your computer, with a command palette, keyboard shortcuts and drafts saved locally. Everything also works in the browser."
        actions={
          <a href="#install" className="l-btn l-btn-quiet">
            Installation steps
          </a>
        }
      >
        <div id="all-downloads" className="mx-auto max-w-[880px] scroll-mt-28">
          <DownloadPicker />
          <p className="mt-4 text-center text-[14px] text-[var(--text-tertiary)]">
            Released {formatReleaseDate(LATEST.date)} ·{" "}
            <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--text-primary)]">
              Every release on GitHub
            </a>
          </p>
        </div>
      </CenteredHero>

      <ShowcaseSection id="install" title="Install in a minute." aside="Beta builds are not signed yet, so the first launch takes one extra step.">
        <div className="grid gap-4 md:grid-cols-2">
          {INSTALL.map((o) => (
            <section
              key={o.os}
              aria-labelledby={`install-${o.os}`}
              className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-6 shadow-[0_1px_2px_rgba(17,18,20,0.04)]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-[var(--surface-panel)] text-[var(--text-primary)]">{o.icon}</span>
                <div>
                  <h3 id={`install-${o.os}`} className="text-[17px] font-semibold tracking-[-0.012em] text-[var(--text-primary)]">
                    {o.os}
                  </h3>
                  <p className="text-[13.5px] text-[var(--text-tertiary)]">{o.requirement}</p>
                </div>
              </div>
              <ol className="mt-5 space-y-3">
                {o.steps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-[15px] leading-[1.55] text-[var(--text-body)]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-panel)] text-[12.5px] font-semibold tabular-nums text-[var(--text-secondary)]">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection id="app" title="The same workspace, on your machine." aside="A brief, a real codebase, tests and a team to ask.">
        <PaintedStage painting="field">
          <ProductFrame size="hero" chrome="none" title="Fydell · Simulation" label="The Fydell desktop app with a simulation open: the incident, its activity and the team thread.">
            <SimulationHero />
          </ProductFrame>
        </PaintedStage>
      </ShowcaseSection>

      <ShowcaseSection
        id="details"
        title="Before you install."
        aside="What the app needs and what it does on your computer."
        after={
          <Tiles
            items={[
              { title: "Internet connection", body: "Sign-in, simulations and submissions go through fydell.com. The app keeps a local draft if the connection drops." },
              { title: "Nothing runs in the background", body: "Fydell records activity only inside an open simulation, and tells you what it records before you start." },
              { title: "Updates", body: "Automatic updates are off in beta builds. New versions are published on this page and in the changelog." },
            ]}
          />
        }
      >
        <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
            <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Recent releases</h3>
            <Link href="/changelog" className="text-[14px] font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4">
              Full changelog
            </Link>
          </div>
          <ul className="divide-y divide-[var(--border-subtle)]">
            {recent.map((r) => (
              <li key={r.version} className="grid gap-1 px-6 py-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
                <div>
                  <p className="text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">{r.version}</p>
                  <p className="text-[13.5px] text-[var(--text-tertiary)]">{formatReleaseDate(r.date)}</p>
                </div>
                <div>
                  <p className="text-[15px] font-medium text-[var(--text-primary)]">{r.title}</p>
                  <ul className="mt-1 space-y-1">
                    {r.notes.map((n) => (
                      <li key={n} className="text-[14.5px] leading-[1.55] text-[var(--text-secondary)]">
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </ShowcaseSection>

      <SiteFaq
        items={[
          { q: "Do I need the desktop app?", a: "No. Invitations, your profile, projects and every simulation also work in the browser." },
          { q: "Is there a Linux, Intel Mac or Windows on ARM build?", a: "Not yet. Use Fydell in the browser on those systems." },
          { q: "Why does my computer warn me about the installer?", a: "Beta builds are not code-signed yet, so Windows and macOS ask you to confirm the first launch. The steps above show how." },
          { q: "Where do I report a problem?", a: "Use Contact on this site, or the Support link inside a simulation." },
        ]}
      />

      <section className="pb-32 pt-24 text-center">
        <p className="text-[15px] text-[var(--text-secondary)]">
          Prefer the browser?{" "}
          <Link href="/signup" className="font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4">
            Sign up
          </Link>{" "}
          or{" "}
          <Link href="/login" className="font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4">
            log in
          </Link>{" "}
          on the web.
        </p>
      </section>
    </MarketingShell>
  );
}
