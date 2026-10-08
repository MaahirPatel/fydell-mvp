"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type PopoverState = { open: boolean; refocus: boolean };

/**
 * A disclosure button with a floating panel. Escape and choosing an item
 * close it and return focus to the button; a click outside just closes it.
 */
export function Popover({
  label,
  button,
  children,
  align = "end",
  buttonClassName,
  panelClassName,
}: {
  label: string;
  button: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  buttonClassName?: string;
  panelClassName?: string;
}) {
  const [state, setState] = useState<PopoverState>({ open: false, refocus: false });
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const { open } = state;

  useEffect(() => {
    if (!state.open) {
      if (state.refocus) trigger.current?.focus();
      return;
    }
    const first = panel.current?.querySelector<HTMLElement>("button:not([disabled]), a, input, [tabindex='0']");
    first?.focus();
    const onDown = (e: PointerEvent) => {
      if (root.current && e.target instanceof Node && !root.current.contains(e.target)) setState({ open: false, refocus: false });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setState({ open: false, refocus: true });
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [state]);

  const close = () => setState({ open: false, refocus: true });

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setState((s) => ({ open: !s.open, refocus: false }))}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-[6px] px-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
          open && "bg-[var(--surface-hover)] text-[var(--text-primary)]",
          buttonClassName,
        )}
      >
        {button}
      </button>
      {open ? (
        <div
          ref={panel}
          id={id}
          role="group"
          aria-label={label}
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 min-w-[240px] rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-1.5 shadow-[var(--sim-shadow)]",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

export function PopoverItem({ children, onClick, disabled, hint }: { children: ReactNode; onClick: () => void; disabled?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full flex-col items-start gap-0.5 rounded-[6px] px-2.5 py-2 text-left text-[13.5px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
    >
      <span>{children}</span>
      {hint ? <span className="text-[12px] text-[var(--text-tertiary)]">{hint}</span> : null}
    </button>
  );
}
