import { Container, EditorialHeader } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import WorkroomDetailMock from "@/components/marketing/home/WorkroomDetailMock";

export default function HomeWorkroomDetail() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal>
          <EditorialHeader
            heading="Put candidates inside the work."
            description="Candidates review operating data, update a live forecast, investigate inconsistencies, and submit a recommendation under the same kinds of constraints the role creates."
            stageHref="#project-meridian"
            stageLabel="1.0 · Work trial"
          />
        </Reveal>

        <Reveal delay={0.08} className="mt-[72px] lg:mt-20">
          <div className="overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.10)] max-md:overflow-x-auto">
            <div className="min-w-[720px] md:min-w-0">
              <WorkroomDetailMock />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
