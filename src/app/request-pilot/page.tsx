import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/marketing/ui";
import { Mail } from "lucide-react";

export const metadata = {
  title: "Fydell",
  description:
    "Run a pilot with one FP&A role. $10 per completed report, no setup fee, founder-managed.",
};

const PILOT_DETAILS = [
  { label: "Cost", value: "$10 per completed report" },
  { label: "Setup fee", value: "None" },
  { label: "Contract required", value: "No" },
  { label: "Typical turnaround", value: "Reports ready within 24 hours" },
  { label: "Managed by", value: "Fydell founder directly" },
  { label: "Minimum candidates", value: "1" },
];

const SETUP_STEPS = [
  { n: "1", title: "Role configured", body: "We align Project Meridian to your FP&A level and focus." },
  { n: "2", title: "Private links generated", body: "You receive single-use candidate invite links." },
  { n: "3", title: "Reports reviewed before delivery", body: "Every evidence report is checked before you see it." },
];

const inputClass =
  "w-full rounded-[12px] border border-white/[0.10] bg-[#080B12] px-4 py-3 text-[14px] text-white placeholder-white/[0.25] outline-none transition-colors focus:border-[#315CFF]/50 focus:bg-[#0B0F18]";

export default function RequestPilotPage() {
  return (
    <MarketingShell>
      <section className="mkt-section pb-24 pt-[100px] lg:pt-[136px]">
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <Reveal>
              <h1 className="text-white" style={{ letterSpacing: "-0.04em" }}>
                Run a pilot with one FP&A role.
              </h1>
              <p className="mt-5 max-w-[480px] text-[17px] leading-[1.65] text-white/[0.66]">
                Tell us what role you are hiring for. We will configure Project Meridian and send
                private candidate links.
              </p>
              <p className="mt-3 max-w-[480px] text-[17px] leading-[1.65] text-white/[0.66]">
                Pilots are founder-managed — you work directly with the Fydell team, not a sales
                process.
              </p>

              <div className="mt-8 overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#080B12]">
                <div className="border-b border-white/[0.07] px-5 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
                    Pilot Details
                  </p>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {PILOT_DETAILS.map((row) => (
                    <div key={row.label} className="flex items-center justify-between px-5 py-3">
                      <span className="text-[13.5px] text-white/[0.55]">{row.label}</span>
                      <span className="text-[13.5px] font-semibold text-white">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0B0F18]">
                <div className="border-b border-white/[0.07] px-5 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
                    Pilot Setup
                  </p>
                </div>
                <div className="space-y-4 px-5 py-5">
                  {SETUP_STEPS.map((step) => (
                    <div key={step.n} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.10] text-[11px] font-semibold text-white/[0.55]">
                        {step.n}
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-white">{step.title}</p>
                        <p className="mt-1 text-[12px] leading-[1.55] text-white/[0.50]">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-white/[0.08] px-4 py-3.5">
                <Mail className="h-4 w-4 shrink-0 text-white/[0.38]" strokeWidth={1.7} />
                <p className="text-[13.5px] text-white/[0.55]">
                  Questions? Email{" "}
                  <a
                    href="mailto:hello@fydell.com"
                    className="font-semibold text-white hover:underline"
                  >
                    hello@fydell.com
                  </a>
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-[20px] border border-white/[0.11] bg-[#080B12] p-6 lg:p-8">
                <p className="mb-6 text-[15px] font-semibold text-white">Tell us about your role</p>

                <form
                  action="mailto:hello@fydell.com?subject=Fydell Pilot Request"
                  method="GET"
                  className="space-y-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-1.5 block text-[12.5px] font-medium text-white/[0.66]"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="Your name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-1.5 block text-[12.5px] font-medium text-white/[0.66]"
                      >
                        Work email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@company.com"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="company"
                      className="mb-1.5 block text-[12.5px] font-medium text-white/[0.66]"
                    >
                      Company
                    </label>
                    <input
                      id="company"
                      name="company"
                      type="text"
                      required
                      placeholder="Company name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="role"
                      className="mb-1.5 block text-[12.5px] font-medium text-white/[0.66]"
                    >
                      Role you are hiring for
                    </label>
                    <input
                      id="role"
                      name="role"
                      type="text"
                      required
                      placeholder="Role title"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="candidates"
                      className="mb-1.5 block text-[12.5px] font-medium text-white/[0.66]"
                    >
                      Approximate number of candidates
                    </label>
                    <input
                      id="candidates"
                      name="candidates"
                      type="text"
                      placeholder="e.g. 5–10"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="note"
                      className="mb-1.5 block text-[12.5px] font-medium text-white/[0.66]"
                    >
                      Anything we should know?{" "}
                      <span className="text-white/[0.30]">(optional)</span>
                    </label>
                    <textarea
                      id="note"
                      name="note"
                      rows={4}
                      placeholder="Timeline, specific focus areas, anything else relevant..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex h-12 w-full items-center justify-center rounded-[11px] bg-[#315CFF] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#4B6FFF]"
                  >
                    Request pilot
                  </button>
                </form>

                <p className="mt-4 text-center text-[12px] text-white/[0.30]">
                  We will reply within one business day to confirm setup details.
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </MarketingShell>
  );
}
