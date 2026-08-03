import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";

export const metadata = {
  title: "Request a Pilot · Fydell",
  description:
    "Request a founding Fydell pilot to invite candidates into realistic work simulations for Applied Technical Roles. No payment required to start.",
};

const DETAILS = [
  { label: "To start", value: "No payment required" },
  { label: "Setup fee", value: "None" },
  { label: "Contract", value: "Not required" },
  { label: "Turnaround", value: "Reports within 24 hours" },
  { label: "Managed by", value: "Fydell founder directly" },
  { label: "Minimum candidates", value: "1" },
];

const STEPS = [
  {
    n: "1",
    title: "Simulation configured",
    body: "We help you pick the role and scenario that matches your open position.",
  },
  {
    n: "2",
    title: "Private invites generated",
    body: "You receive single-use invite links for the candidates you want to evaluate.",
  },
  {
    n: "3",
    title: "Evidence reviewed before delivery",
    body: "Every evidence receipt is checked before you see it.",
  },
];

export default function RequestPilotPage() {
  return (
    <MarketingShell>
      <PageHero
        title="Run a pilot on a real Applied Technical Role."
        description="Tell us about the role. We set up your workspace, configure the simulation, and give you a dashboard to invite candidates, all before any billing."
      />

      <section className="pb-20 lg:pb-28">
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-8">
            <Reveal className="lg:col-span-5">
              <div className="border-t border-[#D9DEE7]">
                {DETAILS.map((d) => (
                  <div
                    key={d.label}
                    className="flex items-baseline justify-between gap-4 border-b border-[#D9DEE7] py-3.5"
                  >
                    <span className="text-[13px] text-[#586273]">{d.label}</span>
                    <span
                      className="text-right text-[13px] text-[#0B1020]"
                      style={{ fontWeight: 520 }}
                    >
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-10 space-y-0 border-t border-[#D9DEE7]">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex gap-3 border-b border-[#D9DEE7] py-4">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-[#D9DEE7] text-[11px] text-[#586273]"
                      style={{ fontWeight: 560 }}
                    >
                      {s.n}
                    </span>
                    <div>
                      <p className="text-[14px] text-[#0B1020]" style={{ fontWeight: 560 }}>
                        {s.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-[1.5] text-[#586273]">
                        {s.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-[13px] text-[#586273]">
                Or email{" "}
                <a
                  href="mailto:hello@fydell.com"
                  className="text-[#586273] transition-colors hover:text-[#0B1020]"
                >
                  hello@fydell.com
                </a>
              </p>
            </Reveal>

            <Reveal delay={0.08} className="lg:col-span-6 lg:col-start-7">
              <div className="mkt-panel p-5 sm:p-6">
                <p
                  className="mb-5 text-[13px] text-[#0B1020]"
                  style={{ fontWeight: 560 }}
                >
                  Tell us about your role
                </p>
                <PilotRequestForm />
                <p className="mt-4 text-center text-[12px] text-[#586273]">
                  Submitted securely over HTTPS. We reply within one business day.
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </MarketingShell>
  );
}
