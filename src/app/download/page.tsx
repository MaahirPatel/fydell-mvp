import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import DownloadButton from "@/components/marketing/site/DownloadButton";
import PaintedStage from "@/components/marketing/site/PaintedStage";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import SimulationHero from "@/components/marketing/site/SimulationHero";
import { Announcement, CenteredHero, ShowcaseSection, Tiles } from "@/components/marketing/site/Home";
import { SiteFaq } from "@/components/marketing/site/Sections";
import { LATEST } from "@/components/marketing/site/releases";

export const metadata = {
  title: "Download",
  description: `Fydell Desktop ${LATEST.version} for macOS (Apple silicon) and Windows. Optional: everything also works in the browser.`,
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <MarketingShell>
      <CenteredHero
        announcement={<Announcement href="/changelog" label={`Version ${LATEST.version}`} action="Read the changelog" />}
        title="Download Fydell"
        lead="Take simulations in a native workspace on your computer. Optional: everything also works in the browser."
        actions={
          <>
            <DownloadButton os="windows" />
            <DownloadButton os="macos" variant="quiet" />
          </>
        }
      >
        <PaintedStage painting="field" priority>
          <ProductFrame size="hero" chrome="none" title="Fydell · Simulation" label="The Fydell desktop app with a simulation open: the incident, its activity and the team thread.">
            <SimulationHero />
          </ProductFrame>
        </PaintedStage>
      </CenteredHero>

      <ShowcaseSection id="install" title="Install in a minute." aside="Beta builds are not code-signed yet, so the first launch takes one extra step.">
        <Tiles
          items={[
            { title: "Windows 10 and 11, 64-bit", body: "Run the .exe. If SmartScreen warns, choose More info, then Run anyway. An .msi is available for managed installs." },
            { title: "macOS, Apple silicon", body: "Open the .dmg and drag Fydell to Applications. On first launch, right-click Fydell and choose Open." },
            { title: "Updates", body: "Automatic updates are off in beta builds. Download new versions from this page." },
          ]}
        />
      </ShowcaseSection>

      <SiteFaq
        items={[
          { q: "Do I need the desktop app?", a: "No. Invitations, your Passport and every other part of Fydell work in the browser." },
          { q: "Is there a Linux or Intel Mac build?", a: "Not yet. Use Fydell in the browser on those systems." },
          { q: "Where do I report a problem?", a: "Use Contact on this site, or the Support link inside a simulation." },
        ]}
      />

      <section className="pb-32 pt-24 text-center">
        <p className="text-[15px] text-[var(--text-secondary)]">
          Prefer the browser?{" "}
          <Link href="/signup" className="font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4">
            Continue on the web
          </Link>
        </p>
      </section>
    </MarketingShell>
  );
}
