import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, EditorialHeader } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";
import ProjectRelaySequence from "@/components/marketing/ProjectRelaySequence";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";
import FinalCTA from "@/components/marketing/FinalCTA";
import FydellMark from "@/components/brand/FydellMark";

export const metadata = {
  title: "How It Works · Fydell",
  description:
    "Invite an FDE, they run the Project Relay mission, you get an evidence receipt. Three steps. No training required for your team.",
};

const STEPS: {
  n: string;
  title: string;
  body: string;
  points?: { title: string; body: string }[];
}[] = [
  {
    n: "1.0",
    title: "Invite.",
    body: "You invite one specific FDE by email. They get a private, one-time mission link — no registration, no marketplace noise.",
    points: [
      {
        title: "No candidate account needed to start",
        body: "They click the link, sign in or create an account, and see exactly what's recorded before they consent.",
      },
      {
        title: "Configured for your real mission",
        body: "The objective, customer context, and constraints come from the mission you wrote — not a generic template.",
      },
      {
        title: "One-time link, tracked status",
        body: "You see pending, accepted, or expired for every invite you send from the mission page.",
      },
    ],
  },
  {
    n: "2.0",
    title: "Relay session.",
    body: "The FDE works a real 50-minute deployment mission — a working codebase, an allowlisted terminal, a customer chat, and a mid-session curveball — under realistic constraints.",
  },
  {
    n: "3.0",
    title: "Evidence receipt.",
    body: "Once submitted, files are frozen and rule-based findings are generated from the recorded event timeline — with confidence and stated limitations. You review it and record a decision.",
  },
];

const FAQ = [
  {
    q: "Does this replace the technical interview?",
    a: "It replaces the screening round and gives you targeted questions for the interview that follows.",
  },
  {
    q: "How long does the session take?",
    a: "Project Relay is a 50-minute time-limited session. Time spent and stage progression are captured as evidence.",
  },
  {
    q: "Do candidates need to install anything?",
    a: "No. The session runs real Python in the browser via Pyodide — no local setup required. Chrome or Edge is required today.",
  },
  {
    q: "Can I use my own scenario?",
    a: "The founding pilot uses Project Relay, a fixed deployment scenario. Custom scenarios are on the roadmap after the pilot.",
  },
  {
    q: "What if an FDE drops out?",
    a: "Partial completions are not billed. You only pay for completed submissions, and technical failures are never billed either.",
  },
  {
    q: "Is this only for finance roles?",
    a: "No — Project Relay is a general deployment/triage scenario for evaluating Forward Deployed Engineers, not a finance-specific test.",
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Invite. Relay session. Evidence receipt."
        description="Three steps. No training required for your team."
        narrow
      />

      {/* Step 1 */}
      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-6">
            <Reveal className="lg:col-span-5">
              <p className="text-[13px] text-[rgba(244,245,247,0.4)]" style={{ fontWeight: 500 }}>
                {STEPS[0].n} · Invite
              </p>
              <h2 className="section-heading flat-type mt-3">{STEPS[0].title}</h2>
              <p className="section-desc mt-5">{STEPS[0].body}</p>
              <div className="mt-10 space-y-0 border-t border-[var(--border-subtle)]">
                {STEPS[0].points?.map((p) => (
                  <div key={p.title} className="border-b border-[var(--border-subtle)] py-4">
                    <h3 className="text-[14px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                      {p.body}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.08} className="lg:col-span-6 lg:col-start-7">
              <div className="mkt-panel overflow-hidden">
                <div className="flex h-[50px] items-center justify-between border-b border-[var(--border-subtle)] px-4">
                  <div className="flex items-center gap-2.5">
                    <FydellMark width={18} />
                    <p className="text-[12.5px] text-[#F4F5F7]" style={{ fontWeight: 580 }}>
                      Candidate invite
                    </p>
                  </div>
                  <span className="inline-flex h-6 items-center rounded-full border border-[rgba(103,217,160,0.22)] bg-[rgba(103,217,160,0.10)] px-2.5 text-[11px] text-[#8EE4B8]">
                    Ready
                  </span>
                </div>
                <div className="space-y-4 px-5 py-5">
                  {[
                    ["Mission", "Rebuild the churn triage workflow"],
                    ["Scenario", "Project Relay"],
                    ["Invite expires", "7 days"],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-white/[0.04] pb-3">
                      <p className="text-[11px] text-[rgba(244,245,247,0.4)]">{label}</p>
                      <p className="mt-1 text-[14px] text-[#F4F5F7]" style={{ fontWeight: 520 }}>
                        {value}
                      </p>
                    </div>
                  ))}
                  <div className="rounded-[8px] border border-[var(--border-subtle)] bg-white/[0.02] px-3.5 py-3">
                    <p className="text-[11px] text-[rgba(244,245,247,0.4)]">Private link</p>
                    <p className="mt-1 break-all font-mono text-[12px] text-[#5662FF]">
                      fydell.com/s/8kQ3nR…
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Step 2 */}
      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal>
            <EditorialHeader
              heading="Relay session."
              description={STEPS[1].body}
              stageHref="/simulation"
              stageLabel={`${STEPS[1].n} · Project Relay`}
            />
          </Reveal>
          <Reveal delay={0.08} className="mt-[72px] lg:mt-20">
            <div className="overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.10)] max-md:overflow-x-auto">
              <div className="min-w-[720px] md:min-w-0">
                <ProjectRelaySequence />
              </div>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-0 border-t border-[var(--border-subtle)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Consent + setup", "Every FDE sees exactly what's recorded before they start."],
              ["Working codebase", "A real customer scenario with an allowlisted terminal."],
              ["Mid-session curveball", "Something changes partway through, forcing a real adaptation."],
              ["One frozen submission", "Files are frozen at submit — that's what evidence is generated from."],
            ].map(([title, body]) => (
              <div key={title} className="border-b border-[var(--border-subtle)] py-5 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
                <h3 className="text-[14px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                  {title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Step 3 */}
      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal>
            <EditorialHeader
              heading="Evidence receipt."
              description={STEPS[2].body}
              stageHref="/sample-report"
              stageLabel={`${STEPS[2].n} · Sample report`}
            />
          </Reveal>
          <Reveal delay={0.08} className="mt-[72px] lg:mt-20">
            <div className="overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.10)] max-md:overflow-x-auto">
              <div className="min-w-[720px] md:min-w-0">
                <EvidenceReportMockup />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <Reveal className="max-w-[500px]">
            <h2 className="section-heading flat-type">Common questions.</h2>
          </Reveal>
          <div className="mt-12 border-t border-[var(--border-subtle)]">
            {FAQ.map((faq, i) => (
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
