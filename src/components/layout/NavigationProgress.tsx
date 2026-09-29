"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const MIN_VISIBLE_MS = 450;
const GIVE_UP_MS = 10_000;

function finishBar(bar: HTMLDivElement | null) {
  if (!bar) return;
  bar.style.transition = "transform 200ms ease-out, opacity 250ms ease 200ms";
  bar.style.transform = "scaleX(1)";
  bar.style.opacity = "0";
}

/**
 * Thin top bar shown while the router moves between pages, like a browser's own
 * load indicator. Page content itself is never animated.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };


    const start = () => {
      const bar = barRef.current;
      if (!bar) return;
      clearTimers();
      startedAt.current = performance.now();
      bar.style.transition = "none";
      bar.style.opacity = "1";
      bar.style.transform = "scaleX(0)";
      void bar.offsetWidth;
      bar.style.transition = "transform 2.4s cubic-bezier(0.1, 0.6, 0.2, 1)";
      bar.style.transform = "scaleX(0.82)";
      timers.current.push(
        window.setTimeout(() => {
          startedAt.current = null;
          finishBar(barRef.current);
        }, GIVE_UP_MS),
      );
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!(e.target instanceof Element)) return;
      const anchor = e.target.closest("a");
      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      if (url.pathname.startsWith("/api/")) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    const began = startedAt.current;
    if (began === null) return;
    startedAt.current = null;
    timers.current.forEach((t) => window.clearTimeout(t));
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - began));
    timers.current = [window.setTimeout(() => finishBar(barRef.current), wait)];
  }, [pathname]);

  return (
    <div
      ref={barRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: 2,
        background: "var(--text-primary)",
        transformOrigin: "left",
        transform: "scaleX(0)",
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}
