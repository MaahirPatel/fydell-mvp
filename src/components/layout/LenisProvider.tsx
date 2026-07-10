"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Marketing scroll provider — native scroll only.
 * Debug probe measures paint-cost sources that make wheel feel sticky.
 */
function ScrollDebugProbe() {
  // #region agent log
  useEffect(() => {
    const countExpensive = () => {
      const items: Array<{ tag: string; reasons: string[] }> = [];
      for (const el of document.querySelectorAll("*")) {
        const s = getComputedStyle(el);
        const reasons: string[] = [];
        if (s.backdropFilter && s.backdropFilter !== "none") reasons.push("backdrop");
        if (s.filter && s.filter.includes("blur")) reasons.push("blur");
        if (reasons.length) items.push({ tag: el.tagName, reasons });
      }
      return items;
    };

    const expensive = countExpensive();
    fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dc0a6c" },
      body: JSON.stringify({
        sessionId: "dc0a6c",
        runId: "paint-jank",
        hypothesisId: "H_PAINT",
        location: "LenisProvider.tsx:mount",
        message: "Scroll paint audit",
        data: {
          expensiveCount: expensive.length,
          expensive,
          hasLenis: document.documentElement.classList.contains("lenis"),
          overflowXAuto: document.querySelectorAll("[class*='overflow-x-auto']").length,
          scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});

    const onWheel = (e: WheelEvent) => {
      const w = window as unknown as { __fydellWheelLogged?: number };
      w.__fydellWheelLogged = (w.__fydellWheelLogged ?? 0) + 1;
      if (w.__fydellWheelLogged > 6) return;
      const target = e.target as Element | null;
      const scrollParent = target?.closest?.("[class*='overflow-x-auto'], [class*='overflow-x-scroll']");
      fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dc0a6c" },
        body: JSON.stringify({
          sessionId: "dc0a6c",
          runId: "paint-jank",
          hypothesisId: "H_OVERFLOW",
          location: "LenisProvider.tsx:wheel",
          message: "Wheel over page",
          data: {
            deltaY: e.deltaY,
            defaultPrevented: e.defaultPrevented,
            overOverflowXAuto: Boolean(scrollParent),
            scrollY: Math.round(window.scrollY),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };

    window.addEventListener("wheel", onWheel, { passive: true, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true } as AddEventListenerOptions);
  }, []);
  // #endregion
  return null;
}

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

  return (
    <>
      <ScrollDebugProbe />
      {children}
    </>
  );
}
