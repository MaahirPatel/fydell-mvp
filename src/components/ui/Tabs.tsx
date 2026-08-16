"use client";

import { useCallback, useId, useRef } from "react";
import { cn } from "@/lib/cn";

export type TabItem = {
  value: string;
  label: React.ReactNode;
  /** Rendered after the label in a quieter tone. Use for counts. */
  count?: number;
  disabled?: boolean;
};

/**
 * An underlined tab bar following the WAI-ARIA tabs pattern with automatic
 * activation: arrow keys move selection, because every panel here is already
 * rendered and switching costs nothing.
 *
 * Pair with `TabPanel`, passing the same `idBase` so the aria wiring matches.
 */
export function Tabs({
  items,
  value,
  onValueChange,
  idBase,
  label,
  className,
}: {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  /** Shared prefix for tab and panel ids. Generated when omitted. */
  idBase?: string;
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
}) {
  const generated = useId();
  const base = idBase ?? generated;
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(event.key)) return;

      const enabled = items.filter((item) => !item.disabled);
      if (enabled.length === 0) return;
      const current = enabled.findIndex((item) => item.value === value);

      let next = current;
      if (event.key === "ArrowLeft") next = current <= 0 ? enabled.length - 1 : current - 1;
      if (event.key === "ArrowRight") next = current === enabled.length - 1 ? 0 : current + 1;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = enabled.length - 1;
      if (next === current) return;

      event.preventDefault();
      const target = enabled[next];
      onValueChange(target.value);
      listRef.current
        ?.querySelector<HTMLButtonElement>(`[data-tab-value="${target.value}"]`)
        ?.focus();
    },
    [items, onValueChange, value],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className={cn(
        "flex items-center gap-1 border-b border-[var(--border-subtle)]",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`${base}-tab-${item.value}`}
            aria-controls={`${base}-panel-${item.value}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            data-tab-value={item.value}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "relative -mb-px inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5",
              "text-app-body font-medium",
              "border-b transition-colors duration-[var(--motion-fast)]",
              "disabled:pointer-events-none disabled:opacity-45",
              selected
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span className="tabular-nums text-[var(--text-tertiary)]">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  value,
  active,
  idBase,
  className,
  children,
}: {
  value: string;
  active: boolean;
  idBase: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${value}`}
      aria-labelledby={`${idBase}-tab-${value}`}
      hidden={!active}
      tabIndex={0}
      className={className}
    >
      {active ? children : null}
    </div>
  );
}

export default Tabs;
