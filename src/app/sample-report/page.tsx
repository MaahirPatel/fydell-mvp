import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle, Clock, FileBarChart2, TrendingUp, Activity, Cpu, ShieldAlert, CheckSquare } from "lucide-react";

export const metadata = {
  title: "Sample Evidence Memo | Fydell — Candidate 01 · Project Meridian",
  description:
    "See what a Fydell evidence memo looks like. Real signal structure, real decision format — using a representative candidate scenario.",
};

const SOLID_CTA =
  "inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#2563FF] px-6 text-[15px] font-semibold text-white shadow-[0_8px_28px_rgba(37,99,255,0.32)] transition-[transform,background] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

const SIGNALS = [
  {
    icon: FileBarChart2,
    label: "Modeling discipline",
    score: 87,
    level: "Strong",
    levelColor: "text-emerald-400",
    summary: "Well-structured three-statement model with clean assumption separation. Named ranges used consistently. One circular reference flagged and resolved. Scenario toggle logic correctly implemented.",
  },
  {
    icon: CheckSquare,
    label: "Assumption checking",
    score: 79,
    level: "Good",
    levelColor: "text-emerald-400",
    summary: "Revenue growth assumptions sourced to management commentary. Cost assumptions benchmarked but not stress-tested in the bear case. Capex phasing left at default without documentation.",
  },
  {
    icon: ShieldAlert,
    label: "Risk detection",
    score: 78,
    level: "Good",
    levelColor: "text-emerald-400",
    summary: "Identified the Q3 revenue timing risk embedded in the data room. Flagged customer concentration in the top-line. Did not raise the working capital assumption as a potential lever in downside scenarios.",
  },
  {
    icon: TrendingUp,
    label: "Business judgment",
    score: 80,
    level: "Good",
    levelColor: "text-emerald-400",
    summary: "Recommendation was directionally correct and connected to the numbers. Executive framing was appropriate for a CFO audience. Slightly over-qualified the conclusion — confidence could be stated more directly.",
  },
  {
    icon: Activity,
    label: "Communication clarity",
    score: 85,
    level: "Strong",
    levelColor: "text-emerald-400",
    summary: "Executive summary readable in under 90 seconds. Decision stated in the first sentence. Risk section well-structured. One section repeated information from the model commentary unnecessarily.",
  },
  {
    icon: Cpu,
    label: "AI verification behavior",
    score: 72,
    level: "Adequate",
    levelColor: "text-amber-400",
    summary: "Used AI assistance for three sections. Caught one factual error in AI-generated comp output. Accepted one market sizing estimate without verification — that figure was not used in the final model.",
  },
];

const TIMELINE = [
  { time: "0:00", event: "Opened brief and data room", type: "neutral" },
  { time: "0:14", event: "Started model build — created driver sheet first", type: "positive" },
  { time: "0:38", event: "Documented revenue growth assumptions with source citations", type: "positive" },
  { time: "1:02", event: "Mid-session data update received — revised Q3 forecast", type: "neutral" },
  { time: "1:08", event: "Updated model for revised data; flagged timing risk in memo draft", type: "positive" },
  { time: "1:31", event: "AI assistance used for executive summary draft", type: "neutral" },
  { time: "1:44", event: "AI output reviewed — one comp error caught and removed", type: "positive" },
  { time: "4:08", event: "Final memo submitted", type: "neutral" },
];

const INTERVIEW_QS = [
  "Walk me through the assumption you made on Q4 revenue growth. What data did you use to anchor that number?",
  "You flagged customer concentration as a risk but didn't model a downside scenario for it. How would you approach that if you had more time?",
  "Tell me about the AI output you reviewed during the workroom. What made you flag the comp as unreliable?",
];

