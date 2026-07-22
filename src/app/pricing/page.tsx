import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Pricing · Fydell",
  description:
    "Founding pilots are scoped directly with each company. Sessions lost to a technical failure on Fydell's side are never billed.",
};

const INCLUDES = [
  "One mission, configured with your real objective and constraints",
  "Secure invite links for the candidates you choose to include",
  "A full Project Relay simulation session per completed candidate",
  "A founder-reviewed, cited evidence report for every completed session",
  "A structured export you can attach to the candidate's record in your ATS",
  "Founder-led pilot setup — direct access throughout",
];

const TERMS = [
  {
    term: "Mission",
    definition:
      "One configured role/scenario engagement — the simulation set up for one open role.",
  },
  {
    term: "Completion",
    definition:
      "One candidate's valid, submitted session. Completions are the unit pilots are scoped around.",
  },
  {
    term: "Invitation",
    definition:
      "One candidate invite link. Invitations are not billable by themselves — only completed sessions count.",
  },
  {
    term: "Technical failure",
    definition:
      "A session invalidated by Fydell infrastructure (not the candidate's fault). It is never billed and never counts against your pilot's included volume.",
  },
];

const FAQS = [
  {
    q: "How is a founding pilot priced?",
    a: "Founding pilots are scoped directly with each company — the price depends on the role, the number of completed simulations you need, and how much calibration the mission requires. Contact us and we'll put a specific scope in writing before anything starts.",
  },
  {
    q: "What's the unit of billing?",
    a: "Completed simulations. An invitation that's never used costs nothing; a session invalidated by a technical failure on our side costs nothing and doesn't consume included volume.",
  },
  {
    q: "Do you integrate with Greenhouse or Ashby?",
    a: "Not with a live, connected integration today — that's not something we'll claim until it's shipped. What you get now is a structured export built to attach cleanly to the candidate record you already have.",
  },
  {
    q: "What happens if a session fails for technical reasons?",
    a: "You pay $0 for it. A session flagged as a technical failure (not the candidate's fault) is never billed and never counted as a completed simulation.",
  },
  {
    q: "How do I pay?",
    a: "Pilots are invoiced directly. No credit card required upfront.",
  },
  {
    q: "What happens after the pilot?",
    a: "We'll agree ongoing pricing together once you've run a few missions and seen real evidence — no surprise switch to a subscription.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Founding pilots are scoped directly."
        description="Every founding pilot is put in writing with a specific scope: one configured mission, an agreed number of completed simulations, and a reviewed evidence report for each. Nothing is charged for a technical failure on our side."
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
                        fontSize: "clamp(2rem, 3.2vw, 2.75rem)",
                        lineHeight: 1.05,
                        letterSpacing: "-0.04em",
                        fontWeight: 560,
                      }}
                    >
                      Scoped directly. Contact us.
                    </span>
                  </div>
                  <p className="mt-4 max-w-[480px] text-[15px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                    We agree the scope in writing before anything starts: the mission, the number
                    of completed simulations included, and what each report covers. Sessions lost
                    to a technical failure on Fydell&apos;s side are never billed.
                  </p>
                </div>

                <div className="px-6 py-6 sm:px-8">
                  <p
                    className="mb-4 text-[11px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
                    style={{ fontWeight: 500 }}
                  >
                    Every pilot includes
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
                    <ButtonLink href="/request-pilot" variant="primary">
                      Contact us about a pilot
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
                    title: "Why scope directly?",
                    body: "You're paying for completed missions and reviewed evidence reports — not seats, not a candidate headcount, not a platform subscription. Until we've run several pilots, honest scoping beats a price grid.",
                  },
                  {
                    title: "Founder-led",
                    body: "During the pilot, we help configure the mission and are directly reachable throughout.",
                  },
                  {
                    title: "Technical failures are on us",
                    body: "If a session breaks for reasons outside the candidate's control, it's flagged as a technical failure, never billed, and never counts against included volume.",
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
            <h2 className="section-heading flat-type">What the words mean.</h2>
            <p className="mt-4 text-[14px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
              Pilot scopes use these four terms, defined the same way in every agreement.
            </p>
          </Reveal>
          <div className="mt-12 border-t border-[var(--border-subtle)]">
            {TERMS.map((t, i) => (
              <Reveal key={t.term} delay={0.02 * i}>
                <div className="grid gap-3 border-b border-[var(--border-subtle)] py-5 sm:grid-cols-[0.9fr_1.4fr] sm:gap-8">
                  <h3 className="text-[15px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                    {t.term}
                  </h3>
                  <p className="text-[14px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                    {t.definition}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
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
