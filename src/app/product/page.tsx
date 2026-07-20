import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, EditorialHeader } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";
import ProjectRelaySequence from "@/components/marketing/ProjectRelaySequence";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";
import CategoryPanels from "@/components/marketing/CategoryPanels";
import EvidenceCaptureSection from "@/components/marketing/EvidenceCaptureSection";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Product · Fydell",
  description:
    "Fydell gives FDE candidates a realistic deployment mission at a synthetic logistics company and gives hiring teams trait-level evidence from how the work was actually done.",
};

export default function ProductPage() {
  return (
    <MarketingShell>
      <PageHero
        title="The deployment simulation before the hire."
        description="FDE candidates work a real, ambiguous ask for Northbeam Logistics. Hiring teams get ten traits of cited evidence — not a leaderboard score."
      />

      <section className="pb-16 sm:pb-20 lg:pb-24">
        <Container>
          <Reveal>
            <div className="overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.10)] max-md:overflow-x-auto">
              <div className="min-w-[720px] md:min-w-0">
                <ProjectRelaySequence />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal>
            <EditorialHeader
              heading="What the mission produces."
              description="Every completed Project Relay session at Northbeam Logistics generates structured objects your hiring team can read, share, and act on."
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
              description="File saves, terminal commands, chat with Dana and Priya, and the response to the deadline curveball — all logged as evidence, reviewed before the receipt is delivered."
              stageHref="/simulation"
              stageLabel="Project Relay"
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
              description="Once the FDE submits, you get ten trait findings in strong evidence / needs review / limited / not observed buckets, cited moments, and a fit score shown as context — not the headline."
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
