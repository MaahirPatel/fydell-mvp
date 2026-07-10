"use client";

import { motion, useReducedMotion } from "motion/react";

const TIMELINE = [
  { time: "09:12", action: "Opened data room and reviewed forecast export" },
  { time: "12:47", action: "Revised revenue growth assumption from 12% to 8.2%" },
  { time: "18:03", action: "Flagged elevated churn rate as a key risk" },
  { time: "21:40", action: "Logged AI prompt and verified source citations" },
  { time: "24:11", action: "Submitted memo draft with supporting rationale" },
];

const STOOD_OUT = [
  "Proactively revised assumptions after reviewing the customer renewal note.",
  "Identified cash runway risk independently, without manager prompting.",
  "Memo connected data room evidence to recommendation clearly.",
];

const NEEDS_REVIEW = [
  "Churn assumption revised upward — ask about the customer cohort data used.",
  "Sales cycle extended without source cited in assumptions log.",
  "Sensitivity analysis could better isolate top 2–3 drivers.",
];

const ASSUMPTION_CHANGES = [
  { metric: "Revenue Growth", from: "12.0%", to: "8.2%", delta: "−3.8pp" },
  { metric: "Gross Margin", from: "45.0%", to: "42.1%", delta: "−2.9pp" },
  { metric: "Churn Rate", from: "3.5%", to: "6.3%", delta: "+2.8pp" },
  { metric: "Hiring Ramp", from: "100%", to: "84%", delta: "−16pp" },
  { metric: "OpEx Growth", from: "8%", to: "11%", delta: "+3pp" },
  { metric: "Cash Runway", from: "14.0 mo", to: "9.1 mo", delta: "−4.9 mo" },
];

const MEMO_EXCERPT =
  "The base case revenue assumption of 12% does not reflect the recent renewal " +
  "data. Adjusting to 8.2% results in a materially tighter cash runway of 9.1 months " +
  "versus the 14-month baseline. Hiring ramp delays compound this risk. I recommend " +
  "probing the renewal pipeline before finalising Q3 headcount plans.";

const INTERVIEW_QUESTIONS = [
  "Walk me through how you updated the revenue growth assumption.",
  "Which data points most influenced your churn rate adjustment?",
  "How would you stress-test the roadmap under a downside revenue scenario?",
];

export default function EvidenceReportMockup() {
  const reduce = useReducedMotion();

  return (
    <div
      className="fydell-product-frame w-full overflow-hidden"
      style={{ fontFamily: "var(--font-geist-sans, ui-sans-serif)" }}
    >
      <div className="relative border-b border-white/[0.08] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-white/[0.38]">
              Hiring Evidence Report
            </p>
            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white">
              Project Meridian — FP&amp;A Work Trial
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#36D68A]/[0.24] bg-[#36D68A]/[0.10] px-3 py-1.5 text-[12px] font-semibold text-[#6EE7B7]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#36D68A]" />
              Advance to Interview
            </span>
            <p className="mt-1.5 text-[11px] text-white/[0.42]">
              Confidence: <span className="text-white/[0.70]">Medium</span>
            </p>
            <p className="mt-1 text-[11px] font-medium text-white/[0.50]">Report Ready</p>
          </div>
        </div>
        <p className="mt-3 max-w-[640px] text-[13px] leading-[1.65] text-white/[0.55]">
          The candidate engaged substantively with the data room, revised key assumptions in
          response to new information, and produced a memo that connected evidence to
          recommendation. Interview is recommended to probe analytical rigour and communication
          clarity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-white/[0.06]">
        <div className="divide-y divide-white/[0.06]">
          <div className="px-6 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              Evidence Timeline
            </p>
            <ol className="relative space-y-3 border-l border-white/[0.08] pl-4">
              {TIMELINE.map(({ time, action }, i) => (
                <motion.li
                  key={time}
                  className="relative"
                  initial={reduce ? false : { opacity: 0.4, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-[#4B6FFF]" />
                  <div className="flex gap-3">
                    <span className="w-10 shrink-0 text-[11px] tabular-nums text-white/[0.35]">
                      {time}
                    </span>
                    <span className="text-[12px] leading-[1.55] text-white/[0.70]">{action}</span>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>

          <div className="px-6 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              Assumptions Changed
            </p>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Metric", "From", "To", "Δ"].map((h) => (
                    <th
                      key={h}
                      className="pb-2 text-left text-[10px] font-medium uppercase tracking-[0.07em] text-white/[0.35]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ASSUMPTION_CHANGES.map((row) => (
                  <tr key={row.metric} className="border-b border-white/[0.04]">
                    <td className="py-2.5 text-white/[0.75]">{row.metric}</td>
                    <td className="py-2.5 tabular-nums text-white/[0.42]">{row.from}</td>
                    <td className="py-2.5 tabular-nums text-[#4B6FFF]">{row.to}</td>
                    <td
                      className={`py-2.5 tabular-nums ${
                        row.delta.startsWith("+") ? "text-[#FF4D6D]" : "text-white/[0.55]"
                      }`}
                    >
                      {row.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="divide-y divide-white/[0.06]">
          <div className="px-6 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              What Stood Out
            </p>
            <ul className="space-y-2">
              {STOOD_OUT.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#36D68A]/[0.80]" />
                  <span className="text-[12px] leading-[1.6] text-white/[0.65]">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              What Needs Review
            </p>
            <ul className="space-y-2">
              {NEEDS_REVIEW.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E9B949]/[0.80]" />
                  <span className="text-[12px] leading-[1.6] text-white/[0.65]">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 py-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              Final Memo Excerpt
            </p>
            <p className="border-l-2 border-white/[0.12] pl-3 text-[12px] leading-[1.7] text-white/[0.55] italic">
              {MEMO_EXCERPT}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.08] px-6 py-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
          Follow-up Interview Questions
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {INTERVIEW_QUESTIONS.map((q, i) => (
            <motion.div
              key={q}
              className="rounded-[12px] border border-white/[0.10] bg-white/[0.025] px-4 py-3"
              initial={reduce ? false : { opacity: 0.5, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="text-[10px] font-semibold text-white/[0.35]">Q{i + 1}</span>
              <p className="mt-1.5 text-[12px] leading-[1.55] text-white/[0.72]">{q}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
