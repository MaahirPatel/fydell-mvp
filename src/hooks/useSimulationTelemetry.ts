"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TelemetryEvent } from "@/lib/sim-engine/types";

/**
 * Ref-backed telemetry helpers for UI surfaces.
 * Does not rerender on every keystroke, count is throttled.
 */
export function useSimulationTelemetry(opts?: {
  onBlur?: (reason: "window" | "visibility") => void;
  onPaste?: (length: number) => void;
  enabled?: boolean;
}) {
  const bufferRef = useRef<TelemetryEvent[]>([]);
  const [telemetryCount, setTelemetryCount] = useState(0);
  const [focusViolationCount, setFocusViolationCount] = useState(0);
  const lastBlurRef = useRef(0);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpCount = useCallback((n: number) => {
    if (throttleTimer.current) return;
    throttleTimer.current = setTimeout(() => {
      throttleTimer.current = null;
      setTelemetryCount(n);
    }, 200);
  }, []);

  const recordEvent = useCallback(
    (event: TelemetryEvent) => {
      bufferRef.current.push(event);
      bumpCount(bufferRef.current.length);
    },
    [bumpCount]
  );

  const getSnapshot = useCallback(() => [...bufferRef.current], []);
  const flush = useCallback(() => [...bufferRef.current], []);

  useEffect(() => {
    if (opts?.enabled === false) return;

    const onWinBlur = () => {
      const now = Date.now();
      if (now - lastBlurRef.current < 400) return;
      lastBlurRef.current = now;
      setFocusViolationCount((c) => c + 1);
      opts?.onBlur?.("window");
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        const now = Date.now();
        if (now - lastBlurRef.current < 400) return;
        lastBlurRef.current = now;
        setFocusViolationCount((c) => c + 1);
        opts?.onBlur?.("visibility");
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") ?? "";
      opts?.onPaste?.(text.length);
    };

    window.addEventListener("blur", onWinBlur);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("blur", onWinBlur);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("paste", onPaste);
      if (throttleTimer.current) clearTimeout(throttleTimer.current);
    };
  }, [opts]);

  return {
    recordEvent,
    getSnapshot,
    flush,
    telemetryCount,
    focusViolationCount,
  };
}
