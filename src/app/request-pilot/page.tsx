import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/marketing/ui";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";
import { Mail } from "lucide-react";

export const metadata = {
  title: "Fydell",
  description:
    "Request a Project Meridian pilot for your FP&A hiring process. No payment required to start — explore the employer dashboard first.",
};

const PILOT_DETAILS = [
  { label: "To start", value: "No payment required" },
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

export default function RequestPilotPage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden pb-24 pt-16 lg:pb-32 lg:pt-20">
        <Container>
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-14">
            <Reveal>
              <div>
                <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/[0.40]">
                  Request a pilot
                </p>
                <h1 className="text-[34px] font-semibold leading-[1.12] tracking-[-0.035em] text-white sm:text-[40px]">
                  Run Project Meridian on a real FP&A hire
                </h1>
                <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/[0.58]">
                  Tell us about the role. We set up your workspace, configure the work trial,
                  and give you a dashboard to invite candidates and review evidence — before
                  any billing.
                </p>

                <ul className="mt-8 space-y-3">
                  {PILOT_DETAILS.map((d) => (
                    <li
                      key={d.label}
                      className="flex items-baseline justify-between gap-4 border-b border-white/[0.06] pb-3 text-[13.5px]"
                    >
                      <span className="text-white/[0.46]">{d.label}</span>
                      <span className="text-right font-medium text-white/[0.88]">{d.value}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10 space-y-5">
                  {SETUP_STEPS.map((s) => (
                    <div key={s.n} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-[12px] font-semibold text-white/[0.70]">
                        {s.n}
                      </span>
                      <div>
                        <p className="text-[14px] font-semibold text-white">{s.title}</p>
                        <p className="mt-0.5 text-[13px] text-white/[0.46]">{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-10 flex items-center gap-2 text-[13px] text-white/[0.40]">
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  Or email{" "}
                  <a
                    href="mailto:hello@fydell.com"
                    className="text-white/[0.66] underline-offset-2 hover:underline"
                  >
                    hello@fydell.com
                  </a>
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-[20px] border border-white/[0.11] bg-[#080B12] p-6 lg:p-8">
                <p className="mb-6 text-[15px] font-semibold text-white">Tell us about your role</p>
                <PilotRequestForm />
                <p className="mt-4 text-center text-[12px] text-white/[0.30]">
                  Submitted securely over HTTPS. We will reply within one business day.
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </MarketingShell>
  );
}
