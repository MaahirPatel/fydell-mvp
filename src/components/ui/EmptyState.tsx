import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A designed transition, not a screen of nothing.
 *
 * Deliberately compact and left-aligned so it occupies roughly the space the
 * real data container will occupy, rather than a giant centred slab followed
 * by a viewport of empty canvas.
 */
export function EmptyState({
  title,
  description,
  action,
  secondary,
  icon: Icon,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  secondary?: React.ReactNode;
  /** Names what will live here once there is data. */
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-4 rounded-[var(--radius-frame)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-5 py-6",
        className,
      )}
    >
      {Icon ? (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)] shadow-[var(--shadow-control)]"
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-app-body font-medium text-[var(--text-primary)]">{title}</p>
        {description ? (
          <p className="mt-1.5 max-w-[62ch] text-app-meta leading-[1.6] text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
        {action || secondary ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {action}
            {secondary}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default EmptyState;
