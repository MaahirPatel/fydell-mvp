"use client";

import { useEffect, useRef, useState } from "react";
import s from "./proof-strip.module.css";

/**
 * Proof strip: ONLY real numbers, each sourced from the repo.
 *
 *  - 8 authored scenario definitions - src/lib/sim-engine/scenarios/catalog.ts (SCENARIO_BY_ID)
 *  - 6 role families - the six scenario directories under src/lib/sim-engine/scenarios/
 *  - 20 minutes - the released public evaluation's working time (src/lib/fixtures/northline.ts)
 *  - $49 per completed simulation - the published Starter price (src/lib/marketing/pricing.ts)
 *
 * When the catalog grows, update this list by hand; never invent a number.
 */
const METRICS = [
  { value: 8, prefix: "", suffix: "", label: "Authored simulation scenarios", sub: "In the engine catalog today" },
  { value: 6, prefix: "", suffix: "", label: "Role families covered", sub: "From data analyst to applied AI engineer" },
  { value: 20, prefix: "", suffix: " min", label: "The released public evaluation", sub: "One sitting, progress saves" },
  { value: 49, prefix: "$", suffix: "", label: "Per completed simulation", sub: "Starter plan · no seats, no fee" },
] as const;

function useInViewOnce<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

function CountUp({ to, start, prefix, suffix }: { to: number; start: boolean; prefix: string; suffix: string }) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [n, setN] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!start || reduced) return;
    const t0 = performance.now();
    const dur = 900;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, reduced, to]);
  return (
    <span className={s.figure} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {n}
      {suffix}
    </span>
  );
}

export default function ProofStrip() {
  const [ref, seen] = useInViewOnce<HTMLDivElement>();
  return (
    <div ref={ref} className={s.strip} role="region" aria-label="Fydell in numbers, from the product itself">
      {METRICS.map((m) => (
        <div key={m.label} className={s.cell}>
          <CountUp to={m.value} start={seen} prefix={m.prefix} suffix={m.suffix} />
          <p className={s.label}>{m.label}</p>
          <p className={s.sub}>{m.sub}</p>
        </div>
      ))}
      <p className={s.source}>Numbers from the product and the published price list. Not a survey, not a projection.</p>
    </div>
  );
}