export default function SampleReportPage() {
  return (
    <MarketingShell>
      {/* Glows */}
      <div className="pointer-events-none fixed left-[5%] top-[20%] h-[360px] w-[480px] rounded-full bg-[#2563FF]/10 blur-[160px]" />

      <section className="relative overflow-hidden pt-[120px] pb-16 lg:pt-[140px] lg:pb-20">
        <div className="relative mx-auto max-w-[900px] px-6 sm:px-8">
          {/* Header label */}
          <Reveal>
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-medium text-[#A7B0C0]">
                Sample evidence memo
              </span>
              <span className="text-[#6F7A8C]">·</span>
              <span className="text-[12px] text-[#6F7A8C]">
                This memo uses a representative scenario. No real candidate data.
              </span>
            </div>

            {/* Memo header */}
            <div className="overflow-hidden rounded-[24px] border border-white/[0.1] bg-[#080C16] shadow-[0_40px_100px_rgba(0,0,0,0.45)]">
              {/* Top bar */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] px-7 py-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#6F7A8C]">
                    Fydell Evidence Memo
                  </p>
                  <h1
                    className="mt-2 text-white"
                    style={{ fontSize: "clamp(1.8rem,2.8vw,2.4rem)", lineHeight: 1.1, letterSpacing: "-0.04em", fontWeight: 800 }}
                  >
                    Candidate 01
                  </h1>
                  <p className="mt-1.5 text-[14px] text-[#A7B0C0]">
                    Project Meridian · Senior FP&A Analyst
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/12 px-4 py-2 text-[13px] font-bold text-emerald-400">
                    Advance
                  </span>
                  <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-400">
                    Medium confidence
                  </span>
                </div>
              </div>

              {/* Metadata row */}
              <div className="grid grid-cols-2 divide-x divide-white/[0.07] border-b border-white/[0.08] sm:grid-cols-4">
                {[
                  { label: "Time in workroom", value: "4h 12m" },
                  { label: "Submission date", value: "Day 2 of window" },
                  { label: "AI tools used", value: "Yes — reviewed" },
                  { label: "Overall score", value: "80 / 100" },
                ].map((meta) => (
                  <div key={meta.label} className="px-5 py-4">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#6F7A8C]">{meta.label}</p>
                    <p className="mt-1 text-[14px] font-semibold text-white">{meta.value}</p>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="border-b border-white/[0.08] px-7 py-6">
                <p className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#6F7A8C]">Executive summary</p>
                <p className="text-[15px] leading-[1.7] text-[#A7B0C0]">
                  Candidate 01 demonstrated strong analytical foundations and a structured approach
                  to the FP&A brief. The model was well-built with clean assumption documentation.
                  The candidate identified the key revenue timing risk and adjusted their model
                  when mid-session data arrived — a positive indicator of adaptability. AI tools
                  were used thoughtfully: one output was reviewed critically and an error caught.
                  The executive recommendation was clear and directionally sound, though the
                  confidence level for some assumptions warrants follow-up in interview.
                </p>
              </div>

              {/* Signal scores */}
              <div className="border-b border-white/[0.08] px-7 py-6">
                <p className="mb-5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#6F7A8C]">Signal scores</p>
                <div className="space-y-6">
                  {SIGNALS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="grid gap-4 sm:grid-cols-[auto_1fr]">
                        <div className="flex items-center gap-3 sm:w-[200px]">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[#A7B0C0]">
                            <Icon className="h-4 w-4" strokeWidth={1.7} />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-white">{s.label}</p>
                            <p className={`text-[11px] ${s.levelColor}`}>{s.level}</p>
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#2563FF] to-[#7C3DFF] transition-all duration-700"
                                style={{ width: `${s.score}%` }}
                              />
                            </div>
                            <span className="ml-3 text-[13px] font-bold text-white">{s.score}</span>
                          </div>
                          <p className="text-[12.5px] leading-[1.6] text-[#A7B0C0]">{s.summary}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Decision timeline */}
              <div className="border-b border-white/[0.08] px-7 py-6">
                <p className="mb-5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#6F7A8C]">Decision timeline</p>
                <div className="relative space-y-4 pl-6">
                  <div className="pointer-events-none absolute left-[7px] top-0 h-full w-[1px] bg-white/[0.1]" />
                  {TIMELINE.map((item) => (
                    <div key={item.time} className="relative flex items-start gap-4">
                      <div
                        className={`absolute -left-[1px] mt-1.5 h-3 w-3 -translate-x-1/2 rounded-full border ${
                          item.type === "positive"
                            ? "border-emerald-400/40 bg-emerald-400/20"
                            : "border-white/[0.2] bg-[#080C16]"
                        }`}
                      />
                      <span className="w-10 shrink-0 text-[11.5px] font-mono text-[#6F7A8C]">{item.time}</span>
                      <p className="text-[13px] leading-[1.5] text-[#A7B0C0]">{item.event}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested interview questions */}
              <div className="px-7 py-6">
                <p className="mb-5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#6F7A8C]">
                  Suggested interview questions
                </p>
                <div className="space-y-3">
                  {INTERVIEW_QS.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2563FF]/15 text-[10px] font-bold text-[#2563FF]">
                        {i + 1}
                      </span>
                      <p className="text-[13.5px] leading-[1.6] text-[#A7B0C0]">{q}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-4">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" strokeWidth={1.7} />
                  <div>
                    <p className="text-[12.5px] font-semibold text-amber-400 mb-1">Medium confidence flag</p>
                    <p className="text-[12.5px] leading-[1.6] text-[#A7B0C0]">
                      Working capital assumptions were not documented. Before final decision, confirm whether
                      this was a time constraint or a genuine gap in understanding. Question 2 above
                      is designed to surface this.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA below memo */}
      <section className="relative py-16 lg:py-24">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563FF]/8 blur-[110px]" />
        <div className="relative mx-auto max-w-[680px] px-6 text-center sm:px-8">
          <Reveal>
            <p className="eyebrow mx-auto">Get memos like this for your candidates</p>
            <h2
              className="mt-6 text-white"
              style={{ fontSize: "clamp(2rem,3.4vw,3rem)", lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 800 }}
            >
              Run your first pilot for $10 per report.
            </h2>
            <p className="mx-auto mt-5 max-w-[440px] text-[17px] leading-[1.65] text-[#A7B0C0]">
              No setup fee. No contract. Founder-managed. One FP&A role to start.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
              <Link href="/request-pilot" className={SOLID_CTA}>
                Request a pilot
                <ArrowRight className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}
