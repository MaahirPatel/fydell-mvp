import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/marketing/ui";
import ProjectMeridianWindow from "@/components/marketing/ProjectMeridianWindow";
import HomeProductStages from "@/components/marketing/home/HomeProductStages";
import HomeWorkroomDetail from "@/components/marketing/home/HomeWorkroomDetail";
import HomeEvidenceReport from "@/components/marketing/home/HomeEvidenceReport";
import HomeMeasures from "@/components/marketing/home/HomeMeasures";
import HomeCalibration from "@/components/marketing/home/HomeCalibration";
import HomeRoles from "@/components/marketing/home/HomeRoles";
import HomePilotCta from "@/components/marketing/home/HomePilotCta";

export const metadata = {
  title: "Fydell",
  description:
    "See how finance candidates work before the interview. Fydell runs realistic FP&A work trials and turns each decision into evidence your team can review.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden pb-16 sm:pb-20 lg:pb-24">
        {/* Soft brand spotlights — Linear-style placement, Fydell blue + red */}
        <div
          className="pointer-events-none absolute left-1/2 top-[18%] h-[70vh] w-[90vw] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(86,98,255,0.14), transparent 70%), radial-gradient(ellipse 55% 45% at 62% 55%, rgba(242,107,130,0.10), transparent 68%), radial-gradient(ellipse 40% 35% at 35% 60%, rgba(134,87,244,0.08), transparent 70%)",
          }}
          aria-hidden
        />

        <Container className="relative z-10 pt-[108px] sm:pt-[120px] lg:pt-[132px]">
          {/* Linear-like type block: left-aligned, 2-line display, breathing room */}
          <Reveal y={10} className="max-w-[920px]">
            <h1 className="flat-type hero-display">
              See how finance candidates work before the interview.
            </h1>
            <p className="hero-sub">
              Realistic FP&amp;A work trials. Evidence your team can review.
            </p>
          </Reveal>

          {/* Product stage — centered, soft perspective, spotlight behind */}
          <Reveal delay={0.1} y={16} className="hero-product-stage relative mt-12 sm:mt-14 lg:mt-16">
            <div className="hero-product-glow" aria-hidden />
            <div className="hero-product-perspective">
              <div className="hero-product-frame max-md:overflow-x-auto">
                <div className="min-w-[760px] md:min-w-0">
                  <ProjectMeridianWindow />
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <HomeProductStages />
      <HomeWorkroomDetail />
      <HomeEvidenceReport />
      <HomeMeasures />
      <HomeCalibration />
      <HomeRoles />
      <HomePilotCta />
    </MarketingShell>
  );
}
