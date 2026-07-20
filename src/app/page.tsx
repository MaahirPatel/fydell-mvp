import dynamic from "next/dynamic";
import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink } from "@/components/marketing/ui";
import ProjectRelaySequence from "@/components/marketing/ProjectRelaySequence";
import HomeProductStages from "@/components/marketing/home/HomeProductStages";
import HomeSimulationContents from "@/components/marketing/home/HomeSimulationContents";
import HomeWorkroomDetail from "@/components/marketing/home/HomeWorkroomDetail";
import HomeCurveballs from "@/components/marketing/home/HomeCurveballs";
import HomeMeasures from "@/components/marketing/home/HomeMeasures";
import HomeEvidenceReport from "@/components/marketing/home/HomeEvidenceReport";
import HomeHiringLoop from "@/components/marketing/home/HomeHiringLoop";
import HomeCalibration from "@/components/marketing/home/HomeCalibration";
import HomeRoles from "@/components/marketing/home/HomeRoles";
import HomePilotCta from "@/components/marketing/home/HomePilotCta";
import { legacyMeridianEnabled } from "@/lib/fde/flags";

// Only code-split-loaded when NEXT_PUBLIC_LEGACY_MERIDIAN=1 (rollback path).
// Customers never pull this chunk while the flag is off.
const LegacyProjectMeridianWindow = dynamic(
  () => import("@/components/marketing/ProjectMeridianWindow")
);

export const metadata = {
  title: "Fydell",
  description:
    "Fydell is work-sample evidence for Forward Deployed Engineer hiring. A recorded deployment simulation tests ambiguity, client empathy, data integrity, and verification — not algorithms — and turns the session into a portable evidence receipt your team can review before you interview.",
};

export default function HomePage() {
  const showLegacyMeridian = legacyMeridianEnabled();
  return (
    <MarketingShell>
      <section className="relative overflow-hidden pb-16 sm:pb-20 lg:pb-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 45% at 50% 48%, rgba(86,98,255,0.085), transparent 72%), radial-gradient(45% 36% at 72% 42%, rgba(58,191,210,0.04), transparent 75%)",
          }}
          aria-hidden
        />

        {/*
          Geometry at ~1669×900:
          nav 56px + ~150–165px calm opening → H1 near y 205–220
        */}
        <Container className="relative z-10 pt-[168px] sm:pt-[180px] lg:pt-[210px]">
          <Reveal y={8}>
            <p
              className="text-[12.5px] uppercase tracking-[0.09em] text-[rgba(244,245,247,0.4)]"
              style={{ fontWeight: 560 }}
            >
              Fydell
            </p>
            <h1 className="flat-type hero-display mt-3">
              See how candidates actually execute.
            </h1>
            <div className="mt-[30px] flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
              <p className="hero-sub !mt-0">
                Generate adaptive work simulations for customer-facing technical roles. Observe
                reasoning, communication, verification, and AI use—then enter the interview with
                evidence.
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-3 self-start sm:self-end">
                <ButtonLink href="/signup" variant="primary">
                  Create an FDE simulation
                </ButtonLink>
                <ButtonLink href="/product" variant="secondary">
                  View the product
                </ButtonLink>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} y={14} className="hero-product-stage relative">
            <div id="project-relay" className="scroll-mt-20">
              <div className="hero-product-glow" aria-hidden />
              <div className="hero-product-frame max-md:overflow-x-auto">
                <div className="min-w-[720px] md:min-w-0">
                  {showLegacyMeridian ? <LegacyProjectMeridianWindow /> : <ProjectRelaySequence />}
                </div>
              </div>
              <p className="mt-4 text-[12.5px] text-[rgba(244,245,247,0.4)]">
                Project Relay · Northbeam Logistics is a synthetic company built for this simulation — no real client data.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      <HomeProductStages />
      <HomeSimulationContents />
      <HomeWorkroomDetail />
      <HomeCurveballs />
      <HomeMeasures />
      <HomeEvidenceReport />
      <HomeHiringLoop />
      <HomeCalibration />
      <HomeRoles />
      <HomePilotCta />
    </MarketingShell>
  );
}
