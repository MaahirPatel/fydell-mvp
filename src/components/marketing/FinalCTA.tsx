import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

export default function FinalCTA() {
  return (
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
            <TextLink href="/#project-meridian">View Project Meridian</TextLink>
          </div>
          <p className="mt-6 text-[13px] text-[rgba(244,245,247,0.4)]">
            Configured around your role · No ATS replacement required
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
