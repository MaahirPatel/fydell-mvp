import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Heart,
  Lightbulb,
  Play,
  Rocket,
  Scale,
  Sparkles,
  Target,
  Users,
  type LucideIcon
} from "lucide-react";
import MarketingShell from "@/components/layout/MarketingShell";
import FydellMark from "@/components/brand/FydellMark";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import PerformanceSummary from "@/components/company/PerformanceSummary";

export const metadata = {
  title: "Company | Fydell"
};

const MISSION_CARDS: { title: string; body: string }[] = [
  { title: "Better decisions", body: "Give hiring teams real evidence instead of guesswork." },
  { title: "More opportunity", body: "Open doors for talent that resumes overlook." },
  { title: "Stronger outcomes", body: "Build teams that perform from day one." }
];

const VALUE_ITEMS: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "Evidence over intuition",
    body: "We trust what candidates do, not what they claim.",
    icon: BarChart3
  },
  {
    title: "Fairness by design",
    body: "Every candidate gets the same structured chance to show their skills.",
    icon: Scale
  },
  {
    title: "Built for impact",
    body: "We measure success by the outcomes our customers achieve.",
    icon: Rocket
  }
];

const BELIEFS: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "People are more than their resumes",
    body: "Real ability shows up in real work, not a list of past titles.",
    icon: Users
  },
  {
    title: "Fairness drives performance",
    body: "Objective, consistent evaluation surfaces the strongest talent.",
    icon: Scale
  },
  {
    title: "Technology should elevate humanity",
    body: "We build tools that help people show, and grow, their potential.",
    icon: Lightbulb
  }
];

const JOURNEY = [
  {
    n: 1,
    title: "The beginning",
    body: "Fydell was founded on a simple idea: hiring should be based on what people can do."
  },
  {
    n: 2,
    title: "Building the science",
    body: "We built the simulation engine and validation framework that power our platform."
  },
  {
    n: 3,
    title: "Early impact",
    body: "Companies started seeing measurable improvements in quality, diversity, and time to hire."
  },
  {
    n: 4,
    title: "Expanding outcomes",
    body: "We launched new solutions across more roles, teams, and industries."
  },
  {
    n: 5,
    title: "What's next",
    body: "We're continuing to innovate, advancing fairer, smarter, and more human hiring."
  }
];

