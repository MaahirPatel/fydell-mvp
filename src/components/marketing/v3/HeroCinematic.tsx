"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ButtonLink } from "@/components/marketing/ui";
import HeroEvidenceScene from "@/components/marketing/home/HeroEvidenceScene";

gsap.registerPlugin(ScrollTrigger);

export function HeroCinematic() {
  const container = useRef<HTMLDivElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const ctaGroup = useRef<HTMLDivElement>(null);
  const imageWrap = useRef<HTMLDivElement>(null);
  const imageInner = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // 1. Initial Load Stagger
    const tl = gsap.timeline();
    tl.from(headline.current, {
      y: 40,
      opacity: 0,
      duration: 1.2,
      ease: "power4.out",
    })
      .from(
        ctaGroup.current,
        {
          y: 20,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
        },
        "-=0.8"
      )
      .from(
        imageWrap.current,
        {
          scale: 0.85,
          opacity: 0,
          duration: 1.6,
          ease: "power4.out",
        },
        "-=0.9"
      );

    // 2. Scroll Physics (Scale up slightly as scrolling, then fade out)
    gsap.to(imageInner.current, {
      scale: 1.05,
      y: -40,
      ease: "none",
      scrollTrigger: {
        trigger: imageWrap.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });

    gsap.to(imageWrap.current, {
      opacity: 0.1,
      ease: "none",
      scrollTrigger: {
        trigger: container.current,
        start: "top top",
        end: "bottom center",
        scrub: true,
      },
    });
  }, { scope: container });

  return (
    <section ref={container} className="relative pt-[140px] md:pt-[180px] pb-16 flex flex-col items-center justify-center min-h-[90vh]">
      
      {/* 
        AIDA Attention: Cinematic Center. 
        Math Verification: max-w-5xl ensures H1 never exceeds 2-3 lines. 
      */}
      <div className="w-full max-w-5xl px-6 mx-auto text-center relative z-10 flex flex-col items-center">
        <h1 
          ref={headline}
          className="text-[clamp(2.75rem,5vw,5.5rem)] leading-[1.05] tracking-tight font-medium text-[var(--color-ink)]"
        >
          See the work before you make{" "}
          <span
            className="inline-block align-middle w-[90px] h-[48px] md:w-[130px] md:h-[64px] rounded-full mx-3 bg-cover bg-center shadow-[inset_0_2px_12px_rgba(255,255,255,0.15)]"
            style={{
              backgroundImage: "url('https://picsum.photos/seed/fydell-work-4/600/300')",
              filter: "grayscale(30%) contrast(1.1)",
            }}
          />
          the hire.
        </h1>
        
        <p className="mt-8 max-w-[48ch] text-[17px] md:text-[19px] leading-[1.6] text-[var(--color-ink-2)]">
          Candidates investigate real problems, cite their sources, and defend conclusions when facts change. You inspect the evidence behind every claim.
        </p>

        <div ref={ctaGroup} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href="/signup" variant="primary" className="h-12 px-6 text-[15px] font-medium">
            Create workspace
          </ButtonLink>
          <ButtonLink href="/request-pilot" variant="secondary" className="h-12 px-6 text-[15px] font-medium">
            Request a pilot
          </ButtonLink>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-6 mt-16 md:mt-24 relative z-0">
        <div 
          ref={imageWrap}
          className="relative w-full rounded-[1.5rem] border border-[var(--color-line-2)] shadow-[0_32px_80px_rgba(0,0,0,0.5)] bg-[var(--color-panel)]"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-action-hover)]/10 to-[var(--color-verified)]/10 z-0 mix-blend-screen pointer-events-none rounded-[1.5rem]" />
          
          <div ref={imageInner} className="relative z-10 w-full overflow-hidden rounded-[1.5rem]">
            <HeroEvidenceScene />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-canvas)] to-transparent z-20 opacity-40 pointer-events-none rounded-[1.5rem]" />
        </div>
      </div>

    </section>
  );
}
