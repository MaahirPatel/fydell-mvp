"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Marketing scroll provider.
 *
 * Runtime evidence (dc0a6c): Lenis was active and interpolating, but wheel events
 * were defaultPrevented — that artificial inertia felt less “easy” than native
 * scroll on other sites. Native wheel (no preventDefault) is the path that matches
 * the feel users expect.
 */
function ScrollDebugProbe() {
  // #region agent log
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const w = window as unknown as { __fydellWheelLogged?: number };
      w.__fydellWheelLogged = (w.__fydellWheelLogged ?? 0) + 1;
      if (w.__fydellWheelLogged > 8) return;
      fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dc0a6c" },
        body: JSON.stringify({
          sessionId: "dc0a6c",
          runId: "native-scroll",
          hypothesisId: "H_NATIVE",
          location: "LenisProvider.tsx:wheel",
          message: "Native wheel sample",
          data: {
            deltaY: e.deltaY,
            deltaMode: e.deltaMode,
            defaultPrevented: e.defaultPrevented,
            scrollY: Math.round(window.scrollY),
            htmlClass: document.documentElement.className,
            hasLenisClass: document.documentElement.classList.contains("lenis"),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    };

    fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "dc0a6c" },
      body: JSON.stringify({
        sessionId: "dc0a6c",
        runId: "native-scroll",
        hypothesisId: "H_NATIVE",
        location: "LenisProvider.tsx:mount",
        message: "Native scroll path active (Lenis disabled)",
        data: {
          scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
          bodyOverflow: getComputedStyle(document.body).overflow,
          htmlClass: document.documentElement.className,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});

    window.addEventListener("wheel", onWheel, { passive: true, capture: true });
    return () => window.removeEventListener("wheel", onWheel, { capture: true } as AddEventListenerOptions);
  }, []);
  // #endregion
  return null;
}

export default function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Ensure leftover Lenis classes from prior deploys cannot linger.
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
