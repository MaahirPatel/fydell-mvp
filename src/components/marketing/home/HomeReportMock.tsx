const STRENGTHS = [
  "Revised churn after reviewing renewal data",
  "Flagged the resulting runway reduction",
  "Conditioned the final recommendation",
];

const NEEDS = [
  "Did not test customer concentration",
  "Required prompting to reconcile bookings and revenue",
];

const QUESTIONS = [
  "What would make you reverse your recommendation?",
  "How would you distinguish temporary renewal timing from structural churn?",
];

export default function HomeReportMock() {
  return (
    <div
      className="overflow-hidden bg-[#090C12]"
      style={{ fontFamily: "var(--font-geist-sans, ui-sans-serif)" }}
      aria-hidden
    >
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <p
          className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
          style={{ fontWeight: 550 }}
        >
          Hiring evidence report
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-[16px] text-[var(--text-primary)]" style={{ fontWeight: 600 }}>
            Project Meridian — FP&amp;A Work Trial
          </h3>
          <div className="text-right">
            <p className="text-[12px] text-[var(--text-tertiary)]">
              Recommendation{" "}
              <span className="text-[var(--positive)]" style={{ fontWeight: 580 }}>
                Advance
              </span>
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">
              Confidence <span className="text-[var(--text-primary)]">Medium</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-[var(--border-subtle)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4 sm:border-b-0">
          <p
            className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
            style={{ fontWeight: 550 }}
          >
            Observed strengths
          </p>
          <ul className="mt-3 space-y-2.5">
            {STRENGTHS.map((s) => (
              <li key={s} className="text-[13px] leading-[1.45] text-[var(--text-secondary)]">
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="px-5 py-4">
          <p
            className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
            style={{ fontWeight: 550 }}
          >
            Needs review
          </p>
          <ul className="mt-3 space-y-2.5">
            {NEEDS.map((s) => (
              <li key={s} className="text-[13px] leading-[1.45] text-[var(--text-secondary)]">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--border-subtle)] px-5 py-4">
        <p
          className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
          style={{ fontWeight: 550 }}
        >
          Interview questions
        </p>
        <ol className="mt-3 space-y-2.5">
          {QUESTIONS.map((q, i) => (
            <li key={q} className="flex gap-2.5 text-[13px] leading-[1.45] text-[var(--text-secondary)]">
              <span className="tabular-nums text-[var(--text-tertiary)]">{i + 1}.</span>
              {q}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
