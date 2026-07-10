"use client";

import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Linear-like smooth scroll.
 * Runtime evidence: Lenis was active but felt harsh (single wheel tick jumped ~400px)
 * because duration+lerp mixed, overflow-x:hidden created a second scrollport,
 * and ambient blur/grain kept painting during scroll.
 */
function ScrollDebugProbe() {
  // #region agent log
  useLenis((lenis) => {
    const w = window as unknown as {
      __fydellLenis?: typeof lenis;
      __fydellScrollLogged?: boolean;
      __fydellScrollSamples?: Array<Record<string, number | boolean | null>>;
    };
    w.__fydellLenis = lenis;

    if (!w.__fydellScrollLogged) {
      w.__fydellScrollLogged = true;
      w.__fydellScrollSamples = [];
      fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dc0a6c" },
        body: JSON.stringify({
          sessionId: "dc0a6c",
          runId: "post-fix-2",
          hypothesisId: "SCROLL",
          location: "LenisProvider.tsx:useLenis",
          message: "Lenis instance ready",
          data: {
            hasLenis: Boolean(lenis),
            options: {
              lerp: lenis.options.lerp,
              smoothWheel: lenis.options.smoothWheel,
              wheelMultiplier: lenis.options.wheelMultiplier,
              autoRaf: lenis.options.autoRaf,
              duration: lenis.options.duration ?? null,
            },
            htmlClass: document.documentElement.className,
            bodyOverflow: getComputedStyle(document.body).overflow,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }

    const samples = w.__fydellScrollSamples;
    if (samples && samples.length < 40) {
      samples.push({
        t: Date.now(),
        scroll: Math.round(lenis.scroll * 10) / 10,
        velocity: Math.round(lenis.velocity * 100) / 100,
        isScrolling: Boolean(lenis.isScrolling),
      });
      if (samples.length === 12 || samples.length === 40) {
        fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dc0a6c" },
          body: JSON.stringify({
            sessionId: "dc0a6c",
            runId: "post-fix-2",
            hypothesisId: "SCROLL_SAMPLES",
            location: "LenisProvider.tsx:scroll",
            message: "Lenis scroll sample batch",
            data: {
              count: samples.length,
              samples: samples.slice(-12),
              htmlClass: document.documentElement.className,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
    }
  });
  // #endregion
  return null;
}

export default function LenisProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    document.documentElement.classList.add("lenis");
  }, []);

  if (reduce) {
    return <>{children}</>;
  }

  return (
    <ReactLenis
      root
      options={{
        // Lower lerp = longer glide (Linear-like). No duration on wheel path.
        lerp: 0.055,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.72,
        touchMultiplier: 1.1,
        autoRaf: true,
        anchors: true,
        overscroll: true,
      }}
    >
      <ScrollDebugProbe />
      {children}
    </ReactLenis>
  );
}
