"use client";

import { motion, useReducedMotion } from "motion/react";

const STEPS = [
  {
    id: 1,
    label: "Work Trial",
    description: "Candidate completes a structured FP&A task in a timed environment.",
    artifact: "Session Active",
  },
  {
    id: 2,
    label: "Evidence Report",
    description: "Decisions, revisions, and AI usage are compiled into a hiring report.",
    artifact: "Report Ready",
  },
  {
    id: 3,
    label: "Interview Feedback",
    description: "Interviewers use the report to ask targeted follow-up questions.",
    artifact: "Evidence Captured",
  },
  {
    id: 4,
    label: "Hiring Decision",
    description: "The team makes a decision with documented evidence, not impressions.",
    artifact: "Advance to Interview",
  },
  {
    id: 5,
    label: "30-Day Feedback",
    description: "Hiring managers record early on-the-job performance.",
    artifact: "Review Further",
  },
  {
    id: 6,
    label: "Signal Calibration",
    description: "Trial signals are compared against outcomes to improve future trials.",
    artifact: "Evidence Captured",
  },
];

export default function FeedbackLoop() {
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.id}
            className="relative flex flex-col gap-3 rounded-[14px] border border-white/[0.09] bg-[#0B0F18] px-5 py-4"
            initial={reduce ? false : { opacity: 0.45, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.05] text-[11px] font-semibold text-white/[0.55]">
                {step.id}
              </span>
              <span className="text-[13px] font-semibold text-white">{step.label}</span>
            </div>
            <p className="text-[12px] leading-[1.6] text-white/[0.50]">{step.description}</p>
            <div className="mt-auto">
              <span className="inline-flex rounded-full border border-white/[0.10] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-white/[0.55]">
                {step.artifact}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <svg
                className="pointer-events-none absolute -right-[8px] top-1/2 z-10 hidden -translate-y-1/2 lg:block"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 8h11M10 4l4 4-4 4"
                  stroke="url(#loop-grad)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="loop-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop stopColor="#315CFF" stopOpacity="0.7" />
                    <stop offset="1" stopColor="#7B5CFF" stopOpacity="0.5" />
                  </linearGradient>
                </defs>
              </svg>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
