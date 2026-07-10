"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/** Marketing scroll provider — native browser scroll (no Lenis). */
export default function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove(
      "lenis",
      "lenis-smooth",
      "lenis-scrolling",
      "lenis-stopped",
      "lenis-relative",
    );
  }, []);

  return <>{children}</>;
}
