import { cn } from "@/lib/cn";

/**
 * Every application page opens the same way: one readable title in near-white,
 * optional context, and at most one primary action.
 */
export function PageHeader({
  title,
  description,
  action,
  meta,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-6 gap-y-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.035em] text-[var(--text-primary)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-[65ch] text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
        {meta ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export default PageHeader;
