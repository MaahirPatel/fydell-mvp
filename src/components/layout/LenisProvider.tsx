"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export default function LenisProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.12,
        duration: 1.1,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.1,
        syncTouch: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}
