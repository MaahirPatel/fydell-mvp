import { Container, EditorialHeader } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import CurveballsMock from "@/components/marketing/home/CurveballsMock";

export default function HomeCurveballs() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal>
          <EditorialHeader
            heading="See judgment when the conditions change."
            description="Controlled updates reveal whether candidates adapt, investigate, communicate, and revise—or preserve a conclusion after the evidence no longer supports it."
            stageHref="#request-pilot"
            stageLabel="2.0 · Curveballs"
          />
        </Reveal>

        <Reveal delay={0.08} className="mt-[72px] lg:mt-20">
          <div className="overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.10)] max-md:overflow-x-auto">
            <div className="min-w-[720px] md:min-w-0">
              <CurveballsMock />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
