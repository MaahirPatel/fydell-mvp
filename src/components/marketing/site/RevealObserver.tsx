"use client";

import { useEffect } from "react";

let mounted = 0;

/**
 * Fades `[data-reveal]` blocks in as they first scroll into view. Server HTML
 * is fully visible; this only arms the hidden state after hydration, leaves
 * anything already on screen alone, and does nothing for reduced motion.
 * `data-reveal="group"` staggers the element's direct children. Render it next
 * to any block that carries `data-reveal`; several instances share one flag.
 */
export default function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const fold = window.innerHeight;
    const below = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])")).filter((el) => {
      if (el.getBoundingClientRect().top < fold) {
        el.dataset.shown = "";
        return false;
      }
      return true;
    });

    mounted += 1;
    document.documentElement.dataset.mkMotion = "";

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset.shown = "";
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );
    below.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      mounted -= 1;
      if (mounted === 0) delete document.documentElement.dataset.mkMotion;
    };
  }, []);

  return null;
}
