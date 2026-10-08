"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog inside the simulation theme. Focus moves in on open, stays
 * inside while open, and returns to where it was on close.
 */
export function Dialog({
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
  dismissable = true,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg" | "full";
  dismissable?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const dismissRef = useRef(dismissable);
  useEffect(() => {
    closeRef.current = onClose;
    dismissRef.current = dismissable;
  }, [onClose, dismissable]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissRef.current) {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[var(--sim-scrim)] p-4" onPointerDown={(e) => e.target === e.currentTarget && dismissable && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sim-dialog-title"
        className={cn(
          "flex max-h-[calc(100dvh-32px)] w-full flex-col overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-panel)] shadow-[var(--sim-shadow)]",
          size === "md" && "max-w-[560px]",
          size === "lg" && "max-w-[820px]",
          size === "full" && "h-[calc(100dvh-32px)] max-w-[1180px]",
        )}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="sim-dialog-title" className="text-[16px] font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            {description ? <div className="mt-1 text-[13.5px] leading-[1.55] text-[var(--text-secondary)]">{description}</div> : null}
          </div>
          {dismissable ? (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <X aria-hidden size={16} />
            </button>
          ) : null}
        </div>
        <div className="sim-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
