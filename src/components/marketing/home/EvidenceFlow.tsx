"use client";

/**
 * Homepage workflow sequence: Define, Run, Review as product-accurate states.
 * Highlights one step at a time; respects prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    title: "Define the work",
    body: "Enter the role, outcomes, constraints, and skills that matter for the open role.",
    visual: (
      <div className="space-y-2">
        <div className="rounded-[10px] border border-[#D9DEE7] bg-white px-3 py-2">
          <p className="text-[10.5px] text-[#586273]">Role</p>
          <p className="text-[12px] font-semibold text-[#0B1020]">Solutions Engineer</p>
        </div>
        <div className="rounded-[10px] border border-[#D9DEE7] bg-white px-3 py-2">
          <p className="text-[10.5px] text-[#586273]">Outcome to evaluate</p>
          <p className="text-[12px] text-[#0B1020]">Honest fit against product capabilities</p>
        </div>
        <div className="w-fit rounded-[8px] bg-[#3157D5] px-3.5 py-1.5 text-[11.5px] font-semibold text-white">
          Continue to preview
        </div>
      </div>
    ),
  },
  {
    title: "Run the simulation",
    body: "Candidates investigate with documents, data, stakeholder messages, and permitted tools.",
    visual: (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-[10px] border border-[#D9DEE7] bg-white px-3 py-2">
          <p className="text-[12px] font-semibold text-[#0B1020]">Step 2 of 3 · Solve</p>
          <span className="rounded-md border border-[#D9DEE7] px-2 py-0.5 font-mono text-[10.5px] text-[#0B1020]">
            3:41
          </span>
        </div>
        <div className="rounded-[10px] border border-[#D9DEE7] bg-white px-3 py-2">
          <p className="text-[10.5px] text-[#586273]">Recommended architecture</p>
          <p className="text-[14px] font-semibold text-[#0B1020]">SSO + scheduled import</p>
        </div>
        <div className="rounded-[10px] border border-[#D9DEE7] bg-white px-3 py-2">
          <p className="text-[10.5px] text-[#586273]">To Alex Morgan</p>
          <p className="text-[11.5px] text-[#0B1020]">
            Did we promise real-time sync to this customer?
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Review the evidence",
    body: "Inspect competency evidence, the action timeline, AI use, and suggested follow-ups.",
    visual: (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-[10px] border border-[#D9DEE7] bg-white px-3 py-2">
          <p className="text-[12px] font-semibold text-[#0B1020]">Evidence report</p>
          <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 text-[10.5px] font-semibold text-[#3157D5]">
            Strong evidence
          </span>
        </div>
        <div className="rounded-[10px] border border-[#D9DEE7] bg-white px-3 py-2">
          <p className="text-[11.5px] text-[#0B1020]">
            Named the write-back gap, then verified what sales actually promised.
          </p>
        </div>
        <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <p className="text-[10.5px] text-emerald-800">3 cited actions · ready for interview review</p>
        </div>
      </div>
    ),
  },
];

export default function EvidenceFlow() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 2800);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div
      className="grid gap-4 md:grid-cols-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {STEPS.map((step, i) => (
        <button
          key={step.title}
          type="button"
          onClick={() => setActive(i)}
          className={`rounded-[12px] border p-5 text-left transition-all duration-300 ${
            i === active
              ? "border-[#3157D5]/40 bg-[#FCFCFA] shadow-[0_8px_24px_rgba(11,16,32,0.05)]"
              : "border-[#D9DEE7] bg-transparent opacity-80 hover:opacity-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${
                i === active ? "bg-[#3157D5] text-white" : "bg-[#F4F3EF] text-[#586273]"
              }`}
            >
              {i + 1}
            </span>
            <h3 className="text-[15px] font-semibold text-[#0B1020]">{step.title}</h3>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#586273]">{step.body}</p>
          <div className="mt-4">{step.visual}</div>
        </button>
      ))}
    </div>
  );
}
