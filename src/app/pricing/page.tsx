import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, SectionHeading } from "@/components/marketing/ui";
import FinalCTA from "@/components/marketing/FinalCTA";
import Link from "next/link";

export const metadata = {
  title: "Fydell",
  description:
    "No setup fee. No subscription. Pay only when a candidate completes the workroom and you receive a report.",
};

const PILOT_INCLUDES = [
  "One FP&A role, configured to your level and focus",
  "Private invite links — no limit per pilot",
  "Evidence report per completed workroom",
  "24-hour turnaround after submission",
  "Founder-led pilot — direct access throughout",
  "Every report reviewed before delivery",
  "Advance / Hold / Review recommendation with confidence level",
  "Cancel any time — no contract",
];

const FAQS = [
  {
    q: "What does $10 per report include?",
    a: "Everything: workroom configuration, candidate invite links, evidence report generation, and the follow-up interview questions. You pay only for candidates who submit a completed workroom.",
  },
  {
    q: "Is there a minimum spend or minimum number of candidates?",
    a: "No minimum. You can run a single candidate for $10 to see how the report looks before scaling to a full cohort.",
  },
  {
    q: "How do I pay?",
    a: "Pilots are invoiced at the end of the cohort. We send a simple invoice for the number of completed reports. No credit card required upfront.",
  },
  {
    q: "What happens after the pilot?",
    a: "If you want to run more roles or larger cohorts, we will set that up directly. Pricing stays flat per report — no platform fees, no per-seat pricing.",
  },
  {
    q: "What if a candidate drops out or does not complete the workroom?",
    a: "You are only billed for completed submissions. Partial completions and no-shows are not charged.",
  },
  {
    q: "Can I run multiple roles at once?",
    a: "The pilot covers one FP&A role. Once you have seen the signal quality, we can run multiple roles in parallel.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mkt-section pt-[100px] lg:pt-[136px]">
        <Container>
          <Reveal className="max-w-[640px]">
            <h1 className="text-white" style={{ letterSpacing: "-0.04em" }}>
              Simple, transparent pricing.
            </h1>
            <p className="mt-6 max-w-[520px] text-[18px] leading-[1.65] text-white/[0.66]">
              No setup fee. No subscription. Pay only when a candidate completes the workroom and
              you receive a report.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="pb-20 lg:pb-28">
        <Container>
          <Reveal>
            <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:gap-10">
              <div className="fydell-product-frame overflow-hidden">
                <div className="border-b border-white/[0.08] px-8 py-7">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
                    FP&A Pilot
                  </p>
                  <div className="mt-3 flex items-end gap-2">
                    <span
                      className="text-white"
                      style={{
                        fontSize: "clamp(3rem,5vw,4rem)",
                        lineHeight: 1,
                        letterSpacing: "-0.04em",
                        fontWeight: 650,
                      }}
                    >
                      $10
                    </span>
                    <span className="mb-1.5 text-[15px] text-white/[0.55]">
                      per completed report
                    </span>
                  </div>
                  <p className="mt-4 max-w-[480px] text-[15px] leading-[1.65] text-white/[0.55]">
                    One role, as many candidates as you need. Pay per completed workroom.
                    Founder-managed throughout the pilot.
                  </p>
                </div>

                <div className="px-8 py-6">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
                    What Is Included
                  </p>
                  <ul className="space-y-3">
                    {PILOT_INCLUDES.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-2 h-px w-3.5 shrink-0 bg-gradient-to-r from-[#315CFF] to-[#7B5CFF]" />
                        <span className="text-[14px] leading-[1.6] text-white/[0.66]">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <ButtonLink
                      href="/request-pilot"
                      variant="primary"
                      className="w-full justify-center"
                    >
                      Request a pilot
                    </ButtonLink>
                  </div>
                  <p className="mt-4 text-center text-[12px] text-white/[0.30]">
                    No credit card required. We invoice after the pilot.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="rounded-[16px] border border-white/[0.09] bg-[#0B0F18] p-6">
                  <p className="mb-2 text-[14px] font-semibold text-white">Why pay-per-report?</p>
                  <p className="text-[13.5px] leading-[1.65] text-white/[0.55]">
                    You should not pay for access to a tool that has not proven its value yet.
                    Fydell earns only when a candidate completes the workroom and you receive a
                    usable report.
                  </p>
                </div>
                <div className="rounded-[16px] border border-white/[0.09] bg-[#0B0F18] p-6">
                  <p className="mb-2 text-[14px] font-semibold text-white">Founder-led</p>
                  <p className="text-[13.5px] leading-[1.65] text-white/[0.55]">
                    During the pilot, we configure the workroom and review every report before
                    delivery.
                  </p>
                </div>
                <div className="rounded-[16px] border border-white/[0.09] bg-[#0B0F18] p-6">
                  <p className="mb-2 text-[14px] font-semibold text-white">After the pilot</p>
                  <p className="text-[13.5px] leading-[1.65] text-white/[0.55]">
                    Pricing stays at $10 per report. No switch to a platform subscription model.
                  </p>
                  <Link
                    href="/sample-report"
                    className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#4B6FFF] hover:underline"
                  >
                    View a sample report
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <Reveal className="mb-10">
            <SectionHeading title="Questions about the pilot." />
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {FAQS.map((faq) => (
              <Reveal key={faq.q}>
                <div className="rounded-[16px] border border-white/[0.09] bg-[#0B0F18] px-6 py-5">
                  <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                    {faq.q}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-[1.65] text-white/[0.55]">{faq.a}</p>
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
