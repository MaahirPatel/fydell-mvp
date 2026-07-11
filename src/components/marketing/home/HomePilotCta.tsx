import { Container, TextLink } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";

export default function HomePilotCta() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <Reveal className="max-w-[480px]">
            <h2
              className="text-[var(--text-primary)] text-balance"
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                lineHeight: 1.12,
                letterSpacing: "-0.035em",
                fontWeight: 650,
              }}
            >
              See the work before the interview.
            </h2>
            <p
              className="mt-4 text-[16px] leading-[1.6] text-[var(--text-secondary)] sm:text-[17px]"
              style={{ fontWeight: 450 }}
            >
              Run a founder-led pilot for one active finance role.
            </p>
            <p className="mt-6 text-[13px] text-[var(--text-tertiary)]">
              Or email{" "}
              <a
                href="mailto:hello@fydell.com"
                className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                hello@fydell.com
              </a>
            </p>
            <div className="mt-4">
              <TextLink href="/sample-report">View sample report</TextLink>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-0)] p-5 sm:p-6">
              <PilotRequestForm />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
