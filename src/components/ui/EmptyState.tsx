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
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-frame)] border border-dashed border-[var(--border-default)] bg-[rgba(255,255,255,0.014)] px-5 py-6",
        className,
      )}
    >
      <p className="text-[14px] font-medium text-[var(--text-primary)]">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-[62ch] text-[13px] leading-[1.6] text-[var(--text-secondary)]">
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
  );
}

export default EmptyState;
