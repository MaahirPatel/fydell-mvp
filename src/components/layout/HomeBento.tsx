import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  HeartPulse,
  Lock,
  MessagesSquare,
  Settings,
  Target,
  Users,
  Zap
} from "lucide-react";
import PricingGrid from "@/components/pricing/PricingGrid";
import { RESOURCE_ITEMS } from "@/lib/site-data";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

const audienceCards = [
  { title: "Recruiting Teams", icon: Users },
  { title: "Hiring Managers", icon: Target },
  { title: "Talent Leaders", icon: BarChart3 },
  { title: "Interview Panels", icon: MessagesSquare },
  { title: "Functional Operators", icon: BriefcaseBusiness }
] as const;

const companyPrincipleCards: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: "Evidence over intuition", body: "Replace pedigree shortcuts with structured work signal.", icon: ClipboardCheck },
  { title: "Fairness by design", body: "Give every candidate a consistent way to demonstrate ability.", icon: Users },
  { title: "Trust above all", body: "Keep evaluation transparent, explainable, and secure.", icon: Lock },
  { title: "Built for impact", body: "Help teams improve decision quality without adding process drag.", icon: Zap }
];

const roleCards = [
  ["Financial Services", "Assess modeling, risk judgment, and decision clarity.", Building2],
  ["Technology", "Evaluate systems thinking, prioritization, and communication.", Code2],
  ["Consulting", "Test structured problem solving and executive-ready synthesis.", MessagesSquare],
  ["Healthcare", "Measure prioritization, clinical reasoning, and escalation decisions.", HeartPulse],
  ["Operations", "Surface process thinking, resource tradeoffs, and execution quality.", Settings],
  ["Professional Services", "Evaluate client judgment, written recommendations, and pace.", BriefcaseBusiness]
] as const;

const principles = [
  "Potential is universal; opportunity is not.",
  "Skills are better predictors than pedigree.",
  "Transparency builds trust.",
  "Better hiring builds better teams."
];

