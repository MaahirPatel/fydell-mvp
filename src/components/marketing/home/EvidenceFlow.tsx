"use client";

/**
 * Section 3 of the landing page: Invite, Work, Evidence as an animated
 * horizontal sequence. Highlights one step at a time; respects
 * prefers-reduced-motion; each frame is readable as a still.
 */
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    title: "Invite",
    body: "Select a role and send a candidate a private link.",
    visual: (
      <div className="space-y-2">
        <div className="rounded-lg border border-white/[0.08] bg-[#0B0E15] px-3 py-2">
          <p className="text-[10.5px] text-white/40">Simulation</p>
          <p className="text-[12px] font-semibold text-white">The Missing Delays · Data Analyst</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-[#0B0E15] px-3 py-2">
          <p className="text-[10.5px] text-white/40">Candidate</p>
          <p className="text-[12px] text-white/75">jordan@example.com</p>
        </div>
        <div className="w-fit rounded-lg bg-violet-500 px-3.5 py-1.5 text-[11.5px] font-semibold text-white">
          Send invitation
        </div>
      </div>
    ),
  },
  {
    title: "Work",
    body: "The candidate solves one realistic problem using the provided resources.",
    visual: (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#0B0E15] px-3 py-2">
          <p className="text-[12px] font-semibold text-white">Step 2 of 3 · Solve</p>
          <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[10.5px] text-white/70">3:41</span>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-[#0B0E15] px-3 py-2">
          <p className="text-[10.5px] text-white/40">Corrected delayed revenue</p>
          <p className="text-[14px] font-semibold text-white">$1,300</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-[#0B0E15] px-3 py-2">
          <p className="text-[10.5px] text-white/40">To Dana Whitfield</p>
          <p className="text-[11.5px] text-white/70">Do the hyphens in the order IDs mean anything?</p>
        </div>
      </div>
    ),
  },
  {
    title: "Evidence",
    body: "Fydell connects the result to the actions and decisions behind it.",
    visual: (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#0B0E15] px-3 py-2">
          <p className="text-[12px] font-semibold text-white">Evidence report</p>
          <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10.5px] font-semibold text-violet-300">
            Strong evidence
          </span>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-[#0B0E15] px-3 py-2">
          <p className="text-[11.5px] text-white/70">Identified the ID format defect, then verified the corrected number with the stakeholder.</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
          <p className="text-[10.5px] text-emerald-300">3 cited actions · report ready in minutes</p>
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
          className={`rounded-2xl border p-5 text-left transition-all duration-300 ${
            i === active
              ? "border-violet-500/40 bg-white/[0.04]"
              : "border-white/[0.07] bg-white/[0.02] opacity-70 hover:opacity-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${
                i === active ? "bg-violet-500 text-white" : "bg-white/[0.07] text-white/50"
              }`}
            >
              {i + 1}
            </span>
            <h3 className="text-[15px] font-semibold text-white">{step.title}</h3>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">{step.body}</p>
          <div className="mt-4">{step.visual}</div>
        </button>
      ))}
    </div>
  );
}
