import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, SectionHeading } from "@/components/marketing/ui";
import FydellAurora, { FydellGrid } from "@/components/marketing/FydellAurora";
import ProjectMeridianWindow from "@/components/marketing/ProjectMeridianWindow";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";
import CategoryPanels from "@/components/marketing/CategoryPanels";
import EvidenceCaptureSection from "@/components/marketing/EvidenceCaptureSection";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Fydell",
  description:
    "Fydell gives candidates a realistic FP&A task and gives hiring teams structured evidence from how the work was done.",
};

export default function ProductPage() {
  return (
    <MarketingShell>
      <section className="relative mkt-section overflow-hidden pt-[100px] lg:pt-[136px]">
        <FydellGrid />
        <Container className="relative z-10">
          <Reveal className="max-w-[680px]">
            <h1 className="text-white" style={{ letterSpacing: "-0.04em" }}>
              The finance workroom before the interview.
            </h1>
            <p className="mt-6 max-w-[520px] text-[18px] leading-[1.65] text-white/[0.66]">
              Fydell gives candidates a realistic FP&A task and gives hiring teams structured
              evidence from how the work was done.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/request-pilot" variant="primary">
                Request a pilot
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="relative pb-20 lg:pb-28">
        <FydellAurora variant="hero" className="opacity-50" />
        <Container wide className="relative z-10">
          <Reveal>
            <div className="max-lg:overflow-x-auto lg:overflow-x-clip rounded-[20px]">
              <div className="min-w-[900px] lg:min-w-0">
                <ProjectMeridianWindow />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <Reveal className="mb-12">
            <SectionHeading
              title="What the trial produces."
              subtitle="Every completed workroom generates three structured objects your hiring team can read, share, and act on."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <CategoryPanels />
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-white/[0.06]">
        <Container wide>
          <Reveal className="mb-10 max-w-[720px] sm:mb-12">
            <SectionHeading
              title="What gets captured."
              subtitle="Every action inside the workroom is logged as evidence — not scored by algorithm alone, but reviewed before the report is delivered."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <EvidenceCaptureSection />
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-white/[0.06]">
        <Container wide>
          <Reveal className="mb-12 max-w-[720px]">
            <SectionHeading
              title="What your hiring team receives."
              subtitle="Within 24 hours of a candidate submitting, you get a structured evidence report. Advance, Hold, or Review — with the reasoning behind it."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <div className="max-lg:overflow-x-auto lg:overflow-x-clip rounded-[20px]">
              <div className="min-w-[760px] lg:min-w-0">
                <EvidenceReportMockup />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="mt-8">
              <ButtonLink href="/sample-report" variant="primary">
                View a full sample report
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>

      <FinalCTA />
    </MarketingShell>
  );
}
