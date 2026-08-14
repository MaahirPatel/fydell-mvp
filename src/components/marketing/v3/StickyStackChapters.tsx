"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";
import { ReportInspector } from "@/components/fydell/ReportInspector";
import { ProductStage } from "@/components/fydell/ProductStage";

gsap.registerPlugin(ScrollTrigger);

export function StickyStackChapters() {
  const container = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const chapters = [
    {
      title: "Inspect every assessment",
      desc: "An employer capability finding with expandable source citations. Fydell does not ask you to trust a black-box score.",
      color: "var(--color-ink)",
      bg: "https://picsum.photos/seed/fydell-inspect/1200/800",
    },
    {
      title: "Defend the work",
      desc: "Targeted oral-defense questions generated directly from the candidate's actual recommendation.",
      color: "var(--color-verified)",
      bg: "https://picsum.photos/seed/fydell-defend/1200/800",
    },
    {
      title: "Carry proof forward",
      desc: "The candidate-controlled Work Receipt. Capability evidence and privacy controls, verifying demonstrated ability.",
      color: "var(--color-action)",
      bg: "https://picsum.photos/seed/fydell-receipt/1200/800",
    },
    {
      title: "Improve with outcomes",
      desc: "The evaluation-to-post-hire calibration loop. Fydell learns which observed behaviors actually predict success.",
      color: "var(--color-good)",
      bg: "https://picsum.photos/seed/fydell-outcomes/1200/800",
    }
  ];

  useGSAP(() => {
    if (reduce || !container.current) return;
    
    const cardEls = gsap.utils.toArray<HTMLElement>(".stack-chapter");
    
    cardEls.forEach((card, i) => {
      if (i === cardEls.length - 1) return;
      
      ScrollTrigger.create({
        trigger: card,
        start: "top top",
        endTrigger: cardEls[cardEls.length - 1],
        end: "top top",
        pin: true,
        pinSpacing: false,
      });
      
      gsap.to(card, {
        scale: 0.92,
        opacity: 0.3,
        ease: "none",
        scrollTrigger: {
          trigger: cardEls[i + 1],
          start: "top bottom",
          end: "top top",
          scrub: true,
        },
      });
    });
  }, { scope: container, dependencies: [reduce] });

  return (
    <div ref={container} className="relative w-full bg-[var(--color-canvas)]">
      {chapters.map((ch, i) => (
        <div
          key={i}
          className="stack-chapter sticky top-0 min-h-[100dvh] flex items-center justify-center px-6"
        >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center bg-[var(--color-raised)] p-8 md:p-16 rounded-[2rem] border border-[var(--color-line-2)] shadow-[0_32px_80px_rgba(0,0,0,0.4)]">
            
            <div>
              <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-medium tracking-tight leading-[1.1]" style={{ color: ch.color }}>
                {ch.title}
              </h2>
              <p className="mt-6 text-[16px] md:text-[18px] leading-[1.6] text-[var(--color-ink-2)] max-w-md">
                {ch.desc}
              </p>
            </div>

            <div className="relative aspect-[4/3] w-full rounded-[1rem] overflow-hidden border border-[var(--color-line-3)] bg-[var(--color-canvas)]">
              {i === 0 ? (
                <div className="absolute inset-0 p-6 scale-90 origin-top-left opacity-90">
                  <ProductStage title="Report" source="Fydell" label="Report">
                    <ReportInspector />
                  </ProductStage>
                </div>
              ) : (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
                  style={{ backgroundImage: `url('${ch.bg}')` }}
                />
              )}
            </div>
            
          </div>
        </div>
      ))}
    </div>
  );
}
