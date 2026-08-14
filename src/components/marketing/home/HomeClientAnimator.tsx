"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function HomeClientAnimator({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    
    // Subtle entry animations for the hero text
    tl.from(".hero-text-anim", {
      y: 20,
      opacity: 0,
      duration: 1,
      stagger: 0.15,
      ease: "power3.out",
    });

    // Subtle scale-in with glow for the hero product scene
    tl.from(".hero-scene-anim", {
      scale: 0.95,
      opacity: 0,
      duration: 1.2,
      ease: "power4.out",
    }, "-=0.8");

    // Scroll trigger for the lower parts
    gsap.utils.toArray(".scroll-reveal").forEach((el: any) => {
      gsap.from(el, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
        }
      });
    });

  }, { scope: container });

  return <div ref={container}>{children}</div>;
}