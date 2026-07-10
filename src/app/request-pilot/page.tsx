import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import Link from "next/link";
import { ArrowRight, Mail, Send } from "lucide-react";

export const metadata = {
  title: "Request a Pilot | Fydell",
  description:
    "Run a pilot with one FP&A role. $10 per completed report, no setup fee, founder-managed. Tell us about your role and we'll set everything up.",
};

const SOLID_CTA =
  "inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#2563FF] px-6 text-[15px] font-semibold text-white shadow-[0_8px_28px_rgba(37,99,255,0.32)] transition-[transform,background] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

const PILOT_DETAILS = [
  { label: "Cost", value: "$10 per completed report" },
  { label: "Setup fee", value: "None" },
  { label: "Contract required", value: "No" },
  { label: "Typical turnaround", value: "Reports ready in 24 hours" },
  { label: "Managed by", value: "Fydell founder directly" },
  { label: "Minimum candidates", value: "1" },
];

export default function RequestPilotPage() {
  return (
    <MarketingShell>
      {/* Glows */}
      <div className="pointer-events-none fixed left-[5%] top-[20%] h-[400px] w-[500px] rounded-full bg-[#2563FF]/10 blur-[160px]" />
      <div className="pointer-events-none fixed right-[5%] top-[30%] h-[360px] w-[460px] rounded-full bg-[#7C3DFF]/10 blur-[160px]" />

      <section className="relative overflow-hidden pt-[120px] pb-24">
        <div className="relative mx-auto max-w-[1080px] px-6 sm:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            {/* Left — copy + details */}
            <Reveal>
              <p className="eyebrow">Get started</p>
              <h1
                className="mt-6 text-white"
                style={{
                  fontSize: "clamp(2.6rem,4.2vw,4rem)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.04em",
                  fontWeight: 800,
                }}
              >
                Run a pilot with one FP&A role.
              </h1>
              <p className="mt-5 text-[17px] leading-[1.65] text-[#A7B0C0]">
                Tell us about the role you're hiring for. We'll set up the workroom, send
                candidate invites, and deliver your first evidence memos within 24 hours of each
                completion.
              </p>
              <p className="mt-4 text-[17px] leading-[1.65] text-[#A7B0C0]">
                Pilots are founder-managed — you'll work directly with the Fydell team, not a
                sales rep.
              </p>

              <div className="mt-8 overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.025]">
                <div className="border-b border-white/[0.07] px-5 py-3.5">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6F7A8C]">Pilot details</p>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {PILOT_DETAILS.map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-5 py-3">
                      <span className="text-[13.5px] text-[#A7B0C0]">{row.label}</span>
                      <span className="text-[13.5px] font-semibold text-white">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#2563FF]/15 bg-[#2563FF]/5 px-4 py-3.5">
                <Mail className="h-4 w-4 shrink-0 text-[#2563FF]" strokeWidth={1.7} />
                <p className="text-[13.5px] text-[#A7B0C0]">
                  Questions? Email us at{" "}
                  <a href="mailto:hello@fydell.com" className="font-semibold text-[#2563FF] hover:underline">
                    hello@fydell.com
                  </a>
                </p>
              </div>
            </Reveal>

            {/* Right — form */}
            <Reveal delay={0.1}>
              <div className="rounded-[20px] border border-white/[0.1] bg-[#080C16] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.38)] lg:p-8">
                <p className="mb-6 text-[15px] font-semibold text-white">Tell us about your role</p>

                <form
                  action={`mailto:hello@fydell.com?subject=Fydell Pilot Request`}
                  method="GET"
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="mb-1.5 block text-[12.5px] font-medium text-[#A7B0C0]">
                        Your name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="Alex Chen"
                        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-[#6F7A8C] outline-none transition-colors duration-150 focus:border-[#2563FF]/50 focus:bg-white/[0.06]"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="mb-1.5 block text-[12.5px] font-medium text-[#A7B0C0]">
                        Work email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="alex@company.com"
                        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-[#6F7A8C] outline-none transition-colors duration-150 focus:border-[#2563FF]/50 focus:bg-white/[0.06]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className="mb-1.5 block text-[12.5px] font-medium text-[#A7B0C0]">
                      Company
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      required
                      placeholder="Acme Corp"
                      className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-[#6F7A8C] outline-none transition-colors duration-150 focus:border-[#2563FF]/50 focus:bg-white/[0.06]"
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="mb-1.5 block text-[12.5px] font-medium text-[#A7B0C0]">
                      Role you're hiring for
                    </label>
                    <input
                      id="role"
                      name="role"
                      type="text"
                      required
                      placeholder="Senior FP&A Analyst"
                      className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-[#6F7A8C] outline-none transition-colors duration-150 focus:border-[#2563FF]/50 focus:bg-white/[0.06]"
                    />
                  </div>

                  <div>
                    <label htmlFor="note" className="mb-1.5 block text-[12.5px] font-medium text-[#A7B0C0]">
                      Anything else we should know? <span className="text-[#6F7A8C]">(optional)</span>
                    </label>
                    <textarea
                      id="note"
                      name="note"
                      rows={4}
                      placeholder="Number of candidates, timeline, specific skills you're looking for..."
                      className="w-full resize-none rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-[#6F7A8C] outline-none transition-colors duration-150 focus:border-[#2563FF]/50 focus:bg-white/[0.06]"
                    />
                  </div>

                  <button type="submit" className={SOLID_CTA}>
                    <Send className="h-4 w-4" strokeWidth={1.8} />
                    Send pilot request
                  </button>
                </form>

                <p className="mt-5 text-center text-[12px] text-[#6F7A8C]">
                  We'll reply within one business day to confirm setup details.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
