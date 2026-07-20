import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Project Relay · Fydell",
  description:
    "Project Relay is a 50-minute simulated deployment session at a synthetic logistics company: messy hand-kept data, a stakeholder conflict, a mid-session curveball, and one immutable submission.",
};

const STAGES = [
  {
    title: "Consent + the ask",
    body: "The FDE sees exactly what's recorded, then gets Northbeam's real ask, verbatim: \u201CWe need better visibility into shipment delays.\u201D No spec, no ticket, no acceptance criteria.",
  },
  {
    title: "50-minute session",
    body: "Three CSVs, a working repo, an allowlisted terminal, and a live #northbeam-ops chat with an ops manager and a VP who want two different things.",
  },
  {
    title: "Mid-session curveball",
    body: "The board meeting gets pulled forward a day, mid-thread, with no warning. Whatever scope was planned has to be renegotiated on the clock.",
  },
  {
    title: "One immutable submission",
    body: "The ship gate asks what was built, how it was verified, and what's still unverified. Then the workspace freezes — evidence only comes from that frozen snapshot.",
  },
];

const WORKED_EXAMPLE = [
  {
    title: "The data doesn't agree with itself",
    body: "shipments.csv comes from the TMS. delays_manual_tracking.csv is hand-kept by ops and was never validated against it — 3 rows use a different ID format and vanish under a naive join, understating the late rate by 5 points.",
  },
  {
    title: "The stakeholders don't agree either",
    body: "Dana (ops manager) wants a dashboard to check every morning. Priya (VP of Operations) wants a root-cause report defensible to the board. Neither one resolves it for the candidate.",
  },
  {
    title: "A carrier's own number is wrong",
    body: "carriers.csv includes each carrier's self-reported on-time rate. Compute the real rate from shipments.csv and at least one carrier's claim is off by a wide margin — a fact to verify, not cite.",
  },
];

export default function SimulationPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Project Relay: the simulation behind every mission."
        description="A 50-minute deployment session at Northbeam Logistics, a synthetic freight brokerage — messy data, a stakeholder conflict, and one immutable submission. Not a quiz, not LeetCode."
      />

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <div className="grid gap-0 border-t border-[var(--border-subtle)] sm:grid-cols-2 lg:grid-cols-4">
            {STAGES.map((stage, i) => (
              <Reveal key={stage.title} delay={0.03 * i}>
                <div className="border-b border-[var(--border-subtle)] py-6 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
                  <p className="text-[12px] text-[rgba(244,245,247,0.4)]">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-2 text-[15px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                    {stage.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                    {stage.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal className="max-w-[640px]">
            <h2 className="section-heading flat-type">Northbeam Logistics, worked.</h2>
            <p className="section-desc mt-5">
              Every candidate runs the same synthetic scenario. Here&apos;s what&apos;s actually in it.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8 lg:gap-12">
            {WORKED_EXAMPLE.map((item) => (
              <Reveal key={item.title} delay={0.03}>
                <h3
                  className="text-[15px] text-[#F4F5F7]"
                  style={{ fontWeight: 560, letterSpacing: "-0.015em" }}
                >
                  {item.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal className="max-w-[640px]">
            <h2 className="section-heading flat-type">What the evidence is — and isn&apos;t.</h2>
            <p className="section-desc mt-5">
              Evidence findings are generated by simple rules over the recorded event timeline: did
              they run tests, did they iterate on files, did they message the customer, did they
              respond after the curveball. Every finding lists its confidence and its limitations —
              we don&apos;t pretend a rule-based read is a certified skills assessment.
            </p>
          </Reveal>
          <Reveal delay={0.06} className="mt-8">
            <ButtonLink href="/trust">Read our trust page</ButtonLink>
          </Reveal>
        </Container>
      </section>

      <FinalCTA />
    </MarketingShell>
  );
}
