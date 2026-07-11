import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/marketing/ui";
import FydellAurora from "@/components/marketing/FydellAurora";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";

export const metadata = {
  title: "Fydell",
  description:
    "An example of what a finance hiring team receives after a candidate completes Project Meridian.",
};

export default function SampleReportPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden pb-12 pt-[120px] sm:pb-16 sm:pt-[140px]">
        <FydellAurora variant="report" className="opacity-45" />
        <Container className="relative z-10">
          <Reveal className="max-w-[720px]">
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.10em] text-white/[0.42]">
              Sample Hiring Evidence Report
            </p>
            <h1
              className="text-white"
              style={{
                fontSize: "clamp(2.4rem, 4.5vw, 3.75rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.04em",
                fontWeight: 650,
              }}
            >
              Sample Hiring Evidence Report
            </h1>
            <p className="mt-5 max-w-[560px] text-[17px] leading-[1.65] text-white/[0.66] sm:text-[18px]">
              An example of what a finance hiring team receives after Project Meridian.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="pb-16 lg:pb-20">
        <Container wide>
          <Reveal>
            <div className="max-lg:overflow-x-auto lg:overflow-x-clip rounded-[20px]">
              <div className="min-w-[760px] lg:min-w-0">
                <EvidenceReportMockup />
              </div>
            </div>
          </Reveal>
          <p className="mt-4 text-center text-[12px] text-white/[0.35]">
            Sample · No real candidate data
          </p>
        </Container>
      </section>

      <section className="border-t border-white/[0.06] py-20 lg:py-28">
        <Container>
          <Reveal className="max-w-[540px]">
            <h2
              className="text-white"
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                letterSpacing: "-0.04em",
                fontWeight: 620,
              }}
            >
              Run one FP&A work trial.
            </h2>
            <p className="mt-4 text-[17px] leading-[1.65] text-white/[0.66]">
              Start with one role. Review structured evidence. Decide who is worth interviewing.
            </p>
          </Reveal>
        </Container>
      </section>
    </MarketingShell>
  );
}
