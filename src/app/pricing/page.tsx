import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import Link from "next/link";
import { ArrowRight, CheckCircle2, HelpCircle } from "lucide-react";

export const metadata = {
  title: "Pricing | Fydell — $10 per completed report",
  description:
    "Run one FP&A pilot. $10 per completed report. No setup fee, no contract, no platform training required. Founder-managed from day one.",
};

const SOLID_CTA =
  "inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#2563FF] px-6 text-[15px] font-semibold text-white shadow-[0_8px_28px_rgba(37,99,255,0.32)] transition-[transform,background] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

const GHOST_CTA =
  "inline-flex h-12 items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-5 text-[15px] font-semibold text-white/88 transition-colors duration-200 ease-out hover:border-white/25 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

const PILOT_INCLUDES = [
  "Workroom configured to your FP&A role and level",
  "Private candidate invite links — no limit per pilot",
  "Evidence memo per completed workroom (24-hour turnaround)",
  "Advance / Hold / Reject recommendation with confidence level",
  "Six signal scores with behavioral citations",
  "Suggested interview questions per candidate",
  "Direct access to Fydell founder throughout",
  "No setup fee, no contract, cancel any time",
];

const FAQS = [
  {
    q: "What does $10 per report actually include?",
    a: "Everything: workroom configuration, candidate invite links, evidence memo generation, signal scoring, and the interview questions. You pay only for candidates who submit a completed workroom.",
  },
  {
    q: "Is there a minimum spend or minimum number of candidates?",
    a: "No minimum. You can run a single candidate for $10 to see how the memo looks before scaling to a full cohort.",
  },
  {
    q: "How do I pay?",
    a: "Pilots are invoiced at the end of the cohort. We'll send a simple invoice for the number of completed reports. No credit card required upfront.",
  },
  {
    q: "What happens after the pilot?",
    a: "If you want to run more roles or larger cohorts, we'll set that up directly. Pricing stays flat per report — no platform fees, no per-seat pricing.",
  },
  {
    q: "Can I use Fydell for multiple roles at once?",
    a: "The pilot covers one FP&A role. Once the pilot is complete and you've seen the signal quality, we can run multiple roles in parallel.",
  },
  {
    q: "What if a candidate drops out or doesn't complete the workroom?",
    a: "You're only billed for completed submissions. Partial completions and no-shows are not charged.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      {/* Glows */}
      <div className="pointer-events-none fixed left-1/4 top-[20%] h-[400px] w-[500px] rounded-full bg-[#2563FF]/10 blur-[160px]" />
      <div className="pointer-events-none fixed right-[10%] bottom-[25%] h-[340px] w-[440px] rounded-full bg-[#7C3DFF]/10 blur-[150px]" />

      {/* Hero */}
      <section className="relative overflow-hidden pt-[120px] pb-16 lg:pt-[148px] lg:pb-20">
        <div className="relative mx-auto max-w-[1240px] px-6 sm:px-8">
          <Reveal className="max-w-[640px]">
            <p className="eyebrow">Pricing</p>
            <h1
              className="mt-6 text-white"
              style={{
                fontSize: "clamp(2.8rem,4.8vw,4.6rem)",
                lineHeight: 1.0,
                letterSpacing: "-0.04em",
                fontWeight: 800,
              }}
            >
              $10 per completed report.{" "}
              <span className="text-[#2563FF]">That's it.</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-[18px] leading-[1.65] text-[#A7B0C0]">
              No setup fee. No platform subscription. No contract. You pay for evidence memos on
              candidates who complete the workroom — nothing else.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Pricing card */}
      <section className="relative py-8 lg:py-12">
        <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
          <Reveal>
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
              {/* Main card */}
              <div className="overflow-hidden rounded-[24px] border border-[#2563FF]/25 bg-[#080C16] shadow-[0_24px_80px_rgba(37,99,255,0.12)]">
                <div className="border-b border-white/[0.08] px-8 py-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[#6F7A8C]">FP&A Pilot</p>
                      <div className="mt-2 flex items-end gap-2">
                        <span
                          className="text-white"
                          style={{ fontSize: "clamp(3rem,5vw,4rem)", lineHeight: 1, letterSpacing: "-0.04em", fontWeight: 800 }}
                        >
                          $10
                        </span>
                        <span className="mb-2 text-[15px] text-[#A7B0C0]">per completed report</span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#2563FF]/30 bg-[#2563FF]/10 px-3.5 py-1.5 text-[12px] font-semibold text-[#2563FF]">
                      One FP&A role
                    </span>
                  </div>
                  <p className="mt-4 text-[15px] leading-[1.6] text-[#A7B0C0]">
                    One role, as many candidates as you need. Pay per completed workroom. Founder-managed
                    throughout.
                  </p>
                </div>

                <div className="px-8 py-6">
                  <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6F7A8C]">What's included</p>
                  <ul className="space-y-3">
                    {PILOT_INCLUDES.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[14px] text-[#A7B0C0]">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" strokeWidth={2} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Link href="/request-pilot" className={`${SOLID_CTA} w-full justify-center`}>
                      Request a pilot
                      <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.9} />
                    </Link>
                  </div>
                  <p className="mt-4 text-center text-[12px] text-[#6F7A8C]">
                    No credit card required. We invoice after the pilot.
                  </p>
                </div>
              </div>

              {/* Context card */}
              <div className="flex flex-col gap-5">
                <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-6">
                  <p className="text-[13px] font-bold text-white mb-2">Why pay-per-report?</p>
                  <p className="text-[13.5px] leading-[1.65] text-[#A7B0C0]">
                    You shouldn't pay for access to a tool that hasn't proven its value yet. The
                    per-report model means Fydell only earns when a candidate completes the
                    workroom and you receive a usable memo.
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-6">
                  <p className="text-[13px] font-bold text-white mb-2">Founder-led pilot</p>
                  <p className="text-[13.5px] leading-[1.65] text-[#A7B0C0]">
                    During the pilot phase, the Fydell founder configures the workroom, reviews
                    every evidence memo before delivery, and is reachable directly if anything
                    needs adjustment.
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-6">
                  <p className="text-[13px] font-bold text-white mb-2">What happens next?</p>
                  <p className="text-[13.5px] leading-[1.65] text-[#A7B0C0]">
                    After your pilot, if you want to run more roles or scale to a team, we'll
                    set that up directly. Pricing stays at $10 per report — no switching to a
                    platform subscription model.
                  </p>
                  <Link href="/sample-report" className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#2563FF] hover:underline">
                    View sample report
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.7fr_1.6fr] lg:gap-16">
            <Reveal>
              <p className="eyebrow">FAQ</p>
              <h2
                className="mt-5 text-white"
                style={{ fontSize: "clamp(2rem,3vw,2.8rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
              >
                Questions about the pilot.
              </h2>
              <p className="mt-4 text-[15px] leading-[1.6] text-[#A7B0C0]">
                Everything you need to know before getting started.
              </p>
            </Reveal>

            <Stagger className="space-y-4">
              {FAQS.map((faq) => (
                <StaggerItem key={faq.q}>
                  <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.025] p-6">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="h-4 w-4 shrink-0 text-[#6F7A8C] mt-0.5" strokeWidth={1.7} />
                      <div>
                        <h3 className="text-[14.5px] font-bold tracking-[-0.02em] text-white">{faq.q}</h3>
                        <p className="mt-2 text-[13.5px] leading-[1.6] text-[#A7B0C0]">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative py-20 lg:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563FF]/8 blur-[110px]" />
        <div className="relative mx-auto max-w-[680px] px-6 text-center sm:px-8">
          <Reveal>
            <h2
              className="text-white"
              style={{ fontSize: "clamp(2.2rem,3.8vw,3.4rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              Ready to see the signal?
            </h2>
            <p className="mx-auto mt-5 max-w-[440px] text-[17px] leading-[1.65] text-[#A7B0C0]">
              One FP&A role. $10 per completed report. No commitments beyond the pilot.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
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
    </MarketingShell>
  );
}
