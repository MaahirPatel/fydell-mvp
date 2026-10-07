"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Right-hand editing sheet. Keeps the page underneath in place, traps nothing
 * irreversible: Escape and the backdrop both close it, and callers keep their
 * draft state so closing never discards typed text.
 */
export function Sheet({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const body = panel.current?.querySelector<HTMLElement>("[data-sheet-body]");
    const first = body?.querySelector<HTMLElement>("input, textarea, select") ?? panel.current?.querySelector<HTMLElement>("button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div aria-hidden className="absolute inset-0 bg-[rgba(16,20,32,0.28)]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="absolute inset-y-0 right-0 flex w-[min(560px,100vw)] flex-col border-l border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[var(--shadow-float)]"
      >
        <div className="flex items-start gap-3 border-b border-[var(--border-subtle)] px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="text-[17px] font-semibold tracking-[-0.012em]">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div data-sheet-body className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer ? <div className="border-t border-[var(--border-subtle)] px-6 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Sheet;
