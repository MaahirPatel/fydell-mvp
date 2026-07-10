import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, SectionHeading } from "@/components/marketing/ui";
import WorkroomMockup from "@/components/marketing/WorkroomMockup";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "How It Works | Fydell",
  description:
    "Invite candidates, they complete the FP&A workroom, you get an evidence report. Three steps. No training required for your team.",
};

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mkt-section pt-[100px] lg:pt-[136px]">
        <Container>
          <Reveal className="max-w-[600px]">
            <h1
              className="text-white"
              style={{ letterSpacing: "-0.04em" }}
            >
              Invite. Workroom. Report.
            </h1>
            <p className="mt-6 max-w-[480px] text-[18px] leading-[1.65] text-white/[0.66]">
              Three steps. No training required for your team.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/request-pilot" variant="primary">
                Request a pilot
              </ButtonLink>
              <ButtonLink href="/sample-report" variant="secondary">
                View sample report
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Step 1: Invite ───────────────────────────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <div className="grid items-start gap-16 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
            <Reveal>
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/[0.38]">
                Step 1
              </p>
              <h2
                className="text-white"
                style={{ letterSpacing: "-0.04em" }}
              >
                Invite.
              </h2>
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-[16px] font-semibold text-white">
                    No candidate account needed
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.65] text-white/[0.66]">
                    Each candidate receives a private workroom link. They click it and start —
                    no registration, no login, no app download. You control who gets invited
                    through your existing hiring process.
                  </p>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-white">
                    Configured for your FP&A role
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.65] text-white/[0.66]">
                    Tell us the level and focus of the role. Fydell configures the workroom to
                    match — the brief complexity, data room depth, and scenario framing are
                    aligned to what your candidate would actually do on the job.
                  </p>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-white">
                    Asynchronous — their schedule, your window
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.65] text-white/[0.66]">
                    You set a completion window — typically 48 to 72 hours. Candidates complete
                    the workroom when they are ready. No scheduling, no coordination required
                    from your team.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#080B12]">
                <div className="border-b border-white/[0.07] px-6 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
                    Candidate invite
                  </p>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <p className="text-[11px] text-white/[0.38] mb-1">Role</p>
                    <p className="text-[14px] font-medium text-white">Senior FP&A Analyst</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/[0.38] mb-1">Workroom</p>
                    <p className="text-[14px] font-medium text-white">Project Meridian</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/[0.38] mb-1">Completion window</p>
                    <p className="text-[14px] font-medium text-white">48 hours</p>
                  </div>
                  <div className="rounded-[10px] border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                    <p className="text-[11px] text-white/[0.42] mb-1">Private link</p>
                    <p className="text-[12px] font-mono text-[#3B5BFF] break-all">
                      fydell.com/c/pm-a7x9k2…
                    </p>
                  </div>
                  <p className="text-[11px] text-white/[0.30]">
                    Link is single-use and expires after the window closes.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── Step 2: Workroom ─────────────────────────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <Reveal className="mb-12">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/[0.38]">
              Step 2
            </p>
            <SectionHeading
              title="Workroom."
              subtitle="The candidate works through a structured FP&A scenario — a brief, a data room, a forecast model, a manager update, and a final memo. Every decision is captured."
            />
          </Reveal>

          <Reveal delay={0.08}>
            <WorkroomMockup />
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Brief + data room",
                  desc: "Business context, stakeholder ask, and the financial materials the candidate needs.",
                },
                {
                  label: "Forecast model",
                  desc: "Build, extend, or review a financial model with realistic inputs and embedded ambiguities.",
                },
                {
                  label: "Manager update",
                  desc: "A mid-session data drop that changes the picture. Does the candidate adapt?",
                },
                {
                  label: "Written memo",
                  desc: "An executive recommendation to a CFO-level stakeholder, with rationale.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[14px] border border-white/[0.07] bg-white/[0.025] px-5 py-4"
                >
                  <p className="text-[14px] font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-[13px] leading-[1.6] text-white/[0.55]">{item.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Step 3: Report ───────────────────────────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <Reveal className="mb-12">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/[0.38]">
              Step 3
            </p>
            <SectionHeading
              title="Report."
              subtitle="Within 24 hours of submission, your hiring team receives a structured evidence report. No calibration required — the decision is stated, with confidence level and reasoning."
            />
          </Reveal>

          <Reveal delay={0.08}>
            <EvidenceReportMockup />
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {[
                {
                  label: "Advance / Hold / Review",
                  desc: "A clear decision recommendation, not a raw score.",
                },
                {
                  label: "Assumptions and risks",
                  desc: "What the candidate changed, what they flagged, and what they missed.",
                },
                {
                  label: "Interview questions",
                  desc: "Three to five targeted questions to probe the gaps the workroom found.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[14px] border border-white/[0.07] bg-white/[0.025] px-5 py-4"
                >
                  <p className="text-[14px] font-semibold text-white">{item.label}</p>
                  <p className="mt-2 text-[13px] leading-[1.6] text-white/[0.55]">{item.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <Reveal className="mb-10">
            <SectionHeading title="Common questions." />
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              {
                q: "Does this replace the technical interview?",
                a: "It replaces the screening round and gives you targeted questions for the interview that follows. Many teams run fewer interviews because the report resolves most uncertainty upfront.",
              },
              {
                q: "How long does the workroom take candidates?",
                a: "The session is time-limited. We capture time-in-workroom and stage progression as evidence signals — not just the final output.",
              },
              {
                q: "Do candidates need to install anything?",
                a: "No. The workroom runs in the browser. They need a spreadsheet tool for the modeling section, which they already have.",
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
                a: "The current pilot is FP&A only — for financial modeling, forecasting, and analysis roles. Adjacent finance roles are in development.",
              },
            ].map((faq) => (
              <Reveal key={faq.q}>
                <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.025] px-6 py-5">
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

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <FinalCTA />
    </MarketingShell>
  );
}
