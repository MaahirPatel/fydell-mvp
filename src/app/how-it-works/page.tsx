import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, SectionHeading } from "@/components/marketing/ui";
import FydellAurora, { FydellGrid } from "@/components/marketing/FydellAurora";
import WorkroomMockup from "@/components/marketing/WorkroomMockup";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Fydell",
  description:
    "Invite candidates, they complete the FP&A workroom, you get an evidence report. Three steps. No training required for your team.",
};

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <section className="relative mkt-section overflow-hidden pt-[100px] lg:pt-[136px]">
        <FydellGrid />
        <Container className="relative z-10">
          <Reveal className="max-w-[640px]">
            <h1 className="text-white" style={{ letterSpacing: "-0.04em" }}>
              Invite. Workroom. Report.
            </h1>
            <p className="mt-6 max-w-[480px] text-[18px] leading-[1.65] text-white/[0.66]">
              Three steps. No training required for your team.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
            <Reveal>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/[0.38]">
                Step 1
              </p>
              <h2 className="text-white" style={{ letterSpacing: "-0.04em" }}>
                Invite.
              </h2>
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-[16px] font-semibold text-white">No candidate account needed</h3>
                  <p className="mt-2 text-[15px] leading-[1.65] text-white/[0.66]">
                    Each candidate receives a private workroom link. They click it and start — no
                    registration, no login, no app download.
                  </p>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-white">Configured for your FP&A role</h3>
                  <p className="mt-2 text-[15px] leading-[1.65] text-white/[0.66]">
                    Tell us the level and focus of the role. Fydell configures the workroom to match
                    what your candidate would actually do on the job.
                  </p>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-white">
                    Asynchronous — their schedule, your window
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.65] text-white/[0.66]">
                    You set a completion window — typically 48 to 72 hours. Candidates complete the
                    workroom when they are ready.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="fydell-product-frame overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
                    Candidate Invite
                  </p>
                  <span className="rounded-full border border-[#36D68A]/[0.24] bg-[#36D68A]/[0.10] px-2.5 py-0.5 text-[11px] font-semibold text-[#6EE7B7]">
                    Report Ready
                  </span>
                </div>
                <div className="space-y-4 px-6 py-5">
                  <div>
                    <p className="mb-1 text-[11px] text-white/[0.38]">Role</p>
                    <p className="text-[14px] font-medium text-white">Senior FP&A Analyst</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] text-white/[0.38]">Workroom</p>
                    <p className="text-[14px] font-medium text-white">Project Meridian</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] text-white/[0.38]">Completion window</p>
                    <p className="text-[14px] font-medium text-white">48 hours</p>
                  </div>
                  <div className="rounded-[10px] border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <p className="mb-1 text-[11px] text-white/[0.42]">Private link</p>
                    <p className="break-all font-mono text-[12px] text-[#4B6FFF]">
                      fydell.com/c/pm-a7x9k2…
                    </p>
                  </div>
                  <p className="text-[11px] text-white/[0.30]">
                    Access expires after the window closes.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="relative mkt-section border-t border-white/[0.06]">
        <FydellAurora variant="section" className="opacity-40" />
        <Container wide className="relative z-10">
          <Reveal className="mb-12 max-w-[720px]">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/[0.38]">
              Step 2
            </p>
            <SectionHeading
              title="Workroom."
              subtitle="The candidate works through a structured FP&A scenario — brief, data room, forecast model, manager update, and final memo. Every decision is captured."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <div className="max-lg:overflow-x-auto lg:overflow-x-clip rounded-[20px]">
              <div className="min-w-[860px] lg:min-w-0">
                <WorkroomMockup />
              </div>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Brief + data room",
                desc: "Business context, stakeholder ask, and the financial materials the candidate needs.",
              },
              {
                label: "Forecast model",
                desc: "A working model with realistic inputs and embedded ambiguities.",
              },
              {
                label: "Manager update",
                desc: "A mid-session data drop that changes the picture.",
              },
              {
                label: "Written memo",
                desc: "An executive recommendation with rationale.",
              },
            ].map((item) => (
              <Reveal key={item.label}>
                <div className="rounded-[14px] border border-white/[0.09] bg-[#0B0F18] px-5 py-4">
                  <p className="text-[14px] font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-[13px] leading-[1.6] text-white/[0.55]">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="mkt-section border-t border-white/[0.06]">
        <Container wide>
          <Reveal className="mb-12 max-w-[720px]">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/[0.38]">
              Step 3
            </p>
            <SectionHeading
              title="Report."
              subtitle="Within 24 hours of submission, your hiring team receives a structured evidence report — with recommendation, confidence, and follow-up questions."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <div className="max-lg:overflow-x-auto lg:overflow-x-clip rounded-[20px]">
              <div className="min-w-[760px] lg:min-w-0">
                <EvidenceReportMockup />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <Reveal className="mb-10">
            <SectionHeading title="Common questions." />
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                q: "Does this replace the technical interview?",
                a: "It replaces the screening round and gives you targeted questions for the interview that follows.",
              },
              {
                q: "How long does the workroom take candidates?",
                a: "The session is time-limited. We capture time-in-workroom and stage progression as evidence signals.",
              },
              {
                q: "Do candidates need to install anything?",
                a: "No. The workroom runs in the browser. They need a spreadsheet tool for the modeling section.",
              },
              {
                q: "Can I use my own scenario?",
                a: "The pilot uses Project Meridian, configured to your role level. Custom scenarios are available after the pilot.",
              },
              {
                q: "What if a candidate drops out partway through?",
                a: "Partial completions are not billed. You only pay for candidates who submit a completed workroom.",
              },
              {
                q: "Is this FP&A only?",
                a: "The current pilot is FP&A only — for financial modeling, forecasting, and analysis roles.",
              },
            ].map((faq) => (
              <Reveal key={faq.q}>
                <div className="rounded-[16px] border border-white/[0.09] bg-[#0B0F18] px-6 py-5">
                  <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-white">{faq.q}</h3>
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
