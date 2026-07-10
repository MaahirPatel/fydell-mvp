import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import Link from "next/link";
import {
  ArrowRight,
  FileBarChart2,
  CheckSquare,
  ShieldAlert,
  TrendingUp,
  Activity,
  Cpu,
  Timer,
  Eye,
  Lock,
} from "lucide-react";

export const metadata = {
  title: "Product | Fydell — FP&A work trials for hiring teams",
  description:
    "A structured workroom that tests how candidates actually work: modeling discipline, risk detection, AI use, and communication quality — before the first interview.",
};

const SOLID_CTA =
  "inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#2563FF] px-6 text-[15px] font-semibold text-white shadow-[0_8px_28px_rgba(37,99,255,0.32)] transition-[transform,background] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

const GHOST_CTA =
  "inline-flex h-12 items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-5 text-[15px] font-semibold text-white/88 transition-colors duration-200 ease-out hover:border-white/25 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

const SIGNALS = [
  {
    icon: FileBarChart2,
    label: "Modeling discipline",
    desc: "We evaluate the structure, formula logic, and scenario architecture of what the candidate builds — not just whether the math is right.",
    detail: "Checks: named ranges, hardcoded values flagged, circular refs, base/bear/bull toggles",
  },
  {
    icon: CheckSquare,
    label: "Assumption checking",
    desc: "Are key growth and cost assumptions documented? Are they traceable to the data room? Did the candidate apply any sanity checks?",
    detail: "Checks: assumption log completeness, sourcing, sensitivity awareness",
  },
  {
    icon: ShieldAlert,
    label: "Risk detection",
    desc: "The brief contains intentional ambiguities and embedded risks. We measure whether the candidate finds them, flags them, or builds as if the base case is guaranteed.",
    detail: "Checks: downside scenario logic, risk call-outs in memo, assumption confidence levels",
  },
  {
    icon: TrendingUp,
    label: "Business judgment",
    desc: "Does the recommendation follow logically from the numbers? Is the framing appropriate for the stated stakeholder? Do they stay in their lane?",
    detail: "Checks: memo structure, claim-evidence alignment, executive framing quality",
  },
  {
    icon: Activity,
    label: "Communication clarity",
    desc: "The executive summary should be readable by a CFO in 90 seconds. We evaluate structure, tone, precision, and absence of jargon-for-jargon's-sake.",
    detail: "Checks: summary length, decision clarity, recommendation specificity",
  },
  {
    icon: Cpu,
    label: "AI verification behavior",
    desc: "Did the candidate use AI tools blindly, ignore them entirely, or use them deliberately with verification? This is a first-order signal in today's finance roles.",
    detail: "Checks: AI session audit, output acceptance rate, errors caught or missed",
  },
];

const FOR_TEAMS = [
  {
    icon: Timer,
    title: "Reports in 24 hours",
    desc: "Candidates complete the workroom asynchronously. Your evidence memo arrives the next business day, ready for your hiring panel.",
  },
  {
    icon: Eye,
    title: "No interpretation required",
    desc: "The memo includes a recommended decision, confidence level, and suggested interview questions. Your team spends time deciding, not decoding.",
  },
  {
    icon: Lock,
    title: "Private and candidate-blind",
    desc: "Candidates receive a private workroom link. They never see how others performed. Reports are visible only to your hiring team.",
  },
];

