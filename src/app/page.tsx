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
      <section className="relative overflow-hidden pt-[80px] pb-10 sm:pt-[88px] sm:pb-12 lg:pb-14">
        <div
          className="pointer-events-none absolute left-[-4%] top-[0%] h-[520px] w-[640px]"
          style={{
            background: "radial-gradient(circle, rgba(86,98,255,0.18), transparent 68%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-[-2%] top-[8%] h-[480px] w-[560px]"
          style={{
            background: "radial-gradient(circle, rgba(134,87,244,0.16), transparent 70%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-[35%] top-[22%] h-[400px] w-[480px]"
          style={{
            background: "radial-gradient(circle, rgba(242,107,130,0.12), transparent 68%)",
          }}
          aria-hidden
        />

        <Container className="relative z-10">
          {/* Hero top: one horizontal headline only */}
          <Reveal y={8} className="w-full">
            <h1
              className="flat-type hero-oneline w-full"
              style={{
                color: "#F4F5F7",
                background: "none",
                WebkitTextFillColor: "#F4F5F7",
                fontWeight: 650,
                letterSpacing: "-0.045em",
                lineHeight: 1,
              }}
            >
              See how finance candidates work before the interview.
            </h1>
          </Reveal>

          <Reveal delay={0.08} y={12} className="relative mt-10 sm:mt-12">
            <div
              className="pointer-events-none absolute -inset-x-6 -bottom-8 top-1/4 rounded-[40px]"
              style={{
                background:
                  "radial-gradient(ellipse at 70% 20%, rgba(86,98,255,0.14), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(134,87,244,0.10), transparent 50%), radial-gradient(ellipse at 55% 60%, rgba(242,107,130,0.08), transparent 55%)",
              }}
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[16px] max-md:overflow-x-auto">
              <div className="min-w-[760px] md:min-w-0">
                <ProjectMeridianWindow />
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
