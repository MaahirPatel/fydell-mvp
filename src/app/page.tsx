import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import FpaHeroPreview from "@/components/hero/FpaHeroPreview";
import Link from "next/link";
import {
  ArrowRight,
  FileSearch,
  BrainCircuit,
  MessageSquareOff,
  ShieldAlert,
  FileBarChart2,
  CheckSquare,
  TrendingUp,
  Activity,
  Cpu,
} from "lucide-react";

export const metadata = {
  title: "Fydell — FP&A hiring on evidence, not guesswork",
  description:
    "Fydell runs FP&A candidates through a realistic work trial and gives hiring teams an evidence memo showing how they model, catch risk, use AI, and communicate judgment.",
};

const PAIN_CARDS = [
  {
    icon: FileSearch,
    title: "Resumes list tools, not judgment",
    body: "A candidate who lists Excel and PowerPoint could be exceptional or completely out of their depth. There is no way to tell.",
  },
  {
    icon: MessageSquareOff,
    title: "Interviews reward polish, not skill",
    body: "Confident presentation masks weak financial thinking. Quiet candidates with strong models never get a second look.",
  },
  {
    icon: ShieldAlert,
    title: "Bad hires cost months and deals",
    body: "A finance analyst who can't detect model errors or flawed assumptions costs the business real money before you notice the problem.",
  },
  {
    icon: BrainCircuit,
    title: "AI usage is invisible in screening",
    body: "You can't see whether a candidate uses AI thoughtfully or blindly accepts outputs. That gap matters enormously today.",
  },
];

const FLOW_STEPS = [
  { step: "01", label: "Brief", desc: "Candidate receives the business context, stakeholder ask, and available data sources." },
  { step: "02", label: "Data Room", desc: "They review financial statements, driver data, and management commentary — just like the real role." },
  { step: "03", label: "Model", desc: "They build or extend the model: revenue forecasting, cost assumptions, scenario toggles." },
  { step: "04", label: "Assumptions", desc: "Every assumption is logged. We capture what they documented, changed, and why." },
  { step: "05", label: "Update", desc: "Mid-session data drops test how they handle changing inputs — do they adjust their model or ignore the signal?" },
  { step: "06", label: "Recommendation", desc: "They write an executive memo with their conclusion, risks, and confidence level." },
];

const SIGNAL_CARDS = [
  {
    icon: FileBarChart2,
    label: "Modeling discipline",
    desc: "Structure, formula hygiene, version control, and scenario logic evaluated against the brief.",
  },
  {
    icon: CheckSquare,
    label: "Assumption checking",
    desc: "Whether key drivers are documented, stress-tested, and traceable to sources.",
  },
  {
    icon: ShieldAlert,
    label: "Risk detection",
    desc: "Did they identify the embedded risks or build the model as if the base case was certain?",
  },
  {
    icon: TrendingUp,
    label: "Business judgment",
    desc: "The quality of their narrative — does the recommendation follow logically from the numbers?",
  },
  {
    icon: Activity,
    label: "Communication clarity",
    desc: "Executive summary, structure, and ability to translate financial complexity to decisions.",
  },
  {
    icon: Cpu,
    label: "AI verification behavior",
    desc: "How they used AI assistance: blind acceptance, critical review, or deliberate augmentation.",
  },
];

const SOLID_CTA =
  "inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#2563FF] px-6 text-[15px] font-semibold text-white shadow-[0_8px_28px_rgba(37,99,255,0.32)] transition-[transform,background] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

const GHOST_CTA =
  "inline-flex h-12 items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-5 text-[15px] font-semibold text-white/88 transition-colors duration-200 ease-out hover:border-white/25 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

