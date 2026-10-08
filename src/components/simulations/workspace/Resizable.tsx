"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";

/**
 * A panel splitter operable by pointer and keyboard. `direction` says which
 * way the panel grows as the pointer moves right (or down): +1 for panels on
 * the left or top, -1 for panels on the right or bottom.
 */
export function ResizeHandle({
  orientation,
  value,
  min,
  max,
  direction,
  label,
  controls,
  onChange,
  onCommit,
}: {
  /** "vertical" splits columns (drag left/right); "horizontal" splits rows. */
  orientation: "vertical" | "horizontal";
  value: number;
  min: number;
  max: number;
  direction: 1 | -1;
  label: string;
  controls?: string;
  onChange: (next: number) => void;
  /** Called once a drag or key press finishes, for persisting the size. */
  onCommit?: (next: number) => void;
}) {
  const start = useRef<{ pos: number; value: number; last: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const clamp = (n: number) => Math.round(Math.min(max, Math.max(min, n)));

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { pos: orientation === "vertical" ? e.clientX : e.clientY, value, last: value };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const pos = orientation === "vertical" ? e.clientX : e.clientY;
    const next = clamp(s.value + (pos - s.pos) * direction);
    s.last = next;
    onChange(next);
  };

  const end = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    start.current = null;
    setDragging(false);
    onCommit?.(s.last);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 64 : 16;
    const grow = orientation === "vertical" ? (direction === 1 ? "ArrowRight" : "ArrowLeft") : direction === 1 ? "ArrowDown" : "ArrowUp";
    const shrink = orientation === "vertical" ? (direction === 1 ? "ArrowLeft" : "ArrowRight") : direction === 1 ? "ArrowUp" : "ArrowDown";
    let next: number | null = null;
    if (e.key === grow) next = clamp(value + step);
    else if (e.key === shrink) next = clamp(value - step);
    else if (e.key === "Home") next = min;
    else if (e.key === "End") next = max;
    if (next === null) return;
    e.preventDefault();
    onChange(next);
    onCommit?.(next);
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={orientation}
      aria-label={label}
      aria-controls={controls}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      data-dragging={dragging ? "true" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={onKeyDown}
      className={cn(
        "sim-resize-handle relative z-10 shrink-0 outline-offset-[-2px]",
        orientation === "vertical" ? "-mx-[3px] w-[6px] cursor-col-resize" : "-my-[3px] h-[6px] cursor-row-resize",
      )}
    />
  );
}
