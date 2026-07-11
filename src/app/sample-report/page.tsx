import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";

export const metadata = {
  title: "Sample Report · Fydell",
  description:
    "An example of what a finance hiring team receives after a candidate completes Project Meridian.",
};

export default function SampleReportPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Sample hiring evidence report."
        description="An example of what a finance hiring team receives after Project Meridian."
      />

      <section className="pb-16 lg:pb-20">
        <Container>
          <Reveal>
            <div className="overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.10)] max-md:overflow-x-auto">
              <div className="min-w-[720px] md:min-w-0">
                <EvidenceReportMockup />
              </div>
            </div>
            <p className="mt-4 text-[12px] text-[rgba(244,245,247,0.4)]">
              Sample · No real candidate data
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="border-t border-[var(--border-subtle)] pt-[120px] pb-[96px] lg:pt-[160px] lg:pb-[120px]">
        <Container>
          <Reveal className="max-w-[520px]">
            <h2 className="section-heading flat-type">See the work before the interview.</h2>
            <p className="section-desc mt-5">
              Run a founder-led Fydell pilot for one active FP&amp;A role.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <ButtonLink href="/#request-pilot" variant="primary">
                Request a pilot
              </ButtonLink>
              <TextLink href="/product">View product</TextLink>
            </div>
          </Reveal>
        </Container>
      </section>
    </MarketingShell>
  );
}
