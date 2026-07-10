import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, SectionHeading } from "@/components/marketing/ui";
import FydellAurora, { FydellGrid } from "@/components/marketing/FydellAurora";
import ProjectMeridianWindow from "@/components/marketing/ProjectMeridianWindow";
import CategoryPanels from "@/components/marketing/CategoryPanels";
import EvidenceCaptureSection from "@/components/marketing/EvidenceCaptureSection";
import WorkroomMockup from "@/components/marketing/WorkroomMockup";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";
import FeedbackLoop from "@/components/marketing/FeedbackLoop";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Fydell",
  description:
    "Fydell lets finance teams run realistic FP&A work trials and review structured evidence before deciding who to interview.",
};

const WORKROOM_BLOCKS = [
  {
    title: "Brief + data room",
    body: "Business context, stakeholder ask, and the financial materials the candidate needs.",
  },
  {
    title: "Forecast model",
    body: "A working model with realistic inputs and embedded ambiguities.",
  },
  {
    title: "Manager update",
    body: "A mid-session data drop that changes the picture.",
  },
  {
    title: "Written memo",
    body: "An executive recommendation with rationale.",
  },
];

export default function HomePage() {
  return (
    <MarketingShell>
      {/* 1. Centered hero + product visual below */}
      <section className="relative overflow-hidden pt-[120px] pb-16 sm:pt-[140px] sm:pb-24 lg:pt-[150px]">
        <FydellGrid />
        <FydellAurora variant="hero" className="top-[28%] opacity-90" />

        <Container wide className="relative z-10">
          <Reveal y={20} className="mx-auto max-w-[980px] text-center">
            <h1
              className="text-white"
              style={{
                fontSize: "clamp(2.75rem, 6.5vw, 5.5rem)",
                lineHeight: 0.96,
                letterSpacing: "-0.04em",
                fontWeight: 650,
              }}
            >
              Hire on real work, not polished resumes.
            </h1>
            <p className="mx-auto mt-6 max-w-[680px] text-[17px] leading-[1.65] text-white/[0.66] sm:text-[18px] sm:leading-[1.7]">
              Fydell lets finance teams run realistic FP&A work trials and review structured
              evidence before deciding who to interview.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink
                href="/request-pilot"
                variant="primary"
                className="h-11 min-w-[148px] px-5 text-[15px]"
              >
                Request a pilot
              </ButtonLink>
              <ButtonLink
                href="/sample-report"
                variant="secondary"
                className="h-11 min-w-[148px] px-5 text-[15px]"
              >
                See sample report
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={0.15} y={28} className="relative mx-auto mt-14 max-w-[1320px] sm:mt-16 lg:mt-20">
            <div
              className="pointer-events-none absolute -inset-10 rounded-[40px] opacity-80"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 40%, rgba(49,92,255,0.10), transparent 65%)",
              }}
              aria-hidden
            />
            <div className="relative max-lg:overflow-x-auto lg:overflow-x-clip rounded-[20px]">
              <div className="min-w-[900px] lg:min-w-0">
                <ProjectMeridianWindow />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 2. Three artifact cards */}
      <section className="relative mkt-section border-t border-white/[0.06]">
        <FydellAurora variant="section" className="opacity-50" />
        <Container className="relative z-10">
          <Reveal>
            <SectionHeading
              title="What the trial produces."
              subtitle="Every completed workroom generates three structured objects your hiring team can read, share, and act on."
            />
          </Reveal>
          <Reveal delay={0.08} className="mt-12 sm:mt-14">
            <CategoryPanels />
          </Reveal>
        </Container>
      </section>

      {/* 3. Split evidence capture */}
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

      {/* 4. Full-width workroom + explanation blocks below */}
      <section className="mkt-section border-t border-white/[0.06]">
        <Container wide>
          <Reveal className="mb-10 max-w-[720px] sm:mb-12">
            <SectionHeading
              title="The workroom mirrors the job."
              subtitle="Candidates review documents, update assumptions, respond to new information, use AI carefully, and write a recommendation."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <div className="max-lg:overflow-x-auto lg:overflow-x-clip rounded-[20px]">
              <div className="min-w-[860px] lg:min-w-0">
                <WorkroomMockup />
              </div>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORKROOM_BLOCKS.map((block, i) => (
              <Reveal key={block.title} delay={0.05 + i * 0.05}>
                <div className="rounded-[14px] border border-white/[0.09] bg-[#0B0F18] px-4 py-4">
                  <h3 className="text-[13px] font-semibold text-white">{block.title}</h3>
                  <p className="mt-2 text-[12px] leading-[1.6] text-white/[0.52]">{block.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 5. Large report artifact */}
      <section className="relative mkt-section border-t border-white/[0.06]">
        <FydellAurora variant="report" className="opacity-40" />
        <Container wide className="relative z-10">
          <Reveal className="mb-10 max-w-[720px] sm:mb-12">
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
        </Container>
      </section>

      {/* 6. Pipeline / loop */}
      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <Reveal className="mb-10 max-w-[720px] sm:mb-12">
            <SectionHeading
              title="Every hiring decision improves the signal."
              subtitle="Fydell connects work-trial evidence with interview feedback and post-hire outcomes so the signal gets sharper over time."
            />
          </Reveal>
          <Reveal delay={0.06}>
            <FeedbackLoop />
          </Reveal>
        </Container>
      </section>

      <FinalCTA />
    </MarketingShell>
  );
}