export default function CompanyPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-[120px] lg:px-12 lg:pt-[150px]">
        <div className="pointer-events-none absolute right-0 top-10 h-[520px] w-[640px] rounded-full bg-[#7c5cff]/12 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">About Fydell</p>
            <h1 className="mt-6 text-[clamp(2.8rem,4.8vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.055em] text-white">
              Building a <span className="text-gradient">fairer</span> way to hire.
            </h1>
            <p className="mt-6 max-w-[540px] text-[18px] leading-[1.65] text-[#9aa4b8]">
              Fydell exists to replace resume theater with real evidence, so companies can make
              stronger decisions and candidates can show what they can truly do.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="#mission"
                className="btn-lift group inline-flex h-12 items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] px-7 text-[15px] font-bold text-white shadow-[0_14px_42px_rgba(124,92,255,0.35)] hover:brightness-110"
              >
                Our mission
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/simulation"
                className="btn-lift inline-flex h-12 items-center gap-2.5 rounded-xl border border-white/[0.14] bg-white/[0.035] px-6 text-[15px] font-bold text-white/88 hover:border-white/25 hover:bg-white/[0.065]"
              >
                <Play className="h-4 w-4" strokeWidth={1.8} />
                See Fydell in action
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <PerformanceSummary />
          </Reveal>
        </div>
      </section>

      {/* Mission / Values / Beliefs */}
      <section id="mission" className="relative scroll-mt-24 px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1320px]">
          <Stagger className="grid gap-5 lg:grid-cols-3" amount={0.1}>
            {/* Our mission */}
            <StaggerItem className="h-full">
              <article className="spotlight-card flex h-full flex-col rounded-[24px] border border-white/[0.09] bg-white/[0.025] p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-[#7c5cff]/14 text-[#c4b5fd]">
                  <Target className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <h2 className="mt-6 text-[22px] font-extrabold tracking-[-0.035em] text-white">Our mission</h2>
                <p className="mt-3 text-[15px] leading-[1.62] text-[#9aa4b8]">
                  To make hiring fairer and smarter by measuring what people can actually do, giving
                  every candidate a real chance to be seen.
                </p>
                <div className="mt-6 space-y-3">
                  {MISSION_CARDS.map((card) => (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"
                    >
                      <h3 className="text-[14px] font-bold text-white">{card.title}</h3>
                      <p className="mt-1 text-[13px] leading-[1.55] text-[#9aa4b8]">{card.body}</p>
                    </div>
                  ))}
                </div>
              </article>
            </StaggerItem>

            {/* Our values */}
            <StaggerItem className="h-full">
              <article className="spotlight-card flex h-full flex-col rounded-[24px] border border-white/[0.09] bg-white/[0.025] p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-[#7c5cff]/14 text-[#c4b5fd]">
                  <Heart className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <h2 className="mt-6 text-[22px] font-extrabold tracking-[-0.035em] text-white">Our values</h2>
                <p className="mt-3 text-[15px] leading-[1.62] text-[#9aa4b8]">
                  The principles behind every simulation we build and every decision we help teams
                  make.
                </p>
                <div className="mt-6 space-y-4">
                  {VALUE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3.5">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#5b8cff]/12 text-[#8ea7ff]">
                          <Icon className="h-4 w-4" strokeWidth={1.7} />
                        </span>
                        <div>
                          <h3 className="text-[14.5px] font-bold text-white">{item.title}</h3>
                          <p className="mt-1 text-[13px] leading-[1.55] text-[#9aa4b8]">{item.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </StaggerItem>

            {/* What we believe */}
            <StaggerItem className="h-full">
              <article className="spotlight-card flex h-full flex-col rounded-[24px] border border-white/[0.09] bg-white/[0.025] p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-[#7c5cff]/14 text-[#c4b5fd]">
                  <Sparkles className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <h2 className="mt-6 text-[22px] font-extrabold tracking-[-0.035em] text-white">What we believe</h2>
                <p className="mt-3 text-[15px] leading-[1.62] text-[#9aa4b8]">
                  Convictions that guide how we think about talent, fairness, and the future of work.
                </p>
                <div className="mt-6 space-y-4">
                  {BELIEFS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex gap-3.5">
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#9b5cff]/12 text-[#c4b5fd]">
                          <Icon className="h-4 w-4" strokeWidth={1.7} />
                        </span>
                        <div>
                          <h3 className="text-[14.5px] font-bold leading-snug text-white">{item.title}</h3>
                          <p className="mt-1 text-[13px] leading-[1.55] text-[#9aa4b8]">{item.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* Our journey */}
      <section className="relative border-t border-white/[0.07] bg-black/[0.16] px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1320px]">
          <Reveal className="max-w-[680px]">
            <p className="eyebrow">Our journey</p>
            <h2 className="mt-6 text-[clamp(2.4rem,4vw,3.8rem)] font-extrabold leading-[1.0] tracking-[-0.055em] text-white">
              From an idea to a <span className="text-gradient">movement.</span>
            </h2>
          </Reveal>

          <div className="relative mt-14">
            {/* Connecting line */}
            <div className="pointer-events-none absolute left-5 top-5 hidden h-[calc(100%-2.5rem)] w-px bg-gradient-to-b from-[#7c5cff]/60 via-[#5b8cff]/30 to-transparent lg:left-0 lg:top-5 lg:h-px lg:w-full lg:bg-gradient-to-r" />

            <Stagger className="grid gap-8 lg:grid-cols-5 lg:gap-6" amount={0.1}>
              {JOURNEY.map((node) => (
                <StaggerItem key={node.n}>
                  <div className="relative flex gap-5 lg:flex-col lg:gap-0">
                    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#7c5cff]/45 bg-[#0a0f1f] text-[15px] font-extrabold text-[#c4b5fd] shadow-[0_0_24px_rgba(124,92,255,0.35)]">
                      {node.n}
                    </span>
                    <div className="lg:mt-6">
                      <h3 className="text-[16px] font-bold tracking-[-0.02em] text-white">{node.title}</h3>
                      <p className="mt-2 text-[13.5px] leading-[1.6] text-[#9aa4b8]">{node.body}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative px-6 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1320px]">
          <Reveal>
            <div className="glass-card relative overflow-hidden rounded-[28px] p-9 lg:p-14">
              <div className="grid items-center gap-10 lg:grid-cols-[1.5fr_0.8fr]">
                <div>
                  <h2 className="text-[clamp(2rem,3.4vw,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.05em] text-white">
                    We&apos;re building the future of hiring.
                  </h2>
                  <p className="mt-5 max-w-[560px] text-[17px] leading-[1.65] text-[#9aa4b8]">
                    Join a mission-driven team that&apos;s reimagining how the world discovers and
                    grows talent.
                  </p>
                  <Link
                    href="/signup"
                    className="btn-lift group mt-8 inline-flex h-12 items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] px-7 text-[15px] font-bold text-white shadow-[0_14px_42px_rgba(124,92,255,0.35)] hover:brightness-110"
                  >
                    Explore careers
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
                <div className="relative flex items-center justify-center">
                  <div className="pointer-events-none absolute h-52 w-52 rounded-full bg-[#7c5cff]/25 blur-3xl" />
                  <FydellMark width={140} className="relative" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}
