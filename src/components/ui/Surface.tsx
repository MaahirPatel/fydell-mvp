import { cn } from "@/lib/cn";

/**
 * The one container primitive for the application.
 *
 * Hierarchy comes from tone and border, not from wrapping everything in a
 * bright white rounded rectangle. `paper` exists only for long-form reading
 * surfaces such as a printable report preview.
 */
export type SurfaceTone = "panel" | "raised" | "outline" | "paper";

const TONE: Record<SurfaceTone, string> = {
  panel: "border border-[var(--border-subtle)] bg-[var(--surface-raised)]",
  raised: "border border-[var(--border-default)] bg-[var(--surface-panel)]",
  outline: "border border-[var(--border-subtle)] bg-transparent",
  paper: "border border-black/10 bg-[var(--surface-paper)] text-[#14161a]",
};

export function Surface({
  tone = "panel",
  className,
  children,
  as: As = "div",
  ...rest
}: {
  tone?: SurfaceTone;
  className?: string;
  children?: React.ReactNode;
  as?: React.ElementType;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <As className={cn("rounded-[var(--radius-frame)]", TONE[tone], className)} {...rest}>
      {children}
    </As>
  );
}

/** Header strip for a Surface. Keeps padding and the hairline consistent. */
export function SurfaceHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[14px] font-medium leading-tight tracking-[-0.01em] text-[var(--text-primary)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default Surface;