export default function HomePage() {
  return (
    <MarketingShell>
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-[132px] pb-16 lg:pt-[150px] lg:pb-24">
        <div className="pointer-events-none absolute left-[2%] top-[14%] h-[400px] w-[500px] rounded-full bg-[#2563FF]/14 blur-[140px]" />
        <div className="pointer-events-none absolute right-[-6%] top-[4%] h-[500px] w-[660px] rounded-full bg-[#7C3DFF]/16 blur-[150px]" />

        <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
          <div className="grid items-center gap-12 lg:min-h-[580px] lg:grid-cols-[1fr_1.05fr] xl:gap-16">
            {/* Left — copy */}
            <Reveal className="relative z-10 max-w-[580px]">
              <h1
                className="text-white"
                style={{
                  fontSize: "clamp(2.8rem,5vw,4.6rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.04em",
                  fontWeight: 800,
                }}
              >
                Know who can actually{" "}
                <span className="text-[#2563FF]">do finance work</span> before the first interview.
              </h1>

              <p className="mt-6 max-w-[500px] text-[18px] leading-[1.65] text-[#A7B0C0]">
                Fydell runs FP&A candidates through a realistic work trial and gives hiring teams an
                evidence memo showing how they model, catch risk, use AI, and communicate judgment.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3.5">
                <Link href="/sample-report" className={SOLID_CTA}>
                  View sample report
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </Link>
                <Link href="/request-pilot" className={GHOST_CTA}>
                  Request pilot
                </Link>
              </div>
            </Reveal>

            {/* Right — dashboard preview */}
            <Reveal delay={0.15} className="relative">
              <div
                className="pointer-events-none absolute -inset-10 rounded-[40px] opacity-70 blur-3xl"
                style={{
                  background:
                    "radial-gradient(ellipse at 55% 45%, rgba(37,99,255,0.2), transparent 60%), radial-gradient(ellipse at 15% 65%, rgba(124,61,255,0.18), transparent 58%)",
                }}
                aria-hidden
              />
              <FpaHeroPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── PAIN ──────────────────────────────────────────────── */}
      <section className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
          <Reveal className="max-w-[600px]">
            <p className="eyebrow">The problem</p>
            <h2
              className="mt-5 text-white"
              style={{ fontSize: "clamp(2.2rem,3.4vw,3.2rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              Resumes do not show finance judgment.
            </h2>
            <p className="mt-4 max-w-[500px] text-[17px] leading-[1.6] text-[#A7B0C0]">
              The signals that actually predict success in an FP&A role are invisible on a CV and
              easy to fake in an interview.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PAIN_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <StaggerItem key={card.title}>
                  <article className="flex h-full flex-col rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-6 transition-[transform,border-color,background] duration-200 ease-out hover:-translate-y-1 hover:border-white/[0.16] hover:bg-white/[0.04]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-[#2563FF]/10 text-[#2563FF]">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <h3 className="mt-5 text-[16px] font-bold tracking-[-0.02em] text-white">
                      {card.title}
                    </h3>
                    <p className="mt-2.5 text-[14px] leading-[1.6] text-[#A7B0C0]">{card.body}</p>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ─── PRODUCT ───────────────────────────────────────────── */}
      <section className="relative py-20 lg:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/4 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#7C3DFF]/8 blur-[120px]" />
        <div className="relative mx-auto max-w-[1240px] px-6 sm:px-8">
          <Reveal className="max-w-[580px]">
            <p className="eyebrow">How it works</p>
            <h2
              className="mt-5 text-white"
              style={{ fontSize: "clamp(2.2rem,3.4vw,3.2rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              The workroom, not a quiz.
            </h2>
            <p className="mt-4 max-w-[500px] text-[17px] leading-[1.6] text-[#A7B0C0]">
              Candidates work through a realistic FP&A brief from start to recommendation. We
              capture every decision, not just the final output.
            </p>
          </Reveal>

          <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FLOW_STEPS.map((s, i) => (
              <StaggerItem key={s.step}>
                <div className="relative flex h-full flex-col rounded-[18px] border border-white/[0.08] bg-white/[0.025] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold"
                      style={{
                        background: `linear-gradient(135deg, rgba(37,99,255,${0.15 + i * 0.04}), rgba(124,61,255,${0.1 + i * 0.03}))`,
                        color: i < 3 ? "#2563FF" : "#7C3DFF",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {s.step}
                    </span>
                    <h3 className="text-[15px] font-bold tracking-[-0.02em] text-white">{s.label}</h3>
                  </div>
                  <p className="text-[13.5px] leading-[1.6] text-[#A7B0C0]">{s.desc}</p>
                  {i < FLOW_STEPS.length - 1 && (
                    <div className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 lg:block">
                      <ArrowRight className="h-4 w-4 text-[#6F7A8C]" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ─── EVIDENCE MEMO ─────────────────────────────────────── */}
      <section className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="eyebrow">The output</p>
              <h2
                className="mt-5 text-white"
                style={{ fontSize: "clamp(2.2rem,3.4vw,3.2rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
              >
                Every report shows what the candidate actually did.
              </h2>
              <p className="mt-4 text-[17px] leading-[1.6] text-[#A7B0C0]">
                Not a score out of 100. A structured evidence memo your hiring panel can read in
                five minutes and use to make a calibrated decision.
              </p>
              <div className="mt-8 space-y-3">
                {["Decision with confidence level", "Signal scores with evidence citations", "Timeline of key decisions and pivots", "Suggested interview questions"].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-[15px] text-[#A7B0C0]">
                    <div className="h-5 w-5 shrink-0 rounded-full bg-[#2563FF]/15 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#2563FF]" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link href="/sample-report" className={SOLID_CTA}>
                  View sample report
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-[20px] border border-white/[0.1] bg-[#080C16] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6F7A8C]">Evidence Memo</p>
                    <p className="mt-1 text-[16px] font-bold text-white">Candidate 01 · Project Meridian</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-400">
                    Advance
                  </span>
                </div>
                <div className="mb-5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <p className="text-[12px] font-medium uppercase tracking-[0.07em] text-[#6F7A8C] mb-2">Summary</p>
                  <p className="text-[13.5px] leading-[1.65] text-[#A7B0C0]">
                    Strong analytical foundation with good assumption documentation. Identified the revenue timing risk that was embedded in Q3 data. AI outputs reviewed critically — flagged one hallucinated comp. Recommendation was concise and directionally correct.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Modeling", score: 87 },
                    { label: "Risk detection", score: 78 },
                    { label: "Communication", score: 85 },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-center">
                      <p className="text-[18px] font-extrabold tracking-[-0.03em] text-white">{s.score}</p>
                      <p className="mt-1 text-[10px] text-[#6F7A8C]">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-[#2563FF]/15 bg-[#2563FF]/5 px-4 py-3">
                  <p className="text-[12.5px] text-[#A7B0C0]">Confidence level</p>
                  <p className="text-[12.5px] font-semibold text-[#2563FF]">Medium — 3 interview Qs included</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── MEASURES ──────────────────────────────────────────── */}
      <section className="relative py-20 lg:py-28">
        <div className="pointer-events-none absolute right-[-10%] bottom-0 h-[400px] w-[600px] rounded-full bg-[#2563FF]/8 blur-[120px]" />
        <div className="relative mx-auto max-w-[1240px] px-6 sm:px-8">
          <Reveal className="max-w-[560px]">
            <p className="eyebrow">What we measure</p>
            <h2
              className="mt-5 text-white"
              style={{ fontSize: "clamp(2.2rem,3.4vw,3.2rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              Six signals that predict FP&A success.
            </h2>
            <p className="mt-4 text-[17px] leading-[1.6] text-[#A7B0C0]">
              Each signal is drawn from what candidates do inside the workroom — not what they say
              about themselves.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SIGNAL_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <StaggerItem key={card.label}>
                  <article className="flex h-full flex-col rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-6 transition-[transform,border-color,background] duration-200 ease-out hover:-translate-y-1 hover:border-[#2563FF]/20 hover:bg-white/[0.04]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-[#7C3DFF]/10 text-[#7C3DFF]">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <h3 className="mt-5 text-[15.5px] font-bold tracking-[-0.02em] text-white">{card.label}</h3>
                    <p className="mt-2.5 text-[13.5px] leading-[1.6] text-[#A7B0C0]">{card.desc}</p>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ─── PILOT CTA ─────────────────────────────────────────── */}
      <section className="relative py-20 lg:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563FF]/10 blur-[120px]" />
        <div className="relative mx-auto max-w-[760px] px-6 sm:px-8">
          <Reveal className="rounded-[28px] border border-white/[0.1] bg-white/[0.025] p-10 text-center lg:p-16">
            <p className="eyebrow mx-auto">Get started</p>
            <h2
              className="mt-6 text-white"
              style={{ fontSize: "clamp(2.2rem,3.8vw,3.4rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              Run a pilot with one FP&A role.
            </h2>
            <p className="mx-auto mt-5 max-w-[480px] text-[17px] leading-[1.65] text-[#A7B0C0]">
              $10 per completed report. No setup fee. You get evidence memos for every candidate
              who completes the workroom — ready in 24 hours.
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
