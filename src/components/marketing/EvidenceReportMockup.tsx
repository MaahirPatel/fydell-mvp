"use client";

// ─── Data ─────────────────────────────────────────────────────────────────────

const TIMELINE = [
  { time: "09:12", action: "Opened data room and reviewed forecast export" },
  { time: "12:47", action: "Revised revenue growth assumption from 12% to 8.2%" },
  { time: "18:03", action: "Flagged elevated churn rate as a key risk" },
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
];

const ASSUMPTION_CHANGES = [
  { metric: "Revenue Growth", from: "12.0%", to: "8.2%" },
  { metric: "Churn Rate", from: "3.5%", to: "6.3%" },
  { metric: "Hiring Ramp", from: "100%", to: "84%" },
];

const MEMO_EXCERPT =
  "The base case revenue assumption of 12% does not reflect the recent renewal " +
  "data. Adjusting to 8.2% results in a materially tighter cash runway of 9.1 months " +
  "versus the 14-month baseline. Hiring ramp delays compound this risk. I recommend " +
  "probing the renewal pipeline before finalising Q3 headcount plans.";

const INTERVIEW_QUESTIONS = [
  "Walk me through how you arrived at the 8.2% revenue growth figure.",
  "What additional data would have changed your churn assumption?",
  "How did you weigh the cash runway risk against the hiring plan recommendation?",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function EvidenceReportMockup() {
  return (
    <div
      className="w-full overflow-hidden rounded-[20px] border border-white/[0.10] bg-[#080B12]"
      style={{ fontFamily: "var(--font-geist-sans, ui-sans-serif)" }}
    >
      {/* Report header */}
      <div className="border-b border-white/[0.08] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.10em] text-white/[0.38]">
              Hiring Evidence Report
            </p>
            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.015em] text-white">
              Project Meridian — FP&amp;A Work Trial
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-emerald-500/[0.25] bg-emerald-500/[0.10] px-3 py-1.5 text-[12px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Advance to interview
            </span>
            <p className="mt-1.5 text-[11px] text-white/[0.42]">
              Confidence: <span className="text-white/[0.70]">Medium</span>
            </p>
          </div>
        </div>
        <p className="mt-3 max-w-[560px] text-[13px] leading-[1.65] text-white/[0.55]">
          The candidate engaged substantively with the data room, revised key assumptions
          in response to new information, and produced a memo that connected evidence to
          recommendation. Interview is recommended to probe analytical rigour and
          communication clarity.
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {/* Left column */}
        <div className="divide-y divide-white/[0.06]">
          {/* Evidence timeline */}
          <div className="px-6 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              Evidence timeline
            </p>
            <ol className="space-y-3">
              {TIMELINE.map(({ time, action }) => (
                <li key={time} className="flex gap-3">
                  <span className="w-10 shrink-0 text-[11px] tabular-nums text-white/[0.35]">
                    {time}
                  </span>
                  <span className="text-[12px] leading-[1.55] text-white/[0.70]">
                    {action}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Assumption changes */}
          <div className="px-6 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              Assumptions changed
            </p>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Metric", "From", "To"].map((h) => (
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
                    <td className="py-2 text-white/[0.75]">{row.metric}</td>
                    <td className="py-2 tabular-nums text-white/[0.42]">{row.from}</td>
                    <td className="py-2 tabular-nums text-[#3B5BFF]">{row.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="divide-y divide-white/[0.06]">
          {/* What stood out */}
          <div className="px-6 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              What stood out
            </p>
            <ul className="space-y-2">
              {STOOD_OUT.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/[0.70]" />
                  <span className="text-[12px] leading-[1.6] text-white/[0.65]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* What needs review */}
          <div className="px-6 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              What needs review
            </p>
            <ul className="space-y-2">
              {NEEDS_REVIEW.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/[0.70]" />
                  <span className="text-[12px] leading-[1.6] text-white/[0.65]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Memo excerpt */}
          <div className="px-6 py-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              Final memo excerpt
            </p>
            <p className="border-l-2 border-white/[0.12] pl-3 text-[12px] leading-[1.7] text-white/[0.55] italic">
              {MEMO_EXCERPT}
            </p>
          </div>

          {/* Interview questions */}
          <div className="px-6 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
              Follow-up interview questions
            </p>
            <ol className="space-y-2.5 list-decimal pl-4">
              {INTERVIEW_QUESTIONS.map((q) => (
                <li key={q} className="text-[12px] leading-[1.6] text-white/[0.65]">
                  {q}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
