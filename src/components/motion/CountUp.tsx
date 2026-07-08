"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion, animate } from "motion/react";

/**
 * Animated metric count-up. Parses a string like "70%", "2x", "89%" into a
 * numeric target plus prefix/suffix, then animates the number once it scrolls
 * into view. Motivation: feedback that draws attention to the headline metrics.
 * Collapses to the final value instantly under prefers-reduced-motion.
 */
export default function CountUp({
  value,
  className,
  duration = 1.4
}: {
  value: string;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  const match = value.match(/^([^\d.-]*)(-?[\d.]+)(.*)$/);
  const prefix = match?.[1] ?? "";
  const target = match ? parseFloat(match[2]) : NaN;
  const suffix = match?.[3] ?? "";
  const decimals = match && match[2].includes(".") ? match[2].split(".")[1].length : 0;

  const [display, setDisplay] = useState(() =>
    reduce || Number.isNaN(target) ? value : `${prefix}0${suffix}`
  );

  useEffect(() => {
    if (Number.isNaN(target)) {
      setDisplay(value);
      return;
    }
    if (reduce) {
      setDisplay(value);
      return;
    }
    if (!inView) return;

    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(latest) {
        setDisplay(`${prefix}${latest.toFixed(decimals)}${suffix}`);
      }
    });

    return () => controls.stop();
  }, [inView, reduce, target, prefix, suffix, decimals, duration, value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
