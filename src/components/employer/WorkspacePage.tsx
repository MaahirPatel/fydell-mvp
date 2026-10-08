import { cn } from "@/lib/cn";

/**
 * Every employer page opens the same way: a confident title, one line of
 * context, and at most one primary action on the right.
 */
export function WorkspacePageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[68ch] text-[16px] leading-[1.55] text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}

/**
 * One module inside a `Panel`. Its padding matches `PanelSection` exactly,
 * because the lists placed inside use matching negative margins to run their
 * hairlines edge to edge; only the heading is set at list density.
 */
export function WorkspaceSection({
  title,
  description,
  action,
  bodyClassName,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  bodyClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 lg:px-6 lg:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold leading-[1.35] tracking-[-0.011em] text-[var(--text-primary)]">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-[72ch] text-[14px] leading-[1.5] text-[var(--text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <div className={cn("mt-3", bodyClassName)}>{children}</div> : null}
    </div>
  );
}
