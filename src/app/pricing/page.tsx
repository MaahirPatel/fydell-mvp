import MarketingShell from "@/components/layout/MarketingShell";
import TrustedBy from "@/components/layout/TrustedBy";
import { Reveal } from "@/components/motion/Reveal";
import PricingCards from "@/components/pricing/PricingCards";
import PricingFaq from "@/components/pricing/PricingFaq";

export const metadata = {
  title: "Pricing | Fydell"
};

export default function PricingPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-[120px] lg:px-12 lg:pt-[150px]">
        <div className="pointer-events-none absolute left-1/2 top-20 h-80 w-[760px] -translate-x-1/2 rounded-full bg-[#7c5cff]/12 blur-3xl" />
        <Reveal className="relative mx-auto max-w-[820px] text-center">
          <p className="eyebrow mx-auto">Pricing</p>
          <h1 className="mt-6 text-[clamp(2.8rem,4.7vw,5.4rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-white">
            Start with a pilot.{" "}
            <span className="text-gradient">Scale when you see signal.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[640px] text-[18px] leading-[1.65] text-[#9aa4b8]">
            Run one cohort, prove signal quality, then expand across roles, departments, and hiring
            teams.
          </p>
        </Reveal>
      </section>

      {/* Pricing cards */}
      <section className="relative px-6 py-16 lg:px-12 lg:py-20">
        <div className="relative mx-auto max-w-[1240px]">
          <PricingCards />
        </div>
      </section>

      <TrustedBy />

      {/* FAQ */}
      <section className="relative px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[0.74fr_1.6fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-6 text-[clamp(2.4rem,3.8vw,3.6rem)] font-extrabold leading-[1.0] tracking-[-0.055em] text-white">
              Questions? <span className="text-gradient">We&apos;ve got answers.</span>
            </h2>
            <p className="mt-5 max-w-[380px] text-[16px] leading-[1.62] text-[#9aa4b8]">
              Everything you need to know about pilots, plans, and how teams scale on Fydell.
            </p>
          </Reveal>

          <Reveal delay={0.05}>
            <PricingFaq />
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}
