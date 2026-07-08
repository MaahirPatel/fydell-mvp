"use client";

import { useEffect, useState } from "react";

export function useSimulationClock(startSeconds = 1122) {
  const [seconds, setSeconds] = useState(startSeconds);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function useStaggeredReveal<T>(items: T[], intervalMs = 3500, startDelay = 2000) {
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < items.length; i++) {
      timers.push(
        setTimeout(() => setVisible((v) => Math.max(v, i + 1)), startDelay + i * intervalMs)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [items.length, intervalMs, startDelay]);

  return visible;
}
