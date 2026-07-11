import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Pricing · Fydell",
  description:
    "No setup fee. No subscription. Pay only when a candidate completes the workroom and you receive a report.",
};

const INCLUDES = [
  "One FP&A role, configured to your level and focus",
  "Private invite links — no limit per pilot",
  "Evidence report per completed workroom",
  "24-hour turnaround after submission",
  "Founder-led pilot — direct access throughout",
  "Every report reviewed before delivery",
  "Advance / Hold / Review with confidence level",
  "Cancel any time — no contract",
];

const FAQS = [
  {
    q: "What does $10 per report include?",
    a: "Workroom configuration, invite links, evidence report generation, and follow-up interview questions. You pay only for completed submissions.",
  },
  {
    q: "Is there a minimum spend?",
    a: "No. You can run a single candidate for $10 before scaling to a full cohort.",
  },
  {
    q: "How do I pay?",
    a: "Pilots are invoiced at the end of the cohort. No credit card required upfront.",
  },
  {
    q: "What happens after the pilot?",
    a: "Pricing stays flat per report — no platform fees, no per-seat pricing.",
  },
  {
    q: "What if a candidate does not complete?",
    a: "Partial completions and no-shows are not charged.",
  },
  {
    q: "Can I run multiple roles?",
    a: "The pilot covers one FP&A role. Multiple roles can run in parallel after the pilot.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Simple, transparent pricing."
        description="No setup fee. No subscription. Pay only when a candidate completes the workroom and you receive a report."
      />

      <section className="pb-16 sm:pb-20 lg:pb-24">
        <Container>
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="mkt-panel overflow-hidden lg:col-span-7">
                <div className="border-b border-[var(--border-subtle)] px-6 py-6 sm:px-8 sm:py-7">
                  <p
                    className="text-[11px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
                    style={{ fontWeight: 500 }}
                  >
                    FP&A Pilot
                  </p>
                  <div className="mt-3 flex items-end gap-2">
                    <span
                      className="text-[#F4F5F7]"
                      style={{
                        fontSize: "clamp(2.75rem, 4vw, 3.5rem)",
                        lineHeight: 1,
                        letterSpacing: "-0.04em",
                        fontWeight: 560,
                      }}
                    >
                      $10
                    </span>
                    <span className="mb-1.5 text-[15px] text-[rgba(244,245,247,0.62)]">
                      per completed report
                    </span>
                  </div>
                  <p className="mt-4 max-w-[480px] text-[15px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                    One role, as many candidates as you need. Founder-managed throughout the pilot.
                  </p>
                </div>

                <div className="px-6 py-6 sm:px-8">
                  <p
                    className="mb-4 text-[11px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
                    style={{ fontWeight: 500 }}
                  >
                    Included
                  </p>
                  <ul className="space-y-0">
                    {INCLUDES.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 border-b border-white/[0.04] py-3 text-[14px] leading-[1.5] text-[rgba(244,245,247,0.72)]"
                      >
                        <span className="mt-2 h-px w-3 shrink-0 bg-[#5662FF]" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <ButtonLink href="/#request-pilot" variant="primary">
                      Request a pilot
                    </ButtonLink>
                    <TextLink href="/sample-report">View a sample report</TextLink>
                  </div>
                  <p className="mt-5 text-[12px] text-[rgba(244,245,247,0.4)]">
                    No credit card required. We invoice after the pilot.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-0 border-t border-[var(--border-subtle)] lg:col-span-4 lg:col-start-9 lg:border-t-0">
                {[
                  {
                    title: "Why pay-per-report?",
                    body: "You should not pay for access before the product has proven its value. Fydell earns when you receive a usable report.",
                  },
                  {
                    title: "Founder-led",
                    body: "During the pilot, we configure the workroom and review every report before delivery.",
                  },
                  {
                    title: "After the pilot",
                    body: "Pricing stays at $10 per report. No switch to a platform subscription model.",
                  },
                ].map((item, i, arr) => (
                  <div
                    key={item.title}
                    className={[
                      "py-6",
                      i < arr.length - 1 ? "border-b border-[var(--border-subtle)]" : "",
                    ].join(" ")}
                  >
                    <h3 className="text-[15px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal className="max-w-[500px]">
            <h2 className="section-heading flat-type">Questions about the pilot.</h2>
          </Reveal>
          <div className="mt-12 border-t border-[var(--border-subtle)]">
            {FAQS.map((faq, i) => (
              <Reveal key={faq.q} delay={0.02 * i}>
                <div className="grid gap-3 border-b border-[var(--border-subtle)] py-5 sm:grid-cols-[0.9fr_1.4fr] sm:gap-8">
                  <h3 className="text-[15px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                    {faq.q}
                  </h3>
                  <p className="text-[14px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                    {faq.a}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <FinalCTA />
    </MarketingShell>
  );
}
