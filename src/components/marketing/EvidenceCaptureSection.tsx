"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion, animate, motion } from "motion/react";
import CountUp from "@/components/motion/CountUp";

const CAPTURE_ITEMS = [
  "Documents opened and reviewed in the data room",
  "Model changes and assumption revisions",
  "Assumptions logged with sources",
  "Risks identified or missed",
  "AI tool usage and verification behavior",
  "Manager update response",
  "Final memo content and structure",
];

const EVIDENCE_COUNTS = [
  { label: "Documents opened", value: "7" },
  { label: "Assumptions changed", value: "4" },
  { label: "Risks flagged", value: "2" },
  { label: "AI prompts logged", value: "9" },
  { label: "Sources reviewed", value: "5" },
  { label: "Notes added", value: "3" },
];

const ACTIVITY = [
  { time: "09:12", text: "Opened forecast export" },
  { time: "12:47", text: "Revised revenue growth" },
  { time: "18:03", text: "Flagged churn risk" },
  { time: "24:11", text: "Submitted memo draft" },
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
        <ul className="mt-2 space-y-3.5">
          {CAPTURE_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[15px] leading-[1.55] text-white/[0.78]">
              <span
                className="mt-[0.55em] h-px w-3.5 shrink-0 bg-gradient-to-r from-[#315CFF] to-[#7B5CFF]"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="fydell-product-frame overflow-hidden">
        <div className="border-b border-white/[0.08] px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
            Evidence Panel — In Session
          </p>
        </div>

        <div className="grid gap-0 sm:grid-cols-2">
          <div className="space-y-2.5 border-b border-white/[0.06] px-5 py-5 sm:border-b-0 sm:border-r">
            {EVIDENCE_COUNTS.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-white/[0.52]">{item.label}</span>
                <CountUp
                  value={item.value}
                  className="text-[14px] font-semibold tabular-nums text-white"
                  duration={1.0}
                />
              </div>
            ))}
          </div>

          <div className="px-5 py-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/[0.38]">
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
                  <span className="w-10 shrink-0 text-[11px] tabular-nums text-white/[0.35]">
                    {row.time}
                  </span>
                  <span className="text-[12px] leading-[1.5] text-white/[0.68]">{row.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] px-5 py-4">
          <ProgressBar />
          <p className="mt-2 text-[10px] text-white/[0.30]">Auto-saved just now</p>
        </div>
      </div>
    </div>
  );
}
