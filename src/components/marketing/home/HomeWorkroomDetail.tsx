import { Container, EditorialHeader } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import WorkroomDetailMock from "@/components/marketing/home/WorkroomDetailMock";

export default function HomeWorkroomDetail() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal>
          <EditorialHeader
            heading="Put FDEs inside the work."
            description="FDEs get a real codebase, an allowlisted terminal, and a live customer chat — then edit, test, and ship under the same constraints the role creates."
            stageHref="#project-relay"
            stageLabel="Project Relay"
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
