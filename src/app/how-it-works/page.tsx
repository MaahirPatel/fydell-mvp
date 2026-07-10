import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import Link from "next/link";
import { ArrowRight, Send, CheckCircle2, FileText, Layers } from "lucide-react";

export const metadata = {
  title: "How It Works | Fydell",
  description:
    "Invite candidates, they complete the FP&A workroom, you get an evidence memo. Here's how every step works.",
};

const SOLID_CTA =
  "inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#2563FF] px-6 text-[15px] font-semibold text-white shadow-[0_8px_28px_rgba(37,99,255,0.32)] transition-[transform,background] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

const GHOST_CTA =
  "inline-flex h-12 items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-5 text-[15px] font-semibold text-white/88 transition-colors duration-200 ease-out hover:border-white/25 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

const PHASES = [
  {
    phase: "Phase 1",
    title: "Invite",
    icon: Send,
    color: "#2563FF",
    steps: [
      {
        step: "1",
        label: "Tell us about the role",
        desc: "Share the FP&A role title, level, and any specific modeling focus. We configure the workroom to match the complexity of the actual job.",
      },
      {
        step: "2",
        label: "We create a private link",
        desc: "Each candidate gets a unique, private workroom link. They never see each other's results. You invite them through your normal process.",
      },
      {
        step: "3",
        label: "Candidates accept and schedule",
        desc: "The workroom is asynchronous. Candidates can complete it on their own time within a window you define — typically 48–72 hours.",
      },
    ],
  },
  {
    phase: "Phase 2",
    title: "Workroom",
    icon: Layers,
    color: "#7C3DFF",
    steps: [
      {
        step: "4",
        label: "Brief and data room",
        desc: "Candidates receive the business context, a stakeholder ask, and a data room with the financial materials they need — modeled on a real FP&A assignment.",
      },
      {
        step: "5",
        label: "25-minute structured session",
        desc: "They build, extend, or review the model; document assumptions; respond to a mid-session data update; and write an executive recommendation.",
      },
      {
        step: "6",
        label: "Behavioral data captured throughout",
        desc: "Every key decision is logged: what they built, what they changed, what they ignored, how they used AI tools. Not just the final output.",
      },
    ],
  },
  {
    phase: "Phase 3",
    title: "Report",
    icon: FileText,
    color: "#2563FF",
    steps: [
      {
        step: "7",
        label: "Evidence memo generated",
        desc: "Within 24 hours of submission, you receive a structured evidence memo: decision, confidence level, signal scores, timeline, and follow-up interview questions.",
      },
      {
        step: "8",
        label: "Your hiring panel reviews",
        desc: "The memo is designed to be read in five minutes. No interpretation guide needed. Your panel can align on a decision before the first interview.",
      },
      {
        step: "9",
        label: "Calibrated interview if needed",
        desc: "The memo includes suggested interview questions targeted at the gaps or ambiguities it found — so your live interview adds signal rather than repeating screening.",
      },
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      {/* Glows */}
      <div className="pointer-events-none fixed left-[8%] top-[15%] h-[360px] w-[480px] rounded-full bg-[#2563FF]/10 blur-[150px]" />
      <div className="pointer-events-none fixed right-[5%] bottom-[20%] h-[320px] w-[440px] rounded-full bg-[#7C3DFF]/10 blur-[150px]" />

      {/* Hero */}
      <section className="relative overflow-hidden pt-[120px] pb-16 lg:pt-[148px] lg:pb-20">
        <div className="relative mx-auto max-w-[1240px] px-6 sm:px-8">
          <Reveal className="max-w-[640px]">
            <p className="eyebrow">How it works</p>
            <h1
              className="mt-6 text-white"
              style={{
                fontSize: "clamp(2.8rem,4.8vw,4.6rem)",
                lineHeight: 1.0,
                letterSpacing: "-0.04em",
                fontWeight: 800,
              }}
            >
              Invite. Workroom.{" "}
              <span className="text-[#2563FF]">Report.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-[18px] leading-[1.65] text-[#A7B0C0]">
              Three phases. No training required for your team. Candidates complete the workroom
              on their own schedule and you get a structured evidence memo the next day.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link href="/request-pilot" className={SOLID_CTA}>
                Request a pilot
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </Link>
              <Link href="/sample-report" className={GHOST_CTA}>
                View sample report
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Phase steps */}
      {PHASES.map((phase, pi) => {
        const PhaseIcon = phase.icon;
        return (
          <section key={phase.phase} className="relative py-16 lg:py-20">
            <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
              <Reveal className="mb-10 flex items-center gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${phase.color}18`, border: `1px solid ${phase.color}28` }}
                >
                  <PhaseIcon className="h-5 w-5" style={{ color: phase.color }} strokeWidth={1.7} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: phase.color }}>
                    {phase.phase}
                  </p>
                  <h2
                    className="text-white"
                    style={{ fontSize: "clamp(1.6rem,2.4vw,2.2rem)", lineHeight: 1.1, letterSpacing: "-0.04em", fontWeight: 800 }}
                  >
                    {phase.title}
                  </h2>
                </div>
              </Reveal>

              <Stagger className="grid gap-5 sm:grid-cols-3">
                {phase.steps.map((s) => (
                  <StaggerItem key={s.step}>
                    <div className="flex h-full flex-col rounded-[18px] border border-white/[0.08] bg-white/[0.025] p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold"
                          style={{
                            background: `${phase.color}18`,
                            border: `1px solid ${phase.color}25`,
                            color: phase.color,
                          }}
                        >
                          {s.step}
                        </span>
                        <h3 className="text-[14.5px] font-bold tracking-[-0.02em] text-white">{s.label}</h3>
                      </div>
                      <p className="text-[13.5px] leading-[1.6] text-[#A7B0C0]">{s.desc}</p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>
        );
      })}

      {/* FAQ */}
      <section className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
          <Reveal className="mb-10 max-w-[480px]">
            <p className="eyebrow">Common questions</p>
            <h2
              className="mt-5 text-white"
              style={{ fontSize: "clamp(2rem,3vw,2.8rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              Before you ask.
            </h2>
          </Reveal>

          <Stagger className="grid gap-5 sm:grid-cols-2">
            {[
              {
                q: "Does this replace the technical interview?",
                a: "Not necessarily. It replaces the screening round and gives you targeted questions for the interview that follows. Many teams run fewer interviews overall because the memo resolves most of the uncertainty upfront.",
              },
              {
                q: "How long does the workroom take?",
                a: "The session is timed at 25 minutes. We capture time-in-workroom and stage progression as signals in the evidence memo.",
              },
              {
                q: "Do candidates need to install anything?",
                a: "No. The workroom runs in the browser. They need a spreadsheet tool (Excel or Google Sheets) for the modeling portion, which they already have.",
              },
              {
                q: "Can I use my own scenario?",
                a: "In the pilot phase, Fydell provides the scenario (Project Meridian) configured to the level and focus you specify. Custom scenarios are available once the pilot is complete.",
              },
              {
                q: "What if a candidate drops out partway through?",
                a: "Partial completions are not billed. You only pay for candidates who submit a completed workroom.",
              },
              {
                q: "Is this FP&A only?",
                a: "The current pilot is FP&A only — specifically for financial modeling, forecasting, and analysis roles. Adjacent finance roles are in development.",
              },
            ].map((faq) => (
              <StaggerItem key={faq.q}>
                <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.025] p-6">
                  <h3 className="text-[14.5px] font-bold tracking-[-0.02em] text-white">{faq.q}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-[1.6] text-[#A7B0C0]">{faq.a}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 lg:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563FF]/8 blur-[110px]" />
        <div className="relative mx-auto max-w-[680px] px-6 text-center sm:px-8">
          <Reveal>
            <h2
              className="text-white"
              style={{ fontSize: "clamp(2.2rem,3.8vw,3.4rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              Ready to run your first workroom?
            </h2>
            <p className="mx-auto mt-5 max-w-[460px] text-[17px] leading-[1.65] text-[#A7B0C0]">
              It takes five minutes to set up. Your first evidence memo arrives within 24 hours
              of each candidate completing the workroom.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              <Link href="/request-pilot" className={SOLID_CTA}>
                Request a pilot
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </Link>
              <Link href="/pricing" className={GHOST_CTA}>
                See pricing
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}
