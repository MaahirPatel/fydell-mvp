import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Pricing · Fydell",
  description:
    "A founding pilot at $2,500 for your first FDE mission, $300 for every additional mission in the same pilot, and $0 for any session lost to a technical failure.",
};

const INCLUDES = [
  "One mission, configured with your real objective and constraints",
  "Private invite links to your candidate FDEs — no per-seat fee",
  "A full Project Relay simulation session (50 minutes, recorded)",
  "A work receipt with evidence findings for every completed session",
  "Founder-led pilot setup — direct access throughout",
  "Cancel any time — no contract",
];

const FAQS = [
  {
    q: "What does the $2,500 founding pilot cover?",
    a: "Mission setup, unlimited invite links for that mission, one full Project Relay session per invited FDE, and the resulting work receipt with evidence findings.",
  },
  {
    q: "What does the additional $300 cover?",
    a: "Each additional mission you run during the same pilot — same simulation, same evidence pipeline — is $300 flat, no per-candidate fee.",
  },
  {
    q: "What happens if a session fails for technical reasons?",
    a: "You pay $0 for it. A session flagged as a technical failure (not the candidate's fault) is never billed and never counted as a completed mission.",
  },
  {
    q: "How do I pay?",
    a: "Pilots are invoiced directly. No credit card required upfront.",
  },
  {
    q: "What happens after the pilot?",
    a: "We'll talk about ongoing pricing once you've run a few missions and seen real evidence — no surprise switch to a subscription.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Simple, founding-pilot pricing."
        description="One flat price to run your first mission. A small flat price for every mission after that. Nothing charged for a technical failure."
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
                    Founding pilot
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
                      $2,500
                    </span>
                    <span className="mb-1.5 text-[15px] text-[rgba(244,245,247,0.62)]">
                      for your first mission
                    </span>
                  </div>
                  <p className="mt-4 max-w-[480px] text-[15px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                    Then $300 per additional mission during the pilot. $0 for any session lost to a
                    technical failure.
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
                    <ButtonLink href="/signup" variant="primary">
                      Post your first mission
                    </ButtonLink>
                    <TextLink href="/trust">Read our trust page</TextLink>
                  </div>
                  <p className="mt-5 text-[12px] text-[rgba(244,245,247,0.4)]">
                    No credit card required. We invoice directly.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-0 border-t border-[var(--border-subtle)] lg:col-span-4 lg:col-start-9 lg:border-t-0">
                {[
                  {
                    title: "Why a flat mission price?",
                    body: "You're paying for a real mission and a real evidence receipt — not seats, not candidates, not a platform subscription.",
                  },
                  {
                    title: "Founder-led",
                    body: "During the pilot, we help configure the mission and are directly reachable throughout.",
                  },
                  {
                    title: "Technical failures are on us",
                    body: "If a session breaks for reasons outside the FDE's control, it's flagged as a technical failure and never billed.",
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
