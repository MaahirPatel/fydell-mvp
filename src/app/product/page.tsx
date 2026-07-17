import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, EditorialHeader } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";
import ProjectMeridianWindow from "@/components/marketing/ProjectMeridianWindow";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";
import CategoryPanels from "@/components/marketing/CategoryPanels";
import EvidenceCaptureSection from "@/components/marketing/EvidenceCaptureSection";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Product · Fydell",
  description:
    "Fydell gives FDE candidates a realistic deployment mission and gives hiring teams structured evidence from how the work was actually done.",
};

export default function ProductPage() {
  return (
    <MarketingShell>
      <PageHero
        title="The deployment simulation before the hire."
        description="FDE candidates complete a realistic mission. Hiring teams receive structured evidence from how that work was done."
      />

      <section className="pb-16 sm:pb-20 lg:pb-24">
        <Container>
          <Reveal>
            <div className="overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.10)] max-md:overflow-x-auto">
              <div className="min-w-[720px] md:min-w-0">
                <ProjectMeridianWindow />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal>
            <EditorialHeader
              heading="What the trial produces."
              description="Every completed workroom generates structured objects your hiring team can read, share, and act on."
              stageHref="/how-it-works"
              stageLabel="How it works"
            />
          </Reveal>
          <Reveal delay={0.06} className="mt-[72px] lg:mt-20">
            <CategoryPanels />
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal>
            <EditorialHeader
              heading="What gets captured."
              description="Every action inside the workroom is logged as evidence — reviewed before the report is delivered."
              stageHref="/#project-meridian"
              stageLabel="Project Meridian"
            />
          </Reveal>
          <Reveal delay={0.06} className="mt-[72px] lg:mt-20">
            <EvidenceCaptureSection />
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal>
            <EditorialHeader
              heading="What your hiring team receives."
              description="Within 24 hours of submission, you get a structured evidence report — with recommendation, confidence, and what to ask next."
              stageHref="/sample-report"
              stageLabel="Sample report"
            />
          </Reveal>
          <Reveal delay={0.06} className="mt-[72px] lg:mt-20">
            <div className="overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.10)] max-md:overflow-x-auto">
              <div className="min-w-[720px] md:min-w-0">
                <EvidenceReportMockup />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <FinalCTA />
    </MarketingShell>
  );
}
