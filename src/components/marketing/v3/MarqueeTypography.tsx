"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export function MarqueeTypography() {
  const container = useRef<HTMLDivElement>(null);
  const track1 = useRef<HTMLDivElement>(null);
  const track2 = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Continuous horizontal scroll
    gsap.to(track1.current, {
      xPercent: -50,
      ease: "none",
      duration: 30,
      repeat: -1,
    });
    
    gsap.to(track2.current, {
      xPercent: 50,
      ease: "none",
      duration: 35,
      repeat: -1,
    });
  }, { scope: container });

  const line1 = "ANALYTICAL REASONING - EVIDENCE DISCIPLINE - JUDGMENT UNDER AMBIGUITY - ADAPTABILITY - ";
  const line2 = "PROBLEM FRAMING - RISK AWARENESS - COMMUNICATION - DEFENDABLE CONCLUSIONS - ";

  return (
    <section ref={container} className="relative py-24 md:py-32 overflow-hidden flex flex-col gap-6 bg-[var(--color-canvas)] border-y border-[var(--color-line)]">
      
      <div className="w-[200vw] flex" style={{ marginLeft: "0vw" }}>
        <div ref={track1} className="flex whitespace-nowrap text-[clamp(2.5rem,6vw,5rem)] font-medium tracking-tight text-[var(--color-ink-3)] opacity-40">
          {line1.repeat(4)}
        </div>
      </div>
      
      <div className="w-[200vw] flex justify-end" style={{ marginLeft: "-100vw" }}>
        <div ref={track2} className="flex whitespace-nowrap text-[clamp(2.5rem,6vw,5rem)] font-medium tracking-tight text-[var(--color-ink-3)] opacity-40">
          {line2.repeat(4)}
        </div>
      </div>

      {/* Fade edges */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[var(--color-canvas)] via-transparent to-[var(--color-canvas)] w-full h-full" />
    </section>
  );
}
