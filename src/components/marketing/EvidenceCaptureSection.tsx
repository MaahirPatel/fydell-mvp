"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion, animate, motion } from "motion/react";
import CountUp from "@/components/motion/CountUp";

const CAPTURE_ITEMS = [
  "File saves and iteration across the repo",
  "Allowlisted commands run — reconcile, test, evals, preview",
  "Chat with Dana and Priya, and response timing",
  "Response to the board-meeting curveball",
  "Heartbeat gaps and technical interruptions",
  "The final, frozen submission",
];

const EVIDENCE_COUNTS = [
  { label: "Files edited", value: "6" },
  { label: "Reconciliation runs", value: "3" },
  { label: "Chat messages", value: "7" },
  { label: "Curveball response", value: "1" },
  { label: "Heartbeat gaps", value: "0" },
  { label: "Commands run", value: "11" },
];

const ACTIVITY = [
  { time: "09:12", text: "Loaded shipments.csv and carriers.csv" },
  { time: "12:47", text: "Ran reconcile.py — recovered 3 dropped rows" },
  { time: "18:03", text: "Responded to the board-meeting curveball" },
  { time: "24:11", text: "Submitted final work" },
];

function ProgressBar() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [width, setWidth] = useState(reduce ? 68 : 0);

  useEffect(() => {
    if (reduce) {
      setWidth(68);
      return;
    }
    if (!inView) return;
    const controls = animate(0, 68, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        setWidth(v);
      },
    });
    return () => controls.stop();
  }, [inView, reduce]);

  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-white/[0.42]">Session progress</span>
        <span className="text-[11px] font-semibold tabular-nums text-white">
          {Math.round(width)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#315CFF] to-[#7B5CFF]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function EvidenceCaptureSection() {
  const reduce = useReducedMotion();

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
      <div>
        <ul className="mt-2 space-y-0 border-t border-[var(--border-subtle)]">
          {CAPTURE_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3 border-b border-[var(--border-subtle)] py-3.5 text-[14px] leading-[1.55] text-[rgba(244,245,247,0.72)]">
              <span
                className="mt-[0.55em] h-px w-3 shrink-0 bg-[#5662FF]"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mkt-panel overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <p
            className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 500 }}
          >
            Evidence panel — in session
          </p>
        </div>

        <div className="grid gap-0 sm:grid-cols-2">
          <div className="space-y-2.5 border-b border-[var(--border-subtle)] px-5 py-5 sm:border-b-0 sm:border-r">
            {EVIDENCE_COUNTS.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-[rgba(244,245,247,0.62)]">{item.label}</span>
                <CountUp
                  value={item.value}
                  className="text-[13px] tabular-nums text-[#F4F5F7]"
                  duration={1.0}
                />
              </div>
            ))}
          </div>

          <div className="px-5 py-5">
            <p
              className="mb-3 text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
              style={{ fontWeight: 500 }}
            >
              Activity
            </p>
            <div className="space-y-3">
              {ACTIVITY.map((row, i) => (
                <motion.div
                  key={row.time}
                  className="flex gap-3"
                  initial={reduce ? false : { opacity: 0.35, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.45, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span className="w-10 shrink-0 text-[11px] tabular-nums text-[rgba(244,245,247,0.4)]">
                    {row.time}
                  </span>
                  <span className="text-[12px] leading-[1.5] text-[rgba(244,245,247,0.62)]">
                    {row.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border-subtle)] px-5 py-4">
          <ProgressBar />
          <p className="mt-2 text-[10px] text-[rgba(244,245,247,0.28)]">Auto-saved just now</p>
        </div>
      </div>
    </div>
  );
}
