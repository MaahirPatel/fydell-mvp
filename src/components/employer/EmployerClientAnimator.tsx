"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export default function EmployerClientAnimator({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.from(".employer-anim-stagger > *", {
      y: 15,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "power2.out"
    });

  }, { scope: container });

  return <div ref={container} className="employer-anim-stagger">{children}</div>;
}