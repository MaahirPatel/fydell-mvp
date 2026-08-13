"use client";

/**
 * The overflow menu used at the end of a table row.
 *
 * Three text buttons repeated down every row of a table is a wall of blue that
 * competes with the data. One quiet trigger per row keeps the actions
 * available without making them the loudest thing on the screen.
 */
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./Button";

export interface RowMenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Renders in the risk colour. Use for revoke and delete only. */
  destructive?: boolean;
}

export function RowMenu({
  items,
  label,
}: {
  items: RowMenuItem[];
  /** Names the object the actions apply to, for the accessible name. */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const usable = items.filter((i) => !i.disabled);
  if (usable.length === 0) return null;

  return (
    <div className="relative inline-block" ref={ref}>
      <Button
        variant="quiet"
        size="sm"
        icon
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${label}`}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={1.7} aria-hidden />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-9 z-30 w-[190px] rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-1 shadow-[var(--shadow-pop)]"
        >
          {usable.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`block w-full rounded-[5px] px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-white/[0.06] ${
                item.destructive
                  ? "text-[var(--fydell-risk)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default RowMenu;
