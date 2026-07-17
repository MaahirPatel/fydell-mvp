import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";

export default function HomePilotCta() {
  return (
    <section
      id="request-pilot"
      className="border-t border-[var(--border-subtle)] pt-[120px] pb-[96px] lg:pt-[160px] lg:pb-[120px]"
    >
      <Container>
        <div className="grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <Reveal className="max-w-[480px]">
            <h2 className="section-heading flat-type">See the deployment before you hire.</h2>
            <p className="section-desc mt-5">
              Run a founder-led Fydell pilot for one real FDE mission.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <ButtonLink href="/signup" variant="primary">
                Sign up
              </ButtonLink>
              <TextLink href="#project-relay">See how it works</TextLink>
            </div>
            <p className="mt-6 text-[13px] text-[rgba(244,245,247,0.4)]">
              Configured around your mission · No ATS replacement required
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-0)] p-5 sm:p-6">
              <PilotRequestForm />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