export default function ProductPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden pt-[120px] pb-16 lg:pt-[148px] lg:pb-24">
        <div className="pointer-events-none absolute left-[10%] top-[10%] h-[380px] w-[500px] rounded-full bg-[#2563FF]/12 blur-[140px]" />
        <div className="pointer-events-none absolute right-[5%] top-[20%] h-[320px] w-[460px] rounded-full bg-[#7C3DFF]/12 blur-[130px]" />
        <div className="relative mx-auto max-w-[1240px] px-6 sm:px-8">
          <Reveal className="max-w-[680px]">
            <p className="eyebrow">Product</p>
            <h1
              className="mt-6 text-white"
              style={{
                fontSize: "clamp(2.8rem,4.8vw,4.6rem)",
                lineHeight: 1.0,
                letterSpacing: "-0.04em",
                fontWeight: 800,
              }}
            >
              A workroom that shows how candidates{" "}
              <span className="text-[#2563FF]">actually think</span>.
            </h1>
            <p className="mt-6 max-w-[540px] text-[18px] leading-[1.65] text-[#A7B0C0]">
              Fydell gives FP&A candidates a realistic scenario, a data room, and 25 minutes to
              show their work. Your hiring team gets a structured evidence memo — not a score, not
              a personality assessment.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link href="/request-pilot" className={SOLID_CTA}>
                Request a pilot
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </Link>
              <Link href="/how-it-works" className={GHOST_CTA}>
                See how it works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The six signals */}
      <section className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
          <Reveal className="max-w-[560px]">
            <p className="eyebrow">What we measure</p>
            <h2
              className="mt-5 text-white"
              style={{ fontSize: "clamp(2.2rem,3.4vw,3.2rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              Six signals, grounded in the actual work.
            </h2>
            <p className="mt-4 text-[17px] leading-[1.6] text-[#A7B0C0]">
              Every signal is drawn from behavioral evidence captured inside the workroom — not
              self-reported, not inferred from a test score.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SIGNALS.map((s) => {
              const Icon = s.icon;
              return (
                <StaggerItem key={s.label}>
                  <article className="flex h-full flex-col rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-[#2563FF]/10 text-[#2563FF]">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <h3 className="mt-5 text-[15.5px] font-bold tracking-[-0.02em] text-white">{s.label}</h3>
                    <p className="mt-2.5 text-[13.5px] leading-[1.6] text-[#A7B0C0]">{s.desc}</p>
                    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                      <p className="text-[11.5px] leading-[1.5] text-[#6F7A8C]">{s.detail}</p>
                    </div>
                  </article>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* For finance teams */}
      <section className="relative py-20 lg:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-[#7C3DFF]/8 blur-[130px]" />
        <div className="relative mx-auto max-w-[1240px] px-6 sm:px-8">
          <Reveal className="mb-12 max-w-[500px]">
            <p className="eyebrow">For hiring teams</p>
            <h2
              className="mt-5 text-white"
              style={{ fontSize: "clamp(2.2rem,3.4vw,3.2rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              Built for finance leaders, not HR generalists.
            </h2>
          </Reveal>
          <Stagger className="grid gap-5 sm:grid-cols-3">
            {FOR_TEAMS.map((item) => {
              const Icon = item.icon;
              return (
                <StaggerItem key={item.title}>
                  <div className="flex h-full flex-col rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-[#7C3DFF]/10 text-[#7C3DFF]">
                      <Icon className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <h3 className="mt-5 text-[15.5px] font-bold tracking-[-0.02em] text-white">{item.title}</h3>
                    <p className="mt-2.5 text-[13.5px] leading-[1.6] text-[#A7B0C0]">{item.desc}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* The evidence memo */}
      <section className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="eyebrow">The output</p>
              <h2
                className="mt-5 text-white"
                style={{ fontSize: "clamp(2.2rem,3.4vw,3.2rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
              >
                One memo. Clear decision. Ready to use.
              </h2>
              <p className="mt-4 text-[17px] leading-[1.6] text-[#A7B0C0]">
                Every completed workroom produces a structured evidence memo your hiring panel can
                review, discuss, and act on. No calibration required.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "Advance / Hold / Reject recommendation",
                  "Confidence level (Low / Medium / High)",
                  "Signal scores with behavioral citations",
                  "Timeline of major decisions",
                  "3–5 targeted interview follow-up questions",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[15px] text-[#A7B0C0]">
                    <div className="h-5 w-5 shrink-0 rounded-full bg-[#2563FF]/15 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#2563FF]" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/sample-report" className={SOLID_CTA}>
                  View sample report
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-[20px] border border-white/[0.1] bg-[#080C16] p-7 shadow-[0_32px_80px_rgba(0,0,0,0.38)]">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6F7A8C]">Evidence Memo · Project Meridian</p>
                    <p className="mt-1.5 text-[17px] font-bold text-white">Candidate 01</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-400">
                    Advance
                  </span>
                </div>

                <div className="space-y-3 mb-5">
                  {[
                    { label: "Confidence", value: "Medium", color: "text-amber-400" },
                    { label: "Time in workroom", value: "4h 12m", color: "text-white" },
                    { label: "AI verification", value: "Critical — 1 error caught", color: "text-emerald-400" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-2.5">
                      <span className="text-[12.5px] text-[#6F7A8C]">{row.label}</span>
                      <span className={`text-[12.5px] font-semibold ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Modeling discipline", score: 87 },
                    { label: "Risk detection", score: 78 },
                    { label: "Communication", score: 85 },
                    { label: "Business judgment", score: 80 },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="mb-1 flex justify-between">
                        <span className="text-[11.5px] text-[#A7B0C0]">{s.label}</span>
                        <span className="text-[11.5px] font-medium text-white">{s.score}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#2563FF] to-[#7C3DFF]"
                          style={{ width: `${s.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 lg:py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563FF]/8 blur-[110px]" />
        <div className="relative mx-auto max-w-[680px] px-6 text-center sm:px-8">
          <Reveal>
            <h2
              className="text-white"
              style={{ fontSize: "clamp(2.2rem,3.8vw,3.4rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              Start with one FP&A role.
            </h2>
            <p className="mx-auto mt-5 max-w-[440px] text-[17px] leading-[1.65] text-[#A7B0C0]">
              $10 per completed report. Founder-managed. No setup fee, no contract, no platform
              training required.
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
