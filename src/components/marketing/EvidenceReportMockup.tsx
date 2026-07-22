"use client";

import { motion, useReducedMotion } from "motion/react";

const TIMELINE = [
  { time: "09:12", action: "Loaded the three CSVs and checked the join keys before building anything" },
  { time: "12:47", action: "Found the ID-format mismatch; wrote reconcile.py to recover 3 dropped rows" },
  { time: "18:03", action: "Board-meeting curveball revealed — Priya needs it a day earlier" },
  { time: "21:40", action: "Told Dana what was cut and confirmed the reduced scope before shipping" },
  { time: "24:11", action: "Submitted the frozen final snapshot" },
];

const STOOD_OUT = [
  "Caught the naive-join bug unprompted and reconciled it before trusting the late-rate number.",
  "Named the Dana/Priya scope conflict explicitly instead of silently picking one deliverable.",
  "Told the customer what was cut when the deadline moved, instead of quietly descoping.",
];

const NEEDS_REVIEW = [
  "Handoff doesn't name what specifically stayed out of scope after the cut — ask directly.",
  "No verification note on the AI-drafted query before it shipped — ask how they checked it.",
  "Single preview run before the scope cut, none after — confirm this was deliberate.",
];

const TRAIT_FINDINGS = [
  { trait: "Data integrity vigilance", bucket: "Strong evidence", note: "Found and recovered the records the naive join was dropping." },
  { trait: "Contradiction handling", bucket: "Strong evidence", note: "Named the Dana/Priya conflict in chat." },
  { trait: "Prioritization under pressure", bucket: "Strong evidence", note: "Cut polish first, kept the numbers, after the curveball." },
  { trait: "Scope renegotiation", bucket: "Needs review", note: "Told Dana the deadline moved; didn't name what was cut." },
  { trait: "AI tool judgment", bucket: "Limited evidence", note: "Used the assist once; verification isn't in the handoff." },
];

const HANDOFF_EXCERPT =
  "The reported late rate was materially understated — the join was silently dropping delay " +
  "records where the two sources disagreed. I fixed the join and re-ran the numbers. I didn't " +
  "get to a full root-cause breakdown by carrier before the deadline moved; that's the one " +
  "thing I'd flag as unverified, not finished.";

const INTERVIEW_QUESTIONS = [
  "Walk me through how you found the dropped-rows bug.",
  "What would you have cut next if you'd had five fewer minutes?",
  "How would you have handled Dana and Priya wanting different deliverables?",
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
              Project Relay — Northbeam Logistics Deployment
            </h2>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#36D68A]/[0.24] bg-[#36D68A]/[0.10] px-3 py-1.5 text-[12px] font-semibold text-[#6EE7B7]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#36D68A]" />
              Advance
            </span>
            <p className="mt-1.5 text-[11px] text-white/[0.42]">
              Fit score: <span className="text-white/[0.70]">74/100 · design-weighted</span>
            </p>
            <p className="mt-1 text-[11px] font-medium text-white/[0.50]">Receipt Ready</p>
          </div>
        </div>
        <p className="mt-3 max-w-[640px] text-[13px] leading-[1.65] text-white/[0.55]">
          The FDE caught a real data-integrity bug unprompted, named a stakeholder conflict instead
          of guessing, and adapted when the deadline moved. Advance to interview is recommended, with
          a few gaps worth probing directly — the fit score is context, not the verdict.
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
              Trait Findings — 5 of 10
            </p>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Trait", "Bucket", "Note"].map((h) => (
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
                {TRAIT_FINDINGS.map((row) => (
                  <tr key={row.trait} className="border-b border-white/[0.04]">
                    <td className="py-2.5 text-white/[0.75]">{row.trait}</td>
                    <td className="py-2.5 tabular-nums text-[#4B6FFF]">{row.bucket}</td>
                    <td className="py-2.5 text-white/[0.42]">{row.note}</td>
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
              Handoff Notes Excerpt
            </p>
            <p className="border-l-2 border-white/[0.12] pl-3 text-[12px] leading-[1.7] text-white/[0.55] italic">
              {HANDOFF_EXCERPT}
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