function MiniWorkbook() {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/[0.11] bg-[linear-gradient(180deg,rgba(15,20,36,.92),rgba(6,10,22,.98))] p-4 shadow-[0_40px_120px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.08)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_10%,rgba(124,92,255,.18),transparent_38%)]" />
      <div className="relative flex items-center justify-between border-b border-white/[0.07] pb-4">
        <div>
          <p className="text-[12px] font-bold text-white">Financial Analyst Simulation</p>
          <p className="mt-1 text-[11px] text-[#9aa4b8]">Workbook and evidence capture</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#3dd68c]/25 bg-[#3dd68c]/10 px-2.5 py-1 text-[10px] font-bold text-[#3dd68c]">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#3dd68c]" />
          Live
        </span>
      </div>
      <div className="relative mt-4 grid gap-4 lg:grid-cols-[1.1fr_.72fr]">
        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3">
          <div className="mb-3 flex items-center gap-2 text-[10px] text-white/45">
            <span className="h-2 w-2 rounded-full bg-[#5b8cff]" />
            Revenue model
          </div>
          <div className="grid grid-cols-5 overflow-hidden rounded-xl border border-white/[0.06] text-[10px]">
            {["Metric", "2024", "2025E", "2026E", "Signal"].map((cell) => (
              <div key={cell} className="bg-white/[0.035] px-2 py-2 font-semibold text-white/60">
                {cell}
              </div>
            ))}
            {[
              ["Revenue", "$1.2B", "$1.4B", "$1.6B", "High"],
              ["Margin", "18.4%", "19.2%", "20.1%", "Good"],
              ["Growth", "14%", "16%", "13%", "Watch"],
              ["Debt", "2.1x", "1.9x", "1.6x", "Good"]
            ].flatMap((row) =>
              row.map((cell, index) => (
                <div key={`${row[0]}-${cell}-${index}`} className="border-t border-white/[0.045] px-2 py-2 text-white/68">
                  {cell}
                </div>
              ))
            )}
          </div>
        </div>
        <div className="grid gap-3">
          {[
            ["Simulation steps", 72],
            ["Model quality", 86],
            ["Communication", 78]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-white/76">{label}</span>
                <span className="font-bold text-white">{value}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#9b5cff]"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourceVisual() {
  return (
    <div className="relative h-full min-h-[260px] overflow-hidden rounded-[26px] border border-white/[0.1] bg-[linear-gradient(135deg,rgba(18,24,48,.92),rgba(5,9,20,.98))] p-5">
      <div className="absolute -right-10 top-6 h-44 w-44 rounded-full bg-[#7c5cff]/20 blur-3xl" />
      <div className="relative grid h-full grid-cols-[1fr_.7fr] gap-4">
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
            <p className="text-[11px] font-semibold text-white/56">Signal framework</p>
            <div className="mt-4 h-24">
              <svg viewBox="0 0 260 92" className="h-full w-full" aria-hidden>
                <path d="M8 78 C 42 52, 52 68, 80 44 S 128 36, 152 26 S 196 42, 244 14" fill="none" stroke="#7c5cff" strokeWidth="4" strokeLinecap="round" />
                <path d="M8 78 C 42 52, 52 68, 80 44 S 128 36, 152 26 S 196 42, 244 14 L244 92 L8 92Z" fill="rgba(124,92,255,.16)" />
              </svg>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[64, 82, 91].map((value) => (
              <div key={value} className="rounded-xl border border-white/[0.08] bg-black/20 p-3 text-center">
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/36">Index</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
          <div className="mx-auto h-28 w-28 rounded-full bg-[conic-gradient(from_160deg,#5b8cff,#7c5cff,#111827_64%,#111827)] p-3">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#070b17] text-xl font-bold text-white">
              87
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {[88, 76, 64].map((value) => (
              <div key={value} className="h-1.5 rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-gradient-to-r from-[#5b8cff] to-[#9b5cff]" style={{ width: `${value}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            {[
              ["Rubric coverage", "Role-ready"],
              ["Candidate clarity", "Structured"],
              ["Review format", "Committee-ready"]
            ].map(([label, status]) => (
              <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/36">{label}</p>
                <p className="mt-1 text-sm font-bold text-white/82">{status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeBento() {
  return (
    <div className="relative z-10 border-t border-white/[0.07]">
      {/* Family: split, text-left / visual-right */}
      <section id="product" className="mx-auto grid max-w-[1536px] items-center gap-12 px-6 py-24 lg:grid-cols-[0.82fr_1fr] lg:px-12">
        <Reveal>
          <p className="eyebrow">Product</p>
          <h2 className="mt-6 text-[clamp(2.6rem,4.4vw,4.8rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-white">
            The closest thing to the <span className="text-gradient">actual job.</span>
          </h2>
          <p className="mt-6 max-w-[560px] text-[18px] leading-[1.65] text-[#9aa4b8]">
            Fydell simulates real work so teams can watch candidates think, decide, and perform in the moments that matter.
          </p>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {["Send a simulation", "Watch real work", "Review the signal"].map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition duration-300 hover:-translate-y-1 hover:border-white/[0.16]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7c5cff]/20 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <p className="mt-4 text-sm font-bold text-white">{step}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.12} y={36}>
          <MiniWorkbook />
        </Reveal>
      </section>

      {/* Family: full-width headline + asymmetric card grid */}
      <section id="solutions" className="border-y border-white/[0.07] bg-black/[0.16]">
        <div className="mx-auto max-w-[1536px] px-6 py-24 lg:px-12">
          <Reveal className="max-w-[820px]">
            <h2 className="text-[clamp(2.6rem,4.4vw,4.8rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-white">
              Built for teams that <span className="text-gradient">hire on signal.</span>
            </h2>
            <p className="mt-6 max-w-[640px] text-[18px] leading-[1.65] text-[#9aa4b8]">
              Role-specific simulations reveal how candidates think and perform across finance, consulting, technology, healthcare, operations, and professional services.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roleCards.map(([title, body, Icon], index) => (
              <StaggerItem key={title} className={index === 0 ? "md:col-span-2 lg:col-span-1" : ""}>
                <article className="spotlight-card group h-full rounded-[24px] border border-white/[0.09] bg-white/[0.025] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/[0.16]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#7c5cff]/14 text-[#c4b5fd]">
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#9aa4b8]">{body}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal className="mt-10 flex flex-wrap items-center gap-3" delay={0.05}>
            <span className="text-sm font-semibold text-white/55">Teams using Fydell</span>
            {audienceCards.map(({ title, icon: Icon }) => (
              <span
                key={title}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2 text-[13px] font-semibold text-white/78 transition hover:border-white/[0.2] hover:text-white"
              >
                <Icon className="h-4 w-4 text-[#8ea7ff]" strokeWidth={1.7} />
                {title}
              </span>
            ))}
            <Link href="/signup" className="btn-lift group ml-1 inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-[#6f4cff] to-[#5b8cff] px-5 text-[13px] font-bold text-white">
              Book a demo
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Family: split, visual-left / text-right (alternated to break the zigzag) */}
      <section id="resources" className="mx-auto grid max-w-[1536px] items-center gap-12 px-6 py-24 lg:grid-cols-[1fr_0.9fr] lg:px-12">
        <Reveal className="order-2 lg:order-1" y={36}>
          <ResourceVisual />
        </Reveal>
        <Reveal className="order-1 lg:order-2" delay={0.1}>
          <h2 className="text-[clamp(2.5rem,4.2vw,4.6rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-white">
            Insights for <span className="text-gradient">modern hiring teams.</span>
          </h2>
          <p className="mt-6 max-w-[560px] text-[18px] leading-[1.65] text-[#9aa4b8]">
            Practical frameworks for designing simulations, reducing bias, and turning candidate work into structured evidence.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {RESOURCE_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm font-semibold text-white/78 transition hover:border-white/[0.16] hover:bg-white/[0.04]">
                <BookOpen className="h-4 w-4 shrink-0 text-[#9b8cff]" strokeWidth={1.7} />
                {item}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Family: full-width band, statement + principles */}
      <section id="company" className="border-y border-white/[0.07] bg-black/[0.16]">
        <div className="mx-auto max-w-[1536px] px-6 py-24 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[0.74fr_1fr]">
            <Reveal>
              <h2 className="text-[clamp(2.6rem,4.4vw,4.8rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-white">
                Building a <span className="text-gradient">fairer way</span> to hire.
              </h2>
              <p className="mt-6 max-w-[520px] text-[18px] leading-[1.65] text-[#9aa4b8]">
                Fydell exists to replace guesswork with evidence, helping teams make stronger decisions while giving candidates a clearer way to show their skills.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {principles.map((principle) => (
                  <div key={principle} className="flex items-start gap-3 text-sm text-white/76">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5b8cff]" />
                    {principle}
                  </div>
                ))}
              </div>
            </Reveal>
            <Stagger className="grid gap-4 sm:grid-cols-2">
              {companyPrincipleCards.map(({ title, body, icon: Icon }) => (
                <StaggerItem key={title}>
                  <article className="spotlight-card group h-full glass-card p-6 transition duration-300 hover:-translate-y-1 hover:border-white/[0.16]">
                    <Icon className="h-6 w-6 text-[#9b8cff]" strokeWidth={1.7} />
                    <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#9aa4b8]">{body}</p>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      <PricingGrid />
    </div>
  );
}
