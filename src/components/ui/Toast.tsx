"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "neutral" | "good" | "risk";

type Toast = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<{
  notify: (message: string, tone?: ToastTone) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const TONE: Record<ToastTone, string> = {
  neutral: "border-[var(--border-strong)] text-[var(--text-primary)]",
  good: "border-[rgba(103,217,160,0.35)] text-[#8fe6bb]",
  risk: "border-[rgba(242,107,130,0.4)] text-[#ffb3c0]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = "neutral") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[200] flex flex-col items-end gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto max-w-[380px] rounded-[var(--radius-panel)] border bg-[var(--surface-panel)] px-3.5 py-2.5 text-[13px] leading-[1.5] shadow-[var(--shadow-pop)]",
              TONE[t.tone],
            )}
            style={{ animation: "fydell-toast-in 180ms ease-out" }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
