import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/marketing/ui";
import ProjectMeridianWindow from "@/components/marketing/ProjectMeridianWindow";
import HomeProductStages from "@/components/marketing/home/HomeProductStages";
import HomeWorkroomDetail from "@/components/marketing/home/HomeWorkroomDetail";
import HomeCurveballs from "@/components/marketing/home/HomeCurveballs";
import HomeEvidenceReport from "@/components/marketing/home/HomeEvidenceReport";
import HomeMeasures from "@/components/marketing/home/HomeMeasures";
import HomeCalibration from "@/components/marketing/home/HomeCalibration";
import HomeRoles from "@/components/marketing/home/HomeRoles";
import HomePilotCta from "@/components/marketing/home/HomePilotCta";
import Link from "next/link";

export const metadata = {
  title: "Fydell",
  description:
    "See how a Forward Deployed Engineer actually works before you hire them. Fydell runs a realistic 50-minute deployment simulation and turns the recorded session into a portable evidence receipt.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden pb-16 sm:pb-20 lg:pb-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 45% at 50% 48%, rgba(86,98,255,0.075), transparent 72%), radial-gradient(45% 36% at 72% 42%, rgba(134,87,244,0.045), transparent 75%)",
          }}
          aria-hidden
        />

        {/*
          Geometry at ~1669×900:
          nav 56px + ~150–165px calm opening → H1 near y 205–220
        */}
        <Container className="relative z-10 pt-[168px] sm:pt-[180px] lg:pt-[210px]">
          <Reveal y={8}>
            <h1 className="flat-type hero-display">
              See how an FDE actually works
              <br className="hidden sm:block" />{" "}
              before you hire them.
            </h1>
            <div className="mt-[30px] flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
              <p className="hero-sub !mt-0">
                A real 50-minute deployment simulation. A portable evidence receipt your team can review.
              </p>
              <Link
                href="#project-meridian"
                className="hero-context-link shrink-0 self-start sm:self-end"
              >
                <span className="accent">Project Relay</span>
                <span>· Explore the simulation</span>
                <span className="arrow" aria-hidden>
                  →
                </span>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.08} y={14} className="hero-product-stage relative">
            <div id="project-meridian" className="scroll-mt-20">
              <div className="hero-product-glow" aria-hidden />
              <div className="hero-product-frame max-md:overflow-x-auto">
                <div className="min-w-[720px] md:min-w-0">
                  <ProjectMeridianWindow />
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <HomeProductStages />
      <HomeWorkroomDetail />
      <HomeCurveballs />
      <HomeEvidenceReport />
      <HomeCalibration />
      <HomeMeasures />
      <HomeRoles />
      <HomePilotCta />
    </MarketingShell>
  );
}
