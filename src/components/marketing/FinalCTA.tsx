import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

export default function FinalCTA() {
  return (
    <section className="border-t border-[var(--border-subtle)] pt-[120px] pb-[96px] lg:pt-[160px] lg:pb-[120px]">
      <Container>
        <Reveal className="max-w-[520px]">
          <h2 className="section-heading flat-type">See the work before you hire.</h2>
          <p className="section-desc mt-5">
            Run a founder-led Fydell pilot for one Applied Technical Role.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <ButtonLink href="/signup" variant="primary">
              Sign up
            </ButtonLink>
            <TextLink href="/simulations">Try a five-minute simulation</TextLink>
          </div>
          <p className="mt-6 text-[13px] text-[rgba(244,245,247,0.4)]">
            Configured around your role · No ATS replacement required
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
