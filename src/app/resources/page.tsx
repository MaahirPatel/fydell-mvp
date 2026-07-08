import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  FileText,
  PlayCircle,
  Users
} from "lucide-react";
import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import ResourceSearch from "@/components/resources/ResourceSearch";
import ResourcesBrandPanel from "@/components/resources/ResourcesBrandPanel";
import FeaturedGuideCard from "@/components/resources/FeaturedGuideCard";

export const metadata = {
  title: "Resources - Fydell",
  description:
    "Research, guides, and practical frameworks to help modern hiring teams hire with more confidence and less guesswork."
};

const SECONDARY = [
  {
    label: "Benchmark report",
    title: "2024 Hiring Benchmarks Report",
    body: "Key trends and data from 300+ organizations on skills, quality of hire, and time to productivity.",
    cta: "View report",
    icon: BarChart3
  },
  {
    label: "Customer story",
    title: "Building a skills-first hiring program that scales",
    body: "How a talent team used simulations to improve quality, reduce bias, and scale with confidence.",
    cta: "Read story",
    icon: Users
  }
] as const;

const COLUMNS = [
  {
    icon: BookOpen,
    title: "Guides",
    body: "Step-by-step frameworks and practical playbooks.",
    links: [
      "Designing valid simulations",
      "Reducing bias in hiring",
      "Building a skills taxonomy",
      "View all guides"
    ]
  },
  {
    icon: FileText,
    title: "Blog",
    body: "Research-backed insights on hiring and assessment.",
    links: [
      "Why simulations beat resumes",
      "The case for structured evaluation",
      "Skills-based hiring at scale",
      "View all posts"
    ]
  },
  {
    icon: PlayCircle,
    title: "Webinars",
    body: "Expert sessions on hiring strategy and innovation.",
    links: [
      "What high-validity looks like",
      "Q&A: Skills assessment design",
      "Measuring what matters",
      "View all webinars"
    ]
  },
  {
    icon: BarChart3,
    title: "Reports",
    body: "Data-driven reports and original research.",
    links: [
      "Future of skills report",
      "DEI in skills assessment",
      "Work simulation ROI",
      "View all reports"
    ]
  }
] as const;

export default function ResourcesPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden pt-[120px] pb-16 lg:pt-[150px] lg:pb-20">
        <div className="pointer-events-none absolute left-[4%] top-[14%] h-[420px] w-[540px] rounded-full bg-[#2563eb]/18 blur-[130px]" />
        <div className="pointer-events-none absolute right-[-8%] top-[6%] h-[540px] w-[720px] rounded-full bg-[#7c5cff]/20 blur-[150px]" />

        <div className="mx-auto max-w-[1536px] px-6 lg:px-12">
          <div className="grid items-center gap-12 lg:grid-cols-[1.04fr_0.96fr] xl:gap-16">
            <Reveal className="relative z-10 max-w-[640px]">
              <p className="eyebrow">Resources</p>
              <h1 className="mt-6 text-[clamp(2.8rem,5vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-0.055em] text-white">
                Insights for <span className="text-gradient">modern hiring teams.</span>
              </h1>
              <p className="mt-6 max-w-[540px] text-[19px] leading-[1.6] text-[#9aa4b8]">
                Research, guides, and practical frameworks to help teams hire with more confidence
                and less guesswork.
              </p>
              <div className="mt-8">
                <ResourceSearch />
              </div>
            </Reveal>

            <Reveal className="relative" delay={0.15} y={36}>
              <div
                className="pointer-events-none absolute -inset-10 rounded-[34px] opacity-80 blur-2xl"
                style={{
                  background:
                    "radial-gradient(ellipse at 55% 45%, rgba(124,92,255,0.22), transparent 62%), radial-gradient(ellipse at 12% 55%, rgba(91,140,255,0.16), transparent 58%)"
                }}
                aria-hidden
              />
              <ResourcesBrandPanel />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Featured row */}
      <section className="relative overflow-hidden py-12 lg:py-16">
        <div className="mx-auto max-w-[1536px] px-6 lg:px-12">
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Reveal>
              <FeaturedGuideCard />
            </Reveal>

            <Stagger className="grid gap-4">
              {SECONDARY.map((card) => {
                const Icon = card.icon;
                return (
                  <StaggerItem key={card.title}>
                    <article className="spotlight-card group flex h-full flex-col rounded-[24px] border border-white/[0.09] bg-white/[0.025] p-7 transition duration-300 hover:-translate-y-1 hover:border-white/[0.16]">
                      <div className="flex items-start justify-between">
                        <span className="caption text-[#9faeff]">{card.label}</span>
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-[#7c5cff]/14 text-[#c4b5fd]">
                          <Icon className="h-5 w-5" strokeWidth={1.7} />
                        </span>
                      </div>
                      <h3 className="mt-4 text-[19px] font-bold leading-[1.18] tracking-[-0.03em] text-white">
                        {card.title}
                      </h3>
                      <p className="mt-3 flex-1 text-[14px] leading-[1.6] text-[#9aa4b8]">
                        {card.body}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#8ea7ff] transition-transform duration-300 group-hover:translate-x-0.5">
                        {card.cta}
                        <ArrowRight className="h-4 w-4" strokeWidth={2} />
                      </span>
                    </article>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>
        </div>
      </section>

      {/* Resource columns */}
      <section className="relative overflow-hidden border-t border-white/[0.07] py-20 lg:py-28">
        <div className="mx-auto max-w-[1536px] px-6 lg:px-12">
          <Reveal className="max-w-[680px]">
            <p className="eyebrow">Browse</p>
            <h2 className="mt-6 text-[clamp(2.2rem,3.6vw,3.4rem)] font-extrabold leading-[1.0] tracking-[-0.055em] text-white">
              Everything you need to <span className="text-gradient">hire smarter.</span>
            </h2>
          </Reveal>

          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((column) => {
              const Icon = column.icon;
              return (
                <StaggerItem key={column.title}>
                  <article className="spotlight-card flex h-full flex-col rounded-[24px] border border-white/[0.09] bg-white/[0.025] p-7 transition duration-300 hover:border-white/[0.16]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.09] bg-[#7c5cff]/14 text-[#c4b5fd]">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <h3 className="mt-6 text-[18px] font-bold tracking-[-0.03em] text-white">
                      {column.title}
                    </h3>
                    <p className="mt-2.5 text-[14px] leading-[1.6] text-[#9aa4b8]">{column.body}</p>
                    <ul className="mt-5 space-y-1 border-t border-white/[0.07] pt-4">
                      {column.links.map((link, index) => {
                        const isLast = index === column.links.length - 1;
                        return (
                          <li key={link}>
                            <a
                              href="#"
                              className={
                                isLast
                                  ? "group flex items-center justify-between gap-2 rounded-lg py-2 text-[13.5px] font-bold text-[#8ea7ff] transition hover:text-white"
                                  : "group flex items-center justify-between gap-2 rounded-lg py-2 text-[13.5px] font-medium text-white/70 transition hover:text-white"
                              }
                            >
                              <span className="truncate">{link}</span>
                              <ArrowUpRight
                                className="h-3.5 w-3.5 shrink-0 text-white/30 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#8ea7ff]"
                                strokeWidth={1.8}
                              />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>
    </MarketingShell>
  );
}
