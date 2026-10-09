import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import InstallAppButton from "@/components/marketing/site/InstallAppButton";
import PaintedStage from "@/components/marketing/site/PaintedStage";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import SimulationHero from "@/components/marketing/site/SimulationHero";
import { AppleIcon, WindowsIcon } from "@/components/marketing/site/OsIcons";
import { CenteredHero, ShowcaseSection, Tiles } from "@/components/marketing/site/Home";
import { SiteFaq } from "@/components/marketing/site/Sections";

export const metadata = {
  title: "Install the app",
  description: "Install Fydell from your browser on Windows or Mac. It opens in its own window, with no installer to download.",
  alternates: { canonical: "/download" },
};

const INSTALL = [
  {
    os: "Windows",
    icon: <WindowsIcon size={18} />,
    requirement: "Microsoft Edge or Google Chrome",
    steps: [
      "Open fydell.com in Edge or Chrome.",
      "Select Install Fydell on this page, or the install icon at the right end of the address bar.",
      "Confirm Install. Fydell opens in its own window and is added to the Start menu.",
      "Pin it to the taskbar if you like. Log in once and it remembers you.",
    ],
  },
  {
    os: "Mac",
    icon: <AppleIcon size={18} />,
    requirement: "Chrome, Edge or Safari",
    steps: [
      "Open fydell.com in Chrome, Edge or Safari.",
      "In Chrome or Edge, select the install icon in the address bar. In Safari, choose File, then Add to Dock.",
      "Fydell opens in its own window and appears in Launchpad and the Dock.",
      "Log in once and it remembers you.",
    ],
  },
] as const;

export default function DownloadPage() {
  return (
    <MarketingShell>
      <CenteredHero
        title="Install Fydell"
        lead="Fydell installs straight from your browser and opens in its own window, with its own icon in the Start menu and taskbar. There is no installer to download and no security warning to click through."
        actions={<InstallAppButton />}
      />

      <ShowcaseSection id="install" title="Install in a minute." aside="Works on Windows and Mac. Updates arrive on their own.">
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

      <ShowcaseSection id="app" title="Your whole workspace, in its own window." aside="Projects, reports, simulations and the team thread.">
        <PaintedStage painting="field">
          <ProductFrame size="hero" chrome="none" title="Fydell · Simulation" label="Fydell with a simulation open: the incident, its activity and the team thread.">
            <SimulationHero />
          </ProductFrame>
        </PaintedStage>
      </ShowcaseSection>

      <ShowcaseSection
        id="details"
        title="What the app does on your computer."
        aside="Very little, on purpose."
        after={
          <Tiles
            items={[
              { title: "Nothing to install from a file", body: "Your browser adds Fydell as an app. Nothing is copied into system folders. The only permission it asks for is the one project folder you choose for an engineering task." },
              { title: "Nothing runs in the background", body: "Fydell records activity only inside an open simulation, and tells you what it records before you start." },
              { title: "Always up to date", body: "Every change to fydell.com reaches the app the next time you open it." },
            ]}
          />
        }
      >
        <p className="max-w-[68ch] text-[15.5px] leading-[1.65] text-[var(--text-body)]">

          The app opens on your own home: invitations sent to your email arrive in the inbox in the corner, and your tasks, reports and profile sit in the sidebar with your name at the bottom. For an engineering task, Fydell writes the starter project into a folder you pick, you work on it in VS Code or Cursor, and Fydell packages that folder when you submit, leaving out caches and credentials. Writing to a folder needs Edge or Chrome; in other browsers you download and upload a ZIP instead.
        </p>
      </ShowcaseSection>

      <SiteFaq
        items={[
          { q: "Do I need to install anything?", a: "No. Everything works in a normal browser tab. Installing only gives Fydell its own window and icon." },
          { q: "What happened to the Windows installer?", a: "The separate desktop app has been retired. The installed app has the same inbox, tasks, reports and profile, and sets up and packages project folders the way the desktop app did, without an unsigned installer or a security warning." },
          { q: "How do I uninstall it?", a: "On Windows, right-click Fydell in the Start menu and choose Uninstall. On Mac, open the app and choose Uninstall from its menu, or remove it from the Dock." },
          { q: "Where do I report a problem?", a: "Use Contact on this site, or the Support link inside a simulation." },
        ]}
      />

      <section className="pb-32 pt-24 text-center">
        <p className="text-[15px] text-[var(--text-secondary)]">
          Prefer a browser tab?{" "}
          <Link href="/signup" className="font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4">
            Sign up
          </Link>{" "}
          or{" "}
          <Link href="/login" className="font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4">
            log in
          </Link>
          .
        </p>
      </section>
    </MarketingShell>
  );
}
