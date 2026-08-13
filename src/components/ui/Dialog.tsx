"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Shared modal behaviour for Dialog and Drawer: escape to close, focus moved
 * in on open, focus trapped while open, focus restored to the opener on close,
 * and background scroll locked.
 */
function useModalBehaviour(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;

    const node = ref.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="absolute inset-0 bg-black/65"
      onClick={onClose}
      aria-hidden
      style={{ animation: "fydell-fade-in 140ms ease-out" }}
    />
  );
}

function Head({
  title,
  description,
  titleId,
  descId,
  onClose,
}: {
  title: string;
  description?: string;
  titleId: string;
  descId: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
      <div className="min-w-0">
        <h2
          id={titleId}
          className="text-[15px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]"
        >
          {title}
        </h2>
        {description ? (
          <p id={descId} className="mt-1 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      <Button variant="quiet" size="sm" icon onClick={onClose} aria-label="Close">
        <X className="h-4 w-4" strokeWidth={1.7} aria-hidden />
      </Button>
    </div>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  const ref = useModalBehaviour(open, onClose);
  if (!open) return null;

  const titleId = "dialog-title";
  const descId = "dialog-desc";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <Scrim onClose={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[var(--shadow-pop)] outline-none",
          width === "sm" && "max-w-[420px]",
          width === "md" && "max-w-[540px]",
          width === "lg" && "max-w-[720px]",
        )}
      >
        <Head
          title={title}
          description={description}
          titleId={titleId}
          descId={descId}
          onClose={onClose}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border-subtle)] px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Right-hand panel. Use for focused creation workflows such as an invitation. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useModalBehaviour(open, onClose);
  if (!open) return null;

  const titleId = "drawer-title";
  const descId = "drawer-desc";

  return (
    <div className="fixed inset-0 z-[100]">
      <Scrim onClose={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[var(--shadow-pop)] outline-none"
      >
        <Head
          title={title}
          description={description}
          titleId={titleId}
          descId={descId}
          onClose={onClose}
        />
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border-subtle)] px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
