import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
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
      {/* Hero — left-aligned product composition */}
      <section className="relative overflow-hidden pt-[70px] pb-14 sm:pt-[78px] sm:pb-16 lg:pt-[82px] lg:pb-[60px]">
        <div
          className="pointer-events-none absolute left-[12%] top-[8%] h-[420px] w-[520px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(86,98,255,0.10), transparent 70%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-[18%] top-[42%] h-[360px] w-[480px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.035), transparent 68%)",
          }}
          aria-hidden
        />

        <Container className="relative z-10">
          <Reveal y={12} className="max-w-[780px]">
            <p
              className="text-[12px] text-[var(--text-secondary)]"
              style={{ fontWeight: 550, letterSpacing: "0.02em" }}
            >
              Finance-first hiring
            </p>

            <div className="mt-4 flex items-start justify-between gap-8">
              <h1
                className="max-w-[780px] text-[var(--text-primary)] text-balance"
                style={{
                  fontSize: "clamp(2.375rem, 5vw, 4.25rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.04em",
                  fontWeight: 650,
                }}
              >
                See how finance candidates work before the interview.
              </h1>
              <TextLink
                href="/product"
                className="mt-2 hidden shrink-0 text-[12px] xl:inline-flex"
              >
                Live product · Project Meridian
              </TextLink>
            </div>

            <p
              className="mt-5 max-w-[620px] text-[17px] leading-[1.55] text-[var(--text-secondary)] sm:text-[18px]"
              style={{ letterSpacing: "-0.01em", fontWeight: 450 }}
            >
              Fydell runs realistic FP&amp;A work trials and turns each decision, assumption, and
              response into evidence your team can review.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <ButtonLink href="/request-pilot" variant="primary">
                Request a pilot
              </ButtonLink>
              <TextLink href="/sample-report">View sample report</TextLink>
            </div>

            <p className="mt-6 text-[12px] text-[var(--text-tertiary)]">
              Private candidate links
              <span className="mx-2 text-[var(--text-disabled)]">·</span>
              No public test bank
              <span className="mx-2 text-[var(--text-disabled)]">·</span>
              Evidence you can inspect
            </p>
          </Reveal>

          <Reveal delay={0.1} y={14} className="relative mt-12 sm:mt-14">
            <div
              className="pointer-events-none absolute -inset-x-8 -bottom-10 top-1/3 rounded-[40px]"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 70%, rgba(255,255,255,0.04), transparent 65%), radial-gradient(ellipse at 80% 30%, rgba(86,98,255,0.07), transparent 55%)",
              }}
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-[16px] max-md:overflow-x-auto">
              <div className="min-w-[720px] md:min-w-0">
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
