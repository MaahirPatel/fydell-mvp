import { cn } from "@/lib/cn";

/**
 * A single bordered container holding several hairline-separated sections.
 *
 * This is the primary structural device in the application. Related modules
 * belong inside one frame so the eye reads them as a sequence; scattering the
 * same modules across floating cards turns a narrative into a search.
 *
 * Reach for `Surface` instead when the thing genuinely stands alone.
 */
export function Panel({
  className,
  children,
  as: As = "section",
  ...rest
}: {
  className?: string;
  children?: React.ReactNode;
  as?: React.ElementType;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <As
      className={cn(
        "overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)]",
        "divide-y divide-[var(--border-subtle)]",
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

/**
 * One module inside a Panel. `title` renders the standard section label with
 * its control on the right; omit it for a section that needs no header.
 */
export function PanelSection({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("px-5 py-4 lg:px-6 lg:py-5", className)}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-app-section font-medium text-[var(--text-primary)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 max-w-[68ch] text-app-body text-[var(--text-secondary)]">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children ? (
        <div className={cn(title ? "mt-4" : undefined, bodyClassName)}>{children}</div>
      ) : null}
    </div>
  );
}

/**
 * A quieter label for a subdivision inside a PanelSection, where a second
 * `--type-app-section` heading would compete with the section title.
 */
export function PanelLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-app-meta font-medium text-[var(--text-tertiary)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

export default Panel;
