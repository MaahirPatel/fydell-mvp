import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink } from "@/components/marketing/ui";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";

export const metadata = {
  title: "Sample Hiring Evidence Report | Fydell",
  description:
    "An example of what a finance hiring team receives after a candidate completes Project Meridian.",
};

const STOOD_OUT = [
  "Identified churn risk from the customer renewal note",
  "Revised revenue growth after reviewing source documents",
  "Responded to the manager update before submitting",
  "Wrote a clear recommendation tied to the model changes",
];

const NEEDS_REVIEW = [
  "Cash runway sensitivity not fully tested",
  "Operating expense escalation lightly addressed",
  "Competitive pressure scenario not considered",
];

const ASSUMPTIONS = [
  { metric: "Revenue Growth", from: "12.0%", to: "8.2%" },
  { metric: "Churn Rate", from: "3.5%", to: "6.3%" },
  { metric: "Hiring Ramp", from: "100%", to: "84%" },
];

const TIMELINE = [
  { time: "09:12", event: "Opened customer renewal note" },
  { time: "12:47", event: "Changed churn rate assumption" },
  { time: "18:03", event: "Revised revenue growth" },
  { time: "24:11", event: "Submitted recommendation memo" },
];

const INTERVIEW_QS = [
  "What additional downside case would you build?",
  "How would you validate the churn assumption?",
  "Where did AI help, and where did you verify manually?",
];

export default function SampleReportPage() {
  return (
    <MarketingShell>
      <section className="pt-[120px] pb-12 sm:pt-[140px] sm:pb-16">
        <Container>
          <Reveal className="max-w-[720px]">
            <p className="mb-4 text-[12px] font-medium text-white/[0.42]">Sample report</p>
            <h1
              className="text-white"
              style={{
                fontSize: "clamp(2.4rem, 4.5vw, 3.75rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.04em",
                fontWeight: 650,
              }}
            >
              Sample Hiring Evidence Report
            </h1>
            <p className="mt-5 max-w-[560px] text-[17px] leading-[1.65] text-white/[0.66] sm:text-[18px]">
              An example of what a finance hiring team receives after a candidate completes
              Project Meridian.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="pb-16 lg:pb-20">
        <Container wide>
          <Reveal>
            <div className="overflow-x-auto rounded-[20px]">
              <div className="min-w-[720px] lg:min-w-0">
                <EvidenceReportMockup />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="pb-20 lg:pb-28">
        <Container>
          <Reveal>
            <div className="overflow-hidden rounded-[20px] border border-white/[0.10] bg-[#080B12]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] px-6 py-6 sm:px-7">
                <div>
                  <p className="text-[11px] font-medium text-white/[0.42]">Hiring Evidence Report</p>
                  <h2
                    className="mt-2 text-white"
                    style={{
                      fontSize: "clamp(1.4rem, 2.2vw, 1.85rem)",
                      lineHeight: 1.15,
                      letterSpacing: "-0.04em",
                      fontWeight: 620,
                    }}
                  >
                    Project Meridian — FP&A Work Trial
                  </h2>
                  <p className="mt-1.5 text-[14px] text-white/[0.55]">Sample · No real candidate data</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Advance to interview
                  </span>
                  <p className="mt-2 text-[12px] text-white/[0.42]">
                    Confidence: <span className="text-white/70">Medium</span>
                  </p>
                </div>
              </div>

              <div className="border-b border-white/[0.08] px-6 py-6 sm:px-7">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-white/[0.42]">
                  Recommendation
                </p>
                <p className="max-w-[720px] text-[15px] leading-[1.7] text-white/[0.66]">
                  Strong evidence in risk awareness and written recommendation. Probe depth of cash
                  runway reasoning in the interview.
                </p>
              </div>

              <div className="grid border-b border-white/[0.08] lg:grid-cols-2">
                <div className="border-b border-white/[0.08] px-6 py-6 sm:px-7 lg:border-b-0 lg:border-r">
                  <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-white/[0.42]">
                    Evidence timeline
                  </p>
                  <div className="space-y-3.5">
                    {TIMELINE.map((item) => (
                      <div key={item.time} className="flex gap-4">
                        <span className="w-12 shrink-0 tabular-nums text-[12px] text-white/[0.42]">
                          {item.time}
                        </span>
                        <p className="text-[14px] text-white/[0.72]">{item.event}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-6 py-6 sm:px-7">
                  <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-white/[0.42]">
                    Assumptions changed
                  </p>
                  <div className="space-y-2.5">
                    {ASSUMPTIONS.map((row) => (
                      <div
                        key={row.metric}
                        className="flex items-center justify-between gap-3 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
                      >
                        <span className="text-[13px] text-white/80">{row.metric}</span>
                        <span className="tabular-nums text-[13px] text-white/[0.55]">
                          {row.from} → <span className="text-white">{row.to}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid border-b border-white/[0.08] lg:grid-cols-2">
                <div className="border-b border-white/[0.08] px-6 py-6 sm:px-7 lg:border-b-0 lg:border-r">
                  <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-white/[0.42]">
                    What stood out
                  </p>
                  <ul className="space-y-2.5">
                    {STOOD_OUT.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[14px] leading-[1.55] text-white/[0.72]">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/80" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-6 py-6 sm:px-7">
                  <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-white/[0.42]">
                    What needs review
                  </p>
                  <ul className="space-y-2.5">
                    {NEEDS_REVIEW.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[14px] leading-[1.55] text-white/[0.72]">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-400/70" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-b border-white/[0.08] px-6 py-6 sm:px-7">
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-white/[0.42]">
                  Final memo excerpt
                </p>
                <blockquote className="max-w-[720px] border-l border-white/[0.12] pl-4 text-[14px] leading-[1.7] text-white/[0.66]">
                  The base case revenue assumption of 12% does not reflect the recent renewal data.
                  Adjusting to 8.2% results in a materially tighter cash runway of 9.1 months versus
                  the 14-month baseline. Hiring ramp delays compound this risk. I recommend probing
                  the renewal pipeline before finalising Q3 headcount plans.
                </blockquote>
              </div>

              <div className="px-6 py-6 sm:px-7">
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-white/[0.42]">
                  Follow-up interview questions
                </p>
                <div className="space-y-3">
                  {INTERVIEW_QS.map((q, i) => (
                    <div
                      key={q}
                      className="flex items-start gap-3 rounded-[12px] border border-white/[0.07] bg-white/[0.02] px-4 py-3.5"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-[10px] font-semibold text-white/[0.55]">
                        {i + 1}
                      </span>
                      <p className="text-[14px] leading-[1.55] text-white/[0.72]">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="border-t border-white/[0.06] py-20 lg:py-28">
        <Container>
          <Reveal className="max-w-[540px]">
            <h2
              className="text-white"
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                letterSpacing: "-0.04em",
                fontWeight: 620,
              }}
            >
              Run one FP&A work trial.
            </h2>
            <p className="mt-4 text-[17px] leading-[1.65] text-white/[0.66]">
              Start with one role. Review structured evidence. Decide who is worth interviewing.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/request-pilot" variant="primary">
                Request a pilot
              </ButtonLink>
              <ButtonLink href="/product" variant="secondary">
                See the product
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>
    </MarketingShell>
  );
}
