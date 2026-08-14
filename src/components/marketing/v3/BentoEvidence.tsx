"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import { EvidenceTrace } from "@/components/fydell/EvidenceTrace";
import { NORTHLINE_TRACE } from "@/lib/fixtures/northline";

gsap.registerPlugin(ScrollTrigger);

export function BentoEvidence() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".bento-card");
    
    cards.forEach((card, i) => {
      gsap.from(card, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
        },
      });
    });
  }, { scope: container });

  return (
    <section ref={container} className="relative py-24 md:py-40 px-6 max-w-7xl mx-auto">
      <div className="mb-16 md:mb-24 text-center">
        <h2 className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-medium tracking-tight text-[var(--color-ink)] max-w-3xl mx-auto">
          A realistic environment. <br className="hidden md:block" />
          A structured evidence record.
        </h2>
      </div>

      {/* AIDA Interest: Gapless Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 grid-rows-[auto] gap-4 grid-flow-dense">
        
        {/* Cell 1: Large left side (col-span-8) */}
        <div className="bento-card group relative flex flex-col justify-end md:col-span-8 md:row-span-2 min-h-[400px] md:min-h-[600px] rounded-[1.5rem] overflow-hidden bg-[var(--color-panel)] border border-[var(--color-line-2)] p-8 md:p-12">
          <div className="absolute inset-0 z-0 p-8 pt-12 opacity-60 mix-blend-luminosity grayscale-[40%]">
            <HeroSimPreview />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-panel)] via-[var(--color-panel)]/80 to-[var(--color-panel)]/10 z-10" />
          
          <div className="relative z-20 max-w-xl">
            <h3 className="text-[26px] font-medium tracking-tight text-[var(--color-ink)]">Work that resembles the job</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-ink-2)]">
              Not a multiple-choice quiz. Candidates receive a real business situation, imperfect sources, and a deadline. They filter records, compare time periods, and calculate rates in a dedicated workspace.
            </p>
          </div>
        </div>

        {/* Cell 2: Top right (col-span-4) */}
        <div className="bento-card group relative flex flex-col justify-end md:col-span-4 md:row-span-1 min-h-[300px] rounded-[1.5rem] overflow-hidden bg-[var(--color-raised)] border border-[var(--color-line-2)] p-6 md:p-8">
          <div className="absolute top-6 right-6 w-10 h-10 rounded-full border border-[var(--color-evidence)]/30 flex items-center justify-center bg-[var(--color-evidence)]/10 text-[var(--color-evidence)]">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          </div>
          
          <div className="absolute inset-x-0 top-16 px-6 opacity-40 mix-blend-screen overflow-hidden">
             <EvidenceTrace
              nodes={NORTHLINE_TRACE.slice(0, 3)}
              className="mt-3.5 hidden lg:block scale-90 origin-top-left"
              caption=""
            />
          </div>

          <div className="relative z-10">
            <h3 className="text-[20px] font-medium tracking-tight text-[var(--color-ink)]">See how they think</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink-2)]">
              The Evidence Notebook connects a calculation, source record, and candidate claim. Fydell captures the lineage of their reasoning.
            </p>
          </div>
        </div>

        {/* Cell 3: Bottom right (col-span-4) */}
        <div className="bento-card group relative flex flex-col justify-end md:col-span-4 md:row-span-1 min-h-[300px] rounded-[1.5rem] overflow-hidden bg-[var(--color-panel)] border border-[var(--color-changed)]/30 p-6 md:p-8">
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-changed)]/10 to-transparent z-0" />
          
          <div className="relative z-10">
            <h3 className="text-[20px] font-medium tracking-tight text-[var(--color-changed)]">Observe adaptation</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink-2)]">
              A stakeholder reveals a metric definition changed. Fydell preserves the revision delta: original conclusion, new information, updated reasoning.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
