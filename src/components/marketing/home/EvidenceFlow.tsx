"use client";

/**
 * Invite → Work → Evidence sequence using Northline ops-yield truth.
 * Neutral selection; no violet numbered orbs or decorative pills.
 */
import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    title: "Invite",
    body: "Open one Data Analyst cohort and send a secure invitation to a specific candidate.",
    visual: (
      <div className="space-y-2 text-[12.5px]">
        <div className="rounded-[10px] border border-[var(--border-subtle)] px-3 py-2">
          <p className="text-white/40">Evaluation</p>
          <p className="mt-0.5 font-medium text-white">Operations performance investigation</p>
        </div>
        <div className="rounded-[10px] border border-[var(--border-subtle)] px-3 py-2">
          <p className="text-white/40">Candidate</p>
          <p className="mt-0.5 text-white/75">candidate@example.com</p>
        </div>
        <div className="inline-flex rounded-[6px] bg-[var(--fydell-action)] px-3 py-1.5 text-[12px] font-medium text-[#090A0D]">
          Create invitation
        </div>
      </div>
    ),
  },
  {
    title: "Work",
    body: "The candidate investigates Northline yield data, asks one useful question, and submits an artifact.",
    visual: (
      <div className="space-y-2 text-[12.5px]">
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--border-subtle)] px-3 py-2">
          <p className="font-medium text-white">production_runs.csv</p>
          <span className="tabular-nums text-white/50">19:42</span>
        </div>
        <div className="rounded-[10px] border border-[var(--border-subtle)] px-3 py-2">
          <p className="text-white/40">Working conclusion</p>
          <p className="mt-0.5 text-white/75">HOLD_RECLASS mid-period; residual risk on L2 Day</p>
        </div>
      </div>
    ),
  },
  {
    title: "Evidence",
    body: "Employers open claims to sources. Limitations stay visible. Decisions stay human.",
    visual: (
      <div className="space-y-2 text-[12.5px]">
        <div className="relative rounded-[10px] border border-[var(--border-subtle)] py-2 pl-3 pr-2 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-[var(--fydell-evidence)]">
          <p className="font-medium text-white">Primary driver named</p>
          <p className="mt-0.5 text-white/55">Citation: reporting-change note</p>
        </div>
        <div className="rounded-[10px] border border-[var(--border-subtle)] px-3 py-2 text-white/55">
          Review status: unreviewed · influence unset
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
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 3200);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div
      className="grid gap-3 md:grid-cols-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {STEPS.map((step, i) => {
        const on = i === active;
        return (
          <button
            key={step.title}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-[14px] border p-4 text-left transition ${
              on
                ? "border-white/25 bg-white/[0.05]"
                : "border-[var(--border-subtle)] bg-transparent opacity-75 hover:opacity-100"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-[6px] border text-[11px] font-medium ${
                  on
                    ? "border-white/30 bg-white/[0.1] text-white"
                    : "border-[var(--border-subtle)] text-white/45"
                }`}
              >
                {i + 1}
              </span>
              <h3 className="text-[14px] font-semibold text-white">{step.title}</h3>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-white/50">{step.body}</p>
            <div className="mt-4">{step.visual}</div>
          </button>
        );
      })}
    </div>
  );
}
