import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";

export const metadata = {
  title: "Work receipts · Fydell",
  description:
    "A work receipt is portable, candidate-owned evidence from a real Project Relay session — not a résumé, not a certificate.",
};

const PRINCIPLES = [
  {
    title: "You own it",
    body: "A receipt belongs to the FDE who earned it. Fydell can't share it with anyone on your behalf.",
  },
  {
    title: "It's evidence, not a score",
    body: "Each receipt lists rule-based findings with their own confidence level and stated limitations — no single number pretending to summarize a person.",
  },
  {
    title: "You control access",
    body: "Nothing is visible until you generate a share link. You can revoke that link at any time.",
  },
  {
    title: "It's tied to a real session",
    body: "Every receipt traces back to one specific Project Relay submission — the frozen files, the recorded events, the findings generated from them.",
  },
];

export default function WorkReceiptsPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Work receipts: evidence you actually own."
        description="Every completed Project Relay session can produce a work receipt — a candidate-controlled record of how the work was done."
      />

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <div className="grid gap-0 border-t border-[var(--border-subtle)] sm:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={0.03 * i}>
                <div className="border-b border-[var(--border-subtle)] py-6 sm:px-2 sm:py-7">
                  <h3 className="text-[15px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-[1.55] text-[rgba(244,245,247,0.62)]">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal className="max-w-[640px]">
            <h2 className="section-heading flat-type">How sharing works.</h2>
            <p className="section-desc mt-5">
              From your FDE dashboard, generate a share link for any issued receipt. Anyone with that
              link can view the findings — until you revoke it. There's no public receipt directory.
            </p>
          </Reveal>
          <Reveal delay={0.06} className="mt-8 flex flex-wrap items-center gap-5">
            <ButtonLink href="/signup">Sign up</ButtonLink>
            <TextLink href="/login">Log in</TextLink>
          </Reveal>
        </Container>
      </section>
    </MarketingShell>
  );
}
