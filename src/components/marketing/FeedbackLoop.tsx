"use client";

// ─── Step data ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 1,
    label: "Work Trial",
    description: "Candidate completes a structured FP&A task in a timed environment.",
  },
  {
    id: 2,
    label: "Evidence Report",
    description: "Decisions, revisions, and AI usage are compiled into a hiring report.",
  },
  {
    id: 3,
    label: "Interview Feedback",
    description: "Interviewers use the report to ask targeted follow-up questions.",
  },
  {
    id: 4,
    label: "Hiring Decision",
    description: "The team makes a decision with documented evidence, not impressions.",
  },
  {
    id: 5,
    label: "30-Day Feedback",
    description: "Hiring managers record actual on-the-job performance at 30 days.",
  },
  {
    id: 6,
    label: "Signal Calibration",
    description: "Trial signals are compared against outcomes to improve future trials.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedbackLoop() {
  return (
    <div className="relative">
      {/* Step grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, i) => {
          const isLast = i === STEPS.length - 1;
          return (
            <div
              key={step.id}
              className="relative flex flex-col gap-3 rounded-[14px] border border-white/[0.08] bg-[#0A0E17] px-5 py-4"
            >
              {/* Step number + connector hint */}
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.05] text-[11px] font-semibold text-white/[0.55]">
                  {step.id}
                </span>
                {!isLast && (
                  <svg
                    className="hidden lg:block absolute -right-[7px] top-1/2 -translate-y-1/2 z-10"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M1 7h12M9 3l4 4-4 4"
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span
                  className={[
                    "text-[13px] font-semibold",
                    isLast ? "text-[#3B5BFF]" : "text-white",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>
              <p className="text-[12px] leading-[1.6] text-white/[0.50]">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mobile connecting arrows between cards */}
      <div className="pointer-events-none absolute left-5 top-0 h-full sm:hidden">
        <div className="h-full border-l border-dashed border-white/[0.08]" />
      </div>
    </div>
  );
}
