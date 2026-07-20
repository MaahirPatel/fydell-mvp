import { Container, EditorialHeader } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import HomeReportMock from "@/components/marketing/home/HomeReportMock";

export default function HomeEvidenceReport() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal>
          <EditorialHeader
            heading="A receipt your team reads, not a score you trust blindly."
            description="Strong evidence, needs review, cited moments, and follow-up questions your interviewer can actually ask. The fit score shows up once — as context, not the headline."
            stageHref="#request-pilot"
            stageLabel="3.0 · Evidence report"
          />
        </Reveal>

        <Reveal delay={0.08} className="mt-[72px] lg:mt-20">
          <div className="overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.10)] max-md:overflow-x-auto">
            <div className="min-w-[760px] md:min-w-0">
              <HomeReportMock />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
