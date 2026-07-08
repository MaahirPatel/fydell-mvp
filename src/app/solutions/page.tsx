import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  MessagesSquare,
  Play,
  Settings,
  Target,
  Users,
  Zap
} from "lucide-react";
import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import SolutionOverviewCard from "@/components/solutions/SolutionOverviewCard";

export const metadata = {
  title: "Solutions - Fydell",
  description:
    "From recruiting to final-round evaluation, Fydell helps modern hiring teams replace guesswork with real evidence."
};

const AUDIENCES = [
  {
    icon: Users,
    title: "Recruiting Teams",
    body: "Screen faster and surface the strongest candidates with evidence-backed insights."
  },
  {
    icon: BriefcaseBusiness,
    title: "Hiring Managers",
    body: "Evaluate real-world potential, not resumes or interview impressions."
  },
  {
    icon: BarChart3,
    title: "Talent Leaders",
    body: "Build consistent, scalable processes that improve quality of hire across the org."
  },
  {
    icon: MessagesSquare,
    title: "Interview Panels",
    body: "Align around objective data to make fairer, more confident decisions."
  },
  {
    icon: Settings,
    title: "Functional Operators",
    body: "Operationalize simulations and data to keep hiring processes efficient."
  }
] as const;

const PILLARS = [
  {
    icon: Target,
    title: "Structured simulations",
    body: "Role-specific simulations reveal how candidates think, decide, and perform in realistic scenarios."
  },
  {
    icon: BarChart3,
    title: "Objective scoring",
    body: "AI-powered scoring removes bias and provides consistent, explainable evaluation across every candidate."
  },
  {
    icon: Zap,
    title: "Faster decision-making",
    body: "Automate evaluation and reporting so teams can move quickly without compromising on quality."
  }
] as const;

export default function SolutionsPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden pt-[120px] pb-16 lg:pt-[150px] lg:pb-24">
        <div className="pointer-events-none absolute left-[4%] top-[14%] h-[420px] w-[540px] rounded-full bg-[#2563eb]/18 blur-[130px]" />
        <div className="pointer-events-none absolute right-[-8%] top-[6%] h-[540px] w-[720px] rounded-full bg-[#7c5cff]/20 blur-[150px]" />

        <div className="mx-auto max-w-[1536px] px-6 lg:px-12">
          <div className="grid items-center gap-12 lg:grid-cols-[0.86fr_1.14fr] xl:gap-16">
            <Reveal className="relative z-10 max-w-[620px]">
              <p className="eyebrow">Solutions</p>
              <h1 className="mt-6 text-[clamp(2.8rem,5vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-0.055em] text-white">
                Solutions for <span className="text-gradient">modern hiring teams.</span>
              </h1>
              <p className="mt-6 max-w-[540px] text-[19px] leading-[1.6] text-[#9aa4b8]">
                From recruiting to final-round evaluation, Fydell helps teams replace guesswork with
                real evidence.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="btn-lift group inline-flex h-[52px] items-center gap-3 rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] px-7 text-[16px] font-bold text-white shadow-[0_18px_54px_rgba(124,92,255,0.48)] hover:brightness-110"
                >
                  Book a demo
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/simulation"
                  className="btn-lift inline-flex h-[52px] items-center gap-3 rounded-xl border border-white/[0.14] bg-white/[0.035] px-6 text-[15px] font-bold text-white/88 backdrop-blur-sm hover:border-white/25 hover:bg-white/[0.065]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.16] bg-white/[0.06]">
                    <Play className="h-3.5 w-3.5 fill-white text-white" />
                  </span>
                  Explore simulations
                </Link>
              </div>
            </Reveal>

            <Reveal className="relative" delay={0.15} y={36}>
              <div
                className="pointer-events-none absolute -inset-10 rounded-[34px] opacity-80 blur-2xl"
                style={{
                  background:
                    "radial-gradient(ellipse at 55% 45%, rgba(124,92,255,0.2), transparent 62%), radial-gradient(ellipse at 12% 55%, rgba(91,140,255,0.16), transparent 58%)"
                }}
                aria-hidden
              />
              <SolutionOverviewCard />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Audience cards */}
      <section className="relative overflow-hidden border-t border-white/[0.07] py-20 lg:py-28">
        <div className="mx-auto max-w-[1536px] px-6 lg:px-12">
          <Reveal className="max-w-[680px]">
            <p className="eyebrow">Who it's for</p>
            <h2 className="mt-6 text-[clamp(2.2rem,3.6vw,3.4rem)] font-extrabold leading-[1.0] tracking-[-0.055em] text-white">
              Built for every team that <span className="text-gradient">touches a hire.</span>
            </h2>
          </Reveal>

          <Stagger className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {AUDIENCES.map((card) => {
              const Icon = card.icon;
              return (
                <StaggerItem key={card.title}>
                  <article className="spotlight-card group flex h-full flex-col rounded-[22px] border border-white/[0.09] bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/[0.16]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-[#7c5cff]/14 text-[#c4b5fd]">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <h3 className="mt-6 text-[17px] font-bold tracking-[-0.025em] text-white">
                      {card.title}
                    </h3>
                    <p className="mt-2.5 flex-1 text-[14px] leading-[1.6] text-[#9aa4b8]">
                      {card.body}
                    </p>
                    <span className="mt-5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04] text-white/55 transition duration-300 group-hover:border-[#7c5cff]/40 group-hover:text-white">
                      <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* Built for high-stakes hiring */}
      <section className="relative overflow-hidden border-t border-white/[0.07] bg-black/[0.16] py-20 lg:py-28">
        <div className="mx-auto max-w-[1536px] px-6 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[0.82fr_2.4fr] lg:gap-14">
            <Reveal>
              <h2 className="text-[clamp(2.2rem,3.6vw,3.4rem)] font-extrabold leading-[1.0] tracking-[-0.055em] text-white">
                Built for high-stakes hiring.
              </h2>
              <p className="mt-5 max-w-[420px] text-[17px] leading-[1.62] text-[#9aa4b8]">
                Our platform is purpose-built to help teams make better hiring decisions, at scale.
              </p>
            </Reveal>

            <Stagger className="grid gap-4 md:grid-cols-3">
              {PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <StaggerItem key={pillar.title}>
                    <article className="spotlight-card group h-full rounded-[24px] border border-white/[0.09] bg-white/[0.025] p-7 transition duration-300 hover:-translate-y-1 hover:border-white/[0.16]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-[#7c5cff]/14 text-[#c4b5fd]">
                        <Icon className="h-5 w-5" strokeWidth={1.7} />
                      </div>
                      <h3 className="mt-6 text-[20px] font-bold tracking-[-0.03em] text-white">
                        {pillar.title}
                      </h3>
                      <p className="mt-3 text-[14.5px] leading-[1.62] text-[#9aa4b8]">
                        {pillar.body}
                      </p>
                    </article>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
