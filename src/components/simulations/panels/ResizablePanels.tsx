"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Lightweight custom resizable panels, no external library.
 * Drag handlers are attached only inside event callbacks (not during render).
 */
export function ResizablePanels({
  left,
  center,
  right,
  leftDefault = 280,
  rightDefault = 320,
  className,
}: {
  left?: ReactNode;
  center: ReactNode;
  right?: ReactNode;
  leftDefault?: number;
  rightDefault?: number;
  className?: string;
}) {
  const [leftW, setLeftW] = useState(leftDefault);
  const [rightW, setRightW] = useState(rightDefault);
  const dragSide = useRef<"left" | "right" | null>(null);

  function beginDrag(side: "left" | "right", e: React.MouseEvent) {
    e.preventDefault();
    dragSide.current = side;

    const onMove = (ev: MouseEvent) => {
      if (dragSide.current === "left") {
        setLeftW(Math.min(480, Math.max(200, ev.clientX - 16)));
      } else if (dragSide.current === "right") {
        const fromRight = window.innerWidth - ev.clientX;
        setRightW(Math.min(480, Math.max(220, fromRight - 16)));
      }
    };

    const onUp = () => {
      dragSide.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div className={cn("flex h-full min-h-0 w-full overflow-hidden", className)}>
      {left ? (
        <>
          <div
            className="flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border-default)] bg-[var(--surface-raised)]"
            style={{ width: leftW }}
          >
            {left}
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize left panel"
            tabIndex={0}
            className="w-1 shrink-0 cursor-col-resize bg-[var(--border-subtle)] hover:bg-[var(--fydell-brand-blue)]"
            onMouseDown={(e) => beginDrag("left", e)}
          />
        </>
      ) : null}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-[var(--surface-canvas)]">{center}</div>
      {right ? (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize right panel"
            tabIndex={0}
            className="w-1 shrink-0 cursor-col-resize bg-[var(--border-subtle)] hover:bg-[var(--fydell-brand-blue)]"
            onMouseDown={(e) => beginDrag("right", e)}
          />
          <div
            className="flex min-h-0 shrink-0 flex-col overflow-hidden border-l border-[var(--border-default)] bg-[var(--surface-raised)]"
            style={{ width: rightW }}
          >
            {right}
          </div>
        </>
      ) : null}
    </div>
  );
}
